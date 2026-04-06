import { create } from 'zustand';
import { saveState, loadState } from '../services/storage';
import { useShopStore } from './shopStore';

export interface SeasonReward {
  tier: number;
  freeReward: { type: string; name: string; icon: string; id?: string } | null;
  premiumReward: { type: string; name: string; icon: string; id?: string } | null;
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
  claimedFreeTiers: number[];
  claimedPremiumTiers: number[];

  // Actions
  addSeasonXp: (amount: number) => void;
  claimReward: (tier: number) => void;
  claimFreeReward: (tier: number) => boolean;
  claimPremiumReward: (tier: number) => boolean;
  purchasePremium: () => boolean; // returns true if purchase successful
  isFreeClaimed: (tier: number) => boolean;
  isPremiumClaimed: (tier: number) => boolean;
  loadFromStorage: () => Promise<void>;
}

const SEASON_REWARDS: SeasonReward[] = [
  { tier: 1, freeReward: { type: 'coins', name: '100 Coins', icon: '🪙' }, premiumReward: { type: 'pieces', name: 'Chrome Pieces', icon: '🔴', id: 'chrome' } },
  { tier: 2, freeReward: { type: 'coins', name: '200 Coins', icon: '🪙' }, premiumReward: { type: 'board', name: 'Wood Board', icon: '🎨', id: 'wood' } },
  { tier: 3, freeReward: null, premiumReward: { type: 'emote', name: 'Dance Emote', icon: '💃', id: 'dancechestpump' } },
  { tier: 4, freeReward: { type: 'coins', name: '300 Coins', icon: '🪙' }, premiumReward: { type: 'dropEffect', name: 'Spark Drop', icon: '✨', id: 'sparks' } },
  { tier: 5, freeReward: { type: 'pieces', name: 'Fire & Ice', icon: '🔥', id: 'fire_ice' }, premiumReward: { type: 'board', name: 'Neon Board', icon: '🎨', id: 'neon' } },
  { tier: 6, freeReward: { type: 'coins', name: '500 Coins', icon: '🪙' }, premiumReward: { type: 'pet', name: 'Shiba Pet', icon: '🐕', id: 'shiba' } },
  { tier: 7, freeReward: null, premiumReward: { type: 'emote', name: 'Arms Raised', icon: '🙌', id: 'armsraised' } },
  { tier: 8, freeReward: { type: 'coins', name: '1000 Coins', icon: '🪙' }, premiumReward: { type: 'board', name: 'Galaxy Board', icon: '🌌', id: 'galaxy' } },
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
  claimedFreeTiers: [],
  claimedPremiumTiers: [],

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
    // Legacy — use claimFreeReward / claimPremiumReward instead
    get().claimFreeReward(tier);
  },

  claimFreeReward: (tier) => {
    const state = get();
    if (state.currentTier < tier) return false;
    if (state.claimedFreeTiers.includes(tier)) return false;
    const reward = state.rewards.find(r => r.tier === tier);
    if (!reward?.freeReward) return false;

    set({ claimedFreeTiers: [...state.claimedFreeTiers, tier] });
    return true;
  },

  claimPremiumReward: (tier) => {
    const state = get();
    if (state.currentTier < tier) return false;
    if (!state.hasPremium) return false;
    if (state.claimedPremiumTiers.includes(tier)) return false;
    const reward = state.rewards.find(r => r.tier === tier);
    if (!reward?.premiumReward) return false;

    set({ claimedPremiumTiers: [...state.claimedPremiumTiers, tier] });
    return true;
  },

  purchasePremium: () => {
    if (get().hasPremium) return false;
    const PREMIUM_GEM_COST = 100;
    const shopState = useShopStore.getState();
    if (shopState.gems < PREMIUM_GEM_COST) return false;
    useShopStore.getState().spendGems(PREMIUM_GEM_COST);
    set({ hasPremium: true });
    return true;
  },

  isFreeClaimed: (tier) => get().claimedFreeTiers.includes(tier),
  isPremiumClaimed: (tier) => get().claimedPremiumTiers.includes(tier),

  loadFromStorage: async () => {
    const saved = await loadState<{
      seasonNumber?: number;
      currentTier: number;
      xp: number;
      hasPremium: boolean;
      claimedFreeTiers?: number[];
      claimedPremiumTiers?: number[];
    }>('season');
    if (saved) {
      set({
        seasonNumber: saved.seasonNumber ?? 0,
        currentTier: saved.currentTier ?? 0,
        xp: saved.xp ?? 0,
        hasPremium: saved.hasPremium ?? false,
        claimedFreeTiers: saved.claimedFreeTiers ?? [],
        claimedPremiumTiers: saved.claimedPremiumTiers ?? [],
      });
    }
  },
}));

// Auto-save season progress
useSeasonStore.subscribe((state) => {
  saveState('season', {
    seasonNumber: state.seasonNumber,
    currentTier: state.currentTier,
    xp: state.xp,
    hasPremium: state.hasPremium,
    claimedFreeTiers: state.claimedFreeTiers,
    claimedPremiumTiers: state.claimedPremiumTiers,
  });
});
