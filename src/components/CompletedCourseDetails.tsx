import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import GoogleMap from '@/components/GoogleMap';
import { Course } from '@/lib/supabase';
import { 
  MapPin, 
  Clock, 
  Users, 
  Briefcase, 
  Euro,
  Calendar,
  Timer,
  Navigation
} from 'lucide-react';
import { format, differenceInMinutes } from 'date-fns';
import { fr } from 'date-fns/locale';

interface CompletedCourseDetailsProps {
  course: Course | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CompletedCourseDetails = ({ 
  course, 
  open, 
  onOpenChange 
}: CompletedCourseDetailsProps) => {
  if (!course) return null;

  // Calculer la durée
  const duration = course.started_at && course.completed_at
    ? differenceInMinutes(new Date(course.completed_at), new Date(course.started_at))
    : 0;

  // Distance estimée (km) - en vrai il faudrait calculer avec l'API Google Maps
  const estimatedDistance = Math.round((duration / 60) * 45); // Estimation 45km/h moyenne

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Détails de la course terminée</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Company & Status */}
          <div className="flex items-center justify-between">
            {course.company_name && (
              <Badge variant="secondary">{course.company_name}</Badge>
            )}
            <Badge variant="default" className="bg-success text-white">
              Terminée
            </Badge>
          </div>

          {/* Map */}
          <Card className="p-0 overflow-hidden">
            <div className="h-64">
              <GoogleMap
                center={{ lat: 48.8566, lng: 2.3522 }}
                zoom={12}
                markers={[
                  { lat: 48.8566, lng: 2.3522, label: 'D' },
                  { lat: 48.8606, lng: 2.3376, label: 'A' }
                ]}
              />
            </div>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Timer className="w-4 h-4" />
                <span className="text-sm">Durée</span>
              </div>
              <p className="text-2xl font-bold">{duration} min</p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Navigation className="w-4 h-4" />
                <span className="text-sm">Distance</span>
              </div>
              <p className="text-2xl font-bold">{estimatedDistance} km</p>
            </Card>
          </div>

          {/* Client Info */}
          <Card className="p-4">
            <h3 className="font-semibold mb-3">Informations client</h3>
            <div className="space-y-2">
              <p><span className="text-muted-foreground">Nom:</span> {course.client_name}</p>
              {course.client_phone && (
                <p><span className="text-muted-foreground">Téléphone:</span> {course.client_phone}</p>
              )}
            </div>
          </Card>

          {/* Locations */}
          <Card className="p-4">
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-primary mt-1 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Départ</p>
                  <p className="text-sm font-medium">{course.departure_location}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-destructive mt-1 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Destination</p>
                  <p className="text-sm font-medium">{course.destination_location}</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Timing */}
          <Card className="p-4">
            <h3 className="font-semibold mb-3">Horaires</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Prise en charge prévue:</span>
                <span className="font-medium">
                  {format(new Date(course.pickup_date), 'PPp', { locale: fr })}
                </span>
              </div>
              {course.started_at && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Départ réel:</span>
                  <span className="font-medium">
                    {format(new Date(course.started_at), 'PPp', { locale: fr })}
                  </span>
                </div>
              )}
              {course.completed_at && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Arrivée:</span>
                  <span className="font-medium">
                    {format(new Date(course.completed_at), 'PPp', { locale: fr })}
                  </span>
                </div>
              )}
            </div>
          </Card>

          {/* Payment */}
          <Card className="p-4 bg-success/5 border-success/20">
            <h3 className="font-semibold mb-3">Paiement</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span>Prix client:</span>
                <span className="font-medium">{course.client_price.toFixed(2)}€</span>
              </div>
              {course.commission && (
                <div className="flex items-center justify-between text-warning">
                  <span>Commission:</span>
                  <span className="font-medium">-{course.commission.toFixed(2)}€</span>
                </div>
              )}
              <div className="flex items-center justify-between text-lg pt-2 border-t border-success/20">
                <span className="font-bold text-success">Net chauffeur:</span>
                <span className="font-bold text-success">
                  {(course.net_driver || course.client_price).toFixed(2)}€
                </span>
              </div>
            </div>
          </Card>

          {/* Additional Info */}
          <Card className="p-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span>{course.passengers_count} passagers</span>
              </div>
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-muted-foreground" />
                <span>{course.luggage_count} bagages</span>
              </div>
            </div>
          </Card>

          {course.notes && (
            <Card className="p-4 bg-muted/50">
              <p className="text-sm"><span className="font-semibold">Notes:</span> {course.notes}</p>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};