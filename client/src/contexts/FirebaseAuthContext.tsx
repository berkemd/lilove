import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import type { User } from 'firebase/auth';
import { 
  auth, 
  subscribeToAuthState, 
  signUpWithEmail, 
  signInWithEmail, 
  signInWithGoogle, 
  signInWithApple,
  logout,
  resetPassword,
  resendVerificationEmail,
  getUserProfile,
  updateUserProfile,
  subscribeToUserProfile,
  handleRedirectResult
} from '@/lib/firebase';

interface UserProfile {
  id: string;
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  isPremium: boolean;
  subscriptionTier: string;
  settings: {
    theme: string;
    notifications: boolean;
    language: string;
  };
  stats: {
    totalGoals: number;
    completedGoals: number;
    currentStreak: number;
    longestStreak: number;
    totalXP: number;
    level: number;
  };
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  error: string | null;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function FirebaseAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    handleRedirectResult().catch(console.error);
    
    const unsubscribeAuth = subscribeToAuthState((firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    if (user) {
      unsubscribeProfile = subscribeToUserProfile(user.uid, (profile) => {
        if (profile) {
          setUserProfile(profile as UserProfile);
        } else {
          // Handle missing profile by creating a default one
          setUserProfile({
            id: user.uid,
            uid: user.uid,
            email: user.email || '',
            displayName: user.displayName || user.email?.split('@')[0] || 'User',
            photoURL: user.photoURL || undefined,
            isPremium: false,
            subscriptionTier: 'free',
            settings: { theme: 'light', notifications: true, language: 'en' },
            stats: { totalGoals: 0, completedGoals: 0, currentStreak: 0, longestStreak: 0, totalXP: 0, level: 1 }
          });
        }
        setLoading(false);
      });
    }

    return () => {
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
    };
  }, [user]);

  const handleError = (err: any) => {
    console.error('Auth error:', err);
    let message = 'An error occurred';
    
    switch (err.code) {
      case 'auth/email-already-in-use':
        message = 'This email is already registered';
        break;
      case 'auth/invalid-email':
        message = 'Invalid email address';
        break;
      case 'auth/operation-not-allowed':
        message = 'This sign-in method is not enabled';
        break;
      case 'auth/weak-password':
        message = 'Password is too weak';
        break;
      case 'auth/user-disabled':
        message = 'This account has been disabled';
        break;
      case 'auth/user-not-found':
        message = 'No account found with this email';
        break;
      case 'auth/wrong-password':
        message = 'Incorrect password';
        break;
      case 'auth/invalid-credential':
        message = 'Invalid email or password';
        break;
      case 'auth/popup-closed-by-user':
        message = '';
        break;
      case 'auth/cancelled-popup-request':
        message = '';
        break;
      case 'auth/unauthorized-domain':
        message = 'This domain is not authorized for sign-in. Please try from the main website or contact support.';
        break;
      case 'auth/popup-blocked':
        message = 'Popup was blocked. Please allow popups and try again.';
        break;
      case 'auth/account-exists-with-different-credential':
        message = 'An account already exists with the same email but different sign-in credentials.';
        break;
      default:
        message = err.message || 'An error occurred';
    }
    
    if (message) {
      setError(message);
    }
    
    const errorWithCode = new Error(message) as any;
    errorWithCode.code = err.code;
    throw errorWithCode;
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    try {
      setError(null);
      setLoading(true);
      await signUpWithEmail(email, password, displayName);
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setError(null);
      setLoading(true);
      await signInWithEmail(email, password);
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setError(null);
      setLoading(true);
      await signInWithGoogle();
    } catch (err: any) {
      console.log('[FirebaseAuthContext] Google sign-in error caught:', err.code, err.message);
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    try {
      setError(null);
      setLoading(true);
      await signInWithApple();
    } catch (err: any) {
      console.log('[FirebaseAuthContext] Apple sign-in error caught:', err.code, err.message);
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      setError(null);
      await logout();
      setUserProfile(null);
    } catch (err) {
      handleError(err);
    }
  };

  const handleResetPassword = async (email: string) => {
    try {
      setError(null);
      await resetPassword(email);
    } catch (err) {
      handleError(err);
    }
  };

  const handleResendVerification = async () => {
    try {
      setError(null);
      await resendVerificationEmail();
    } catch (err) {
      handleError(err);
    }
  };

  const handleUpdateProfile = async (data: Partial<UserProfile>) => {
    if (!user) throw new Error('No user signed in');
    try {
      setError(null);
      await updateUserProfile(user.uid, data);
    } catch (err) {
      handleError(err);
    }
  };

  const clearError = useCallback(() => setError(null), []);

  const value: AuthContextType = {
    user,
    userProfile,
    loading,
    error,
    signUp,
    signIn,
    signInWithGoogle: handleGoogleSignIn,
    signInWithApple: handleAppleSignIn,
    signOut: handleSignOut,
    resetPassword: handleResetPassword,
    resendVerificationEmail: handleResendVerification,
    updateProfile: handleUpdateProfile,
    clearError
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useFirebaseAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useFirebaseAuth must be used within a FirebaseAuthProvider');
  }
  return context;
}

export default AuthContext;
