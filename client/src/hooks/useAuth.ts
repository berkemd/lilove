import { useFirebaseAuth } from "@/contexts/FirebaseAuthContext";

export function useAuth() {
  const { 
    user: firebaseUser, 
    userProfile, 
    loading, 
    signIn, 
    signUp, 
    signOut,
    signInWithGoogle,
    signInWithApple,
    updateProfile,
    error 
  } = useFirebaseAuth();

  // Map Firebase user to legacy user format for compatibility
  const user = userProfile ? {
    id: userProfile.id,
    email: userProfile.email || '',
    username: userProfile.displayName?.toLowerCase().replace(/\s+/g, '_') || '',
    displayName: userProfile.displayName || '',
    photoURL: userProfile.photoURL,
    isPremium: userProfile.isPremium || false,
    subscriptionTier: userProfile.subscriptionTier || 'free',
    onboardingCompleted: true, // Firebase users are considered onboarded
    currentLevel: userProfile.stats?.level || 1,
    totalXP: userProfile.stats?.totalXP || 0,
    currentStreak: userProfile.stats?.currentStreak || 0,
    settings: userProfile.settings || { theme: 'light', notifications: true, language: 'en' }
  } : null;

  const login = async (email: string, password: string) => {
    await signIn(email, password);
  };

  const register = async (data: { email: string; username: string; password: string; displayName?: string }) => {
    await signUp(data.email, data.password, data.displayName || data.username);
  };

  const logout = async () => {
    await signOut();
  };

  return {
    user,
    isLoading: loading,
    isAuthenticated: !!firebaseUser,
    login,
    register,
    logout,
    signInWithGoogle,
    signInWithApple,
    updateProfile,
    error
  };
}
