import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { useGeolocation } from '@/hooks/useGeolocation';
import { supabase, Course } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  MapPin, 
  Clock, 
  Users, 
  Briefcase, 
  Euro,
  Navigation,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const Home = () => {
  const { driver } = useAuth();
  const { unreadCount } = useNotifications(driver?.id || null);
  const [isActive, setIsActive] = useState(driver?.status === 'active');
  const queryClient = useQueryClient();

  // Enable geolocation when driver is active
  const locationState = useGeolocation(isActive);

  // Fetch courses
  const { data: courses = [], isLoading } = useQuery({
    queryKey: ['courses', driver?.id],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('driver-courses');
      if (error) throw error;
      return (data?.courses || []) as Course[];
    },
    enabled: !!driver?.id,
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Update driver status
  const statusMutation = useMutation({
    mutationFn: async (status: 'active' | 'inactive') => {
      const { error } = await supabase.functions.invoke('driver-update-status', {
        body: { status }
      });
      if (error) throw error;
    },
    onSuccess: (_, status) => {
      setIsActive(status === 'active');
      toast.success(status === 'active' ? 'Vous êtes maintenant actif' : 'Vous êtes maintenant inactif');
      queryClient.invalidateQueries({ queryKey: ['courses'] });
    },
    onError: () => {
      toast.error('Erreur lors de la mise à jour du statut');
    },
  });

  // Accept/refuse course
  const courseActionMutation = useMutation({
    mutationFn: async ({ courseId, action }: { courseId: string; action: string }) => {
      const { error } = await supabase.functions.invoke('driver-update-course-status', {
        body: { course_id: courseId, action }
      });
      if (error) throw error;
    },
    onSuccess: (_, { action }) => {
      toast.success(action === 'accept' ? 'Course acceptée' : 'Course refusée');
      queryClient.invalidateQueries({ queryKey: ['courses'] });
    },
    onError: () => {
      toast.error('Erreur lors de la mise à jour de la course');
    },
  });

  // Filter pending courses
  const pendingCourses = courses.filter(c => c.status === 'pending' || c.status === 'dispatched');

  return (
    <div className="min-h-screen bg-background pb-20 pt-16">
      <Header title="Accueil" unreadCount={unreadCount} />

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Driver Status Card */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="status" className="text-base font-semibold">
                Statut chauffeur
              </Label>
              <p className="text-sm text-muted-foreground">
                {isActive ? 'Vous recevez les courses' : 'Vous ne recevez pas de courses'}
              </p>
            </div>
            <Switch
              id="status"
              checked={isActive}
              onCheckedChange={(checked) => {
                statusMutation.mutate(checked ? 'active' : 'inactive');
              }}
              disabled={statusMutation.isPending}
            />
          </div>

          {/* GPS Status */}
          {isActive && (
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex items-center gap-2 text-sm">
                <Navigation className={`w-4 h-4 ${locationState.isTracking ? 'text-success' : 'text-muted-foreground'}`} />
                <span className={locationState.isTracking ? 'text-success' : 'text-muted-foreground'}>
                  GPS: {locationState.isTracking ? 'Actif' : 'En attente...'}
                </span>
                {locationState.accuracy && (
                  <span className="text-muted-foreground">
                    (±{Math.round(locationState.accuracy)}m)
                  </span>
                )}
              </div>
              {locationState.error && (
                <p className="text-sm text-destructive mt-1">{locationState.error}</p>
              )}
            </div>
          )}
        </Card>

        {/* Pending Courses */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">
            Nouvelles courses {pendingCourses.length > 0 && `(${pendingCourses.length})`}
          </h2>

          {isLoading ? (
            <Card className="p-6">
              <p className="text-center text-muted-foreground">Chargement...</p>
            </Card>
          ) : pendingCourses.length === 0 ? (
            <Card className="p-6">
              <p className="text-center text-muted-foreground">
                {isActive ? 'Aucune course en attente' : 'Activez votre statut pour recevoir des courses'}
              </p>
            </Card>
          ) : (
            pendingCourses.map((course) => (
              <Card key={course.id} className="p-4 space-y-4">
                {/* Company & Vehicle */}
                {course.company_name && (
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary">{course.company_name}</Badge>
                    <Badge variant="outline">{course.vehicle_type}</Badge>
                  </div>
                )}

                {/* Pickup Date/Time */}
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">
                    {format(new Date(course.pickup_date), 'PPp', { locale: fr })}
                  </span>
                </div>

                {/* Locations */}
                <div className="space-y-2">
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

                {/* Details */}
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span>{course.passengers_count}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Briefcase className="w-4 h-4 text-muted-foreground" />
                    <span>{course.luggage_count}</span>
                  </div>
                  <div className="flex items-center gap-1 ml-auto">
                    <Euro className="w-4 h-4 text-success" />
                    <span className="font-semibold text-success">
                      {course.net_driver ? course.net_driver.toFixed(2) : course.client_price.toFixed(2)}€
                    </span>
                  </div>
                </div>

                {/* Notes */}
                {course.notes && (
                  <p className="text-sm text-muted-foreground border-l-2 border-primary pl-3">
                    {course.notes}
                  </p>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => courseActionMutation.mutate({ courseId: course.id, action: 'refuse' })}
                    disabled={courseActionMutation.isPending}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Refuser
                  </Button>
                  <Button
                    variant="default"
                    className="flex-1 bg-accent hover:bg-accent/90"
                    onClick={() => courseActionMutation.mutate({ courseId: course.id, action: 'accept' })}
                    disabled={courseActionMutation.isPending}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Accepter
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Home;
