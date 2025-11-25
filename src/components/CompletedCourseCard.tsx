import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Course } from '@/lib/supabase';
import { simplifyAddress, calculateDuration } from '@/lib/addressUtils';
import { CourseMap } from '@/components/CourseMap';
import {
  MapPin,
  Clock,
  Navigation,
  Calendar,
  Euro,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface CompletedCourseCardProps {
  course: Course;
}

export const CompletedCourseCard = ({ course }: CompletedCourseCardProps) => {
  const [showDetails, setShowDetails] = useState(false);
  const [distance, setDistance] = useState<string>('');
  const [duration, setDuration] = useState<string>('');

  // Calculer la durée réelle de la course
  const courseDuration = calculateDuration(course.started_at, course.completed_at);

  // Adresses simplifiées pour la sécurité
  const simplifiedDeparture = simplifyAddress(course.departure_location);
  const simplifiedDestination = simplifyAddress(course.destination_location);

  // Calculer la distance et durée via Google Maps
  useEffect(() => {
    if (!window.google || !course.departure_location || !course.destination_location) return;

    const directionsService = new google.maps.DirectionsService();

    directionsService.route(
      {
        origin: course.departure_location,
        destination: course.destination_location,
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === 'OK' && result && result.routes[0]) {
          const route = result.routes[0];
          if (route.legs[0]) {
            setDistance(route.legs[0].distance?.text || '');
            setDuration(route.legs[0].duration?.text || '');
          }
        }
      }
    );
  }, [course.departure_location, course.destination_location]);

  return (
    <Card className="overflow-hidden">
      {/* En-tête compacte */}
      <div
        className="p-4 cursor-pointer hover:bg-accent/50 transition-colors"
        onClick={() => setShowDetails(!showDetails)}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              {format(new Date(course.completed_at || course.created_at), 'dd MMM yyyy', { locale: fr })}
            </span>
          </div>
          <Badge variant="default" className="bg-green-600">
            Terminée
          </Badge>
        </div>

        {/* Trajet simplifié */}
        <div className="space-y-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span className="font-semibold text-sm">{simplifiedDeparture}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500"></div>
            <span className="font-semibold text-sm">{simplifiedDestination}</span>
          </div>
        </div>

        {/* Infos rapides */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Navigation className="w-3 h-3" />
              <span>{distance || 'Calcul...'}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{courseDuration}</span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-green-600 font-bold">
            <Euro className="w-4 h-4" />
            <span>{course.net_driver?.toFixed(2) || course.client_price.toFixed(2)}€</span>
          </div>
        </div>

        {/* Bouton expand */}
        <div className="flex justify-center mt-3">
          {showDetails ? (
            <ChevronUp className="w-5 h-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Détails expandables */}
      {showDetails && (
        <div className="border-t bg-muted/20 p-4 space-y-4">
          {/* Carte avec trajet */}
          <div>
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Trajet effectué
            </h4>
            <CourseMap
              departureLocation={course.departure_location}
              destinationLocation={course.destination_location}
              driverLocation={null}
            />
          </div>

          {/* Détails temporels */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Horaires
            </h4>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-background p-2 rounded">
                <p className="text-muted-foreground">Prise en charge</p>
                <p className="font-semibold">
                  {course.picked_up_at
                    ? format(new Date(course.picked_up_at), 'HH:mm', { locale: fr })
                    : '-'}
                </p>
              </div>
              <div className="bg-background p-2 rounded">
                <p className="text-muted-foreground">Dépôt</p>
                <p className="font-semibold">
                  {course.dropped_off_at
                    ? format(new Date(course.dropped_off_at), 'HH:mm', { locale: fr })
                    : '-'}
                </p>
              </div>
            </div>
          </div>

          {/* Stats de la course */}
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-background p-2 rounded">
              <p className="text-muted-foreground mb-1">Distance</p>
              <p className="font-bold text-primary">{distance || '-'}</p>
            </div>
            <div className="bg-background p-2 rounded">
              <p className="text-muted-foreground mb-1">Durée</p>
              <p className="font-bold text-primary">{courseDuration}</p>
            </div>
            <div className="bg-background p-2 rounded">
              <p className="text-muted-foreground mb-1">Gain</p>
              <p className="font-bold text-green-600">
                {course.net_driver?.toFixed(2) || course.client_price.toFixed(2)}€
              </p>
            </div>
          </div>

          {/* Client (nom simplifié aussi) */}
          <div className="bg-background p-2 rounded text-xs">
            <p className="text-muted-foreground">Client</p>
            <p className="font-semibold">{course.client_name}</p>
          </div>
        </div>
      )}
    </Card>
  );
};
