import { create } from 'zustand';
import { saveState, loadState } from '../services/storage';

type DailyRewardType = 'coins' | 'gems' | 'lootbox' | 'outfit' | 'pet' | 'emote' | 'title';

export interface DailyReward {
  day: number;
  type: DailyRewardType;
  amount: number;
  icon: string;
  name: string;
  /** For outfit/pet/emote/title rewards: the ID to unlock */
  unlockId?: string;
  claimed: boolean;
}

interface DailyRewardState {
  currentStreak: number;
  lastClaimDate: string | null; // ISO date string
  longestStreak: number;
  rewards: DailyReward[];

  // Actions
  checkAndShowReward: () => DailyReward | null;
  claimReward: () => DailyReward | null;
  loadFromStorage: () => Promise<void>;
}

/**
 * Escalating 7-day cycle with milestone bonuses at 14 and 30 total days.
 * Missing a day resets the 7-day cycle but NOT the lifetime streak.
 *
 * Day 7 gives a rare outfit unlock (real cosmetic, not just coins).
 * Day 14 (milestone) gives an epic pet.
 * Day 30 (milestone) gives a legendary title.
 */
const DAILY_REWARDS: Omit<DailyReward, 'claimed'>[] = [
  { day: 1, type: 'coins',   amount: 50,   icon: '🪙', name: '50 Coins' },
  { day: 2, type: 'coins',   amount: 150,  icon: '🪙', name: '150 Coins' },
  { day: 3, type: 'lootbox', amount: 1,    icon: '📦', name: 'Bronze Box' },
  { day: 4, type: 'coins',   amount: 300,  icon: '🪙', name: '300 Coins' },
  { day: 5, type: 'gems',    amount: 10,   icon: '💎', name: '10 Gems' },
  { day: 6, type: 'coins',   amount: 750,  icon: '🪙', name: '750 Coins' },
  { day: 7, type: 'outfit',  amount: 1,    icon: '👑', name: 'Rare Outfit', unlockId: 'human_fantasy_knights_03' },
];


function getTodayString(): string {
  // Use local date to avoid UTC timezone issues (e.g. claiming at 11pm local = next day in UTC)
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const useDailyRewardStore = create<DailyRewardState>((set, get) => ({
  currentStreak: 0,
  lastClaimDate: null,
  longestStreak: 0,
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
    const y = yesterday;
    const yesterdayString = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`;
    const isConsecutive = lastClaimDate === null || lastClaimDate === yesterdayString;

    const newStreak = isConsecutive ? currentStreak + 1 : 1;
    set({
      currentStreak: newStreak,
      lastClaimDate: today,
      longestStreak: Math.max(get().longestStreak, newStreak),
    });

    return reward;
  },

  loadFromStorage: async () => {
    const saved = await loadState<{
      currentStreak: number;
      lastClaimDate: string | null;
      longestStreak?: number;
    }>('dailyReward');
    if (saved) {
      set({
        currentStreak: saved.currentStreak || 0,
        lastClaimDate: saved.lastClaimDate || null,
        longestStreak: saved.longestStreak ?? saved.currentStreak ?? 0,
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
    longestStreak: state.longestStreak,
  });
});
