import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getAuth, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithCustomToken as firebaseSignInWithCustomToken,
  GoogleAuthProvider,
  OAuthProvider,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  onAuthStateChanged
} from "firebase/auth";
import type { User, UserCredential } from "firebase/auth";
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  onSnapshot,
  serverTimestamp,
  Timestamp,
  addDoc,
  deleteDoc,
  orderBy,
  limit
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebasestorage.app`,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);

const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');

const appleProvider = new OAuthProvider('apple.com');
appleProvider.addScope('email');
appleProvider.addScope('name');

export async function signUpWithEmail(email: string, password: string, displayName: string): Promise<UserCredential> {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  
  if (userCredential.user) {
    await updateProfile(userCredential.user, { displayName });
    await sendEmailVerification(userCredential.user);
    
    await createUserDocument(userCredential.user, { displayName });
  }
  
  return userCredential;
}

export async function signInWithEmail(email: string, password: string): Promise<UserCredential> {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function signInWithGoogle(): Promise<UserCredential> {
  const result = await signInWithPopup(auth, googleProvider);
  await createUserDocument(result.user);
  return result;
}

export async function signInWithApple(): Promise<UserCredential> {
  const result = await signInWithPopup(auth, appleProvider);
  await createUserDocument(result.user);
  return result;
}

export async function handleRedirectResult(): Promise<UserCredential | null> {
  const result = await getRedirectResult(auth);
  if (result) {
    await createUserDocument(result.user);
  }
  return result;
}

/**
 * Sign in with a custom token from server-side OAuth
 * This bridges server OAuth (Google/Apple) with Firebase client auth
 */
export async function signInWithCustomToken(customToken: string): Promise<UserCredential> {
  const result = await firebaseSignInWithCustomToken(auth, customToken);
  await createUserDocument(result.user);
  console.log('[Firebase] Custom token sign-in successful for:', result.user.uid);
  return result;
}

export async function logout(): Promise<void> {
  return signOut(auth);
}

export async function resetPassword(email: string): Promise<void> {
  return sendPasswordResetEmail(auth, email);
}

export async function resendVerificationEmail(): Promise<void> {
  if (auth.currentUser) {
    return sendEmailVerification(auth.currentUser);
  }
  throw new Error('No user signed in');
}

async function createUserDocument(user: User, additionalData?: Record<string, any>): Promise<void> {
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);
  
  if (!userSnap.exists()) {
    const { displayName, email, photoURL, uid } = user;
    
    await setDoc(userRef, {
      uid,
      email,
      displayName: displayName || additionalData?.displayName || email?.split('@')[0],
      photoURL,
      isPremium: false,
      subscriptionTier: 'free',
      coinBalance: 100,
      onboardingCompleted: false,
      mood: 'neutral',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      settings: {
        theme: 'light',
        notifications: true,
        language: 'en'
      },
      stats: {
        totalGoals: 0,
        completedGoals: 0,
        currentStreak: 0,
        longestStreak: 0,
        totalXP: 0,
        level: 1
      }
    });
  } else {
    await updateDoc(userRef, {
      lastLoginAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  }
}

export function subscribeToAuthState(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}

export async function getUserProfile(uid: string) {
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  
  if (userSnap.exists()) {
    return { id: userSnap.id, ...userSnap.data() };
  }
  return null;
}

export async function updateUserProfile(uid: string, data: Record<string, any>) {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    ...data,
    updatedAt: serverTimestamp()
  });
}

export function subscribeToUserProfile(uid: string, callback: (data: any) => void): () => void {
  const userRef = doc(db, 'users', uid);
  return onSnapshot(userRef, (doc) => {
    if (doc.exists()) {
      callback({ id: doc.id, ...doc.data() });
    } else {
      callback(null);
    }
  });
}

export interface Goal {
  id: string;
  userId: string;
  title: string;
  description?: string;
  category: string;
  targetDate?: any;
  progress: number;
  status: 'active' | 'completed' | 'paused';
  priority: 'low' | 'medium' | 'high';
  createdAt: any;
  updatedAt: any;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  content: string;
  type: 'text' | 'voice' | 'image';
  voiceUrl?: string;
  duration?: number;
  read: boolean;
  createdAt: any;
}

export interface Connection {
  id: string;
  userId: string;
  connectedUserId: string;
  status: 'pending' | 'accepted' | 'declined';
  matchScore?: number;
  createdAt: any;
  updatedAt: any;
}

export async function createGoal(userId: string, goal: Omit<Goal, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const goalsRef = collection(db, 'goals');
  const docRef = await addDoc(goalsRef, {
    ...goal,
    userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return docRef.id;
}

export async function updateGoal(goalId: string, data: Partial<Goal>): Promise<void> {
  const goalRef = doc(db, 'goals', goalId);
  await updateDoc(goalRef, {
    ...data,
    updatedAt: serverTimestamp()
  });
}

export async function deleteGoal(goalId: string): Promise<void> {
  const goalRef = doc(db, 'goals', goalId);
  await deleteDoc(goalRef);
}

export function subscribeToGoals(userId: string, callback: (goals: Goal[]) => void): () => void {
  const goalsRef = collection(db, 'goals');
  const q = query(goalsRef, where('userId', '==', userId), orderBy('createdAt', 'desc'));
  
  return onSnapshot(q, (snapshot) => {
    const goals: Goal[] = [];
    snapshot.forEach((doc) => {
      goals.push({ id: doc.id, ...doc.data() } as Goal);
    });
    callback(goals);
  });
}

export async function sendMessage(message: Omit<Message, 'id' | 'createdAt'>): Promise<string> {
  const messagesRef = collection(db, 'messages');
  const docRef = await addDoc(messagesRef, {
    ...message,
    createdAt: serverTimestamp()
  });
  return docRef.id;
}

export function subscribeToMessages(conversationId: string, callback: (messages: Message[]) => void): () => void {
  const messagesRef = collection(db, 'messages');
  const q = query(
    messagesRef, 
    where('conversationId', '==', conversationId),
    orderBy('createdAt', 'asc'),
    limit(100)
  );
  
  return onSnapshot(q, (snapshot) => {
    const messages: Message[] = [];
    snapshot.forEach((doc) => {
      messages.push({ id: doc.id, ...doc.data() } as Message);
    });
    callback(messages);
  });
}

export async function markMessageAsRead(messageId: string): Promise<void> {
  const messageRef = doc(db, 'messages', messageId);
  await updateDoc(messageRef, { read: true });
}

export async function createConnection(userId: string, connectedUserId: string, matchScore?: number): Promise<string> {
  const connectionsRef = collection(db, 'connections');
  const docRef = await addDoc(connectionsRef, {
    userId,
    connectedUserId,
    status: 'pending',
    matchScore,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return docRef.id;
}

export function subscribeToConnections(userId: string, callback: (connections: Connection[]) => void): () => void {
  const connectionsRef = collection(db, 'connections');
  const q = query(
    connectionsRef,
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  
  return onSnapshot(q, (snapshot) => {
    const connections: Connection[] = [];
    snapshot.forEach((doc) => {
      connections.push({ id: doc.id, ...doc.data() } as Connection);
    });
    callback(connections);
  });
}

export async function updateUserMood(uid: string, mood: string): Promise<void> {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    mood,
    updatedAt: serverTimestamp()
  });
}

export { onAuthStateChanged, Timestamp };
export type { User, UserCredential };
export default app;
