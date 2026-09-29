import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';
import { t } from '../i18n';

class AppleAuthService {
  async isAvailable(): Promise<boolean> {
    if (Platform.OS !== 'ios') {
      return false;
    }
    return await AppleAuthentication.isAvailableAsync();
  }

  async signIn(): Promise<{
    identityToken: string;
    authorizationCode?: string;
    nonce: string;
    fullName?: { givenName?: string | null; familyName?: string | null };
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
        throw new Error(t('apple_sign_in_did_not_return_an_identity_tok'));
      }

      return {
        identityToken: credential.identityToken,
        authorizationCode: credential.authorizationCode || undefined,
        nonce: rawNonce,
        fullName: credential.fullName
          ? {
              givenName: credential.fullName.givenName,
              familyName: credential.fullName.familyName,
            }
          : undefined,
      };
    } catch (e: any) {
      if (e.code === 'ERR_REQUEST_CANCELED') {
        throw Object.assign(new Error(t('sign_in_was_canceled')), { code: 'ERR_REQUEST_CANCELED' });
      } else if (e.message) {
        throw new Error(e.message);
      } else {
        throw new Error(t('apple_sign_in_failed_2'));
      }
    }
  }

  private generateNonce(length: number = 32): string {
    return Array.from(Crypto.getRandomBytes(length), (byte) =>
      byte.toString(16).padStart(2, '0')
    ).join('');
  }

  async getCredentialState(user: string) {
    const state = await AppleAuthentication.getCredentialStateAsync(user);
    return state;
  }
}

export const appleAuth = new AppleAuthService();
export default appleAuth;
