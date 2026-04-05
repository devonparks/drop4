import { auth, db, getCurrentUser } from './firebase';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  getDocs,
  getDoc,
  setDoc,
  orderBy,
  limit,
  Unsubscribe,
} from 'firebase/firestore';
import type { Friend, FriendRequest } from '../stores/friendsStore';
import type { UserProfile } from './firebase';

// ============ COLLECTIONS ============

const FRIEND_REQUESTS = 'friendRequests';
const FRIENDS_LIST = 'friendsLists';
const USERS = 'drop4Users';
const MATCH_INVITES = 'matchInvites';

// ============ HELPERS ============

function ensureUid(): string | null {
  return getCurrentUser()?.uid ?? null;
}

// ============ FRIEND REQUESTS ============

/**
 * Sends a friend request to another user by UID.
 */
export async function sendFriendRequest(toUid: string): Promise<string | null> {
  try {
    const uid = ensureUid();
    if (!uid) return null;
    if (uid === toUid) return null;

    // Check if already friends
    const friendsDoc = await getDoc(doc(db, FRIENDS_LIST, uid));
    if (friendsDoc.exists()) {
      const data = friendsDoc.data();
      if (data.friends?.includes(toUid)) {
        console.warn('sendFriendRequest: already friends');
        return null;
      }
    }

    // Check if a request already exists between these two users
    const existingQ = query(
      collection(db, FRIEND_REQUESTS),
      where('fromUid', '==', uid),
      where('toUid', '==', toUid),
      where('status', '==', 'pending')
    );
    const existingSnap = await getDocs(existingQ);
    if (!existingSnap.empty) {
      console.warn('sendFriendRequest: request already pending');
      return null;
    }

    // Get both user profiles for names
    const myProfile = await getDoc(doc(db, USERS, uid));
    const theirProfile = await getDoc(doc(db, USERS, toUid));
    if (!theirProfile.exists()) {
      console.warn('sendFriendRequest: target user not found');
      return null;
    }

    const myName = myProfile.exists() ? (myProfile.data() as UserProfile).displayName : 'Player';
    const theirName = (theirProfile.data() as UserProfile).displayName;

    const requestDoc = await addDoc(collection(db, FRIEND_REQUESTS), {
      fromUid: uid,
      fromName: myName,
      toUid,
      toName: theirName,
      status: 'pending',
      timestamp: serverTimestamp(),
    });

    return requestDoc.id;
  } catch (error) {
    console.warn('sendFriendRequest failed:', error);
    return null;
  }
}

/**
 * Real-time listener for incoming friend requests.
 */
export function listenForFriendRequests(
  callback: (requests: FriendRequest[]) => void
): Unsubscribe | null {
  try {
    const uid = ensureUid();
    if (!uid) return null;

    const q = query(
      collection(db, FRIEND_REQUESTS),
      where('toUid', '==', uid),
      where('status', '==', 'pending'),
      orderBy('timestamp', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const requests: FriendRequest[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        timestamp: d.data().timestamp?.toMillis?.() ?? Date.now(),
      })) as FriendRequest[];
      callback(requests);
    });
  } catch (error) {
    console.warn('listenForFriendRequests failed:', error);
    return null;
  }
}

/**
 * Real-time listener for outgoing friend requests.
 */
export function listenForOutgoingRequests(
  callback: (requests: FriendRequest[]) => void
): Unsubscribe | null {
  try {
    const uid = ensureUid();
    if (!uid) return null;

    const q = query(
      collection(db, FRIEND_REQUESTS),
      where('fromUid', '==', uid),
      where('status', '==', 'pending'),
      orderBy('timestamp', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const requests: FriendRequest[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        timestamp: d.data().timestamp?.toMillis?.() ?? Date.now(),
      })) as FriendRequest[];
      callback(requests);
    });
  } catch (error) {
    console.warn('listenForOutgoingRequests failed:', error);
    return null;
  }
}

/**
 * Accepts a friend request: updates status and adds to both users' friend lists.
 */
export async function acceptFriendRequest(requestId: string): Promise<boolean> {
  try {
    const uid = ensureUid();
    if (!uid) return false;

    const reqRef = doc(db, FRIEND_REQUESTS, requestId);
    const reqSnap = await getDoc(reqRef);
    if (!reqSnap.exists()) return false;

    const request = reqSnap.data();
    const fromUid = request.fromUid;

    // Update request status
    await updateDoc(reqRef, { status: 'accepted' });

    // Add to both friend lists
    await addToFriendsList(uid, fromUid);
    await addToFriendsList(fromUid, uid);

    return true;
  } catch (error) {
    console.warn('acceptFriendRequest failed:', error);
    return false;
  }
}

/**
 * Declines a friend request.
 */
export async function declineFriendRequest(requestId: string): Promise<boolean> {
  try {
    const reqRef = doc(db, FRIEND_REQUESTS, requestId);
    await updateDoc(reqRef, { status: 'declined' });
    return true;
  } catch (error) {
    console.warn('declineFriendRequest failed:', error);
    return false;
  }
}

/**
 * Cancels an outgoing friend request.
 */
export async function cancelFriendRequest(requestId: string): Promise<boolean> {
  try {
    const reqRef = doc(db, FRIEND_REQUESTS, requestId);
    await deleteDoc(reqRef);
    return true;
  } catch (error) {
    console.warn('cancelFriendRequest failed:', error);
    return false;
  }
}

// ============ FRIEND LIST MANAGEMENT ============

/**
 * Adds a friend UID to a user's friend list document.
 */
async function addToFriendsList(userUid: string, friendUid: string): Promise<void> {
  try {
    const friendsRef = doc(db, FRIENDS_LIST, userUid);
    const friendsSnap = await getDoc(friendsRef);

    if (friendsSnap.exists()) {
      const data = friendsSnap.data();
      const friends: string[] = data.friends ?? [];
      if (!friends.includes(friendUid)) {
        await updateDoc(friendsRef, { friends: [...friends, friendUid] });
      }
    } else {
      await setDoc(friendsRef, { friends: [friendUid] });
    }
  } catch (error) {
    console.warn('addToFriendsList failed:', error);
  }
}

/**
 * Removes a friend from both users' friend lists.
 */
export async function removeFriend(friendUid: string): Promise<boolean> {
  try {
    const uid = ensureUid();
    if (!uid) return false;

    // Remove from my list
    const myRef = doc(db, FRIENDS_LIST, uid);
    const mySnap = await getDoc(myRef);
    if (mySnap.exists()) {
      const data = mySnap.data();
      const friends: string[] = (data.friends ?? []).filter((f: string) => f !== friendUid);
      await updateDoc(myRef, { friends });
    }

    // Remove from their list
    const theirRef = doc(db, FRIENDS_LIST, friendUid);
    const theirSnap = await getDoc(theirRef);
    if (theirSnap.exists()) {
      const data = theirSnap.data();
      const friends: string[] = (data.friends ?? []).filter((f: string) => f !== uid);
      await updateDoc(theirRef, { friends });
    }

    return true;
  } catch (error) {
    console.warn('removeFriend failed:', error);
    return false;
  }
}

/**
 * Listens for changes to the current user's friend list and resolves full profiles.
 */
export function listenForFriends(
  callback: (friends: Friend[]) => void
): Unsubscribe | null {
  try {
    const uid = ensureUid();
    if (!uid) return null;

    const friendsRef = doc(db, FRIENDS_LIST, uid);

    return onSnapshot(friendsRef, async (snapshot) => {
      if (!snapshot.exists()) {
        callback([]);
        return;
      }

      const data = snapshot.data();
      const friendUids: string[] = data.friends ?? [];

      // Resolve each friend's profile
      const friendProfiles: Friend[] = [];
      for (const fUid of friendUids) {
        try {
          const profileSnap = await getDoc(doc(db, USERS, fUid));
          if (profileSnap.exists()) {
            const profile = profileSnap.data() as UserProfile;
            const lastSeenMs = profile.lastSeen?.toMillis?.() ?? 0;
            const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;

            friendProfiles.push({
              uid: fUid,
              displayName: profile.displayName ?? 'Player',
              avatarId: profile.avatarId ?? 'default',
              level: profile.level ?? 1,
              elo: (profile as any).elo ?? 500,
              tier: (profile as any).tier ?? 'bronze',
              isOnline: lastSeenMs > fiveMinutesAgo,
              lastSeen: lastSeenMs,
            });
          }
        } catch {
          // Skip friend if profile lookup fails
        }
      }

      // Sort online friends first
      friendProfiles.sort((a, b) => {
        if (a.isOnline && !b.isOnline) return -1;
        if (!a.isOnline && b.isOnline) return 1;
        return b.lastSeen - a.lastSeen;
      });

      callback(friendProfiles);
    });
  } catch (error) {
    console.warn('listenForFriends failed:', error);
    return null;
  }
}

/**
 * Listens for online status changes of a list of friend UIDs.
 */
export function listenForFriendStatuses(
  friendUids: string[],
  callback: (statuses: Record<string, boolean>) => void
): Unsubscribe[] {
  const unsubscribes: Unsubscribe[] = [];

  for (const fUid of friendUids) {
    const userRef = doc(db, USERS, fUid);
    const unsub = onSnapshot(userRef, (snapshot) => {
      if (!snapshot.exists()) return;
      const data = snapshot.data() as UserProfile;
      const lastSeenMs = data.lastSeen?.toMillis?.() ?? 0;
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      const isOnline = lastSeenMs > fiveMinutesAgo;

      callback({ [fUid]: isOnline });
    });
    unsubscribes.push(unsub);
  }

  return unsubscribes;
}

// ============ SEARCH ============

/**
 * Searches for players by display name (case-insensitive prefix match).
 * Returns up to 10 results.
 */
export async function searchPlayers(
  searchTerm: string
): Promise<{ uid: string; displayName: string; level: number; elo: number }[]> {
  try {
    if (!searchTerm || searchTerm.length < 2) return [];

    const uid = ensureUid();

    // Firestore doesn't support case-insensitive search natively,
    // so we query with a range on displayName
    const q = query(
      collection(db, USERS),
      where('displayName', '>=', searchTerm),
      where('displayName', '<=', searchTerm + '\uf8ff'),
      limit(10)
    );

    const snapshot = await getDocs(q);
    const results: { uid: string; displayName: string; level: number; elo: number }[] = [];

    for (const d of snapshot.docs) {
      if (d.id === uid) continue; // Exclude self
      const data = d.data() as UserProfile;
      results.push({
        uid: d.id,
        displayName: data.displayName ?? 'Player',
        level: data.level ?? 1,
        elo: (data as any).elo ?? 500,
      });
    }

    return results;
  } catch (error) {
    console.warn('searchPlayers failed:', error);
    return [];
  }
}

// ============ MATCH INVITES ============

export interface MatchInvite {
  id: string;
  fromUid: string;
  fromName: string;
  toUid: string;
  mode: 'casual' | 'ranked';
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  timestamp: number;
}

/**
 * Creates a match invite for a friend.
 */
export async function inviteToMatch(
  friendUid: string,
  mode: 'casual' | 'ranked'
): Promise<string | null> {
  try {
    const uid = ensureUid();
    if (!uid) return null;

    const myProfile = await getDoc(doc(db, USERS, uid));
    const myName = myProfile.exists() ? (myProfile.data() as UserProfile).displayName : 'Player';

    const inviteDoc = await addDoc(collection(db, MATCH_INVITES), {
      fromUid: uid,
      fromName: myName,
      toUid: friendUid,
      mode,
      status: 'pending',
      timestamp: serverTimestamp(),
    });

    return inviteDoc.id;
  } catch (error) {
    console.warn('inviteToMatch failed:', error);
    return null;
  }
}

/**
 * Listens for incoming match invites.
 */
export function listenForMatchInvites(
  callback: (invites: MatchInvite[]) => void
): Unsubscribe | null {
  try {
    const uid = ensureUid();
    if (!uid) return null;

    const q = query(
      collection(db, MATCH_INVITES),
      where('toUid', '==', uid),
      where('status', '==', 'pending'),
      orderBy('timestamp', 'desc'),
      limit(20)
    );

    return onSnapshot(q, (snapshot) => {
      const invites: MatchInvite[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        timestamp: d.data().timestamp?.toMillis?.() ?? Date.now(),
      })) as MatchInvite[];
      callback(invites);
    });
  } catch (error) {
    console.warn('listenForMatchInvites failed:', error);
    return null;
  }
}
