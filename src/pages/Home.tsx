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
  XCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const Home = () => {
  const { driver, session } = useAuth();
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
      const token = session?.access_token || (await supabase.auth.getSession()).data.session?.access_token;
      const { data, error } = await supabase.functions.invoke('driver-update-status', {
        body: { status },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (error) {
        const serverMsg = (data as any)?.error || (data as any)?.message;
        throw new Error(serverMsg || error.message || 'Erreur inconnue');
      }
    },
    onSuccess: (_, status) => {
      setIsActive(status === 'active');
      toast.success(status === 'active' ? 'Vous êtes maintenant actif' : 'Vous êtes maintenant inactif');
      queryClient.invalidateQueries({ queryKey: ['courses'] });
    },
    onError: (e: any) => {
      console.error('Status update failed:', e);
      toast.error(e?.message || 'Erreur lors de la mise à jour du statut');
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

  // Filter pending and today's accepted courses
  const today = new Date().toDateString();
  const displayedCourses = courses.filter(c => {
    const isToday = new Date(c.pickup_date).toDateString() === today;
    return (c.status === 'pending' || c.status === 'dispatched') || (c.status === 'accepted' && isToday);
  });

  // Load Google Maps script from backend secret and track readiness
  const [mapsReady, setMapsReady] = useState<boolean>(!!(window as any).google);
  useEffect(() => {
    const load = async () => {
      if ((window as any).google) { setMapsReady(true); return; }
      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]') as HTMLScriptElement | null;
      if (existingScript) {
        existingScript.addEventListener('load', () => setMapsReady(true));
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke('get-google-maps-key');
        if (error || !data?.key) {
          console.error('Maps key error:', error);
          return;
        }
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${data.key}&libraries=places&loading=async`;
        script.async = true;
        script.defer = true;
        script.addEventListener('load', () => setMapsReady(true));
        script.addEventListener('error', (e) => console.error('Maps script error:', e));
        document.head.appendChild(script);
      } catch (e) {
        console.error('Maps loader error:', e);
      }
    };
    load();
  }, []);


  return (
    <div className="min-h-screen bg-background pb-20 pt-16">
      <Header title="Accueil" unreadCount={unreadCount} />

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Driver Status Toggle Button */}
        <div className="flex justify-center mb-2">
          <Card className="p-0 overflow-hidden inline-block">
            <button
              onClick={() => statusMutation.mutate(isActive ? 'inactive' : 'active')}
              disabled={statusMutation.isPending}
              className="flex items-center gap-3 px-4 py-2 hover:bg-accent/5 transition-colors"
            >
              <span className="text-sm font-semibold">
                {isActive ? 'En ligne' : 'Hors ligne'}
              </span>
              <div className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors ${
                isActive ? 'bg-success' : 'bg-muted'
              }`}>
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform ${
                    isActive ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </div>
            </button>
          </Card>
        </div>

        {/* Map */}
        <Card className="p-0 overflow-hidden">
          <div className="h-64">
            <GoogleMap
              key={mapsReady ? 'ready' : 'loading'}
              center={mapCenter}
              zoom={13}
              markers={mapMarkers}
            />
          </div>
        </Card>

        {/* Courses */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">
            Mes courses {displayedCourses.length > 0 && `(${displayedCourses.length})`}
          </h2>

          {isLoading ? (
            <Card className="p-6">
              <p className="text-center text-muted-foreground">Chargement...</p>
            </Card>
          ) : displayedCourses.length === 0 ? (
            <Card className="p-6">
              <p className="text-center text-muted-foreground">Aucune course</p>
            </Card>
          ) : (
            displayedCourses.map((course) => (
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
