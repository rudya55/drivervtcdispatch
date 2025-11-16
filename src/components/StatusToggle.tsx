import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

interface StatusToggleProps {
  isOnline: boolean;
  onToggle: () => void;
  isUpdating?: boolean;
  disabled?: boolean;
}

export const StatusToggle = ({ isOnline, onToggle, isUpdating = false, disabled = false }: StatusToggleProps) => {
  return (
    <div 
      className={cn(
        "flex items-center justify-between gap-4 px-6 py-4 rounded-full shadow-lg border-2 transition-all duration-300",
        "w-full max-w-xs mx-auto bg-white",
        isOnline 
          ? "border-green-500" 
          : "border-red-500"
      )}
    >
      <span className={cn(
        "text-xl font-bold text-foreground"
      )}>
        {isUpdating ? "Mise à jour..." : (isOnline ? "En ligne" : "Hors ligne")}
      </span>
      
      <Switch
        checked={isOnline}
        onCheckedChange={onToggle}
        disabled={isUpdating || disabled}
        className={cn(
          "data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-red-500",
          "scale-125"
        )}
      />
    </div>
  );
};
