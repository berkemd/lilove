export default {
  expo: {
    name: "LiLove",
    slug: "lilove",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    owner: "berkekahraman",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#9333EA"
    },
    scheme: "lilove",
    ios: {
      supportsTablet: true,
      bundleIdentifier: "org.lilove.app",
      buildNumber: "125",
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSLocationWhenInUseUsageDescription: "Konum bilginizi yakındaki kullanıcıları göstermek için kullanırız.",
        NSCameraUsageDescription: "Profil fotoğrafı çekmek için kamera erişimi gerekir.",
        NSPhotoLibraryUsageDescription: "Fotoğraf seçmek için galeri erişimi gerekir.",
        UIBackgroundModes: ["remote-notification"],
        CFBundleURLTypes: [
          {
            CFBundleURLSchemes: [
              "com.googleusercontent.apps.889526589579-gvuj12sul4hnb3sjbop2lhbd1bhfb6o3"
            ]
          }
        ]
      }
    },
    notification: {
      icon: "./assets/icon.png",
      color: "#8B5CF6"
    },
    plugins: ["expo-iap"],
    extra: {
      eas: {
        projectId: "ab7bb029-eeb4-4407-a810-a9b27462f0ae"
      },
      apiUrl: "https://lilove.org",
      firebase: {
        apiKey: process.env.FIREBASE_API_KEY || 'AIzaSyDYkdHendqbURTk4FxjLnYNwmxtqPEYHfY',
        projectId: 'lilove-e8b3a',
        appId: process.env.FIREBASE_APP_ID || '1:135520108428:ios:6ca3ed8d2a492f8e5be0a9',
      }
    }
  }
};
