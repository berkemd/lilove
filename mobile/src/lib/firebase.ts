import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  onAuthStateChanged,
  signInWithCredential,
  OAuthProvider,
  GoogleAuthProvider
} from 'firebase/auth';
import type { User, UserCredential } from 'firebase/auth';
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
  orderBy,
  limit,
  addDoc,
  deleteDoc,
  getDocs
} from 'firebase/firestore';
import type { Timestamp } from 'firebase/firestore';
import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra;

const firebaseConfig = {
  apiKey: extra?.firebase?.apiKey,
  authDomain: `${extra?.firebase?.projectId}.firebaseapp.com`,
  projectId: extra?.firebase?.projectId,
  storageBucket: `${extra?.firebase?.projectId}.firebasestorage.app`,
  appId: extra?.firebase?.appId,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);

export interface UserProfile {
  id: string;
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  isPremium: boolean;
  subscriptionTier: string;
  coinBalance: number;
  onboardingCompleted: boolean;
  mood?: string;
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
  createdAt?: any;
  updatedAt?: any;
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
  imageUrl?: string;
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

export async function signInWithAppleCredential(identityToken: string, nonce: string, fullName?: { givenName?: string | null; familyName?: string | null }): Promise<UserCredential> {
  const provider = new OAuthProvider('apple.com');
  const credential = provider.credential({
    idToken: identityToken,
    rawNonce: nonce
  });
  
  const userCredential = await signInWithCredential(auth, credential);
  
  if (fullName?.givenName || fullName?.familyName) {
    const displayName = [fullName.givenName, fullName.familyName].filter(Boolean).join(' ');
    if (displayName && userCredential.user) {
      await updateProfile(userCredential.user, { displayName });
    }
  }
  
  await createUserDocument(userCredential.user, { 
    displayName: fullName?.givenName ? `${fullName.givenName} ${fullName.familyName || ''}`.trim() : undefined 
  });
  
  return userCredential;
}

export async function signInWithGoogleCredential(idToken: string): Promise<UserCredential> {
  const credential = GoogleAuthProvider.credential(idToken);
  const userCredential = await signInWithCredential(auth, credential);
  
  await createUserDocument(userCredential.user);
  
  return userCredential;
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

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  
  if (userSnap.exists()) {
    return { id: userSnap.id, ...userSnap.data() } as UserProfile;
  }
  return null;
}

export async function updateUserProfile(uid: string, data: Partial<UserProfile>): Promise<void> {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    ...data,
    updatedAt: serverTimestamp()
  });
}

export function subscribeToUserProfile(uid: string, callback: (data: UserProfile | null) => void): () => void {
  const userRef = doc(db, 'users', uid);
  return onSnapshot(userRef, (doc) => {
    if (doc.exists()) {
      callback({ id: doc.id, ...doc.data() } as UserProfile);
    } else {
      callback(null);
    }
  });
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

export async function updateConnectionStatus(connectionId: string, status: 'accepted' | 'declined'): Promise<void> {
  const connectionRef = doc(db, 'connections', connectionId);
  await updateDoc(connectionRef, {
    status,
    updatedAt: serverTimestamp()
  });
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

export async function getMatchingUsers(currentUserMood: string, excludeUserId: string, limitCount: number = 10): Promise<UserProfile[]> {
  const usersRef = collection(db, 'users');
  const q = query(
    usersRef,
    where('mood', '==', currentUserMood),
    limit(limitCount + 1)
  );
  
  const snapshot = await getDocs(q);
  const users: UserProfile[] = [];
  snapshot.forEach((doc) => {
    if (doc.id !== excludeUserId) {
      users.push({ id: doc.id, ...doc.data() } as UserProfile);
    }
  });
  
  return users.slice(0, limitCount);
}

export type { User, UserCredential, Timestamp };
export default app;
