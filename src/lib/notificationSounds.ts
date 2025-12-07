import { playHapticFeedback, HapticNotificationType } from './notificationHaptics';
import { Capacitor } from '@capacitor/core';

export const notificationSounds = [
  { id: 'default', name: 'Par défaut', url: '/sounds/default.mp3' },
  { id: 'bell', name: 'Cloche', url: '/sounds/bell.mp3' },
  { id: 'chime', name: 'Carillon', url: '/sounds/chime.mp3' },
  { id: 'alert', name: 'Alerte', url: '/sounds/alert.mp3' },
  { id: 'gentle', name: 'Doux', url: '/sounds/gentle.mp3' },
];

export const playNotificationSound = (soundId: string = 'default') => {
  try {
    const sound = notificationSounds.find(s => s.id === soundId);
    if (!sound) {
      console.warn(`[NotificationSounds] Sound not found: ${soundId}, using default`);
      soundId = 'default';
    }

    const soundToPlay = sound || notificationSounds[0];
    console.log('[NotificationSounds] Playing:', soundToPlay);

    const audio = new Audio(soundToPlay.url);
    audio.volume = 0.8;
    
    audio.play().catch(err => {
      console.error('[NotificationSounds] Playback error:', err);
    });
  } catch (e) {
    console.error('[NotificationSounds] Error:', e);
  }
};

// Jouer son ET vibration ensemble
export const playNotificationWithHaptic = async (
  soundId: string = 'default',
  hapticType: HapticNotificationType = 'default'
): Promise<void> => {
  // Jouer la vibration en parallèle (uniquement sur natif)
  if (Capacitor.isNativePlatform()) {
    playHapticFeedback(hapticType);
  }
  
  // Jouer le son
  playNotificationSound(soundId);
};
