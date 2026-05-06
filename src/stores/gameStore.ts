import { create } from 'zustand';
import { saveState, loadState } from '../services/storage';

export type Player = 1 | 2;
/** Cell value sentinel for obstacle blocks (career "obstacle" levels).
 *  Walls render as concrete blocks and are immovable — `dropPiece` skips
 *  past them via getLowestEmptyRow's `=== 0` check, `checkWin` ignores
 *  them because it only matches `=== player`, and `isBoardFull` treats
 *  them as occupied (`!== 0`). All existing engine logic flows through
 *  cleanly without per-cell branching. */
export const WALL = 3 as const;
/** Cell value sentinel for the Rainbow power piece (Phase 2 career
 *  unlock from Venice boss). Counts as EITHER player in checkWin so
 *  the player can use it to bridge or close a connect-N either side
 *  could complete. Visually distinct from regular pieces (rainbow
 *  gradient) so the table reads "this slot belongs to whoever wins
 *  here." Engine helpers below treat RAINBOW as wildcard for win
 *  detection only — it doesn't auto-extend the player's count
 *  outside an active win check. */
export const RAINBOW = 4 as const;
export type Cell = 0 | Player | typeof WALL | typeof RAINBOW;
export type Board = Cell[][];
export type Difficulty = 'easy' | 'medium' | 'hard';
type GameStatus = 'idle' | 'playing' | 'won' | 'draw';

interface CustomGameSettings {
  rows: number;
  cols: number;
  connectCount: number;
  timerSeconds: number; // 0 = no timer
  startingPlayer?: 1 | 2; // 1 = player goes first, 2 = opponent first
}

interface GameState {
  board: Board;
  currentPlayer: Player;
  status: GameStatus;
  winner: Player | null;
  winCells: [number, number][] | null;
  moveCount: number;
  difficulty: Difficulty;
  isAiThinking: boolean;
  scores: { player1: number; player2: number };
  isVsAi: boolean;
  winStreak: number;
  bestStreak: number;
  totalGamesPlayed: number;
  lastMoveCol: number | null;
  customSettings: CustomGameSettings;

  // Move history for undo
  moveHistory: { board: Board; currentPlayer: Player; moveCount: number }[];

  // Actions
  newGame: (difficulty: Difficulty, vsAi: boolean, settings?: Partial<CustomGameSettings>) => void;
  dropPiece: (col: number) => boolean;
  /** Phase 2 power piece: Bomb. Lands in `col` like a normal drop, then
   *  clears a 3×3 around the landing cell (the landing cell + 8
   *  neighbors). Wipes player pieces, opponent pieces, AND wall
   *  obstacles — per the doc, "wipes opponent + your own pieces."
   *  Counts as the current player's turn (moveCount++, player flips).
   *  Returns the {col,row} the bomb landed at, or null if the column
   *  was full. Caller is responsible for the visual explosion FX. */
  dropBomb: (col: number) => { col: number; row: number } | null;
  /** Phase 2 power piece: Rainbow. Lands in `col` like a normal drop
   *  but as cell value RAINBOW (4) instead of the player's color.
   *  checkWin treats RAINBOW as wildcard so the rainbow extends BOTH
   *  players' connect chains. Effectively: a hedged drop that closes
   *  threats from either side. Counts as the current player's turn. */
  dropRainbow: (col: number) => { col: number; row: number } | null;
  /** Phase 2 power piece: Heavy. Lands in `col` as the player's piece,
   *  then pushes adjacent OPPONENT pieces (col-1, col+1 in the same
   *  row) DOWN by one row when the row below is empty. Per the doc,
   *  "pushes adjacent opponent pieces down one row." If neighbor row
   *  below is occupied (by anything), no push occurs there — the
   *  neighbor stays. Counts as the current player's turn. */
  dropHeavy: (col: number) => { col: number; row: number } | null;
  undoMove: () => boolean;
  setAiThinking: (thinking: boolean) => void;
  resetScores: () => void;
  loadFromStorage: () => Promise<void>;
}

const ROWS = 6;
const COLS = 7;

function createEmptyBoard(cols: number = COLS, rows: number = ROWS): Board {
  return Array.from({ length: cols }, () => Array(rows).fill(0));
}

function getLowestEmptyRow(board: Board, col: number, rows: number = ROWS): number {
  for (let row = rows - 1; row >= 0; row--) {
    if (board[col][row] === 0) return row;
  }
  return -1;
}

function checkWin(board: Board, col: number, row: number, player: Player, connectCount: number = 4, cols: number = COLS, rows: number = ROWS): [number, number][] | null {
  const directions = [
    [0, 1],   // vertical
    [1, 0],   // horizontal
    [1, 1],   // diagonal down-right
    [1, -1],  // diagonal up-right
  ];

  // Phase 2 power piece — RAINBOW (cell value 4) counts as either
  // player. So when scanning connect-N for `player`, treat both
  // `=== player` and `=== RAINBOW` as part of the chain. The
  // anchor cell (col, row) must be the player's own piece (or a
  // rainbow they just dropped) — the caller passes their player id.
  const matchesPlayer = (v: Cell) => v === player || v === RAINBOW;

  for (const [dc, dr] of directions) {
    const cells: [number, number][] = [[col, row]];

    // Check forward
    for (let i = 1; i < connectCount; i++) {
      const c = col + dc * i;
      const r = row + dr * i;
      if (c >= 0 && c < cols && r >= 0 && r < rows && matchesPlayer(board[c][r])) {
        cells.push([c, r]);
      } else break;
    }

    // Check backward
    for (let i = 1; i < connectCount; i++) {
      const c = col - dc * i;
      const r = row - dr * i;
      if (c >= 0 && c < cols && r >= 0 && r < rows && matchesPlayer(board[c][r])) {
        cells.push([c, r]);
      } else break;
    }

    if (cells.length >= connectCount) return cells;
  }

  return null;
}

function isBoardFull(board: Board): boolean {
  return board.every(col => col[0] !== 0);
}

export const useGameStore = create<GameState>((set, get) => ({
  board: createEmptyBoard(),
  currentPlayer: 1,
  status: 'idle',
  winner: null,
  winCells: null,
  moveCount: 0,
  difficulty: 'medium',
  isAiThinking: false,
  scores: { player1: 0, player2: 0 },
  isVsAi: true,
  winStreak: 0,
  bestStreak: 0,
  totalGamesPlayed: 0,
  lastMoveCol: null,
  customSettings: { rows: ROWS, cols: COLS, connectCount: 4, timerSeconds: 0 },
  moveHistory: [],

  newGame: (difficulty, vsAi, settings) => {
    const s = {
      rows: settings?.rows ?? ROWS,
      cols: settings?.cols ?? COLS,
      connectCount: settings?.connectCount ?? 4,
      timerSeconds: settings?.timerSeconds ?? 0,
    };
    set({
      board: createEmptyBoard(s.cols, s.rows),
      currentPlayer: (settings?.startingPlayer || 1) as Player,
      status: 'playing',
      winner: null,
      winCells: null,
      moveCount: 0,
      difficulty,
      isAiThinking: false,
      isVsAi: vsAi,
      lastMoveCol: null,
      customSettings: s,
      moveHistory: [],
    });
  },

  dropBomb: (col) => {
    const { board, currentPlayer, status, moveHistory, moveCount, customSettings } = get();
    const { rows: curRows, cols: curCols } = customSettings;
    if (status !== 'playing') return null;
    const row = getLowestEmptyRow(board, col, curRows);
    if (row === -1) return null;
    // Save history pre-explosion so undo restores the obliterated zone.
    const historyEntry = {
      board: board.map((c) => [...c]),
      currentPlayer,
      moveCount,
    };
    // Clear the 3×3 around (col, row). Iterate the (-1, 0, +1) offsets
    // for both axes. Walls (cell value 3) are explicitly destroyable
    // by bombs — the doc's "wipes opponent + your own pieces"
    // generalizes to "everything in the blast zone." Then settle
    // gravity per column so floating pieces fall into the holes.
    const newBoard = board.map((c) => [...c]);
    for (let dc = -1; dc <= 1; dc++) {
      for (let dr = -1; dr <= 1; dr++) {
        const c = col + dc;
        const r = row + dr;
        if (c >= 0 && c < curCols && r >= 0 && r < curRows) {
          newBoard[c][r] = 0;
        }
      }
    }
    // Settle each touched column — pieces above the cleared zone fall
    // down to fill the hole. Skip walls (value 3) since they're
    // already destroyed by the blast above. For each column scan from
    // bottom up, collect non-zero values, then refill bottom-up.
    for (let dc = -1; dc <= 1; dc++) {
      const c = col + dc;
      if (c < 0 || c >= curCols) continue;
      const stack: Cell[] = [];
      for (let r = curRows - 1; r >= 0; r--) {
        if (newBoard[c][r] !== 0) stack.push(newBoard[c][r]);
      }
      // Refill the column with empties on top + collected pieces on
      // the bottom (preserving stack order).
      for (let r = 0; r < curRows; r++) newBoard[c][r] = 0;
      for (let i = 0; i < stack.length; i++) {
        newBoard[c][curRows - 1 - i] = stack[i];
      }
    }
    set({
      board: newBoard,
      currentPlayer: currentPlayer === 1 ? 2 : 1,
      moveCount: moveCount + 1,
      lastMoveCol: col,
      moveHistory: [...moveHistory, historyEntry],
    });
    return { col, row };
  },

  dropRainbow: (col) => {
    const { board, currentPlayer, status, moveHistory, moveCount, customSettings } = get();
    const { rows: curRows, cols: curCols, connectCount } = customSettings;
    if (status !== 'playing') return null;
    const row = getLowestEmptyRow(board, col, curRows);
    if (row === -1) return null;
    const historyEntry = {
      board: board.map((c) => [...c]),
      currentPlayer,
      moveCount,
    };
    const newBoard = board.map((c) => [...c]);
    newBoard[col][row] = RAINBOW;
    // Rainbow can complete EITHER player's win. Check the current
    // player first (they tossed it — they get credit if it works).
    // Then check the opponent — if it just handed them the win, the
    // game ends in their favor (the rainbow's hedged-bet downside).
    const winSelf = checkWin(newBoard, col, row, currentPlayer, connectCount, curCols, curRows);
    const opp: Player = currentPlayer === 1 ? 2 : 1;
    const winOpp = checkWin(newBoard, col, row, opp, connectCount, curCols, curRows);
    if (winSelf) {
      const scores = { ...get().scores };
      if (currentPlayer === 1) scores.player1++; else scores.player2++;
      const newStreak = currentPlayer === 1 ? get().winStreak + 1 : 0;
      set({
        board: newBoard, status: 'won', winner: currentPlayer, winCells: winSelf,
        moveCount: moveCount + 1, scores, lastMoveCol: col,
        winStreak: newStreak,
        bestStreak: Math.max(newStreak, get().bestStreak),
        totalGamesPlayed: get().totalGamesPlayed + 1,
        moveHistory: [...moveHistory, historyEntry],
      });
      return { col, row };
    }
    if (winOpp) {
      const scores = { ...get().scores };
      if (opp === 1) scores.player1++; else scores.player2++;
      const newStreak = opp === 1 ? get().winStreak + 1 : 0;
      set({
        board: newBoard, status: 'won', winner: opp, winCells: winOpp,
        moveCount: moveCount + 1, scores, lastMoveCol: col,
        winStreak: newStreak,
        bestStreak: Math.max(newStreak, get().bestStreak),
        totalGamesPlayed: get().totalGamesPlayed + 1,
        moveHistory: [...moveHistory, historyEntry],
      });
      return { col, row };
    }
    set({
      board: newBoard,
      currentPlayer: opp,
      moveCount: moveCount + 1,
      lastMoveCol: col,
      moveHistory: [...moveHistory, historyEntry],
    });
    return { col, row };
  },

  dropHeavy: (col) => {
    const { board, currentPlayer, status, moveHistory, moveCount, customSettings } = get();
    const { rows: curRows, cols: curCols, connectCount } = customSettings;
    if (status !== 'playing') return null;
    const row = getLowestEmptyRow(board, col, curRows);
    if (row === -1) return null;
    const historyEntry = {
      board: board.map((c) => [...c]),
      currentPlayer,
      moveCount,
    };
    const newBoard = board.map((c) => [...c]);
    newBoard[col][row] = currentPlayer;
    // Push adjacent OPPONENT pieces down one row when the row below
    // them is empty. Per the doc — "pushes adjacent opponent pieces
    // down one row." Walls + own pieces are immovable. If row+1 is
    // out of bounds (we landed at the bottom), no push happens.
    const opp: Player = currentPlayer === 1 ? 2 : 1;
    if (row + 1 < curRows) {
      for (const dc of [-1, 1]) {
        const c = col + dc;
        if (c < 0 || c >= curCols) continue;
        if (newBoard[c][row] === opp && newBoard[c][row + 1] === 0) {
          newBoard[c][row + 1] = opp;
          newBoard[c][row] = 0;
        }
      }
    }
    // Check win at the landing cell. The push only moved opponent
    // pieces into a row that's lower than ours, so it can't form
    // OUR connect, but it could form theirs — check both.
    const winSelf = checkWin(newBoard, col, row, currentPlayer, connectCount, curCols, curRows);
    if (winSelf) {
      const scores = { ...get().scores };
      if (currentPlayer === 1) scores.player1++; else scores.player2++;
      const newStreak = currentPlayer === 1 ? get().winStreak + 1 : 0;
      set({
        board: newBoard, status: 'won', winner: currentPlayer, winCells: winSelf,
        moveCount: moveCount + 1, scores, lastMoveCol: col,
        winStreak: newStreak,
        bestStreak: Math.max(newStreak, get().bestStreak),
        totalGamesPlayed: get().totalGamesPlayed + 1,
        moveHistory: [...moveHistory, historyEntry],
      });
      return { col, row };
    }
    set({
      board: newBoard,
      currentPlayer: opp,
      moveCount: moveCount + 1,
      lastMoveCol: col,
      moveHistory: [...moveHistory, historyEntry],
    });
    return { col, row };
  },

  dropPiece: (col) => {
    const { board, currentPlayer, status, moveHistory, moveCount, customSettings } = get();
    const { rows: curRows, cols: curCols, connectCount } = customSettings;
    // Save current state to history before making the move
    const historyEntry = {
      board: board.map(c => [...c]),
      currentPlayer,
      moveCount,
    };
    if (status !== 'playing') return false;

    const row = getLowestEmptyRow(board, col, curRows);
    if (row === -1) return false;

    const newBoard = board.map(c => [...c]);
    newBoard[col][row] = currentPlayer;

    const winCells = checkWin(newBoard, col, row, currentPlayer, connectCount, curCols, curRows);

    if (winCells) {
      const scores = { ...get().scores };
      if (currentPlayer === 1) scores.player1++;
      else scores.player2++;
      const newStreak = currentPlayer === 1 ? get().winStreak + 1 : 0;
      set({
        board: newBoard,
        status: 'won',
        winner: currentPlayer,
        winCells,
        moveCount: moveCount + 1,
        scores,
        lastMoveCol: col,
        winStreak: newStreak,
        bestStreak: Math.max(newStreak, get().bestStreak),
        totalGamesPlayed: get().totalGamesPlayed + 1,
        moveHistory: [...moveHistory, historyEntry],
      });
      return true;
    }

    if (isBoardFull(newBoard)) {
      set({
        board: newBoard,
        status: 'draw',
        moveCount: moveCount + 1,
        lastMoveCol: col,
        winStreak: 0,
        totalGamesPlayed: get().totalGamesPlayed + 1,
        moveHistory: [...moveHistory, historyEntry],
      });
      return true;
    }

    set({
      board: newBoard,
      currentPlayer: currentPlayer === 1 ? 2 : 1,
      moveCount: moveCount + 1,
      lastMoveCol: col,
      moveHistory: [...moveHistory, historyEntry],
    });
    return true;
  },

  undoMove: () => {
    const { moveHistory, status, isVsAi } = get();
    if (moveHistory.length === 0 || status !== 'playing') return false;

    // In AI mode, undo 2 moves (player + AI) so it's back to player's turn
    const undoCount = isVsAi && moveHistory.length >= 2 ? 2 : 1;
    const restoreIdx = moveHistory.length - undoCount;
    if (restoreIdx < 0) return false;
    const restoreState = moveHistory[restoreIdx];

    set({
      board: restoreState.board,
      currentPlayer: restoreState.currentPlayer,
      moveCount: restoreState.moveCount,
      moveHistory: moveHistory.slice(0, restoreIdx),
      winCells: null,
      winner: null,
    });
    return true;
  },

  setAiThinking: (thinking) => set({ isAiThinking: thinking }),

  resetScores: () => set({ scores: { player1: 0, player2: 0 } }),

  loadFromStorage: async () => {
    const saved = await loadState<{
      winStreak: number;
      bestStreak: number;
      scores: { player1: number; player2: number };
      totalGamesPlayed: number;
    }>('gameStats');
    if (saved) {
      set({
        winStreak: saved.winStreak ?? 0,
        bestStreak: saved.bestStreak ?? 0,
        scores: saved.scores ?? { player1: 0, player2: 0 },
        totalGamesPlayed: saved.totalGamesPlayed ?? 0,
      });
    }
  },
}));

// Auto-save streaks and scores
useGameStore.subscribe((state) => {
  saveState('gameStats', {
    winStreak: state.winStreak,
    bestStreak: state.bestStreak,
    scores: state.scores,
    totalGamesPlayed: state.totalGamesPlayed,
  });
});

// Export board constants for use elsewhere
export { ROWS, COLS, getLowestEmptyRow };

// ── Dev/test hook ────────────────────────────────────────────────────
// Exposes the store to window so the playtest bot can access board state
// and call dropPiece() directly. Only runs in dev (web preview).
if (typeof window !== 'undefined' && __DEV__) {
  (window as any).__gameStore = useGameStore;
}
