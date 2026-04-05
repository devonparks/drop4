import { db } from './firebase';
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
  Unsubscribe,
} from 'firebase/firestore';

// ============ TYPES ============

export interface EmoteDocument {
  emoteId: string;
  playerNum: 1 | 2;
  timestamp: Timestamp | ReturnType<typeof serverTimestamp>;
}

export interface EmoteEvent {
  emoteId: string;
  playerNum: 1 | 2;
  timestamp: number;
}

// ============ SEND EMOTE ============

/**
 * Send an emote during an online match.
 * Writes to the Firestore subcollection: matches/{matchId}/emotes/{docId}
 */
export async function sendEmote(
  matchId: string,
  emoteId: string,
  playerNum: 1 | 2
): Promise<void> {
  try {
    const emotesRef = collection(db, 'matches', matchId, 'emotes');
    await addDoc(emotesRef, {
      emoteId,
      playerNum,
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    console.warn('sendEmote failed:', error);
  }
}

// ============ LISTEN FOR EMOTES ============

/**
 * Listen for emotes from the opponent in real time.
 * Returns an unsubscribe function for cleanup.
 *
 * Only fires the callback for emotes that arrive *after* the listener starts
 * (filters by timestamp > now to avoid replaying old emotes on mount).
 */
export function listenForEmotes(
  matchId: string,
  callback: (emote: EmoteEvent) => void
): () => void {
  const emotesRef = collection(db, 'matches', matchId, 'emotes');
  const q = query(emotesRef, orderBy('timestamp', 'asc'));

  // Track document IDs we've already seen to avoid duplicates
  const seenIds = new Set<string>();
  const startTime = Date.now();

  const unsubscribe: Unsubscribe = onSnapshot(q, (snapshot) => {
    for (const change of snapshot.docChanges()) {
      if (change.type === 'added') {
        const docId = change.doc.id;
        if (seenIds.has(docId)) continue;
        seenIds.add(docId);

        const data = change.doc.data() as EmoteDocument;

        // Only fire for emotes created after we started listening
        const ts = data.timestamp instanceof Timestamp
          ? data.timestamp.toMillis()
          : Date.now();

        if (ts < startTime - 2000) continue; // Skip old emotes (2s grace)

        callback({
          emoteId: data.emoteId,
          playerNum: data.playerNum,
          timestamp: ts,
        });
      }
    }
  }, (error) => {
    console.warn('listenForEmotes error:', error);
  });

  return unsubscribe;
}
