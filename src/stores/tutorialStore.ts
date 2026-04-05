import { create } from 'zustand';
import { saveState, loadState } from '../services/storage';

interface TutorialState {
  seenTips: string[];

  hasSeenTip: (id: string) => boolean;
  markTipSeen: (id: string) => void;
  loadFromStorage: () => Promise<void>;
}

export const useTutorialStore = create<TutorialState>((set, get) => ({
  seenTips: [],

  hasSeenTip: (id: string) => {
    return get().seenTips.includes(id);
  },

  markTipSeen: (id: string) => {
    const { seenTips } = get();
    if (!seenTips.includes(id)) {
      set({ seenTips: [...seenTips, id] });
    }
  },

  loadFromStorage: async () => {
    const saved = await loadState<{ seenTips: string[] }>('tutorial');
    if (saved) {
      set({ seenTips: saved.seenTips || [] });
    }
  },
}));

// Auto-save
useTutorialStore.subscribe((state) => {
  saveState('tutorial', {
    seenTips: state.seenTips,
  });
});
