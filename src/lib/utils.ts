import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import React from "react";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Course unlock timing constant (1 hour before pickup in milliseconds)
export const UNLOCK_TIME_BEFORE_PICKUP_MS = 60 * 60 * 1000;

// Check if a course can be started (1h before pickup)
export const canStartCourse = (pickupDate: string): boolean => {
  const pickup = new Date(pickupDate);
  const unlockTime = new Date(pickup.getTime() - UNLOCK_TIME_BEFORE_PICKUP_MS);
  const now = new Date();
  return now >= unlockTime;
};

// Format countdown time remaining in human-readable format
export const formatCountdownTime = (timeRemaining: number): string => {
  const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
  const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);
  return hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min ${seconds}s`;
};

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

export const formatFullDate = (dateString: string): string => {
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  };
  
  const datePart = date.toLocaleDateString('fr-FR', options);
  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  
  // Capitaliser la première lettre
  const capitalizedDate = datePart.charAt(0).toUpperCase() + datePart.slice(1);
  
  return `${capitalizedDate} à ${hours}h${minutes}`;
};

export const extractCity = (fullAddress: string): string => {
  if (!fullAddress) return '';
  
  const parts = fullAddress.split(',');
  if (parts.length >= 2) {
    const cityPart = parts.find(p => /\d{5}/.test(p)) || parts[parts.length - 2];
    const cityMatch = cityPart?.match(/\d{5}\s+(.+)/);
    if (cityMatch) return cityMatch[1].trim();
    return parts[parts.length - 2]?.trim() || fullAddress;
  }
  return fullAddress;
};

export function formatParisAddress(address: string): string {
  if (!address) return '';
  
  const lowerAddress = address.toLowerCase();
  
  // Détecter les aéroports en priorité
  if (lowerAddress.includes('charles de gaulle') || lowerAddress.includes('roissy') || lowerAddress.includes('cdg') || lowerAddress.includes('tremblay')) {
    return 'Aéroport CDG';
  }
  if (lowerAddress.includes('orly')) {
    return 'Aéroport Orly';
  }
  if (lowerAddress.includes('beauvais')) {
    return 'Aéroport Beauvais';
  }
  if (lowerAddress.includes('le bourget')) {
    return 'Le Bourget';
  }

  // Détecter Paris avec arrondissement (code postal 750XX)
  const arrMatch = address.match(/750(\d{2})/);
  if (arrMatch) {
    const arr = parseInt(arrMatch[1], 10);
    if (arr >= 1 && arr <= 20) {
      const suffix = arr === 1 ? 'er' : 'ème';
      return `Paris ${arr}${suffix}`;
    }
  }

  // Détecter "Paris" avec numéro d'arrondissement textuel (ex: "Paris 8", "Paris 16e", "8ème arrondissement")
  const textArrMatch = address.match(/paris\s*(\d{1,2})(?:e|ème|er|°)?/i);
  if (textArrMatch) {
    const arr = parseInt(textArrMatch[1], 10);
    if (arr >= 1 && arr <= 20) {
      const suffix = arr === 1 ? 'er' : 'ème';
      return `Paris ${arr}${suffix}`;
    }
  }

  // Détecter arrondissement mentionné (ex: "8ème arrondissement", "16e arrondissement")
  const arrondissementMatch = address.match(/(\d{1,2})(?:e|ème|er|°)?\s*arrondissement/i);
  if (arrondissementMatch) {
    const arr = parseInt(arrondissementMatch[1], 10);
    if (arr >= 1 && arr <= 20) {
      const suffix = arr === 1 ? 'er' : 'ème';
      return `Paris ${arr}${suffix}`;
    }
  }

  // Détecter gares parisiennes
  if (lowerAddress.includes('gare du nord')) return 'Gare du Nord';
  if (lowerAddress.includes('gare de lyon')) return 'Gare de Lyon';
  if (lowerAddress.includes('gare montparnasse')) return 'Gare Montparnasse';
  if (lowerAddress.includes('gare de l\'est')) return 'Gare de l\'Est';
  if (lowerAddress.includes('gare saint-lazare') || lowerAddress.includes('st-lazare')) return 'Gare St-Lazare';
  if (lowerAddress.includes('gare d\'austerlitz')) return 'Gare d\'Austerlitz';

  // Sinon extraire la ville du code postal
  const cityMatch = address.match(/(\d{5})\s+([A-Za-zÀ-ÿ\s-]+)/);
  if (cityMatch) {
    return cityMatch[2].trim();
  }

  return extractCity(address);
}

export const renderTextWithLinks = (text: string): React.ReactNode => {
  if (!text) return null;
  
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.(com|fr|io|app|link|pay|me|eu|net|org)[^\s]*)/gi;
  const parts: string[] = [];
  const matches: string[] = [];
  
  let lastIndex = 0;
  let match;
  
  while ((match = urlRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    matches.push(match[0]);
    parts.push(match[0]);
    lastIndex = match.index + match[0].length;
  }
  
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }
  
  return parts.map((part, index) => {
    if (matches.includes(part)) {
      const href = part.startsWith('http') ? part : `https://${part}`;
      return React.createElement('a', {
        key: `link-${index}`,
        href: href,
        target: '_blank',
        rel: 'noopener noreferrer',
        className: 'text-blue-500 underline hover:text-blue-700',
        onClick: (e: React.MouseEvent) => e.stopPropagation()
      }, part);
    }
    return part;
  });
};
