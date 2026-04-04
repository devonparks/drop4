// Full Career Mode level data — 36 levels across 3 chapters
// Each level has unique challenge type, named opponent, and rewards

import { Difficulty } from '../stores/gameStore';

export interface CareerLevel {
  id: number;
  name: string;
  opponent: string;
  opponentPersonality: string; // flavor text
  chapter: number;
  type: CareerChallengeType;
  difficulty: Difficulty;
  isBoss: boolean;
  reward?: CareerReward;
  // Game settings overrides
  settings: {
    rows?: number;
    cols?: number;
    connectCount?: number;
    timerSeconds?: number;
    playerGoesFirst?: boolean;
    presetBoard?: (0 | 1 | 2)[][]; // null = empty board
  };
}

export type CareerChallengeType =
  | 'standard'        // Normal 6x7 Connect 4
  | 'connect3'        // Connect 3 on 5x5
  | 'connect5'        // Connect 5 on 8x8
  | 'connect6'        // Connect 6 on 9x9
  | 'timed'           // Standard board with timer per turn
  | 'go_second'       // Player goes second (disadvantage)
  | 'puzzle'          // Preset board, find the winning move
  | 'boss'            // Boss battle — harder AI, unique theme
  | 'speed'           // Very fast timer (5 seconds)
  | 'tournament';     // Beat 3 opponents in a row

export interface CareerReward {
  type: 'coins' | 'board' | 'pieces' | 'emote' | 'title';
  id?: string;
  name: string;
  amount?: number;
  icon: string;
}

// Helper to get challenge type display name
export function getChallengeTypeLabel(type: CareerChallengeType): string {
  switch (type) {
    case 'standard': return 'Standard 6×7';
    case 'connect3': return 'Connect 3 (5×5)';
    case 'connect5': return 'Connect 5 (8×8)';
    case 'connect6': return 'Connect 6 (9×9)';
    case 'timed': return 'Timed (15s)';
    case 'go_second': return 'Go Second';
    case 'puzzle': return 'Puzzle';
    case 'boss': return 'Boss Battle';
    case 'speed': return 'Speed (5s)';
    case 'tournament': return 'Tournament';
    default: return 'Standard';
  }
}

// ═══════════════════════════════════
// CHAPTER 1: THE BASICS (Levels 1-12)
// ═══════════════════════════════════

const CHAPTER_1: CareerLevel[] = [
  {
    id: 1, name: 'First Drop', opponent: 'Rookie Ron',
    opponentPersonality: 'A friendly beginner who loves the game',
    chapter: 1, type: 'standard', difficulty: 'easy', isBoss: false,
    settings: {},
  },
  {
    id: 2, name: 'Getting Started', opponent: 'Beginner Ben',
    opponentPersonality: 'Still learning the ropes',
    chapter: 1, type: 'standard', difficulty: 'easy', isBoss: false,
    settings: {},
  },
  {
    id: 3, name: 'Center Control', opponent: 'Casual Carl',
    opponentPersonality: 'Knows the center column is important',
    chapter: 1, type: 'standard', difficulty: 'easy', isBoss: false,
    settings: {},
    reward: { type: 'coins', name: '100 Coins', amount: 100, icon: '🪙' },
  },
  {
    id: 4, name: 'Quick Thinking', opponent: 'Speedy Sam',
    opponentPersonality: 'Plays fast, thinks faster',
    chapter: 1, type: 'timed', difficulty: 'easy', isBoss: false,
    settings: { timerSeconds: 15 },
  },
  {
    id: 5, name: 'Mini Match', opponent: 'Tiny Tim',
    opponentPersonality: 'Loves the small board',
    chapter: 1, type: 'connect3', difficulty: 'easy', isBoss: false,
    settings: { rows: 5, cols: 5, connectCount: 3 },
    reward: { type: 'board', id: 'wood', name: 'Wood Board', icon: '🎨' },
  },
  {
    id: 6, name: 'The Comeback', opponent: 'Lucky Luke',
    opponentPersonality: 'Always gets lucky breaks',
    chapter: 1, type: 'go_second', difficulty: 'easy', isBoss: false,
    settings: { playerGoesFirst: false },
  },
  {
    id: 7, name: 'Speed Round', opponent: 'Flash Fiona',
    opponentPersonality: 'Five seconds is all she needs',
    chapter: 1, type: 'speed', difficulty: 'easy', isBoss: false,
    settings: { timerSeconds: 5 },
    reward: { type: 'coins', name: '200 Coins', amount: 200, icon: '🪙' },
  },
  {
    id: 8, name: 'Find the Win', opponent: 'Puzzle Pete',
    opponentPersonality: 'A puzzle master at heart',
    chapter: 1, type: 'standard', difficulty: 'easy', isBoss: false,
    settings: {},
  },
  {
    id: 9, name: 'Double Trouble', opponent: 'Twin Tina',
    opponentPersonality: 'Always sets up two threats at once',
    chapter: 1, type: 'standard', difficulty: 'medium', isBoss: false,
    settings: {},
  },
  {
    id: 10, name: 'Under Pressure', opponent: 'Pressure Pat',
    opponentPersonality: 'Thrives under time pressure',
    chapter: 1, type: 'timed', difficulty: 'medium', isBoss: false,
    settings: { timerSeconds: 10 },
    reward: { type: 'pieces', id: 'chrome', name: 'Chrome Pieces', icon: '🔴' },
  },
  {
    id: 11, name: 'No Advantage', opponent: 'Fair Frankie',
    opponentPersonality: 'Believes in fair play — you go second',
    chapter: 1, type: 'go_second', difficulty: 'medium', isBoss: false,
    settings: { playerGoesFirst: false },
  },
  {
    id: 12, name: 'BOSS: Captain Connect', opponent: 'Captain Connect',
    opponentPersonality: 'The first true challenge. Blocks everything.',
    chapter: 1, type: 'boss', difficulty: 'medium', isBoss: true,
    settings: {},
    reward: { type: 'title', id: 'strategist', name: 'Title: Strategist', icon: '👑' },
  },
];

// ═══════════════════════════════════
// CHAPTER 2: THE GRIND (Levels 13-24)
// ═══════════════════════════════════

const CHAPTER_2: CareerLevel[] = [
  {
    id: 13, name: 'New Arena', opponent: 'Arena Alex',
    opponentPersonality: 'Welcomes you to the bigger leagues',
    chapter: 2, type: 'standard', difficulty: 'medium', isBoss: false,
    settings: {},
  },
  {
    id: 14, name: 'Big Board', opponent: 'Giant George',
    opponentPersonality: 'The bigger the board, the better',
    chapter: 2, type: 'connect5', difficulty: 'medium', isBoss: false,
    settings: { rows: 8, cols: 8, connectCount: 5 },
    reward: { type: 'board', id: 'neon', name: 'Neon Board', icon: '🎨' },
  },
  {
    id: 15, name: 'Trap Master', opponent: 'Tricky Tara',
    opponentPersonality: 'Sets traps you don\'t see coming',
    chapter: 2, type: 'standard', difficulty: 'medium', isBoss: false,
    settings: {},
  },
  {
    id: 16, name: 'Blitz Mode', opponent: 'Blitz Betty',
    opponentPersonality: 'Every second counts',
    chapter: 2, type: 'speed', difficulty: 'medium', isBoss: false,
    settings: { timerSeconds: 5 },
    reward: { type: 'coins', name: '300 Coins', amount: 300, icon: '🪙' },
  },
  {
    id: 17, name: 'Disadvantage', opponent: 'Smug Steve',
    opponentPersonality: 'Smirks because he goes first',
    chapter: 2, type: 'go_second', difficulty: 'medium', isBoss: false,
    settings: { playerGoesFirst: false },
  },
  {
    id: 18, name: 'Mini Tournament', opponent: 'Various',
    opponentPersonality: 'Beat 3 opponents back to back',
    chapter: 2, type: 'standard', difficulty: 'medium', isBoss: false,
    settings: {},
    reward: { type: 'emote', id: 'dance', name: 'Dance Emote', icon: '💃' },
  },
  {
    id: 19, name: 'Mega Board', opponent: 'Mega Mike',
    opponentPersonality: 'Thinks 6 in a row is the real game',
    chapter: 2, type: 'connect6', difficulty: 'medium', isBoss: false,
    settings: { rows: 9, cols: 9, connectCount: 6 },
  },
  {
    id: 20, name: 'Lightning Round', opponent: 'Thunder Theo',
    opponentPersonality: 'Strikes fast like lightning',
    chapter: 2, type: 'speed', difficulty: 'hard', isBoss: false,
    settings: { timerSeconds: 5 },
    reward: { type: 'coins', name: '500 Coins', amount: 500, icon: '🪙' },
  },
  {
    id: 21, name: 'The Wall', opponent: 'Defensive Diana',
    opponentPersonality: 'Blocks every attack, waits for mistakes',
    chapter: 2, type: 'standard', difficulty: 'hard', isBoss: false,
    settings: {},
  },
  {
    id: 22, name: 'Going Big', opponent: 'Titan Tony',
    opponentPersonality: 'Only plays on the biggest boards',
    chapter: 2, type: 'connect5', difficulty: 'hard', isBoss: false,
    settings: { rows: 8, cols: 8, connectCount: 5 },
    reward: { type: 'board', id: 'galaxy', name: 'Galaxy Board', icon: '🌌' },
  },
  {
    id: 23, name: 'No Time', opponent: 'Chrono Chris',
    opponentPersonality: 'Master of the 5-second game',
    chapter: 2, type: 'timed', difficulty: 'hard', isBoss: false,
    settings: { timerSeconds: 5 },
  },
  {
    id: 24, name: 'BOSS: Master Ming', opponent: 'Master Ming',
    opponentPersonality: 'A strategic genius. Sets traps within traps.',
    chapter: 2, type: 'boss', difficulty: 'hard', isBoss: true,
    settings: {},
    reward: { type: 'title', id: 'drop_king', name: 'Title: Drop King', icon: '👑' },
  },
];

// ═══════════════════════════════════
// CHAPTER 3: THE ELITE (Levels 25-36)
// ═══════════════════════════════════

const CHAPTER_3: CareerLevel[] = [
  {
    id: 25, name: 'Elite Arena', opponent: 'Elite Emma',
    opponentPersonality: 'Welcome to the big leagues',
    chapter: 3, type: 'standard', difficulty: 'hard', isBoss: false,
    settings: {},
    reward: { type: 'board', id: 'gold', name: 'Gold Court', icon: '🥇' },
  },
  {
    id: 26, name: 'Rapid Fire', opponent: 'Razor Rita',
    opponentPersonality: 'Plays at the speed of thought',
    chapter: 3, type: 'speed', difficulty: 'hard', isBoss: false,
    settings: { timerSeconds: 5 },
  },
  {
    id: 27, name: 'Underdog', opponent: 'Dominant Dan',
    opponentPersonality: 'Always goes first. Always wins. Until now.',
    chapter: 3, type: 'go_second', difficulty: 'hard', isBoss: false,
    settings: { playerGoesFirst: false },
    reward: { type: 'coins', name: '1000 Coins', amount: 1000, icon: '🪙' },
  },
  {
    id: 28, name: 'Connect 3 Speedrun', opponent: 'Sprint Sarah',
    opponentPersonality: 'The fastest Connect 3 player alive',
    chapter: 3, type: 'connect3', difficulty: 'hard', isBoss: false,
    settings: { rows: 5, cols: 5, connectCount: 3, timerSeconds: 5 },
  },
  {
    id: 29, name: 'Grand Board', opponent: 'Grandmaster Gary',
    opponentPersonality: 'Plays Connect 6 like chess',
    chapter: 3, type: 'connect6', difficulty: 'hard', isBoss: false,
    settings: { rows: 9, cols: 9, connectCount: 6 },
    reward: { type: 'pieces', id: 'holo', name: 'Holographic Pieces', icon: '✨' },
  },
  {
    id: 30, name: 'The Gauntlet', opponent: 'Various Elites',
    opponentPersonality: 'Survive 3 hard opponents in a row',
    chapter: 3, type: 'standard', difficulty: 'hard', isBoss: false,
    settings: {},
  },
  {
    id: 31, name: 'Pressure Cooker', opponent: 'Intense Ivan',
    opponentPersonality: 'Every move on a 5-second clock. No mercy.',
    chapter: 3, type: 'speed', difficulty: 'hard', isBoss: false,
    settings: { timerSeconds: 5 },
    reward: { type: 'board', id: 'ice', name: 'Ice Arena', icon: '❄️' },
  },
  {
    id: 32, name: 'Mega Connect', opponent: 'Colossal Kate',
    opponentPersonality: 'The ultimate big-board specialist',
    chapter: 3, type: 'connect5', difficulty: 'hard', isBoss: false,
    settings: { rows: 8, cols: 8, connectCount: 5 },
  },
  {
    id: 33, name: 'Second Chance', opponent: 'Comeback King',
    opponentPersonality: 'Wins from behind. Always.',
    chapter: 3, type: 'go_second', difficulty: 'hard', isBoss: false,
    settings: { playerGoesFirst: false, timerSeconds: 10 },
    reward: { type: 'board', id: 'lava', name: 'Lava Pit', icon: '🌋' },
  },
  {
    id: 34, name: 'Speed Demon', opponent: 'Hyper Helen',
    opponentPersonality: 'The fastest player in Drop4 history',
    chapter: 3, type: 'speed', difficulty: 'hard', isBoss: false,
    settings: { timerSeconds: 5 },
    reward: { type: 'emote', id: 'celebrate', name: 'Celebrate Emote', icon: '🎉' },
  },
  {
    id: 35, name: 'The Finals', opponent: 'Champion Chase',
    opponentPersonality: 'The last opponent before the boss',
    chapter: 3, type: 'standard', difficulty: 'hard', isBoss: false,
    settings: {},
    reward: { type: 'coins', name: '2000 Coins', amount: 2000, icon: '🪙' },
  },
  {
    id: 36, name: 'BOSS: Dark Matter', opponent: 'Dark Matter',
    opponentPersonality: 'The ultimate AI. Undefeated. Until now.',
    chapter: 3, type: 'boss', difficulty: 'hard', isBoss: true,
    settings: {},
    reward: { type: 'title', id: 'darkmatter_elite', name: 'Title: Dark Matter Elite', icon: '🌌' },
  },
];

// All levels
export const ALL_CAREER_LEVELS: CareerLevel[] = [...CHAPTER_1, ...CHAPTER_2, ...CHAPTER_3];

// Chapter info
export const CHAPTERS = [
  { id: 1, name: 'The Basics', levels: CHAPTER_1, unlockLevel: 1 },
  { id: 2, name: 'The Grind', levels: CHAPTER_2, unlockLevel: 13 },
  { id: 3, name: 'The Elite', levels: CHAPTER_3, unlockLevel: 25 },
];

export function getChapterForLevel(levelId: number): typeof CHAPTERS[0] | undefined {
  return CHAPTERS.find(ch => ch.levels.some(l => l.id === levelId));
}
