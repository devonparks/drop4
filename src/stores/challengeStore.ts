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

  // Actions
  refreshChallenges: () => void;
  updateProgress: (challengeId: string, amount: number) => void;
  claimReward: (challengeId: string) => number; // returns coins earned
  loadFromStorage: () => Promise<void>;
}

// Daily challenge pool — 3 are randomly selected each day
const CHALLENGE_POOL: Omit<Challenge, 'progress' | 'completed'>[] = [
  { id: 'win_3', title: 'Triple Threat', description: 'Win 3 games', icon: '🏆', target: 3, reward: 100 },
  { id: 'win_easy', title: 'Warm Up', description: 'Win a game on Easy', icon: '⭐', target: 1, reward: 25 },
  { id: 'win_medium', title: 'Rising Star', description: 'Win a game on Medium', icon: '⭐⭐', target: 1, reward: 50 },
  { id: 'win_hard', title: 'Challenger', description: 'Win a game on Hard', icon: '⭐⭐⭐', target: 1, reward: 100 },
  { id: 'play_5', title: 'Dedicated', description: 'Play 5 games', icon: '🎮', target: 5, reward: 75 },
  { id: 'center_first', title: 'Center Control', description: 'Drop your first piece in the center column', icon: '🎯', target: 1, reward: 30 },
  { id: 'win_streak_2', title: 'On a Roll', description: 'Win 2 games in a row', icon: '🔥', target: 2, reward: 60 },
  { id: 'fast_win', title: 'Speed Win', description: 'Win a game in under 10 moves', icon: '⚡', target: 1, reward: 80 },
  { id: 'play_local', title: 'Social Gamer', description: 'Play a local multiplayer game', icon: '👥', target: 1, reward: 40 },
  { id: 'shop_visit', title: 'Window Shopping', description: 'Visit the shop', icon: '🛍', target: 1, reward: 15 },
];

function pickRandomChallenges(count: number): Challenge[] {
  const shuffled = [...CHALLENGE_POOL].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map(c => ({
    ...c,
    progress: 0,
    completed: false,
  }));
}

export const useChallengeStore = create<ChallengeState>((set, get) => ({
  challenges: pickRandomChallenges(3),
  lastRefresh: Date.now(),

  refreshChallenges: () => {
    set({
      challenges: pickRandomChallenges(3),
      lastRefresh: Date.now(),
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

  loadFromStorage: async () => {
    const saved = await loadState<{ challenges: Challenge[]; lastRefresh: number }>('challenges');
    if (saved) {
      set({
        challenges: saved.challenges ?? pickRandomChallenges(3),
        lastRefresh: saved.lastRefresh ?? Date.now(),
      });
    }
  },
}));

// Auto-save
useChallengeStore.subscribe((state) => {
  saveState('challenges', { challenges: state.challenges, lastRefresh: state.lastRefresh });
});
