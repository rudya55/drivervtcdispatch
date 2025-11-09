import { useState, useEffect, useRef } from 'react';
import { Geolocation } from '@capacitor/geolocation';
import { supabase } from '@/lib/supabase';

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  heading: number | null;
  speed: number | null;
  accuracy: number | null;
  error: string | null;
  isTracking: boolean;
  coordinates: { lat: number; lng: number } | null;
}

export const useNativeGeolocation = (enabled: boolean) => {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    heading: null,
    speed: null,
    accuracy: null,
    error: null,
    isTracking: false,
    coordinates: null,
  });

  const watcherIdRef = useRef<string | null>(null);
  const lastPositionRef = useRef<{ lat: number; lng: number; timestamp: number } | null>(null);

  useEffect(() => {
    if (!enabled) {
      if (watcherIdRef.current) {
        Geolocation.clearWatch({ id: watcherIdRef.current });
        watcherIdRef.current = null;
      }
      setState(prev => ({ ...prev, isTracking: false }));
      return;
    }

    const shouldSendUpdate = (lat: number, lng: number): boolean => {
      const now = Date.now();
      if (!lastPositionRef.current) return true;
      
      const R = 6371;
      const dLat = (lat - lastPositionRef.current.lat) * Math.PI / 180;
      const dLng = (lng - lastPositionRef.current.lng) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lastPositionRef.current.lat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) *
                Math.sin(dLng/2) * Math.sin(dLng/2);
      const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)) * 1000;
      
      return distance > 10 || (now - lastPositionRef.current.timestamp) > 1000;
    };

    const updateLocation = async (latitude: number, longitude: number, heading: number | null, speed: number | null, accuracy: number) => {
      setState(prev => ({
        ...prev,
        latitude,
        longitude,
        heading,
        speed,
        accuracy,
        coordinates: { lat: latitude, lng: longitude },
        error: null,
        isTracking: true,
      }));

      if (shouldSendUpdate(latitude, longitude)) {
        lastPositionRef.current = { lat: latitude, lng: longitude, timestamp: Date.now() };
        
        try {
          await supabase.functions.invoke('driver-update-location', {
            body: { latitude, longitude, heading, speed, accuracy }
          });
        } catch (error) {
          console.error('Error updating location:', error);
        }
      }
    };

    const startTracking = async () => {
      try {
        const permissions = await Geolocation.requestPermissions();
        if (permissions.location !== 'granted') {
          setState(prev => ({ ...prev, error: 'Permission refusée', isTracking: false }));
          return;
        }

        // Watch position with high accuracy
        watcherIdRef.current = await Geolocation.watchPosition(
          {
            enableHighAccuracy: true,
            timeout: 1000,
            maximumAge: 0
          },
          (position, error) => {
            if (error) {
              console.error('Geolocation error:', error);
              setState(prev => ({ ...prev, error: error.message || 'Erreur GPS', isTracking: false }));
              return;
            }

            if (position) {
              updateLocation(
                position.coords.latitude,
                position.coords.longitude,
                position.coords.heading || null,
                position.coords.speed || null,
                position.coords.accuracy
              );
            }
          }
        );
      } catch (error: any) {
        console.error('Failed to start tracking:', error);
        setState(prev => ({ ...prev, error: error.message, isTracking: false }));
      }
    };

    startTracking();

    return () => {
      if (watcherIdRef.current) {
        Geolocation.clearWatch({ id: watcherIdRef.current });
      }
    };
  }, [enabled]);

  return state;
};
