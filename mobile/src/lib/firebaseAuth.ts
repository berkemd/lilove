import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import type { FirebaseApp } from 'firebase/app';
import * as FirebaseAuth from 'firebase/auth';
import type { Auth, Persistence, ReactNativeAsyncStorage } from 'firebase/auth';

// Firebase 11's public RN entry exports this function, but its shared TypeScript
// entry omits it. Keep the platform-only signature local and check it at runtime.
type NativeAuthModule = typeof FirebaseAuth & {
  getReactNativePersistence(storage: ReactNativeAsyncStorage): Persistence;
};

export function initializeAppAuth(app: FirebaseApp): Auth {
  if (Platform.OS === 'web') return FirebaseAuth.getAuth(app);

  const nativeAuth = FirebaseAuth as NativeAuthModule;
  if (typeof nativeAuth.getReactNativePersistence !== 'function') {
    throw new Error('Firebase React Native persistence is unavailable');
  }

  const persistence = nativeAuth.getReactNativePersistence(AsyncStorage);
  try {
    return FirebaseAuth.initializeAuth(app, {
      persistence,
    });
  } catch (error) {
    // Fast Refresh can re-evaluate this module while Firebase retains its Auth
    // instance. Never turn an unrelated initialization error into memory auth.
    if (
      error !== null &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'auth/already-initialized'
    ) {
      return FirebaseAuth.getAuth(app);
    }
    throw error;
  }
}
