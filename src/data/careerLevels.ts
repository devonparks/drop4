// Full Career Mode level data — 36 levels across 3 chapters
// Candy Crush meets NBA Street Vol. 2: named NPCs, wild board variants, creative rewards
// Each level has unique challenge type, named opponent, and rewards

import { Difficulty } from '../stores/gameStore';

export interface CareerLevel {
  id: number;
  name: string;
  opponent: string;
  opponentPersonality: string; // flavor text / trash talk
  chapter: number;
  type: CareerChallengeType;
  difficulty: Difficulty;
  isBoss: boolean;
  reward?: CareerReward;
  bonusReward?: CareerReward;
  // Game settings overrides
  settings: {
    rows?: number;
    cols?: number;
    connectCount?: number;
    timerSeconds?: number;
    playerGoesFirst?: boolean;
    presetBoard?: (0 | 1 | 2)[][]; // null = empty board
  };
  // Star thresholds — moves to earn 3 or 2 stars (1 star for any win)
  starThresholds?: { three: number; two: number };
}

export type CareerChallengeType =
  | 'standard'        // Normal 6x7 Connect 4
  | 'connect3'        // Connect 3 on small board
  | 'connect5'        // Connect 5 on big board
  | 'connect6'        // Connect 6 on huge board
  | 'timed'           // Standard board with timer per turn
  | 'go_second'       // Player goes second (disadvantage)
  | 'puzzle'          // Preset board, find the winning move
  | 'boss'            // Boss battle — harder AI, unique theme
  | 'speed'           // Very fast timer (5 seconds or less)
  | 'tournament';     // Beat multiple opponents in a row

export interface CareerReward {
  type: 'coins' | 'board' | 'pieces' | 'emote' | 'title' | 'pet';
  id?: string;
  name: string;
  amount?: number;
  icon: string;
}

// Helper to get challenge type display name
export function getChallengeTypeLabel(type: CareerChallengeType): string {
  switch (type) {
    case 'standard': return 'Standard 6x7';
    case 'connect3': return 'Connect 3';
    case 'connect5': return 'Connect 5';
    case 'connect6': return 'Connect 6';
    case 'timed': return 'Timed';
    case 'go_second': return 'Go Second';
    case 'puzzle': return 'Puzzle';
    case 'boss': return 'Boss Battle';
    case 'speed': return 'Speed';
    case 'tournament': return 'Tournament';
    default: return 'Standard';
  }
}

// ═══════════════════════════════════════════════════════
// CHAPTER 1: "THE BASICS" (Levels 1-12)
// Learn the fundamentals — friendly opponents, easy ramp
// ═══════════════════════════════════════════════════════

const CHAPTER_1: CareerLevel[] = [
  {
    id: 1,
    name: 'First Drop',
    opponent: 'Rookie Ron',
    opponentPersonality: 'Your first opponent. Go easy on him.',
    chapter: 1, type: 'standard', difficulty: 'easy', isBoss: false,
    settings: {},
    reward: { type: 'coins', name: '50 Coins', amount: 50, icon: '🪙' },
    starThresholds: { three: 8, two: 14 },
  },
  {
    id: 2,
    name: 'Getting Started',
    opponent: 'Beginner Ben',
    opponentPersonality: "He's learning too!",
    chapter: 1, type: 'standard', difficulty: 'easy', isBoss: false,
    settings: {},
    starThresholds: { three: 8, two: 14 },
  },
  {
    id: 3,
    name: 'Center Control',
    opponent: 'Casual Carl',
    opponentPersonality: 'Always plays the edges. Punish him for it.',
    chapter: 1, type: 'standard', difficulty: 'easy', isBoss: false,
    settings: {},
    reward: { type: 'coins', name: '100 Coins', amount: 100, icon: '🪙' },
    starThresholds: { three: 7, two: 12 },
  },
  {
    id: 4,
    name: 'Quick Thinking',
    opponent: 'Speedy Sam',
    opponentPersonality: 'Plays fast, thinks faster.',
    chapter: 1, type: 'timed', difficulty: 'easy', isBoss: false,
    settings: { timerSeconds: 15 },
    starThresholds: { three: 9, two: 15 },
  },
  {
    id: 5,
    name: 'Mini Match',
    opponent: 'Tiny Tim',
    opponentPersonality: 'Small board, big brain.',
    chapter: 1, type: 'connect3', difficulty: 'easy', isBoss: false,
    settings: { rows: 5, cols: 5, connectCount: 3 },
    reward: { type: 'board', id: 'wood', name: 'Wood Board', icon: '🪵' },
    starThresholds: { three: 5, two: 8 },
  },
  {
    id: 6,
    name: 'The Comeback',
    opponent: 'Lucky Luke',
    opponentPersonality: 'Can you win going second?',
    chapter: 1, type: 'go_second', difficulty: 'easy', isBoss: false,
    settings: { playerGoesFirst: false },
    starThresholds: { three: 9, two: 15 },
  },
  {
    id: 7,
    name: 'Block Party',
    opponent: 'Defensive Dee',
    opponentPersonality: 'She starts with an advantage!',
    chapter: 1, type: 'standard', difficulty: 'easy', isBoss: false,
    settings: {
      presetBoard: [
        [0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0],
        [0,0,2,0,2,0,2],
      ],
    },
    reward: { type: 'coins', name: '150 Coins', amount: 150, icon: '🪙' },
    starThresholds: { three: 8, two: 13 },
  },
  {
    id: 8,
    name: 'Speed Demon',
    opponent: 'Flash Fiona',
    opponentPersonality: 'Blink and you lose.',
    chapter: 1, type: 'speed', difficulty: 'medium', isBoss: false,
    settings: { timerSeconds: 5 },
    starThresholds: { three: 8, two: 14 },
  },
  {
    id: 9,
    name: 'Wide Open',
    opponent: 'Big Board Bob',
    opponentPersonality: 'More space, more possibilities.',
    chapter: 1, type: 'standard', difficulty: 'easy', isBoss: false,
    settings: { rows: 8, cols: 9 },
    reward: { type: 'coins', name: '200 Coins', amount: 200, icon: '🪙' },
    starThresholds: { three: 10, two: 16 },
  },
  {
    id: 10,
    name: 'Double Trouble',
    opponent: 'Tricky Tara',
    opponentPersonality: 'She sets traps everywhere.',
    chapter: 1, type: 'standard', difficulty: 'medium', isBoss: false,
    settings: {},
    starThresholds: { three: 8, two: 14 },
  },
  {
    id: 11,
    name: 'The Gauntlet',
    opponent: 'Iron Ivan',
    opponentPersonality: 'Five in a row? Good luck.',
    chapter: 1, type: 'connect5', difficulty: 'medium', isBoss: false,
    settings: { rows: 7, cols: 8, connectCount: 5 },
    reward: { type: 'pieces', id: 'chrome', name: 'Chrome Pieces', icon: '🔘' },
    starThresholds: { three: 10, two: 16 },
  },
  {
    id: 12,
    name: 'BOSS: The Rookie King',
    opponent: 'King Kyle',
    opponentPersonality: 'Beat the king to advance!',
    chapter: 1, type: 'boss', difficulty: 'medium', isBoss: true,
    settings: {},
    reward: { type: 'board', id: 'neon_glow', name: 'Neon Glow Board', icon: '✨' },
    bonusReward: { type: 'pet', id: 'dalmatian', name: 'Dalmatian Pet', icon: '🐕' },
    starThresholds: { three: 7, two: 12 },
  },
];

// ═══════════════════════════════════════════════════════
// CHAPTER 2: "THE GRIND" (Levels 13-24)
// Get creative — wild board sizes, crazy combos
// ═══════════════════════════════════════════════════════

const CHAPTER_2: CareerLevel[] = [
  {
    id: 13,
    name: 'Drop5',
    opponent: 'Stretch Stevens',
    opponentPersonality: 'Five connects. New rules.',
    chapter: 2, type: 'connect5', difficulty: 'medium', isBoss: false,
    settings: { rows: 8, cols: 9, connectCount: 5 },
    starThresholds: { three: 10, two: 16 },
  },
  {
    id: 14,
    name: 'Puzzle Start',
    opponent: 'Puzzle Pete',
    opponentPersonality: 'Solve the puzzle!',
    chapter: 2, type: 'puzzle', difficulty: 'medium', isBoss: false,
    settings: {
      presetBoard: [
        [0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0],
        [0,0,0,2,0,0,0],
        [0,0,1,1,0,0,0],
        [0,2,2,1,0,1,0],
        [2,1,1,2,2,1,2],
      ],
    },
    reward: { type: 'coins', name: '300 Coins', amount: 300, icon: '🪙' },
    starThresholds: { three: 4, two: 7 },
  },
  {
    id: 15,
    name: 'No Time',
    opponent: 'Blitz Betty',
    opponentPersonality: 'Think FAST.',
    chapter: 2, type: 'speed', difficulty: 'medium', isBoss: false,
    settings: { timerSeconds: 3 },
    starThresholds: { three: 8, two: 14 },
  },
  {
    id: 16,
    name: 'Tiny Terror',
    opponent: 'Micro Max',
    opponentPersonality: 'Small board, hard bot.',
    chapter: 2, type: 'connect3', difficulty: 'hard', isBoss: false,
    settings: { rows: 5, cols: 5, connectCount: 3 },
    starThresholds: { three: 5, two: 8 },
  },
  {
    id: 17,
    name: 'The Wall',
    opponent: 'Stone Cold Steve',
    opponentPersonality: 'The center column is blocked. Deal with it.',
    chapter: 2, type: 'standard', difficulty: 'medium', isBoss: false,
    settings: {
      // Center column half-filled with "neutral" pieces (player 2 as obstacle)
      presetBoard: [
        [0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0],
        [0,0,0,2,0,0,0],
        [0,0,0,2,0,0,0],
        [0,0,0,2,0,0,0],
      ],
    },
    reward: { type: 'coins', name: '400 Coins', amount: 400, icon: '🪙' },
    starThresholds: { three: 9, two: 14 },
  },
  {
    id: 18,
    name: 'Mirror Match',
    opponent: 'Copy Cat Clara',
    opponentPersonality: 'She copies your strategy.',
    chapter: 2, type: 'standard', difficulty: 'medium', isBoss: false,
    settings: {},
    starThresholds: { three: 8, two: 13 },
  },
  {
    id: 19,
    name: 'Giant Board',
    opponent: 'Mega Mike',
    opponentPersonality: 'Biggest board yet.',
    chapter: 2, type: 'standard', difficulty: 'medium', isBoss: false,
    settings: { rows: 9, cols: 9 },
    reward: { type: 'board', id: 'ice_arena', name: 'Ice Arena Board', icon: '❄️' },
    starThresholds: { three: 11, two: 18 },
  },
  {
    id: 20,
    name: 'Drop6',
    opponent: 'Six-Pack Sam',
    opponentPersonality: 'Six in a row to win!',
    chapter: 2, type: 'connect6', difficulty: 'medium', isBoss: false,
    settings: { rows: 9, cols: 9, connectCount: 6 },
    starThresholds: { three: 12, two: 20 },
  },
  {
    id: 21,
    name: 'Pressure',
    opponent: 'Clock Crusher',
    opponentPersonality: 'Tick tock...',
    chapter: 2, type: 'timed', difficulty: 'hard', isBoss: false,
    settings: { timerSeconds: 10 },
    reward: { type: 'coins', name: '500 Coins', amount: 500, icon: '🪙' },
    starThresholds: { three: 8, two: 14 },
  },
  {
    id: 22,
    name: 'Pre-Set Chaos',
    opponent: 'Chaos Karen',
    opponentPersonality: 'Chaos is her middle name.',
    chapter: 2, type: 'puzzle', difficulty: 'medium', isBoss: false,
    settings: {
      // Random-looking scattered pattern
      presetBoard: [
        [0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0],
        [0,0,2,0,1,0,0],
        [0,1,0,0,0,2,0],
        [2,0,1,2,0,1,0],
        [1,2,0,1,2,0,1],
      ],
    },
    starThresholds: { three: 5, two: 9 },
  },
  {
    id: 23,
    name: 'Endurance',
    opponent: 'Marathon Mel',
    opponentPersonality: 'Long game, short fuse.',
    chapter: 2, type: 'timed', difficulty: 'hard', isBoss: false,
    settings: { rows: 8, cols: 9, timerSeconds: 30 },
    reward: { type: 'pieces', id: 'fire_ice', name: 'Fire & Ice Pieces', icon: '🔥' },
    starThresholds: { three: 10, two: 16 },
  },
  {
    id: 24,
    name: 'BOSS: The Strategist',
    opponent: 'Grandmaster Grace',
    opponentPersonality: "She's 3 moves ahead of you.",
    chapter: 2, type: 'boss', difficulty: 'hard', isBoss: true,
    settings: { rows: 7, cols: 8, connectCount: 5, timerSeconds: 15 },
    reward: { type: 'board', id: 'galaxy', name: 'Galaxy Board', icon: '🌌' },
    bonusReward: { type: 'pet', id: 'wolf', name: 'Wolf Pet', icon: '🐺' },
    starThresholds: { three: 9, two: 15 },
  },
];

// ═══════════════════════════════════════════════════════
// CHAPTER 3: "THE ELITE" (Levels 25-36)
// Ultimate challenge — no mercy, insane combos
// ═══════════════════════════════════════════════════════

const CHAPTER_3: CareerLevel[] = [
  {
    id: 25,
    name: 'Nightmare Mode',
    opponent: 'Nightmare Nick',
    opponentPersonality: 'Opponent goes first AND has a head start.',
    chapter: 3, type: 'go_second', difficulty: 'hard', isBoss: false,
    settings: {
      playerGoesFirst: false,
      presetBoard: [
        [0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0],
        [0,0,0,2,0,0,0],
      ],
    },
    starThresholds: { three: 9, two: 15 },
  },
  {
    id: 26,
    name: 'Speed Chess',
    opponent: 'Lightning Lisa',
    opponentPersonality: 'Five in a row with a five-second clock.',
    chapter: 3, type: 'speed', difficulty: 'hard', isBoss: false,
    settings: { rows: 8, cols: 9, connectCount: 5, timerSeconds: 5 },
    reward: { type: 'coins', name: '600 Coins', amount: 600, icon: '🪙' },
    starThresholds: { three: 10, two: 16 },
  },
  {
    id: 27,
    name: 'The Maze',
    opponent: 'Maze Master Matt',
    opponentPersonality: 'Navigate the maze.',
    chapter: 3, type: 'puzzle', difficulty: 'hard', isBoss: false,
    settings: {
      // Maze-like pattern with alternating walls
      presetBoard: [
        [0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0],
        [0,2,0,2,0,2,0],
        [0,0,0,0,0,0,0],
        [2,0,2,0,2,0,2],
        [0,0,0,0,0,0,0],
      ],
    },
    starThresholds: { three: 7, two: 12 },
  },
  {
    id: 28,
    name: 'Drop3 Blitz',
    opponent: 'Quick Draw Quinn',
    opponentPersonality: 'Fastest game mode.',
    chapter: 3, type: 'speed', difficulty: 'hard', isBoss: false,
    settings: { rows: 5, cols: 5, connectCount: 3, timerSeconds: 3 },
    starThresholds: { three: 4, two: 7 },
  },
  {
    id: 29,
    name: 'Gravity Flip',
    opponent: 'Upside-Down Uma',
    opponentPersonality: 'Everything you know is wrong.',
    chapter: 3, type: 'standard', difficulty: 'hard', isBoss: false,
    settings: {},
    reward: { type: 'coins', name: '800 Coins', amount: 800, icon: '🪙' },
    starThresholds: { three: 7, two: 13 },
  },
  {
    id: 30,
    name: 'The Arena',
    opponent: 'Arena Alex',
    opponentPersonality: 'Pre-placed chaos on a big board.',
    chapter: 3, type: 'standard', difficulty: 'hard', isBoss: false,
    settings: {
      rows: 7, cols: 8,
      presetBoard: [
        [0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0],
        [0,0,2,0,0,1,0,0],
        [0,2,1,0,0,2,1,0],
        [2,1,2,1,2,1,2,1],
      ],
    },
    reward: { type: 'board', id: 'lava_pit', name: 'Lava Pit Board', icon: '🌋' },
    starThresholds: { three: 8, two: 13 },
  },
  {
    id: 31,
    name: 'Perfect Storm',
    opponent: 'Storm Surge Sara',
    opponentPersonality: 'The hardest combo.',
    chapter: 3, type: 'connect6', difficulty: 'hard', isBoss: false,
    settings: { rows: 9, cols: 9, connectCount: 6, timerSeconds: 10 },
    starThresholds: { three: 12, two: 20 },
  },
  {
    id: 32,
    name: "Veteran's Challenge",
    opponent: 'Old Guard Otto',
    opponentPersonality: 'Been playing since before you were born.',
    chapter: 3, type: 'connect5', difficulty: 'hard', isBoss: false,
    settings: { rows: 8, cols: 9, connectCount: 5 },
    reward: { type: 'coins', name: '1000 Coins', amount: 1000, icon: '🪙' },
    starThresholds: { three: 10, two: 16 },
  },
  {
    id: 33,
    name: 'Sudden Death',
    opponent: 'Grim Reaper Gina',
    opponentPersonality: "One mistake and you're done.",
    chapter: 3, type: 'speed', difficulty: 'hard', isBoss: false,
    settings: { timerSeconds: 5 },
    starThresholds: { three: 7, two: 12 },
  },
  {
    id: 34,
    name: 'The Impossible',
    opponent: 'Ghost Greg',
    opponentPersonality: 'Connect 5 on a standard board. Can you even do it?',
    chapter: 3, type: 'connect5', difficulty: 'hard', isBoss: false,
    settings: { rows: 6, cols: 7, connectCount: 5 },
    reward: { type: 'coins', name: '1500 Coins', amount: 1500, icon: '🪙' },
    starThresholds: { three: 10, two: 16 },
  },
  {
    id: 35,
    name: 'Last Stand',
    opponent: 'Final Boss Frank',
    opponentPersonality: 'The last regular challenge.',
    chapter: 3, type: 'standard', difficulty: 'hard', isBoss: false,
    settings: {
      playerGoesFirst: false,
      presetBoard: [
        [0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0],
        [0,0,0,2,0,0,0],
        [0,0,2,2,0,0,0],
      ],
    },
    starThresholds: { three: 8, two: 14 },
  },
  {
    id: 36,
    name: 'BOSS: DARK MATTER',
    opponent: 'The Dark Lord',
    opponentPersonality: 'The ultimate test.',
    chapter: 3, type: 'boss', difficulty: 'hard', isBoss: true,
    settings: { rows: 9, cols: 9, connectCount: 5, timerSeconds: 10, playerGoesFirst: false },
    reward: { type: 'board', id: 'dark_matter', name: 'Dark Matter Board', icon: '🌑' },
    starThresholds: { three: 10, two: 16 },
  },
];

// All levels
export const ALL_CAREER_LEVELS: CareerLevel[] = [...CHAPTER_1, ...CHAPTER_2, ...CHAPTER_3];

// Chapter info — Ch.2 unlocks after 8+ completed in Ch.1, Ch.3 after 8+ in Ch.2
// unlockLevel is used as: getCompletedCount() >= ch.unlockLevel - 1
export const CHAPTERS = [
  { id: 1, name: 'The Basics', levels: CHAPTER_1, unlockLevel: 1 },
  { id: 2, name: 'The Grind', levels: CHAPTER_2, unlockLevel: 9 },
  { id: 3, name: 'The Elite', levels: CHAPTER_3, unlockLevel: 21 },
];

// ═══════════════════════════════════════════════════════════════════════
// CAREER MODE 2.0 — "TAKE THE CITY"
//
// NBA Street Vol. 2 × Basketball Stars. The world is a map of US cities;
// each city is a court to conquer with a snake path of 12 opponent nodes.
// Existing CareerLevel data + NPCs + rules carry over — this is a view
// layer redesign. The nodes reference existing level ids.
// ═══════════════════════════════════════════════════════════════════════

export interface CareerCity {
  id: string;                // stable id, e.g. 'brooklyn'
  name: string;              // "Brooklyn"
  nickname: string;          // "The Rec"
  state: string;             // "NY"
  tagline: string;           // short pitch shown on the map
  unlockedAfterCityId?: string;  // progressive unlock chain
  comingSoon?: boolean;      // show on map but not playable yet
  themeColor: string;        // accent color for markers/path/badges
  accentColor: string;       // secondary highlight
  skyGradient: [string, string, string];   // 3-stop gradient for city screen sky
  mapPosition: { xPct: number; yPct: number }; // 0..100 coords on the stylized US map
  levelIds: number[];        // references into ALL_CAREER_LEVELS
}

// Compute an opponent "rating" (70-99) from difficulty + boss flag.
// This gives each node a "player card" number for the Basketball Stars vibe.
// Distribution:
//   Easy   → 70 + (id % 8)         (70-77)
//   Medium → 78 + (id % 8)         (78-85)
//   Hard   → 86 + (id % 8)         (86-93)
//   Boss   → +5 on top, capped 99
function computeRating(level: CareerLevel): number {
  const base =
    level.difficulty === 'easy' ? 70 :
    level.difficulty === 'medium' ? 78 : 86;
  const spread = (level.id * 3) % 8;    // mild variation so nodes aren't all identical
  const boss = level.isBoss ? 5 : 0;
  return Math.min(99, base + spread + boss);
}

// Exported for the node path view so it doesn't have to recompute on every render.
export const CAREER_RATINGS: Record<number, number> = ALL_CAREER_LEVELS.reduce(
  (acc, lvl) => {
    acc[lvl.id] = computeRating(lvl);
    return acc;
  },
  {} as Record<number, number>,
);

// ─── The Cities ────────────────────────────────────────────────────────
// 3 playable at launch (mapping cleanly onto existing chapters) + 6 teased.
// The teased cities show on the map with silhouettes + "Coming Soon" — huge
// hook for retention and teases the post-launch content pipeline.
export const CAREER_CITIES: CareerCity[] = [
  // ─── LIVE AT LAUNCH ───
  {
    id: 'brooklyn',
    name: 'Brooklyn',
    nickname: 'The Rec',
    state: 'NY',
    tagline: 'Where every baller starts. Cracked blacktop, real respect.',
    themeColor: '#f4a623',       // warm orange — street lamp glow
    accentColor: '#ff6b35',
    skyGradient: ['#1a2766', '#3a2a5c', '#f4a623'], // dusk
    mapPosition: { xPct: 90, yPct: 47 },   // lower-right (NE coast, below Harlem, more separation)
    levelIds: CHAPTER_1.map((l) => l.id),
  },
  {
    id: 'venice_beach',
    name: 'Venice Beach',
    nickname: 'The Boardwalk',
    state: 'CA',
    tagline: 'Sun, sand, and speed. Sharpen up or get burned.',
    unlockedAfterCityId: 'brooklyn',
    themeColor: '#ff8c42',       // sunset orange
    accentColor: '#ffd166',
    skyGradient: ['#ff6b9d', '#ff8c42', '#ffd166'], // sunset
    mapPosition: { xPct: 10, yPct: 58 },
    levelIds: CHAPTER_2.map((l) => l.id),
  },
  {
    id: 'harlem',
    name: 'Harlem',
    nickname: 'The Cathedral',
    state: 'NY',
    tagline: 'Where legends are made. Survive the night.',
    unlockedAfterCityId: 'venice_beach',
    themeColor: '#9b59b6',       // purple — night regal
    accentColor: '#f1c40f',
    skyGradient: ['#0a0e27', '#2d1b69', '#9b59b6'], // deep night
    mapPosition: { xPct: 85, yPct: 18 },   // upper-right above Brooklyn
    levelIds: CHAPTER_3.map((l) => l.id),
  },

  // ─── TEASED / COMING SOON ───
  {
    id: 'chicago',
    name: 'Chicago',
    nickname: 'The Cage',
    state: 'IL',
    tagline: 'Puzzle courts. Out-think or get out.',
    comingSoon: true,
    themeColor: '#3498db',
    accentColor: '#5dade2',
    skyGradient: ['#0a1e3c', '#1a4a7a', '#3498db'],
    mapPosition: { xPct: 60, yPct: 32 },
    levelIds: [],
  },
  {
    id: 'detroit',
    name: 'Detroit',
    nickname: 'The Motor',
    state: 'MI',
    tagline: 'Mixed modes, rough crowd. Prove it.',
    comingSoon: true,
    themeColor: '#95a5a6',
    accentColor: '#bdc3c7',
    skyGradient: ['#1a1a1a', '#4a4a4a', '#95a5a6'],
    mapPosition: { xPct: 70, yPct: 22 },
    levelIds: [],
  },
  {
    id: 'oakland',
    name: 'Oakland',
    nickname: 'The Town',
    state: 'CA',
    tagline: 'Connect 6 country. No weak links.',
    comingSoon: true,
    themeColor: '#2ecc71',
    accentColor: '#58d68d',
    skyGradient: ['#0a2a1e', '#1a5a3e', '#2ecc71'],
    mapPosition: { xPct: 4, yPct: 34 },
    levelIds: [],
  },
  {
    id: 'compton',
    name: 'Compton',
    nickname: 'The Yard',
    state: 'CA',
    tagline: 'Speed demons only. Blink and lose.',
    comingSoon: true,
    themeColor: '#e74c3c',
    accentColor: '#ff6b6b',
    skyGradient: ['#2d0a0a', '#8b1e1e', '#e74c3c'],
    mapPosition: { xPct: 22, yPct: 78 },
    levelIds: [],
  },
  {
    id: 'miami',
    name: 'Miami',
    nickname: 'South Beach',
    state: 'FL',
    tagline: 'Tournaments under neon lights.',
    comingSoon: true,
    themeColor: '#ff006e',
    accentColor: '#00f5ff',
    skyGradient: ['#1a0a3e', '#6a0dad', '#ff006e'],
    mapPosition: { xPct: 80, yPct: 85 },
    levelIds: [],
  },
  {
    id: 'the_void',
    name: '???',
    nickname: 'The Void',
    state: '??',
    tagline: 'Rumors only. Nobody comes back the same.',
    comingSoon: true,
    themeColor: '#e94560',
    accentColor: '#7b2cbf',
    skyGradient: ['#000000', '#1a0033', '#e94560'],
    mapPosition: { xPct: 45, yPct: 60 },
    levelIds: [],
  },
];

// Fast lookups
export const CITY_BY_ID: Record<string, CareerCity> = CAREER_CITIES.reduce(
  (acc, c) => { acc[c.id] = c; return acc; },
  {} as Record<string, CareerCity>,
);

// ─── Helpers ──────────────────────────────────────────────────────────

/** All levels that belong to a given city, in career order. */
export function getLevelsForCity(cityId: string): CareerLevel[] {
  const city = CITY_BY_ID[cityId];
  if (!city) return [];
  return city.levelIds
    .map((id) => ALL_CAREER_LEVELS.find((l) => l.id === id))
    .filter((l): l is CareerLevel => !!l);
}

/** Is a city unlocked given the set of completed level ids? */
export function isCityUnlocked(cityId: string, completedLevelIds: Set<number>): boolean {
  const city = CITY_BY_ID[cityId];
  if (!city) return false;
  if (city.comingSoon) return false;
  if (!city.unlockedAfterCityId) return true;   // starter city
  // A city unlocks when its prerequisite city is fully cleared.
  const prereq = CITY_BY_ID[city.unlockedAfterCityId];
  if (!prereq) return true;
  return prereq.levelIds.every((id) => completedLevelIds.has(id));
}

/** Completion count + star count for a given city. */
export function getCityCompletion(
  city: CareerCity,
  progress: { [levelId: number]: { stars: number; completed: boolean } } = {},
): { completed: number; total: number; stars: number; maxStars: number; fraction: number } {
  const total = city.levelIds.length;
  let completed = 0;
  let stars = 0;
  for (const id of city.levelIds) {
    const p = progress[id];
    if (p?.completed) completed++;
    stars += p?.stars ?? 0;
  }
  const maxStars = total * 3;
  return {
    completed,
    total,
    stars,
    maxStars,
    fraction: total > 0 ? completed / total : 0,
  };
}

/** Aggregate reputation: 0-5 stars based on total career stars. */
export function getReputationStars(totalStars: number): number {
  // 108 max stars across all 3 launch cities. 20 stars per rep star, capped at 5.
  return Math.min(5, Math.floor(totalStars / 20));
}
