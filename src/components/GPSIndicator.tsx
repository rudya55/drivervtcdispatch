import { Navigation, AlertTriangle, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GPSIndicatorProps {
  isTracking: boolean;
  accuracy: number | null;
  error: string | null;
  showDetails?: boolean;
}

export const GPSIndicator = ({
  isTracking,
  accuracy,
  error,
  showDetails = true
}: GPSIndicatorProps) => {
  // Determine GPS state and styling
  const getGPSState = () => {
    if (error || !isTracking) {
      return {
        color: 'bg-red-500',
        pulseColor: 'bg-red-400',
        textColor: 'text-red-500',
        label: 'GPS désactivé',
        isPulsing: false,
        icon: WifiOff
      };
    }

    if (accuracy === null) {
      return {
        color: 'bg-yellow-500',
        pulseColor: 'bg-yellow-400',
        textColor: 'text-yellow-500',
        label: 'Recherche GPS...',
        isPulsing: true,
        icon: Navigation
      };
    }

    if (accuracy < 20) {
      return {
        color: 'bg-green-500',
        pulseColor: 'bg-green-400',
        textColor: 'text-green-500',
        label: 'GPS actif',
        isPulsing: true,
        icon: Navigation
      };
    }

    if (accuracy < 50) {
      return {
        color: 'bg-yellow-500',
        pulseColor: 'bg-yellow-400',
        textColor: 'text-yellow-500',
        label: 'GPS imprécis',
        isPulsing: true,
        icon: AlertTriangle
      };
    }

    return {
      color: 'bg-orange-500',
      pulseColor: 'bg-orange-400',
      textColor: 'text-orange-500',
      label: 'Signal faible',
      isPulsing: true,
      icon: AlertTriangle
    };
  };

  const state = getGPSState();
  const Icon = state.icon;

  return (
    <div className="flex items-center gap-2 bg-background/90 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-lg border border-border">
      {/* Pulsing icon container */}
      <div className="relative">
        {/* Pulse ring animation */}
        {state.isPulsing && (
          <div 
            className={cn(
              "absolute inset-0 rounded-full animate-gps-pulse",
              state.pulseColor
            )} 
          />
        )}
        {/* Icon */}
        <div 
          className={cn(
            "relative w-6 h-6 rounded-full flex items-center justify-center",
            state.color
          )}
        >
          <Icon className="w-3.5 h-3.5 text-white" />
        </div>
      </div>

      {/* Text details */}
      {showDetails && (
        <div className="flex flex-col">
          <span className={cn("text-xs font-semibold", state.textColor)}>
            {state.label}
          </span>
          {accuracy !== null && isTracking && !error && (
            <span className="text-[10px] text-muted-foreground">
              ±{Math.round(accuracy)}m
            </span>
          )}
        </div>
      )}
    </div>
  );
};
