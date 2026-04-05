import { create } from 'zustand';
import { saveState, loadState } from '../services/storage';

// ═══════════════════════════════════════════════════════
// 10-TIER RANKED SYSTEM (Rocket League / LoL inspired)
// Iron → Bronze → Silver → Gold → Platinum → Diamond →
// Master → Grandmaster → Champion → Dark Matter
// ═══════════════════════════════════════════════════════

export type RankedTier =
  | 'iron'
  | 'bronze'
  | 'silver'
  | 'gold'
  | 'platinum'
  | 'diamond'
  | 'master'
  | 'grandmaster'
  | 'champion'
  | 'darkmatter';

export interface RankedTierInfo {
  id: RankedTier;
  name: string;
  icon: string;
  minElo: number;
  color: string;
  /** Number of divisions within this tier (3 = Div III/II/I, 1 = no divisions) */
  divisions: number;
}

export const RANKED_TIERS: RankedTierInfo[] = [
  { id: 'iron',         name: 'Iron',         icon: '⚙️', minElo: 0,    color: '#7a7a7a', divisions: 3 },
  { id: 'bronze',       name: 'Bronze',       icon: '🥉', minElo: 300,  color: '#cd7f32', divisions: 3 },
  { id: 'silver',       name: 'Silver',       icon: '🥈', minElo: 600,  color: '#c0c0c0', divisions: 3 },
  { id: 'gold',         name: 'Gold',         icon: '🥇', minElo: 900,  color: '#f1c40f', divisions: 3 },
  { id: 'platinum',     name: 'Platinum',     icon: '💠', minElo: 1200, color: '#00cec9', divisions: 3 },
  { id: 'diamond',      name: 'Diamond',      icon: '💎', minElo: 1500, color: '#3498db', divisions: 3 },
  { id: 'master',       name: 'Master',       icon: '🏅', minElo: 1800, color: '#9b59b6', divisions: 1 },
  { id: 'grandmaster',  name: 'Grandmaster',  icon: '👑', minElo: 2100, color: '#e67e22', divisions: 1 },
  { id: 'champion',     name: 'Champion',     icon: '🏆', minElo: 2400, color: '#e74c3c', divisions: 1 },
  { id: 'darkmatter',   name: 'Dark Matter',  icon: '🌌', minElo: 2700, color: '#e94560', divisions: 1 },
];

/** Number of placement matches before regular MMR kicks in */
export const PLACEMENT_MATCH_COUNT = 10;

// ═══ UNDERDOG ODDS ═══
export function calculateOdds(playerElo: number, opponentElo: number): {
  playerOdds: string;
  opponentOdds: string;
  coinMultiplier: number;
  rankMultiplier: number;
} {
  const gap = opponentElo - playerElo;
  const absGap = Math.abs(gap);

  if (gap > 0) {
    // Player is underdog
    const odds = Math.round(100 + absGap * 0.5);
    return {
      playerOdds: `+${odds}`,
      opponentOdds: `-${Math.round(100 + absGap * 0.3)}`,
      coinMultiplier: 1 + absGap / 400,
      rankMultiplier: 1 + absGap / 300,
    };
  } else if (gap < 0) {
    // Player is favorite
    const odds = Math.round(100 + absGap * 0.3);
    return {
      playerOdds: `-${odds}`,
      opponentOdds: `+${Math.round(100 + absGap * 0.5)}`,
      coinMultiplier: Math.max(0.5, 1 - absGap / 800),
      rankMultiplier: Math.max(0.5, 1 - absGap / 600),
    };
  }

  return { playerOdds: 'EVEN', opponentOdds: 'EVEN', coinMultiplier: 1, rankMultiplier: 1 };
}

// ═══ HELPER — get tier from raw ELO ═══
function eloToTier(elo: number): RankedTier {
  for (let i = RANKED_TIERS.length - 1; i >= 0; i--) {
    if (elo >= RANKED_TIERS[i].minElo) return RANKED_TIERS[i].id;
  }
  return 'iron';
}

/** Get division within a tier (3 = lowest, 1 = highest). Master+ always returns 1. */
export function getDivision(elo: number): number {
  const tierInfo = RANKED_TIERS.find(t => t.id === eloToTier(elo))!;
  if (tierInfo.divisions === 1) return 1;

  const tierIdx = RANKED_TIERS.indexOf(tierInfo);
  const nextTier = RANKED_TIERS[tierIdx + 1];
  const tierRange = nextTier ? nextTier.minElo - tierInfo.minElo : 300;
  const divisionSize = tierRange / tierInfo.divisions;
  const progressInTier = elo - tierInfo.minElo;

  // Div 3 (0-33%), Div 2 (33-66%), Div 1 (66-100%)
  const divIndex = Math.min(tierInfo.divisions - 1, Math.floor(progressInTier / divisionSize));
  return tierInfo.divisions - divIndex; // 3 → 2 → 1
}

/** Get progress (0-100) within the current division, not just the tier */
export function getDivisionProgress(elo: number): number {
  const tierInfo = RANKED_TIERS.find(t => t.id === eloToTier(elo))!;
  const tierIdx = RANKED_TIERS.indexOf(tierInfo);
  const nextTier = RANKED_TIERS[tierIdx + 1];
  const tierRange = nextTier ? nextTier.minElo - tierInfo.minElo : 300;

  if (tierInfo.divisions === 1) {
    // Master+ → progress across entire tier
    if (!nextTier) return 100;
    const progress = elo - tierInfo.minElo;
    return Math.min(100, Math.round((progress / tierRange) * 100));
  }

  const divisionSize = tierRange / tierInfo.divisions;
  const progressInTier = elo - tierInfo.minElo;
  const progressInDiv = progressInTier % divisionSize;
  return Math.min(100, Math.round((progressInDiv / divisionSize) * 100));
}

/** Format tier + division as a readable string, e.g. "Gold II" or "Master" */
export function formatRank(elo: number): string {
  const tierInfo = RANKED_TIERS.find(t => t.id === eloToTier(elo))!;
  const div = getDivision(elo);
  if (tierInfo.divisions === 1) return tierInfo.name;
  const romanNumerals = ['', 'I', 'II', 'III'];
  return `${tierInfo.name} ${romanNumerals[div]}`;
}

// ═══ STORE ═══

interface RankedState {
  elo: number;
  tier: RankedTier;
  division: number;
  rankedWins: number;
  rankedLosses: number;
  rankedGames: number;
  seasonHighElo: number;
  currentSeason: number;
  seasonHistory: { season: number; elo: number; tier: RankedTier; wins: number; losses: number }[];

  // Placement system
  placementGamesPlayed: number;
  placementWins: number;
  isPlacing: boolean;

  // Streak tracking
  currentStreak: number; // positive = win streak, negative = lose streak

  // Chess clock state (for ranked games)
  player1TimeBank: number;
  player2TimeBank: number;
  activeClockPlayer: 1 | 2 | null;

  // Actions
  recordRankedResult: (won: boolean, eloGain?: number) => void;
  getTier: () => RankedTierInfo;
  getDivision: () => number;
  getProgress: () => number;
  getFormattedRank: () => string;
  getStreakMultiplier: () => number;
  startChessClock: (totalSeconds: number) => void;
  switchClock: (toPlayer: 1 | 2) => void;
  tickClock: () => { expired: boolean; player: 1 | 2 | null };
  resetSeason: () => void;
  loadFromStorage: () => Promise<void>;
}

export const useRankedStore = create<RankedState>((set, get) => ({
  elo: 500,
  tier: 'iron',
  division: 2,
  rankedWins: 0,
  rankedLosses: 0,
  rankedGames: 0,
  seasonHighElo: 500,
  currentSeason: 0,
  seasonHistory: [],

  // Placement
  placementGamesPlayed: 0,
  placementWins: 0,
  isPlacing: true,

  // Streaks
  currentStreak: 0,

  // Chess clock
  player1TimeBank: 180,
  player2TimeBank: 180,
  activeClockPlayer: null,

  recordRankedResult: (won, eloGain) => {
    const state = get();
    const { elo, isPlacing, placementGamesPlayed, currentStreak } = state;

    // ═══ Calculate K-factor ═══
    // During placement: 2x K-factor for faster calibration
    // After placement: standard K-factor
    let kFactor = 32;
    if (isPlacing) kFactor = 64;

    // ═══ Streak bonus ═══
    // 3+ win streak = 1.5x MMR gain, 5+ = 2x
    let streakMultiplier = 1;
    if (won && currentStreak >= 4) {
      // Will be 5+ after recording
      streakMultiplier = 2;
    } else if (won && currentStreak >= 2) {
      // Will be 3+ after recording
      streakMultiplier = 1.5;
    }

    // ═══ Calculate new ELO ═══
    let newElo: number;
    if (eloGain !== undefined) {
      const adjustedGain = Math.round(eloGain * streakMultiplier);
      newElo = Math.max(0, elo + (won ? adjustedGain : -eloGain));
    } else {
      const expectedScore = 1 / (1 + Math.pow(10, (1200 - elo) / 400));
      const actualScore = won ? 1 : 0;
      const rawChange = kFactor * (actualScore - expectedScore);
      const change = won ? Math.round(rawChange * streakMultiplier) : Math.round(rawChange);
      newElo = Math.max(0, elo + change);
    }

    const newTier = eloToTier(newElo);
    const newDivision = getDivision(newElo);

    // ═══ Update streak ═══
    let newStreak: number;
    if (won) {
      newStreak = currentStreak >= 0 ? currentStreak + 1 : 1;
    } else {
      newStreak = currentStreak <= 0 ? currentStreak - 1 : -1;
    }

    // ═══ Placement tracking ═══
    const newPlacementGames = isPlacing ? placementGamesPlayed + 1 : placementGamesPlayed;
    const newPlacementWins = isPlacing && won ? state.placementWins + 1 : state.placementWins;
    const doneWithPlacement = isPlacing && newPlacementGames >= PLACEMENT_MATCH_COUNT;

    set({
      elo: newElo,
      tier: newTier,
      division: newDivision,
      rankedWins: state.rankedWins + (won ? 1 : 0),
      rankedLosses: state.rankedLosses + (won ? 0 : 1),
      rankedGames: state.rankedGames + 1,
      seasonHighElo: Math.max(state.seasonHighElo, newElo),
      currentStreak: newStreak,
      placementGamesPlayed: newPlacementGames,
      placementWins: newPlacementWins,
      isPlacing: doneWithPlacement ? false : state.isPlacing,
    });
  },

  getTier: () => {
    const tier = get().tier;
    return RANKED_TIERS.find(t => t.id === tier) || RANKED_TIERS[0];
  },

  getDivision: () => {
    return getDivision(get().elo);
  },

  /** Progress within current division (0-100) */
  getProgress: () => {
    return getDivisionProgress(get().elo);
  },

  getFormattedRank: () => {
    return formatRank(get().elo);
  },

  /** Returns the current streak multiplier for display (1x / 1.5x / 2x) */
  getStreakMultiplier: () => {
    const streak = get().currentStreak;
    if (streak >= 5) return 2;
    if (streak >= 3) return 1.5;
    return 1;
  },

  // ═══ Chess clock for ranked mode ═══
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

    // Soft reset: start 200 ELO higher than base to reward previous rank
    const softResetElo = Math.max(400, Math.round(state.elo * 0.4 + 300));

    set({
      elo: softResetElo,
      tier: eloToTier(softResetElo),
      division: getDivision(softResetElo),
      rankedWins: 0,
      rankedLosses: 0,
      rankedGames: 0,
      seasonHighElo: softResetElo,
      currentSeason: state.currentSeason + 1,
      seasonHistory: history,
      placementGamesPlayed: 0,
      placementWins: 0,
      isPlacing: true,
      currentStreak: 0,
    });
  },

  loadFromStorage: async () => {
    const saved = await loadState<Partial<RankedState>>('ranked');
    if (saved) {
      const elo = saved.elo ?? 500;
      set({
        elo,
        tier: saved.tier ?? eloToTier(elo),
        division: getDivision(elo),
        rankedWins: saved.rankedWins ?? 0,
        rankedLosses: saved.rankedLosses ?? 0,
        rankedGames: saved.rankedGames ?? 0,
        seasonHighElo: saved.seasonHighElo ?? elo,
        currentSeason: saved.currentSeason ?? 0,
        seasonHistory: saved.seasonHistory ?? [],
        placementGamesPlayed: saved.placementGamesPlayed ?? 0,
        placementWins: saved.placementWins ?? 0,
        isPlacing: saved.isPlacing ?? (saved.rankedGames ?? 0) < PLACEMENT_MATCH_COUNT,
        currentStreak: saved.currentStreak ?? 0,
      });
    }
  },
}));

// ═══ AUTO-SAVE ═══
useRankedStore.subscribe((state) => {
  saveState('ranked', {
    elo: state.elo,
    tier: state.tier,
    division: state.division,
    rankedWins: state.rankedWins,
    rankedLosses: state.rankedLosses,
    rankedGames: state.rankedGames,
    seasonHighElo: state.seasonHighElo,
    currentSeason: state.currentSeason,
    seasonHistory: state.seasonHistory,
    placementGamesPlayed: state.placementGamesPlayed,
    placementWins: state.placementWins,
    isPlacing: state.isPlacing,
    currentStreak: state.currentStreak,
  });
});
