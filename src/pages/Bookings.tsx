import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase, Course } from '@/lib/supabase';
import { translateCourseStatus, extractCity, formatFullDate, formatParisAddress } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, MapPin, Users, Briefcase, Car, Plane, Euro, CheckCircle, XCircle, Loader2, Play, Flag, Navigation, Baby } from 'lucide-react';
import { toast } from 'sonner';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { useNotifications } from '@/hooks/useNotifications';
import { CourseCountdown } from '@/components/CourseCountdown';
import { CourseDetailsModal } from '@/components/CourseDetailsModal';
import { SignBoardModal } from '@/components/SignBoardModal';
import { CourseSwipeActions } from '@/components/CourseSwipeActions';
import { CompletedCourseDetails } from '@/components/CompletedCourseDetails';
import { Info } from 'lucide-react';
import { useBackgroundGeolocation } from '@/hooks/useBackgroundGeolocation';
import { PullToRefresh } from '@/components/PullToRefresh';
import { useHaptics } from '@/hooks/useHaptics';

const Bookings = () => {
  const { driver } = useAuth();
  const { unreadCount } = useNotifications(driver?.id || null, driver);
  const { success, mediumImpact, heavyImpact } = useHaptics();
  const [loading, setLoading] = useState(false);
  const [newCourses, setNewCourses] = useState<Course[]>([]);
  const [activeCourses, setActiveCourses] = useState<Course[]>([]);
  const [completedCourses, setCompletedCourses] = useState<Course[]>([]);
  const [processing, setProcessing] = useState<string | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedCompletedCourse, setSelectedCompletedCourse] = useState<Course | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [showSignBoard, setShowSignBoard] = useState(false);

  // Activer le GPS en continu quand il y a des courses actives
  const activeCoursesList = newCourses.filter(c => 
    c.status === 'accepted' || c.status === 'in_progress'
  ).concat(activeCourses);
  const gpsState = useBackgroundGeolocation(activeCoursesList.length > 0);

  // Mettre à jour la position en temps réel
  useEffect(() => {
    if (gpsState.coordinates) {
      setCurrentLocation(gpsState.coordinates);
    }
  }, [gpsState.coordinates]);

  useEffect(() => {
    if (driver) {
      fetchCourses();
    } else {
      setLoading(false);
    }
  }, [driver]);

  // Get GPS location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error('Geolocation error:', error);
        }
      );
    }
  }, []);

  // Fonction pour vérifier si une course peut être démarrée (1h avant pickup)
  const canStartCourse = (pickupDate: string): boolean => {
    const pickup = new Date(pickupDate);
    const unlockTime = new Date(pickup.getTime() - 60 * 60000); // 1h avant
    const now = new Date();
    return now >= unlockTime;
  };

  // Mémoriser la callback onUnlock pour éviter les re-renders
  const handleCourseUnlock = useCallback(() => {
    toast.success('Course débloquée ! Vous pouvez la démarrer.');
    // Pas de fetchCourses() ici - le realtime listener s'en charge
  }, []);

  // Realtime listener for courses - Two channels for better reactivity
  useEffect(() => {
    if (!driver) return;

    // Channel 1: My assigned courses
    const myCoursesChannel = supabase
      .channel('my-bookings-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'courses',
          filter: `driver_id=eq.${driver.id}`,
        },
        (payload) => {
          console.log('My course update:', payload);
          fetchCourses();
        }
      )
      .subscribe();

    // Channel 2: Auto-dispatched courses (visible by all active drivers)
    const autoDispatchChannel = supabase
      .channel('auto-dispatch-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'courses',
          filter: `status=eq.dispatched,dispatch_mode=eq.auto`,
        },
        (payload) => {
          console.log('Auto-dispatch course update:', payload);
          fetchCourses();
          
          if (payload.eventType === 'INSERT') {
            toast.info('Nouvelle course disponible !', {
              description: 'Une course vient d\'être publiée'
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(myCoursesChannel);
      supabase.removeChannel(autoDispatchChannel);
    };
  }, [driver]);

  // Synchronize with notifications system
  useEffect(() => {
    const handleNewCourseNotification = () => {
      console.log('🔔 New course notification received, reloading courses...');
      fetchCourses();
    };
    
    window.addEventListener('reload-courses', handleNewCourseNotification);
    
    return () => {
      window.removeEventListener('reload-courses', handleNewCourseNotification);
    };
  }, []);

  const fetchCourses = async () => {
    if (!driver) return;

    console.log('📊 Fetching courses for driver:', driver.id);
    console.log('📊 Driver accepts vehicle types:', driver.vehicle_types_accepted);

    setLoading(true);
    try {
      // Use Edge Function that handles dispatch_mode and vehicle_types_accepted filtering
      const { data, error } = await supabase.functions.invoke('driver-courses');

      if (error) throw error;

      console.log('📊 Received courses:', data?.courses?.length || 0);
      console.log('📊 Courses by status:', {
        dispatched: data?.courses?.filter((c: Course) => c.status === 'dispatched').length,
        pending: data?.courses?.filter((c: Course) => c.status === 'pending').length,
        accepted: data?.courses?.filter((c: Course) => c.status === 'accepted').length,
        in_progress: data?.courses?.filter((c: Course) => c.status === 'in_progress').length,
        completed: data?.courses?.filter((c: Course) => c.status === 'completed').length,
      });

      if (data?.courses) {
        // Include both 'dispatched' and 'pending' in new courses tab
        const newCoursesFiltered = data.courses.filter((c: Course) => 
          c.status === 'dispatched' || c.status === 'pending'
        );
        
        // Active courses include all in-progress statuses
        const activeCoursesFiltered = data.courses.filter((c: Course) => 
          ['accepted', 'in_progress', 'started', 'arrived', 'picked_up'].includes(c.status)
        );
        
        // Completed courses
        const completedCoursesFiltered = data.courses.filter((c: Course) => 
          ['completed', 'dropped_off'].includes(c.status)
        );

        console.log('📊 Setting state:', {
          new: newCoursesFiltered.length,
          active: activeCoursesFiltered.length,
          completed: completedCoursesFiltered.length
        });

        setNewCourses(newCoursesFiltered);
        setActiveCourses(activeCoursesFiltered);
        setCompletedCourses(completedCoursesFiltered);
      }
    } catch (error: any) {
      console.error('❌ Fetch courses error:', error);
      toast.error('Erreur lors du chargement des courses');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptCourse = async (courseId: string) => {
    if (!driver) return;

    setProcessing(courseId);
    mediumImpact(); // Haptic feedback on button press
    try {
      const { error } = await supabase.functions.invoke('driver-update-course-status', {
        body: { course_id: courseId, action: 'accept' }
      });

      if (error) throw error;

      success(); // Success haptic feedback
      toast.success('Course acceptée !');
      fetchCourses();
    } catch (error: any) {
      console.error('Accept course error:', error);
      toast.error('Erreur lors de l\'acceptation');
    } finally {
      setProcessing(null);
    }
  };

  const handleRefuseCourse = async (courseId: string) => {
    setProcessing(courseId);
    mediumImpact(); // Haptic feedback on button press
    try {
      const { error } = await supabase.functions.invoke('driver-update-course-status', {
        body: { course_id: courseId, action: 'refuse' }
      });

      if (error) throw error;

      toast.success('Course refusée');
      fetchCourses();
    } catch (error: any) {
      console.error('Refuse course error:', error);
      toast.error('Erreur lors du refus');
    } finally {
      setProcessing(null);
    }
  };

  const handleStartCourse = async (courseId: string) => {
    setProcessing(courseId);
    heavyImpact(); // Strong haptic for important action
    try {
      const { error } = await supabase.functions.invoke('driver-update-course-status', {
        body: { course_id: courseId, action: 'start' }
      });
      if (error) throw error;
      success(); // Success haptic feedback
      toast.success('Course démarrée');
      fetchCourses();
    } catch (error: any) {
      console.error('Start course error:', error);
      toast.error('Erreur lors du démarrage de la course');
    } finally {
      setProcessing(null);
    }
  };

  const handleCompleteCourse = async (courseId: string) => {
    setProcessing(courseId);
    heavyImpact(); // Strong haptic for important action
    try {
      const { error } = await supabase.functions.invoke('driver-update-course-status', {
        body: { course_id: courseId, action: 'complete' }
      });
      if (error) throw error;
      
      const { data: completedCourse } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single();
      
      if (completedCourse) {
        setSelectedCourse(completedCourse);
      }
      
      success(); // Success haptic feedback
      toast.success('Course terminée !');
      fetchCourses();
    } catch (error: any) {
      console.error('Complete course error:', error);
      toast.error('Erreur lors de la fin de la course');
    } finally {
      setProcessing(null);
    }
  };

  const handleCourseAction = async (action: string, data?: any) => {
    if (!driver) return;

    const courseId = data?.course_id || activeCourses[0]?.id;
    if (!courseId) return;

    setProcessing(courseId);
    // Haptic feedback based on action importance
    if (action === 'start' || action === 'complete') {
      heavyImpact(); // Strong haptic for major actions
    } else {
      mediumImpact(); // Medium haptic for status changes
    }
    
    try {
      console.log(`📤 Action: ${action}`, data);

      const body: any = {
        course_id: courseId,
        action,
      };

      if (action === 'complete' && data) {
        body.rating = data.rating;
        body.comment = data.comment;
        body.final_price = data.finalPrice;
      }

      if (currentLocation) {
        body.latitude = currentLocation.lat;
        body.longitude = currentLocation.lng;
      }

      const { error } = await supabase.functions.invoke('driver-update-course-status', {
        body
      });

      if (error) throw error;

      success(); // Success haptic feedback
      
      const successMessages: Record<string, string> = {
        start: '🚗 Course démarrée !',
        arrived: '📍 Arrivée confirmée !',
        pickup: '✅ Client à bord !',
        dropoff: '🏁 Client déposé !',
        complete: '🎉 Course terminée !',
      };

      toast.success(successMessages[action] || 'Action effectuée !');
      await fetchCourses();

    } catch (error: any) {
      console.error(`❌ ${action} error:`, error);
      toast.error(`Erreur lors de l'action : ${error.message || 'Erreur inconnue'}`);
    } finally {
      setProcessing(null);
    }
  };

  const CourseCard = ({ 
    course, 
    showActions = false,
    showTimer = false,
    showStartButton = false 
  }: { 
    course: Course; 
    showActions?: boolean;
    showTimer?: boolean;
    showStartButton?: boolean;
  }) => {
    const pickupDate = new Date(course.pickup_date);
    const isPending = processing === course.id;
    const isUnlocked = canStartCourse(course.pickup_date);

    return (
      <Card className="p-4 space-y-2">
        {showTimer && (
          <div className="flex justify-center mb-2">
            <CourseCountdown 
              pickupDate={course.pickup_date}
              onUnlock={handleCourseUnlock}
            />
          </div>
        )}

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

        {showActions && (
          <div className="flex gap-3 pt-3">
            <Button
              variant="outline"
              className="flex-1 h-14 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-base border-0 shadow-lg active:scale-95 transition-all"
              onClick={() => handleRefuseCourse(course.id)}
              disabled={isPending}
            >
              <XCircle className="w-5 h-5 mr-2" />
              REFUSER
            </Button>
            <Button
              className="flex-1 h-14 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-base border-0 shadow-lg active:scale-95 transition-all"
              onClick={() => handleAcceptCourse(course.id)}
              disabled={isPending}
            >
              <CheckCircle className="w-5 h-5 mr-2" />
              ACCEPTER
            </Button>
          </div>
        )}

        {showStartButton && (
          <div className="flex gap-2 pt-2">
            {course.status === 'accepted' && (
              <Button
                variant="default"
                className="flex-1 bg-success hover:bg-success/90 text-white"
                onClick={() => handleStartCourse(course.id)}
                disabled={!isUnlocked || isPending}
                size="sm"
              >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                {isUnlocked ? 'Démarrer' : 'En attente...'}
              </Button>
            )}
            {course.status === 'in_progress' && (
              <Button
                variant="default"
                className="flex-1 bg-primary hover:bg-primary/90"
                onClick={() => handleCompleteCourse(course.id)}
                disabled={isPending}
                size="sm"
              >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Flag className="w-4 h-4" />}
                Terminer
              </Button>
            )}
          </div>
        )}
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 pt-16">
      <Header title="Réservations" unreadCount={unreadCount} />
      
      <div className="max-w-lg mx-auto p-4 space-y-4">
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="new">
              Nouvelles
              {newCourses.length > 0 && (
                <Badge className="ml-2" variant="destructive">{newCourses.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="active">
              En cours
              {activeCourses.length > 0 && (
                <Badge className="ml-2">{activeCourses.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="completed">Terminées</TabsTrigger>
          </TabsList>

          <TabsContent value="new" className="space-y-4 mt-4">
            <PullToRefresh onRefresh={fetchCourses}>
              {newCourses.length === 0 ? (
                <Card className="p-8 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <MapPin className="w-12 h-12 text-muted-foreground/30" />
                    <p className="text-muted-foreground font-medium">Aucune nouvelle course disponible</p>
                    <p className="text-xs text-muted-foreground">
                      Les nouvelles courses apparaîtront ici dès leur publication
                    </p>
                  </div>
                </Card>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-2 px-1">
                    <p className="text-sm text-muted-foreground">
                      {newCourses.length} course{newCourses.length > 1 ? 's' : ''} disponible{newCourses.length > 1 ? 's' : ''}
                    </p>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={fetchCourses}
                    >
                      🔄 Actualiser
                    </Button>
                  </div>
                  {newCourses.map(course => (
                    <CourseCard key={course.id} course={course} showActions />
                  ))}
                </>
              )}
            </PullToRefresh>
          </TabsContent>

          <TabsContent value="active" className="space-y-4 mt-4">
            <PullToRefresh onRefresh={fetchCourses}>
              {activeCourses.length === 0 ? (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground">Aucune course en cours</p>
                </Card>
              ) : (
                activeCourses.map(course => (
                  <div key={course.id} className="space-y-3">
                    {course.status === 'accepted' && (
                      <CourseCountdown 
                        pickupDate={course.pickup_date}
                        onUnlock={handleCourseUnlock}
                      />
                    )}

                    <CourseSwipeActions
                      course={course}
                      onAction={handleCourseAction}
                      currentLocation={currentLocation}
                      canStart={canStartCourse(course.pickup_date)}
                      onViewDetails={() => setSelectedCourse(course)}
                    />
                  </div>
                ))
              )}
            </PullToRefresh>
          </TabsContent>

          <TabsContent value="completed" className="space-y-4 mt-4">
            <PullToRefresh onRefresh={fetchCourses}>
              {completedCourses.length === 0 ? (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground">Aucune course terminée</p>
                </Card>
              ) : (
                completedCourses.map(course => (
                  <Card 
                    key={course.id} 
                    className="p-4 cursor-pointer hover:bg-accent/5 transition-colors"
                    onClick={() => setSelectedCompletedCourse(course)}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">
                          {extractCity(course.departure_location)} → {extractCity(course.destination_location)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {course.picked_up_at 
                            ? new Date(course.picked_up_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                            : new Date(course.completed_at || course.pickup_date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                          }
                        </p>
                      </div>
                      <Badge className="bg-green-500">Terminée</Badge>
                    </div>
                  </Card>
                ))
              )}
            </PullToRefresh>
          </TabsContent>
        </Tabs>
      </div>

        <CourseDetailsModal
          course={selectedCourse}
          open={selectedCourse !== null}
          onOpenChange={(open) => !open && setSelectedCourse(null)}
          onOpenSignBoard={() => setShowSignBoard(true)}
        />

        <CompletedCourseDetails
          course={selectedCompletedCourse}
          open={selectedCompletedCourse !== null}
          onOpenChange={(open) => !open && setSelectedCompletedCourse(null)}
        />

        <SignBoardModal
          open={showSignBoard}
          onOpenChange={setShowSignBoard}
          clientName={selectedCourse?.client_name || ''}
          companyName={driver?.company_name}
          companyLogoUrl={driver?.company_logo_url}
        />

      <BottomNav />
    </div>
  );
};

export default Bookings;
