import { resolveApiOrigin } from './config/apiOrigin.cjs';

export default {
  expo: {
    name: 'LiLove',
    slug: 'lilove',
    version: '1.2',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'automatic',
    owner: 'berkekahraman',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#9333EA',
    },
    scheme: 'lilove',
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'org.lilove.app',
      buildNumber: '131',
      usesAppleSignIn: true,
      appleTeamId: '87U9ZK37M2',
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSPhotoLibraryUsageDescription: 'Fotoğraf seçmek için galeri erişimi gerekir.',
        UIBackgroundModes: ['remote-notification'],
        CFBundleURLTypes: [
          { CFBundleURLSchemes: ['lilove', 'org.lilove.app'] },
          {
            CFBundleURLSchemes: [
              'com.googleusercontent.apps.135520108428-1agb94pl20q54sahj2bk7ki1pr8kve2j',
            ],
          },
        ],
      },
    },
    notification: {
      icon: './assets/icon.png',
      color: '#8B5CF6',
    },
    plugins: [
      './plugins/withInfoPlistLocales',
      'expo-apple-authentication',
      ['expo-image-picker', { cameraPermission: false, microphonePermission: false }],
      'expo-iap',
      './plugins/withFmtXcode26',
      './plugins/withDeploymentTarget',
    ],
    extra: {
      eas: {
        projectId: 'ab7bb029-eeb4-4407-a810-a9b27462f0ae',
      },
      apiUrl: resolveApiOrigin(process.env),
      firebase: {
        apiKey: process.env.FIREBASE_API_KEY || 'AIzaSyDYkdHendqbURTk4FxjLnYNwmxtqPEYHfY',
        projectId: 'lilove-e8b3a',
        appId: process.env.FIREBASE_APP_ID || '1:135520108428:ios:6ca3ed8d2a492f8e5be0a9',
      },
    },
  },
};
