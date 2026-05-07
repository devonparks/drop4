// ═══════════════════════════════════════════════════════════════════════
// careerLevels.ts — public surface for career mode data
//
// 2026-05-06 strategic shift: Drop4's retention engine is its career
// mode. The original 800-line hand-typed CHAPTER_1/2/3 arrays here have
// been migrated into a recipe DSL (`careerRecipes.ts` + `careerGenerator
// .ts`). This file is now thin — it owns the type definitions, calls
// the generator at module-init, and re-exports the same public API that
// every consumer in the app expects.
//
// ID stability: the generator produces IDs 1-36 for the existing 3
// cities (Brooklyn 1-12, Venice 13-24, Harlem 25-36). New cities pick
// up at 37+. careerStore.progress is keyed by ID and persists across
// sessions, so this contract MUST hold — see careerGenerator.levelIdFor.
// ═══════════════════════════════════════════════════════════════════════

import { Difficulty } from '../stores/gameStore';

// ─── Types (exported — careerRecipes.ts imports these) ───────────────

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
    // Phase 2 additions:
    movesLimit?: number;          // must win in ≤ N moves or lose (Candy Crush target levels)
    rewardMultiplier?: number;    // jeopardy levels pay 3× coins
    // ── Career overhaul phase 1: obstacle levels ──
    // List of cells that start the match as concrete walls (cell value
    // 3 in the engine). Neither player can drop into a column whose
    // top is walled, and walls don't count toward connect-N. Place 3-6
    // cells per the design doc; visual contrast comes from GameBoard's
    // ObstacleBlock component.
    obstacleCells?: Array<{ row: number; col: number }>;
    // ── Phase 2 boss scripts ──
    // Signature per-city boss mechanics. Set on the chapter-12 boss
    // levels (Tommy in Brooklyn, Sal in Venice, Warden in Harlem) plus
    // any new bosses authored in Phase B for cities 4-15.
    bossScript?: 'tommy' | 'sal' | 'warden';
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
  | 'tournament'      // Beat multiple opponents in a row
  | 'jeopardy'        // High stakes — 3× reward, tougher opponent
  | 'moves_limit'     // Win in N moves or you lose
  | 'obstacle';       // 3-6 concrete cells block the board (career overhaul phase 1)

export interface CareerReward {
  type: 'coins' | 'board' | 'pieces' | 'emote' | 'title' | 'pet';
  id?: string;
  name: string;
  amount?: number;
  icon: string;
}

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
    case 'jeopardy': return 'Jeopardy';
    case 'obstacle': return 'Obstacle';
    case 'moves_limit': return 'Moves Limit';
    default: return 'Standard';
  }
}

// ─── Generated dataset (single source of truth) ──────────────────────
// Recipe → levels happens at module-init. Pure + cached. See
// careerRecipes.ts for the recipe definitions and careerGenerator.ts
// for the ID assignment + default-fill logic.

import { generateCareerData } from './careerGenerator';

const _DATA = generateCareerData();

/** All levels in career order, IDs 1-N. Stable across sessions because
 *  the generator's ID assignment is deterministic from CITY_RECIPES
 *  order × LEVELS_PER_CITY. */
export const ALL_CAREER_LEVELS: CareerLevel[] = _DATA.levels;

/** Legacy chapter grouping. The 4-tab Career UI iterates this; each
 *  city in CITY_RECIPES generates one chapter entry. */
export const CHAPTERS = _DATA.chapters;

/** All cities (live + comingSoon) for the career map. The generator
 *  populates levelIds from the recipe's slot count. */
export const CAREER_CITIES: CareerCity[] = _DATA.cities;

// ─── Ratings ─────────────────────────────────────────────────────────
// Compute an opponent "rating" (70-99) from difficulty + boss flag.
// Gives each node a "player card" number for the Basketball Stars vibe.

function computeRating(level: CareerLevel): number {
  const base =
    level.difficulty === 'easy' ? 70 :
    level.difficulty === 'medium' ? 78 : 86;
  const spread = (level.id * 3) % 8;    // mild variation so nodes aren't all identical
  const boss = level.isBoss ? 5 : 0;
  return Math.min(99, base + spread + boss);
}

/** Per-level rating lookup. Exported for the node path view so it
 *  doesn't recompute on every render. */
export const CAREER_RATINGS: Record<number, number> = ALL_CAREER_LEVELS.reduce(
  (acc, lvl) => {
    acc[lvl.id] = computeRating(lvl);
    return acc;
  },
  {} as Record<number, number>,
);

// ─── Lookups + helpers ───────────────────────────────────────────────

/** Fast city-by-id index. */
export const CITY_BY_ID: Record<string, CareerCity> = CAREER_CITIES.reduce(
  (acc, c) => { acc[c.id] = c; return acc; },
  {} as Record<string, CareerCity>,
);

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
  // Scales with content: 20 stars per rep star, capped at 5 — same
  // formula as before, agnostic to total level count so adding cities
  // doesn't deflate the existing distribution.
  return Math.min(5, Math.floor(totalStars / 20));
}
