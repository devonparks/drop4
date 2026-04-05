// Drop4 AI Engine — Minimax with alpha-beta pruning
// Supports dynamic board sizes and connect counts for custom games

import { Board, Player, Cell, getLowestEmptyRow } from '../stores/gameStore';

const AI: Player = 2;
const HUMAN: Player = 1;

const DIFFICULTY_CONFIG = {
  easy:   { depth: 2, randomChance: 0.4 },
  medium: { depth: 4, randomChance: 0.15 },
  hard:   { depth: 7, randomChance: 0 },
};

export type Difficulty = keyof typeof DIFFICULTY_CONFIG;

// Derive board dimensions from the board itself
function getBoardDims(board: Board): { cols: number; rows: number } {
  const cols = board.length;
  const rows = cols > 0 ? board[0].length : 0;
  return { cols, rows };
}

// Score a window of N cells (dynamic connect count)
function scoreWindow(window: Cell[], player: Player, connectN: number): number {
  const opponent: Player = player === 1 ? 2 : 1;
  const playerCount = window.filter(c => c === player).length;
  const opponentCount = window.filter(c => c === opponent).length;
  const emptyCount = window.filter(c => c === 0).length;

  if (playerCount === connectN) return 100;
  if (playerCount === connectN - 1 && emptyCount === 1) return 5;
  if (playerCount === connectN - 2 && emptyCount === 2) return 2;
  if (opponentCount === connectN - 1 && emptyCount === 1) return -4;

  return 0;
}

// Evaluate the entire board for a player (dynamic dimensions + connect count)
function evaluateBoard(board: Board, player: Player, connectN: number): number {
  const { cols, rows } = getBoardDims(board);
  let score = 0;

  // Center column preference (strategic advantage)
  const centerCol = Math.floor(cols / 2);
  const centerCount = board[centerCol].filter(c => c === player).length;
  score += centerCount * 3;

  // Horizontal windows
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col <= cols - connectN; col++) {
      const window: Cell[] = [];
      for (let i = 0; i < connectN; i++) window.push(board[col + i][row]);
      score += scoreWindow(window, player, connectN);
    }
  }

  // Vertical windows
  for (let col = 0; col < cols; col++) {
    for (let row = 0; row <= rows - connectN; row++) {
      const window: Cell[] = [];
      for (let i = 0; i < connectN; i++) window.push(board[col][row + i]);
      score += scoreWindow(window, player, connectN);
    }
  }

  // Positive diagonal windows
  for (let col = 0; col <= cols - connectN; col++) {
    for (let row = 0; row <= rows - connectN; row++) {
      const window: Cell[] = [];
      for (let i = 0; i < connectN; i++) window.push(board[col + i][row + i]);
      score += scoreWindow(window, player, connectN);
    }
  }

  // Negative diagonal windows
  for (let col = 0; col <= cols - connectN; col++) {
    for (let row = connectN - 1; row < rows; row++) {
      const window: Cell[] = [];
      for (let i = 0; i < connectN; i++) window.push(board[col + i][row - i]);
      score += scoreWindow(window, player, connectN);
    }
  }

  return score;
}

// Check if a move results in a win (dynamic dimensions + connect count)
function isWinningMove(board: Board, col: number, row: number, player: Player, connectN: number): boolean {
  const { cols, rows } = getBoardDims(board);
  const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];

  for (const [dc, dr] of directions) {
    let count = 1;
    for (let i = 1; i < connectN; i++) {
      const c = col + dc * i, r = row + dr * i;
      if (c >= 0 && c < cols && r >= 0 && r < rows && board[c][r] === player) count++;
      else break;
    }
    for (let i = 1; i < connectN; i++) {
      const c = col - dc * i, r = row - dr * i;
      if (c >= 0 && c < cols && r >= 0 && r < rows && board[c][r] === player) count++;
      else break;
    }
    if (count >= connectN) return true;
  }
  return false;
}

// Get valid columns (not full)
function getValidCols(board: Board): number[] {
  const { cols } = getBoardDims(board);
  const validCols: number[] = [];
  for (let col = 0; col < cols; col++) {
    if (board[col][0] === 0) validCols.push(col);
  }
  return validCols;
}

// Check if the board is a terminal state (dynamic dimensions + connect count)
function isTerminal(board: Board, connectN: number): boolean {
  const { cols, rows } = getBoardDims(board);
  // Check for win
  for (let col = 0; col < cols; col++) {
    for (let row = 0; row < rows; row++) {
      if (board[col][row] !== 0) {
        if (isWinningMove(board, col, row, board[col][row] as Player, connectN)) return true;
      }
    }
  }
  // Check for full board
  return getValidCols(board).length === 0;
}

// Minimax with alpha-beta pruning (dynamic connect count)
function minimax(
  board: Board,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean,
  connectN: number
): [number | null, number] {
  const { cols, rows } = getBoardDims(board);
  const validCols = getValidCols(board);
  const terminal = isTerminal(board, connectN);

  if (depth === 0 || terminal) {
    if (terminal) {
      // Check if AI won
      for (let col = 0; col < cols; col++) {
        for (let row = 0; row < rows; row++) {
          if (board[col][row] === AI && isWinningMove(board, col, row, AI, connectN)) {
            return [null, 100000];
          }
          if (board[col][row] === HUMAN && isWinningMove(board, col, row, HUMAN, connectN)) {
            return [null, -100000];
          }
        }
      }
      return [null, 0]; // Draw
    }
    return [null, evaluateBoard(board, AI, connectN)];
  }

  if (isMaximizing) {
    let bestScore = -Infinity;
    let bestCol = validCols[Math.floor(Math.random() * validCols.length)];

    for (const col of validCols) {
      const row = getLowestEmptyRow(board, col, board[col].length);
      const newBoard = board.map(c => [...c]);
      newBoard[col][row] = AI;

      const [, score] = minimax(newBoard, depth - 1, alpha, beta, false, connectN);
      if (score > bestScore) {
        bestScore = score;
        bestCol = col;
      }
      alpha = Math.max(alpha, score);
      if (alpha >= beta) break;
    }
    return [bestCol, bestScore];
  } else {
    let bestScore = Infinity;
    let bestCol = validCols[Math.floor(Math.random() * validCols.length)];

    for (const col of validCols) {
      const row = getLowestEmptyRow(board, col, board[col].length);
      const newBoard = board.map(c => [...c]);
      newBoard[col][row] = HUMAN;

      const [, score] = minimax(newBoard, depth - 1, alpha, beta, true, connectN);
      if (score < bestScore) {
        bestScore = score;
        bestCol = col;
      }
      beta = Math.min(beta, score);
      if (alpha >= beta) break;
    }
    return [bestCol, bestScore];
  }
}

// Main export — get the AI's chosen column
// connectCount defaults to 4 for backward compatibility
export function getAIMove(board: Board, difficulty: Difficulty, connectCount: number = 4): number {
  const config = DIFFICULTY_CONFIG[difficulty];
  const connectN = connectCount;

  // Random chance: sometimes make a random valid move (makes Easy feel beatable)
  if (Math.random() < config.randomChance) {
    const validCols = getValidCols(board);
    return validCols[Math.floor(Math.random() * validCols.length)];
  }

  // Check for immediate winning move first (all difficulties)
  const validCols = getValidCols(board);
  for (const col of validCols) {
    const row = getLowestEmptyRow(board, col, board[col].length);
    const testBoard = board.map(c => [...c]);
    testBoard[col][row] = AI;
    if (isWinningMove(testBoard, col, row, AI, connectN)) return col;
  }

  // Check for immediate block (all difficulties)
  for (const col of validCols) {
    const row = getLowestEmptyRow(board, col, board[col].length);
    const testBoard = board.map(c => [...c]);
    testBoard[col][row] = HUMAN;
    if (isWinningMove(testBoard, col, row, HUMAN, connectN)) return col;
  }

  // Minimax for the best strategic move
  const [bestCol] = minimax(board, config.depth, -Infinity, Infinity, true, connectN);
  return bestCol ?? validCols[Math.floor(Math.random() * validCols.length)];
}
