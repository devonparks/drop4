import { create } from 'zustand';

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
}));
