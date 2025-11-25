import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Course } from '@/lib/supabase';
import { translateCourseStatus } from '@/lib/utils';
import { GPSSelector } from '@/components/GPSSelector';
import { MapPin, Plane, User, Briefcase, Users, Car, Clock, MessageCircle, Baby, AlertCircle, FileText } from 'lucide-react';
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
  const { driver } = useAuth();
  const [showDepartureGPS, setShowDepartureGPS] = useState(false);
  const [showDestinationGPS, setShowDestinationGPS] = useState(false);
  
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
            <Card className="p-4 bg-blue-100 dark:bg-blue-950/50 border-2 border-blue-300 dark:border-blue-800">
              <button
                onClick={() => openFlightTracking(course.flight_number!)}
                className="flex items-center gap-3 w-full text-left hover:opacity-80 transition-opacity"
              >
                <Plane className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                <div>
                  <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">Numéro de vol (cliquez pour suivi)</p>
                  <p className="font-bold text-xl text-blue-900 dark:text-blue-100">{course.flight_number}</p>
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

          {/* EXTRAS - ÉQUIPEMENTS SPÉCIAUX */}
          {(course.extras || (course.notes && /siège|rehausseur|cosy|bébé|baby/i.test(course.notes))) && (
            <Card className="p-4 bg-pink-100 dark:bg-pink-950/50 border-2 border-pink-400 dark:border-pink-800">
              <div className="flex items-start gap-3">
                <div className="bg-pink-500 dark:bg-pink-600 p-2 rounded-full flex-shrink-0">
                  <Baby className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-xs font-extrabold text-pink-800 dark:text-pink-200 uppercase tracking-wider flex items-center gap-2 mb-1">
                    <AlertCircle className="w-4 h-4" />
                    Équipements spéciaux requis
                  </p>
                  <p className="text-base font-bold text-pink-900 dark:text-pink-100 whitespace-pre-wrap leading-relaxed">
                    {course.extras || course.notes}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* NOTES si disponibles et différentes des extras */}
          {course.notes && !course.extras && !/siège|rehausseur|cosy|bébé|baby/i.test(course.notes) && (
            <Card className="p-4 bg-amber-100 dark:bg-amber-950/50 border-2 border-amber-300 dark:border-amber-800">
              <div className="flex items-start gap-2">
                <FileText className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-bold text-amber-800 dark:text-amber-200 uppercase tracking-wide mb-1">Notes</p>
                  <p className="text-base font-medium text-amber-900 dark:text-amber-100 whitespace-pre-wrap">{course.notes}</p>
                </div>
              </div>
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
