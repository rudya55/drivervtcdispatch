import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lovable.drivervtcdispatch',
  appName: 'drivervtcdispatch',
  webDir: 'dist',
  server: {
    url: 'https://4abdee7f-238d-436b-9d0d-34c8665e5ddf.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#1a1f2e',
      showSpinner: false,
    },
  },
};

export default config;
