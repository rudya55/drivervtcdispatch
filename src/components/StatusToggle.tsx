import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

interface StatusToggleProps {
  isOnline: boolean;
  onToggle: () => void;
  isUpdating?: boolean;
}

export const StatusToggle = ({ isOnline, onToggle, isUpdating = false }: StatusToggleProps) => {
  return (
    <div 
      className={cn(
        "flex items-center justify-between px-6 py-4 rounded-full shadow-lg border-2 transition-all duration-300",
        "max-w-xs mx-auto",
        isOnline 
          ? "bg-white border-green-500" 
          : "bg-white border-red-500"
      )}
    >
      <span className={cn(
        "text-xl font-bold",
        isOnline ? "text-foreground" : "text-foreground"
      )}>
        {isUpdating ? "Mise à jour..." : (isOnline ? "En ligne" : "Hors ligne")}
      </span>
      
      <div className="relative">
        <Switch
          checked={isOnline}
          onCheckedChange={onToggle}
          disabled={isUpdating}
          className={cn(
            "data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-red-500",
            "scale-150"
          )}
        />
      </div>
    </div>
  );
};
