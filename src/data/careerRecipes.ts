// ═══════════════════════════════════════════════════════════════════════
// careerRecipes.ts — recipe DSL for the 200-level career mode
//
// 2026-05-06 strategic shift: Drop4's retention engine is its career mode
// (no multiplayer in v1). Hand-typing 200 CareerLevel objects doesn't
// scale and isn't how Candy Crush authors theirs either. This file
// holds two things:
//
//   1. The Recipe types — a DSL for declaring a city + its 12-15 levels
//      with sensible defaults so each entry stays compact.
//   2. The CITY_RECIPES array — one entry per city, in the exact order
//      they appear on the map. The order matters: it determines level
//      ID assignment via the generator (cityIndex × LEVELS_PER_CITY).
//
// The generator (careerGenerator.ts) consumes these recipes and emits
// fully-populated CareerLevel objects + CareerCity entries. Existing
// consumers (careerStore, ALL_CAREER_LEVELS, CHAPTERS, CAREER_CITIES,
// CAREER_RATINGS) continue to work because careerLevels.ts re-exports
// the generator output under the same names.
//
// ID stability contract: the existing 36 levels (Brooklyn 1-12,
// Venice 13-24, Harlem 25-36) MUST keep their IDs because
// careerStore.progress is keyed by ID and persists across sessions.
// New cities pick up at 37+ in city-order.
// ═══════════════════════════════════════════════════════════════════════

import type { Difficulty } from '../stores/gameStore';
import type { CareerLevel, CareerChallengeType, CareerReward } from './careerLevels';

// ─── Recipe types ─────────────────────────────────────────────────────

/** A single level slot within a city. Most fields are optional — the
 *  generator fills in defaults from the city's roster + the level
 *  type. Only `type` and `difficulty` are required. */
export interface LevelRecipe {
  /** Required. The mechanic this level uses (standard, obstacle,
   *  jeopardy, boss, etc.). */
  type: CareerChallengeType;
  /** Required. Difficulty band — drives AI strength + reward sizing. */
  difficulty: Difficulty;
  /** Optional override. Defaults to a generated name based on the
   *  level type and slot position (e.g. "Roadblock" for obstacle,
   *  "Quick Thinking" for timed). */
  name?: string;
  /** Optional override. Defaults to round-robin pull from the city's
   *  `opponents` roster (slot index → roster index). */
  opponent?: string;
  /** Optional override. Defaults to a templated personality string
   *  built from the type + opponent name. */
  personality?: string;
  /** Optional. Forwarded to CareerLevel.settings. Use for type-specific
   *  config: timerSeconds (timed/speed), obstacleCells (obstacle),
   *  movesLimit (target), connectCount (connect5/6), bossScript (boss),
   *  etc. */
  settings?: Partial<CareerLevel['settings']>;
  /** Optional reward override. Defaults to a coin reward scaled by
   *  difficulty + level type (e.g. obstacle wins grant +1 Hint). */
  reward?: CareerReward;
  /** Optional bonus reward — typically only on bosses for the
   *  legendary skin / pet drop. */
  bonusReward?: CareerReward;
  /** Optional star thresholds. Defaults to a type-based heuristic. */
  starThresholds?: { three: number; two: number };
}

/** A city in the career map. Holds metadata (palette, vibe, location)
 *  + a roster of opponent names + the recipes for its levels. */
export interface CityRecipe {
  /** Stable id matching CareerCity.id. Used by careerStore for
   *  persistence (cityCompletePending references this). */
  id: string;
  /** Display name (e.g. 'Brooklyn'). */
  name: string;
  /** State / region tag (e.g. 'NY'). */
  state: string;
  /** Court nickname (e.g. 'The Rec'). */
  nickname: string;
  /** One-line pitch on the map view. */
  tagline: string;
  /** Primary palette color — markers, path, badges. */
  themeColor: string;
  /** Secondary highlight color. */
  accentColor: string;
  /** 3-stop sky gradient for the city screen background. */
  skyGradient: [string, string, string];
  /** Position on the stylized US map (0..100 percent coords). */
  mapPosition: { xPct: number; yPct: number };
  /** Optional: which city must be cleared before this one unlocks.
   *  Used by the map to lock/dim future destinations. */
  unlockedAfterCityId?: string;
  /** When true, the city renders on the map but isn't playable yet
   *  (no levels generated). Used during the content build-out. */
  comingSoon?: boolean;
  /** Roster of opponent names for this city. The generator round-
   *  robins through them when a recipe doesn't specify an opponent. */
  opponents: string[];
  /** Optional pool of personality strings the generator can pull from
   *  when a recipe doesn't specify one. Random-by-slot for stability. */
  personalityPool?: string[];
  /** The level recipes in slot order. Slot N → ID = (cityOrder × N).
   *  Boss is whichever slot has type='boss' (typically the last one).
   *  Most cities have 12 levels (Candy Crush episode size). */
  levels: LevelRecipe[];
}

// ─── Default reward sizing per (difficulty, type) ─────────────────────
// Used by the generator when a recipe omits `reward`. Keeps coin /
// gem / hint payouts consistent across the 200 levels without
// requiring per-level reward authoring.

interface RewardDefaults {
  coins: number;
  /** Optional bonus — gems for puzzles/speed, hints for obstacles/timed. */
  bonus?: { type: 'gems' | 'hints'; amount: number };
  /** Icon glyph for the reward chip on the city screen. */
  icon: string;
}

const REWARD_BY_TYPE: Partial<Record<CareerChallengeType, Partial<Record<Difficulty, RewardDefaults>>>> = {
  standard: {
    easy:   { coins: 100, icon: '🪙' },
    medium: { coins: 250, icon: '🪙' },
    hard:   { coins: 600, icon: '🪙' },
  },
  timed: {
    easy:   { coins: 100, bonus: { type: 'hints', amount: 1 }, icon: '⏱️' },
    medium: { coins: 300, bonus: { type: 'hints', amount: 1 }, icon: '⏱️' },
    hard:   { coins: 700, bonus: { type: 'hints', amount: 2 }, icon: '⏱️' },
  },
  speed: {
    easy:   { coins: 150, bonus: { type: 'gems', amount: 1 }, icon: '⚡' },
    medium: { coins: 400, bonus: { type: 'gems', amount: 2 }, icon: '⚡' },
    hard:   { coins: 800, bonus: { type: 'gems', amount: 3 }, icon: '⚡' },
  },
  obstacle: {
    easy:   { coins: 150, bonus: { type: 'hints', amount: 1 }, icon: '🧱' },
    medium: { coins: 350, bonus: { type: 'hints', amount: 1 }, icon: '🧱' },
    hard:   { coins: 800, bonus: { type: 'hints', amount: 2 }, icon: '🧱' },
  },
  moves_limit: {
    easy:   { coins: 200, bonus: { type: 'gems', amount: 1 }, icon: '🎯' },
    medium: { coins: 450, bonus: { type: 'gems', amount: 3 }, icon: '🎯' },
    hard:   { coins: 1000, bonus: { type: 'gems', amount: 6 }, icon: '🎯' },
  },
  puzzle: {
    easy:   { coins: 200, bonus: { type: 'gems', amount: 2 }, icon: '🧩' },
    medium: { coins: 450, bonus: { type: 'gems', amount: 4 }, icon: '🧩' },
    hard:   { coins: 950, bonus: { type: 'gems', amount: 6 }, icon: '🧩' },
  },
  jeopardy: {
    easy:   { coins: 300, bonus: { type: 'gems', amount: 1 }, icon: '💰' },
    medium: { coins: 750, bonus: { type: 'gems', amount: 2 }, icon: '💰' },
    hard:   { coins: 1500, bonus: { type: 'gems', amount: 4 }, icon: '💰' },
  },
  go_second: {
    easy:   { coins: 120, icon: '↩' },
    medium: { coins: 300, icon: '↩' },
    hard:   { coins: 700, icon: '↩' },
  },
  connect3: {
    easy:   { coins: 100, icon: '3️⃣' },
    medium: { coins: 250, icon: '3️⃣' },
    hard:   { coins: 600, icon: '3️⃣' },
  },
  connect5: {
    easy:   { coins: 200, bonus: { type: 'gems', amount: 1 }, icon: '5️⃣' },
    medium: { coins: 500, bonus: { type: 'gems', amount: 2 }, icon: '5️⃣' },
    hard:   { coins: 1000, bonus: { type: 'gems', amount: 3 }, icon: '5️⃣' },
  },
  connect6: {
    easy:   { coins: 250, bonus: { type: 'gems', amount: 2 }, icon: '6️⃣' },
    medium: { coins: 600, bonus: { type: 'gems', amount: 3 }, icon: '6️⃣' },
    hard:   { coins: 1200, bonus: { type: 'gems', amount: 5 }, icon: '6️⃣' },
  },
  // tournament + boss have bespoke rewards (legendary skins / pets) so
  // they're not in this defaults table — recipes always explicitly set
  // them.
};

/** Build a CareerReward from the (difficulty, type) defaults. Used by
 *  the generator when a recipe omits its `reward` field. */
export function defaultRewardFor(type: CareerChallengeType, difficulty: Difficulty): CareerReward {
  const def = REWARD_BY_TYPE[type]?.[difficulty];
  if (!def) {
    // Bosses + anything not in the table — fall back to a flat coin
    // payout. Boss recipes always set their own reward explicitly.
    const coins = difficulty === 'easy' ? 200 : difficulty === 'medium' ? 500 : 1000;
    return { type: 'coins', name: `${coins} Coins`, amount: coins, icon: '🪙' };
  }
  const bonusLabel = def.bonus
    ? def.bonus.type === 'gems'
      ? ` + ${def.bonus.amount} 💎`
      : ` + ${def.bonus.amount} Hint${def.bonus.amount > 1 ? 's' : ''}`
    : '';
  return {
    type: 'coins',
    name: `${def.coins} Coins${bonusLabel}`,
    amount: def.coins,
    icon: def.icon,
  };
}

// ─── Default star thresholds per type ─────────────────────────────────
// Move counts that earn 3 / 2 stars. The generator uses these when a
// recipe omits its starThresholds field. Tuned conservatively — playtest
// data will sharpen these.

const STAR_DEFAULTS: Partial<Record<CareerChallengeType, { three: number; two: number }>> = {
  standard:    { three: 8, two: 14 },
  timed:       { three: 9, two: 15 },
  speed:       { three: 7, two: 12 },
  obstacle:    { three: 9, two: 14 },
  moves_limit: { three: 5, two: 5 },
  puzzle:      { three: 5, two: 8 },
  jeopardy:    { three: 10, two: 16 },
  go_second:   { three: 9, two: 15 },
  connect3:    { three: 5, two: 8 },
  connect5:    { three: 10, two: 16 },
  connect6:    { three: 12, two: 20 },
  boss:        { three: 10, two: 16 },
  tournament:  { three: 10, two: 16 },
};

/** Star thresholds for a level type. Falls back to standard if the
 *  type isn't in the defaults map. */
export function defaultStarsFor(type: CareerChallengeType): { three: number; two: number } {
  return STAR_DEFAULTS[type] ?? STAR_DEFAULTS.standard!;
}

// ─── Default name + personality templates ─────────────────────────────
// When a recipe omits `name` or `personality`, the generator picks one
// from these pools. Slot index seeds the pick so the same level always
// gets the same auto-name (no churn between renders).

const NAME_TEMPLATES: Partial<Record<CareerChallengeType, string[]>> = {
  standard:    ['Standard Match', 'Open Court', 'Center Control', 'Mid-Game', 'Free Form'],
  timed:       ['Quick Thinking', 'Beat the Clock', 'Tick Tock', 'Pressure Drop', 'Time Crunch'],
  speed:       ['Speed Demon', 'Blink and Lose', 'Quickdraw', 'Sudden Death', 'Lightning Round'],
  obstacle:    ['Roadblock', 'The Wall', 'Maze Walls', 'Concrete Jungle', 'Hard Lines'],
  moves_limit: ['Six-Move Win', 'Move Smart', 'Five and Done', 'Limited Drops', 'Twenty Moves'],
  puzzle:      ['Puzzle Start', 'Pre-Set Chaos', 'The Maze', 'Brain Teaser', 'Solve It'],
  jeopardy:    ['Double Jeopardy', 'High Stakes', 'Triple Bag', 'All In', 'Final Jeopardy'],
  go_second:   ['The Comeback', 'Going Second', 'Catch-Up', 'Underdog', 'Late Bloomer'],
  connect3:    ['Mini Match', 'Tiny Terror', 'Drop3', 'Three Wins', 'Small Stakes'],
  connect5:    ['Drop5', 'Stretch It', 'Five in a Row', "Veteran's Test", 'Long Game'],
  connect6:    ['Drop6', 'Wide Open', 'Marathon', 'Big Numbers', 'Six-Pack'],
};

const PERSONALITY_TEMPLATES: Partial<Record<CareerChallengeType, string[]>> = {
  standard:    ['Classic match. Show what you got.', 'Plays straight. No tricks.', 'A clean game. Earn it.'],
  timed:       ['Plays fast. Think faster.', 'Thinks on the move.', 'Tick tock — clock is on you.'],
  speed:       ['Blink and you lose.', "Doesn't wait around.", 'Lightning fingers.'],
  obstacle:    ['Set up roadblocks. Work around them.', 'Loves a maze. Find the line.', 'The board is half closed.'],
  moves_limit: ["Counts every drop. So should you.", "No wasted moves here.", 'Win clean or go home.'],
  puzzle:      ['Already mid-fight. Read the board.', 'Position is everything.', 'Solve the start, win the end.'],
  jeopardy:    ['Triple coin payout. All on the line.', 'High roller. Bring it.', "Big stakes — don't blink."],
  go_second:   ['Has a head start. Catch up if you can.', "Goes first. You play catch-up.", 'Started early. End it late.'],
  connect3:    ['Small board, big brain.', 'Tight spaces. Sharp minds.', 'Three in a row. Move fast.'],
  connect5:    ['Long lines only. Five wins.', 'Patience pays. Five in a row.', "Stretches it out."],
  connect6:    ['Six in a row. Marathon match.', 'Big board, bigger lines.', 'Plays the long game.'],
};

/** Pick a name from the type's pool, indexed by slot for stability. */
export function defaultNameFor(type: CareerChallengeType, slotIndex: number): string {
  const pool = NAME_TEMPLATES[type] ?? NAME_TEMPLATES.standard!;
  return pool[slotIndex % pool.length];
}

/** Pick a personality from the type's pool, indexed by slot. */
export function defaultPersonalityFor(type: CareerChallengeType, slotIndex: number): string {
  const pool = PERSONALITY_TEMPLATES[type] ?? PERSONALITY_TEMPLATES.standard!;
  return pool[slotIndex % pool.length];
}

// ─── The recipes ──────────────────────────────────────────────────────
// Order matters — ID assignment walks the cities in array order.
// EXISTING 3 cities (Brooklyn, Venice, Harlem) are migrated from the
// hand-typed CHAPTER_1/2/3 in careerLevels.ts. NEW cities pick up at
// ID=37+ as they're authored in Phase B.

export const CITY_RECIPES: CityRecipe[] = [
  // ─── 1 · BROOKLYN ─────────────────────────────────────────────────
  // The Rec — streetball roots. Levels 1-12. Boss: Tommy Blacktop.
  {
    id: 'brooklyn',
    name: 'Brooklyn',
    state: 'NY',
    nickname: 'The Rec',
    tagline: 'Where every baller starts. Cracked blacktop, real respect.',
    themeColor: '#f4a623',
    accentColor: '#ff6b35',
    skyGradient: ['#1a2766', '#3a2a5c', '#f4a623'],
    mapPosition: { xPct: 90, yPct: 47 },
    opponents: [
      'Rookie Ron', 'Speedy Sam', 'Casual Carl', 'Beginner Ben',
      'Tiny Tim', 'Lucky Luke', 'Defensive Dee', 'Flash Fiona',
      'Big Board Bob', 'Tricky Tara', 'Iron Ivan', 'Tommy Blacktop',
    ],
    levels: [
      { type: 'standard', difficulty: 'easy', name: 'First Drop', opponent: 'Rookie Ron', personality: 'Your first opponent. Go easy on him.', reward: { type: 'coins', name: '50 Coins', amount: 50, icon: '🪙' } },
      { type: 'timed', difficulty: 'easy', name: 'Quick Thinking', opponent: 'Speedy Sam', personality: 'Plays fast, thinks faster.', settings: { timerSeconds: 15 }, reward: { type: 'coins', name: '50 Coins + 1 Hint', amount: 50, icon: '⏱️' } },
      { type: 'standard', difficulty: 'easy', name: 'Center Control', opponent: 'Casual Carl', personality: 'Always plays the edges. Punish him for it.', reward: { type: 'coins', name: '100 Coins', amount: 100, icon: '🪙' }, starThresholds: { three: 7, two: 12 } },
      { type: 'obstacle', difficulty: 'easy', name: 'First Wall', opponent: 'Beginner Ben', personality: "He's set up a tiny wall. Play around it.", settings: { obstacleCells: [{ row: 4, col: 3 }, { row: 5, col: 3 }] }, reward: { type: 'coins', name: '100 Coins + 1 Hint', amount: 100, icon: '🧱' } },
      { type: 'connect3', difficulty: 'easy', name: 'Mini Match', opponent: 'Tiny Tim', personality: 'Small board, big brain.', settings: { rows: 5, cols: 5, connectCount: 3 }, reward: { type: 'board', id: 'wood', name: 'Wood Board', icon: '🪵' }, starThresholds: { three: 5, two: 8 } },
      { type: 'go_second', difficulty: 'easy', name: 'The Comeback', opponent: 'Lucky Luke', personality: 'Can you win going second?', settings: { playerGoesFirst: false } },
      { type: 'standard', difficulty: 'easy', name: 'Block Party', opponent: 'Defensive Dee', personality: 'She starts with an advantage!', settings: { presetBoard: [[0,0,0,0,0,0,0],[0,0,0,0,0,0,0],[0,0,0,0,0,0,0],[0,0,0,0,0,0,0],[0,0,0,0,0,0,0],[0,0,2,0,2,0,2]] }, reward: { type: 'coins', name: '150 Coins', amount: 150, icon: '🪙' }, starThresholds: { three: 8, two: 13 } },
      { type: 'speed', difficulty: 'medium', name: 'Speed Demon', opponent: 'Flash Fiona', personality: 'Blink and you lose.', settings: { timerSeconds: 5 }, reward: { type: 'coins', name: '150 Coins + 1 💎', amount: 150, icon: '⚡' } },
      { type: 'moves_limit', difficulty: 'easy', name: 'Six-Move Win', opponent: 'Big Board Bob', personality: 'Big board. Six moves to win or you lose. Move smart.', settings: { rows: 8, cols: 9, movesLimit: 6 }, reward: { type: 'coins', name: '200 Coins + 1 💎', amount: 200, icon: '🎯' }, starThresholds: { three: 6, two: 6 } },
      { type: 'obstacle', difficulty: 'medium', name: 'Roadblock', opponent: 'Tricky Tara', personality: 'She set up roadblocks. Play around them.', settings: { obstacleCells: [{ row: 2, col: 1 }, { row: 3, col: 2 }, { row: 3, col: 4 }, { row: 2, col: 5 }] }, reward: { type: 'coins', name: '250 Coins + 1 Hint', amount: 250, icon: '🧱' }, starThresholds: { three: 9, two: 15 } },
      { type: 'jeopardy', difficulty: 'medium', name: 'Double Jeopardy', opponent: 'Iron Ivan', personality: 'Five in a row, triple the bag. Everything on the line.', settings: { rows: 7, cols: 8, connectCount: 5, rewardMultiplier: 3 }, reward: { type: 'pieces', id: 'chrome', name: 'Chrome Pieces', icon: '🔘' }, starThresholds: { three: 10, two: 16 } },
      { type: 'boss', difficulty: 'medium', name: 'BOSS: Tommy Blacktop', opponent: 'Tommy Blacktop', personality: "Brooklyn's king. Even cols on even turns, odd on odd turns. Break his rhythm or lose.", settings: { bossScript: 'tommy' }, reward: { type: 'board', id: 'neon_glow', name: 'Neon Glow Board', icon: '✨' }, bonusReward: { type: 'pet', id: 'dalmatian', name: 'Dalmatian Pet', icon: '🐕' }, starThresholds: { three: 8, two: 13 } },
    ],
  },

  // ─── 2 · VENICE BEACH ─────────────────────────────────────────────
  // The Boardwalk — sun + speed. Levels 13-24. Boss: Sunset Sal.
  {
    id: 'venice_beach',
    name: 'Venice Beach',
    state: 'CA',
    nickname: 'The Boardwalk',
    tagline: 'Sun, sand, and speed. Sharpen up or get burned.',
    unlockedAfterCityId: 'brooklyn',
    themeColor: '#ff8c42',
    accentColor: '#ffd166',
    skyGradient: ['#ff6b9d', '#ff8c42', '#ffd166'],
    mapPosition: { xPct: 10, yPct: 58 },
    opponents: [
      'Stretch Stevens', 'Puzzle Pete', 'Blitz Betty', 'Micro Max',
      'Stone Cold Steve', 'Copy Cat Clara', 'Mega Mike', 'Six-Pack Sam',
      'Clock Crusher', 'Chaos Karen', 'Marathon Mel', 'Sunset Sal',
    ],
    levels: [
      { type: 'connect5', difficulty: 'medium', name: 'Drop5', opponent: 'Stretch Stevens', personality: 'Five connects. New rules.', settings: { rows: 8, cols: 9, connectCount: 5 }, reward: { type: 'coins', name: '300 Coins + 2 💎', amount: 300, icon: '5️⃣' } },
      { type: 'puzzle', difficulty: 'medium', name: 'Puzzle Start', opponent: 'Puzzle Pete', personality: 'Solve the puzzle!', settings: { presetBoard: [[0,0,0,0,0,0,0],[0,0,0,0,0,0,0],[0,0,0,2,0,0,0],[0,0,1,1,0,0,0],[0,2,2,1,0,1,0],[2,1,1,2,2,1,2]] }, reward: { type: 'coins', name: '300 Coins + 3 💎', amount: 300, icon: '🧩' }, starThresholds: { three: 4, two: 7 } },
      { type: 'speed', difficulty: 'medium', name: 'No Time', opponent: 'Blitz Betty', personality: 'Think FAST.', settings: { timerSeconds: 3 }, reward: { type: 'coins', name: '350 Coins + 2 💎', amount: 350, icon: '⚡' } },
      { type: 'connect3', difficulty: 'hard', name: 'Tiny Terror', opponent: 'Micro Max', personality: 'Small board, hard bot.', settings: { rows: 5, cols: 5, connectCount: 3 }, reward: { type: 'coins', name: '300 Coins', amount: 300, icon: '3️⃣' }, starThresholds: { three: 5, two: 8 } },
      { type: 'obstacle', difficulty: 'medium', name: 'The Wall', opponent: 'Stone Cold Steve', personality: 'The center column is blocked. Deal with it.', settings: { obstacleCells: [{ row: 3, col: 3 }, { row: 4, col: 3 }, { row: 5, col: 3 }] }, reward: { type: 'coins', name: '400 Coins + 2 Hints', amount: 400, icon: '🧱' }, starThresholds: { three: 9, two: 14 } },
      { type: 'obstacle', difficulty: 'medium', name: 'Maze Walls', opponent: 'Copy Cat Clara', personality: 'Three walls form a maze. Find the win line through it.', settings: { obstacleCells: [{ row: 2, col: 2 }, { row: 3, col: 2 }, { row: 2, col: 4 }, { row: 4, col: 1 }, { row: 4, col: 5 }] }, reward: { type: 'coins', name: '400 Coins + 1 Hint', amount: 400, icon: '🧱' }, starThresholds: { three: 8, two: 13 } },
      { type: 'standard', difficulty: 'medium', name: 'Giant Board', opponent: 'Mega Mike', personality: 'Biggest board yet.', settings: { rows: 9, cols: 9 }, reward: { type: 'board', id: 'ice_arena', name: 'Ice Arena Board', icon: '❄️' }, starThresholds: { three: 11, two: 18 } },
      { type: 'connect6', difficulty: 'medium', name: 'Drop6', opponent: 'Six-Pack Sam', personality: 'Six in a row to win!', settings: { rows: 9, cols: 9, connectCount: 6 }, reward: { type: 'coins', name: '500 Coins + 3 💎', amount: 500, icon: '6️⃣' }, starThresholds: { three: 12, two: 20 } },
      { type: 'timed', difficulty: 'hard', name: 'Pressure', opponent: 'Clock Crusher', personality: 'Tick tock...', settings: { timerSeconds: 10 }, reward: { type: 'coins', name: '500 Coins + 2 Hints', amount: 500, icon: '⏱️' } },
      { type: 'puzzle', difficulty: 'medium', name: 'Pre-Set Chaos', opponent: 'Chaos Karen', personality: 'Chaos is her middle name.', settings: { presetBoard: [[0,0,0,0,0,0,0],[0,0,0,0,0,0,0],[0,0,2,0,1,0,0],[0,1,0,0,0,2,0],[2,0,1,2,0,1,0],[1,2,0,1,2,0,1]] }, reward: { type: 'coins', name: '450 Coins + 4 💎', amount: 450, icon: '🧩' }, starThresholds: { three: 5, two: 9 } },
      { type: 'moves_limit', difficulty: 'hard', name: 'Twenty Moves', opponent: 'Marathon Mel', personality: "Twenty moves to win. That's it. No more, no less.", settings: { rows: 7, cols: 8, movesLimit: 20 }, reward: { type: 'pieces', id: 'fire_ice', name: 'Fire & Ice Pieces + 5 💎', icon: '🔥' }, starThresholds: { three: 12, two: 16 } },
      { type: 'boss', difficulty: 'hard', name: 'BOSS: Sunset Sal', opponent: 'Sunset Sal', personality: 'Venice Beach. Gravity flips every 4 moves. The board you see is not the board you play.', settings: { rows: 7, cols: 8, connectCount: 5, timerSeconds: 15, bossScript: 'sal', presetBoard: [[0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0],[0,0,0,1,2,0,0,0],[0,0,0,2,1,0,0,0],[0,0,2,1,1,2,0,0]] }, reward: { type: 'board', id: 'galaxy', name: 'Galaxy Board', icon: '🌌' }, bonusReward: { type: 'pet', id: 'wolf', name: 'Wolf Pet', icon: '🐺' }, starThresholds: { three: 10, two: 16 } },
    ],
  },

  // ─── 3 · HARLEM ───────────────────────────────────────────────────
  // The Cathedral — endgame. Levels 25-36. Boss: Cathedral Warden.
  {
    id: 'harlem',
    name: 'Harlem',
    state: 'NY',
    nickname: 'The Cathedral',
    tagline: 'Where legends are made. Survive the night.',
    unlockedAfterCityId: 'venice_beach',
    themeColor: '#9b59b6',
    accentColor: '#f1c40f',
    skyGradient: ['#0a0e27', '#2d1b69', '#9b59b6'],
    mapPosition: { xPct: 85, yPct: 18 },
    opponents: [
      'Nightmare Nick', 'Lightning Lisa', 'Maze Master Matt', 'Quick Draw Quinn',
      'Upside-Down Uma', 'Arena Alex', 'Storm Surge Sara', 'Old Guard Otto',
      'Grim Reaper Gina', 'Ghost Greg', 'Final Boss Frank', 'The Cathedral Warden',
    ],
    levels: [
      { type: 'go_second', difficulty: 'hard', name: 'Nightmare Mode', opponent: 'Nightmare Nick', personality: 'Opponent goes first AND has a head start.', settings: { playerGoesFirst: false, presetBoard: [[0,0,0,0,0,0,0],[0,0,0,0,0,0,0],[0,0,0,0,0,0,0],[0,0,0,0,0,0,0],[0,0,0,0,0,0,0],[0,0,0,2,0,0,0]] }, reward: { type: 'coins', name: '550 Coins', amount: 550, icon: '↩' } },
      { type: 'speed', difficulty: 'hard', name: 'Speed Chess', opponent: 'Lightning Lisa', personality: 'Five in a row with a five-second clock.', settings: { rows: 8, cols: 9, connectCount: 5, timerSeconds: 5 }, reward: { type: 'coins', name: '600 Coins + 3 💎', amount: 600, icon: '⚡' } },
      { type: 'puzzle', difficulty: 'hard', name: 'The Maze', opponent: 'Maze Master Matt', personality: 'Navigate the maze.', settings: { presetBoard: [[0,0,0,0,0,0,0],[0,0,0,0,0,0,0],[0,2,0,2,0,2,0],[0,0,0,0,0,0,0],[2,0,2,0,2,0,2],[0,0,0,0,0,0,0]] }, reward: { type: 'coins', name: '650 Coins + 5 💎', amount: 650, icon: '🧩' }, starThresholds: { three: 7, two: 12 } },
      { type: 'speed', difficulty: 'hard', name: 'Drop3 Blitz', opponent: 'Quick Draw Quinn', personality: 'Fastest game mode.', settings: { rows: 5, cols: 5, connectCount: 3, timerSeconds: 3 }, reward: { type: 'coins', name: '500 Coins + 2 💎', amount: 500, icon: '⚡' } },
      { type: 'obstacle', difficulty: 'hard', name: 'Concrete Jungle', opponent: 'Upside-Down Uma', personality: 'Six walls. Three real wins. Find one.', settings: { obstacleCells: [{ row: 1, col: 2 }, { row: 2, col: 1 }, { row: 3, col: 3 }, { row: 4, col: 5 }, { row: 2, col: 5 }, { row: 4, col: 2 }] }, reward: { type: 'coins', name: '800 Coins + 2 Hints', amount: 800, icon: '🧱' }, starThresholds: { three: 9, two: 14 } },
      { type: 'standard', difficulty: 'hard', name: 'The Arena', opponent: 'Arena Alex', personality: 'Pre-placed chaos on a big board.', settings: { rows: 7, cols: 8, presetBoard: [[0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0],[0,0,2,0,0,1,0,0],[0,2,1,0,0,2,1,0],[2,1,2,1,2,1,2,1]] }, reward: { type: 'board', id: 'lava_pit', name: 'Lava Pit Board', icon: '🌋' }, starThresholds: { three: 8, two: 13 } },
      { type: 'connect6', difficulty: 'hard', name: 'Perfect Storm', opponent: 'Storm Surge Sara', personality: 'The hardest combo.', settings: { rows: 9, cols: 9, connectCount: 6, timerSeconds: 10 }, reward: { type: 'coins', name: '900 Coins + 4 💎 + 1 Hint', amount: 900, icon: '⛈️' } },
      { type: 'moves_limit', difficulty: 'hard', name: 'Five-Move Win', opponent: 'Old Guard Otto', personality: 'Five moves, five connect. Clinical or you lose.', settings: { rows: 8, cols: 9, connectCount: 5, movesLimit: 5 }, reward: { type: 'coins', name: '1000 Coins + 6 💎', amount: 1000, icon: '🎯' }, starThresholds: { three: 5, two: 5 } },
      { type: 'speed', difficulty: 'hard', name: 'Sudden Death', opponent: 'Grim Reaper Gina', personality: "One mistake and you're done.", settings: { timerSeconds: 5 }, reward: { type: 'coins', name: '850 Coins + 3 💎', amount: 850, icon: '⚰️' } },
      { type: 'jeopardy', difficulty: 'hard', name: 'Final Jeopardy', opponent: 'Ghost Greg', personality: 'Connect 5 on a standard board. Triple the bag. All or nothing.', settings: { rows: 6, cols: 7, connectCount: 5, rewardMultiplier: 3 }, reward: { type: 'coins', name: '1500 Coins', amount: 1500, icon: '🪙' } },
      { type: 'standard', difficulty: 'hard', name: 'Last Stand', opponent: 'Final Boss Frank', personality: 'The last regular challenge.', settings: { playerGoesFirst: false, presetBoard: [[0,0,0,0,0,0,0],[0,0,0,0,0,0,0],[0,0,0,0,0,0,0],[0,0,0,0,0,0,0],[0,0,0,2,0,0,0],[0,0,2,2,0,0,0]] }, reward: { type: 'coins', name: '1200 Coins + 3 Hints', amount: 1200, icon: '🛡️' } },
      { type: 'boss', difficulty: 'hard', name: 'BOSS: The Cathedral Warden', opponent: 'The Cathedral Warden', personality: "Harlem's final boss. The Warden seeded a 4-piece threat. You go second. 10-second clock. Survive the night.", settings: { rows: 9, cols: 9, connectCount: 5, timerSeconds: 10, playerGoesFirst: false, bossScript: 'warden', presetBoard: [[0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0],[0,0,0,0,2,0,0,0,0],[0,0,0,0,2,2,0,0,0],[0,0,0,2,2,2,2,0,0]] }, reward: { type: 'board', id: 'dark_matter', name: 'Dark Matter Board', icon: '🌑' } },
    ],
  },

  // ─── 4-9 · TEASED CITIES (Phase B will fill in real recipes) ──────
  // These render on the map with their palette + tagline + a "Coming
  // Soon" silhouette. Empty `levels` array → generator emits the city
  // with no playable level IDs. When Phase B authors them, just add
  // 12 LevelRecipe entries each and they go live without any other
  // code changes (IDs auto-assign at 37+ in city order).
  {
    id: 'chicago', name: 'Chicago', state: 'IL', nickname: 'The Cage',
    tagline: 'Puzzle courts. Out-think or get out.',
    themeColor: '#3498db', accentColor: '#5dade2',
    skyGradient: ['#0a1e3c', '#1a4a7a', '#3498db'],
    mapPosition: { xPct: 60, yPct: 32 },
    // Chicago's identity: cerebral, puzzle-heavy, locked-position
    // play. Heavy emphasis on puzzle + obstacle types — every level
    // is a chess problem disguised as Connect 4. Boss is a puzzle
    // master with a brutal opening seed.
    opponents: [
      'Hustler Hank', 'Pawn Master Pete', 'Puzzle Phyllis', 'Locked-In Lou',
      'Knight Knox', 'Trapped Tia', 'Position Pete', 'Closed Cara',
      'Cage Master Carl', 'Riddler Reese', 'The Cipher', 'Big Bear',
    ],
    levels: [
      { type: 'standard', difficulty: 'medium', name: 'Welcome to the Cage', opponent: 'Hustler Hank', personality: 'You think Brooklyn was hard? Think again.' },
      { type: 'puzzle', difficulty: 'medium', name: 'Open Position', opponent: 'Pawn Master Pete', personality: 'Read the board. Then play it.', settings: { presetBoard: [[0,0,0,0,0,0,0],[0,0,0,0,0,0,0],[0,0,0,0,0,0,0],[0,0,0,1,0,0,0],[0,0,2,1,0,0,0],[0,1,2,2,1,0,0]] } },
      { type: 'obstacle', difficulty: 'medium', name: 'Locked Lanes', opponent: 'Puzzle Phyllis', personality: 'Three lanes. One is yours.', settings: { obstacleCells: [{row:2,col:2},{row:3,col:2},{row:2,col:4},{row:3,col:4}] } },
      { type: 'standard', difficulty: 'medium', name: 'The Slow Game', opponent: 'Locked-In Lou', personality: "Every move is a question. Don't guess." },
      { type: 'connect5', difficulty: 'medium', name: 'Five Files', opponent: 'Knight Knox', personality: 'Five in a row. Long lines.', settings: { rows: 8, cols: 9, connectCount: 5 } },
      { type: 'puzzle', difficulty: 'medium', name: 'Endgame Trap', opponent: 'Trapped Tia', personality: "She set this up before you sat down.", settings: { presetBoard: [[0,0,0,0,0,0,0],[0,0,0,0,0,0,0],[0,0,2,1,2,0,0],[0,1,2,2,1,2,0],[2,1,1,2,2,1,0],[1,2,2,1,1,2,1]] }, starThresholds: { three: 3, two: 6 } },
      { type: 'obstacle', difficulty: 'medium', name: 'Six Walls', opponent: 'Position Pete', personality: 'Find the line. Or build a new one.', settings: { obstacleCells: [{row:1,col:1},{row:2,col:2},{row:3,col:3},{row:3,col:5},{row:2,col:4},{row:1,col:5}] } },
      { type: 'timed', difficulty: 'medium', name: 'Cage Clock', opponent: 'Closed Cara', personality: '12 seconds. Solve fast.', settings: { timerSeconds: 12 } },
      { type: 'puzzle', difficulty: 'hard', name: 'The Cipher', opponent: 'Cage Master Carl', personality: 'Crack the position. There is one move.', settings: { presetBoard: [[0,0,0,0,0,0,0],[0,0,1,2,0,0,0],[0,2,1,1,2,0,0],[0,1,2,1,2,1,0],[1,2,1,2,1,2,1],[2,1,2,1,2,1,2]] }, starThresholds: { three: 2, two: 4 } },
      { type: 'moves_limit', difficulty: 'hard', name: 'Eight Moves', opponent: 'Riddler Reese', personality: 'Eight moves. No more.', settings: { rows: 7, cols: 8, movesLimit: 8 } },
      { type: 'jeopardy', difficulty: 'hard', name: 'Cipher Jeopardy', opponent: 'The Cipher', personality: 'Five in a row. Triple coins. Cracking only.', settings: { rows: 7, cols: 8, connectCount: 5, rewardMultiplier: 3 } },
      { type: 'boss', difficulty: 'hard', name: 'BOSS: Big Bear', opponent: 'Big Bear', personality: "Chicago's puzzle king. Eight pieces deep. Solve or fold.", settings: { rows: 7, cols: 8, connectCount: 5, timerSeconds: 20, presetBoard: [[0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0],[0,0,2,1,2,1,0,0],[0,2,1,2,1,2,1,0],[1,2,2,1,1,2,2,1],[2,1,1,2,2,1,1,2]] }, reward: { type: 'board', id: 'matrix', name: 'Matrix Board', icon: '🧠' }, bonusReward: { type: 'pieces', id: 'monochrome', name: 'Monochrome Pieces', icon: '⬛' } },
    ],
  },
  {
    id: 'detroit', name: 'Detroit', state: 'MI', nickname: 'The Motor',
    tagline: 'Mixed modes, rough crowd. Prove it.',
    unlockedAfterCityId: 'chicago',
    themeColor: '#95a5a6', accentColor: '#bdc3c7',
    skyGradient: ['#1a1a1a', '#4a4a4a', '#95a5a6'],
    mapPosition: { xPct: 70, yPct: 22 },
    // Detroit's identity: every level is a different machine. Maximum
    // mechanic variety — you never see the same type twice in a row.
    // Boss is The Mechanic, who runs every wrinkle the player has met.
    opponents: [
      'Switch Steve', 'Gear Greta', 'Carburetor Carl', 'Piston Pat',
      'Wrench Wendy', 'Diesel Dom', 'Spark Plug Sal', 'Throttle Tim',
      'Tinker Tina', 'Radiator Rae', 'Solder Saul', 'The Mechanic',
    ],
    levels: [
      { type: 'standard', difficulty: 'medium', name: 'Cold Start', opponent: 'Switch Steve', personality: 'Detroit warms you up.' },
      { type: 'connect3', difficulty: 'medium', name: 'Three Gears', opponent: 'Gear Greta', personality: 'Smaller board. Sharper teeth.', settings: { rows: 5, cols: 5, connectCount: 3 } },
      { type: 'speed', difficulty: 'medium', name: 'Throttle Up', opponent: 'Carburetor Carl', personality: 'Five seconds. Move.', settings: { timerSeconds: 5 } },
      { type: 'go_second', difficulty: 'medium', name: 'Push Start', opponent: 'Piston Pat', personality: 'You go second. Catch up.', settings: { playerGoesFirst: false } },
      { type: 'obstacle', difficulty: 'medium', name: 'Toolbox', opponent: 'Wrench Wendy', personality: 'Tools on the floor. Step around.', settings: { obstacleCells: [{row:3,col:1},{row:3,col:3},{row:3,col:5},{row:4,col:2},{row:4,col:4}] } },
      { type: 'connect5', difficulty: 'medium', name: 'Long Belt', opponent: 'Diesel Dom', personality: 'Five in a row. Big board.', settings: { rows: 8, cols: 9, connectCount: 5 } },
      { type: 'timed', difficulty: 'medium', name: 'Spark Time', opponent: 'Spark Plug Sal', personality: '10 seconds per turn.', settings: { timerSeconds: 10 } },
      { type: 'puzzle', difficulty: 'medium', name: 'Engine Block', opponent: 'Throttle Tim', personality: 'The puzzle was here when you arrived.', settings: { presetBoard: [[0,0,0,0,0,0,0],[0,0,0,0,0,0,0],[0,0,0,2,0,0,0],[0,1,2,1,2,1,0],[2,1,1,2,1,2,1],[1,2,2,1,2,1,2]] } },
      { type: 'moves_limit', difficulty: 'hard', name: 'Ten and Done', opponent: 'Tinker Tina', personality: 'Ten moves. Make every one count.', settings: { movesLimit: 10 } },
      { type: 'speed', difficulty: 'hard', name: 'Overheat', opponent: 'Radiator Rae', personality: '3 seconds. Cool under pressure.', settings: { timerSeconds: 3 } },
      { type: 'jeopardy', difficulty: 'hard', name: 'Big Job', opponent: 'Solder Saul', personality: 'Triple bag. Connect 5. Pick a side.', settings: { rows: 7, cols: 8, connectCount: 5, rewardMultiplier: 3 } },
      { type: 'boss', difficulty: 'hard', name: 'BOSS: The Mechanic', opponent: 'The Mechanic', personality: "He's seen every game. He runs every play. Beat the master.", settings: { rows: 7, cols: 8, connectCount: 5, timerSeconds: 12, obstacleCells: [{row:3,col:1},{row:3,col:6},{row:4,col:3},{row:4,col:4}], presetBoard: [[0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0],[0,0,0,2,1,0,0,0],[0,0,2,1,2,1,0,0],[0,1,2,1,2,1,2,0],[2,1,1,2,1,2,1,2]] }, reward: { type: 'board', id: 'gold_court', name: 'Gold Court', icon: '🏆' }, bonusReward: { type: 'pet', id: 'german_shepherd', name: 'German Shepherd', icon: '🐕‍🦺' } },
    ],
  },
  {
    id: 'oakland', name: 'Oakland', state: 'CA', nickname: 'The Town',
    tagline: 'Connect 6 country. No weak links.',
    unlockedAfterCityId: 'detroit',
    themeColor: '#2ecc71', accentColor: '#58d68d',
    skyGradient: ['#0a2a1e', '#1a5a3e', '#2ecc71'],
    mapPosition: { xPct: 4, yPct: 34 },
    // Oakland's identity: long lines + huge boards. Connect 5 / Connect
    // 6 / oversized grids dominate. Endurance + spatial awareness.
    // Boss is The Town's Best — connect-6 on 9×9 with a clock.
    opponents: [
      'Long Game Larry', 'Six-Strong Sue', 'Big Board Bo', 'Patience Park',
      'Marathon Marc', 'Grid Geneva', 'The Stretch', 'Wide Open Wynn',
      'Endurance Eddie', 'Slow Burn Soraya', 'The Architect', "The Town's Best",
    ],
    levels: [
      { type: 'standard', difficulty: 'medium', name: 'Welcome to The Town', opponent: 'Long Game Larry', personality: 'Long sentences. Long games.' },
      { type: 'connect5', difficulty: 'medium', name: 'Five Town', opponent: 'Six-Strong Sue', personality: 'Five in a row. Big board.', settings: { rows: 8, cols: 9, connectCount: 5 } },
      { type: 'standard', difficulty: 'medium', name: 'Wide Open', opponent: 'Big Board Bo', personality: 'Bigger board, bigger ideas.', settings: { rows: 8, cols: 9 } },
      { type: 'connect6', difficulty: 'medium', name: 'Six Pack', opponent: 'Patience Park', personality: 'Six in a row. Take your time.', settings: { rows: 9, cols: 9, connectCount: 6 } },
      { type: 'moves_limit', difficulty: 'medium', name: 'Long Marathon', opponent: 'Marathon Marc', personality: '20 moves to land it.', settings: { rows: 8, cols: 9, movesLimit: 20 } },
      { type: 'connect5', difficulty: 'medium', name: 'Wider Five', opponent: 'Grid Geneva', personality: 'Bigger grid. Same five.', settings: { rows: 9, cols: 10, connectCount: 5 } },
      { type: 'connect6', difficulty: 'hard', name: 'The Stretch', opponent: 'The Stretch', personality: 'Long. Slow. Brutal.', settings: { rows: 9, cols: 10, connectCount: 6 } },
      { type: 'standard', difficulty: 'hard', name: 'Open Floor', opponent: 'Wide Open Wynn', personality: 'No tricks. Just the biggest board you have seen.', settings: { rows: 9, cols: 10 } },
      { type: 'go_second', difficulty: 'hard', name: 'Catch the Long Line', opponent: 'Endurance Eddie', personality: 'You go second on a 9-wide board. Catch up.', settings: { rows: 9, cols: 9, playerGoesFirst: false } },
      { type: 'connect5', difficulty: 'hard', name: 'Slow Burn', opponent: 'Slow Burn Soraya', personality: 'No clock. Just five in a row.', settings: { rows: 8, cols: 9, connectCount: 5 } },
      { type: 'puzzle', difficulty: 'hard', name: 'The Architect', opponent: 'The Architect', personality: 'She built this puzzle for you. Solve it.', settings: { rows: 8, cols: 9, connectCount: 5, presetBoard: [[0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0],[0,0,0,2,0,0,1,0,0],[0,0,1,1,2,1,2,0,0],[0,2,1,2,1,2,1,2,0],[0,1,2,1,2,1,2,1,0],[2,1,2,1,2,1,1,2,1]] } },
      { type: 'boss', difficulty: 'hard', name: "BOSS: The Town's Best", opponent: "The Town's Best", personality: 'Connect 6 on the biggest board. 15 second clock. The Town picks its kings.', settings: { rows: 9, cols: 9, connectCount: 6, timerSeconds: 15, presetBoard: [[0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0],[0,0,0,2,0,0,0,0,0],[0,0,2,1,2,0,0,0,0],[0,2,1,2,1,2,0,0,0],[2,1,2,1,2,1,2,0,0]] }, reward: { type: 'board', id: 'ice_arena', name: 'Ice Arena Board', icon: '❄️' }, bonusReward: { type: 'pet', id: 'siberian_husky', name: 'Siberian Husky', icon: '🐺' } },
    ],
  },
  {
    id: 'compton', name: 'Compton', state: 'CA', nickname: 'The Yard',
    tagline: 'Speed demons only. Blink and lose.',
    comingSoon: true,
    themeColor: '#e74c3c', accentColor: '#ff6b6b',
    skyGradient: ['#2d0a0a', '#8b1e1e', '#e74c3c'],
    mapPosition: { xPct: 22, yPct: 78 },
    opponents: [], levels: [],
  },
  {
    id: 'miami', name: 'Miami', state: 'FL', nickname: 'South Beach',
    tagline: 'Tournaments under neon lights.',
    comingSoon: true,
    themeColor: '#ff006e', accentColor: '#00f5ff',
    skyGradient: ['#1a0a3e', '#6a0dad', '#ff006e'],
    mapPosition: { xPct: 80, yPct: 85 },
    opponents: [], levels: [],
  },
  {
    id: 'the_void', name: '???', state: '??', nickname: 'The Void',
    tagline: 'Rumors only. Nobody comes back the same.',
    comingSoon: true,
    themeColor: '#e94560', accentColor: '#7b2cbf',
    skyGradient: ['#000000', '#1a0033', '#e94560'],
    mapPosition: { xPct: 50, yPct: 95 },
    opponents: [], levels: [],
  },

  // ─── 10-15 · NEW v1 TEASES (Phase B will fill in real recipes) ────
  // Six more cities to hit the 15-city v1 target. Each picks up an
  // unclaimed region of the map + a distinct vibe so the player has
  // a sense of "the world keeps opening up." Same comingSoon=true
  // pattern — Phase B authors 12 levels each, generator emits IDs
  // 109+ in order (city 10 starts at L109 = (10-1)*12 + 1).
  {
    id: 'atlanta', name: 'Atlanta', state: 'GA', nickname: 'The Trap',
    tagline: 'Hip-hop streetball. Loud, fast, and undefeated at home.',
    comingSoon: true,
    themeColor: '#9b00b9', accentColor: '#d92aff',
    skyGradient: ['#1a0033', '#3a0066', '#9b00b9'],
    mapPosition: { xPct: 75, yPct: 72 },
    opponents: [], levels: [],
  },
  {
    id: 'houston', name: 'Houston', state: 'TX', nickname: 'The Yard',
    tagline: 'Texas heat, slow burn. Outlast or be cooked.',
    comingSoon: true,
    themeColor: '#ff5f1f', accentColor: '#ffb800',
    skyGradient: ['#3d1a00', '#8a3a00', '#ff5f1f'],
    mapPosition: { xPct: 50, yPct: 82 },
    opponents: [], levels: [],
  },
  {
    id: 'cleveland', name: 'Cleveland', state: 'OH', nickname: 'The Lake',
    // Easter egg for the Kingpin universe — Cleveland is Devon's
    // hometown + the Kingpin Bible's setting. Nothing here makes
    // sense yet; it will when Kingpin ships years from now.
    tagline: 'Cold court, real ones only. 755 Broadway never forgot.',
    comingSoon: true,
    themeColor: '#a36b3a', accentColor: '#d49a5e',
    skyGradient: ['#1a0e1a', '#3a2e1a', '#a36b3a'],
    mapPosition: { xPct: 65, yPct: 27 },
    opponents: [], levels: [],
  },
  {
    id: 'philadelphia', name: 'Philadelphia', state: 'PA', nickname: 'The Steps',
    tagline: 'Climb the steps. Or get pushed down them.',
    comingSoon: true,
    themeColor: '#bdc3c7', accentColor: '#ecf0f1',
    skyGradient: ['#1a1a2a', '#3a3a4a', '#bdc3c7'],
    mapPosition: { xPct: 86, yPct: 35 },
    opponents: [], levels: [],
  },
  {
    id: 'seattle', name: 'Seattle', state: 'WA', nickname: 'The Rain',
    tagline: 'Gloomy puzzles. The board is wet. So are your odds.',
    comingSoon: true,
    themeColor: '#16a085', accentColor: '#48c9b0',
    skyGradient: ['#0a1a2a', '#1a3a5a', '#16a085'],
    mapPosition: { xPct: 12, yPct: 12 },
    opponents: [], levels: [],
  },
  {
    id: 'toronto', name: 'Toronto', state: 'ON', nickname: 'The Six',
    tagline: 'Border crossing. New rules apply. Bring everything.',
    comingSoon: true,
    themeColor: '#e74c3c', accentColor: '#ffffff',
    skyGradient: ['#0a0a1a', '#2a1a3a', '#e74c3c'],
    mapPosition: { xPct: 70, yPct: 14 },
    opponents: [], levels: [],
  },
];
