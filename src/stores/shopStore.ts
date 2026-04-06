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
    boardAccessory: string;
  };

  owned: {
    boards: string[];
    pieces: string[];
    dropEffects: string[];
    winAnimations: string[];
    boardAccessories: string[];
  };

  // Emote wheel — 6 equipped emote slots
  equippedEmotes: string[];

  // Equipped idle variant (null = base idle with random variants)
  equippedIdle: string | null;

  // Pets
  equippedPet: string | null;
  ownedPets: string[];

  // Level up celebration flag
  justLeveledUp: boolean;

  // Starter pack (one-time claim for new players)
  claimedStarterPack: boolean;

  // Actions
  addCoins: (amount: number) => void;
  spendCoins: (amount: number) => boolean;
  addXp: (amount: number) => void;
  clearLevelUp: () => void;
  addGems: (amount: number) => void;
  purchaseItem: (category: keyof ShopState['owned'], itemId: string, cost: number) => boolean;
  equipItem: (category: keyof ShopState['equipped'], itemId: string) => void;
  setEquippedEmote: (slot: number, emoteId: string) => void;
  setEquippedIdle: (idleId: string | null) => void;
  equipPet: (petId: string | null) => void;
  purchasePet: (petId: string, cost: number) => boolean;
  claimStarterPack: () => void;
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
    boardAccessory: 'none',
  },

  owned: {
    boards: ['default'],
    pieces: ['classic'],
    dropEffects: ['none'],
    winAnimations: ['basic'],
    boardAccessories: ['none'],
  },

  equippedEmotes: ['thumbsup', 'wave', 'dab', 'clapping', 'flexbiceps', 'laughpoint'],

  equippedIdle: null,

  equippedPet: null,
  ownedPets: [],

  justLeveledUp: false,
  claimedStarterPack: false,

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
    let didLevelUp = false;
    while (newXp >= newLevel * 100) {
      newXp -= newLevel * 100;
      newLevel++;
      didLevelUp = true;
    }
    set({ xp: newXp, level: newLevel, ...(didLevelUp ? { justLeveledUp: true } : {}) });
  },

  clearLevelUp: () => set({ justLeveledUp: false }),

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

  setEquippedEmote: (slot, emoteId) => {
    set((s) => {
      const newEmotes = [...s.equippedEmotes];
      if (slot >= 0 && slot < 6) {
        newEmotes[slot] = emoteId;
      }
      return { equippedEmotes: newEmotes };
    });
  },

  setEquippedIdle: (idleId) => set({ equippedIdle: idleId }),

  equipPet: (petId) => set({ equippedPet: petId }),

  purchasePet: (petId, cost) => {
    const state = get();
    if (state.coins < cost) return false;
    if (state.ownedPets.includes(petId)) return false;
    set((s) => ({
      coins: s.coins - cost,
      ownedPets: [...s.ownedPets, petId],
    }));
    return true;
  },

  claimStarterPack: () => {
    const state = get();
    if (state.claimedStarterPack) return;
    set((s) => ({
      claimedStarterPack: true,
      coins: s.coins + 500,
      ownedPets: s.ownedPets.includes('labrador') ? s.ownedPets : [...s.ownedPets, 'labrador'],
      equippedPet: 'labrador',
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
        equipped: {
          board: 'default',
          pieces: 'classic',
          dropEffect: 'none',
          winAnimation: 'basic',
          boardAccessory: 'none',
          ...saved.equipped,
        },
        owned: {
          boards: ['default'],
          pieces: ['classic'],
          dropEffects: ['none'],
          winAnimations: ['basic'],
          boardAccessories: ['none'],
          ...saved.owned,
        },
        equippedEmotes: saved.equippedEmotes ?? ['thumbsup', 'wave', 'dab', 'clapping', 'flexbiceps', 'laughpoint'],
        equippedIdle: saved.equippedIdle ?? null,
        equippedPet: saved.equippedPet ?? null,
        ownedPets: saved.ownedPets ?? [],
        claimedStarterPack: (saved as any).claimedStarterPack ?? false,
      });
    }
  },
}));

// ── Coin Milestone Helper ──
export interface CoinMilestone {
  coins: number;
  title: string;
  icon: string;
}

export const COIN_MILESTONES: CoinMilestone[] = [
  { coins: 1_000, title: 'Saver', icon: '\uD83D\uDCB0' },
  { coins: 5_000, title: 'Banker', icon: '\uD83C\uDFE6' },
  { coins: 10_000, title: 'Rich', icon: '\uD83D\uDCB5' },
  { coins: 50_000, title: 'Tycoon', icon: '\uD83D\uDC8E' },
  { coins: 100_000, title: 'Mogul', icon: '\uD83D\uDC51' },
];

/** Returns the player's current milestone title (highest achieved) and next goal */
export function getCoinMilestoneInfo(currentCoins: number): {
  currentTitle: string | null;
  currentIcon: string | null;
  nextMilestone: CoinMilestone | null;
  coinsToGo: number;
  progress: number; // 0-1 toward next milestone
} {
  let currentTitle: string | null = null;
  let currentIcon: string | null = null;
  let nextMilestone: CoinMilestone | null = null;
  let previousThreshold = 0;

  for (const ms of COIN_MILESTONES) {
    if (currentCoins >= ms.coins) {
      currentTitle = ms.title;
      currentIcon = ms.icon;
      previousThreshold = ms.coins;
    } else {
      nextMilestone = ms;
      break;
    }
  }

  const coinsToGo = nextMilestone ? nextMilestone.coins - currentCoins : 0;
  const range = nextMilestone ? nextMilestone.coins - previousThreshold : 1;
  const progress = nextMilestone
    ? Math.min((currentCoins - previousThreshold) / range, 1)
    : 1;

  return { currentTitle, currentIcon, nextMilestone, coinsToGo, progress };
}

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
    equippedEmotes: state.equippedEmotes,
    equippedIdle: state.equippedIdle,
    equippedPet: state.equippedPet,
    ownedPets: state.ownedPets,
    claimedStarterPack: state.claimedStarterPack,
  });
});
