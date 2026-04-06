import { create } from 'zustand';
import { saveState, loadState } from '../services/storage';
import { useShopStore } from './shopStore';

export interface Challenge {
  id: string;
  title: string;
  description: string;
  icon: string;
  target: number;
  progress: number;
  reward: number; // coins
  completed: boolean;
}

interface ChallengeState {
  challenges: Challenge[];
  lastRefresh: number; // timestamp
  bonusClaimed: boolean; // all-challenges bonus (prevents re-claiming same day)

  // Weekly challenge state
  weeklyLastRefresh: number; // timestamp of last Monday 00:00
  weeklyClaimed: Record<string, boolean>; // 'wins20' | 'career5'

  // Actions
  refreshChallenges: () => void;
  updateProgress: (challengeId: string, amount: number) => void;
  resetProgress: (challengeId: string) => void; // reset to 0 (e.g. streak broken)
  claimReward: (challengeId: string) => number; // returns coins earned
  claimDailyBonus: () => boolean; // returns true if newly claimed
  claimWeeklyReward: (id: string, amount: number) => boolean; // returns true if claimed
  loadFromStorage: () => Promise<void>;
}

// Daily challenge pool — 3 are randomly selected each day
const CHALLENGE_POOL: Omit<Challenge, 'progress' | 'completed'>[] = [
  // Win challenges
  { id: 'win_3', title: 'Triple Threat', description: 'Win 3 games', icon: '🏆', target: 3, reward: 100 },
  { id: 'win_5', title: 'Dominant Force', description: 'Win 5 games today', icon: '🏅', target: 5, reward: 200 },
  { id: 'win_easy', title: 'Warm Up', description: 'Win a game on Easy', icon: '⭐', target: 1, reward: 25 },
  { id: 'win_medium', title: 'Rising Star', description: 'Win a game on Medium', icon: '⭐⭐', target: 1, reward: 50 },
  { id: 'win_hard', title: 'Challenger', description: 'Win a game on Hard', icon: '⭐⭐⭐', target: 1, reward: 100 },
  { id: 'win_2_hard', title: 'Hard Knocks', description: 'Win 2 games on Hard', icon: '💀', target: 2, reward: 175 },
  { id: 'win_3_easy', title: 'Easy Street', description: 'Win 3 games on Easy', icon: '🌿', target: 3, reward: 60 },
  // Play challenges
  { id: 'play_5', title: 'Dedicated', description: 'Play 5 games', icon: '🎮', target: 5, reward: 75 },
  { id: 'play_10', title: 'Marathon Player', description: 'Play 10 games', icon: '🎲', target: 10, reward: 150 },
  // Special skill challenges
  { id: 'center_first', title: 'Center Control', description: 'Drop your first piece in the center column', icon: '🎯', target: 1, reward: 30 },
  { id: 'win_streak_2', title: 'On a Roll', description: 'Win 2 games in a row', icon: '🔥', target: 2, reward: 60 },
  { id: 'win_streak_3', title: 'Hat Trick', description: 'Win 3 games in a row', icon: '🌶️', target: 3, reward: 120 },
  { id: 'fast_win', title: 'Speed Win', description: 'Win a game in under 10 moves', icon: '⚡', target: 1, reward: 80 },
  { id: 'blitz_win', title: 'Blitz King', description: 'Win a game in under 8 moves', icon: '💨', target: 1, reward: 120 },
  { id: 'career_level', title: 'Career Move', description: 'Complete a career level', icon: '📍', target: 1, reward: 75 },
  // Social / exploration
  { id: 'play_local', title: 'Social Gamer', description: 'Play a local multiplayer game', icon: '👥', target: 1, reward: 40 },
  { id: 'shop_visit', title: 'Window Shopping', description: 'Visit the shop', icon: '🛍', target: 1, reward: 15 },
  { id: 'try_custom', title: 'Remix', description: 'Play a custom game mode', icon: '🔧', target: 1, reward: 40 },
];

function pickRandomChallenges(count: number): Challenge[] {
  // Fisher-Yates shuffle for uniform distribution
  const shuffled = [...CHALLENGE_POOL];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count).map(c => ({
    ...c,
    progress: 0,
    completed: false,
  }));
}

function getStartOfWeek(): number {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 1=Mon...
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((day + 6) % 7)); // roll back to Monday
  monday.setHours(0, 0, 0, 0);
  return monday.getTime();
}

export const useChallengeStore = create<ChallengeState>((set, get) => ({
  challenges: pickRandomChallenges(3),
  lastRefresh: Date.now(),
  bonusClaimed: false,
  weeklyLastRefresh: getStartOfWeek(),
  weeklyClaimed: {},

  refreshChallenges: () => {
    set({
      challenges: pickRandomChallenges(3),
      lastRefresh: Date.now(),
      bonusClaimed: false, // reset on daily refresh
    });
  },

  updateProgress: (challengeId, amount) => {
    set(state => ({
      challenges: state.challenges.map(c =>
        c.id === challengeId && !c.completed
          ? { ...c, progress: Math.min(c.progress + amount, c.target) }
          : c
      ),
    }));
  },

  resetProgress: (challengeId) => {
    set(state => ({
      challenges: state.challenges.map(c =>
        c.id === challengeId && !c.completed
          ? { ...c, progress: 0 }
          : c
      ),
    }));
  },

  claimReward: (challengeId) => {
    const challenge = get().challenges.find(c => c.id === challengeId);
    if (!challenge || challenge.completed || challenge.progress < challenge.target) return 0;

    const amount = challenge.reward;

    set(state => ({
      challenges: state.challenges.map(c =>
        c.id === challengeId ? { ...c, completed: true } : c
      ),
    }));

    // Grant the coins to the player
    useShopStore.getState().addCoins(amount);

    return amount;
  },

  claimDailyBonus: () => {
    const { bonusClaimed, challenges } = get();
    if (bonusClaimed) return false;
    const allDone = challenges.every(c => c.completed);
    if (!allDone) return false;

    set({ bonusClaimed: true });
    useShopStore.getState().addCoins(200);
    return true;
  },

  claimWeeklyReward: (id, amount) => {
    const { weeklyClaimed } = get();
    if (weeklyClaimed[id]) return false;
    set(state => ({ weeklyClaimed: { ...state.weeklyClaimed, [id]: true } }));
    useShopStore.getState().addCoins(amount);
    return true;
  },

  loadFromStorage: async () => {
    const saved = await loadState<{
      challenges: Challenge[];
      lastRefresh: number;
      bonusClaimed?: boolean;
      weeklyLastRefresh?: number;
      weeklyClaimed?: Record<string, boolean>;
    }>('challenges');
    if (saved) {
      const lastRefresh = saved.lastRefresh ?? 0;
      const msPerDay = 24 * 60 * 60 * 1000;
      const isStale = Date.now() - lastRefresh > msPerDay;

      // Reset weekly claims if we're in a new week
      const savedWeeklyRefresh = saved.weeklyLastRefresh ?? 0;
      const currentWeekStart = getStartOfWeek();
      const isNewWeek = savedWeeklyRefresh < currentWeekStart;

      if (isStale) {
        set({
          challenges: pickRandomChallenges(3),
          lastRefresh: Date.now(),
          bonusClaimed: false,
          weeklyLastRefresh: isNewWeek ? currentWeekStart : (savedWeeklyRefresh || currentWeekStart),
          weeklyClaimed: isNewWeek ? {} : (saved.weeklyClaimed ?? {}),
        });
      } else {
        set({
          challenges: saved.challenges ?? pickRandomChallenges(3),
          lastRefresh,
          bonusClaimed: saved.bonusClaimed ?? false,
          weeklyLastRefresh: isNewWeek ? currentWeekStart : (savedWeeklyRefresh || currentWeekStart),
          weeklyClaimed: isNewWeek ? {} : (saved.weeklyClaimed ?? {}),
        });
      }
    }
  },
}));

// Auto-save
useChallengeStore.subscribe((state) => {
  saveState('challenges', {
    challenges: state.challenges,
    lastRefresh: state.lastRefresh,
    bonusClaimed: state.bonusClaimed,
    weeklyLastRefresh: state.weeklyLastRefresh,
    weeklyClaimed: state.weeklyClaimed,
  });
});
