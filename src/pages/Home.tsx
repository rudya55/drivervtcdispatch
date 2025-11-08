import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { useGeolocation } from '@/hooks/useGeolocation';
import { supabase, Course } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import GoogleMap from '@/components/GoogleMap';
import { toast } from 'sonner';
import { 
  MapPin, 
  Clock, 
  Users, 
  Briefcase, 
  Euro,
  CheckCircle,
  XCircle,
  Power
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
  
  // Get center for map
  const mapCenter = locationState.coordinates || { lat: 48.8566, lng: 2.3522 };
  const mapMarkers = locationState.coordinates ? [
    { 
      lat: locationState.coordinates.lat, 
      lng: locationState.coordinates.lng,
      label: 'Vous'
    }
  ] : [];

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

  // Load Google Maps script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=YOUR_GOOGLE_MAPS_API_KEY&libraries=places`;
    script.async = true;
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background pb-20 pt-16">
      <Header title="Accueil" unreadCount={unreadCount} />

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Map */}
        <Card className="p-0 overflow-hidden">
          <div className="h-64">
            <GoogleMap
              center={mapCenter}
              zoom={13}
              markers={mapMarkers}
            />
          </div>
        </Card>

        {/* Driver Status Toggle Button */}
        <div className="flex justify-center">
          <Button
            onClick={() => statusMutation.mutate(isActive ? 'inactive' : 'active')}
            disabled={statusMutation.isPending}
            className={`h-24 w-24 rounded-full transition-all shadow-lg ${
              isActive 
                ? 'bg-success hover:bg-success/90 text-success-foreground' 
                : 'bg-destructive hover:bg-destructive/90 text-destructive-foreground'
            }`}
          >
            <div className="flex flex-col items-center gap-1">
              <Power className="w-8 h-8" />
              <span className="text-xs font-semibold">
                {isActive ? 'En ligne' : 'Hors ligne'}
              </span>
            </div>
          </Button>
        </div>

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
