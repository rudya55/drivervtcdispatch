/**
 * Simplifie une adresse pour des raisons de sécurité
 * Extrait uniquement la ville, l'arrondissement ou le nom du lieu
 */
export function simplifyAddress(fullAddress: string): string {
  if (!fullAddress) return '';

  const address = fullAddress.trim();
  const lowerAddress = address.toLowerCase();

  // Aéroports
  if (lowerAddress.includes('aéroport') || lowerAddress.includes('aeroport') || lowerAddress.includes('airport')) {
    if (lowerAddress.includes('charles') || lowerAddress.includes('cdg') || lowerAddress.includes('roissy')) {
      return 'Aéroport Charles de Gaulle';
    }
    if (lowerAddress.includes('orly')) {
      return 'Aéroport d\'Orly';
    }
    if (lowerAddress.includes('beauvais')) {
      return 'Aéroport de Beauvais';
    }
    if (lowerAddress.includes('le bourget')) {
      return 'Aéroport du Bourget';
    }
    // Aéroport générique
    const match = address.match(/aéroport\s+([^,]+)/i);
    if (match) return match[0];
  }

  // Châteaux
  if (lowerAddress.includes('château') || lowerAddress.includes('chateau')) {
    if (lowerAddress.includes('versailles')) {
      return 'Château de Versailles';
    }
    if (lowerAddress.includes('fontainebleau')) {
      return 'Château de Fontainebleau';
    }
    if (lowerAddress.includes('vaux-le-vicomte') || lowerAddress.includes('vaux le vicomte')) {
      return 'Château de Vaux-le-Vicomte';
    }
    // Château générique
    const match = address.match(/château\s+([^,]+)/i);
    if (match) return match[0];
  }

  // Gares principales
  if (lowerAddress.includes('gare')) {
    if (lowerAddress.includes('nord')) return 'Gare du Nord';
    if (lowerAddress.includes('lyon')) return 'Gare de Lyon';
    if (lowerAddress.includes('est')) return 'Gare de l\'Est';
    if (lowerAddress.includes('montparnasse')) return 'Gare Montparnasse';
    if (lowerAddress.includes('austerlitz')) return 'Gare d\'Austerlitz';
    if (lowerAddress.includes('saint-lazare') || lowerAddress.includes('st lazare')) return 'Gare Saint-Lazare';
  }

  // Paris avec arrondissement
  const parisMatch = address.match(/paris\s+(\d{1,2})(ème|e|er)?/i);
  if (parisMatch) {
    const arrondissement = parisMatch[1];
    return `Paris ${arrondissement}${arrondissement === '1' ? 'er' : 'ème'}`;
  }

  // Paris sans arrondissement spécifique
  if (lowerAddress.includes('paris')) {
    // Essayer d'extraire le code postal
    const codePostalMatch = address.match(/75(\d{3})/);
    if (codePostalMatch) {
      const arrondissement = codePostalMatch[1];
      return `Paris ${arrondissement}${arrondissement === '001' ? 'er' : 'ème'}`;
    }
    return 'Paris';
  }

  // Ville de banlieue ou autre ville
  // Format typique: "123 rue de X, 92100 Boulogne-Billancourt"
  const cityMatch = address.match(/,\s*\d{5}\s+([^,]+)/);
  if (cityMatch) {
    return cityMatch[1].trim();
  }

  // Format: "Ville, Code postal"
  const cityMatch2 = address.match(/,\s*([A-Z][a-zéèêàâôûù\-\s]+)\s*,?\s*\d{5}/i);
  if (cityMatch2) {
    return cityMatch2[1].trim();
  }

  // Format: "Code postal Ville"
  const cityMatch3 = address.match(/\d{5}\s+([A-Z][a-zéèêàâôûù\-\s]+)/i);
  if (cityMatch3) {
    return cityMatch3[1].trim();
  }

  // Dernière tentative: prendre ce qui est après la dernière virgule
  const parts = address.split(',');
  if (parts.length >= 2) {
    const lastPart = parts[parts.length - 1].trim();
    // Enlever le code postal s'il y en a un
    const withoutPostal = lastPart.replace(/\d{5}\s*/, '').trim();
    if (withoutPostal) {
      return withoutPostal;
    }
  }

  // Si rien ne marche, retourner l'adresse telle quelle (mais tronquée)
  return address.split(',')[0].substring(0, 50);
}

/**
 * Calcule la durée entre deux dates en format lisible
 */
export function calculateDuration(startDate: string | null, endDate: string | null): string {
  if (!startDate || !endDate) return '-';

  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffMs = end.getTime() - start.getTime();

  if (diffMs < 0) return '-';

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours}h ${minutes}min`;
  }
  return `${minutes}min`;
}
