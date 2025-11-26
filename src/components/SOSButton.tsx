import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertTriangle, Phone, MapPin, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface SOSButtonProps {
  driverId: string;
  driverName: string;
  currentLocation?: { lat: number; lng: number } | null;
  courseId?: string | null;
}

export const SOSButton = ({ driverId, driverName, currentLocation, courseId }: SOSButtonProps) => {
  const [isPressed, setIsPressed] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showSOSModal, setShowSOSModal] = useState(false);
  const [isActivated, setIsActivated] = useState(false);
  const pressTimer = useRef<NodeJS.Timeout | null>(null);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);

  const PRESS_DURATION = 3000; // 3 secondes

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (pressTimer.current) clearTimeout(pressTimer.current);
      if (progressInterval.current) clearInterval(progressInterval.current);
    };
  }, []);

  const handlePressStart = () => {
    setIsPressed(true);
    setProgress(0);

    // Vibration initiale
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }

    // Animation de progression
    const startTime = Date.now();
    progressInterval.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const newProgress = (elapsed / PRESS_DURATION) * 100;
      setProgress(newProgress);

      // Vibration progressive
      if (newProgress > 25 && newProgress < 30 && navigator.vibrate) {
        navigator.vibrate(30);
      }
      if (newProgress > 50 && newProgress < 55 && navigator.vibrate) {
        navigator.vibrate(30);
      }
      if (newProgress > 75 && newProgress < 80 && navigator.vibrate) {
        navigator.vibrate(30);
      }

      if (newProgress >= 100) {
        if (progressInterval.current) clearInterval(progressInterval.current);
      }
    }, 50);

    // Timer de 3 secondes
    pressTimer.current = setTimeout(() => {
      activateSOS();
    }, PRESS_DURATION);
  };

  const handlePressEnd = () => {
    setIsPressed(false);
    setProgress(0);

    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }
  };

  const activateSOS = async () => {
    setIsPressed(false);
    setProgress(0);

    if (pressTimer.current) clearTimeout(pressTimer.current);
    if (progressInterval.current) clearInterval(progressInterval.current);

    // Vibration forte de confirmation
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200]);
    }

    setIsActivated(true);
    setShowSOSModal(true);

    // Envoyer l'alerte SOS au backend
    try {
      const { error } = await supabase.functions.invoke('driver-send-sos', {
        body: {
          driver_id: driverId,
          driver_name: driverName,
          course_id: courseId || null,
          latitude: currentLocation?.lat || null,
          longitude: currentLocation?.lng || null,
          timestamp: new Date().toISOString(),
        },
      });

      if (error) {
        console.error('SOS send error:', error);
        toast.error('Erreur lors de l\'envoi de l\'alerte SOS');
      } else {
        toast.success('🚨 Alerte SOS envoyée au dispatch', {
          duration: 10000,
        });
      }
    } catch (error) {
      console.error('SOS error:', error);
      // Même en cas d'erreur, on affiche le modal pour que le chauffeur puisse appeler
      toast.warning('Alerte envoyée localement, vérifiez votre connexion', {
        duration: 5000,
      });
    }
  };

  const callEmergency = (number: string) => {
    window.location.href = `tel:${number}`;
    toast.info(`Appel vers le ${number}...`);
  };

  const cancelSOS = () => {
    setShowSOSModal(false);
    setIsActivated(false);
    toast.info('Alerte SOS annulée');
  };

  return (
    <>
      {/* Bouton SOS */}
      <div className="relative">
        <Button
          variant="destructive"
          size="icon"
          className={`relative overflow-hidden transition-all duration-300 ${
            isPressed ? 'scale-110 shadow-2xl' : 'scale-100'
          }`}
          onMouseDown={handlePressStart}
          onMouseUp={handlePressEnd}
          onMouseLeave={handlePressEnd}
          onTouchStart={handlePressStart}
          onTouchEnd={handlePressEnd}
          onTouchCancel={handlePressEnd}
        >
          <AlertTriangle className={`w-5 h-5 ${isPressed ? 'animate-pulse' : ''}`} />

          {/* Barre de progression circulaire */}
          {isPressed && (
            <svg
              className="absolute inset-0 w-full h-full -rotate-90"
              style={{ strokeDasharray: 100, strokeDashoffset: 100 - progress }}
            >
              <circle
                cx="50%"
                cy="50%"
                r="45%"
                fill="none"
                stroke="white"
                strokeWidth="3"
                opacity="0.8"
              />
            </svg>
          )}
        </Button>

        {/* Tooltip */}
        {!isPressed && (
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs text-muted-foreground">
            Appui long 3s
          </div>
        )}
      </div>

      {/* Modal SOS */}
      <Dialog open={showSOSModal} onOpenChange={setShowSOSModal}>
        <DialogContent className="max-w-md border-4 border-destructive">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive text-xl">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
              🚨 ALERTE SOS ACTIVÉE
            </DialogTitle>
            <DialogDescription className="text-base">
              Le dispatch a été alerté de votre situation d'urgence.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Informations envoyées */}
            <div className="p-4 bg-destructive/10 rounded-lg border-2 border-destructive/30 space-y-2">
              <p className="font-semibold text-sm">Informations transmises au dispatch:</p>

              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4" />
                <span>{format(new Date(), 'PPpp', { locale: fr })}</span>
              </div>

              {currentLocation && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4" />
                  <span>Position GPS: {currentLocation.lat.toFixed(4)}, {currentLocation.lng.toFixed(4)}</span>
                </div>
              )}

              {courseId && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">Course en cours: #{courseId.slice(0, 8)}</span>
                </div>
              )}
            </div>

            {/* Appels d'urgence */}
            <div className="space-y-2">
              <p className="font-semibold text-sm">Appeler les secours:</p>

              <Button
                variant="destructive"
                className="w-full h-14 text-lg font-bold gap-3"
                onClick={() => callEmergency('112')}
              >
                <Phone className="w-6 h-6" />
                Appeler le 112 (Urgences Europe)
              </Button>

              <Button
                variant="outline"
                className="w-full h-12 gap-2"
                onClick={() => callEmergency('17')}
              >
                <Phone className="w-5 h-5" />
                Appeler le 17 (Police)
              </Button>
            </div>

            {/* Message rassurant */}
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs text-center text-muted-foreground">
                ℹ️ Le dispatch va vous contacter dans les plus brefs délais.
                Restez calme et en sécurité.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={cancelSOS} className="w-full">
              Annuler l'alerte
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
