import { useEffect, useRef, useState } from 'react';
import { MapPin, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface GoogleMapProps {
  center?: { lat: number; lng: number };
  zoom?: number;
  markers?: Array<{ lat: number; lng: number; label?: string }>;
  driverMarker?: {
    lat: number;
    lng: number;
    icon: 'car' | 'taxi' | 'van' | 'motorcycle' | 'suv';
    heading?: number;
  };
  routePoints?: Array<{ lat: number; lng: number }>;
  className?: string;
}

const getVehicleIconPath = (icon: string): string => {
  const paths = {
    car: 'M18.92 5.01C18.72 4.42 18.16 4 17.5 4h-11c-.66 0-1.21.42-1.42 1.01L3 11v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 15c-.83 0-1.5-.67-1.5-1.5S5.67 12 6.5 12s1.5.67 1.5 1.5S7.33 15 6.5 15zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 10l1.5-4.5h11L19 10H5z',
    taxi: 'M18.92 5.01C18.72 4.42 18.16 4 17.5 4h-11c-.66 0-1.21.42-1.42 1.01L3 11v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 15c-.83 0-1.5-.67-1.5-1.5S5.67 12 6.5 12s1.5.67 1.5 1.5S7.33 15 6.5 15zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 10l1.5-4.5h11L19 10H5z',
    van: 'M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm13.5-8.5l1.96 2.5H17V9.5h2.5zm-1.5 8.5c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z',
    motorcycle: 'M19.44 9.03L15.41 5H11v2h3.59l2 2H5c-2.8 0-5 2.2-5 5s2.2 5 5 5c2.46 0 4.45-1.69 4.9-4h1.65l2.77-2.77c-.21.54-.32 1.14-.32 1.77 0 2.8 2.2 5 5 5s5-2.2 5-5c0-2.65-1.97-4.77-4.56-4.97zM7.82 15C7.4 16.15 6.28 17 5 17c-1.63 0-3-1.37-3-3s1.37-3 3-3c1.28 0 2.4.85 2.82 2H5v2h2.82zM19 17c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z',
    suv: 'M18.92 5.01C18.72 4.42 18.16 4 17.5 4h-11c-.66 0-1.21.42-1.42 1.01L3 11v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 15c-.83 0-1.5-.67-1.5-1.5S5.67 12 6.5 12s1.5.67 1.5 1.5S7.33 15 6.5 15zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 10l1.5-4.5h11L19 10H5z'
  };
  return paths[icon as keyof typeof paths] || paths.car;
}

const GoogleMap = ({
  center = { lat: 48.8566, lng: 2.3522 },
  zoom = 12,
  markers = [],
  driverMarker,
  routePoints = [],
  className = ''
}: GoogleMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const driverMarkerRef = useRef<any>(null);
  const [mapError, setMapError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [apiKeyLoaded, setApiKeyLoaded] = useState(false);

  // Load Google Maps API key and script
  useEffect(() => {
    const loadGoogleMaps = async () => {
      try {
        console.log('🗺️ Fetching Google Maps API key...');
        const { data, error } = await supabase.functions.invoke('get-google-maps-key');
        
        if (error) {
          console.warn('⚠️ Failed to fetch Google Maps key:', error.message);
          setMapError(true);
          setIsLoading(false);
          return;
        }

        if (!data?.key) {
          console.warn('⚠️ Google Maps key is not configured');
          setMapError(true);
          setIsLoading(false);
          return;
        }

        console.log('✅ Google Maps API key retrieved successfully');

        // Check if script already loaded
        if ((window as any).google?.maps) {
          console.log('✅ Google Maps script already loaded');
          setApiKeyLoaded(true);
          setIsLoading(false);
          return;
        }

        // Load Google Maps script
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${data.key}&libraries=places`;
        script.async = true;
        script.defer = true;
        
        script.onload = () => {
          console.log('✅ Google Maps script loaded successfully');
          setApiKeyLoaded(true);
          setIsLoading(false);
        };

        script.onerror = () => {
          console.error('❌ Failed to load Google Maps script');
          setMapError(true);
          setIsLoading(false);
        };

        document.head.appendChild(script);

      } catch (err) {
        console.error('❌ Error loading Google Maps:', err);
        setMapError(true);
        setIsLoading(false);
      }
    };

    loadGoogleMaps();
  }, []);

  useEffect(() => {
    if (!mapRef.current || !apiKeyLoaded) return;

    // Check if Google Maps is loaded
    if (!(window as any).google?.maps) {
      console.warn('⚠️ Google Maps API not ready yet');
      return;
    }

    const google = (window as any).google;

    try {
      if (!mapInstanceRef.current) {
        console.log('🗺️ Initializing Google Maps...');
        mapInstanceRef.current = new google.maps.Map(mapRef.current, {
          center,
          zoom,
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }],
            },
          ],
        });
        console.log('✅ Google Maps initialized successfully');
      }

      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];

      markers.forEach(({ lat, lng, label }) => {
        const marker = new google.maps.Marker({
          position: { lat, lng },
          map: mapInstanceRef.current,
          label: label ? {
            text: label,
            color: 'white',
            fontSize: '14px',
            fontWeight: 'bold',
          } : undefined,
        });
        markersRef.current.push(marker);
      });

      // Driver marker with custom vehicle icon
      if (driverMarker) {
        if (driverMarkerRef.current) {
          driverMarkerRef.current.setMap(null);
        }

        driverMarkerRef.current = new google.maps.Marker({
          position: { lat: driverMarker.lat, lng: driverMarker.lng },
          map: mapInstanceRef.current,
          icon: {
            path: getVehicleIconPath(driverMarker.icon),
            fillColor: '#3B82F6',
            fillOpacity: 1,
            strokeColor: '#FFFFFF',
            strokeWeight: 2,
            scale: 1.2,
            rotation: driverMarker.heading || 0,
            anchor: new google.maps.Point(12, 12),
          },
          zIndex: 1000,
        });
      } else if (driverMarkerRef.current) {
        driverMarkerRef.current.setMap(null);
        driverMarkerRef.current = null;
      }

      // Draw route polyline if routePoints provided
      if (routePoints && routePoints.length > 1 && mapInstanceRef.current) {
        new google.maps.Polyline({
          path: routePoints,
          geodesic: true,
          strokeColor: '#3B82F6',
          strokeOpacity: 1.0,
          strokeWeight: 4,
          map: mapInstanceRef.current
        });
      }

      if (mapInstanceRef.current) {
        mapInstanceRef.current.setCenter(center);
      }
    } catch (error) {
      console.error('❌ Google Maps error:', error);
      setMapError(true);
    }
  }, [center, zoom, markers, driverMarker, routePoints, apiKeyLoaded]);

  // Fallback map display when Google Maps is not available
  if (mapError) {
    return (
      <div className={`w-full h-full rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 flex flex-col items-center justify-center p-6 ${className}`}>
        <div className="text-center space-y-4 max-w-md">
          <div className="flex justify-center">
            <div className="relative">
              <MapPin className="w-16 h-16 text-blue-500" />
              <AlertCircle className="w-6 h-6 text-orange-500 absolute -top-1 -right-1" />
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-lg mb-2">Carte non disponible</h3>
            <p className="text-sm text-muted-foreground mb-4">
              La clé API Google Maps n'est pas configurée.
            </p>
            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 text-left space-y-2">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-0.5 text-blue-500 flex-shrink-0" />
                <div className="text-sm">
                  <span className="font-medium">Position actuelle :</span>
                  <br />
                  <span className="text-muted-foreground">
                    {center.lat.toFixed(4)}°, {center.lng.toFixed(4)}°
                  </span>
                </div>
              </div>
              {markers.length > 0 && (
                <div className="text-sm pt-2 border-t">
                  <span className="font-medium">{markers.length} point(s) sur la carte</span>
                </div>
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Consultez <strong>CONFIGURATION_SUPABASE.md</strong> pour configurer Google Maps
          </p>
        </div>
      </div>
    );
  }

  return (
    <div ref={mapRef} className={`w-full h-full rounded-lg bg-muted flex items-center justify-center ${className}`}>
      {isLoading && (
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-muted-foreground text-sm">Chargement de la carte...</p>
        </div>
      )}
    </div>
  );
};

export default GoogleMap;
