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
    if (!mapRef.current || !(window as any).google) return;

    const google = (window as any).google;

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
  }, [center, zoom, markers]);

  return <div ref={mapRef} className={`w-full h-full rounded-lg ${className}`} />;
};

export default GoogleMap;
