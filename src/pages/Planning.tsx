import { useEffect, useState } from 'react';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { supabase, Course } from '@/lib/supabase';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import { Calendar as CalendarIcon, Plus, MapPin, Clock, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const Planning = () => {
  const { driver } = useAuth();
  const { unreadCount } = useNotifications(driver?.id || null);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedDateCourses, setSelectedDateCourses] = useState<Course[]>([]);

  useEffect(() => {
    if (driver) {
      fetchCourses();
    }
  }, [driver]);

  useEffect(() => {
    if (date) {
      filterCoursesByDate(date);
    }
  }, [date, courses]);

  const fetchCourses = async () => {
    if (!driver) return;

    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('driver_id', driver.id)
        .in('status', ['accepted', 'in_progress'])
        .order('pickup_date', { ascending: true });

      if (error) throw error;
      setCourses(data || []);
    } catch (error: any) {
      console.error('Fetch courses error:', error);
      toast.error('Erreur lors du chargement des courses');
    }
  };

  const filterCoursesByDate = (selectedDate: Date) => {
    const filtered = courses.filter(course => {
      const courseDate = new Date(course.pickup_date);
      return courseDate.toDateString() === selectedDate.toDateString();
    });
    setSelectedDateCourses(filtered);
  };

  const addToGoogleCalendar = (course: Course) => {
    const startDate = new Date(course.pickup_date);
    const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000); // +2h par défaut
    
    const title = encodeURIComponent(`Course VTC - ${course.client_name}`);
    const details = encodeURIComponent(
      `Client: ${course.client_name}\n` +
      `Départ: ${course.departure_location}\n` +
      `Destination: ${course.destination_location}\n` +
      `Passagers: ${course.passengers_count}\n` +
      `Prix: ${course.client_price}€`
    );
    const location = encodeURIComponent(course.departure_location);
    
    const startTime = format(startDate, "yyyyMMdd'T'HHmmss");
    const endTime = format(endDate, "yyyyMMdd'T'HHmmss");
    
    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&location=${location}&dates=${startTime}/${endTime}`;
    
    window.open(googleCalendarUrl, '_blank');
    toast.success('Ouverture de Google Calendar');
  };

  const getCourseDates = () => {
    return courses.map(course => new Date(course.pickup_date));
  };

  return (
    <div className="min-h-screen bg-background pb-20 pt-16">
      <Header title="Planning" unreadCount={unreadCount} />

      <div className="max-w-lg mx-auto p-4 space-y-4">
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <CalendarIcon className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Mon calendrier</h3>
          </div>
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            locale={fr}
            className="rounded-md border"
            modifiers={{
              booked: getCourseDates(),
            }}
            modifiersClassNames={{
              booked: 'bg-primary text-primary-foreground',
            }}
          />
        </Card>

        {date && (
          <Card className="p-6">
            <h3 className="font-semibold mb-4">
              Courses du {format(date, 'dd MMMM yyyy', { locale: fr })}
            </h3>
            
            {selectedDateCourses.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Aucune course prévue ce jour
              </p>
            ) : (
              <div className="space-y-3">
                {selectedDateCourses.map((course) => (
                  <Card key={course.id} className="p-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">
                          {format(new Date(course.pickup_date), 'HH:mm')}
                        </span>
                      </div>
                      <Badge>{course.status}</Badge>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-primary mt-1" />
                        <div className="text-sm">
                          <p className="font-medium">{course.departure_location}</p>
                          <p className="text-muted-foreground">→ {course.destination_location}</p>
                        </div>
                      </div>
                      <p className="text-sm">Client: {course.client_name}</p>
                      <p className="text-sm font-semibold">{course.client_price}€</p>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      onClick={() => addToGoogleCalendar(course)}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Ajouter à Google Calendar
                      <ExternalLink className="w-4 h-4 ml-2" />
                    </Button>
                  </Card>
                ))}
              </div>
            )}
          </Card>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Planning;
