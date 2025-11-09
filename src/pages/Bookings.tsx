import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase, Course } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, MapPin, Users, Briefcase, Car, Plane, Euro, CheckCircle, XCircle, Loader2, Play, Flag } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { useNotifications } from '@/hooks/useNotifications';
import { CourseTimer } from '@/components/CourseTimer';
import { CompletedCourseDetails } from '@/components/CompletedCourseDetails';

const Bookings = () => {
  const { driver } = useAuth();
  const { unreadCount } = useNotifications(driver?.id || null);
  const [loading, setLoading] = useState(false);
  const [newCourses, setNewCourses] = useState<Course[]>([]);
  const [activeCourses, setActiveCourses] = useState<Course[]>([]);
  const [completedCourses, setCompletedCourses] = useState<Course[]>([]);
  const [processing, setProcessing] = useState<string | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  useEffect(() => {
    if (driver) {
      fetchCourses();
    } else {
      setLoading(false);
    }
  }, [driver]);

  // Realtime listener for courses
  useEffect(() => {
    if (!driver) return;

    const channel = supabase
      .channel('bookings-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'courses',
          filter: `driver_id=eq.${driver.id}`,
        },
        (payload) => {
          console.log('Booking update:', payload);
          fetchCourses();
          
          if (payload.eventType === 'INSERT') {
            toast.info('Nouvelle course reçue !');
          } else if (payload.eventType === 'UPDATE') {
            const course = payload.new as Course;
            if (course.status === 'dispatched') {
              toast.info('Une course vous a été assignée !');
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [driver]);

  const fetchCourses = async () => {
    if (!driver) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .or(`driver_id.eq.${driver.id},status.eq.dispatched`)
        .order('pickup_date', { ascending: true });

      if (error) throw error;

      if (data) {
        setNewCourses(data.filter(c => c.status === 'pending' || c.status === 'dispatched'));
        setActiveCourses(data.filter(c => c.status === 'accepted' || c.status === 'in_progress'));
        setCompletedCourses(data.filter(c => c.status === 'completed'));
      }
    } catch (error: any) {
      console.error('Fetch courses error:', error);
      toast.error('Erreur lors du chargement des courses');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptCourse = async (courseId: string) => {
    if (!driver) return;

    setProcessing(courseId);
    try {
      const { error } = await supabase.functions.invoke('driver-update-course-status', {
        body: { course_id: courseId, action: 'accept' }
      });

      if (error) throw error;

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
    try {
      const { error } = await supabase.functions.invoke('driver-update-course-status', {
        body: { course_id: courseId, action: 'start' }
      });
      if (error) throw error;
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
      
      toast.success('Course terminée !');
      fetchCourses();
    } catch (error: any) {
      console.error('Complete course error:', error);
      toast.error('Erreur lors de la fin de la course');
    } finally {
      setProcessing(null);
    }
  };

  const canStartCourse = (pickupDate: string) => {
    const pickup = new Date(pickupDate);
    const unlockTime = new Date(pickup.getTime() - 60 * 60000);
    const now = new Date();
    return now >= unlockTime;
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
      <Card className="p-4 space-y-3">
        {showTimer && (
          <div className="flex justify-center mb-2">
            <CourseTimer 
              pickupDate={course.pickup_date}
              onUnlock={() => {
                toast.success('Course débloquée ! Vous pouvez la démarrer.');
                fetchCourses();
              }}
            />
          </div>
        )}

        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="font-semibold">
                {format(pickupDate, "dd MMMM yyyy 'à' HH:mm", { locale: fr })}
              </span>
            </div>
            {course.company_name && (
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                {course.company_name}
              </p>
            )}
          </div>
          <Badge variant={course.status === 'completed' ? 'default' : 'secondary'}>
            {course.status}
          </Badge>
        </div>

        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-primary mt-1" />
            <div className="flex-1">
              <p className="text-sm font-medium">{course.departure_location}</p>
              <p className="text-sm text-muted-foreground">→ {course.destination_location}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span>{course.passengers_count}</span>
            </div>
            <div className="flex items-center gap-1">
              <Briefcase className="w-4 h-4 text-muted-foreground" />
              <span>{course.luggage_count}</span>
            </div>
            <div className="flex items-center gap-1">
              <Car className="w-4 h-4 text-muted-foreground" />
              <span>{course.vehicle_type}</span>
            </div>
          </div>

          {course.flight_number && (
            <div className="flex items-center gap-2 text-sm">
              <Plane className="w-4 h-4 text-muted-foreground" />
              <span>{course.flight_number}</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex items-center gap-1">
              <Euro className="w-4 h-4 text-muted-foreground" />
              <span className="font-bold text-lg">{course.client_price}€</span>
            </div>
            {course.net_driver && (
              <span className="text-sm text-muted-foreground">
                Net: {course.net_driver}€
              </span>
            )}
          </div>
        </div>

        {showActions && (
          <div className="flex gap-2 pt-2">
            <Button
              onClick={() => handleAcceptCourse(course.id)}
              disabled={isPending}
              className="flex-1"
              size="sm"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Accepter
            </Button>
            <Button
              onClick={() => handleRefuseCourse(course.id)}
              disabled={isPending}
              variant="destructive"
              size="sm"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
              Refuser
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
            {newCourses.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">Aucune nouvelle course</p>
              </Card>
            ) : (
              newCourses.map(course => (
                <CourseCard key={course.id} course={course} showActions />
              ))
            )}
          </TabsContent>

          <TabsContent value="active" className="space-y-4 mt-4">
            {activeCourses.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">Aucune course en cours</p>
              </Card>
            ) : (
              activeCourses.map(course => (
                <CourseCard 
                  key={course.id} 
                  course={course}
                  showTimer={course.status === 'accepted'}
                  showStartButton={true}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4 mt-4">
            {completedCourses.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">Aucune course terminée</p>
              </Card>
            ) : (
              completedCourses.map(course => (
                <Card 
                  key={course.id} 
                  className="p-4 cursor-pointer hover:bg-accent/5 transition-colors"
                  onClick={() => setSelectedCourse(course)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="default" className="bg-success text-white">Terminée</Badge>
                    <span className="font-bold text-success">
                      {(course.net_driver || course.client_price).toFixed(2)}€
                    </span>
                  </div>
                  <div className="text-sm">
                    <p className="font-medium">{course.client_name}</p>
                    <p className="text-muted-foreground text-xs mt-1">
                      {format(new Date(course.completed_at!), 'PPp', { locale: fr })}
                    </p>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      <CompletedCourseDetails 
        course={selectedCourse}
        open={!!selectedCourse}
        onOpenChange={(open) => !open && setSelectedCourse(null)}
      />

      <BottomNav />
    </div>
  );
};

export default Bookings;
