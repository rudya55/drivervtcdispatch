import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const translateCourseStatus = (status: string): string => {
  const translations: Record<string, string> = {
    'pending': 'En attente',
    'dispatched': 'Dispatchée',
    'accepted': 'Acceptée',
    'started': 'Démarrée',
    'arrived': 'Arrivé',
    'in_progress': 'En cours',
    'picked_up': 'Client à bord',
    'dropped_off': 'Client déposé',
    'completed': 'Terminée',
    'cancelled': 'Annulée'
  };
  return translations[status] || status;
};
