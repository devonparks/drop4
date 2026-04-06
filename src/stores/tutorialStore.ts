import { create } from 'zustand';
import { saveState, loadState } from '../services/storage';
import { TUTORIAL_TIPS } from '../data/tutorials';

const TOTAL_TIPS = TUTORIAL_TIPS.length; // 10
const COMPLETION_REWARD = 100;

interface TutorialState {
  seenTips: string[];
  completionAwarded: boolean;

  hasSeenTip: (id: string) => boolean;
  markTipSeen: (id: string) => void;
  allTipsSeen: () => boolean;
  loadFromStorage: () => Promise<void>;
}

export const useTutorialStore = create<TutorialState>((set, get) => ({
  seenTips: [],
  completionAwarded: false,

  hasSeenTip: (id: string) => {
    return get().seenTips.includes(id);
  },

  markTipSeen: (id: string) => {
    const { seenTips, completionAwarded } = get();
    if (!seenTips.includes(id)) {
      const updated = [...seenTips, id];
      set({ seenTips: updated });

      // Check if all tips have been seen — award completion bonus once
      if (!completionAwarded && updated.length >= TOTAL_TIPS) {
        set({ completionAwarded: true });
        // Grant coins after a small delay so UI can show the celebration
        setTimeout(() => {
          try {
            const { useShopStore } = require('../stores/shopStore');
            useShopStore.getState().addCoins(COMPLETION_REWARD);
          } catch (_) { /* shop not loaded yet — coins skipped */ }
        }, 100);
      }
    }
  },

  allTipsSeen: () => {
    return get().seenTips.length >= TOTAL_TIPS;
  },

  loadFromStorage: async () => {
    const saved = await loadState<{ seenTips: string[]; completionAwarded?: boolean }>('tutorial');
    if (saved) {
      set({
        seenTips: saved.seenTips || [],
        completionAwarded: saved.completionAwarded || false,
      });
    }
  },
}));

// Auto-save
useTutorialStore.subscribe((state) => {
  saveState('tutorial', {
    seenTips: state.seenTips,
    completionAwarded: state.completionAwarded,
  });
});
