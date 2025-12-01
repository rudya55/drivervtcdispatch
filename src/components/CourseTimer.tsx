import { useState, useEffect, useRef } from 'react';
import { Clock, Timer } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface CourseTimerProps {
  pickupDate: string;
  onUnlock?: () => void;
}

export const CourseTimer = ({ pickupDate, onUnlock }: CourseTimerProps) => {
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const hasCalledUnlock = useRef(false);
  const onUnlockRef = useRef(onUnlock);

  // Mettre à jour la ref quand onUnlock change
  useEffect(() => {
    onUnlockRef.current = onUnlock;
  }, [onUnlock]);

  useEffect(() => {
    const calculateTime = () => {
      const pickup = new Date(pickupDate);
      const unlockTime = new Date(pickup.getTime() - 60 * 60000); // 1h avant
      const now = new Date();
      
      const diff = unlockTime.getTime() - now.getTime();
      
      if (diff <= 0) {
        if (!hasCalledUnlock.current) {
          hasCalledUnlock.current = true;
          setIsUnlocked(true);
          onUnlockRef.current?.();
        }
        setTimeRemaining(0);
      } else {
        setTimeRemaining(diff);
      }
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);

    return () => clearInterval(interval);
  }, [pickupDate]);

  if (isUnlocked) {
    return (
      <Badge variant="default" className="bg-success text-white">
        <Clock className="w-3 h-3 mr-1" />
        Course débloquée
      </Badge>
    );
  }

  const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
  const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);

  return (
    <Badge variant="secondary" className="bg-warning/20 text-warning border-warning/30">
      <Timer className="w-3 h-3 mr-1" />
      Déblocage dans {hours > 0 && `${hours}h `}{minutes}min {seconds}s
    </Badge>
  );
};