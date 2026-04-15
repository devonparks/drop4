/**
 * Drop4 Playtest Bot
 *
 * A Connect 4 solver + automated tester that:
 * 1. Plays optimally using minimax with alpha-beta pruning (depth 10)
 * 2. Navigates through game menus programmatically
 * 3. Plays every Quick Play difficulty + Career levels
 * 4. Grades the experience and reports bugs
 *
 * Usage: inject this script into the running Drop4 web preview via preview_eval.
 * The bot accesses the Zustand stores directly — no DOM clicking needed for moves.
 *
 * The bot is stronger than the hard AI (depth 10 vs depth 7) so it should
 * win every game unless the game rules create an impossible disadvantage.
 */

// ═══════════════════════════════════════════════════════════════════════
// CONNECT 4 SOLVER — minimax with alpha-beta pruning
// ═══════════════════════════════════════════════════════════════════════

function solveMove(board, player, connectCount = 4, maxDepth = 10) {
  const cols = board.length;
  const rows = board[0].length;
  const opponent = player === 1 ? 2 : 1;

  function getLowestRow(b, col) {
    for (let r = rows - 1; r >= 0; r--) {
      if (b[col][r] === 0) return r;
    }
    return -1;
  }

  function getValidCols(b) {
    const valid = [];
    for (let c = 0; c < cols; c++) {
      if (b[c][0] === 0) valid.push(c);
    }
    // Prefer center columns (better strategic position)
    valid.sort((a, bb) => Math.abs(a - Math.floor(cols / 2)) - Math.abs(bb - Math.floor(cols / 2)));
    return valid;
  }

  function checkWin(b, p) {
    // Horizontal
    for (let c = 0; c <= cols - connectCount; c++) {
      for (let r = 0; r < rows; r++) {
        let win = true;
        for (let k = 0; k < connectCount; k++) {
          if (b[c + k][r] !== p) { win = false; break; }
        }
        if (win) return true;
      }
    }
    // Vertical
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r <= rows - connectCount; r++) {
        let win = true;
        for (let k = 0; k < connectCount; k++) {
          if (b[c][r + k] !== p) { win = false; break; }
        }
        if (win) return true;
      }
    }
    // Diagonal down-right
    for (let c = 0; c <= cols - connectCount; c++) {
      for (let r = 0; r <= rows - connectCount; r++) {
        let win = true;
        for (let k = 0; k < connectCount; k++) {
          if (b[c + k][r + k] !== p) { win = false; break; }
        }
        if (win) return true;
      }
    }
    // Diagonal up-right
    for (let c = 0; c <= cols - connectCount; c++) {
      for (let r = connectCount - 1; r < rows; r++) {
        let win = true;
        for (let k = 0; k < connectCount; k++) {
          if (b[c + k][r - k] !== p) { win = false; break; }
        }
        if (win) return true;
      }
    }
    return false;
  }

  function isFull(b) {
    for (let c = 0; c < cols; c++) {
      if (b[c][0] === 0) return false;
    }
    return true;
  }

  function evaluate(b) {
    if (checkWin(b, player)) return 100000;
    if (checkWin(b, opponent)) return -100000;

    let score = 0;
    // Score based on piece positions (center is more valuable)
    const center = Math.floor(cols / 2);
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        if (b[c][r] === player) {
          score += (center + 1 - Math.abs(c - center)) * 3;
        } else if (b[c][r] === opponent) {
          score -= (center + 1 - Math.abs(c - center)) * 3;
        }
      }
    }

    // Score threats (sequences of N-1 with an open end)
    function countThreats(b, p, needed) {
      let threats = 0;
      // Horizontal
      for (let c = 0; c <= cols - connectCount; c++) {
        for (let r = 0; r < rows; r++) {
          let pCount = 0, empty = 0;
          for (let k = 0; k < connectCount; k++) {
            if (b[c + k][r] === p) pCount++;
            else if (b[c + k][r] === 0) empty++;
          }
          if (pCount === needed && empty === connectCount - needed) threats++;
        }
      }
      // Vertical
      for (let c = 0; c < cols; c++) {
        for (let r = 0; r <= rows - connectCount; r++) {
          let pCount = 0, empty = 0;
          for (let k = 0; k < connectCount; k++) {
            if (b[c][r + k] === p) pCount++;
            else if (b[c][r + k] === 0) empty++;
          }
          if (pCount === needed && empty === connectCount - needed) threats++;
        }
      }
      // Diagonals
      for (let c = 0; c <= cols - connectCount; c++) {
        for (let r = 0; r <= rows - connectCount; r++) {
          let pCount = 0, empty = 0;
          for (let k = 0; k < connectCount; k++) {
            if (b[c + k][r + k] === p) pCount++;
            else if (b[c + k][r + k] === 0) empty++;
          }
          if (pCount === needed && empty === connectCount - needed) threats++;
        }
      }
      for (let c = 0; c <= cols - connectCount; c++) {
        for (let r = connectCount - 1; r < rows; r++) {
          let pCount = 0, empty = 0;
          for (let k = 0; k < connectCount; k++) {
            if (b[c + k][r - k] === p) pCount++;
            else if (b[c + k][r - k] === 0) empty++;
          }
          if (pCount === needed && empty === connectCount - needed) threats++;
        }
      }
      return threats;
    }

    score += countThreats(b, player, connectCount - 1) * 50;
    score -= countThreats(b, opponent, connectCount - 1) * 50;
    score += countThreats(b, player, connectCount - 2) * 10;
    score -= countThreats(b, opponent, connectCount - 2) * 10;

    return score;
  }

  function cloneBoard(b) {
    return b.map(col => [...col]);
  }

  function minimax(b, depth, alpha, beta, maximizing) {
    if (checkWin(b, player)) return 100000 + depth;
    if (checkWin(b, opponent)) return -100000 - depth;
    if (isFull(b) || depth === 0) return evaluate(b);

    const validCols = getValidCols(b);
    if (maximizing) {
      let maxEval = -Infinity;
      for (const c of validCols) {
        const r = getLowestRow(b, c);
        if (r < 0) continue;
        b[c][r] = player;
        const ev = minimax(b, depth - 1, alpha, beta, false);
        b[c][r] = 0;
        maxEval = Math.max(maxEval, ev);
        alpha = Math.max(alpha, ev);
        if (beta <= alpha) break;
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const c of validCols) {
        const r = getLowestRow(b, c);
        if (r < 0) continue;
        b[c][r] = opponent;
        const ev = minimax(b, depth - 1, alpha, beta, true);
        b[c][r] = 0;
        minEval = Math.min(minEval, ev);
        beta = Math.min(beta, ev);
        if (beta <= alpha) break;
      }
      return minEval;
    }
  }

  // Find best move
  const validCols = getValidCols(board);
  let bestCol = validCols[0];
  let bestScore = -Infinity;

  // First check for immediate win
  for (const c of validCols) {
    const r = getLowestRow(board, c);
    if (r < 0) continue;
    board[c][r] = player;
    if (checkWin(board, player)) {
      board[c][r] = 0;
      return c;
    }
    board[c][r] = 0;
  }

  // Then check for immediate block
  for (const c of validCols) {
    const r = getLowestRow(board, c);
    if (r < 0) continue;
    board[c][r] = opponent;
    if (checkWin(board, opponent)) {
      board[c][r] = 0;
      return c;
    }
    board[c][r] = 0;
  }

  // Full minimax search
  for (const c of validCols) {
    const r = getLowestRow(board, c);
    if (r < 0) continue;
    const b = cloneBoard(board);
    b[c][r] = player;
    const score = minimax(b, maxDepth - 1, -Infinity, Infinity, false);
    if (score > bestScore) {
      bestScore = score;
      bestCol = c;
    }
  }

  return bestCol;
}

// Export for use in preview_eval
if (typeof window !== 'undefined') {
  window.__drop4Bot = {
    solveMove,
    version: '1.0',
  };
}

if (typeof module !== 'undefined') {
  module.exports = { solveMove };
}
