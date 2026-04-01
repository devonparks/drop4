// Drop4 AI Engine — Minimax with alpha-beta pruning
// Ported from ODA Connect 4 (arcade/connect4/index.html lines 1177-1202)

import { Board, Player, Cell, ROWS, COLS, getLowestEmptyRow } from '../stores/gameStore';

const AI: Player = 2;
const HUMAN: Player = 1;

const DIFFICULTY_CONFIG = {
  easy:   { depth: 2, randomChance: 0.4 },
  medium: { depth: 4, randomChance: 0.15 },
  hard:   { depth: 7, randomChance: 0 },
};

export type Difficulty = keyof typeof DIFFICULTY_CONFIG;

// Score a window of 4 cells
function scoreWindow(window: Cell[], player: Player): number {
  const opponent: Player = player === 1 ? 2 : 1;
  const playerCount = window.filter(c => c === player).length;
  const opponentCount = window.filter(c => c === opponent).length;
  const emptyCount = window.filter(c => c === 0).length;

  if (playerCount === 4) return 100;
  if (playerCount === 3 && emptyCount === 1) return 5;
  if (playerCount === 2 && emptyCount === 2) return 2;
  if (opponentCount === 3 && emptyCount === 1) return -4;

  return 0;
}

// Evaluate the entire board for a player
function evaluateBoard(board: Board, player: Player): number {
  let score = 0;

  // Center column preference (strategic advantage)
  const centerCol = Math.floor(COLS / 2);
  const centerCount = board[centerCol].filter(c => c === player).length;
  score += centerCount * 3;

  // Horizontal windows
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col <= COLS - 4; col++) {
      const window: Cell[] = [board[col][row], board[col + 1][row], board[col + 2][row], board[col + 3][row]];
      score += scoreWindow(window, player);
    }
  }

  // Vertical windows
  for (let col = 0; col < COLS; col++) {
    for (let row = 0; row <= ROWS - 4; row++) {
      const window: Cell[] = [board[col][row], board[col][row + 1], board[col][row + 2], board[col][row + 3]];
      score += scoreWindow(window, player);
    }
  }

  // Positive diagonal windows
  for (let col = 0; col <= COLS - 4; col++) {
    for (let row = 0; row <= ROWS - 4; row++) {
      const window: Cell[] = [board[col][row], board[col + 1][row + 1], board[col + 2][row + 2], board[col + 3][row + 3]];
      score += scoreWindow(window, player);
    }
  }

  // Negative diagonal windows
  for (let col = 0; col <= COLS - 4; col++) {
    for (let row = 3; row < ROWS; row++) {
      const window: Cell[] = [board[col][row], board[col + 1][row - 1], board[col + 2][row - 2], board[col + 3][row - 3]];
      score += scoreWindow(window, player);
    }
  }

  return score;
}

// Check if a move results in a win
function isWinningMove(board: Board, col: number, row: number, player: Player): boolean {
  const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];

  for (const [dc, dr] of directions) {
    let count = 1;
    for (let i = 1; i < 4; i++) {
      const c = col + dc * i, r = row + dr * i;
      if (c >= 0 && c < COLS && r >= 0 && r < ROWS && board[c][r] === player) count++;
      else break;
    }
    for (let i = 1; i < 4; i++) {
      const c = col - dc * i, r = row - dr * i;
      if (c >= 0 && c < COLS && r >= 0 && r < ROWS && board[c][r] === player) count++;
      else break;
    }
    if (count >= 4) return true;
  }
  return false;
}

// Get valid columns (not full)
function getValidCols(board: Board): number[] {
  const cols: number[] = [];
  for (let col = 0; col < COLS; col++) {
    if (board[col][0] === 0) cols.push(col);
  }
  return cols;
}

// Check if the board is a terminal state
function isTerminal(board: Board): boolean {
  // Check for win
  for (let col = 0; col < COLS; col++) {
    for (let row = 0; row < ROWS; row++) {
      if (board[col][row] !== 0) {
        if (isWinningMove(board, col, row, board[col][row] as Player)) return true;
      }
    }
  }
  // Check for full board
  return getValidCols(board).length === 0;
}

// Minimax with alpha-beta pruning
function minimax(
  board: Board,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean
): [number | null, number] {
  const validCols = getValidCols(board);
  const terminal = isTerminal(board);

  if (depth === 0 || terminal) {
    if (terminal) {
      // Check if AI won
      for (let col = 0; col < COLS; col++) {
        for (let row = 0; row < ROWS; row++) {
          if (board[col][row] === AI && isWinningMove(board, col, row, AI)) {
            return [null, 100000];
          }
          if (board[col][row] === HUMAN && isWinningMove(board, col, row, HUMAN)) {
            return [null, -100000];
          }
        }
      }
      return [null, 0]; // Draw
    }
    return [null, evaluateBoard(board, AI)];
  }

  if (isMaximizing) {
    let bestScore = -Infinity;
    let bestCol = validCols[Math.floor(Math.random() * validCols.length)];

    for (const col of validCols) {
      const row = getLowestEmptyRow(board, col);
      const newBoard = board.map(c => [...c]);
      newBoard[col][row] = AI;

      const [, score] = minimax(newBoard, depth - 1, alpha, beta, false);
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
      const row = getLowestEmptyRow(board, col);
      const newBoard = board.map(c => [...c]);
      newBoard[col][row] = HUMAN;

      const [, score] = minimax(newBoard, depth - 1, alpha, beta, true);
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
export function getAIMove(board: Board, difficulty: Difficulty): number {
  const config = DIFFICULTY_CONFIG[difficulty];

  // Random chance: sometimes make a random valid move (makes Easy feel beatable)
  if (Math.random() < config.randomChance) {
    const validCols = getValidCols(board);
    return validCols[Math.floor(Math.random() * validCols.length)];
  }

  // Check for immediate winning move first (all difficulties)
  const validCols = getValidCols(board);
  for (const col of validCols) {
    const row = getLowestEmptyRow(board, col);
    const testBoard = board.map(c => [...c]);
    testBoard[col][row] = AI;
    if (isWinningMove(testBoard, col, row, AI)) return col;
  }

  // Check for immediate block (all difficulties)
  for (const col of validCols) {
    const row = getLowestEmptyRow(board, col);
    const testBoard = board.map(c => [...c]);
    testBoard[col][row] = HUMAN;
    if (isWinningMove(testBoard, col, row, HUMAN)) return col;
  }

  // Minimax for the best strategic move
  const [bestCol] = minimax(board, config.depth, -Infinity, Infinity, true);
  return bestCol ?? validCols[Math.floor(Math.random() * validCols.length)];
}
