import { create } from 'zustand';
import { saveState, loadState } from '../services/storage';
import { useShopStore } from './shopStore';

export type AchievementDifficulty = 'common' | 'rare' | 'hard';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  condition: AchievementCondition;
  reward: { type: 'coins' | 'title'; value: string | number };
  difficulty: AchievementDifficulty;
  points: number; // common=10, rare=25, hard=50
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
  | { type: 'cosmetics'; count: number }
  | { type: 'pets_owned'; count: number }
  | { type: 'legendary_pet' };

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
  ownedPets: string[];
}

const ACHIEVEMENT_DEFS: Omit<Achievement, 'unlocked' | 'unlockedAt'>[] = [
  // Common (10 pts) — easy, early-game milestones
  { id: 'first_win', name: 'First Win', description: 'Win your first game', icon: '🏆',
    condition: { type: 'wins', count: 1 }, reward: { type: 'coins', value: 50 }, difficulty: 'common', points: 10 },
  { id: 'win_10', name: 'Getting Good', description: 'Win 10 games', icon: '🔥',
    condition: { type: 'wins', count: 10 }, reward: { type: 'coins', value: 200 }, difficulty: 'common', points: 10 },
  { id: 'streak_3', name: 'On Fire', description: 'Win 3 games in a row', icon: '🔥',
    condition: { type: 'streak', count: 3 }, reward: { type: 'coins', value: 100 }, difficulty: 'common', points: 10 },
  { id: 'games_50', name: 'Dedicated', description: 'Play 50 games', icon: '🎮',
    condition: { type: 'games', count: 50 }, reward: { type: 'coins', value: 250 }, difficulty: 'common', points: 10 },
  { id: 'level_5', name: 'Rising Star', description: 'Reach Level 5', icon: '📈',
    condition: { type: 'level', level: 5 }, reward: { type: 'coins', value: 100 }, difficulty: 'common', points: 10 },
  { id: 'hard_1', name: 'Sharpshooter', description: 'Beat Hard AI', icon: '🎯',
    condition: { type: 'hard_wins', count: 1 }, reward: { type: 'coins', value: 150 }, difficulty: 'common', points: 10 },
  { id: 'career_10', name: 'Career Starter', description: 'Earn 10 career stars', icon: '⭐',
    condition: { type: 'career_stars', count: 10 }, reward: { type: 'coins', value: 200 }, difficulty: 'common', points: 10 },
  { id: 'collector_5', name: 'Collector', description: 'Own 5 cosmetic items', icon: '💎',
    condition: { type: 'cosmetics', count: 5 }, reward: { type: 'coins', value: 150 }, difficulty: 'common', points: 10 },
  { id: 'pet_owner', name: 'Pet Owner', description: 'Own your first pet', icon: '🐕',
    condition: { type: 'pets_owned', count: 1 }, reward: { type: 'coins', value: 100 }, difficulty: 'common', points: 10 },

  // Rare (25 pts) — mid-game grind
  { id: 'win_50', name: 'Veteran', description: 'Win 50 games', icon: '⭐',
    condition: { type: 'wins', count: 50 }, reward: { type: 'coins', value: 1000 }, difficulty: 'rare', points: 25 },
  { id: 'streak_5', name: 'Unstoppable', description: 'Win 5 games in a row', icon: '💪',
    condition: { type: 'streak', count: 5 }, reward: { type: 'coins', value: 300 }, difficulty: 'rare', points: 25 },
  { id: 'speed_demon', name: 'Speed Demon', description: 'Win in under 10 moves', icon: '⚡',
    condition: { type: 'fast_win', moves: 10 }, reward: { type: 'coins', value: 200 }, difficulty: 'rare', points: 25 },
  { id: 'games_100', name: 'Addicted', description: 'Play 100 games', icon: '🎯',
    condition: { type: 'games', count: 100 }, reward: { type: 'coins', value: 500 }, difficulty: 'rare', points: 25 },
  { id: 'level_10', name: 'Drop King', description: 'Reach Level 10', icon: '👑',
    condition: { type: 'level', level: 10 }, reward: { type: 'title', value: 'Drop King' }, difficulty: 'rare', points: 25 },
  { id: 'hard_10', name: 'AI Slayer', description: 'Beat Hard AI 10 times', icon: '🤖',
    condition: { type: 'hard_wins', count: 10 }, reward: { type: 'coins', value: 500 }, difficulty: 'rare', points: 25 },
  { id: 'career_50', name: 'Career Pro', description: 'Earn 50 career stars', icon: '🌟',
    condition: { type: 'career_stars', count: 50 }, reward: { type: 'coins', value: 1000 }, difficulty: 'rare', points: 25 },
  { id: 'collector_15', name: 'Hoarder', description: 'Own 15 cosmetic items', icon: '💰',
    condition: { type: 'cosmetics', count: 15 }, reward: { type: 'coins', value: 500 }, difficulty: 'rare', points: 25 },
  { id: 'dog_collector', name: 'Dog Collector', description: 'Own 5 different pets', icon: '🐾',
    condition: { type: 'pets_owned', count: 5 }, reward: { type: 'coins', value: 500 }, difficulty: 'rare', points: 25 },

  // Hard (50 pts) — endgame prestige
  { id: 'win_100', name: 'Legend', description: 'Win 100 games', icon: '👑',
    condition: { type: 'wins', count: 100 }, reward: { type: 'title', value: 'Legend' }, difficulty: 'hard', points: 50 },
  { id: 'streak_10', name: 'Untouchable', description: 'Win 10 games in a row', icon: '🌟',
    condition: { type: 'streak', count: 10 }, reward: { type: 'title', value: 'Untouchable' }, difficulty: 'hard', points: 50 },
  { id: 'level_25', name: 'Master', description: 'Reach Level 25', icon: '🏅',
    condition: { type: 'level', level: 25 }, reward: { type: 'title', value: 'Master' }, difficulty: 'hard', points: 50 },
  { id: 'best_in_show', name: 'Best in Show', description: 'Own a Legendary pet', icon: '🏆',
    condition: { type: 'legendary_pet' }, reward: { type: 'title', value: 'Best in Show' }, difficulty: 'hard', points: 50 },
];

const LEGENDARY_PET_IDS = ['hellhound', 'robot', 'scifi'];

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
    case 'pets_owned': return stats.ownedPets.length >= condition.count;
    case 'legendary_pet': return stats.ownedPets.some(id => LEGENDARY_PET_IDS.includes(id));
    default: return false;
  }
}

export const useAchievementStore = create<AchievementState>((set, get) => ({
  achievements: ACHIEVEMENT_DEFS.map(a => ({ ...a, unlocked: false })),

  checkAndUnlock: (stats) => {
    const newlyUnlocked: string[] = [];
    const rewardsToGrant: Achievement['reward'][] = [];

    set(state => ({
      achievements: state.achievements.map(a => {
        if (a.unlocked) return a;
        if (checkCondition(a.condition, stats)) {
          newlyUnlocked.push(a.name);
          rewardsToGrant.push(a.reward);
          return { ...a, unlocked: true, unlockedAt: Date.now() };
        }
        return a;
      }),
    }));

    // Grant rewards for newly unlocked achievements
    for (const reward of rewardsToGrant) {
      if (reward.type === 'coins' && typeof reward.value === 'number') {
        useShopStore.getState().addCoins(reward.value);
      }
    }

    return newlyUnlocked;
  },

  loadFromStorage: async () => {
    const saved = await loadState<{ achievements: Achievement[] }>('achievements');
    if (saved?.achievements) {
      // Merge saved unlock state into code-defined achievements
      // so new achievements added in updates are preserved
      const savedMap = new Map(saved.achievements.map(a => [a.id, a]));
      set(state => ({
        achievements: state.achievements.map(a => {
          const savedAch = savedMap.get(a.id);
          if (savedAch?.unlocked) {
            return { ...a, unlocked: true, unlockedAt: savedAch.unlockedAt };
          }
          return a;
        }),
      }));
    }
  },
}));

// ── Achievement Points Helper ──
/** Total points from unlocked achievements */
export function getAchievementScore(achievements: Achievement[]): number {
  return achievements.filter(a => a.unlocked).reduce((sum, a) => sum + a.points, 0);
}

/** Max possible achievement points */
export function getMaxAchievementPoints(): number {
  return ACHIEVEMENT_DEFS.reduce((sum, a) => sum + a.points, 0);
}

// Auto-save
useAchievementStore.subscribe((state) => {
  saveState('achievements', { achievements: state.achievements });
});
