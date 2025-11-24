import { useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Course } from '@/lib/supabase';
import { toast } from 'sonner';
import {
  MapPin,
  Clock,
  Users,
  Briefcase,
  Euro,
  Navigation,
  UserCheck,
  MapPinOff,
  CheckCircle,
  Star,
  Lock,
  Info
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface CourseSwipeActionsProps {
  course: Course;
  onAction: (action: string, data?: any) => void;
  currentLocation?: { lat: number; lng: number } | null;
  canStart?: boolean;
  onViewDetails?: () => void;
}

type SwipeAction = {
  id: string;
  label: string;
  icon: any;
  color: string;
  bgColor: string;
  action: string;
};

export const CourseSwipeActions = ({ course, onAction, currentLocation, canStart = true, onViewDetails }: CourseSwipeActionsProps) => {
  const [swipeX, setSwipeX] = useState(0);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const startX = useRef(0);
  const cardRef = useRef<HTMLDivElement>(null);

  // Determine available actions based on course status
  const getAvailableActions = (): SwipeAction[] => {
    if (course.status === 'accepted') {
      // Bloquer l'action start si canStart est false
      if (!canStart) {
        return [];
      }
      return [{
        id: 'start',
        label: 'Démarrer la course',
        icon: Navigation,
        color: 'text-blue-500',
        bgColor: 'bg-blue-500',
        action: 'start'
      }];
    }

    if (course.status === 'in_progress' && !course.arrived_at) {
      return [{
        id: 'arrived',
        label: 'Je suis sur place',
        icon: MapPin,
        color: 'text-green-500',
        bgColor: 'bg-green-500',
        action: 'arrived'
      }];
    }

    if (course.status === 'in_progress' && course.arrived_at && !course.picked_up_at) {
      return [{
        id: 'pickup',
        label: 'Client à bord',
        icon: UserCheck,
        color: 'text-purple-500',
        bgColor: 'bg-purple-500',
        action: 'pickup'
      }];
    }

    if (course.status === 'in_progress' && course.picked_up_at && !course.dropped_off_at) {
      return [{
        id: 'dropoff',
        label: 'Client déposé',
        icon: MapPinOff,
        color: 'text-orange-500',
        bgColor: 'bg-orange-500',
        action: 'dropoff'
      }];
    }

    if (course.status === 'in_progress' && course.dropped_off_at) {
      return [{
        id: 'complete',
        label: 'Terminer la course',
        icon: CheckCircle,
        color: 'text-success',
        bgColor: 'bg-success',
        action: 'complete'
      }];
    }

    return [];
  };

  const actions = getAvailableActions();
  const currentAction = actions[0];

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!currentAction) return;

    const currentX = e.touches[0].clientX;
    const diff = currentX - startX.current;

    // Only allow right swipe
    if (diff > 0 && diff < 200) {
      setSwipeX(diff);
      if (diff > 150) {
        setActiveAction(currentAction.id);
      } else {
        setActiveAction(null);
      }
    }
  };

  const handleTouchEnd = () => {
    if (swipeX > 150 && currentAction) {
      // Action triggered
      if (currentAction.action === 'complete') {
        setShowRatingModal(true);
      } else {
        const actionData: any = { 
          courseId: course.id,
          action: currentAction.action 
        };
        if (currentLocation) {
          actionData.latitude = currentLocation.lat;
          actionData.longitude = currentLocation.lng;
        }
        onAction(currentAction.action, actionData);
      }
    }
    setSwipeX(0);
    setActiveAction(null);
  };

  const handleRatingSubmit = () => {
    if (rating === 0) {
      toast.error('Veuillez donner une note avant de terminer');
      return;
    }
    onAction('complete', {
      courseId: course.id,
      rating,
      comment,
      latitude: currentLocation?.lat,
      longitude: currentLocation?.lng
    });
    setShowRatingModal(false);
    setRating(5);
    setComment('');
  };

  if (!currentAction) {
    return (
      <Card className="p-6 bg-warning/10 border-warning/30">
        <div className="flex flex-col items-center gap-3 text-center">
          <Lock className="w-10 h-10 text-warning" />
          <div>
            <p className="font-semibold text-lg">🔒 Course verrouillée</p>
            <p className="text-sm text-muted-foreground mt-1">
              Vous pourrez démarrer cette course 1h avant l'heure de prise en charge
            </p>
          </div>
          <div className="text-xs text-muted-foreground bg-background/50 px-3 py-1 rounded-full">
            Glissez de gauche à droite pour progresser dans les étapes
          </div>
        </div>
      </Card>
    );
  }

  return (
    <>
      <div className="relative overflow-hidden">
        {/* Swipe background indicator */}
        <div
          className={cn(
            "absolute inset-0 flex items-center justify-start pl-8 rounded-lg transition-opacity",
            currentAction.bgColor,
            swipeX > 0 ? "opacity-100" : "opacity-0"
          )}
          style={{
            transform: `scaleX(${Math.min(swipeX / 200, 1)})`,
            transformOrigin: 'left',
          }}
        >
          <currentAction.icon className="w-8 h-8 text-white" />
          <span className="ml-3 text-white font-semibold text-lg">
            {swipeX > 150 ? 'Relâchez pour confirmer' : currentAction.label}
          </span>
        </div>

        {/* Main card */}
        <Card
          ref={cardRef}
          className={cn(
            "p-4 space-y-4 cursor-grab active:cursor-grabbing transition-transform touch-none",
            activeAction && "shadow-lg"
          )}
          style={{
            transform: `translateX(${swipeX}px)`,
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Swipe hint */}
          <div className="flex items-center justify-between">
            <Badge variant="secondary">{course.company_name || 'VTC'}</Badge>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Glissez →</span>
              <currentAction.icon className={cn("w-4 h-4", currentAction.color)} />
            </div>
          </div>

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

          {/* View Details Button */}
          {onViewDetails && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onViewDetails();
              }}
              className="w-full mt-2 p-2 border border-border rounded-lg flex items-center justify-center gap-2 text-sm text-muted-foreground hover:bg-muted transition-colors"
            >
              <Info className="w-4 h-4" />
              <span>Voir détails complets (client, vol, carte)</span>
            </button>
          )}
        </Card>
      </div>

      {/* Rating Modal */}
      {showRatingModal && (
        <div className="fixed top-0 bottom-0 w-full max-w-lg left-1/2 -translate-x-1/2 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="p-6 space-y-4 w-full max-w-md">
            <h3 className="text-lg font-semibold">Terminer la course</h3>

            {/* Rating */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Notation</label>
              <div className="flex gap-2 justify-center">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className="focus:outline-none"
                  >
                    <Star
                      className={cn(
                        "w-8 h-8 transition-colors",
                        star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                      )}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Comment */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Commentaire (optionnel)</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full p-2 border rounded-md min-h-[80px] text-sm"
                placeholder="Ajouter un commentaire..."
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => setShowRatingModal(false)}
                className="flex-1 px-4 py-2 border rounded-md text-sm"
              >
                Annuler
              </button>
              <button
                onClick={handleRatingSubmit}
                className="flex-1 px-4 py-2 bg-success text-white rounded-md text-sm"
              >
                Terminer
              </button>
            </div>
          </Card>
        </div>
      )}
    </>
  );
};
