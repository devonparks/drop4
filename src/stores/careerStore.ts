import { create } from 'zustand';
import { saveState, loadState } from '../services/storage';
import { useRosterStore } from './rosterStore';

interface CareerProgress {
  [levelId: number]: {
    stars: number;      // 0-3
    completed: boolean;
    bestMoves: number;
    completedAt?: number; // epoch ms — when the level was first cleared
  };
}

/** Phase 2 power-piece unlock keys. Each chapter boss win unlocks
 *  the next power piece per the overhaul doc:
 *    Brooklyn (L12 Tommy)   → bomb
 *    Venice   (L24 Sal)     → rainbow
 *    Harlem   (L36 Warden)  → heavy
 *  Used as a stable id across the codebase — match against this
 *  union, not raw strings. */
export type PowerPieceId = 'bomb' | 'rainbow' | 'heavy';

interface CareerState {
  progress: CareerProgress;
  currentChapter: number;
  // Species unlocked by defeating chapter bosses. 'human' is always unlocked.
  unlockedSpecies: string[];
  // Phase 2 power pieces unlocked by chapter-boss wins. See PowerPieceId
  // for the per-boss mapping. Players get 1 use per match per piece in
  // career mode (set by GameScreen).
  unlockedPowerPieces: PowerPieceId[];
  // Set when the player beats a chapter boss. CityCompletionCeremony watches
  // this and shows the "CITY CLEARED" reveal. Cleared by acknowledgeCityComplete.
  cityCompletePending: null | {
    bossLevelId: number;
    chapter: number;
    speciesUnlocked: string[];
    powerPieceUnlocked: PowerPieceId | null;
  };

  // Actions
  completeLevel: (levelId: number, stars: number, moves: number) => void;
  getStars: (levelId: number) => number;
  isLevelUnlocked: (levelId: number) => boolean;
  getTotalStars: () => number;
  getCompletedCount: () => number;
  isSpeciesUnlocked: (species: string) => boolean;
  isPowerPieceUnlocked: (id: PowerPieceId) => boolean;
  acknowledgeCityComplete: () => void;
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

// Phase 2: which power piece unlocks at which boss level. Per the
// overhaul doc — Brooklyn → Bomb, Venice → Rainbow, Harlem → Heavy.
// Each piece is a "use once per match" career-only mechanic.
const BOSS_POWER_PIECE_UNLOCKS: Record<number, PowerPieceId> = {
  12: 'bomb',
  24: 'rainbow',
  36: 'heavy',
};

export const useCareerStore = create<CareerState>((set, get) => ({
  progress: {},
  currentChapter: 1,
  unlockedSpecies: ['human'],
  unlockedPowerPieces: [],
  cityCompletePending: null,

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
            completedAt: current?.completedAt ?? Date.now(),
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

      // Phase 2: power piece unlocks tied to chapter bosses. Persists
      // across sessions via the same auto-save subscriber below.
      const newPowerPiece = BOSS_POWER_PIECE_UNLOCKS[levelId];
      if (newPowerPiece) {
        set((state) => ({
          unlockedPowerPieces: state.unlockedPowerPieces.includes(newPowerPiece)
            ? state.unlockedPowerPieces
            : [...state.unlockedPowerPieces, newPowerPiece],
        }));
      }

      // Trigger the city-completion ceremony for chapter bosses. The reveal
      // is the Candy-Crush-style big moment — players should feel like they
      // CLEARED this city, not just "earned some coins on level 12."
      try {
        const { ALL_CAREER_LEVELS } = require('../data/careerLevels');
        const level = ALL_CAREER_LEVELS.find((l: any) => l.id === levelId);
        if (level?.isBoss) {
          set({
            cityCompletePending: {
              bossLevelId: levelId,
              chapter: level.chapter,
              speciesUnlocked: newSpecies ?? [],
              powerPieceUnlocked: newPowerPiece ?? null,
            },
          });
        }
      } catch (e) { /* level data not available, skip ceremony */ }
    }
  },

  acknowledgeCityComplete: () => set({ cityCompletePending: null }),

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
  isPowerPieceUnlocked: (id) => get().unlockedPowerPieces.includes(id),

  loadFromStorage: async () => {
    const saved = await loadState<{
      progress: CareerProgress;
      currentChapter: number;
      unlockedSpecies?: string[];
      unlockedPowerPieces?: PowerPieceId[];
    }>('career');
    if (saved) {
      const savedUnlocks = saved.unlockedSpecies ?? [];
      // Re-apply boss-based unlocks for completed bosses so older saves get
      // the new species lazily.
      const completedSpecies: string[] = [];
      const completedPowerPieces: PowerPieceId[] = [];
      for (const [lvl, species] of Object.entries(BOSS_UNLOCKS)) {
        if (saved.progress?.[Number(lvl)]?.completed) completedSpecies.push(...species);
      }
      for (const [lvl, piece] of Object.entries(BOSS_POWER_PIECE_UNLOCKS)) {
        if (saved.progress?.[Number(lvl)]?.completed) completedPowerPieces.push(piece);
      }
      set({
        progress: saved.progress || {},
        currentChapter: saved.currentChapter || 1,
        unlockedSpecies: Array.from(new Set(['human', ...savedUnlocks, ...completedSpecies])),
        unlockedPowerPieces: Array.from(new Set([...(saved.unlockedPowerPieces ?? []), ...completedPowerPieces])),
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
    unlockedPowerPieces: state.unlockedPowerPieces,
  });
});
