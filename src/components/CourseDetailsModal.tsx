import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Course, supabase } from '@/lib/supabase';
import { translateCourseStatus } from '@/lib/utils';
import { GPSSelector } from '@/components/GPSSelector';
import { MapPin, Plane, User, Briefcase, Users, Car, Clock, MessageCircle, Navigation, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface CourseDetailsModalProps {
  course: Course | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenSignBoard?: () => void;
}

export const CourseDetailsModal = ({ course, open, onOpenChange, onOpenSignBoard }: CourseDetailsModalProps) => {
  const navigate = useNavigate();
  const { driver, session } = useAuth();
  const [showDepartureGPS, setShowDepartureGPS] = useState(false);
  const [showDestinationGPS, setShowDestinationGPS] = useState(false);
  const [routeInfo, setRouteInfo] = useState<{ distance: string; duration: string } | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const directionsRendererRef = useRef<any>(null);
  
  if (!course) return null;

  // Load Google Maps and display route
  useEffect(() => {
    if (!open || !course || !mapRef.current) return;

    const initMap = async () => {
      // Check if Google Maps is loaded
      if (!(window as any).google) {
        // Load Google Maps script
        try {
          const token = session?.access_token || (await supabase.auth.getSession()).data.session?.access_token;
          const { data, error } = await supabase.functions.invoke('get-google-maps-key', {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          });
          if (error || !data?.key) {
            console.error('Maps key error:', error);
            return;
          }
          
          const script = document.createElement('script');
          script.src = `https://maps.googleapis.com/maps/api/js?key=${data.key}&libraries=places&loading=async`;
          script.async = true;
          script.defer = true;
          script.addEventListener('load', () => {
            createMap();
          });
          document.head.appendChild(script);
        } catch (e) {
          console.error('Maps loader error:', e);
        }
      } else {
        createMap();
      }
    };

    const createMap = () => {
      if (!mapRef.current || !(window as any).google) return;

      const google = (window as any).google;
      
      // Create map centered on Paris
      const map = new google.maps.Map(mapRef.current, {
        zoom: 12,
        center: { lat: 48.8566, lng: 2.3522 },
        disableDefaultUI: true,
        zoomControl: true,
        styles: [
          { featureType: 'poi', stylers: [{ visibility: 'off' }] }
        ]
      });
      mapInstanceRef.current = map;

      // Create directions renderer
      const directionsRenderer = new google.maps.DirectionsRenderer({
        map,
        suppressMarkers: false,
        polylineOptions: {
          strokeColor: '#10b981',
          strokeWeight: 5,
          strokeOpacity: 0.8
        }
      });
      directionsRendererRef.current = directionsRenderer;

      // Calculate route
      const directionsService = new google.maps.DirectionsService();
      directionsService.route(
        {
          origin: course.departure_location,
          destination: course.destination_location,
          travelMode: google.maps.TravelMode.DRIVING,
        },
        (result: any, status: string) => {
          if (status === 'OK' && result) {
            directionsRenderer.setDirections(result);
            
            // Extract distance and duration
            const route = result.routes[0];
            if (route && route.legs[0]) {
              setRouteInfo({
                distance: route.legs[0].distance?.text || '~',
                duration: route.legs[0].duration?.text || '~'
              });
            }
          } else {
            console.error('Directions request failed:', status);
          }
        }
      );
    };

    initMap();

    return () => {
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setMap(null);
      }
    };
  }, [open, course, session]);

  const openFlightTracking = (flightNumber: string) => {
    const url = `https://www.google.com/search?q=${encodeURIComponent(flightNumber + ' statut vol')}`;
    window.open(url, '_blank');
  };

  const handleOpenChat = () => {
    onOpenChange(false);
    navigate(`/chat/${course.id}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Détails de la course</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Badge de statut + Logo flotte */}
          <div className="flex items-center justify-between">
            <Badge variant="secondary">{translateCourseStatus(course.status)}</Badge>
            {driver?.company_logo_url ? (
              <img 
                src={driver.company_logo_url} 
                alt="Logo" 
                className="h-8 w-auto object-contain"
              />
            ) : course.company_name && (
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Briefcase className="w-4 h-4" />
                {course.company_name}
              </span>
            )}
          </div>

          {/* Carte Google Maps avec trajet */}
          <Card className="p-0 overflow-hidden">
            <div 
              ref={mapRef}
              className="h-48 w-full bg-muted"
              style={{ minHeight: '192px' }}
            />
            {/* Distance et Durée */}
            {routeInfo && (
              <div className="grid grid-cols-2 divide-x border-t">
                <div className="p-3 text-center">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                    <Navigation className="w-4 h-4" />
                    <span className="text-xs">Distance</span>
                  </div>
                  <p className="font-bold text-lg">{routeInfo.distance}</p>
                </div>
                <div className="p-3 text-center">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                    <Timer className="w-4 h-4" />
                    <span className="text-xs">Durée estimée</span>
                  </div>
                  <p className="font-bold text-lg">{routeInfo.duration}</p>
                </div>
              </div>
            )}
          </Card>

          {/* Informations client */}
          <Card className="p-4 space-y-2">
            <h3 className="font-semibold flex items-center gap-2">
              <User className="w-4 h-4" />
              Client
            </h3>
            <button
              onClick={() => onOpenSignBoard?.()}
              className="text-lg font-medium text-left w-full hover:text-primary transition-colors"
            >
              {course.client_name}
            </button>
            <p className="text-xs text-muted-foreground">
              Appuyez sur le nom pour afficher la pancarte
            </p>
          </Card>

          {/* Numéro de vol */}
          {course.flight_number && (
            <Card className="p-4 bg-blue-50 dark:bg-blue-950">
              <button
                onClick={() => openFlightTracking(course.flight_number!)}
                className="flex items-center gap-2 w-full text-left hover:opacity-80 transition-opacity"
              >
                <Plane className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <div>
                  <p className="text-sm text-muted-foreground">Numéro de vol (cliquez pour suivi)</p>
                  <p className="font-semibold text-lg">{course.flight_number}</p>
                </div>
              </button>
            </Card>
          )}

          {/* Horaire */}
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Heure de prise en charge</p>
                <p className="font-semibold">
                  {format(new Date(course.pickup_date), "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr })}
                </p>
              </div>
            </div>
          </Card>

          {/* Adresses */}
          <Card className="p-4 space-y-3">
            <button
              onClick={() => setShowDepartureGPS(true)}
              className="flex items-start gap-2 w-full text-left hover:bg-accent/50 p-2 rounded-lg transition-colors"
            >
              <MapPin className="w-4 h-4 text-green-600 mt-1 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Départ</p>
                <p className="font-medium">{course.departure_location}</p>
              </div>
            </button>
            
            <button
              onClick={() => setShowDestinationGPS(true)}
              className="flex items-start gap-2 w-full text-left hover:bg-accent/50 p-2 rounded-lg transition-colors"
            >
              <MapPin className="w-4 h-4 text-red-600 mt-1 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Destination</p>
                <p className="font-medium">{course.destination_location}</p>
              </div>
            </button>
          </Card>

          {/* Détails de la course */}
          <Card className="p-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <Users className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Passagers</p>
                <p className="font-semibold">{course.passengers_count}</p>
              </div>
              <div>
                <Briefcase className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Bagages</p>
                <p className="font-semibold">{course.luggage_count}</p>
              </div>
              <div>
                <Car className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Type</p>
                <p className="font-semibold text-sm">{course.vehicle_type}</p>
              </div>
            </div>
          </Card>

          {/* Notes */}
          {course.notes && (
            <Card className="p-4">
              <p className="text-sm text-muted-foreground mb-1">Notes</p>
              <p className="text-sm">{course.notes}</p>
            </Card>
          )}

          {/* Bouton Chat */}
          <Button
            onClick={handleOpenChat}
            className="w-full"
            size="lg"
          >
            <MessageCircle className="w-5 h-5 mr-2" />
            Chat avec le dispatch
          </Button>
        </div>
      </DialogContent>

      {/* GPS Selector pour Départ */}
      <GPSSelector
        address={course.departure_location}
        open={showDepartureGPS}
        onOpenChange={setShowDepartureGPS}
        label="Adresse de départ"
      />

      {/* GPS Selector pour Destination */}
      <GPSSelector
        address={course.destination_location}
        open={showDestinationGPS}
        onOpenChange={setShowDestinationGPS}
        label="Adresse de destination"
      />
    </Dialog>
  );
};
