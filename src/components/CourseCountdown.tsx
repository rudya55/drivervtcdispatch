import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface CourseCountdownProps {
  pickupDate: string;
  onUnlock?: () => void;
}

/**
 * Component that displays a countdown timer until a course can be started.
 * A course can only be started 1 hour before the pickup time.
 */
export const CourseCountdown = ({ pickupDate, onUnlock }: CourseCountdownProps) => {
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isUnlocked, setIsUnlocked] = useState(false);

  useEffect(() => {
    const calculateTimeRemaining = () => {
      const pickupTime = new Date(pickupDate);
      const canStartTime = new Date(pickupTime.getTime() - 60 * 60 * 1000); // 1 hour before
      const now = new Date();
      const remaining = canStartTime.getTime() - now.getTime();

      return Math.max(0, remaining);
    };

    const updateTimer = () => {
      const remaining = calculateTimeRemaining();
      setTimeRemaining(remaining);

      if (remaining <= 0 && !isUnlocked) {
        setIsUnlocked(true);
        onUnlock?.();
      }
    };

    // Initial update
    updateTimer();

    // Update every second
    const interval = setInterval(updateTimer, 1000);

    // Cleanup
    return () => clearInterval(interval);
  }, [pickupDate, isUnlocked, onUnlock]);

  // Format time remaining
  const formatTime = (milliseconds: number): string => {
    if (milliseconds <= 0) return 'Prêt à démarrer';

    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `Démarrage possible dans ${hours}h ${minutes}min ${seconds}s`;
    } else if (minutes > 0) {
      return `Démarrage possible dans ${minutes}min ${seconds}s`;
    } else {
      return `Démarrage possible dans ${seconds}s`;
    }
  };

  const formattedTime = formatTime(timeRemaining);
  const isReady = timeRemaining <= 0;

  return (
    <Badge
      variant={isReady ? 'default' : 'secondary'}
      className={`flex items-center gap-2 px-4 py-2 text-sm font-medium ${
        isReady
          ? 'bg-emerald-500 text-white'
          : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
      }`}
    >
      <Clock className="w-4 h-4" />
      <span>{formattedTime}</span>
    </Badge>
  );
};
