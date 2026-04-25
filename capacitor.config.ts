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
  },
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email', 'https://www.googleapis.com/auth/drive.file'],
      serverClientId: '271141142279-ec3u3nd5p4fm2mi7uahtoro7eskobpbr.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
  },
};

export default config;