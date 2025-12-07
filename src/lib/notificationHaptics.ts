import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

// Types de notifications avec patterns de vibration distincts
export type HapticNotificationType = 
  | 'new_course'      // Nouvelle course - pattern fort et répété
  | 'chat_message'    // Message chat - pattern doux
  | 'urgent_alert'    // Alerte urgente - pattern très intense
  | 'course_update'   // Mise à jour course - pattern moyen
  | 'default';        // Par défaut

// Patterns de vibration personnalisés
export const hapticPatterns: Record<HapticNotificationType, {
  name: string;
  description: string;
  style: ImpactStyle;
  repeat: number;
  interval: number;
}> = {
  new_course: {
    name: 'Nouvelle course',
    description: 'Vibration forte et répétée (3x)',
    style: ImpactStyle.Heavy,
    repeat: 3,
    interval: 150
  },
  chat_message: {
    name: 'Message chat',
    description: 'Vibration légère (1x)',
    style: ImpactStyle.Light,
    repeat: 1,
    interval: 0
  },
  urgent_alert: {
    name: 'Alerte urgente',
    description: 'Vibration très intense et prolongée (5x)',
    style: ImpactStyle.Heavy,
    repeat: 5,
    interval: 100
  },
  course_update: {
    name: 'Mise à jour course',
    description: 'Vibration moyenne (2x)',
    style: ImpactStyle.Medium,
    repeat: 2,
    interval: 200
  },
  default: {
    name: 'Par défaut',
    description: 'Vibration standard',
    style: ImpactStyle.Medium,
    repeat: 1,
    interval: 0
  }
};

// Jouer un pattern de vibration
export const playHapticFeedback = async (
  type: HapticNotificationType = 'default'
): Promise<void> => {
  // Vérifier si on est sur une plateforme native
  if (!Capacitor.isNativePlatform()) {
    console.log('[Haptics] Vibration non disponible sur le web');
    return;
  }

  try {
    const pattern = hapticPatterns[type] || hapticPatterns.default;
    console.log('[Haptics] Playing pattern:', type, pattern.name);

    // Jouer le pattern avec répétition
    for (let i = 0; i < pattern.repeat; i++) {
      await Haptics.impact({ style: pattern.style });
      
      if (pattern.interval > 0 && i < pattern.repeat - 1) {
        await new Promise(resolve => setTimeout(resolve, pattern.interval));
      }
    }
  } catch (error) {
    console.error('[Haptics] Error:', error);
  }
};

// Vibration de notification système (succès/erreur/warning)
export const playNotificationHaptic = async (
  type: 'success' | 'warning' | 'error' = 'success'
): Promise<void> => {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const notificationType = 
      type === 'success' ? NotificationType.Success :
      type === 'warning' ? NotificationType.Warning :
      NotificationType.Error;
    
    await Haptics.notification({ type: notificationType });
  } catch (error) {
    console.error('[Haptics] Notification error:', error);
  }
};

// Vibration pour selection/interaction UI
export const playSelectionHaptic = async (): Promise<void> => {
  if (!Capacitor.isNativePlatform()) return;
  
  try {
    await Haptics.selectionChanged();
  } catch (error) {
    console.error('[Haptics] Selection error:', error);
  }
};
