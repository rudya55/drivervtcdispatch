import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lovable.drivervtcdispatch',
  appName: 'Driver VTC Dispatch',
  webDir: 'dist',
  // IMPORTANT: Keep server.url commented for production builds
  // Uncomment ONLY for local development with live reload
  // server: {
  //   url: 'https://4abdee7f-238d-436b-9d0d-34c8665e5ddf.lovableproject.com?forceHideBadge=true',
  //   cleartext: true
  // },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      launchFadeOutDuration: 500,
      backgroundColor: '#1a1f2e',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    Geolocation: {
      // Request fine location for precise tracking
    },
    BackgroundGeolocation: {
      // Configure background location tracking
    },
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false, // Set to true for debugging
  },
  ios: {
    contentInset: 'automatic',
  },
};

export default config;
