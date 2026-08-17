import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';

class AppleAuthService {
  async isAvailable(): Promise<boolean> {
    if (Platform.OS !== 'ios') {
      return false;
    }
    return await AppleAuthentication.isAvailableAsync();
  }

  async signIn(): Promise<{ 
    identityToken: string; 
    nonce: string; 
    fullName?: { givenName?: string | null; familyName?: string | null } 
  }> {
    try {
      console.log('[Apple Auth] Starting sign in with Firebase...');
      
      const rawNonce = this.generateNonce();
      const hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        rawNonce
      );
      
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });

      console.log('[Apple Auth] Credential received:', {
        hasIdentityToken: !!credential.identityToken,
        hasUser: !!credential.user,
        hasEmail: !!credential.email,
        hasFullName: !!credential.fullName,
      });

      if (!credential.identityToken) {
        throw new Error('Apple Sign In did not return an identity token');
      }

      return {
        identityToken: credential.identityToken,
        nonce: rawNonce,
        fullName: credential.fullName ? {
          givenName: credential.fullName.givenName,
          familyName: credential.fullName.familyName,
        } : undefined,
      };
    } catch (e: any) {
      console.error('[Apple Auth] Error:', e);
      if (e.code === 'ERR_REQUEST_CANCELED') {
        throw new Error('Sign in was canceled');
      } else if (e.message) {
        throw new Error(e.message);
      } else {
        throw new Error('Apple Sign In failed');
      }
    }
  }

  private generateNonce(length: number = 32): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const randomValues = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
      randomValues[i] = Math.floor(Math.random() * charset.length);
    }
    for (let i = 0; i < length; i++) {
      result += charset[randomValues[i] % charset.length];
    }
    return result;
  }

  async getCredentialState(user: string) {
    const state = await AppleAuthentication.getCredentialStateAsync(user);
    return state;
  }
}

export const appleAuth = new AppleAuthService();
export default appleAuth;
