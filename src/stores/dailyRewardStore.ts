import { create } from 'zustand';
import { saveState, loadState } from '../services/storage';

export interface DailyReward {
  day: number;
  type: 'coins' | 'gems' | 'lootbox';
  amount: number;
  icon: string;
  name: string;
  claimed: boolean;
}

interface DailyRewardState {
  currentStreak: number;
  lastClaimDate: string | null; // ISO date string
  rewards: DailyReward[];

  // Actions
  checkAndShowReward: () => DailyReward | null;
  claimReward: () => DailyReward | null;
  loadFromStorage: () => Promise<void>;
}

const DAILY_REWARDS: Omit<DailyReward, 'claimed'>[] = [
  { day: 1, type: 'coins', amount: 50, icon: '🪙', name: '50 Coins' },
  { day: 2, type: 'coins', amount: 100, icon: '🪙', name: '100 Coins' },
  { day: 3, type: 'lootbox', amount: 1, icon: '📦', name: 'Bronze Box' },
  { day: 4, type: 'coins', amount: 200, icon: '🪙', name: '200 Coins' },
  { day: 5, type: 'gems', amount: 5, icon: '💎', name: '5 Gems' },
  { day: 6, type: 'coins', amount: 500, icon: '🪙', name: '500 Coins' },
  { day: 7, type: 'lootbox', amount: 1, icon: '🎁', name: 'Gold Box' },
];

function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

export const useDailyRewardStore = create<DailyRewardState>((set, get) => ({
  currentStreak: 0,
  lastClaimDate: null,
  rewards: DAILY_REWARDS.map(r => ({ ...r, claimed: false })),

  checkAndShowReward: () => {
    const { lastClaimDate, currentStreak } = get();
    const today = getTodayString();

    if (lastClaimDate === today) return null; // Already claimed today

    const dayIndex = currentStreak % 7;
    return { ...DAILY_REWARDS[dayIndex], claimed: false };
  },

  claimReward: () => {
    const { lastClaimDate, currentStreak } = get();
    const today = getTodayString();

    if (lastClaimDate === today) return null;

    const dayIndex = currentStreak % 7;
    const reward = { ...DAILY_REWARDS[dayIndex], claimed: true };

    // Check if streak is consecutive (yesterday or first time)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayString = yesterday.toISOString().split('T')[0];
    const isConsecutive = lastClaimDate === null || lastClaimDate === yesterdayString;

    set({
      currentStreak: isConsecutive ? currentStreak + 1 : 1,
      lastClaimDate: today,
    });

    return reward;
  },

  loadFromStorage: async () => {
    const saved = await loadState<{ currentStreak: number; lastClaimDate: string | null }>('dailyReward');
    if (saved) {
      set({
        currentStreak: saved.currentStreak || 0,
        lastClaimDate: saved.lastClaimDate || null,
      });
    }
  },
}));

/**
 * Returns a coin multiplier based on the daily login streak.
 * Day 1: 1x | Day 2-3: 1.2x | Day 4-5: 1.5x | Day 6-7: 2x
 */
export function getStreakMultiplier(): number {
  const streak = useDailyRewardStore.getState().currentStreak;
  if (streak >= 6) return 2;
  if (streak >= 4) return 1.5;
  if (streak >= 2) return 1.2;
  return 1;
}

// Auto-save
useDailyRewardStore.subscribe((state) => {
  saveState('dailyReward', {
    currentStreak: state.currentStreak,
    lastClaimDate: state.lastClaimDate,
  });
});
