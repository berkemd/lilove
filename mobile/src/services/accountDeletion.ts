import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import {
  EmailAuthProvider,
  GoogleAuthProvider,
  OAuthProvider,
  reauthenticateWithCredential,
  type User,
} from 'firebase/auth';
import { api } from '../lib/api';
import { AccountDeletion, type DeletionSession, type DeletionJob } from '../lib/accountDeletion';
import { captureAccountSession, useAuthStore } from '../store/authStore';
import { appleAuth } from './appleAuth';
import { getIdTokenFromResponse } from './googleAuth';

const STORAGE_KEY = 'accountDeletionRecoveryV1';
const ENDPOINT = '/api/account/deletion-v2';
type NativeSession = DeletionSession & { user: User };
type Reply = { deletion: DeletionJob; receiptExpiresAt?: string };

export function deletionProvider(user: Pick<User, 'providerData'> | null) {
  const providers = user?.providerData.map((provider) => provider.providerId) || [];
  if (providers.includes('apple.com')) return 'apple.com';
  if (providers.includes('google.com')) return 'google.com';
  if (providers.includes('password')) return 'password';
  return null;
}

function requireCurrent(session: DeletionSession) {
  if (!session.isCurrent())
    throw Object.assign(new Error('Account changed'), { code: 'account_changed' });
}

export async function reauthenticateDeletion(
  session: DeletionSession,
  options: { password: string; google: () => Promise<unknown> }
) {
  requireCurrent(session);
  const user = (session as NativeSession).user;
  let credential;
  let appleAuthorizationCode: string | undefined;
  switch (deletionProvider(user)) {
    case 'apple.com': {
      if (Platform.OS !== 'ios')
        throw Object.assign(new Error('Apple unavailable'), { code: 'deletion_unavailable' });
      const result = await appleAuth.signIn();
      requireCurrent(session);
      if (!result.authorizationCode) {
        throw Object.assign(new Error('Apple authorization code required'), {
          code: 'apple_reauthentication_required',
        });
      }
      credential = new OAuthProvider('apple.com').credential({
        idToken: result.identityToken,
        rawNonce: result.nonce,
      });
      appleAuthorizationCode = result.authorizationCode;
      break;
    }
    case 'google.com': {
      const result = await options.google();
      requireCurrent(session);
      const idToken = getIdTokenFromResponse(result);
      if (!idToken) {
        const cancelled = ['cancel', 'dismiss'].includes((result as { type?: string })?.type || '');
        throw Object.assign(new Error('Google confirmation did not complete'), {
          code: cancelled ? 'ERR_REQUEST_CANCELED' : 'deletion_reauth_failed',
        });
      }
      credential = GoogleAuthProvider.credential(idToken);
      break;
    }
    case 'password': {
      if (!user.email || !options.password)
        throw Object.assign(new Error('Password required'), { code: 'deletion_reauth_failed' });
      credential = EmailAuthProvider.credential(user.email, options.password);
      break;
    }
    default:
      throw Object.assign(new Error('Unsupported provider'), { code: 'deletion_reauth_failed' });
  }
  // Reauthentication rejects a different provider account; signIn would switch users.
  const result = await reauthenticateWithCredential(user, credential);
  requireCurrent(session);
  if (result.user.uid !== session.uid)
    throw Object.assign(new Error('Account changed'), { code: 'account_changed' });
  const token = await user.getIdToken(true);
  requireCurrent(session);
  return { token, appleAuthorizationCode };
}

export const accountDeletion = new AccountDeletion({
  read: () => SecureStore.getItemAsync(STORAGE_KEY),
  write: (value) => SecureStore.setItemAsync(STORAGE_KEY, value),
  session: () => {
    const session = captureAccountSession();
    return {
      ...session,
      finish: async () => {
        if (session.isCurrent()) await useAuthStore.getState().logout();
      },
    };
  },
  uuid: () => Crypto.randomUUID(),
  receipt: () =>
    Array.from(Crypto.getRandomBytes(32), (byte) => byte.toString(16).padStart(2, '0')).join(''),
  capability: () => api.get(`${ENDPOINT}/capability`, { authorizationToken: '', maxRetries: 0 }),
  request: (record, authorization) =>
    api.post<Reply>(
      `${ENDPOINT}/request`,
      {
        idempotencyKey: record.idempotencyKey,
        confirmation: 'DELETE',
        statusReceipt: record.statusReceipt,
        ...(authorization.appleAuthorizationCode
          ? { appleAuthorizationCode: authorization.appleAuthorizationCode }
          : {}),
      },
      { authorizationToken: authorization.token }
    ),
  status: (record) =>
    api.get(`${ENDPOINT}/status`, {
      authorizationToken: '',
      maxRetries: 0,
      headers: { 'X-Deletion-Receipt': record.statusReceipt },
    }),
  cancel: (record, authorization) =>
    api.post<Reply>(
      `${ENDPOINT}/cancel`,
      {
        deletionId: record.deletion!.id,
      },
      { authorizationToken: authorization.token }
    ),
});
