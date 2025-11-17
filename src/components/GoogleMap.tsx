import { useEffect, useRef, useState } from 'react';
import { MapPin, AlertCircle } from 'lucide-react';

interface GoogleMapProps {
  center?: { lat: number; lng: number };
  zoom?: number;
  markers?: Array<{ lat: number; lng: number; label?: string }>;
  className?: string;
}

const GoogleMap = ({
  center = { lat: 48.8566, lng: 2.3522 },
  zoom = 12,
  markers = [],
  className = ''
}: GoogleMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [mapError, setMapError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if Google Maps loaded after 10 seconds (increased timeout for slow connections)
    const timeout = setTimeout(() => {
      if (!(window as any).google) {
        console.error('Google Maps failed to load after 10 seconds');
        setMapError(true);
        setIsLoading(false);
      }
    }, 10000);

    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;

    // Check if Google Maps is loaded
    if (!(window as any).google) {
      return;
    }

    const google = (window as any).google;
    setIsLoading(false);
    setMapError(false);

      try {
        if (!mapInstanceRef.current) {
          // Guard: ensure Maps constructor is available
          if (!google?.maps?.Map) {
            console.warn('Google Maps API not fully ready yet.');
            setMapError(true);
            return;
          }
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

      if (mapInstanceRef.current) {
        mapInstanceRef.current.setCenter(center);
      }
    } catch (error) {
      console.error('Google Maps error:', error);
      setMapError(true);
    }
  }, [center, zoom, markers]);

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
