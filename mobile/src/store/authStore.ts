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
  type UserProfile
} from '../lib/firebase';
import type { User } from 'firebase/auth';
import { tokenManager } from '../services/tokenManager';

interface AuthState {
  user: User | null;
  userProfile: UserProfile | null;
  isAuthenticated: boolean;
  /** Hesapsız tur. Sunucuya hiç gidilmez; veri cihazda ve ÖRNEKTİR. */
  isDemo: boolean;
  isLoading: boolean;
  error: string | null;
  
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  appleLogin: (response: any) => Promise<void>;
  googleLogin: (response: any) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  updateUser: (updates: Partial<UserProfile>) => Promise<void>;
  updateMood: (mood: string) => Promise<void>;
  initializeAuth: () => () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  userProfile: null,
  isAuthenticated: false,
  isDemo: false,
  isLoading: true,
  error: null,

  initializeAuth: () => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = subscribeToAuthState(async (firebaseUser) => {
      console.log('[AuthStore] Auth state changed:', firebaseUser?.email || 'null');
      
      if (firebaseUser) {
        set({ user: firebaseUser, isAuthenticated: true });
        
        try {
          const idToken = await firebaseUser.getIdToken();
          await tokenManager.setToken(idToken);
          console.log('[AuthStore] Firebase ID token saved to tokenManager');
        } catch (error) {
          console.error('[AuthStore] Failed to get Firebase ID token:', error);
        }
        
        unsubscribeProfile = subscribeToUserProfile(firebaseUser.uid, (profile) => {
          console.log('[AuthStore] Profile updated:', profile?.displayName || 'null');
          
          if (profile) {
            set({ userProfile: profile, isLoading: false });
          } else {
            set({ 
              userProfile: {
                id: firebaseUser.uid,
                uid: firebaseUser.uid,
                email: firebaseUser.email || '',
                displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
                photoURL: firebaseUser.photoURL || undefined,
                isPremium: false,
                subscriptionTier: 'free',
                coinBalance: 100,
                onboardingCompleted: false,
                settings: { theme: 'light', notifications: true, language: 'en' },
                stats: { totalGoals: 0, completedGoals: 0, currentStreak: 0, longestStreak: 0, totalXP: 0, level: 1 }
              },
              isLoading: false 
            });
          }
        });
      } else {
        // DEMO OTURUMU FIREBASE'E AIT DEGIL.
        // Firebase "kullanici yok" dedigi anda burasi state'i sifirliyor
        // ve jetonu siliyordu; dinleyici gec cozulunce hesapsiz tur
        // acilir acilmaz kapaniyordu. Demo, Firebase'in bilgisi disinda.
        if (get().isDemo) return;
        if (unsubscribeProfile) {
          unsubscribeProfile();
          unsubscribeProfile = null;
        }
        await tokenManager.clearToken();
        set({ 
          user: null, 
          userProfile: null, 
          isAuthenticated: false, 
          isLoading: false 
        });
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
    };
  },

  login: async (email, password) => {
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
    console.log('[AuthStore] Logout initiated...');
    // DEMO TURUNDAN ÇIKIŞ FIREBASE'E GİTMEZ.
    // Demo oturumunda Firebase kullanıcısı hiç yok; `firebaseLogout()`
    // çağırmak orada bir hata üretir ve kullanıcı giriş ekranına
    // dönemez. Önce demo dalı.
    if (get().isDemo) {
      await tokenManager.clearToken();
      set({ user: null, userProfile: null, isAuthenticated: false,
            isDemo: false, isLoading: false, error: null });
      return;
    }
    try {
      await firebaseLogout();
      console.log('[AuthStore] Logout complete');
    } catch (error: any) {
      console.error('[AuthStore] Logout error:', error);
      set({ 
        user: null, 
        userProfile: null,
        isAuthenticated: false, 
        isLoading: false 
      });
    }
  },

  clearError: () => set({ error: null }),

  appleLogin: async (response: { identityToken: string; nonce: string; fullName?: { givenName?: string | null; familyName?: string | null } }) => {
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
    if (!user) throw new Error('No user signed in');
    
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
    if (!user) throw new Error('No user signed in');
    
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
