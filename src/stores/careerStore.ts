import { create } from 'zustand';
import { saveState, loadState } from '../services/storage';
import { useRosterStore } from './rosterStore';

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
    const wasAlreadyCompleted = !!current?.completed;

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

    // v1: only BOSS level completions unlock a playable character. Regular
    // career levels give coins/rewards but NOT character unlocks. This keeps
    // the roster tight (~9 playable characters) without needing 36 full
    // character renders. Career NPCs are visible on the node path but are
    // not collectible.
    //
    // The level data tells us if it's a boss via `isBoss` flag in careerLevels.
    // We import the level data lazily to check.
    if (!wasAlreadyCompleted) {
      try {
        const { ALL_CAREER_LEVELS } = require('../data/careerLevels');
        const level = ALL_CAREER_LEVELS.find((l: any) => l.id === levelId);
        if (level?.isBoss) {
          useRosterStore.getState().unlockForCareerLevel(levelId);
        }
      } catch (e) { /* careerLevels not loaded yet — skip */ }
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
