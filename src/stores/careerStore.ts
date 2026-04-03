import { create } from 'zustand';
import { saveState, loadState } from '../services/storage';

interface CareerProgress {
  [levelId: number]: {
    stars: number;      // 0-3
    completed: boolean;
    bestMoves: number;
  };
}

interface CareerState {
  progress: CareerProgress;
  currentChapter: number;

  // Actions
  completeLevel: (levelId: number, stars: number, moves: number) => void;
  getStars: (levelId: number) => number;
  isLevelUnlocked: (levelId: number) => boolean;
  getTotalStars: () => number;
  getCompletedCount: () => number;
  loadFromStorage: () => Promise<void>;
}

export const useCareerStore = create<CareerState>((set, get) => ({
  progress: {},
  currentChapter: 1,

  completeLevel: (levelId, stars, moves) => {
    const current = get().progress[levelId];
    // Only update if new stars are higher or level not yet completed
    if (!current || stars > current.stars || moves < current.bestMoves) {
      set(state => ({
        progress: {
          ...state.progress,
          [levelId]: {
            stars: Math.max(stars, current?.stars || 0),
            completed: true,
            bestMoves: current ? Math.min(moves, current.bestMoves) : moves,
          },
        },
      }));
    }
  },

  getStars: (levelId) => get().progress[levelId]?.stars || 0,

  isLevelUnlocked: (levelId) => {
    if (levelId === 1) return true; // First level always unlocked
    // Previous level must be completed
    return !!get().progress[levelId - 1]?.completed;
  },

  getTotalStars: () => {
    return Object.values(get().progress).reduce((sum, p) => sum + p.stars, 0);
  },

  getCompletedCount: () => {
    return Object.values(get().progress).filter(p => p.completed).length;
  },

  loadFromStorage: async () => {
    const saved = await loadState<{ progress: CareerProgress; currentChapter: number }>('career');
    if (saved) {
      set({ progress: saved.progress || {}, currentChapter: saved.currentChapter || 1 });
    }
  },
}));

// Auto-save
useCareerStore.subscribe((state) => {
  saveState('career', { progress: state.progress, currentChapter: state.currentChapter });
});
