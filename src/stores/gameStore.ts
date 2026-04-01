import { create } from 'zustand';

export type Player = 1 | 2;
export type Cell = 0 | Player;
export type Board = Cell[][];
export type Difficulty = 'easy' | 'medium' | 'hard';
export type GameStatus = 'idle' | 'playing' | 'won' | 'draw';

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

  // Actions
  newGame: (difficulty: Difficulty, vsAi: boolean) => void;
  dropPiece: (col: number) => boolean;
  setAiThinking: (thinking: boolean) => void;
  resetScores: () => void;
}

const ROWS = 6;
const COLS = 7;

function createEmptyBoard(): Board {
  return Array.from({ length: COLS }, () => Array(ROWS).fill(0));
}

function getLowestEmptyRow(board: Board, col: number): number {
  for (let row = ROWS - 1; row >= 0; row--) {
    if (board[col][row] === 0) return row;
  }
  return -1;
}

function checkWin(board: Board, col: number, row: number, player: Player): [number, number][] | null {
  const directions = [
    [0, 1],   // vertical
    [1, 0],   // horizontal
    [1, 1],   // diagonal down-right
    [1, -1],  // diagonal up-right
  ];

  for (const [dc, dr] of directions) {
    const cells: [number, number][] = [[col, row]];

    // Check forward
    for (let i = 1; i < 4; i++) {
      const c = col + dc * i;
      const r = row + dr * i;
      if (c >= 0 && c < COLS && r >= 0 && r < ROWS && board[c][r] === player) {
        cells.push([c, r]);
      } else break;
    }

    // Check backward
    for (let i = 1; i < 4; i++) {
      const c = col - dc * i;
      const r = row - dr * i;
      if (c >= 0 && c < COLS && r >= 0 && r < ROWS && board[c][r] === player) {
        cells.push([c, r]);
      } else break;
    }

    if (cells.length >= 4) return cells;
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

  newGame: (difficulty, vsAi) => set({
    board: createEmptyBoard(),
    currentPlayer: 1,
    status: 'playing',
    winner: null,
    winCells: null,
    moveCount: 0,
    difficulty,
    isAiThinking: false,
    isVsAi: vsAi,
  }),

  dropPiece: (col) => {
    const { board, currentPlayer, status } = get();
    if (status !== 'playing') return false;

    const row = getLowestEmptyRow(board, col);
    if (row === -1) return false;

    const newBoard = board.map(c => [...c]);
    newBoard[col][row] = currentPlayer;

    const winCells = checkWin(newBoard, col, row, currentPlayer);

    if (winCells) {
      const scores = { ...get().scores };
      if (currentPlayer === 1) scores.player1++;
      else scores.player2++;
      set({
        board: newBoard,
        status: 'won',
        winner: currentPlayer,
        winCells,
        moveCount: get().moveCount + 1,
        scores,
      });
      return true;
    }

    if (isBoardFull(newBoard)) {
      set({
        board: newBoard,
        status: 'draw',
        moveCount: get().moveCount + 1,
      });
      return true;
    }

    set({
      board: newBoard,
      currentPlayer: currentPlayer === 1 ? 2 : 1,
      moveCount: get().moveCount + 1,
    });
    return true;
  },

  setAiThinking: (thinking) => set({ isAiThinking: thinking }),

  resetScores: () => set({ scores: { player1: 0, player2: 0 } }),
}));

// Export board constants for use elsewhere
export { ROWS, COLS, getLowestEmptyRow, createEmptyBoard };
