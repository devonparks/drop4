import { create } from 'zustand';
import { saveState, loadState } from '../services/storage';
import { Board, Player, Difficulty } from './gameStore';

export interface ReplayMove {
  col: number;
  player: Player;
  moveNumber: number;
}

export interface Replay {
  id: string;
  timestamp: number;
  moves: ReplayMove[];
  result: 'win' | 'loss' | 'draw';
  difficulty: Difficulty;
  opponent: string;
  totalMoves: number;
  boardRows: number;
  boardCols: number;
  connectCount: number;
  starred: boolean;
}

interface ReplayState {
  // Current game recording
  currentMoves: ReplayMove[];
  isRecording: boolean;

  // Saved replays
  replays: Replay[];

  // Actions
  startRecording: () => void;
  recordMove: (col: number, player: Player, moveNumber: number) => void;
  saveReplay: (result: 'win' | 'loss' | 'draw', difficulty: Difficulty, opponent: string,
    rows: number, cols: number, connectCount: number) => void;
  deleteReplay: (id: string) => void;
  toggleStar: (id: string) => void;
  getRecentReplays: (count: number) => Replay[];
  getStarredReplays: () => Replay[];
  loadFromStorage: () => Promise<void>;
}

export const useReplayStore = create<ReplayState>((set, get) => ({
  currentMoves: [],
  isRecording: false,
  replays: [],

  startRecording: () => set({ currentMoves: [], isRecording: true }),

  recordMove: (col, player, moveNumber) => {
    if (!get().isRecording) return;
    set(state => ({
      currentMoves: [...state.currentMoves, { col, player, moveNumber }],
    }));
  },

  saveReplay: (result, difficulty, opponent, rows, cols, connectCount) => {
    const { currentMoves } = get();
    if (currentMoves.length === 0) return;

    const replay: Replay = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      timestamp: Date.now(),
      moves: [...currentMoves],
      result,
      difficulty,
      opponent,
      totalMoves: currentMoves.length,
      boardRows: rows,
      boardCols: cols,
      connectCount,
      starred: false,
    };

    set(state => ({
      replays: [replay, ...state.replays].slice(0, 50), // Keep last 50
      currentMoves: [],
      isRecording: false,
    }));
  },

  deleteReplay: (id) => {
    set(state => ({
      replays: state.replays.filter(r => r.id !== id),
    }));
  },

  toggleStar: (id) => {
    set(state => ({
      replays: state.replays.map(r =>
        r.id === id ? { ...r, starred: !r.starred } : r
      ),
    }));
  },

  getRecentReplays: (count) => get().replays.slice(0, count),

  getStarredReplays: () => get().replays.filter(r => r.starred),

  loadFromStorage: async () => {
    const saved = await loadState<{ replays: Replay[] }>('replays');
    if (saved?.replays) {
      set({ replays: saved.replays });
    }
  },
}));

// Auto-save
useReplayStore.subscribe((state) => {
  saveState('replays', { replays: state.replays });
});
