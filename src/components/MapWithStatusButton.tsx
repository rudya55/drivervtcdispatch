import { useState } from 'react';
import GoogleMap from './GoogleMap';
import { Button } from './ui/button';
import { Power } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MapWithStatusButtonProps {
  center: { lat: number; lng: number };
  zoom: number;
  markers?: Array<{ lat: number; lng: number; label: string }>;
  driverStatus: 'active' | 'inactive';
  onStatusChange: (status: 'active' | 'inactive') => void;
  isUpdating?: boolean;
}

export const MapWithStatusButton = ({
  center,
  zoom,
  markers,
  driverStatus,
  onStatusChange,
  isUpdating = false
}: MapWithStatusButtonProps) => {
  const isOnline = driverStatus === 'active';

  const handleToggle = () => {
    const newStatus = isOnline ? 'inactive' : 'active';
    onStatusChange(newStatus);
  };

  return (
    <div className="relative w-full h-full">
      {/* Google Map */}
      <GoogleMap
        center={center}
        zoom={zoom}
        markers={markers}
      />

      {/* Floating Status Button - Center of Map */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
        <Button
          onClick={handleToggle}
          disabled={isUpdating}
          className={cn(
            "h-14 w-14 rounded-full shadow-xl border-2 border-white transition-all duration-300 transform hover:scale-110",
            "flex flex-col items-center justify-center gap-0.5 font-bold text-white p-2",
            isOnline
              ? "bg-green-500 hover:bg-green-600 active:bg-green-700"
              : "bg-red-500 hover:bg-red-600 active:bg-red-700",
            isUpdating && "opacity-70 cursor-not-allowed"
          )}
        >
          <Power className={cn(
            "w-5 h-5 transition-transform",
            isOnline && "animate-pulse"
          )} />
          <span className="text-[8px] font-extrabold uppercase leading-tight">
            {isUpdating ? "..." : isOnline ? "EN LIGNE" : "HORS LIGNE"}
          </span>
        </Button>
      </div>

      {/* Status Indicator - Top Right Corner */}
      <div className="absolute top-4 right-4 z-10">
        <div className={cn(
          "px-4 py-2 rounded-full shadow-lg border-2 border-white font-semibold text-sm",
          isOnline
            ? "bg-green-500 text-white"
            : "bg-red-500 text-white"
        )}>
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-3 h-3 rounded-full",
              isOnline ? "bg-white animate-pulse" : "bg-white"
            )} />
            {isOnline ? "Disponible" : "Indisponible"}
          </div>
        </div>
      </div>
    </div>
  );
};
