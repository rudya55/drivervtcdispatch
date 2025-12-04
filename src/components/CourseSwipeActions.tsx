import { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Course } from '@/lib/supabase';
import { GPSSelector } from '@/components/GPSSelector';
import { BonDeCommandeModal } from '@/components/BonDeCommandeModal';
import { useAuth } from '@/hooks/useAuth';
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
  Unlock,
  Info,
  ChevronRight,
  Plane,
  FileText,
  Car,
  Baby
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
  const [showDepartureGPS, setShowDepartureGPS] = useState(false);
  const [showDestinationGPS, setShowDestinationGPS] = useState(false);
  const [showBonDeCommande, setShowBonDeCommande] = useState(false);
  const startX = useRef(0);
  const sliderRef = useRef<HTMLDivElement>(null);
  const [sliderWidth, setSliderWidth] = useState(260);
  const { driver } = useAuth();

  // Calculer la largeur dynamique du slider
  useEffect(() => {
    const updateSliderWidth = () => {
      if (sliderRef.current) {
        const containerWidth = sliderRef.current.offsetWidth;
        // Largeur disponible = largeur container - largeur knob (48px) - margins (8px)
        setSliderWidth(containerWidth - 56);
      }
    };
    
    updateSliderWidth();
    window.addEventListener('resize', updateSliderWidth);
    return () => window.removeEventListener('resize', updateSliderWidth);
  }, []);

  // Determine current step (1-5) for progress indicator
  const getCurrentStep = (): number => {
    if (course.status === 'accepted') return 1;
    if (course.status === 'started' || (course.status === 'in_progress' && !course.arrived_at)) return 2;
    if (course.status === 'arrived' || (course.status === 'in_progress' && course.arrived_at && !course.picked_up_at)) return 3;
    if (course.status === 'picked_up' || (course.status === 'in_progress' && course.picked_up_at && !course.dropped_off_at)) return 4;
    if (course.status === 'dropped_off' || (course.status === 'in_progress' && course.dropped_off_at)) return 5;
    return 1;
  };

  // Determine available actions based on course status
  const getAvailableActions = (): SwipeAction[] => {
    // Étape 1 : Démarrer la course
    if (course.status === 'accepted') {
      if (!canStart) return [];
      return [{
        id: 'start',
        label: 'Démarrer la course',
        icon: Navigation,
        color: 'text-blue-500',
        bgColor: 'bg-blue-500',
        action: 'start'
      }];
    }

    // Étape 2 : Arrivé sur place (reconnaît 'started' OU 'in_progress' sans arrived_at)
    if (course.status === 'started' || (course.status === 'in_progress' && !course.arrived_at)) {
      return [{
        id: 'arrived',
        label: 'Je suis sur place',
        icon: MapPin,
        color: 'text-green-500',
        bgColor: 'bg-green-500',
        action: 'arrived'
      }];
    }

    // Étape 3 : Client à bord (reconnaît 'arrived' OU 'in_progress' avec arrived_at sans picked_up_at)
    if (course.status === 'arrived' || (course.status === 'in_progress' && course.arrived_at && !course.picked_up_at)) {
      return [{
        id: 'pickup',
        label: 'Client à bord',
        icon: UserCheck,
        color: 'text-purple-500',
        bgColor: 'bg-purple-500',
        action: 'pickup'
      }];
    }

    // Étape 4 : Client déposé (reconnaît 'picked_up' OU 'in_progress' avec picked_up_at sans dropped_off_at)
    if (course.status === 'picked_up' || (course.status === 'in_progress' && course.picked_up_at && !course.dropped_off_at)) {
      return [{
        id: 'dropoff',
        label: 'Client déposé',
        icon: MapPinOff,
        color: 'text-orange-500',
        bgColor: 'bg-orange-500',
        action: 'dropoff'
      }];
    }

    // Étape 5 : Terminer (reconnaît 'dropped_off' OU 'in_progress' avec dropped_off_at)
    if (course.status === 'dropped_off' || (course.status === 'in_progress' && course.dropped_off_at)) {
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
  const currentStep = getCurrentStep();

  const steps = [
    { num: 1, label: 'Démarrer', icon: Navigation },
    { num: 2, label: 'Arrivé', icon: MapPin },
    { num: 3, label: 'À bord', icon: UserCheck },
    { num: 4, label: 'Déposé', icon: MapPinOff },
    { num: 5, label: 'Terminer', icon: CheckCircle }
  ];

  const maxSwipeDistance = sliderWidth; // Distance dynamique basée sur la largeur de l'écran
  const threshold = maxSwipeDistance * 0.75; // 75% de la distance

  // Parser les extras depuis les notes
  const parseExtras = (notes: string | null): string[] => {
    if (!notes) return [];
    const lowerNotes = notes.toLowerCase();
    const extras: string[] = [];
    
    if (lowerNotes.includes('rehausseur')) extras.push('Rehausseur');
    if (lowerNotes.includes('siège auto') || lowerNotes.includes('siege auto')) extras.push('Siège auto');
    if (lowerNotes.includes('siège bébé') || lowerNotes.includes('siege bebe')) extras.push('Siège bébé');
    if (lowerNotes.includes('fauteuil roulant')) extras.push('Fauteuil roulant');
    if (lowerNotes.includes('animaux') || lowerNotes.includes('animal')) extras.push('Animaux acceptés');
    
    return extras;
  };

  // Séparer les extras des notes générales
  const detectedExtras = parseExtras(course.notes);
  const generalNotes = course.notes?.replace(/rehausseur|siège auto|siege auto|siège bébé|siege bebe|fauteuil roulant|animaux|animal/gi, '').trim() || '';

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    setSwipeX(0);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!currentAction) return;
    
    // Empêcher le scroll pendant le swipe
    e.preventDefault();

    const currentX = e.touches[0].clientX;
    const diff = currentX - startX.current;

    // Only allow right swipe
    if (diff > 0 && diff < maxSwipeDistance) {
      setSwipeX(diff);
      if (diff > threshold) {
        setActiveAction(currentAction.id);
      } else {
        setActiveAction(null);
      }
    }
  };

  const handleTouchEnd = () => {
    if (swipeX > threshold && currentAction) {
      // Action triggered - vibration feedback if supported
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
      
      if (currentAction.action === 'complete') {
        setShowRatingModal(true);
      } else {
        const actionData: any = { 
          course_id: course.id,
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
      course_id: course.id,
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
      <div className="space-y-4">
        {/* Progress Indicator - 5 Steps */}
        <div className="px-2">
          <div className="flex items-center justify-between relative">
            {steps.map((step) => (
              <div key={step.num} className="flex flex-col items-center relative z-10">
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all",
                    step.num < currentStep
                      ? "bg-success border-success"
                      : step.num === currentStep
                      ? "bg-primary border-primary scale-110 shadow-lg"
                      : "bg-background border-muted-foreground/30"
                  )}
                >
                  <step.icon
                    className={cn(
                      "w-5 h-5",
                      step.num <= currentStep ? "text-white" : "text-muted-foreground"
                    )}
                  />
                </div>
                <span
                  className={cn(
                    "text-[10px] mt-1 font-medium",
                    step.num === currentStep ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {step.label}
                </span>
              </div>
            ))}
            {/* Connecting lines */}
            <div className="absolute top-5 left-0 right-0 h-0.5 bg-muted-foreground/20 -z-0" />
            <div
              className="absolute top-5 left-0 h-0.5 bg-success transition-all duration-500 -z-0"
              style={{ width: `${((currentStep - 1) / 4) * 100}%` }}
            />
          </div>
        </div>

        {/* Main card with course info */}
        <Card className="p-4 space-y-2">
          {/* 1. Date/Heure */}
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              {format(new Date(course.pickup_date), "dd MMM yyyy, HH:mm", { locale: fr })}
            </span>
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

          {/* 5. Extras (sièges enfants + détectés) */}
          {(course.baby_seat || course.booster_seat || course.cosy_seat || detectedExtras.length > 0) && (
            <div className="flex items-center gap-2 flex-wrap">
              <Baby className="w-4 h-4 text-muted-foreground" />
              {course.baby_seat && <span className="text-sm font-medium">Siège bébé</span>}
              {course.booster_seat && <span className="text-sm font-medium">Rehausseur</span>}
              {course.cosy_seat && <span className="text-sm font-medium">Cosy</span>}
              {detectedExtras.map((extra, idx) => (
                <span key={idx} className="text-sm font-medium">{extra}</span>
              ))}
            </div>
          )}

          {/* 6. Départ */}
          <button
            onClick={() => setShowDepartureGPS(true)}
            className="flex items-center gap-2 w-full text-left hover:bg-accent/50 rounded-lg transition-colors py-1"
          >
            <MapPin className="w-4 h-4 text-emerald-500" />
            <span className="text-sm font-medium">{course.departure_location}</span>
          </button>

          {/* 7. Destination */}
          <button
            onClick={() => setShowDestinationGPS(true)}
            className="flex items-center gap-2 w-full text-left hover:bg-accent/50 rounded-lg transition-colors py-1"
          >
            <MapPin className="w-4 h-4 text-red-500" />
            <span className="text-sm font-medium">{course.destination_location}</span>
          </button>

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

          {/* Notes du dispatcher */}
          {generalNotes && (
            <div className="flex items-start gap-2 p-2 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
              <FileText className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5" />
              <span className="text-sm font-medium text-amber-900 dark:text-amber-100">{generalNotes}</span>
            </div>
          )}

          {/* Bouton Bon de Commande */}
          <Button
            variant="destructive"
            className="w-full"
            onClick={() => setShowBonDeCommande(true)}
          >
            <FileText className="w-4 h-4 mr-2" />
            Bon de Commande
          </Button>

          {/* View Details Button */}
          {onViewDetails && (
            <button
              onClick={onViewDetails}
              className="w-full p-2 border border-border rounded-lg flex items-center justify-center gap-2 text-sm text-muted-foreground hover:bg-muted transition-colors"
            >
              <Info className="w-4 h-4" />
              <span>Voir tous les détails</span>
            </button>
          )}
        </Card>

        {/* Compact Swipe Slider - Toute la barre est touchable */}
        <div 
          ref={sliderRef}
          className="relative w-full h-14 rounded-full overflow-hidden bg-gradient-to-r from-blue-600 to-blue-500 shadow-lg select-none"
          style={{ 
            touchAction: 'none', 
            willChange: 'transform',
            userSelect: 'none',
            WebkitUserSelect: 'none'
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Knob draggable (cadenas) - TOUCHABLE */}
          <div 
            className={cn(
              "absolute left-1 top-1 bottom-1 w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-md z-10",
              swipeX > 0 && "scale-110"
            )}
            style={{ 
              transform: `translateX(${swipeX}px)`,
              transition: swipeX === 0 ? 'transform 0.3s ease-out, scale 0.2s ease' : 'scale 0.2s ease',
              willChange: 'transform'
            }}
          >
            {swipeX > threshold ? (
              <Unlock className="w-6 h-6 text-blue-600" />
            ) : (
              <Lock className="w-6 h-6 text-blue-600" />
            )}
          </div>
          
          {/* Texte central */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span 
              className="text-white font-bold text-sm uppercase tracking-wide transition-all"
              style={{ 
                opacity: swipeX > threshold ? 1 : 0.9,
                transform: swipeX > threshold ? 'scale(1.05)' : 'scale(1)'
              }}
            >
              {swipeX > threshold ? '✓ RELÂCHEZ' : currentAction.label.toUpperCase()}
            </span>
          </div>
          
          {/* Flèches animées */}
          <div className="absolute right-4 inset-y-0 flex items-center gap-0 pointer-events-none">
            <ChevronRight className="w-5 h-5 text-white/40 animate-pulse" style={{ animationDelay: '0ms' }} />
            <ChevronRight className="w-5 h-5 text-white/60 animate-pulse -ml-2" style={{ animationDelay: '150ms' }} />
            <ChevronRight className="w-5 h-5 text-white animate-pulse -ml-2" style={{ animationDelay: '300ms' }} />
          </div>
          
          {/* Barre de progression visuelle */}
          <div 
            className="absolute left-0 top-0 bottom-0 bg-white/10 pointer-events-none transition-all"
            style={{ width: `${(swipeX / maxSwipeDistance) * 100}%` }}
          />
        </div>
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

      {/* GPS Selector pour Départ */}
      <GPSSelector
        address={course.departure_location}
        open={showDepartureGPS}
        onOpenChange={setShowDepartureGPS}
        label="Adresse de départ"
      />

      {/* GPS Selector pour Destination */}
      <GPSSelector
        address={course.destination_location}
        open={showDestinationGPS}
        onOpenChange={setShowDestinationGPS}
        label="Adresse de destination"
      />

      {/* Bon de Commande Modal */}
      <BonDeCommandeModal
        course={course}
        driver={driver}
        open={showBonDeCommande}
        onOpenChange={setShowBonDeCommande}
      />
    </>
  );
};
