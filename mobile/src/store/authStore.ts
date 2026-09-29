import { create } from 'zustand';
import {
  auth,
  signUpWithEmail,
  signInWithEmail,
  logout as firebaseLogout,
  subscribeToAuthState,
  subscribeToUserProfile,
  updateUserProfile,
  updateUserMood,
  signInWithAppleCredential,
  signInWithGoogleCredential,
  type UserProfile,
} from '../lib/firebase';
import type { User } from 'firebase/auth';
import { tokenManager } from '../services/tokenManager';
import { t } from '../i18n';

interface AuthState {
  user: User | null;
  userProfile: UserProfile | null;
  isAuthenticated: boolean;
  /** Hesapsız tur. Sunucuya hiç gidilmez; veri cihazda ve ÖRNEKTİR. */
  isDemo: boolean;
  isLoading: boolean;
  error: string | null;
  profileStatus: 'idle' | 'loading' | 'ready' | 'error';

  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  appleLogin: (response: any) => Promise<void>;
  googleLogin: (response: any) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  updateUser: (updates: Partial<UserProfile>) => Promise<void>;
  updateMood: (mood: string) => Promise<void>;
  initializeAuth: () => () => void;
  retryProfile: () => void;
}

type AuthSession = {
  retryProfile: () => void;
  suspend: () => void;
  resume: () => void;
  dispose: () => void;
};
let activeSession: AuthSession | null = null;
let authActionRevision = 0;

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  userProfile: null,
  isAuthenticated: false,
  isDemo: false,
  isLoading: true,
  error: null,
  profileStatus: 'idle',
  retryProfile: () => activeSession?.retryProfile(),

  initializeAuth: () => {
    activeSession?.dispose();
    let unsubscribeProfile: (() => void) | null = null;
    let unsubscribeAuth: () => void = () => {};
    let profileTimer: ReturnType<typeof setTimeout> | null = null;
    let currentUser: User | null = null;
    let revision = 0;
    let profileAttempt = 0;
    let disposed = false;
    let suspended = false;

    const clearProfileTimer = () => {
      if (profileTimer !== null) clearTimeout(profileTimer);
      profileTimer = null;
    };
    const detachProfile = () => {
      profileAttempt++;
      clearProfileTimer();
      unsubscribeProfile?.();
      unsubscribeProfile = null;
    };
    const startProfile = () => {
      const user = currentUser;
      if (disposed || suspended || !user || get().isDemo || !get().isAuthenticated) return;
      if (get().user?.uid !== user.uid) return;
      detachProfile();
      const current = revision;
      const attempt = profileAttempt;
      const isCurrent = () =>
        !disposed &&
        !suspended &&
        current === revision &&
        attempt === profileAttempt &&
        get().isAuthenticated &&
        !get().isDemo &&
        get().user?.uid === user.uid;
      // Keep an open screen/form mounted during a same-account token refresh.
      const hasReadyProfile = get().profileStatus === 'ready' && get().userProfile !== null;
      set({ profileStatus: hasReadyProfile ? 'ready' : 'loading' });
      let waitingForFirstResponse = true;
      const fail = () => {
        if (!isCurrent()) return;
        waitingForFirstResponse = false;
        clearProfileTimer();
        set({ profileStatus: 'error', isLoading: false });
      };
      profileTimer = setTimeout(() => {
        if (waitingForFirstResponse) fail();
      }, 15000);
      try {
        const unsubscribe = subscribeToUserProfile(
          user.uid,
          (profile) => {
            if (!isCurrent()) return;
            waitingForFirstResponse = false;
            clearProfileTimer();
            if (profile === null) {
              // Keep listening: a signup document may arrive after this snapshot.
              set({ profileStatus: 'error', isLoading: false });
              return;
            }
            set({ userProfile: profile, profileStatus: 'ready', isLoading: false });
          },
          fail
        );
        if (isCurrent()) unsubscribeProfile = unsubscribe;
        else unsubscribe();
      } catch {
        fail();
      }
    };
    const session: AuthSession = {
      retryProfile: startProfile,
      suspend: () => {
        suspended = true;
        revision++;
        currentUser = null;
        detachProfile();
      },
      resume: () => {
        suspended = false;
      },
      dispose: () => {
        if (disposed) return;
        disposed = true;
        revision++;
        currentUser = null;
        unsubscribeAuth();
        detachProfile();
        if (activeSession === session) activeSession = null;
      },
    };
    activeSession = session;
    unsubscribeAuth = subscribeToAuthState(async (firebaseUser) => {
      if (disposed || suspended || (!firebaseUser && get().isDemo)) return;
      const current = ++revision;
      const isCurrent = () => !disposed && !suspended && current === revision;
      detachProfile();
      currentUser = firebaseUser;

      if (!firebaseUser) {
        set({
          user: null,
          userProfile: null,
          isAuthenticated: false,
          isLoading: false,
          profileStatus: 'idle',
        });
        await tokenManager.clearToken();
        return;
      }

      const changedAccount = get().user?.uid !== firebaseUser.uid || get().isDemo;
      if (changedAccount) {
        set({
          user: firebaseUser,
          userProfile: null,
          isAuthenticated: false,
          isDemo: false,
          isLoading: true,
          error: null,
          profileStatus: 'idle',
        });
        await tokenManager.clearToken();
        if (!isCurrent()) return;
      }

      try {
        const idToken = await firebaseUser.getIdToken();
        if (!isCurrent()) return;
        await tokenManager.setToken(idToken);
        if (!isCurrent()) return;
      } catch {
        if (!isCurrent()) return;
        currentUser = null;
        detachProfile();
        set({
          user: null,
          userProfile: null,
          isAuthenticated: false,
          isLoading: false,
          error: t('login_failed'),
          profileStatus: 'idle',
        });
        await tokenManager.clearToken();
        return;
      }

      set({ user: firebaseUser, isAuthenticated: true, isDemo: false, isLoading: false });
      startProfile();
    });

    return session.dispose;
  },

  login: async (email, password) => {
    authActionRevision++;
    activeSession?.resume();
    try {
      set({ isLoading: true, error: null });
      await signInWithEmail(email, password);
    } catch (error: any) {
      const message = getErrorMessage(error);
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  register: async (email, password, displayName) => {
    authActionRevision++;
    activeSession?.resume();
    try {
      set({ isLoading: true, error: null });
      await signUpWithEmail(email, password, displayName || email.split('@')[0]);
    } catch (error: any) {
      const message = getErrorMessage(error);
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    const action = ++authActionRevision;
    const wasDemo = get().isDemo;
    activeSession?.suspend();
    const clearing = tokenManager.clearToken();
    set({
      user: null,
      userProfile: null,
      isAuthenticated: false,
      isDemo: false,
      isLoading: true,
      error: null,
      profileStatus: 'idle',
    });
    try {
      if (!wasDemo) await firebaseLogout();
    } catch (error: any) {
      if (action === authActionRevision) set({ error: getErrorMessage(error) });
    } finally {
      await clearing;
      if (action === authActionRevision) set({ isLoading: false });
    }
  },

  clearError: () => set({ error: null }),

  appleLogin: async (response: {
    identityToken: string;
    nonce: string;
    fullName?: { givenName?: string | null; familyName?: string | null };
  }) => {
    authActionRevision++;
    activeSession?.resume();
    try {
      set({ isLoading: true, error: null });
      console.log('[AuthStore] Apple login with Firebase...');
      await signInWithAppleCredential(response.identityToken, response.nonce, response.fullName);
      console.log('[AuthStore] Apple login successful');
    } catch (error: any) {
      console.error('[AuthStore] Apple login error:', error);
      const message = getErrorMessage(error);
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  googleLogin: async (response: { idToken: string }) => {
    authActionRevision++;
    activeSession?.resume();
    try {
      set({ isLoading: true, error: null });
      console.log('[AuthStore] Google login with Firebase...');
      await signInWithGoogleCredential(response.idToken);
      console.log('[AuthStore] Google login successful');
    } catch (error: any) {
      console.error('[AuthStore] Google login error:', error);
      const message = getErrorMessage(error);
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  updateUser: async (updates) => {
    const { user } = get();
    if (!user) throw new Error(t('no_user_signed_in'));

    try {
      await updateUserProfile(user.uid, updates);
    } catch (error: any) {
      const message = getErrorMessage(error);
      set({ error: message });
      throw error;
    }
  },

  updateMood: async (mood) => {
    const { user } = get();
    if (!user) throw new Error(t('no_user_signed_in'));

    try {
      await updateUserMood(user.uid, mood);
    } catch (error: any) {
      const message = getErrorMessage(error);
      set({ error: message });
      throw error;
    }
  },
}));

function getErrorMessage(error: any): string {
  switch (error.code) {
    case 'auth/email-already-in-use':
      return 'This email is already registered';
    case 'auth/invalid-email':
      return 'Invalid email address';
    case 'auth/operation-not-allowed':
      return 'This sign-in method is not enabled';
    case 'auth/weak-password':
      return 'Password is too weak (min 6 characters)';
    case 'auth/user-disabled':
      return 'This account has been disabled';
    case 'auth/user-not-found':
      return 'No account found with this email';
    case 'auth/wrong-password':
      return 'Incorrect password';
    case 'auth/invalid-credential':
      return 'Invalid email or password';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please try again later';
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection';
    default:
      return error.message || 'An error occurred';
  }
}
