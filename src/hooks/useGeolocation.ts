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

      // Send location to backend
      try {
        await supabase.functions.invoke('driver-update-location', {
          body: locationData
        });
      } catch (error) {
        console.error('Error updating location:', error);
      }
    };

    const handleError = (error: GeolocationPositionError) => {
      setState(prev => ({
        ...prev,
        error: error.message,
        isTracking: false,
      }));
    };

    // Start watching position
    watchIdRef.current = navigator.geolocation.watchPosition(
      updateLocation,
      handleError,
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 5000,
      }
    );

    // Removed periodic 30s polling; relying on watchPosition for instant updates

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [enabled]);

  return state;
};
