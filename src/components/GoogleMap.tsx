import { useEffect, useRef } from 'react';

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

  useEffect(() => {
    if (!mapRef.current) return;
    
    // Check if Google Maps is loaded
    if (!(window as any).google) {
      return;
    }

    const google = (window as any).google;

    try {
      if (!mapInstanceRef.current) {
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
    }
  }, [center, zoom, markers]);

  return (
    <div ref={mapRef} className={`w-full h-full rounded-lg bg-muted flex items-center justify-center ${className}`}>
      {!(window as any).google && (
        <p className="text-muted-foreground text-sm">Chargement de la carte...</p>
      )}
    </div>
  );
};

export default GoogleMap;
