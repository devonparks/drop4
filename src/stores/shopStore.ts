import { create } from 'zustand';

interface ShopState {
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
  purchaseItem: (category: keyof ShopState['owned'], itemId: string, cost: number) => boolean;
  equipItem: (category: keyof ShopState['equipped'], itemId: string) => void;
}

export const useShopStore = create<ShopState>((set, get) => ({
  coins: 2450,
  gems: 850,
  level: 16,
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
}));
