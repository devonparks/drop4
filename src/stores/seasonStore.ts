import { create } from 'zustand';
import { saveState, loadState } from '../services/storage';

export interface SeasonReward {
  tier: number;
  freeReward: { type: string; name: string; icon: string } | null;
  premiumReward: { type: string; name: string; icon: string } | null;
}

interface SeasonState {
  seasonNumber: number;
  seasonName: string;
  currentTier: number;
  maxTier: number;
  xp: number;
  xpPerTier: number;
  hasPremium: boolean;
  rewards: SeasonReward[];

  // Actions
  addSeasonXp: (amount: number) => void;
  claimReward: (tier: number) => void;
  loadFromStorage: () => Promise<void>;
}

const SEASON_REWARDS: SeasonReward[] = [
  { tier: 1, freeReward: { type: 'coins', name: '100 Coins', icon: '🪙' }, premiumReward: { type: 'skin', name: 'Chrome Pieces', icon: '🔴' } },
  { tier: 2, freeReward: { type: 'coins', name: '200 Coins', icon: '🪙' }, premiumReward: { type: 'board', name: 'Wood Board', icon: '🎨' } },
  { tier: 3, freeReward: null, premiumReward: { type: 'emote', name: 'Dance Emote', icon: '💃' } },
  { tier: 4, freeReward: { type: 'coins', name: '300 Coins', icon: '🪙' }, premiumReward: { type: 'effect', name: 'Spark Drop', icon: '✨' } },
  { tier: 5, freeReward: { type: 'skin', name: 'Fire & Ice', icon: '🔥' }, premiumReward: { type: 'board', name: 'Neon Board', icon: '🎨' } },
  { tier: 6, freeReward: { type: 'coins', name: '500 Coins', icon: '🪙' }, premiumReward: { type: 'skin', name: 'Neon Pieces', icon: '💜' } },
  { tier: 7, freeReward: null, premiumReward: { type: 'emote', name: 'Crown Pose', icon: '👑' } },
  { tier: 8, freeReward: { type: 'coins', name: '1000 Coins', icon: '🪙' }, premiumReward: { type: 'board', name: 'Galaxy Board', icon: '🌌' } },
];

export const useSeasonStore = create<SeasonState>((set, get) => ({
  seasonNumber: 0,
  seasonName: 'Season 0: Launch',
  currentTier: 0,
  maxTier: 8,
  xp: 0,
  xpPerTier: 500,
  hasPremium: false,
  rewards: SEASON_REWARDS,

  addSeasonXp: (amount) => {
    const state = get();
    let newXp = state.xp + amount;
    let newTier = state.currentTier;

    while (newXp >= state.xpPerTier && newTier < state.maxTier) {
      newXp -= state.xpPerTier;
      newTier++;
    }

    set({ xp: newXp, currentTier: newTier });
  },

  claimReward: (tier) => {
    const reward = get().rewards.find(r => r.tier === tier);
    if (!reward) return;

    // Grant the free reward
    if (reward.freeReward && get().currentTier >= tier) {
      if (reward.freeReward.type === 'coins') {
        // Coins handled by the caller (ShopStore.addCoins)
      }
      // Skins/boards added via shopStore by the caller
    }

    // Grant premium reward if player has premium
    if (reward.premiumReward && get().hasPremium && get().currentTier >= tier) {
      // Skins/boards/emotes added via shopStore by the caller
    }
  },

  loadFromStorage: async () => {
    const saved = await loadState<{ currentTier: number; xp: number; hasPremium: boolean }>('season');
    if (saved) {
      set({
        currentTier: saved.currentTier ?? 0,
        xp: saved.xp ?? 0,
        hasPremium: saved.hasPremium ?? false,
      });
    }
  },
}));

// Auto-save season progress
useSeasonStore.subscribe((state) => {
  saveState('season', {
    currentTier: state.currentTier,
    xp: state.xp,
    hasPremium: state.hasPremium,
  });
});
