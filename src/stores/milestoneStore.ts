/**
 * Milestone Store — tracks which collection milestones have been claimed.
 *
 * Stored separately from characterStore so wipe-and-rebuild of the milestone
 * catalog doesn't invalidate the player's progression. Also tracks custom
 * player titles unlocked via milestones.
 */

import { create } from 'zustand';
import { saveState, loadState } from '../services/storage';

interface MilestoneState {
  claimedIds: string[];
  unlockedTitles: string[];
  claim: (milestoneId: string) => void;
  unlockTitle: (titleId: string) => void;
  hasTitle: (titleId: string) => boolean;
  loadFromStorage: () => Promise<void>;
}

const STORAGE_KEY = 'drop4_milestones';

interface Persisted {
  claimedIds: string[];
  unlockedTitles: string[];
}

export const useMilestoneStore = create<MilestoneState>((set, get) => ({
  claimedIds: [],
  unlockedTitles: [],

  claim: (milestoneId) => {
    if (get().claimedIds.includes(milestoneId)) return;
    set((s) => ({ claimedIds: [...s.claimedIds, milestoneId] }));
    saveState(STORAGE_KEY, {
      claimedIds: get().claimedIds,
      unlockedTitles: get().unlockedTitles,
    });
  },

  unlockTitle: (titleId) => {
    if (get().unlockedTitles.includes(titleId)) return;
    set((s) => ({ unlockedTitles: [...s.unlockedTitles, titleId] }));
    saveState(STORAGE_KEY, {
      claimedIds: get().claimedIds,
      unlockedTitles: get().unlockedTitles,
    });
  },

  hasTitle: (titleId) => get().unlockedTitles.includes(titleId),

  loadFromStorage: async () => {
    const saved = await loadState<Persisted>(STORAGE_KEY);
    if (saved) {
      set({
        claimedIds: saved.claimedIds ?? [],
        unlockedTitles: saved.unlockedTitles ?? [],
      });
    }
  },
}));
