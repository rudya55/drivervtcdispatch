import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { useBackgroundGeolocation } from '@/hooks/useBackgroundGeolocation';
import { useNativePushNotifications } from '@/hooks/useNativePushNotifications';
import { supabase, Course } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapWithStatusButton } from '@/components/MapWithStatusButton';
import { CourseSwipeActions } from '@/components/CourseSwipeActions';
import { StatusToggle } from '@/components/StatusToggle';
import { toast } from 'sonner';
import { PullToRefresh } from '@/components/PullToRefresh';
import { useHaptics } from '@/hooks/useHaptics';
import {
  MapPin,
  Clock,
  Users,
  Briefcase,
  Euro,
  CheckCircle,
  XCircle,
  Power,
  Navigation,
  Plane,
  Baby
} from 'lucide-react';
import { formatFullDate, formatParisAddress } from '@/lib/utils';

const Home = () => {
  const { driver, session } = useAuth();
  const { unreadCount } = useNotifications(driver?.id || null, driver);
  const { success, mediumImpact, heavyImpact } = useHaptics();
  const [isActive, setIsActive] = useState(driver?.status === 'active');
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Sync isActive with driver status
  useEffect(() => {
    if (driver?.status) {
      setIsActive(driver.status === 'active');
    }
  }, [driver?.status]);

  // Background geolocation with persistent tracking
  const locationState = useBackgroundGeolocation(isActive);
  
  // Native push notifications
  useNativePushNotifications(driver?.id);
  
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
  });

  // Realtime listener for courses assigned to this driver
  useEffect(() => {
    if (!driver?.id) return;

    const channel = supabase
      .channel('driver-courses-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'courses',
          filter: `driver_id=eq.${driver.id}`,
        },
        (payload) => {
          console.log('Course update:', payload);
          queryClient.invalidateQueries({ queryKey: ['courses', driver.id] });
          
          if (payload.eventType === 'INSERT') {
            const newCourse = payload.new as Course;
            toast.success('Nouvelle course assignée !', {
              description: `${newCourse.client_name} - ${newCourse.departure_location}`,
              duration: 10000,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [driver?.id, queryClient]);

  // Update driver status
  const statusMutation = useMutation({
    mutationFn: async (status: 'active' | 'inactive') => {
      // Haptic feedback on status change
      heavyImpact();
      
      const token = session?.access_token || (await supabase.auth.getSession()).data.session?.access_token;
      const { data, error } = await supabase.functions.invoke('driver-update-status', {
        body: { status },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      
      // Fallback to direct fetch if invoke fails (iOS Safari compatibility)
      if (error && (error.message?.includes('Failed to send a request to the Edge Function') || error.message?.includes('TypeError: fetch failed'))) {
        console.warn('driver-update-status invoke failed, trying direct fetch:', error);
        const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
        const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
        
        const response = await fetch(`${SUPABASE_URL}/functions/v1/driver-update-status`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'apikey': SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMsg = errorData.error || errorData.message || 'Erreur inconnue';
          const hint = errorData.hint || '';
          const code = errorData.code || '';
          throw new Error(`${errorMsg}${hint ? ` (${hint})` : ''}${code ? ` [${code}]` : ''}`);
        }
        return;
      }
      
      if (error) {
        const ctx: any = (error as any)?.context;
        const serverMsg = (data as any)?.error || (data as any)?.message || ctx?.error || ctx?.message;
        const hint = (data as any)?.hint || ctx?.hint || '';
        const code = (data as any)?.code || ctx?.code || '';
        console.error('driver-update-status invoke error:', { error, data, context: ctx });
        throw new Error(`${serverMsg || error.message || 'Erreur inconnue'}${hint ? ` (${hint})` : ''}${code ? ` [${code}]` : ''}`);
      }
    },
    onSuccess: (_, status) => {
      success(); // Success haptic feedback
      setIsActive(status === 'active');
      toast.success(status === 'active' ? 'Vous êtes maintenant actif' : 'Vous êtes maintenant inactif');
      queryClient.invalidateQueries({ queryKey: ['courses'] });
    },
    onError: (e: any) => {
      console.error('Status update failed:', e);
      toast.error(e?.message || 'Erreur lors de la mise à jour du statut');
    },
  });

  // Accept/refuse/update course
  const courseActionMutation = useMutation({
    mutationFn: async ({ courseId, action, data }: { courseId: string; action: string; data?: any }) => {
      // Haptic feedback based on action
      if (action === 'accept' || action === 'start' || action === 'complete') {
        heavyImpact(); // Strong haptic for important actions
      } else {
        mediumImpact(); // Medium haptic for other actions
      }
      
      const { error } = await supabase.functions.invoke('driver-update-course-status', {
        body: { 
          course_id: courseId, 
          action,
          ...data
        }
      });
      if (error) throw error;
    },
    onSuccess: (_, { action }) => {
      success(); // Success haptic feedback
      const messages: Record<string, string> = {
        accept: 'Course acceptée',
        refuse: 'Course refusée',
        start: 'Course démarrée',
        arrived: 'Arrivée confirmée',
        pickup: 'Client à bord',
        dropoff: 'Client déposé',
        complete: 'Course terminée'
      };
      toast.success(messages[action] || 'Course mise à jour');
      queryClient.invalidateQueries({ queryKey: ['courses'] });
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erreur lors de la mise à jour de la course');
    },
  });

  // Filter courses to display - Include ALL active statuses
  const today = new Date().toDateString();
  const pendingCourses = courses.filter(c => c.status === 'pending' || c.status === 'dispatched');
  
  // Inclure TOUS les statuts actifs possibles (started, arrived, picked_up, dropped_off)
  const activeStatuses = ['accepted', 'in_progress', 'started', 'arrived', 'picked_up', 'dropped_off'];
  const activeCourses = courses.filter(c => activeStatuses.includes(c.status));
  const displayedCourses = [...activeCourses, ...pendingCourses];

  // Logs de diagnostic
  console.log('🔍 [Home] Courses reçues de l\'API:', courses.length);
  console.log('🔍 [Home] Détail des courses:', courses.map(c => ({ id: c.id, status: c.status, client: c.client_name })));
  console.log('🔍 [Home] Courses actives:', activeCourses.length, activeCourses.map(c => c.status));
  console.log('🔍 [Home] Courses en attente:', pendingCourses.length);

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
        const token = session?.access_token || (await supabase.auth.getSession()).data.session?.access_token;
        const { data, error } = await supabase.functions.invoke('get-google-maps-key', {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
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
    <div 
      className="min-h-screen bg-background pb-20"
      style={{ paddingTop: 'var(--header-height)' }}
    >
      <Header title="Accueil" unreadCount={unreadCount} />

      {/* Bouton En ligne/Hors ligne - Sticky en haut au centre */}
      <div 
        className="sticky z-20 flex flex-col items-center px-4 py-3 bg-background/80 backdrop-blur-sm"
        style={{ top: 'var(--header-height)' }}
      >
        <StatusToggle
          isOnline={isActive}
          onToggle={() => statusMutation.mutate(isActive ? 'inactive' : 'active')}
          isUpdating={statusMutation.isPending}
          disabled={!driver}
        />
        {!driver && (
          <p className="text-sm text-muted-foreground mt-2 text-center">
            Complétez votre profil avant d'activer le statut
          </p>
        )}
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Map avec indicateur de statut */}
        <Card className="p-0 overflow-hidden">
          <div className="h-96">
            <MapWithStatusButton
              key={mapsReady ? 'ready' : 'loading'}
              center={mapCenter}
              zoom={13}
              markers={mapMarkers}
              driverStatus={driver?.status || 'inactive'}
              onStatusChange={(status) => statusMutation.mutate(status)}
              isUpdating={statusMutation.isPending}
              driverIcon={(driver?.vehicle_icon as 'car' | 'taxi' | 'van' | 'motorcycle' | 'suv') || 'car'}
              driverHeading={locationState.heading || 0}
              gpsState={{
                isTracking: locationState.isTracking,
                accuracy: locationState.accuracy,
                error: locationState.error
              }}
            />
          </div>
        </Card>

        {/* Courses */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">
            Mes courses {displayedCourses.length > 0 && `(${displayedCourses.length})`}
          </h2>

          <PullToRefresh onRefresh={async () => {
            await queryClient.invalidateQueries({ queryKey: ['courses', driver?.id] });
          }}>
            {isLoading ? (
              <Card className="p-6">
                <p className="text-center text-muted-foreground">Chargement...</p>
              </Card>
            ) : displayedCourses.length === 0 ? (
              <Card className="p-6">
                <p className="text-center text-muted-foreground">Aucune course</p>
              </Card>
            ) : (
              displayedCourses.map((course) => {
                // Show swipe actions for all active courses (any status beyond pending/dispatched)
                if (activeStatuses.includes(course.status)) {
                  return (
                    <CourseSwipeActions
                      key={course.id}
                      course={course}
                      currentLocation={locationState.coordinates}
                      onAction={(action, data) => 
                        courseActionMutation.mutate({ 
                          courseId: course.id, 
                          action,
                          data
                        })
                      }
                    />
                  );
                }
                
                // Show accept/refuse for pending courses
                return (
                  <Card 
                    key={course.id} 
                    className="p-4 space-y-2 cursor-pointer hover:border-primary/50 transition-all"
                    onClick={() => navigate('/bookings')}
                  >
                  {/* 1. Date/Heure */}
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{formatFullDate(course.pickup_date)}</span>
                  </div>

                  {/* 2. Numéro de vol/train */}
                  {(course.flight_train_number || course.flight_number) && (
                    <div className="flex items-center gap-2">
                      <Plane className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{course.flight_train_number || course.flight_number}</span>
                    </div>
                  )}

                  {/* 3. Nom du client */}
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{course.client_name}</span>
                  </div>

                  {/* 4. Passagers et bagages */}
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

                  {/* 5. Extras (sièges enfants) */}
                  {(course.baby_seat || course.booster_seat || course.cosy_seat) && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <Baby className="w-4 h-4 text-muted-foreground" />
                      {course.baby_seat && <span className="text-sm font-medium">Siège bébé</span>}
                      {course.booster_seat && <span className="text-sm font-medium">Rehausseur</span>}
                      {course.cosy_seat && <span className="text-sm font-medium">Cosy</span>}
                    </div>
                  )}

                  {/* 6. Départ */}
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-500" />
                    <span className="text-sm font-medium">{course.departure_location}</span>
                  </div>

                  {/* 7. Destination */}
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-red-500" />
                    <span className="text-sm font-medium">{course.destination_location}</span>
                  </div>

                  {/* 8. Type de paiement */}
                  {course.payment_type && (
                    <div className="flex items-center gap-2">
                      <Euro className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{course.payment_type}</span>
                    </div>
                  )}

                  {/* 9. Prix Net Chauffeur */}
                  <div className="flex justify-end pt-2 border-t border-border/50">
                    <div className="bg-emerald-50 dark:bg-emerald-950/30 px-4 py-2 rounded-xl">
                      <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Net Chauffeur</span>
                      <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 text-center">
                        {(course.net_driver || course.client_price || 0).toFixed(0)} €
                      </p>
                    </div>
                  </div>

                  {/* Actions - Boutons simples et fiables */}
                  <div className="flex gap-3 mt-2" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="outline"
                      className="flex-1 h-14 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-base border-0 shadow-lg active:scale-95 transition-all"
                      onClick={() => courseActionMutation.mutate({ courseId: course.id, action: 'refuse' })}
                      disabled={courseActionMutation.isPending}
                    >
                      <XCircle className="w-5 h-5 mr-2" />
                      REFUSER
                    </Button>
                    <Button
                      className="flex-1 h-14 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-base border-0 shadow-lg active:scale-95 transition-all"
                      onClick={() => courseActionMutation.mutate({ courseId: course.id, action: 'accept' })}
                      disabled={courseActionMutation.isPending}
                    >
                      <CheckCircle className="w-5 h-5 mr-2" />
                      ACCEPTER
                    </Button>
                  </div>
                </Card>
              );
            })
          )}
          </PullToRefresh>
        </div>
      </div>


      <BottomNav />
    </div>
  );
};

export default Home;
