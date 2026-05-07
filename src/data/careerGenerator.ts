// ═══════════════════════════════════════════════════════════════════════
// careerGenerator.ts — pure recipe → CareerLevel + CareerCity emitter
//
// Walks CITY_RECIPES from careerRecipes.ts and emits the runtime data
// the rest of the app expects:
//
//   - levels:   CareerLevel[]   (200+ entries, each with stable id)
//   - cities:   CareerCity[]    (one per recipe, with levelIds populated)
//   - chapters: ChapterMeta[]   (legacy chapter grouping for the UI)
//
// ID assignment rule (DO NOT CHANGE — careerStore persistence depends
// on stable IDs across sessions):
//
//   For each city recipe in CITY_RECIPES order:
//     levelId = (cityIndex * LEVELS_PER_CITY) + slotIndex + 1
//
// LEVELS_PER_CITY is fixed at 12 because that's what the existing 36-
// level career used (Brooklyn 1-12, Venice 13-24, Harlem 25-36). New
// cities also need 12 slots so IDs line up. If we ever want variable
// city sizes, we'd switch to a precomputed offset table — but for the
// 200-level v1 target, fixed 12 keeps the math trivial.
//
// The generator is PURE — no side effects, no randomness (except
// deterministic templated names), no I/O. Re-running on the same
// recipes always produces identical output. Tests can lean on this.
// ═══════════════════════════════════════════════════════════════════════

import type { CareerLevel, CareerCity } from './careerLevels';
import {
  CITY_RECIPES,
  defaultRewardFor,
  defaultStarsFor,
  defaultNameFor,
  defaultPersonalityFor,
  type CityRecipe,
  type LevelRecipe,
} from './careerRecipes';

/** Fixed slots per city. Required for stable ID assignment — if a
 *  recipe has fewer than this many levels, the missing slots are
 *  skipped (not auto-filled). */
const LEVELS_PER_CITY = 12;

/** Compute the global level ID for a given (cityIndex, slotIndex).
 *  Exported so tests + tools can verify ID assignments without
 *  re-running the full generator. */
export function levelIdFor(cityIndex: number, slotIndex: number): number {
  return cityIndex * LEVELS_PER_CITY + slotIndex + 1;
}

/** Resolve the opponent name for a recipe slot. Recipe override wins;
 *  otherwise we round-robin through the city's roster keyed by slot. */
function resolveOpponent(recipe: LevelRecipe, city: CityRecipe, slotIndex: number): string {
  if (recipe.opponent) return recipe.opponent;
  if (city.opponents.length === 0) return `Opponent ${slotIndex + 1}`;
  return city.opponents[slotIndex % city.opponents.length];
}

/** Resolve the level name. Recipe override wins; otherwise pick a
 *  templated name from the type's pool. */
function resolveName(recipe: LevelRecipe, slotIndex: number): string {
  if (recipe.name) return recipe.name;
  return defaultNameFor(recipe.type, slotIndex);
}

/** Resolve the personality string. Recipe override > city pool >
 *  type-templated default. The city pool gives a city its voice
 *  (Brooklyn feels different from Cathedral) without forcing every
 *  recipe to spell it out. */
function resolvePersonality(recipe: LevelRecipe, city: CityRecipe, slotIndex: number): string {
  if (recipe.personality) return recipe.personality;
  if (city.personalityPool && city.personalityPool.length > 0) {
    return city.personalityPool[slotIndex % city.personalityPool.length];
  }
  return defaultPersonalityFor(recipe.type, slotIndex);
}

/** Build a single CareerLevel from a recipe + its position. */
function buildLevel(
  recipe: LevelRecipe,
  city: CityRecipe,
  cityIndex: number,
  slotIndex: number,
): CareerLevel {
  const id = levelIdFor(cityIndex, slotIndex);
  // Boss flag is auto-derived from the type — recipes don't need to
  // set it explicitly. By convention boss is the last slot, but the
  // generator doesn't enforce that — any slot can be the boss if the
  // type says so.
  const isBoss = recipe.type === 'boss';
  return {
    id,
    name: resolveName(recipe, slotIndex),
    opponent: resolveOpponent(recipe, city, slotIndex),
    opponentPersonality: resolvePersonality(recipe, city, slotIndex),
    chapter: cityIndex + 1,
    type: recipe.type,
    difficulty: recipe.difficulty,
    isBoss,
    settings: recipe.settings ?? {},
    reward: recipe.reward ?? defaultRewardFor(recipe.type, recipe.difficulty),
    bonusReward: recipe.bonusReward,
    starThresholds: recipe.starThresholds ?? defaultStarsFor(recipe.type),
  };
}

/** Result type — what careerLevels.ts re-exports under the existing
 *  public names. */
export interface GeneratedCareerData {
  levels: CareerLevel[];
  cities: CareerCity[];
  chapters: Array<{
    id: number;
    name: string;
    levels: CareerLevel[];
    /** First-level ID in this chapter, used by isLevelUnlocked logic. */
    unlockLevel: number;
  }>;
}

/** Generate the full career dataset from CITY_RECIPES. Pure — call at
 *  module-init time, cache the result. */
export function generateCareerData(): GeneratedCareerData {
  const levels: CareerLevel[] = [];
  const cities: CareerCity[] = [];
  const chapters: GeneratedCareerData['chapters'] = [];

  CITY_RECIPES.forEach((city, cityIndex) => {
    const cityLevels: CareerLevel[] = [];
    const levelIds: number[] = [];

    // Skip levels for "coming soon" cities — they show on the map but
    // can't be played. Their levelIds array stays empty.
    if (!city.comingSoon) {
      city.levels.forEach((recipe, slotIndex) => {
        if (slotIndex >= LEVELS_PER_CITY) {
          // Recipe has more slots than we allow per city — drop the
          // extras. This is a safety net; recipes shouldn't exceed
          // LEVELS_PER_CITY in the first place.
          return;
        }
        const lvl = buildLevel(recipe, city, cityIndex, slotIndex);
        levels.push(lvl);
        cityLevels.push(lvl);
        levelIds.push(lvl.id);
      });
    }

    cities.push({
      id: city.id,
      name: city.name,
      nickname: city.nickname,
      state: city.state,
      tagline: city.tagline,
      themeColor: city.themeColor,
      accentColor: city.accentColor,
      skyGradient: city.skyGradient,
      mapPosition: city.mapPosition,
      unlockedAfterCityId: city.unlockedAfterCityId,
      comingSoon: city.comingSoon,
      levelIds,
    });

    if (cityLevels.length > 0) {
      // Chapter unlock = "you must have cleared the previous chapter's
      // boss." Encoded as: getCompletedCount() >= unlockLevel - 1.
      // For chapter 1, unlockLevel=1 means immediately playable.
      // For chapter N, unlockLevel = (cityIndex - 1) * LEVELS_PER_CITY + LEVELS_PER_CITY + 1
      // i.e. start of chapter N is the level AFTER the previous chapter ends.
      const unlockLevel = cityIndex === 0
        ? 1
        : (cityIndex - 1) * LEVELS_PER_CITY + LEVELS_PER_CITY - 3; // a few before the boss so cliff isn't brutal
      chapters.push({
        id: cityIndex + 1,
        name: city.nickname,
        levels: cityLevels,
        unlockLevel,
      });
    }
  });

  return { levels, cities, chapters };
}
