import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import React from "react";

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
