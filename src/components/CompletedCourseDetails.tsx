import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import GoogleMap from '@/components/GoogleMap';
import { supabase, Course } from '@/lib/supabase';
import { extractCity, renderTextWithLinks } from '@/lib/utils';
import { MapPin, Timer, Navigation, Euro, Star, MessageSquare, UserCheck, Flag } from 'lucide-react';
import { format, differenceInMinutes } from 'date-fns';
import { fr } from 'date-fns/locale';

interface CompletedCourseDetailsProps {
  course: Course | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const calculateTotalDistance = (points: {lat: number, lng: number}[]): number => {
  if (points.length < 2) return 0;
  
  let totalKm = 0;
  const R = 6371;
  
  for (let i = 1; i < points.length; i++) {
    const dLat = (points[i].lat - points[i-1].lat) * Math.PI / 180;
    const dLon = (points[i].lng - points[i-1].lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(points[i-1].lat * Math.PI / 180) * Math.cos(points[i].lat * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    totalKm += R * c;
  }
  return Math.round(totalKm * 10) / 10;
};

export const CompletedCourseDetails = ({ 
  course, 
  open, 
  onOpenChange 
}: CompletedCourseDetailsProps) => {
  if (!course) return null;

  const { data: accountingEntry } = useQuery({
    queryKey: ['accounting-entry', course.id],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('accounting_entries')
          .select('rating, comment, driver_amount')
          .eq('course_id', course.id)
          .single();
        
        if (error) {
          console.log('accounting_entries query error (table may not exist yet):', error.message);
          return null;
        }
        return data;
      } catch (e) {
        console.log('accounting_entries fetch failed:', e);
        return null;
      }
    },
    enabled: !!course.id && open
  });

  const { data: trackingPoints } = useQuery({
    queryKey: ['tracking-points', course.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('course_tracking')
        .select('latitude, longitude')
        .eq('course_id', course.id)
        .not('latitude', 'is', null)
        .order('created_at', { ascending: true });
      
      return data?.map(p => ({ lat: p.latitude!, lng: p.longitude! })) || [];
    },
    enabled: !!course.id && open
  });

  const distance = trackingPoints ? calculateTotalDistance(trackingPoints) : 0;
  const duration = course.picked_up_at && course.dropped_off_at
    ? differenceInMinutes(new Date(course.dropped_off_at), new Date(course.picked_up_at))
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Course terminée</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Horaires récupération/dépôt */}
          <Card className="p-4">
            <div className="space-y-2">
              {course.picked_up_at && (
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-green-500" />
                  <span className="text-sm">Récupéré :</span>
                  <span className="font-medium ml-auto">
                    {format(new Date(course.picked_up_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                  </span>
                </div>
              )}
              {course.dropped_off_at && (
                <div className="flex items-center gap-2">
                  <Flag className="w-4 h-4 text-red-500" />
                  <span className="text-sm">Déposé :</span>
                  <span className="font-medium ml-auto">
                    {format(new Date(course.dropped_off_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                  </span>
                </div>
              )}
            </div>
          </Card>

          {/* Villes départ/destination */}
          <Card className="p-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-500" />
                <span className="text-sm">Départ :</span>
                <span className="font-medium ml-auto">{extractCity(course.departure_location)}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-red-500" />
                <span className="text-sm">Destination :</span>
                <span className="font-medium ml-auto">{extractCity(course.destination_location)}</span>
              </div>
            </div>
          </Card>

          {/* Stats : km et temps */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-4 text-center">
              <Navigation className="w-6 h-6 mx-auto mb-1 text-blue-500" />
              <p className="text-2xl font-bold">{distance || '—'} km</p>
              <p className="text-xs text-muted-foreground">Distance</p>
            </Card>
            <Card className="p-4 text-center">
              <Timer className="w-6 h-6 mx-auto mb-1 text-orange-500" />
              <p className="text-2xl font-bold">{duration || '—'} min</p>
              <p className="text-xs text-muted-foreground">Durée</p>
            </Card>
          </div>

          {/* Carte avec trajet */}
          {trackingPoints && trackingPoints.length > 0 && (
            <Card className="p-0 overflow-hidden">
              <div className="h-48">
                <GoogleMap
                  center={trackingPoints[0]}
                  zoom={11}
                  routePoints={trackingPoints}
                />
              </div>
            </Card>
          )}

          {/* Prix Client + Net Chauffeur côte à côte */}
          <div className="grid grid-cols-2 gap-3">
            {/* Prix Client */}
            <Card className="p-4 bg-blue-50 dark:bg-blue-950 border-blue-200">
              <div className="flex flex-col items-center">
                <Euro className="w-5 h-5 text-blue-600 mb-1" />
                <span className="text-xs font-medium text-blue-600">Prix Client</span>
                <span className="text-2xl font-bold text-blue-600">
                  {(course.client_price || 0).toFixed(2)}€
                </span>
              </div>
            </Card>
            
            {/* Net Chauffeur */}
            <Card className="p-4 bg-green-50 dark:bg-green-950 border-green-200">
              <div className="flex flex-col items-center">
                <Euro className="w-5 h-5 text-green-600 mb-1" />
                <span className="text-xs font-medium text-green-600">Net Chauffeur</span>
                <span className="text-2xl font-bold text-green-600">
                  {(accountingEntry?.driver_amount || course.net_driver || course.client_price || 0).toFixed(2)}€
                </span>
              </div>
            </Card>
          </div>

          {/* Notation */}
          {accountingEntry?.rating && (
            <Card className="p-4">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500" />
                <span className="font-medium">Notation :</span>
                <div className="flex ml-auto">
                  {[1, 2, 3, 4, 5].map(star => (
                    <Star 
                      key={star}
                      className={`w-5 h-5 ${star <= (accountingEntry.rating || 0) ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`}
                    />
                  ))}
                </div>
              </div>
            </Card>
          )}

          {/* Commentaire avec liens cliquables - fallback depuis course.notes */}
          {(accountingEntry?.comment || course.notes) && (
            <Card className="p-4 bg-muted/50">
              <div className="flex items-start gap-2">
                <MessageSquare className="w-4 h-4 mt-0.5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm font-medium mb-1">Commentaire :</p>
                  <p className="text-sm text-muted-foreground">
                    {renderTextWithLinks(accountingEntry?.comment || course.notes || '')}
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
