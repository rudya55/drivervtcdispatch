import { useState, useEffect, useRef } from 'react';
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

export const useGeolocation = (enabled: boolean) => {
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

  const watchIdRef = useRef<number | null>(null);
  const lastPositionRef = useRef<{ lat: number; lng: number; timestamp: number } | null>(null);
  

  useEffect(() => {
    if (!enabled) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setState(prev => ({ ...prev, isTracking: false }));
      return;
    }

    if (!navigator.geolocation) {
      setState(prev => ({ ...prev, error: 'Geolocation not supported' }));
      return;
    }

    const shouldSendUpdate = (lat: number, lng: number): boolean => {
      const now = Date.now();
      if (!lastPositionRef.current) return true;
      
      // Calculate distance in km
      const R = 6371;
      const dLat = (lat - lastPositionRef.current.lat) * Math.PI / 180;
      const dLng = (lng - lastPositionRef.current.lng) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lastPositionRef.current.lat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) *
                Math.sin(dLng/2) * Math.sin(dLng/2);
      const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)) * 1000; // in meters
      
      // Send if moved > 10m OR if > 1s elapsed
      return distance > 10 || (now - lastPositionRef.current.timestamp) > 1000;
    };

    const updateLocation = async (position: GeolocationPosition) => {
      const locationData = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        heading: position.coords.heading || null,
        speed: position.coords.speed || null,
        accuracy: position.coords.accuracy,
      };

      setState(prev => ({
        ...prev,
        ...locationData,
        coordinates: {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        },
        error: null,
        isTracking: true,
      }));

      // Send location to backend only if needed
      if (shouldSendUpdate(position.coords.latitude, position.coords.longitude)) {
        lastPositionRef.current = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          timestamp: Date.now()
        };
        
        try {
          await supabase.functions.invoke('driver-update-location', {
            body: locationData
          });
        } catch (error) {
          console.error('Error updating location:', error);
        }
      }
    };

    const handleError = (error: GeolocationPositionError) => {
      setState(prev => ({
        ...prev,
        error: error.message,
        isTracking: false,
      }));
    };

    // Start web geolocation watcher with 1s timeout for instant updates
    watchIdRef.current = navigator.geolocation.watchPosition(
      updateLocation,
      handleError,
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 1000,
      }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [enabled]);

  return state;
};
