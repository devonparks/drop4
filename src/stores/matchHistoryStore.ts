import { create } from 'zustand';
import { saveState, loadState } from '../services/storage';

export interface MatchRecord {
  id: string;
  timestamp: number;
  result: 'win' | 'loss' | 'draw';
  opponent: string;
  difficulty: string;
  moves: number;
  coinsEarned: number;
  mode: 'ai' | 'local' | 'stage';
}

interface MatchHistoryState {
  matches: MatchRecord[];

  addMatch: (match: Omit<MatchRecord, 'id' | 'timestamp'>) => void;
  getRecentMatches: (count: number) => MatchRecord[];
  getStats: () => {
    totalGames: number;
    wins: number;
    losses: number;
    draws: number;
    winRate: number;
    totalCoinsEarned: number;
    avgMoves: number;
  };
  getMasteryStats: () => {
    easy: { wins: number; games: number; bestMoves: number };
    medium: { wins: number; games: number; bestMoves: number };
    hard: { wins: number; games: number; bestMoves: number };
  };
  getCurrentStreak: () => number;
  getFavoriteDifficulty: () => string;
  loadFromStorage: () => Promise<void>;
}

export const useMatchHistoryStore = create<MatchHistoryState>((set, get) => ({
  matches: [],

  addMatch: (match) => {
    const newMatch: MatchRecord = {
      ...match,
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      timestamp: Date.now(),
    };
    set(state => ({
      matches: [newMatch, ...state.matches].slice(0, 100), // Keep last 100
    }));
  },

  getRecentMatches: (count) => {
    return get().matches.slice(0, count);
  },

  getStats: () => {
    const { matches } = get();
    const wins = matches.filter(m => m.result === 'win').length;
    const losses = matches.filter(m => m.result === 'loss').length;
    const draws = matches.filter(m => m.result === 'draw').length;
    const total = matches.length;
    const totalCoins = matches.reduce((sum, m) => sum + m.coinsEarned, 0);
    const avgMoves = total > 0
      ? Math.round(matches.reduce((sum, m) => sum + m.moves, 0) / total)
      : 0;

    return {
      totalGames: total,
      wins,
      losses,
      draws,
      winRate: total > 0 ? Math.round((wins / total) * 100) : 0,
      totalCoinsEarned: totalCoins,
      avgMoves,
    };
  },

  getMasteryStats: () => {
    const { matches } = get();
    const aiMatches = matches.filter(m => m.mode === 'ai');
    const calc = (diff: string) => {
      const diffMatches = aiMatches.filter(m => m.difficulty === diff);
      const wins = diffMatches.filter(m => m.result === 'win').length;
      const winMatches = diffMatches.filter(m => m.result === 'win');
      const bestMoves = winMatches.length > 0
        ? Math.min(...winMatches.map(m => m.moves))
        : 0;
      return { wins, games: diffMatches.length, bestMoves };
    };
    return {
      easy: calc('easy'),
      medium: calc('medium'),
      hard: calc('hard'),
    };
  },

  getCurrentStreak: () => {
    const { matches } = get();
    let streak = 0;
    for (const m of matches) {
      if (m.result === 'win') streak++;
      else break;
    }
    return streak;
  },

  getFavoriteDifficulty: () => {
    const { matches } = get();
    const aiMatches = matches.filter(m => m.mode === 'ai');
    if (aiMatches.length === 0) return 'None';
    const counts: Record<string, number> = {};
    for (const m of aiMatches) {
      counts[m.difficulty] = (counts[m.difficulty] || 0) + 1;
    }
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    return top ? top[0].charAt(0).toUpperCase() + top[0].slice(1) : 'None';
  },

  loadFromStorage: async () => {
    const saved = await loadState<{ matches: MatchRecord[] }>('matchHistory');
    if (saved?.matches) {
      set({ matches: saved.matches });
    }
  },
}));

// Auto-save
useMatchHistoryStore.subscribe((state) => {
  saveState('matchHistory', { matches: state.matches });
});
