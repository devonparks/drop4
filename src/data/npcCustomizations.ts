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

// ── Per-NPC career customizations (36 unique opponents) ──────────

// Chapter 1 — "The Neighborhood" (civilians, casual, street wear)
const CAREER_NPCS: Record<string, CharacterCustomization> = {
  // Ch1 easy tier — casual humans, varied body types, familiar looks
  'rookie ron':       make('human_modern_civilians_02', { bodyType: 25, bodySize: 45, muscle: 40, skinColor: '#e6c9a8', hairColor: '#5a3820' }),
  'beginner ben':     make('human_modern_civilians_04', { bodyType: 20, bodySize: 55, muscle: 45, skinColor: '#dcb088', hairColor: '#1a0e08' }),
  'casual carl':      make('human_modern_civilians_05', { bodyType: 35, bodySize: 50, muscle: 50, skinColor: '#c49272', hairColor: '#c9a16a' }),
  'speedy sam':       make('human_modern_civilians_07', { bodyType: 15, bodySize: 35, muscle: 55, skinColor: '#8a6a52', hairColor: '#0a0606' }),
  'tiny tim':         make('human_modern_civilians_03', { bodyType: 70, bodySize: 25, muscle: 30, skinColor: '#f0d4b8', hairColor: '#7a5230' }),
  'lucky luke':       make('human_modern_civilians_06', { bodyType: 10, bodySize: 50, muscle: 55, skinColor: '#d4a374', hairColor: '#c73838' }),
  'defensive dee':    make('human_modern_civilians_09', { bodyType: 82, bodySize: 60, muscle: 50, skinColor: '#7a513e', hairColor: '#1a1410' }),
  // Ch1 medium tier
  'flash fiona':      make('human_modern_civilians_10', { bodyType: 90, bodySize: 38, muscle: 65, skinColor: '#b89472', hairColor: '#e874a8' }),
  'big board bob':    make('human_modern_civilians_08', { bodyType: 5, bodySize: 82, muscle: 70, skinColor: '#96654a', hairColor: '#3d2817' }),
  'tricky tara':      make('human_modern_civilians_11', { bodyType: 88, bodySize: 42, muscle: 55, skinColor: '#dcb088', hairColor: '#8a3ac7' }),
  'iron ivan':        make('human_modern_police_02', { bodyType: 8, bodySize: 68, muscle: 88, skinColor: '#c49272', hairColor: '#0a0606' }),
  // Ch1 boss
  'king kyle':        BOSS_KING_KYLE,

  // Chapter 2 — "The Grind" (harder outfits, police/villagers/pirates mixed)
  'stretch stevens':  make('human_fantasy_villagers_03', { bodyType: 12, bodySize: 35, muscle: 60, skinColor: '#d4a374', hairColor: '#5a3820' }),
  'puzzle pete':      make('human_fantasy_villagers_07', { bodyType: 30, bodySize: 52, muscle: 50, skinColor: '#e6c9a8', hairColor: '#7a5230' }),
  'blitz betty':      make('human_modern_police_05', { bodyType: 85, bodySize: 42, muscle: 70, skinColor: '#b89472', hairColor: '#c73838' }),
  'micro max':        make('human_sci_fi_civilians_04', { bodyType: 40, bodySize: 28, muscle: 45, skinColor: '#f0d4b8', hairColor: '#3870c7' }),
  'stone cold steve': make('human_modern_police_07', { bodyType: 5, bodySize: 72, muscle: 92, skinColor: '#96654a', hairColor: '#0a0606' }),
  'copy cat clara':   make('human_modern_police_03', { bodyType: 88, bodySize: 48, muscle: 58, skinColor: '#dcb088', hairColor: '#e8e8e8' }),
  'mega mike':        make('human_pirate_captains_02', { bodyType: 8, bodySize: 78, muscle: 85, skinColor: '#8a6a52', hairColor: '#2e1e14' }),
  'six-pack sam':     make('human_viking_warriors_01', { bodyType: 5, bodySize: 55, muscle: 95, skinColor: '#c49272', hairColor: '#c9a16a' }),
  'clock crusher':    make('human_pirate_captains_05', { bodyType: 15, bodySize: 65, muscle: 80, skinColor: '#7a513e', hairColor: '#1a0e08' }),
  'chaos karen':      make('human_apocalypse_outlaws_04', { bodyType: 92, bodySize: 55, muscle: 60, skinColor: '#dcb088', hairColor: '#e874a8' }),
  'marathon mel':     make('human_samurai_warriors_03', { bodyType: 85, bodySize: 40, muscle: 70, skinColor: '#d4a374', hairColor: '#0a0606' }),
  // Ch2 boss
  'grandmaster grace': BOSS_CHAPTER_2,

  // Chapter 3 — "The Gauntlet" (menacing, fantasy/sci-fi/apocalypse looks)
  'nightmare nick':   make('human_apocalypse_outlaws_08', { bodyType: 10, bodySize: 70, muscle: 88, skinColor: '#5e3e2e', hairColor: '#0a0606', outfitColors: { '10TORS': '#1a0a0a' } }),
  'lightning lisa':   make('human_sci_fi_soldiers_03', { bodyType: 88, bodySize: 42, muscle: 72, skinColor: '#b89472', hairColor: '#f1c40f' }),
  'maze master matt': make('human_sci_fi_civilians_09', { bodyType: 25, bodySize: 55, muscle: 60, skinColor: '#d4a374', hairColor: '#2a2830' }),
  'quick draw quinn': make('human_samurai_warriors_06', { bodyType: 45, bodySize: 40, muscle: 75, skinColor: '#c49272', hairColor: '#0a0606' }),
  'upside-down uma':  make('goblin_goblin_fighters_04', { bodyType: 80, bodySize: 50, muscle: 55, skinColor: '#8ab090', hairColor: '#2a5030' }),
  'arena alex':       make('human_viking_warriors_04', { bodyType: 10, bodySize: 70, muscle: 90, skinColor: '#8a6a52', hairColor: '#c73838' }),
  'storm surge sara': make('elves_elven_warriors_03', { bodyType: 90, bodySize: 45, muscle: 65, skinColor: '#f0d4b8', hairColor: '#90c0d0' }),
  'old guard otto':   make('skeleton_fantasy_skeletons_05', { bodyType: 15, bodySize: 62, muscle: 75, skinColor: '#e8e4d0', hairColor: '#1a1a1a' }),
  'grim reaper gina': make('skeleton_fantasy_skeletons_09', { bodyType: 88, bodySize: 50, muscle: 70, skinColor: '#d0ccc0', hairColor: '#1a0a0a' }),
  'ghost greg':       make('zombie_apocalypse_zombies_02', { bodyType: 20, bodySize: 58, muscle: 65, skinColor: '#a0a898', hairColor: '#3a3a40' }),
  'final boss frank': make('human_sci_fi_soldiers_08', { bodyType: 5, bodySize: 68, muscle: 92, skinColor: '#7a513e', hairColor: '#0a0606', outfitColors: { '10TORS': '#2a0a1a', '11AUPL': '#5e1a3a' } }),
  // Ch3 boss
  'the dark lord':    BOSS_CHAPTER_3,
};

// ── Quick Play bot personas (BOT_POOLS in MatchupScreen) ──────────
// Each persona name in MatchupScreen.tsx BOT_POOLS resolves here so the
// player sees distinct opponent looks instead of generic difficulty tiers.
// Rookie Ron / Beginner Ben already covered by CAREER_NPCS (chapter 1).
const QUICK_PLAY_BOTS: Record<string, CharacterCustomization> = {
  // Easy — casual humans, mellow vibes
  'chill charlie':  make('human_modern_civilians_06', { bodyType: 35, bodySize: 60, muscle: 45, skinColor: '#a07050', hairColor: '#3d2817' }),
  'lazy luna':      make('human_modern_civilians_07', { bodyType: 85, bodySize: 50, muscle: 35, skinColor: '#dcb088', hairColor: '#7a3a8a' }),
  // Medium — police / tactical, athletic strategists
  'midfield mike':  make('human_modern_police_04', { bodyType: 12, bodySize: 50, muscle: 70, skinColor: '#c49272', hairColor: '#1a0e08' }),
  'steady steve':   make('human_modern_police_06', { bodyType: 8,  bodySize: 65, muscle: 75, skinColor: '#b89472', hairColor: '#5a3820' }),
  'tactical tara':  make('human_modern_police_08', { bodyType: 90, bodySize: 42, muscle: 65, skinColor: '#dcb088', hairColor: '#0a0606' }),
  'careful chris':  make('human_modern_police_09', { bodyType: 18, bodySize: 50, muscle: 70, skinColor: '#96654a', hairColor: '#3d2817' }),
  // Hard — samurai / sci-fi / pirate, ruthless tier
  'master maxine':  make('human_samurai_warriors_07', { bodyType: 88, bodySize: 45, muscle: 75, skinColor: '#d4a374', hairColor: '#0a0606' }),
  'grand gary':     make('human_samurai_warriors_05', { bodyType: 10, bodySize: 60, muscle: 80, skinColor: '#c49272', hairColor: '#e8e8e8' }),
  'elite emma':     make('human_sci_fi_soldiers_07', { bodyType: 90, bodySize: 45, muscle: 75, skinColor: '#b89472', hairColor: '#c73838' }),
  'savage sam':     make('human_pirate_captains_06', { bodyType: 5,  bodySize: 78, muscle: 95, skinColor: '#7a513e', hairColor: '#1a0e08' }),
};

/**
 * Resolve a NPC key (difficulty tier, bot_XXX, boss name, career level id,
 * etc.) to a 3D customization. Falls back to BOT_MEDIUM for unknown keys.
 */
export function getNpcCustomization(key: string | null | undefined): CharacterCustomization {
  if (!key) return BOT_MEDIUM;
  const k = key.toLowerCase();

  // Exact career NPC name match first (covers all 36 opponents)
  if (CAREER_NPCS[k]) return CAREER_NPCS[k];

  // Quick Play bot persona name match (covers MatchupScreen BOT_POOLS)
  if (QUICK_PLAY_BOTS[k]) return QUICK_PLAY_BOTS[k];

  // Difficulty tiers (for quick-play bots)
  if (k.includes('easy'))   return BOT_EASY;
  if (k.includes('medium')) return BOT_MEDIUM;
  if (k.includes('hard'))   return BOT_HARD;
  if (k.includes('legend') || k.includes('expert')) return BOT_LEGEND;

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
// ── Playable roster characters (bones, pixel, luna, tank) ────────
// These are characters the player CAN unlock and equip as alternate avatars.
// Each needs a distinctive 3D look matching their theme.

const ROSTER_BONES: CharacterCustomization = make('skeleton_fantasy_skeletons_01', {
  bodyType: 10, bodySize: 45, muscle: 55,
  skinColor: '#e8e4d0', hairColor: '#1a1a1a',
});

const ROSTER_PIXEL: CharacterCustomization = make('human_sci_fi_civilians_03', {
  bodyType: 55, bodySize: 45, muscle: 50,
  skinColor: '#d4a890', hairColor: '#2a80e0',
  outfitColors: { '10TORS': '#3a50c9', '18LEGL': '#1a1a30' },
});

const ROSTER_LUNA: CharacterCustomization = make('elves_elven_warriors_02', {
  bodyType: 88, bodySize: 40, muscle: 55,
  skinColor: '#f0d4b8', hairColor: '#c0a060',
  outfitColors: { '10TORS': '#3a5e6e', '11AUPL': '#5e8a9e' },
});

const ROSTER_TANK: CharacterCustomization = make('human_viking_warriors_03', {
  bodyType: 5, bodySize: 80, muscle: 95,
  skinColor: '#a47e58', hairColor: '#2e1e14',
  outfitColors: { '10TORS': '#6e4a1a', '17HIPS': '#3a1a0a' },
});

const ROSTER_MAP: Record<string, CharacterCustomization> = {
  bones: ROSTER_BONES,
  pixel: ROSTER_PIXEL,
  luna:  ROSTER_LUNA,
  tank:  ROSTER_TANK,
};

/**
 * Resolve a roster character ID ('bones', 'pixel', 'luna', 'tank') to its
 * 3D customization. Returns null for the default/player character (caller
 * should fall back to the player's own customization).
 */
export function getRosterCustomization(characterId: string): CharacterCustomization | null {
  return ROSTER_MAP[characterId] ?? null;
}
