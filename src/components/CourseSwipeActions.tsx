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

import { CourseTimer } from '@/components/CourseTimer';
import { SignBoardModal } from '@/components/SignBoardModal';

export const CourseSwipeActions = ({ course, onAction, currentLocation, canStart = true, onViewDetails }: CourseSwipeActionsProps) => {
  const [swipeX, setSwipeX] = useState(0);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [showDepartureGPS, setShowDepartureGPS] = useState(false);
  const [showDestinationGPS, setShowDestinationGPS] = useState(false);
  const [showBonDeCommande, setShowBonDeCommande] = useState(false);
  const [showSignBoard, setShowSignBoard] = useState(false);
  const startX = useRef(0);
  const startTime = useRef(0);
  const lastX = useRef(0);
  const lastTime = useRef(0);
  const velocityRef = useRef(0);
  const sliderRef = useRef<HTMLDivElement>(null);
  const lastActionRef = useRef<{ action: string; timestamp: number } | null>(null);
  const [sliderWidth, setSliderWidth] = useState(260);
  const { driver } = useAuth();

  // Calculer la largeur dynamique du slider
  useEffect(() => {
    const updateSliderWidth = () => {
      if (sliderRef.current) {
        const containerWidth = sliderRef.current.offsetWidth;
        // Largeur disponible = largeur container - largeur knob (56px)
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
    // IMPORTANT: Vérifier que started_at existe et que arrived_at n'existe pas encore
    if ((course.status === 'started' || (course.status === 'in_progress' && !course.arrived_at)) 
        && course.started_at 
        && !course.arrived_at) {
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

  const maxSwipeDistance = sliderWidth;
  const threshold = maxSwipeDistance * 0.55; // 55% de la distance - plus accessible
  const velocityThreshold = 0.4; // pixels/ms - swipe rapide déclenche l'action

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
    if (isAnimating || isProcessing) return;
    const now = Date.now();
    startX.current = e.touches[0].clientX;
    startTime.current = now;
    lastX.current = e.touches[0].clientX;
    lastTime.current = now;
    velocityRef.current = 0;
    setSwipeX(0);
    
    // Légère vibration au démarrage
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!currentAction || isAnimating || isProcessing) return;
    
    // Empêcher le scroll pendant le swipe
    e.preventDefault();

    const now = Date.now();
    const currentX = e.touches[0].clientX;
    const diff = currentX - startX.current;
    
    // Calcul de la vélocité (pixels/ms)
    const timeDelta = now - lastTime.current;
    if (timeDelta > 0) {
      const distanceDelta = currentX - lastX.current;
      velocityRef.current = distanceDelta / timeDelta;
    }
    lastX.current = currentX;
    lastTime.current = now;

    // Swipe vers la droite uniquement
    if (diff >= 0) {
      const clampedDiff = Math.min(diff, maxSwipeDistance);
      setSwipeX(clampedDiff);
      
      // Vibration au passage du seuil
      if (clampedDiff > threshold && !activeAction) {
        setActiveAction(currentAction.id);
        if (navigator.vibrate) {
          navigator.vibrate(30);
        }
      } else if (clampedDiff <= threshold && activeAction) {
        setActiveAction(null);
      }
    }
  };

  const handleTouchEnd = () => {
    if (isAnimating || isProcessing) return;
    
    // Validation par distance OU par vélocité rapide
    const isDistanceValid = swipeX > threshold;
    const isVelocityValid = velocityRef.current > velocityThreshold && swipeX > maxSwipeDistance * 0.25;
    
    if ((isDistanceValid || isVelocityValid) && currentAction) {
      // Empêcher les appels multiples
      if (isProcessing) return;
      setIsProcessing(true);
      
      // Animation vers la fin
      setIsAnimating(true);
      setSwipeX(maxSwipeDistance);
      
      // Vibration forte de confirmation
      if (navigator.vibrate) {
        navigator.vibrate([50, 30, 100]);
      }
      
      setTimeout(() => {
        if (currentAction.action === 'complete') {
          setShowRatingModal(true);
          setIsProcessing(false);
        } else {
          // Protection GLOBALE contre les appels multiples - bloque TOUTE action pendant 2 secondes
          const now = Date.now();
          if (lastActionRef.current && lastActionRef.current.timestamp > now - 2000) {
            console.warn('⚠️ Action bloquée (protection 2s active):', currentAction.action, 'dernière action:', lastActionRef.current.action);
            setIsProcessing(false);
            setIsAnimating(false);
            setSwipeX(0);
            setActiveAction(null);
            return;
          }
          
          // Validation supplémentaire avant d'appeler l'action
          // Pour 'start': vérifier que le statut est bien 'accepted'
          if (currentAction.action === 'start' && course.status !== 'accepted') {
            console.warn('⚠️ Action start refusée: statut invalide', course.status);
            setIsProcessing(false);
            setIsAnimating(false);
            setSwipeX(0);
            setActiveAction(null);
            return;
          }
          
          // Pour 'arrived': vérifier que le statut est 'started' et que started_at existe
          if (currentAction.action === 'arrived') {
            if (course.status !== 'started' && course.status !== 'in_progress') {
              console.warn('⚠️ Action arrived refusée: statut invalide', course.status);
              setIsProcessing(false);
              setIsAnimating(false);
              setSwipeX(0);
              setActiveAction(null);
              return;
            }
            if (!course.started_at) {
              console.warn('⚠️ Action arrived refusée: started_at manquant');
              setIsProcessing(false);
              setIsAnimating(false);
              setSwipeX(0);
              setActiveAction(null);
              return;
            }
            if (course.arrived_at) {
              console.warn('⚠️ Action arrived refusée: déjà arrivé');
              setIsProcessing(false);
              setIsAnimating(false);
              setSwipeX(0);
              setActiveAction(null);
              return;
            }
          }
          
          // Mémoriser l'action pour éviter les doublons
          lastActionRef.current = {
            action: currentAction.action,
            timestamp: now
          };
          
          const actionData: any = { 
            course_id: course.id,
            action: currentAction.action 
          };
          if (currentLocation) {
            actionData.latitude = currentLocation.lat;
            actionData.longitude = currentLocation.lng;
          }
          // Appeler l'action une seule fois
          onAction(currentAction.action, actionData);
          // Réinitialiser après un délai pour permettre la mise à jour
          setTimeout(() => {
            setIsProcessing(false);
          }, 1500);
        }
        setSwipeX(0);
        setActiveAction(null);
        setIsAnimating(false);
      }, 200);
    } else {
      // Retour élastique avec animation
      setIsAnimating(true);
      setSwipeX(0);
      setActiveAction(null);
      setTimeout(() => setIsAnimating(false), 300);
    }
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

  // Variable pour savoir si le swipe est bloqué (course verrouillée)
  const isSwipeLocked = !canStart && course.status === 'accepted';

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

          {/* 3. Nom du client - Cliquable pour SignBoard */}
          <button
            onClick={() => setShowSignBoard(true)}
            className="flex items-center gap-2 w-full text-left hover:bg-accent/50 rounded-lg transition-colors py-1"
          >
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium underline">{course.client_name}</span>
          </button>

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

          {/* 9. Prix Client + Net Chauffeur côte à côte */}
          <div className="flex justify-between pt-2 border-t border-border/50 gap-3">
            {/* Prix Client */}
            <div className="bg-blue-50 dark:bg-blue-950/30 px-4 py-2 rounded-xl flex-1 text-center">
              <span className="text-xs font-medium text-blue-600 dark:text-blue-400">Prix Client</span>
              <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                {(course.client_price || 0).toFixed(0)} €
              </p>
            </div>
            
            {/* Net Chauffeur */}
            <div className="bg-emerald-50 dark:bg-emerald-950/30 px-4 py-2 rounded-xl flex-1 text-center">
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Net Chauffeur</span>
              <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
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

        {/* Swipe Slider ou Verrouillage */}
        {isSwipeLocked ? (
          /* Slider verrouillé avec chrono */
          <div className="relative w-full h-16 rounded-full overflow-hidden shadow-lg select-none bg-gradient-to-r from-amber-600 via-amber-500 to-amber-400">
            <div className="absolute left-1 top-1 w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-xl z-10 border-2 border-white/50">
              <Lock className="w-7 h-7 text-amber-600" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none pl-16">
              <div className="flex flex-col items-center">
                <span className="font-bold text-sm uppercase tracking-wider text-white/90">
                  🔒 Verrouillée
                </span>
                <CourseTimer pickupDate={course.pickup_date} />
              </div>
            </div>
          </div>
        ) : currentAction ? (
          /* Slider actif */
          <div 
            ref={sliderRef}
            className={cn(
              "relative w-full h-16 rounded-full overflow-hidden shadow-lg select-none",
              "bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400",
              swipeX > threshold && "from-green-600 via-green-500 to-green-400",
              isProcessing && "opacity-50 pointer-events-none"
            )}
            style={{ 
              touchAction: isProcessing ? 'auto' : 'none', 
              willChange: 'transform',
              userSelect: 'none',
              WebkitUserSelect: 'none',
              WebkitTouchCallout: 'none',
              transition: 'background 0.2s ease'
            }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* Barre de progression visuelle */}
            <div 
              className="absolute left-0 top-0 bottom-0 bg-white/20 pointer-events-none rounded-full"
              style={{ 
                width: `${Math.min((swipeX / maxSwipeDistance) * 100, 100)}%`,
                transition: isAnimating ? 'width 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' : 'none'
              }}
            />
            
            {/* Knob draggable - Zone tactile agrandie 56x56 */}
            <div 
              className={cn(
                "absolute left-1 top-1 w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-xl z-10",
                "border-2 border-white/50",
                swipeX > 0 && "scale-105",
                swipeX > threshold && "scale-110 shadow-2xl"
              )}
              style={{ 
                transform: `translateX(${swipeX}px)`,
                transition: isAnimating 
                  ? 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), scale 0.15s ease' 
                  : 'scale 0.15s ease',
                willChange: 'transform'
              }}
            >
              {swipeX > threshold ? (
                <Unlock className="w-7 h-7 text-green-600" />
              ) : (
                <ChevronRight className="w-7 h-7 text-blue-600" />
              )}
            </div>
            
            {/* Texte central avec feedback visuel */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none pl-16">
              <span 
                className={cn(
                  "font-bold text-sm uppercase tracking-wider transition-all duration-200",
                  swipeX > threshold ? "text-white scale-105" : "text-white/90"
                )}
              >
                {swipeX > threshold ? '✓ RELÂCHEZ !' : `⟩⟩ ${currentAction.label.toUpperCase()}`}
              </span>
            </div>
            
            {/* Flèches animées indicatives */}
            <div 
              className="absolute right-4 inset-y-0 flex items-center gap-0 pointer-events-none"
              style={{ opacity: swipeX > threshold ? 0 : 1, transition: 'opacity 0.2s' }}
            >
              <ChevronRight className="w-6 h-6 text-white/50 animate-pulse" style={{ animationDelay: '0ms' }} />
              <ChevronRight className="w-6 h-6 text-white/70 animate-pulse -ml-3" style={{ animationDelay: '150ms' }} />
              <ChevronRight className="w-6 h-6 text-white animate-pulse -ml-3" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        ) : null}
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

      {/* SignBoard Modal - Pancarte client */}
      <SignBoardModal
        open={showSignBoard}
        onOpenChange={setShowSignBoard}
        clientName={course.client_name}
        companyName={course.company_name}
        companyLogoUrl={driver?.company_logo_url}
      />
    </>
  );
};
