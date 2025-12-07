import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

/**
 * Hook for managing haptic feedback throughout the application.
 * Provides easy-to-use methods for different types of haptic feedback.
 */
export const useHaptics = () => {
  const lightImpact = async () => {
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch (error) {
      // Haptics may not be available on all devices
      console.debug('Haptics not available:', error);
    }
  };

  const mediumImpact = async () => {
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch (error) {
      console.debug('Haptics not available:', error);
    }
  };

  const heavyImpact = async () => {
    try {
      await Haptics.impact({ style: ImpactStyle.Heavy });
    } catch (error) {
      console.debug('Haptics not available:', error);
    }
  };

  const success = async () => {
    try {
      await Haptics.notification({ type: NotificationType.Success });
    } catch (error) {
      console.debug('Haptics not available:', error);
    }
  };

  const warning = async () => {
    try {
      await Haptics.notification({ type: NotificationType.Warning });
    } catch (error) {
      console.debug('Haptics not available:', error);
    }
  };

  const error = async () => {
    try {
      await Haptics.notification({ type: NotificationType.Error });
    } catch (error) {
      console.debug('Haptics not available:', error);
    }
  };

  return {
    lightImpact,
    mediumImpact,
    heavyImpact,
    success,
    warning,
    error,
  };
};
