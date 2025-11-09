import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  CheckCircle2, 
  Clock, 
  MapPin, 
  Play, 
  UserCheck, 
  PackageCheck,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface CourseHistoryProps {
  courseId: string;
}

interface TrackingEvent {
  id: string;
  created_at: string;
  status: string;
  notes: string;
  latitude?: number;
  longitude?: number;
}

const statusConfig: Record<string, { icon: any; label: string; color: string }> = {
  pending: { icon: Clock, label: 'En attente', color: 'text-muted-foreground' },
  dispatched: { icon: AlertCircle, label: 'Dispatchée', color: 'text-blue-500' },
  accepted: { icon: CheckCircle2, label: 'Acceptée', color: 'text-green-500' },
  refused: { icon: XCircle, label: 'Refusée', color: 'text-destructive' },
  in_progress: { icon: Play, label: 'En cours', color: 'text-purple-500' },
  arrived: { icon: MapPin, label: 'Arrivé', color: 'text-orange-500' },
  picked_up: { icon: UserCheck, label: 'Client à bord', color: 'text-indigo-500' },
  dropped_off: { icon: PackageCheck, label: 'Client déposé', color: 'text-cyan-500' },
  completed: { icon: CheckCircle2, label: 'Terminée', color: 'text-success' },
  cancelled: { icon: XCircle, label: 'Annulée', color: 'text-destructive' },
};

export const CourseHistory = ({ courseId }: CourseHistoryProps) => {
  const { data: trackingEvents, isLoading } = useQuery({
    queryKey: ['course-tracking', courseId],
    queryFn: async () => {
      // Fetch notifications related to this course (course_status and new_course events)
      const { data, error } = await supabase
        .from('driver_notifications')
        .select('id, created_at, type, message, data')
        .eq('data->>course_id', courseId)
        .in('type', ['course_status', 'new_course'])
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      // Transform notifications into tracking events
      const events: TrackingEvent[] = (data || []).map((notification: any) => {
        const notifData = notification.data || {};
        
        return {
          id: notification.id,
          created_at: notification.created_at,
          status: notification.type === 'new_course' ? 'dispatched' : (notifData.status || 'pending'),
          notes: notification.message || '',
          latitude: notifData.latitude,
          longitude: notifData.longitude,
        };
      });

      return events;
    },
    enabled: !!courseId,
  });

  if (isLoading) {
    return (
      <Card className="p-4">
        <h3 className="font-semibold mb-4">Historique de la course</h3>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-start gap-3">
              <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (!trackingEvents || trackingEvents.length === 0) {
    return (
      <Card className="p-4">
        <h3 className="font-semibold mb-2">Historique de la course</h3>
        <p className="text-sm text-muted-foreground">Aucun événement enregistré</p>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <h3 className="font-semibold mb-4">Historique de la course</h3>
      
      <div className="relative space-y-4">
        {/* Timeline line */}
        <div className="absolute left-5 top-2 bottom-2 w-0.5 bg-border" />
        
        {trackingEvents.map((event, index) => {
          const config = statusConfig[event.status] || statusConfig.pending;
          const Icon = config.icon;
          const isLast = index === trackingEvents.length - 1;
          
          return (
            <div key={event.id} className="relative flex items-start gap-3 pb-2">
              {/* Icon */}
              <div className={`relative z-10 w-10 h-10 rounded-full bg-background border-2 flex items-center justify-center flex-shrink-0 ${config.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              
              {/* Content */}
              <div className="flex-1 pt-1">
                <div className="flex items-center justify-between mb-1">
                  <span className={`font-medium ${config.color}`}>
                    {config.label}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(event.created_at), 'HH:mm:ss', { locale: fr })}
                  </span>
                </div>
                
                {event.notes && (
                  <p className="text-sm text-muted-foreground">
                    {event.notes}
                  </p>
                )}
                
                {event.latitude && event.longitude && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                    <MapPin className="w-3 h-3" />
                    <span>{event.latitude.toFixed(6)}, {event.longitude.toFixed(6)}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};