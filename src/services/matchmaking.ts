import { auth, db, signInAsGuest, getCurrentUser } from './firebase';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  addDoc,
  deleteDoc,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
  Unsubscribe,
} from 'firebase/firestore';

// ============ TYPES ============

export type MatchMode = 'casual' | 'ranked';
export type QueueStatus = 'waiting' | 'matched';
export type MatchStatus = 'playing' | 'won' | 'draw' | 'resigned';

export interface QueueEntry {
  uid: string;
  displayName: string;
  elo: number;
  mode: MatchMode;
  timestamp: Timestamp | ReturnType<typeof serverTimestamp>;
  status: QueueStatus;
  matchId: string | null;
}

export interface PlayerInfo {
  uid: string;
  displayName: string;
  elo: number;
}

export interface Move {
  col: number;
  player: 1 | 2;
  timestamp: Timestamp | ReturnType<typeof serverTimestamp>;
}

export interface MatchDocument {
  player1: PlayerInfo;
  player2: PlayerInfo;
  board: number[][];
  currentPlayer: 1 | 2;
  moves: Move[];
  status: MatchStatus;
  winner: 1 | 2 | null;
  mode: MatchMode;
  createdAt: ReturnType<typeof serverTimestamp>;
  updatedAt: ReturnType<typeof serverTimestamp>;
}

// ============ HELPERS ============

const MATCHMAKING_COLLECTION = 'matchmaking';
const MATCHES_COLLECTION = 'matches';
const ELO_RANGE = 200;
const BOARD_ROWS = 6;
const BOARD_COLS = 7;

/** Ensure the user is signed in (anonymous if needed). Returns uid or null. */
async function ensureAuth(): Promise<string | null> {
  let user = getCurrentUser();
  if (!user) {
    user = await signInAsGuest();
  }
  return user?.uid ?? null;
}

/** Create an empty 6x7 board filled with 0s. */
function createEmptyBoard(): number[][] {
  return Array.from({ length: BOARD_ROWS }, () => Array(BOARD_COLS).fill(0));
}

/** Reference to current player's queue document (keyed by uid). */
let currentQueueDocId: string | null = null;

// ============ 1. MATCHMAKING QUEUE ============

/**
 * Adds the current player to the Firestore matchmaking queue.
 * Automatically finds a compatible opponent or waits.
 */
export async function joinQueue(
  mode: MatchMode,
  elo: number = 1000
): Promise<string | null> {
  try {
    const uid = await ensureAuth();
    if (!uid) {
      console.warn('joinQueue: not authenticated');
      return null;
    }

    const user = getCurrentUser();
    const displayName = user?.displayName || 'Player';

    // Remove any existing queue entry for this player first
    await leaveQueue();

    // Check for a compatible opponent already waiting
    const opponent = await findCompatibleOpponent(mode, elo, uid);

    if (opponent) {
      // Found an opponent — create the match immediately
      const matchId = await createMatch(
        { uid, displayName, elo },
        { uid: opponent.uid, displayName: opponent.displayName, elo: opponent.elo },
        mode
      );

      if (matchId) {
        // Update the opponent's queue entry to matched
        const opponentDocRef = doc(db, MATCHMAKING_COLLECTION, opponent.uid);
        await updateDoc(opponentDocRef, {
          status: 'matched' as QueueStatus,
          matchId,
        });

        // Write our own queue entry as matched (so listeners can pick it up)
        const myDocRef = doc(db, MATCHMAKING_COLLECTION, uid);
        await setDoc(myDocRef, {
          uid,
          displayName,
          elo,
          mode,
          timestamp: serverTimestamp(),
          status: 'matched' as QueueStatus,
          matchId,
        });
        currentQueueDocId = uid;

        return matchId;
      }
    }

    // No opponent found — add ourselves to queue as waiting
    const queueDocRef = doc(db, MATCHMAKING_COLLECTION, uid);
    await setDoc(queueDocRef, {
      uid,
      displayName,
      elo,
      mode,
      timestamp: serverTimestamp(),
      status: 'waiting' as QueueStatus,
      matchId: null,
    });
    currentQueueDocId = uid;

    return null; // No match yet, caller should use listenForMatch
  } catch (error) {
    console.warn('joinQueue failed:', error);
    return null;
  }
}

/**
 * Removes the current player from the matchmaking queue.
 */
export async function leaveQueue(): Promise<void> {
  try {
    const uid = currentQueueDocId || getCurrentUser()?.uid;
    if (!uid) return;

    const queueDocRef = doc(db, MATCHMAKING_COLLECTION, uid);
    const docSnap = await getDoc(queueDocRef);
    if (docSnap.exists()) {
      await deleteDoc(queueDocRef);
    }
    currentQueueDocId = null;
  } catch (error) {
    console.warn('leaveQueue failed:', error);
  }
}

/**
 * Listens for when the current player gets matched with an opponent.
 * Fires the callback with the matchId when status changes to 'matched'.
 * Returns an unsubscribe function for cleanup.
 */
export function listenForMatch(
  callback: (matchId: string) => void
): Unsubscribe | null {
  try {
    const uid = currentQueueDocId || getCurrentUser()?.uid;
    if (!uid) {
      console.warn('listenForMatch: no queue entry to listen to');
      return null;
    }

    const queueDocRef = doc(db, MATCHMAKING_COLLECTION, uid);

    const unsubscribe = onSnapshot(queueDocRef, (snapshot) => {
      if (!snapshot.exists()) return;

      const data = snapshot.data() as QueueEntry;
      if (data.status === 'matched' && data.matchId) {
        callback(data.matchId);
      }
    });

    return unsubscribe;
  } catch (error) {
    console.warn('listenForMatch failed:', error);
    return null;
  }
}

// ============ 2. MATCH SESSION ============

/**
 * Creates a new match document in Firestore.
 * Returns the match ID.
 */
export async function createMatch(
  player1: PlayerInfo,
  player2: PlayerInfo,
  mode: MatchMode
): Promise<string | null> {
  try {
    const matchData: MatchDocument = {
      player1,
      player2,
      board: createEmptyBoard(),
      currentPlayer: 1,
      moves: [],
      status: 'playing',
      winner: null,
      mode,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, MATCHES_COLLECTION), matchData);
    return docRef.id;
  } catch (error) {
    console.warn('createMatch failed:', error);
    return null;
  }
}

/**
 * Real-time listener for match state changes.
 * Returns an unsubscribe function for cleanup.
 */
export function listenToMatch(
  matchId: string,
  callback: (match: MatchDocument & { id: string }) => void
): Unsubscribe {
  const matchDocRef = doc(db, MATCHES_COLLECTION, matchId);

  const unsubscribe = onSnapshot(
    matchDocRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        console.warn('listenToMatch: match document not found');
        return;
      }
      callback({ id: snapshot.id, ...(snapshot.data() as MatchDocument) });
    },
    (error) => {
      console.warn('listenToMatch error:', error);
    }
  );

  return unsubscribe;
}

/**
 * Writes a move to the match. Drops the piece into the given column,
 * updates the board, advances the current player, and checks for win/draw.
 */
export async function makeMove(
  matchId: string,
  column: number,
  playerNum: 1 | 2
): Promise<boolean> {
  try {
    const matchDocRef = doc(db, MATCHES_COLLECTION, matchId);
    const matchSnap = await getDoc(matchDocRef);

    if (!matchSnap.exists()) {
      console.warn('makeMove: match not found');
      return false;
    }

    const match = matchSnap.data() as MatchDocument;

    // Validate it is this player's turn
    if (match.currentPlayer !== playerNum) {
      console.warn('makeMove: not your turn');
      return false;
    }

    // Validate match is still playing
    if (match.status !== 'playing') {
      console.warn('makeMove: match is not in playing state');
      return false;
    }

    // Clone the board and drop the piece
    const board = match.board.map((row) => [...row]);
    const row = getLowestEmptyRow(board, column);

    if (row === -1) {
      console.warn('makeMove: column is full');
      return false;
    }

    board[row][column] = playerNum;

    // Record the move
    const newMove: Move = {
      col: column,
      player: playerNum,
      timestamp: serverTimestamp(),
    };
    const moves = [...match.moves, newMove];

    // Check for win
    const won = checkWin(board, row, column, playerNum);
    // Check for draw (board full)
    const draw = !won && board[0].every((cell) => cell !== 0);

    const updates: Partial<MatchDocument> & { updatedAt: ReturnType<typeof serverTimestamp> } = {
      board,
      moves,
      currentPlayer: (playerNum === 1 ? 2 : 1) as 1 | 2,
      updatedAt: serverTimestamp(),
    };

    if (won) {
      updates.status = 'won';
      updates.winner = playerNum;
    } else if (draw) {
      updates.status = 'draw';
    }

    await updateDoc(matchDocRef, updates);
    return true;
  } catch (error) {
    console.warn('makeMove failed:', error);
    return false;
  }
}

/**
 * Player resigns from the match.
 */
export async function resignMatch(
  matchId: string,
  playerNum: 1 | 2
): Promise<boolean> {
  try {
    const matchDocRef = doc(db, MATCHES_COLLECTION, matchId);
    const matchSnap = await getDoc(matchDocRef);

    if (!matchSnap.exists()) {
      console.warn('resignMatch: match not found');
      return false;
    }

    const match = matchSnap.data() as MatchDocument;
    if (match.status !== 'playing') {
      console.warn('resignMatch: match is not in playing state');
      return false;
    }

    const winner: 1 | 2 = playerNum === 1 ? 2 : 1;

    await updateDoc(matchDocRef, {
      status: 'resigned' as MatchStatus,
      winner,
      updatedAt: serverTimestamp(),
    });

    return true;
  } catch (error) {
    console.warn('resignMatch failed:', error);
    return false;
  }
}

// ============ 3. MATCHMAKING LOGIC ============

/**
 * Searches the queue for a compatible opponent.
 * For ranked: must be within ELO_RANGE (200 points).
 * For casual: any waiting player with the same mode.
 */
async function findCompatibleOpponent(
  mode: MatchMode,
  elo: number,
  excludeUid: string
): Promise<QueueEntry | null> {
  try {
    const queueRef = collection(db, MATCHMAKING_COLLECTION);

    // Base query: same mode, status waiting, ordered by timestamp (first come first served)
    const q = query(
      queueRef,
      where('mode', '==', mode),
      where('status', '==', 'waiting'),
      orderBy('timestamp', 'asc'),
      limit(20)
    );

    const snapshot = await getDocs(q);

    for (const docSnap of snapshot.docs) {
      const entry = docSnap.data() as QueueEntry;

      // Skip ourselves
      if (entry.uid === excludeUid) continue;

      // For ranked: check ELO range
      if (mode === 'ranked') {
        if (Math.abs(entry.elo - elo) > ELO_RANGE) continue;
      }

      return entry;
    }

    return null;
  } catch (error) {
    console.warn('findCompatibleOpponent failed:', error);
    return null;
  }
}

// ============ BOARD LOGIC HELPERS ============

/**
 * Returns the lowest empty row in the given column, or -1 if the column is full.
 */
function getLowestEmptyRow(board: number[][], col: number): number {
  for (let row = BOARD_ROWS - 1; row >= 0; row--) {
    if (board[row][col] === 0) return row;
  }
  return -1;
}

/**
 * Checks if the last move at (row, col) by `player` creates a 4-in-a-row.
 */
function checkWin(
  board: number[][],
  row: number,
  col: number,
  player: number
): boolean {
  const directions = [
    [0, 1],   // horizontal
    [1, 0],   // vertical
    [1, 1],   // diagonal down-right
    [1, -1],  // diagonal down-left
  ];

  for (const [dr, dc] of directions) {
    let count = 1;

    // Count in the positive direction
    for (let i = 1; i < 4; i++) {
      const r = row + dr * i;
      const c = col + dc * i;
      if (r < 0 || r >= BOARD_ROWS || c < 0 || c >= BOARD_COLS) break;
      if (board[r][c] !== player) break;
      count++;
    }

    // Count in the negative direction
    for (let i = 1; i < 4; i++) {
      const r = row - dr * i;
      const c = col - dc * i;
      if (r < 0 || r >= BOARD_ROWS || c < 0 || c >= BOARD_COLS) break;
      if (board[r][c] !== player) break;
      count++;
    }

    if (count >= 4) return true;
  }

  return false;
}
