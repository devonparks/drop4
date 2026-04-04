import { create } from 'zustand';
import { saveState, loadState } from '../services/storage';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  condition: AchievementCondition;
  reward: { type: 'coins' | 'title'; value: string | number };
  unlocked: boolean;
  unlockedAt?: number;
}

type AchievementCondition =
  | { type: 'wins'; count: number }
  | { type: 'streak'; count: number }
  | { type: 'games'; count: number }
  | { type: 'level'; level: number }
  | { type: 'career_stars'; count: number }
  | { type: 'fast_win'; moves: number }
  | { type: 'hard_wins'; count: number }
  | { type: 'cosmetics'; count: number };

interface AchievementState {
  achievements: Achievement[];
  checkAndUnlock: (stats: GameStats) => string[]; // returns newly unlocked achievement names
  loadFromStorage: () => Promise<void>;
}

export interface GameStats {
  totalWins: number;
  currentStreak: number;
  bestStreak: number;
  totalGames: number;
  level: number;
  careerStars: number;
  lastGameMoves: number;
  hardWins: number;
  ownedCosmetics: number;
}

const ACHIEVEMENT_DEFS: Omit<Achievement, 'unlocked' | 'unlockedAt'>[] = [
  { id: 'first_win', name: 'First Win', description: 'Win your first game', icon: '🏆',
    condition: { type: 'wins', count: 1 }, reward: { type: 'coins', value: 50 } },
  { id: 'win_10', name: 'Getting Good', description: 'Win 10 games', icon: '🔥',
    condition: { type: 'wins', count: 10 }, reward: { type: 'coins', value: 200 } },
  { id: 'win_50', name: 'Veteran', description: 'Win 50 games', icon: '⭐',
    condition: { type: 'wins', count: 50 }, reward: { type: 'coins', value: 1000 } },
  { id: 'win_100', name: 'Legend', description: 'Win 100 games', icon: '👑',
    condition: { type: 'wins', count: 100 }, reward: { type: 'title', value: 'Legend' } },
  { id: 'streak_3', name: 'On Fire', description: 'Win 3 games in a row', icon: '🔥',
    condition: { type: 'streak', count: 3 }, reward: { type: 'coins', value: 100 } },
  { id: 'streak_5', name: 'Unstoppable', description: 'Win 5 games in a row', icon: '💪',
    condition: { type: 'streak', count: 5 }, reward: { type: 'coins', value: 300 } },
  { id: 'streak_10', name: 'Untouchable', description: 'Win 10 games in a row', icon: '🌟',
    condition: { type: 'streak', count: 10 }, reward: { type: 'title', value: 'Untouchable' } },
  { id: 'speed_demon', name: 'Speed Demon', description: 'Win in under 10 moves', icon: '⚡',
    condition: { type: 'fast_win', moves: 10 }, reward: { type: 'coins', value: 200 } },
  { id: 'games_50', name: 'Dedicated', description: 'Play 50 games', icon: '🎮',
    condition: { type: 'games', count: 50 }, reward: { type: 'coins', value: 250 } },
  { id: 'games_100', name: 'Addicted', description: 'Play 100 games', icon: '🎯',
    condition: { type: 'games', count: 100 }, reward: { type: 'coins', value: 500 } },
  { id: 'level_5', name: 'Rising Star', description: 'Reach Level 5', icon: '📈',
    condition: { type: 'level', level: 5 }, reward: { type: 'coins', value: 100 } },
  { id: 'level_10', name: 'Drop King', description: 'Reach Level 10', icon: '👑',
    condition: { type: 'level', level: 10 }, reward: { type: 'title', value: 'Drop King' } },
  { id: 'level_25', name: 'Master', description: 'Reach Level 25', icon: '🏅',
    condition: { type: 'level', level: 25 }, reward: { type: 'title', value: 'Master' } },
  { id: 'hard_1', name: 'Sharpshooter', description: 'Beat Hard AI', icon: '🎯',
    condition: { type: 'hard_wins', count: 1 }, reward: { type: 'coins', value: 150 } },
  { id: 'hard_10', name: 'AI Slayer', description: 'Beat Hard AI 10 times', icon: '🤖',
    condition: { type: 'hard_wins', count: 10 }, reward: { type: 'coins', value: 500 } },
  { id: 'career_10', name: 'Career Starter', description: 'Earn 10 career stars', icon: '⭐',
    condition: { type: 'career_stars', count: 10 }, reward: { type: 'coins', value: 200 } },
  { id: 'career_50', name: 'Career Pro', description: 'Earn 50 career stars', icon: '🌟',
    condition: { type: 'career_stars', count: 50 }, reward: { type: 'coins', value: 1000 } },
  { id: 'collector_5', name: 'Collector', description: 'Own 5 cosmetic items', icon: '💎',
    condition: { type: 'cosmetics', count: 5 }, reward: { type: 'coins', value: 150 } },
  { id: 'collector_15', name: 'Hoarder', description: 'Own 15 cosmetic items', icon: '💰',
    condition: { type: 'cosmetics', count: 15 }, reward: { type: 'coins', value: 500 } },
];

function checkCondition(condition: AchievementCondition, stats: GameStats): boolean {
  switch (condition.type) {
    case 'wins': return stats.totalWins >= condition.count;
    case 'streak': return stats.bestStreak >= condition.count;
    case 'games': return stats.totalGames >= condition.count;
    case 'level': return stats.level >= condition.level;
    case 'career_stars': return stats.careerStars >= condition.count;
    case 'fast_win': return stats.lastGameMoves > 0 && stats.lastGameMoves <= condition.moves;
    case 'hard_wins': return stats.hardWins >= condition.count;
    case 'cosmetics': return stats.ownedCosmetics >= condition.count;
    default: return false;
  }
}

export const useAchievementStore = create<AchievementState>((set, get) => ({
  achievements: ACHIEVEMENT_DEFS.map(a => ({ ...a, unlocked: false })),

  checkAndUnlock: (stats) => {
    const newlyUnlocked: string[] = [];

    set(state => ({
      achievements: state.achievements.map(a => {
        if (a.unlocked) return a;
        if (checkCondition(a.condition, stats)) {
          newlyUnlocked.push(a.name);
          return { ...a, unlocked: true, unlockedAt: Date.now() };
        }
        return a;
      }),
    }));

    return newlyUnlocked;
  },

  loadFromStorage: async () => {
    const saved = await loadState<{ achievements: Achievement[] }>('achievements');
    if (saved?.achievements) {
      set({ achievements: saved.achievements });
    }
  },
}));

// Auto-save
useAchievementStore.subscribe((state) => {
  saveState('achievements', { achievements: state.achievements });
});
