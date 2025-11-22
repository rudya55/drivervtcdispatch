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
  driverIcon?: 'car' | 'taxi' | 'van' | 'motorcycle' | 'suv';
  driverHeading?: number;
}

export const MapWithStatusButton = ({
  center,
  zoom,
  markers,
  driverStatus,
  onStatusChange,
  isUpdating = false,
  driverIcon = 'car',
  driverHeading = 0
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
        driverMarker={{
          lat: center.lat,
          lng: center.lng,
          icon: driverIcon,
          heading: driverHeading
        }}
      />

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
