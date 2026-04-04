import { create } from 'zustand';
import { saveState, loadState } from '../services/storage';

export type RankedTier = 'bronze' | 'silver' | 'gold' | 'diamond' | 'darkmatter';

export interface RankedTierInfo {
  id: RankedTier;
  name: string;
  icon: string;
  minElo: number;
  color: string;
}

export const RANKED_TIERS: RankedTierInfo[] = [
  { id: 'bronze', name: 'Bronze', icon: '🥉', minElo: 0, color: '#cd7f32' },
  { id: 'silver', name: 'Silver', icon: '🥈', minElo: 800, color: '#c0c0c0' },
  { id: 'gold', name: 'Gold', icon: '🥇', minElo: 1200, color: '#f1c40f' },
  { id: 'diamond', name: 'Diamond', icon: '💎', minElo: 1600, color: '#3498db' },
  { id: 'darkmatter', name: 'Dark Matter', icon: '🌌', minElo: 2000, color: '#e94560' },
];

interface RankedState {
  elo: number;
  tier: RankedTier;
  rankedWins: number;
  rankedLosses: number;
  rankedGames: number;
  seasonHighElo: number;

  // Actions
  recordRankedResult: (won: boolean) => void;
  getTier: () => RankedTierInfo;
  getProgress: () => number; // 0-100% progress to next tier
  loadFromStorage: () => Promise<void>;
}

function eloFromRating(elo: number): RankedTier {
  for (let i = RANKED_TIERS.length - 1; i >= 0; i--) {
    if (elo >= RANKED_TIERS[i].minElo) return RANKED_TIERS[i].id;
  }
  return 'bronze';
}

export const useRankedStore = create<RankedState>((set, get) => ({
  elo: 500,
  tier: 'bronze',
  rankedWins: 0,
  rankedLosses: 0,
  rankedGames: 0,
  seasonHighElo: 500,

  recordRankedResult: (won) => {
    const { elo } = get();
    // Simple ELO calculation
    const kFactor = 32;
    const expectedScore = 1 / (1 + Math.pow(10, (1200 - elo) / 400));
    const actualScore = won ? 1 : 0;
    const newElo = Math.max(0, Math.round(elo + kFactor * (actualScore - expectedScore)));
    const newTier = eloFromRating(newElo);

    set(state => ({
      elo: newElo,
      tier: newTier,
      rankedWins: state.rankedWins + (won ? 1 : 0),
      rankedLosses: state.rankedLosses + (won ? 0 : 1),
      rankedGames: state.rankedGames + 1,
      seasonHighElo: Math.max(state.seasonHighElo, newElo),
    }));
  },

  getTier: () => {
    const tier = get().tier;
    return RANKED_TIERS.find(t => t.id === tier) || RANKED_TIERS[0];
  },

  getProgress: () => {
    const { elo } = get();
    const currentTierInfo = RANKED_TIERS.find(t => t.id === get().tier)!;
    const currentTierIdx = RANKED_TIERS.indexOf(currentTierInfo);
    const nextTier = RANKED_TIERS[currentTierIdx + 1];

    if (!nextTier) return 100; // Max tier
    const range = nextTier.minElo - currentTierInfo.minElo;
    const progress = elo - currentTierInfo.minElo;
    return Math.min(100, Math.round((progress / range) * 100));
  },

  loadFromStorage: async () => {
    const saved = await loadState<Partial<RankedState>>('ranked');
    if (saved) {
      set({
        elo: saved.elo ?? 500,
        tier: saved.tier ?? 'bronze',
        rankedWins: saved.rankedWins ?? 0,
        rankedLosses: saved.rankedLosses ?? 0,
        rankedGames: saved.rankedGames ?? 0,
        seasonHighElo: saved.seasonHighElo ?? 500,
      });
    }
  },
}));

// Auto-save
useRankedStore.subscribe((state) => {
  saveState('ranked', {
    elo: state.elo,
    tier: state.tier,
    rankedWins: state.rankedWins,
    rankedLosses: state.rankedLosses,
    rankedGames: state.rankedGames,
    seasonHighElo: state.seasonHighElo,
  });
});
