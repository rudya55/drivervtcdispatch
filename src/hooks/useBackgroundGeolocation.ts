import { useState, useEffect, useRef, useCallback } from 'react';
import { registerPlugin } from '@capacitor/core';
import { supabase } from '@/lib/supabase';

// Interface for the Background Geolocation plugin
interface BackgroundGeolocationPlugin {
  addWatcher(
    options: {
      backgroundMessage?: string;
      backgroundTitle?: string;
      requestPermissions?: boolean;
      stale?: boolean;
      distanceFilter?: number;
    },
    callback: (position: GeolocationPosition | null, error: GeolocationError | null) => void
  ): Promise<string>;
  removeWatcher(options: { id: string }): Promise<void>;
  openSettings(): Promise<void>;
}

interface GeolocationPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude: number | null;
  altitudeAccuracy: number | null;
  bearing: number | null;
  speed: number | null;
  time: number;
}

interface GeolocationError {
  code: string;
  message: string;
}

interface BackgroundGeolocationState {
  latitude: number | null;
  longitude: number | null;
  heading: number | null;
  speed: number | null;
  accuracy: number | null;
  error: string | null;
  isTracking: boolean;
  coordinates: { lat: number; lng: number } | null;
}

// Register the background geolocation plugin
const BackgroundGeolocation = registerPlugin<BackgroundGeolocationPlugin>('BackgroundGeolocation');

export const useBackgroundGeolocation = (enabled: boolean) => {
  const [state, setState] = useState<BackgroundGeolocationState>({
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
  const lastUpdateRef = useRef<number>(0);
  const isInitializedRef = useRef<boolean>(false);

  // Throttled location update to backend
  const sendLocationToBackend = useCallback(async (
    latitude: number,
    longitude: number,
    heading: number | null,
    speed: number | null,
    accuracy: number
  ) => {
    const now = Date.now();
    // Only send updates every 5 seconds to reduce battery and network usage
    if (now - lastUpdateRef.current < 5000) return;
    lastUpdateRef.current = now;

    try {
      console.log('[BGLocation] Sending location update:', { latitude, longitude });
      await supabase.functions.invoke('driver-update-location', {
        body: { latitude, longitude, heading, speed, accuracy }
      });
    } catch (error) {
      console.error('[BGLocation] Error updating location:', error);
    }
  }, []);

  useEffect(() => {
    // Prevent multiple initializations
    if (isInitializedRef.current && !enabled) {
      // Cleanup existing watcher
      if (watcherIdRef.current) {
        console.log('[BGLocation] Stopping background tracking');
        BackgroundGeolocation.removeWatcher({ id: watcherIdRef.current }).catch(console.error);
        watcherIdRef.current = null;
      }
      setState(prev => ({ ...prev, isTracking: false }));
      isInitializedRef.current = false;
      return;
    }

    if (!enabled || isInitializedRef.current) return;

    const startTracking = async () => {
      try {
        console.log('[BGLocation] Starting background geolocation tracking...');
        isInitializedRef.current = true;

        const watcherId = await BackgroundGeolocation.addWatcher(
          {
            backgroundTitle: 'VTC Dispatch - Position active',
            backgroundMessage: 'Votre position est partagée avec le dispatch',
            requestPermissions: true,
            stale: false,
            distanceFilter: 10, // Update every 10 meters
          },
          (position, error) => {
            if (error) {
              console.error('[BGLocation] Error:', error.code, error.message);
              
              // Handle specific error codes
              if (error.code === 'NOT_AUTHORIZED') {
                setState(prev => ({
                  ...prev,
                  error: 'Permission de localisation refusée. Activez-la dans les paramètres.',
                  isTracking: false
                }));
                // Optionally open settings
                BackgroundGeolocation.openSettings().catch(() => {});
              } else {
                setState(prev => ({
                  ...prev,
                  error: error.message,
                  isTracking: false
                }));
              }
              return;
            }

            if (position) {
              console.log('[BGLocation] Position update:', {
                lat: position.latitude.toFixed(6),
                lng: position.longitude.toFixed(6),
                accuracy: position.accuracy
              });

              setState({
                latitude: position.latitude,
                longitude: position.longitude,
                heading: position.bearing,
                speed: position.speed,
                accuracy: position.accuracy,
                error: null,
                isTracking: true,
                coordinates: { lat: position.latitude, lng: position.longitude },
              });

              // Send to backend (throttled)
              sendLocationToBackend(
                position.latitude,
                position.longitude,
                position.bearing,
                position.speed,
                position.accuracy
              );
            }
          }
        );

        watcherIdRef.current = watcherId;
        console.log('[BGLocation] Watcher started with ID:', watcherId);
        setState(prev => ({ ...prev, isTracking: true, error: null }));

      } catch (error: any) {
        console.error('[BGLocation] Failed to start tracking:', error);
        
        // Fallback to standard Geolocation API for web
        if (error.message?.includes('not implemented') || error.message?.includes('not available')) {
          console.log('[BGLocation] Falling back to standard Geolocation API');
          startWebFallback();
        } else {
          setState(prev => ({
            ...prev,
            error: error.message || 'Erreur de géolocalisation',
            isTracking: false
          }));
        }
        isInitializedRef.current = false;
      }
    };

    // Fallback for web browsers
    const startWebFallback = () => {
      if (!navigator.geolocation) {
        setState(prev => ({ ...prev, error: 'Géolocalisation non supportée', isTracking: false }));
        return;
      }

      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude, heading, speed, accuracy } = position.coords;
          
          setState({
            latitude,
            longitude,
            heading: heading ?? null,
            speed: speed ?? null,
            accuracy: accuracy ?? null,
            error: null,
            isTracking: true,
            coordinates: { lat: latitude, lng: longitude },
          });

          sendLocationToBackend(latitude, longitude, heading, speed, accuracy ?? 0);
        },
        (error) => {
          console.error('[BGLocation] Web fallback error:', error);
          setState(prev => ({
            ...prev,
            error: error.message,
            isTracking: false
          }));
        },
        {
          enableHighAccuracy: true,
          timeout: 30000,
          maximumAge: 5000,
        }
      );

      // Store as string for compatibility
      watcherIdRef.current = String(watchId);
      setState(prev => ({ ...prev, isTracking: true }));
    };

    startTracking();

    return () => {
      if (watcherIdRef.current) {
        // Try native cleanup first
        BackgroundGeolocation.removeWatcher({ id: watcherIdRef.current }).catch(() => {
          // Fallback: clear web geolocation watch
          const numericId = parseInt(watcherIdRef.current || '0', 10);
          if (!isNaN(numericId)) {
            navigator.geolocation?.clearWatch(numericId);
          }
        });
        watcherIdRef.current = null;
      }
      isInitializedRef.current = false;
    };
  }, [enabled, sendLocationToBackend]);

  return state;
};
