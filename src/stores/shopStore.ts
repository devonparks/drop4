import { create } from 'zustand';
import { saveState, loadState } from '../services/storage';

interface ShopState {
  playerName: string;
  coins: number;
  gems: number;
  level: number;
  xp: number;

  equipped: {
    board: string;
    pieces: string;
    dropEffect: string;
    winAnimation: string;
  };

  owned: {
    boards: string[];
    pieces: string[];
    dropEffects: string[];
    winAnimations: string[];
  };

  // Actions
  addCoins: (amount: number) => void;
  spendCoins: (amount: number) => boolean;
  addXp: (amount: number) => void;
  addGems: (amount: number) => void;
  purchaseItem: (category: keyof ShopState['owned'], itemId: string, cost: number) => boolean;
  equipItem: (category: keyof ShopState['equipped'], itemId: string) => void;
  setPlayerName: (name: string) => void;
  loadFromStorage: () => Promise<void>;
}

export const useShopStore = create<ShopState>((set, get) => ({
  playerName: 'Player',
  coins: 500,
  gems: 0,
  level: 1,
  xp: 0,

  equipped: {
    board: 'default',
    pieces: 'classic',
    dropEffect: 'none',
    winAnimation: 'basic',
  },

  owned: {
    boards: ['default'],
    pieces: ['classic'],
    dropEffects: ['none'],
    winAnimations: ['basic'],
  },

  addCoins: (amount) => set((s) => ({ coins: s.coins + amount })),

  spendCoins: (amount) => {
    if (get().coins < amount) return false;
    set((s) => ({ coins: s.coins - amount }));
    return true;
  },

  addGems: (amount: number) => set((s) => ({ gems: s.gems + amount })),

  addXp: (amount) => {
    const state = get();
    let newXp = state.xp + amount;
    let newLevel = state.level;
    const xpPerLevel = newLevel * 100;
    while (newXp >= xpPerLevel) {
      newXp -= xpPerLevel;
      newLevel++;
    }
    set({ xp: newXp, level: newLevel });
  },

  purchaseItem: (category, itemId, cost) => {
    const state = get();
    if (state.coins < cost) return false;
    if (state.owned[category].includes(itemId)) return false;
    set((s) => ({
      coins: s.coins - cost,
      owned: {
        ...s.owned,
        [category]: [...s.owned[category], itemId],
      },
    }));
    return true;
  },

  equipItem: (category, itemId) => {
    set((s) => ({
      equipped: { ...s.equipped, [category]: itemId },
    }));
  },

  setPlayerName: (name) => set({ playerName: name }),

  loadFromStorage: async () => {
    const saved = await loadState<Partial<ShopState>>('shop');
    if (saved) {
      set({
        playerName: saved.playerName ?? 'Player',
        coins: saved.coins ?? 500,
        gems: saved.gems ?? 0,
        level: saved.level ?? 1,
        xp: saved.xp ?? 0,
        equipped: saved.equipped ?? { board: 'default', pieces: 'classic', dropEffect: 'none', winAnimation: 'basic' },
        owned: saved.owned ?? { boards: ['default'], pieces: ['classic'], dropEffects: ['none'], winAnimations: ['basic'] },
      });
    }
  },
}));

// Auto-save on every state change
useShopStore.subscribe((state) => {
  saveState('shop', {
    playerName: state.playerName,
    coins: state.coins,
    gems: state.gems,
    level: state.level,
    xp: state.xp,
    equipped: state.equipped,
    owned: state.owned,
  });
});
