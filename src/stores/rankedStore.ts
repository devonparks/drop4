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

// Underdog odds system — calculates payout multiplier based on MMR gap
export function calculateOdds(playerElo: number, opponentElo: number): {
  playerOdds: string;    // e.g., "+300" (underdog) or "-150" (favorite)
  opponentOdds: string;
  coinMultiplier: number; // How much extra coins underdog wins
  rankMultiplier: number; // How much extra rank points underdog earns
} {
  const gap = opponentElo - playerElo;
  const absGap = Math.abs(gap);

  // Positive gap = player is underdog
  if (gap > 0) {
    // Player is underdog
    const odds = Math.round(100 + absGap * 0.5);
    return {
      playerOdds: `+${odds}`,
      opponentOdds: `-${Math.round(100 + absGap * 0.3)}`,
      coinMultiplier: 1 + absGap / 400,  // up to 2.5x at 600 gap
      rankMultiplier: 1 + absGap / 300,   // up to 3x at 600 gap
    };
  } else if (gap < 0) {
    // Player is favorite
    const odds = Math.round(100 + absGap * 0.3);
    return {
      playerOdds: `-${odds}`,
      opponentOdds: `+${Math.round(100 + absGap * 0.5)}`,
      coinMultiplier: Math.max(0.5, 1 - absGap / 800),  // down to 0.5x
      rankMultiplier: Math.max(0.5, 1 - absGap / 600),
    };
  }

  return { playerOdds: 'EVEN', opponentOdds: 'EVEN', coinMultiplier: 1, rankMultiplier: 1 };
}

interface RankedState {
  elo: number;
  tier: RankedTier;
  rankedWins: number;
  rankedLosses: number;
  rankedGames: number;
  seasonHighElo: number;
  currentSeason: number;
  seasonHistory: { season: number; elo: number; tier: RankedTier; wins: number; losses: number }[];

  // Chess clock state (for ranked games)
  player1TimeBank: number; // seconds remaining
  player2TimeBank: number;
  activeClockPlayer: 1 | 2 | null;

  // Actions
  recordRankedResult: (won: boolean, eloGain?: number) => void;
  getTier: () => RankedTierInfo;
  getProgress: () => number;
  startChessClock: (totalSeconds: number) => void;
  switchClock: (toPlayer: 1 | 2) => void;
  tickClock: () => { expired: boolean; player: 1 | 2 | null };
  resetSeason: () => void;
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
  currentSeason: 0,
  seasonHistory: [],
  player1TimeBank: 180,
  player2TimeBank: 180,
  activeClockPlayer: null,

  recordRankedResult: (won, eloGain) => {
    const { elo } = get();
    let newElo: number;

    if (eloGain !== undefined) {
      newElo = Math.max(0, elo + (won ? eloGain : -eloGain));
    } else {
      const kFactor = 32;
      const expectedScore = 1 / (1 + Math.pow(10, (1200 - elo) / 400));
      const actualScore = won ? 1 : 0;
      newElo = Math.max(0, Math.round(elo + kFactor * (actualScore - expectedScore)));
    }

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
    if (!nextTier) return 100;
    const range = nextTier.minElo - currentTierInfo.minElo;
    const progress = elo - currentTierInfo.minElo;
    return Math.min(100, Math.round((progress / range) * 100));
  },

  // Chess clock for ranked mode
  startChessClock: (totalSeconds) => set({
    player1TimeBank: totalSeconds,
    player2TimeBank: totalSeconds,
    activeClockPlayer: 1,
  }),

  switchClock: (toPlayer) => set({ activeClockPlayer: toPlayer }),

  tickClock: () => {
    const { activeClockPlayer, player1TimeBank, player2TimeBank } = get();
    if (!activeClockPlayer) return { expired: false, player: null };

    if (activeClockPlayer === 1) {
      const newTime = player1TimeBank - 1;
      set({ player1TimeBank: Math.max(0, newTime) });
      return { expired: newTime <= 0, player: 1 };
    } else {
      const newTime = player2TimeBank - 1;
      set({ player2TimeBank: Math.max(0, newTime) });
      return { expired: newTime <= 0, player: 2 };
    }
  },

  resetSeason: () => {
    const state = get();
    const history = [...state.seasonHistory, {
      season: state.currentSeason,
      elo: state.elo,
      tier: state.tier,
      wins: state.rankedWins,
      losses: state.rankedLosses,
    }];

    set({
      elo: 500,
      tier: 'bronze',
      rankedWins: 0,
      rankedLosses: 0,
      rankedGames: 0,
      seasonHighElo: 500,
      currentSeason: state.currentSeason + 1,
      seasonHistory: history,
    });
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
        currentSeason: saved.currentSeason ?? 0,
        seasonHistory: saved.seasonHistory ?? [],
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
    currentSeason: state.currentSeason,
    seasonHistory: state.seasonHistory,
  });
});
