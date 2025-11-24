import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Course } from '@/lib/supabase';
import { MapPin, Plane, User, Briefcase, Users, Car, Clock, Navigation, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
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
  
  if (!course) return null;

  const openNavigation = (address: string) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    window.open(url, '_blank');
  };

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
              onClick={() => openNavigation(course.departure_location)}
              className="flex items-start gap-2 w-full text-left hover:bg-accent/50 p-2 rounded-lg transition-colors"
            >
              <MapPin className="w-4 h-4 text-green-600 mt-1 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Départ</p>
                <p className="font-medium">{course.departure_location}</p>
              </div>
              <Navigation className="w-4 h-4 text-muted-foreground mt-1" />
            </button>
            
            <button
              onClick={() => openNavigation(course.destination_location)}
              className="flex items-start gap-2 w-full text-left hover:bg-accent/50 p-2 rounded-lg transition-colors"
            >
              <MapPin className="w-4 h-4 text-red-600 mt-1 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Destination</p>
                <p className="font-medium">{course.destination_location}</p>
              </div>
              <Navigation className="w-4 h-4 text-muted-foreground mt-1" />
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
    </Dialog>
  );
};
