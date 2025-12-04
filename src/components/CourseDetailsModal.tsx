import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Course, supabase } from '@/lib/supabase';
import { translateCourseStatus } from '@/lib/utils';
import { GPSSelector } from '@/components/GPSSelector';
import { MapPin, Plane, User, Briefcase, Users, Car, Clock, MessageCircle, Navigation, Timer, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useNativeGeolocation } from '@/hooks/useNativeGeolocation';
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
  const [mapError, setMapError] = useState(false);
  const [mapLoading, setMapLoading] = useState(true);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const directionsRendererRef = useRef<any>(null);
  const driverMarkerRef = useRef<any>(null);
  
  // Get driver's current location
  const locationState = useNativeGeolocation(open);

  // Load Google Maps and display route - MUST be before conditional return
  useEffect(() => {
    if (!open || !course || !mapRef.current) return;
    
    setMapError(false);
    setMapLoading(true);

    const initMap = async () => {
      // Check if Google Maps is ALREADY loaded (reuse existing instance)
      if ((window as any).google?.maps) {
        console.log('[Map Modal] Google Maps already loaded, using existing instance');
        createMap();
        return;
      }

      // Check if script is already being loaded
      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
      if (existingScript) {
        console.log('[Map Modal] Script already exists, waiting for load...');
        // Wait for existing script to load
        const checkGoogle = setInterval(() => {
          if ((window as any).google?.maps) {
            clearInterval(checkGoogle);
            console.log('[Map Modal] Google Maps now available');
            createMap();
          }
        }, 100);
        // Timeout after 10 seconds
        setTimeout(() => {
          clearInterval(checkGoogle);
          if (!(window as any).google?.maps) {
            console.error('[Map Modal] Timeout waiting for Google Maps');
            setMapError(true);
            setMapLoading(false);
          }
        }, 10000);
        return;
      }

      // Load Google Maps script
      try {
        console.log('[Map Modal] Fetching API key...');
        const token = session?.access_token || (await supabase.auth.getSession()).data.session?.access_token;
        const { data, error } = await supabase.functions.invoke('get-google-maps-key', {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (error || !data?.key) {
          console.error('[Map Modal] Key error:', error);
          setMapError(true);
          setMapLoading(false);
          return;
        }
        console.log('[Map Modal] Key obtained, loading script...');
        
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${data.key}&libraries=places&loading=async`;
        script.async = true;
        script.defer = true;
        script.addEventListener('load', () => {
          console.log('[Map Modal] Script loaded successfully');
          createMap();
        });
        script.addEventListener('error', () => {
          console.error('[Map Modal] Script load error');
          setMapError(true);
          setMapLoading(false);
        });
        document.head.appendChild(script);
      } catch (e) {
        console.error('[Map Modal] Loader error:', e);
        setMapError(true);
        setMapLoading(false);
      }
    };

    const createMap = () => {
      if (!mapRef.current || !(window as any).google?.maps) {
        console.error('[Map Modal] Cannot create map - missing ref or Google Maps');
        setMapError(true);
        setMapLoading(false);
        return;
      }

      const google = (window as any).google;
      console.log('[Map Modal] Creating map instance...');
      
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

      // Add driver position marker if available
      if (locationState.coordinates) {
        const driverMarker = new google.maps.Marker({
          position: {
            lat: locationState.coordinates.lat,
            lng: locationState.coordinates.lng
          },
          map,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: '#3b82f6',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 3,
          },
          title: 'Votre position',
          zIndex: 1000
        });
        driverMarkerRef.current = driverMarker;
      }

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
              console.log('[Map Modal] Directions rendered successfully');
            }
            setMapLoading(false);
          } else {
            console.error('[Map Modal] Directions failed:', status);
            setMapLoading(false);
          }
        }
      );
    };

    initMap();

    return () => {
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setMap(null);
      }
      if (driverMarkerRef.current) {
        driverMarkerRef.current.setMap(null);
      }
    };
  }, [open, course, session, locationState.coordinates]);

  // Conditional return AFTER all hooks
  if (!course) return null;

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
            {mapLoading && !mapError && (
              <div className="h-48 w-full bg-muted flex items-center justify-center absolute z-10">
                <div className="text-center text-muted-foreground">
                  <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin" />
                  <p className="text-sm">Chargement de la carte...</p>
                </div>
              </div>
            )}
            {mapError ? (
              <div className="h-48 w-full bg-muted flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Impossible de charger la carte</p>
                </div>
              </div>
            ) : (
              <div 
                ref={mapRef}
                className="h-48 w-full bg-muted"
                style={{ minHeight: '192px' }}
              />
            )}
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
