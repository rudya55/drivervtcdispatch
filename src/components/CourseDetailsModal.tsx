import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Course } from '@/lib/supabase';
import { Phone, MapPin, Plane, User, Briefcase, Users, Car, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface CourseDetailsModalProps {
  course: Course | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CourseDetailsModal = ({ course, open, onOpenChange }: CourseDetailsModalProps) => {
  if (!course) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Détails de la course</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Badge de statut */}
          <div className="flex items-center justify-between">
            <Badge variant="secondary">{course.status}</Badge>
            {course.company_name && (
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Briefcase className="w-4 h-4" />
                {course.company_name}
              </span>
            )}
          </div>

          {/* Informations client */}
          <Card className="p-4 space-y-2">
            <h3 className="font-semibold flex items-center gap-2">
              <User className="w-4 h-4" />
              Client
            </h3>
            <p className="text-lg font-medium">{course.client_name}</p>
            {course.client_phone && (
              <a 
                href={`tel:${course.client_phone}`}
                className="flex items-center gap-2 text-primary hover:underline"
              >
                <Phone className="w-4 h-4" />
                {course.client_phone}
              </a>
            )}
          </Card>

          {/* Numéro de vol */}
          {course.flight_number && (
            <Card className="p-4 bg-blue-50 dark:bg-blue-950">
              <div className="flex items-center gap-2">
                <Plane className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <div>
                  <p className="text-sm text-muted-foreground">Numéro de vol</p>
                  <p className="font-semibold text-lg">{course.flight_number}</p>
                </div>
              </div>
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
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-green-600 mt-1" />
              <div>
                <p className="text-sm text-muted-foreground">Départ</p>
                <p className="font-medium">{course.departure_location}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-red-600 mt-1" />
              <div>
                <p className="text-sm text-muted-foreground">Destination</p>
                <p className="font-medium">{course.destination_location}</p>
              </div>
            </div>
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
        </div>
      </DialogContent>
    </Dialog>
  );
};
