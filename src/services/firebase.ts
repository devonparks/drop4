import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInAnonymously, GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

// Firebase config — will be populated with real values
const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_PROJECT.firebaseapp.com',
  projectId: 'YOUR_PROJECT',
  storageBucket: 'YOUR_PROJECT.appspot.com',
  messagingSenderId: 'YOUR_SENDER_ID',
  appId: 'YOUR_APP_ID',
  measurementId: 'YOUR_MEASUREMENT_ID',
};

// Initialize Firebase (singleton)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

// ============ AUTH ============

export async function signInAsGuest() {
  try {
    const result = await signInAnonymously(auth);
    return result.user;
  } catch (error) {
    console.warn('Guest sign-in failed:', error);
    return null;
  }
}

export function getCurrentUser() {
  return auth.currentUser;
}

export function onAuthChange(callback: (user: any) => void) {
  return auth.onAuthStateChanged(callback);
}

// ============ USER PROFILE ============

export interface UserProfile {
  displayName: string;
  avatarId: string;
  level: number;
  xp: number;
  coins: number;
  gems: number;
  stats: {
    wins: number;
    losses: number;
    draws: number;
    streak: number;
    bestStreak: number;
    gamesPlayed: number;
  };
  equipped: {
    board: string;
    pieces: string;
    dropEffect: string;
    winAnimation: string;
  };
  owned: {
    boards: string[];
    pieces: string[];
    dropEffects: string[];
    winAnimations: string[];
  };
  createdAt: any;
  lastSeen: any;
}

const DEFAULT_PROFILE: Omit<UserProfile, 'createdAt' | 'lastSeen'> = {
  displayName: 'Player',
  avatarId: 'default',
  level: 1,
  xp: 0,
  coins: 500,
  gems: 0,
  stats: {
    wins: 0,
    losses: 0,
    draws: 0,
    streak: 0,
    bestStreak: 0,
    gamesPlayed: 0,
  },
  equipped: {
    board: 'default',
    pieces: 'classic',
    dropEffect: 'none',
    winAnimation: 'basic',
  },
  owned: {
    boards: ['default'],
    pieces: ['classic'],
    dropEffects: ['none'],
    winAnimations: ['basic'],
  },
};

export async function getOrCreateProfile(uid: string): Promise<UserProfile> {
  try {
    const docRef = doc(db, 'drop4Users', uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      await updateDoc(docRef, { lastSeen: serverTimestamp() });
      return docSnap.data() as UserProfile;
    }

    // Create new profile
    const profile = {
      ...DEFAULT_PROFILE,
      createdAt: serverTimestamp(),
      lastSeen: serverTimestamp(),
    };
    await setDoc(docRef, profile);
    return profile as UserProfile;
  } catch (error) {
    console.warn('Profile fetch failed:', error);
    return { ...DEFAULT_PROFILE, createdAt: null, lastSeen: null };
  }
}

export async function updateProfile(uid: string, updates: Partial<UserProfile>) {
  try {
    const docRef = doc(db, 'drop4Users', uid);
    await updateDoc(docRef, { ...updates, lastSeen: serverTimestamp() });
  } catch (error) {
    console.warn('Profile update failed:', error);
  }
}

export async function recordGameResult(uid: string, result: 'win' | 'loss' | 'draw', coinsEarned: number) {
  try {
    const docRef = doc(db, 'drop4Users', uid);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return;

    const profile = docSnap.data() as UserProfile;
    const stats = { ...profile.stats };
    stats.gamesPlayed++;

    if (result === 'win') {
      stats.wins++;
      stats.streak++;
      if (stats.streak > stats.bestStreak) stats.bestStreak = stats.streak;
    } else if (result === 'loss') {
      stats.losses++;
      stats.streak = 0;
    } else {
      stats.draws++;
    }

    await updateDoc(docRef, {
      stats,
      coins: profile.coins + coinsEarned,
      lastSeen: serverTimestamp(),
    });
  } catch (error) {
    console.warn('Record game result failed:', error);
  }
}

export { auth, db };
