import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.meowai.app',
  appName: 'Meow AI',
  webDir: 'dist',
  server: {
    url: 'https://www.meowai.work.gd',
    androidScheme: 'https',
    cleartext: false
  }
};

export default config;
