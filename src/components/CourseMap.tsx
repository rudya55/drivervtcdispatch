import { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { MapPin, Navigation, Clock, Route } from 'lucide-react';

interface CourseMapProps {
  departureLocation: string;
  destinationLocation: string;
  driverLocation?: { lat: number; lng: number } | null;
}

export const CourseMap = ({ departureLocation, destinationLocation, driverLocation }: CourseMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [distance, setDistance] = useState<string>('');
  const [duration, setDuration] = useState<string>('');
  const [error, setError] = useState<string>('');
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const driverMarkerRef = useRef<google.maps.Marker | null>(null);

  useEffect(() => {
    if (!mapRef.current || !window.google) return;

    // Créer la carte
    const newMap = new google.maps.Map(mapRef.current, {
      zoom: 12,
      center: { lat: 48.8566, lng: 2.3522 }, // Paris par défaut
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });

    setMap(newMap);

    // Créer le renderer de directions
    const directionsRenderer = new google.maps.DirectionsRenderer({
      map: newMap,
      suppressMarkers: false,
      polylineOptions: {
        strokeColor: '#0EA5E9',
        strokeWeight: 5,
        strokeOpacity: 0.8,
      },
    });
    directionsRendererRef.current = directionsRenderer;

    return () => {
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setMap(null);
      }
      if (driverMarkerRef.current) {
        driverMarkerRef.current.setMap(null);
      }
    };
  }, []);

  // Calculer et afficher l'itinéraire
  useEffect(() => {
    if (!map || !window.google || !departureLocation || !destinationLocation) return;

    const directionsService = new google.maps.DirectionsService();

    directionsService.route(
      {
        origin: departureLocation,
        destination: destinationLocation,
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === 'OK' && result) {
          directionsRendererRef.current?.setDirections(result);

          const route = result.routes[0];
          if (route && route.legs[0]) {
            setDistance(route.legs[0].distance?.text || '');
            setDuration(route.legs[0].duration?.text || '');
          }
          setError('');
        } else {
          console.error('Erreur lors du calcul de l\'itinéraire:', status);
          setError('Impossible de calculer l\'itinéraire');
        }
      }
    );
  }, [map, departureLocation, destinationLocation]);

  // Afficher la position du chauffeur
  useEffect(() => {
    if (!map || !driverLocation) return;

    // Supprimer l'ancien marqueur
    if (driverMarkerRef.current) {
      driverMarkerRef.current.setMap(null);
    }

    // Créer un nouveau marqueur pour le chauffeur
    const marker = new google.maps.Marker({
      position: driverLocation,
      map: map,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: '#10B981',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 3,
      },
      title: 'Votre position',
      zIndex: 1000,
    });

    driverMarkerRef.current = marker;

    return () => {
      if (driverMarkerRef.current) {
        driverMarkerRef.current.setMap(null);
      }
    };
  }, [map, driverLocation]);

  return (
    <Card className="overflow-hidden">
      {/* Informations du trajet */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1">
            <Route className="w-5 h-5 flex-shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-xs opacity-90">Itinéraire</span>
              <span className="font-bold text-sm truncate">
                {distance || 'Calcul...'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-1">
            <Clock className="w-5 h-5 flex-shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-xs opacity-90">Durée</span>
              <span className="font-bold text-sm truncate">
                {duration || 'Calcul...'}
              </span>
            </div>
          </div>

          {driverLocation && (
            <div className="flex items-center gap-2 flex-1">
              <Navigation className="w-5 h-5 flex-shrink-0" />
              <div className="flex flex-col min-w-0">
                <span className="text-xs opacity-90">Position</span>
                <span className="font-bold text-xs truncate">
                  Actualisée
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Carte */}
      <div
        ref={mapRef}
        className="w-full h-64"
        style={{ minHeight: '256px' }}
      />

      {error && (
        <div className="p-2 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-xs text-center">
          {error}
        </div>
      )}

      {/* Légende */}
      <div className="p-2 bg-muted/30 flex items-center justify-around text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-green-500 border-2 border-white"></div>
          <span>Votre position</span>
        </div>
        <div className="flex items-center gap-1">
          <MapPin className="w-3 h-3 text-green-600" />
          <span>Départ</span>
        </div>
        <div className="flex items-center gap-1">
          <MapPin className="w-3 h-3 text-red-600" />
          <span>Destination</span>
        </div>
      </div>
    </Card>
  );
};
