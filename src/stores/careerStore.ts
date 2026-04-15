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
  // Species unlocked by defeating chapter bosses. 'human' is always unlocked.
  unlockedSpecies: string[];

  // Actions
  completeLevel: (levelId: number, stars: number, moves: number) => void;
  getStars: (levelId: number) => number;
  isLevelUnlocked: (levelId: number) => boolean;
  getTotalStars: () => number;
  getCompletedCount: () => number;
  isSpeciesUnlocked: (species: string) => boolean;
  loadFromStorage: () => Promise<void>;
}

// Which species unlocks at which boss level.
// Chapter 1 boss (lvl 12) → Elves (neighborhood rivals).
// Chapter 2 boss (lvl 24) → Goblin (underbelly crew).
// Chapter 3 boss (lvl 36) → Skeleton + Zombie (endgame).
const BOSS_UNLOCKS: Record<number, string[]> = {
  12: ['elves'],
  24: ['goblin'],
  36: ['skeleton', 'zombie'],
};

export const useCareerStore = create<CareerState>((set, get) => ({
  progress: {},
  currentChapter: 1,
  unlockedSpecies: ['human'],

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

      // Species unlocks tied to chapter bosses
      const newSpecies = BOSS_UNLOCKS[levelId];
      if (newSpecies) {
        set((state) => ({
          unlockedSpecies: Array.from(new Set([...state.unlockedSpecies, ...newSpecies])),
        }));
      }
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

  isSpeciesUnlocked: (species) => get().unlockedSpecies.includes(species),

  loadFromStorage: async () => {
    const saved = await loadState<{
      progress: CareerProgress;
      currentChapter: number;
      unlockedSpecies?: string[];
    }>('career');
    if (saved) {
      const savedUnlocks = saved.unlockedSpecies ?? [];
      // Re-apply boss-based unlocks for completed bosses so older saves get
      // the new species lazily.
      const completedSpecies: string[] = [];
      for (const [lvl, species] of Object.entries(BOSS_UNLOCKS)) {
        if (saved.progress?.[Number(lvl)]?.completed) completedSpecies.push(...species);
      }
      set({
        progress: saved.progress || {},
        currentChapter: saved.currentChapter || 1,
        unlockedSpecies: Array.from(new Set(['human', ...savedUnlocks, ...completedSpecies])),
      });
    }
  },
}));

// Auto-save
useCareerStore.subscribe((state) => {
  saveState('career', {
    progress: state.progress,
    currentChapter: state.currentChapter,
    unlockedSpecies: state.unlockedSpecies,
  });
});
