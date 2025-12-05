import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';

// Types for NativeBiometric
interface BiometricOptions {
  reason?: string;
  title?: string;
  subtitle?: string;
  description?: string;
  negativeButtonText?: string;
  maxAttempts?: number;
  useFallback?: boolean;
}

interface Credentials {
  username: string;
  password: string;
}

interface AvailableResult {
  isAvailable: boolean;
  biometryType?: number;
  errorCode?: number;
}

// Biometry types
const BiometryType = {
  NONE: 0,
  TOUCH_ID: 1,
  FACE_ID: 2,
  FINGERPRINT: 3,
  FACE_AUTHENTICATION: 4,
  IRIS_AUTHENTICATION: 5,
};

const SERVER_ID = 'com.lovable.vtcdispatch';

export const useBiometricAuth = () => {
  const [isAvailable, setIsAvailable] = useState(false);
  const [biometryType, setBiometryType] = useState<string>('');
  const [hasCredentials, setHasCredentials] = useState(false);
  const [isNative, setIsNative] = useState(false);

  // Check if running on native platform
  useEffect(() => {
    const platform = Capacitor.getPlatform();
    setIsNative(platform === 'ios' || platform === 'android');
  }, []);

  // Check biometric availability
  const checkAvailability = useCallback(async () => {
    if (!isNative) {
      console.log('[Biometric] Not on native platform');
      return false;
    }

    try {
      const { NativeBiometric } = await import('capacitor-native-biometric');
      const result: AvailableResult = await NativeBiometric.isAvailable();
      
      console.log('[Biometric] Availability check:', result);
      
      setIsAvailable(result.isAvailable);
      
      if (result.isAvailable && result.biometryType !== undefined) {
        const typeLabel = getBiometryTypeLabel(result.biometryType);
        setBiometryType(typeLabel);
      }
      
      return result.isAvailable;
    } catch (error) {
      console.error('[Biometric] Error checking availability:', error);
      setIsAvailable(false);
      return false;
    }
  }, [isNative]);

  // Get human-readable biometry type
  const getBiometryTypeLabel = (type: number): string => {
    switch (type) {
      case BiometryType.TOUCH_ID:
        return 'Touch ID';
      case BiometryType.FACE_ID:
        return 'Face ID';
      case BiometryType.FINGERPRINT:
        return 'Empreinte digitale';
      case BiometryType.FACE_AUTHENTICATION:
        return 'Reconnaissance faciale';
      case BiometryType.IRIS_AUTHENTICATION:
        return 'Reconnaissance iris';
      default:
        return 'Biométrie';
    }
  };

  // Check if credentials are stored
  const checkCredentials = useCallback(async (): Promise<boolean> => {
    if (!isNative) return false;

    try {
      const { NativeBiometric } = await import('capacitor-native-biometric');
      const credentials = await NativeBiometric.getCredentials({ server: SERVER_ID });
      const exists = !!(credentials?.username && credentials?.password);
      setHasCredentials(exists);
      console.log('[Biometric] Credentials exist:', exists);
      return exists;
    } catch (error) {
      // No credentials stored - this is normal
      console.log('[Biometric] No credentials stored');
      setHasCredentials(false);
      return false;
    }
  }, [isNative]);

  // Save credentials securely
  const saveCredentials = async (email: string, password: string): Promise<boolean> => {
    if (!isNative) {
      console.log('[Biometric] Cannot save - not on native platform');
      return false;
    }

    try {
      const { NativeBiometric } = await import('capacitor-native-biometric');
      
      await NativeBiometric.setCredentials({
        username: email,
        password: password,
        server: SERVER_ID,
      });
      
      setHasCredentials(true);
      console.log('[Biometric] Credentials saved successfully');
      return true;
    } catch (error) {
      console.error('[Biometric] Error saving credentials:', error);
      return false;
    }
  };

  // Get stored credentials (after biometric verification)
  const getCredentials = async (): Promise<Credentials | null> => {
    if (!isNative) return null;

    try {
      const { NativeBiometric } = await import('capacitor-native-biometric');
      const credentials = await NativeBiometric.getCredentials({ server: SERVER_ID });
      
      if (credentials?.username && credentials?.password) {
        return {
          username: credentials.username,
          password: credentials.password,
        };
      }
      return null;
    } catch (error) {
      console.error('[Biometric] Error getting credentials:', error);
      return null;
    }
  };

  // Delete stored credentials
  const deleteCredentials = async (): Promise<boolean> => {
    if (!isNative) return false;

    try {
      const { NativeBiometric } = await import('capacitor-native-biometric');
      await NativeBiometric.deleteCredentials({ server: SERVER_ID });
      setHasCredentials(false);
      console.log('[Biometric] Credentials deleted');
      return true;
    } catch (error) {
      console.error('[Biometric] Error deleting credentials:', error);
      return false;
    }
  };

  // Perform biometric authentication
  const authenticate = async (options?: BiometricOptions): Promise<boolean> => {
    if (!isNative) {
      console.log('[Biometric] Cannot authenticate - not on native platform');
      return false;
    }

    try {
      const { NativeBiometric } = await import('capacitor-native-biometric');
      
      await NativeBiometric.verifyIdentity({
        reason: options?.reason || 'Connexion sécurisée',
        title: options?.title || 'Authentification requise',
        subtitle: options?.subtitle || '',
        description: options?.description || 'Utilisez votre biométrie pour vous connecter',
        negativeButtonText: options?.negativeButtonText || 'Annuler',
        maxAttempts: options?.maxAttempts || 3,
        useFallback: options?.useFallback ?? true,
      });
      
      console.log('[Biometric] Authentication successful');
      return true;
    } catch (error: any) {
      console.error('[Biometric] Authentication failed:', error);
      return false;
    }
  };

  // Authenticate and get credentials in one step
  const authenticateAndGetCredentials = async (): Promise<Credentials | null> => {
    const isAuthenticated = await authenticate();
    if (!isAuthenticated) return null;
    
    return await getCredentials();
  };

  // Initialize on mount
  useEffect(() => {
    if (isNative) {
      checkAvailability();
      checkCredentials();
    }
  }, [isNative, checkAvailability, checkCredentials]);

  return {
    isAvailable,
    isNative,
    biometryType,
    hasCredentials,
    checkAvailability,
    checkCredentials,
    saveCredentials,
    getCredentials,
    deleteCredentials,
    authenticate,
    authenticateAndGetCredentials,
  };
};
