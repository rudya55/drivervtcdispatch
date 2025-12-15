import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lovable.drivervtcdispatch',  appName: 'VTC Dispatch Chauffeur',
  webDir: 'dist',
  // PRODUCTION: Commenter la section server pour utiliser le build local
  // server: {
  //   url: 'https://4abdee7f-238d-436b-9d0d-34c8665e5ddf.lovableproject.com?forceHideBadge=true',
  //   cleartext: true
  // },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#1a1f2e',
      showSpinner: false,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    BackgroundGeolocation: {
      // Configuration for persistent background location tracking
    },
  },
  android: {
    backgroundColor: '#1a1f2e',
    allowMixedContent: true,
    // Support foldable devices like Pixel Fold
    webContentsDebuggingEnabled: false,
  },
};

export default config;
