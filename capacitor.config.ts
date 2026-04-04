import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.medora.app',
  appName: 'Medora',
  webDir: 'dist',
  typescriptserver: {
    allowNavigation: [
      'accounts.google.com',
      '*.googleapis.com',
    ]
  }
};

export default config;