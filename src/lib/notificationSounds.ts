import { playHapticFeedback, HapticNotificationType } from './notificationHaptics';
import { Capacitor } from '@capacitor/core';

export const notificationSounds = [
  { id: 'default', name: 'Par défaut', url: '/sounds/default.mp3' },
  { id: 'bell', name: 'Cloche', url: '/sounds/bell.mp3' },
  { id: 'chime', name: 'Carillon', url: '/sounds/chime.mp3' },
  { id: 'alert', name: 'Alerte', url: '/sounds/alert.mp3' },
  { id: 'gentle', name: 'Doux', url: '/sounds/gentle.mp3' },
  { id: 'ding', name: 'Ding', url: '/sounds/ding.mp3' },
  { id: 'cash', name: 'Caisse 💰', url: '/sounds/cash.mp3' },
  { id: 'success', name: 'Succès', url: '/sounds/success.mp3' },
  { id: 'horn', name: 'Klaxon 🚗', url: '/sounds/horn.mp3' },
  { id: 'whistle', name: 'Sifflet', url: '/sounds/whistle.mp3' },
  { id: 'doorbell', name: 'Sonnette', url: '/sounds/doorbell.mp3' },
  { id: 'arcade', name: 'Arcade 🎮', url: '/sounds/arcade.mp3' },
  { id: 'pop', name: 'Pop', url: '/sounds/pop.mp3' },
  { id: 'radar', name: 'Radar', url: '/sounds/radar.mp3' },
  { id: 'taxi', name: 'Taxi 🚕', url: '/sounds/taxi.mp3' },
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

// Son spécifique pour les messages chat (plus doux)
export const playChatMessageSound = () => {
  try {
    const audio = new Audio('/sounds/chat-message.mp3');
    audio.volume = 0.5;
    audio.play().catch(err => {
      console.error('[ChatSound] Playback error:', err);
    });
  } catch (e) {
    console.error('[ChatSound] Error:', e);
  }
};

// Jouer son chat ET vibration ensemble
export const playChatNotificationWithHaptic = async (): Promise<void> => {
  if (Capacitor.isNativePlatform()) {
    playHapticFeedback('chat_message');
  }
  playChatMessageSound();
};
