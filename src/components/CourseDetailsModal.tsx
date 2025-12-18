import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Course, supabase } from '@/lib/supabase';
import { translateCourseStatus, formatFullDate, cn } from '@/lib/utils';
import { GPSSelector } from '@/components/GPSSelector';
import { MapPin, Plane, User, Briefcase, Users, Clock, MessageCircle, Navigation, Timer, Loader2, Baby, Euro, CheckCircle, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useNativeGeolocation } from '@/hooks/useNativeGeolocation';

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
  const [selectedStopAddress, setSelectedStopAddress] = useState<string | null>(null);
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

  const flightNumber = course.flight_train_number || course.flight_number;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Détails de la course</span>
            <Badge variant="secondary">{translateCourseStatus(course.status)}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* 1. Date/Heure */}
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">{formatFullDate(course.pickup_date)}</span>
          </div>

          {/* 2. Numéro de vol/train */}
          {flightNumber && (
            <button
              onClick={() => openFlightTracking(flightNumber)}
              className="flex items-center gap-2 w-full text-left hover:opacity-80 transition-opacity"
            >
              <Plane className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium text-blue-600">{flightNumber}</span>
            </button>
          )}

          {/* 3. Nom du client */}
          <button
            onClick={() => onOpenSignBoard?.()}
            className="flex items-center gap-2 w-full text-left hover:text-primary transition-colors"
          >
            <User className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">{course.client_name}</span>
          </button>

          {/* 4. Passagers / Bagages */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">{course.passengers_count} pers.</span>
            </div>
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">{course.luggage_count} bag.</span>
            </div>
          </div>

          {/* 5. Extras */}
          {(course.baby_seat || course.booster_seat || course.cosy_seat) && (
            <div className="flex items-center gap-2 flex-wrap">
              <Baby className="w-4 h-4 text-muted-foreground" />
              {course.baby_seat && <span className="text-sm font-medium">Siège bébé</span>}
              {course.booster_seat && <span className="text-sm font-medium">Rehausseur</span>}
              {course.cosy_seat && <span className="text-sm font-medium">Cosy</span>}
            </div>
          )}

          {/* 6. Départ */}
          <button
            onClick={() => setShowDepartureGPS(true)}
            className="flex items-center gap-2 w-full text-left hover:bg-accent/50 rounded-lg transition-colors"
          >
            <MapPin className="w-4 h-4 text-green-500" />
            <span className="text-sm font-medium">{course.departure_location}</span>
          </button>

          {/* 7. Destination(s) */}
          {course.stops && course.stops.length > 0 ? (
            <div className="space-y-2">
              {course.stops.map((stop) => (
                <button
                  key={stop.id}
                  onClick={() => {
                    setSelectedStopAddress(stop.address);
                    setShowDestinationGPS(true);
                  }}
                  className="flex items-start gap-2 w-full text-left hover:bg-accent/50 rounded-lg p-2 transition-colors border-l-2 border-red-300"
                >
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold mt-0.5">
                    {stop.stop_order}
                  </span>
                  <span className="text-sm font-medium flex-1">{stop.address}</span>
                  {stop.completed && (
                    <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          ) : (
            <button
              onClick={() => {
                setSelectedStopAddress(null);
                setShowDestinationGPS(true);
              }}
              className="flex items-center gap-2 w-full text-left hover:bg-accent/50 rounded-lg transition-colors"
            >
              <MapPin className="w-4 h-4 text-red-500" />
              <span className="text-sm font-medium">{course.destination_location}</span>
            </button>
          )}

          {/* 8. Type de paiement */}
          {course.payment_type && (
            <div className="flex items-center gap-2">
              <Euro className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">{course.payment_type}</span>
            </div>
          )}

          {/* 9. Prix Client + Net Chauffeur côte à côte */}
          <div className="flex justify-between pt-2 border-t gap-3">
            {/* Prix Client */}
            <div className="bg-blue-50 dark:bg-blue-950/30 px-4 py-2 rounded-xl flex-1 text-center">
              <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Prix Client</p>
              <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                {(course.client_price || 0).toFixed(0)} €
              </p>
            </div>
            
            {/* Net Chauffeur */}
            <div className="bg-emerald-50 dark:bg-emerald-950/30 px-4 py-2 rounded-xl flex-1 text-center">
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Net Chauffeur</p>
              <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                {(course.net_driver || course.client_price || 0).toFixed(0)} €
              </p>
            </div>
          </div>

          {/* Notes */}
          {course.notes && (
            <div className="pt-2 border-t">
              <p className="text-sm text-muted-foreground">{course.notes}</p>
            </div>
          )}

          {/* Liste des arrêts pour mise_dispo / transfert */}
          {course.stops && course.stops.length > 0 && (
            <Card className="p-3 border-primary/20 bg-primary/5">
              <div className="flex items-center gap-2 mb-3">
                <Navigation className="w-4 h-4 text-primary" />
                <span className="font-medium text-sm">
                  Arrêts ({course.stops.filter(s => s.completed).length}/{course.stops.length})
                </span>
                <Badge variant="outline" className="ml-auto text-xs">
                  {course.course_type === 'mise_dispo' ? 'Mise à dispo' : 'Transfert'}
                </Badge>
              </div>
              <div className="space-y-2">
                {course.stops.map((stop, index) => (
                  <div 
                    key={stop.id} 
                    className={cn(
                      "flex items-start gap-3 p-2 rounded-lg border transition-colors",
                      stop.completed 
                        ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800" 
                        : "bg-background border-border"
                    )}
                  >
                    <div className={cn(
                      "flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold",
                      stop.completed 
                        ? "bg-emerald-500 text-white" 
                        : "bg-primary text-primary-foreground"
                    )}>
                      {stop.completed ? <CheckCircle className="w-4 h-4" /> : stop.stop_order}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-sm font-medium truncate",
                        stop.completed && "line-through text-muted-foreground"
                      )}>
                        {stop.address}
                      </p>
                      {stop.client_name && (
                        <p className="text-xs text-muted-foreground">
                          Client: {stop.client_name}
                        </p>
                      )}
                      {stop.notes && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                          {stop.notes}
                        </p>
                      )}
                    </div>
                    {stop.completed && (
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                        ✓ Déposé
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Carte Google Maps */}
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
                    <span className="text-xs">Durée</span>
                  </div>
                  <p className="font-bold text-lg">{routeInfo.duration}</p>
                </div>
              </div>
            )}
          </Card>

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
        address={selectedStopAddress || course.destination_location}
        open={showDestinationGPS}
        onOpenChange={(open) => {
          setShowDestinationGPS(open);
          if (!open) setSelectedStopAddress(null);
        }}
        label={selectedStopAddress ? "Adresse de l'arrêt" : "Adresse de destination"}
      />
    </Dialog>
  );
};
