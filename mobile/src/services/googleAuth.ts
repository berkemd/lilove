import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '';
const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '';
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '';

export function useGoogleAuth() {
  console.log('[Google Auth] Config:', {
    platform: Platform.OS,
    iosClientId: GOOGLE_IOS_CLIENT_ID ? 'SET' : 'NOT SET',
    androidClientId: GOOGLE_ANDROID_CLIENT_ID ? 'SET' : 'NOT SET',
    webClientId: GOOGLE_WEB_CLIENT_ID ? 'SET' : 'NOT SET',
  });

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
    webClientId: GOOGLE_WEB_CLIENT_ID,
  });

  return {
    request,
    response,
    promptAsync: async () => {
      console.log('[Google Auth] Starting auth flow...');
      const result = await promptAsync({ showInRecents: true });
      console.log('[Google Auth] Auth result type:', result.type);
      return result;
    },
  };
}

export function getIdTokenFromResponse(response: any): string | null {
  if (response?.type !== 'success') {
    return null;
  }
  
  const idToken = 
    response.params?.id_token ||
    response.authentication?.idToken ||
    (response as any).id_token;
    
  return idToken || null;
}
