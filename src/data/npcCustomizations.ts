/**
 * NPC 3D Customizations
 *
 * Every bot opponent gets a fully-styled 3D character. Difficulty tiers
 * map to escalating themes: civilians (easy) → police (medium) → samurai
 * (hard) → sci-fi soldiers (legend). Career bosses get bespoke looks
 * matching their chapter narrative.
 *
 * Consumers:
 *   - MatchupScreen opponent portrait
 *   - GameScreen opponent portrait
 *   - PartyLobbyScreen bot slots (future)
 */

import type { CharacterCustomization } from '../stores/characterStore';

// ── Helper builders ───────────────────────────────────────────────

function make(
  outfitId: string,
  opts: Partial<CharacterCustomization> = {},
): CharacterCustomization {
  return {
    outfitId,
    bodyType: 30,
    bodySize: 50,
    muscle: 60,
    skinColor: '#dcb088',
    hairColor: '#3d2817',
    outfitColors: {},
    ...opts,
  };
}

// ── Difficulty-tiered generic bots ─────────────────────────────────

const BOT_EASY: CharacterCustomization = make('human_modern_civilians_03', {
  bodyType: 20, bodySize: 45, muscle: 50,
  skinColor: '#e6c9a8', hairColor: '#5a3820',
});

const BOT_MEDIUM: CharacterCustomization = make('human_modern_police_01', {
  bodyType: 15, bodySize: 55, muscle: 75,
  skinColor: '#c49272', hairColor: '#1a1410',
});

const BOT_HARD: CharacterCustomization = make('human_samurai_warriors_02', {
  bodyType: 10, bodySize: 60, muscle: 85,
  skinColor: '#d4a374', hairColor: '#0a0606',
});

const BOT_LEGEND: CharacterCustomization = make('human_sci_fi_soldiers_01', {
  bodyType: 5, bodySize: 62, muscle: 90,
  skinColor: '#8a6a52', hairColor: '#2a2830',
});

// ── Career bosses (chapter 1, 2, 3) ───────────────────────────────

const BOSS_KING_KYLE: CharacterCustomization = make('human_fantasy_knights_01', {
  bodyType: 5, bodySize: 75, muscle: 90,
  skinColor: '#b89472', hairColor: '#f0d880',
  outfitColors: { '10TORS': '#7a1a2a', '11AUPL': '#c9a16a', '12AUPR': '#c9a16a' },
});

const BOSS_CHAPTER_2: CharacterCustomization = make('human_apocalypse_outlaws_03', {
  bodyType: 8, bodySize: 70, muscle: 88,
  skinColor: '#a07858', hairColor: '#1a0a0a',
  outfitColors: { '10TORS': '#2a2a30', '18LEGL': '#1a1a20', '19LEGR': '#1a1a20' },
});

const BOSS_CHAPTER_3: CharacterCustomization = make('human_sci_fi_soldiers_05', {
  bodyType: 5, bodySize: 65, muscle: 92,
  skinColor: '#8a6a52', hairColor: '#0a0a0a',
  outfitColors: { '10TORS': '#1a0030', '11AUPL': '#5e1a3a', '12AUPR': '#5e1a3a' },
});

// ── Canonical resolver ────────────────────────────────────────────

/**
 * Resolve a NPC key (difficulty tier, bot_XXX, boss name, career level id,
 * etc.) to a 3D customization. Falls back to BOT_MEDIUM for unknown keys.
 */
export function getNpcCustomization(key: string | null | undefined): CharacterCustomization {
  if (!key) return BOT_MEDIUM;
  const k = key.toLowerCase();

  // Difficulty tiers
  if (k.includes('easy'))   return BOT_EASY;
  if (k.includes('medium')) return BOT_MEDIUM;
  if (k.includes('hard'))   return BOT_HARD;
  if (k.includes('legend') || k.includes('expert')) return BOT_LEGEND;

  // Boss keys (career NPCs). The name-based match is fuzzy on purpose:
  // level data has opponent names like "King Kyle" that vary in casing.
  if (k.includes('kyle') || k.includes('rookie king')) return BOSS_KING_KYLE;
  if (k.includes('chapter2') || k.includes('boss12') || k.includes('lvl24')) return BOSS_CHAPTER_2;
  if (k.includes('chapter3') || k.includes('final')   || k.includes('lvl36')) return BOSS_CHAPTER_3;

  // Numeric career levels fall back to difficulty-tiered presets
  if (k.startsWith('lvl')) {
    const n = parseInt(k.replace('lvl', ''), 10);
    if (!isNaN(n)) {
      if (n >= 25) return BOT_LEGEND;
      if (n >= 17) return BOT_HARD;
      if (n >= 9)  return BOT_MEDIUM;
      return BOT_EASY;
    }
  }

  // bot_* prefix without difficulty suffix
  return BOT_MEDIUM;
}

// Stable exports for anyone who wants direct access
export const NPC_CUSTOMIZATIONS = {
  bot_easy:     BOT_EASY,
  bot_medium:   BOT_MEDIUM,
  bot_hard:     BOT_HARD,
  bot_legend:   BOT_LEGEND,
  boss_ch1:     BOSS_KING_KYLE,
  boss_ch2:     BOSS_CHAPTER_2,
  boss_ch3:     BOSS_CHAPTER_3,
};
