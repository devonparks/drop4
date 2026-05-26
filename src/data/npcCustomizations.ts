/**
 * NPC 3D Character States
 *
 * Every bot opponent gets a fully-styled AMG CharacterState that
 * CompositeCharacter renders directly. Difficulty tiers map to escalating
 * themes (civilians → police → samurai → sci-fi); career bosses get
 * bespoke looks matching their chapter narrative.
 *
 * Consumers:
 *   - MatchupScreen opponent portrait
 *   - GameScreen opponent portrait
 *   - Character3DPortrait (when given an explicit `character` prop)
 *
 * The legacy `CharacterCustomization` shape (single-GLB outfitId + sliders)
 * has been replaced with `CharacterState` (per-slot AMG part names + color
 * properties + normalized blendshapes). The `make()` helper preserves the
 * old call-site ergonomics while emitting AMG-native data.
 */

// Import from submodules instead of the package index so the test
// runner can load this without dragging in CompositeCharacter (which
// pulls React + R3F). The runtime ships its data/types from leaf
// modules, so this is safe.
import {
  DEFAULT_COLORS_BY_SPECIES,
  type CharacterState,
  type SpeciesKey,
} from '@amg/character-runtime/types';
import { PART_CODE_TO_PROPERTY } from '@amg/character-runtime/scene/tint';
import { AMG_PART_NAMES } from './amgPartNamesIndex';

// ── Pack / species mapping tables ─────────────────────────────────────

type LegacySpecies = 'human' | 'elves' | 'goblin' | 'skeleton' | 'zombie';

/** Legacy slug → AMG pack prefix, verified against the manifest. */
const SLUG_TO_AMG_PREFIX: Record<string, string> = {
  apocalypse_outlaws:  'APOC_OUTL',
  apocalypse_survivor: 'APOC_SURV',
  apocalypse_zombies:  'APOC_ZOMB',
  elven_warriors:      'ELVN_WARR',
  fantasy_knights:     'FANT_KNGT',
  fantasy_skeletons:   'FANT_SKTN',
  fantasy_villagers:   'FANT_VILL',
  goblin_fighters:     'GOBL_FIGT',
  modern_civilians:    'MDRN_CIVL',
  modern_police:       'MDRN_POLC',
  pirate_captains:     'PIRT_CAPT',
  samurai_warriors:    'SAMR_WARR',
  sci_fi_civilians:    'SCFI_CIVL',
  sci_fi_soldiers:     'SCFI_SOLD',
  viking_warriors:     'VIKG_WARR',
};

/** Sidekick suffix used when looking up parts FROM AN OUTFIT PACK. Elves
 *  ride the human rig for outfit packs (ELVN_WARR ships HU01 body parts),
 *  so their pack suffix is HU01 even though their face suffix is EV01. */
const PACK_SUFFIX: Record<LegacySpecies, string> = {
  human:    'HU01',
  elves:    'HU01',
  goblin:   'GO01',
  skeleton: 'SN01',
  zombie:   'ZB01',
};

/** Sidekick suffix used when looking up parts FROM THE SPECIES BASE PACK
 *  (HUMN_BASE / ELVN_BASE / etc.). Elves' base ships EV01 face/body parts;
 *  every other species matches its pack suffix. */
const BASE_SUFFIX: Record<LegacySpecies, string> = {
  human:    'HU01',
  elves:    'EV01',
  goblin:   'GO01',
  skeleton: 'SN01',
  zombie:   'ZB01',
};

/** Base pack name per species (supplies face/head parts and slot fallbacks
 *  when the equipped outfit pack doesn't ship that slot). */
const SPECIES_BASE_PREFIX: Record<LegacySpecies, string> = {
  human:    'HUMN_BASE',
  elves:    'ELVN_BASE',
  goblin:   'GOBL_BASE',
  skeleton: 'SKTN_BASE',
  zombie:   'ZOMB_BASE',
};

/** Pick the first valid part name from a candidate list, validating
 *  against the baked-in AMG part-names index. Returns undefined when
 *  none of the candidates ship in the live manifest — caller should
 *  drop that slot from the CharacterState rather than emit a 404 path. */
function pickPart(candidates: string[]): string | undefined {
  for (const name of candidates) {
    if (AMG_PART_NAMES.has(name)) return name;
  }
  return undefined;
}

const SPECIES_AMG: Record<LegacySpecies, SpeciesKey> = {
  human:    'Human',
  elves:    'Elves',
  goblin:   'Goblin',
  skeleton: 'Skeleton',
  zombie:   'Zombie',
};

/** Body-slot key + Sidekick part code pairs filled per pack-variant. */
const BODY_SLOTS: ReadonlyArray<[keyof CharacterState['parts'], string]> = [
  ['Hair',          '02HAIR'],
  ['Torso',         '10TORS'],
  ['Hips',          '17HIPS'],
  ['ArmUpperLeft',  '11AUPL'],
  ['ArmUpperRight', '12AUPR'],
  ['ArmLowerLeft',  '13ALWL'],
  ['ArmLowerRight', '14ALWR'],
  ['HandLeft',      '15HNDL'],
  ['HandRight',     '16HNDR'],
  ['LegLeft',       '18LEGL'],
  ['LegRight',      '19LEGR'],
  ['FootLeft',      '20FOTL'],
  ['FootRight',     '21FOTR'],
];

/** Face-slot key + Sidekick part code pairs always pulled from the species
 *  base pack. Without these, the head mesh renders with hollow eye sockets
 *  + missing teeth/nose. Skeletons / zombies / etc. don't ship every face
 *  slot — pickPart filters out missing parts via AMG_PART_NAMES. */
const FACE_SLOTS: ReadonlyArray<[keyof CharacterState['parts'], string]> = [
  ['EyebrowLeft',  '03EBRL'],
  ['EyebrowRight', '04EBRR'],
  ['EyeLeft',      '05EYEL'],
  ['EyeRight',     '06EYER'],
  ['EarLeft',      '07EARL'],
  ['EarRight',     '08EARR'],
  ['Nose',         '35NOSE'],
  ['Teeth',        '36TETH'],
  ['Tongue',       '37TONG'],
];

// ── Translator ────────────────────────────────────────────────────────

export interface MakeOpts {
  /** 0=masculine ↔ 100=feminine (matches legacy slider). */
  bodyType?: number;
  /** 0=skinny ↔ 50=neutral ↔ 100=heavy. */
  bodySize?: number;
  /** 0=lean ↔ 100=buff. */
  muscle?: number;
  skinColor?: string;
  hairColor?: string;
  /** Legacy part codes ('10TORS', '17HIPS') → hex. Translated into the
   *  matching SidekickColorProperty ('Tops', 'Bottoms', etc.). */
  outfitColors?: Record<string, string>;
}

/**
 * Build a CharacterState from a legacy outfit id + tuning options. Outfit
 * id format: `<species>_<pack-slug>_<NN>` (e.g. 'human_modern_civilians_03').
 *
 * Face/head parts come from the species' BASE pack so every NPC has a clean
 * face regardless of which outfit pack they wear. Body parts come from the
 * outfit pack at the requested variant. Slots not present in a given pack
 * variant silently fail to load — CompositeCharacter renders whatever did.
 *
 * Exported so OutfitPreviewModal and other features that show a "what would
 * X look like in this outfit" preview can build a CharacterState from a
 * registry id without re-implementing the parsing.
 */
export function buildAmgCharacterForOutfit(outfitId: string, opts: MakeOpts = {}): CharacterState {
  return make(outfitId, opts);
}

/**
 * Body-only part dictionary for an outfit pack — used by the shop's
 * "equip outfit" flow so equipping a new outfit doesn't overwrite the
 * player's chosen Head / Eyebrows. Returns {Hair, Torso, Hips, arms,
 * hands, legs, feet}.
 */
export function buildAmgBodyForOutfit(outfitId: string): CharacterState['parts'] {
  const full = make(outfitId);
  const { Head: _h, EyebrowLeft: _l, EyebrowRight: _r, ...body } = full.parts;
  return body;
}

function make(outfitId: string, opts: MakeOpts = {}): CharacterState {
  const m = outfitId.match(/^([a-z]+)_(.+)_(\d+)$/);
  // Sensible default if an outfit id ever drifts: build a Human MDRN_CIVL_01.
  const speciesSlug = (m?.[1] ?? 'human') as LegacySpecies;
  const packSlug    = m?.[2] ?? 'modern_civilians';
  const variant     = (m?.[3] ?? '01').padStart(2, '0');

  const amgPrefix  = SLUG_TO_AMG_PREFIX[packSlug] ?? 'MDRN_CIVL';
  const packSuf    = PACK_SUFFIX[speciesSlug] ?? 'HU01';
  const baseSuf    = BASE_SUFFIX[speciesSlug] ?? 'HU01';
  const basePrefix = SPECIES_BASE_PREFIX[speciesSlug] ?? 'HUMN_BASE';
  const amgSpecies = SPECIES_AMG[speciesSlug] ?? 'Human';

  // Face slots: only the species base ships these. Skip if the base
  // doesn't have it (skeletons have no eyebrows / nose / ears).
  const parts: CharacterState['parts'] = {};
  const head = pickPart([`SK_${basePrefix}_01_01HEAD_${baseSuf}`]);
  if (head) parts.Head = head;
  for (const [slot, code] of FACE_SLOTS) {
    const name = pickPart([`SK_${basePrefix}_01_${code}_${baseSuf}`]);
    if (name) parts[slot] = name;
  }

  // Body slots: prefer the requested pack-variant, fall back to variant
  // 01 of the same pack, then the species base. Hair gets an extra fall
  // back to the BASE pack's hair (with the BASE suffix) so elves wearing
  // a non-elven outfit still get a head of hair.
  for (const [slot, code] of BODY_SLOTS) {
    const candidates = [
      `SK_${amgPrefix}_${variant}_${code}_${packSuf}`,
      `SK_${amgPrefix}_01_${code}_${packSuf}`,
      `SK_${basePrefix}_01_${code}_${baseSuf}`,
    ];
    const name = pickPart(candidates);
    if (name) parts[slot] = name;
  }

  const colors: CharacterState['colors'] = {
    ...DEFAULT_COLORS_BY_SPECIES[amgSpecies],
  };
  if (opts.skinColor) colors['Skin 01'] = opts.skinColor;
  if (opts.hairColor) colors['Hair 01'] = opts.hairColor;
  if (opts.outfitColors) {
    for (const [partCode, hex] of Object.entries(opts.outfitColors)) {
      const property = PART_CODE_TO_PROPERTY[partCode];
      if (property) colors[property] = hex;
    }
  }

  return {
    species: amgSpecies,
    parts,
    blendshapes: {
      feminine: (opts.bodyType ?? 30) / 100,
      weight:   ((opts.bodySize ?? 50) - 50) / 50,
      muscle:   (opts.muscle ?? 60) / 100,
    },
    colors,
    animation: null,
    expression: null,
  };
}

// ── Difficulty-tiered generic bots ─────────────────────────────────

const BOT_EASY: CharacterState = make('human_modern_civilians_03', {
  bodyType: 20, bodySize: 45, muscle: 50,
  skinColor: '#e6c9a8', hairColor: '#5a3820',
});

const BOT_MEDIUM: CharacterState = make('human_modern_police_01', {
  bodyType: 15, bodySize: 55, muscle: 75,
  skinColor: '#c49272', hairColor: '#1a1410',
});

const BOT_HARD: CharacterState = make('human_samurai_warriors_02', {
  bodyType: 10, bodySize: 60, muscle: 85,
  skinColor: '#d4a374', hairColor: '#0a0606',
});

const BOT_LEGEND: CharacterState = make('human_sci_fi_soldiers_01', {
  bodyType: 5, bodySize: 62, muscle: 90,
  skinColor: '#8a6a52', hairColor: '#2a2830',
});

// ── Career bosses (chapter 1, 2, 3) ───────────────────────────────

const BOSS_KING_KYLE: CharacterState = make('human_fantasy_knights_01', {
  bodyType: 5, bodySize: 75, muscle: 90,
  skinColor: '#b89472', hairColor: '#f0d880',
  outfitColors: { '10TORS': '#7a1a2a', '11AUPL': '#c9a16a', '12AUPR': '#c9a16a' },
});

const BOSS_CHAPTER_2: CharacterState = make('human_apocalypse_outlaws_03', {
  bodyType: 8, bodySize: 70, muscle: 88,
  skinColor: '#a07858', hairColor: '#1a0a0a',
  outfitColors: { '10TORS': '#2a2a30', '18LEGL': '#1a1a20', '19LEGR': '#1a1a20' },
});

const BOSS_CHAPTER_3: CharacterState = make('human_sci_fi_soldiers_05', {
  bodyType: 5, bodySize: 65, muscle: 92,
  skinColor: '#8a6a52', hairColor: '#0a0a0a',
  outfitColors: { '10TORS': '#1a0030', '11AUPL': '#5e1a3a', '12AUPR': '#5e1a3a' },
});

// ── Per-NPC career customizations (36 unique opponents) ──────────

// Chapter 1 — "The Neighborhood" (civilians, casual, street wear)
const CAREER_NPCS: Record<string, CharacterState> = {
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
  'tommy blacktop':   BOSS_KING_KYLE,
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
  'sunset sal':        BOSS_CHAPTER_2,
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
  'the cathedral warden': BOSS_CHAPTER_3,
  'the dark lord':    BOSS_CHAPTER_3,

  // ── Ch4 · CHICAGO "The Cage" — cerebral, police/civilian mix ────
  'hustler hank':     make('human_modern_civilians_04', { bodyType: 18, bodySize: 58, muscle: 60, skinColor: '#96654a', hairColor: '#1a0e08' }),
  'pawn master pete': make('human_modern_civilians_06', { bodyType: 22, bodySize: 50, muscle: 55, skinColor: '#dcb088', hairColor: '#5a3820' }),
  'puzzle phyllis':   make('human_modern_civilians_09', { bodyType: 85, bodySize: 45, muscle: 50, skinColor: '#b89472', hairColor: '#c73838' }),
  'locked-in lou':    make('human_modern_police_04',    { bodyType: 10, bodySize: 62, muscle: 70, skinColor: '#7a513e', hairColor: '#0a0606' }),
  'knight knox':      make('human_fantasy_knights_03',  { bodyType: 8,  bodySize: 68, muscle: 85, skinColor: '#c49272', hairColor: '#3d2817' }),
  'trapped tia':      make('human_modern_police_05',    { bodyType: 88, bodySize: 40, muscle: 65, skinColor: '#e6c9a8', hairColor: '#8a3ac7' }),
  'position pete':    make('human_modern_civilians_08', { bodyType: 15, bodySize: 55, muscle: 60, skinColor: '#d4a374', hairColor: '#c9a16a' }),
  'closed cara':      make('human_modern_police_09',    { bodyType: 90, bodySize: 42, muscle: 58, skinColor: '#dcb088', hairColor: '#1a1410' }),
  'cage master carl': make('human_modern_police_07',    { bodyType: 5,  bodySize: 72, muscle: 88, skinColor: '#8a6a52', hairColor: '#0a0606' }),
  'riddler reese':    make('human_sci_fi_civilians_04', { bodyType: 40, bodySize: 48, muscle: 55, skinColor: '#f0d4b8', hairColor: '#3870c7' }),
  'the cipher':       make('human_sci_fi_civilians_09', { bodyType: 25, bodySize: 52, muscle: 62, skinColor: '#c49272', hairColor: '#e8e8e8' }),
  'big bear':         make('human_viking_warriors_04',  { bodyType: 5,  bodySize: 85, muscle: 95, skinColor: '#7a513e', hairColor: '#2e1e14' }),

  // ── Ch5 · DETROIT "The Motor" — every type, industrial ─────────
  'switch steve':     make('human_modern_civilians_02', { bodyType: 20, bodySize: 52, muscle: 55, skinColor: '#c49272', hairColor: '#5a3820' }),
  'gear greta':       make('human_modern_civilians_10', { bodyType: 85, bodySize: 38, muscle: 60, skinColor: '#dcb088', hairColor: '#e874a8' }),
  'carburetor carl':  make('human_modern_civilians_05', { bodyType: 30, bodySize: 58, muscle: 65, skinColor: '#96654a', hairColor: '#3d2817' }),
  'piston pat':       make('human_modern_police_02',    { bodyType: 12, bodySize: 60, muscle: 72, skinColor: '#8a6a52', hairColor: '#0a0606' }),
  'wrench wendy':     make('human_modern_police_03',    { bodyType: 88, bodySize: 48, muscle: 58, skinColor: '#b89472', hairColor: '#c9a16a' }),
  'diesel dom':       make('human_viking_warriors_01',  { bodyType: 5,  bodySize: 75, muscle: 90, skinColor: '#7a513e', hairColor: '#1a0e08' }),
  'spark plug sal':   make('human_sci_fi_civilians_04', { bodyType: 35, bodySize: 45, muscle: 55, skinColor: '#d4a374', hairColor: '#f1c40f' }),
  'throttle tim':     make('human_modern_civilians_08', { bodyType: 15, bodySize: 65, muscle: 70, skinColor: '#e6c9a8', hairColor: '#2e1e14' }),
  'tinker tina':      make('human_sci_fi_civilians_09', { bodyType: 90, bodySize: 35, muscle: 55, skinColor: '#dcb088', hairColor: '#3870c7' }),
  'radiator rae':     make('human_modern_police_08',    { bodyType: 82, bodySize: 42, muscle: 68, skinColor: '#c49272', hairColor: '#c73838' }),
  'solder saul':      make('human_pirate_captains_02',  { bodyType: 10, bodySize: 68, muscle: 80, skinColor: '#96654a', hairColor: '#0a0606' }),
  'the mechanic':     make('human_sci_fi_soldiers_08',  { bodyType: 5,  bodySize: 78, muscle: 92, skinColor: '#7a513e', hairColor: '#1a1410' }),

  // ── Ch6 · OAKLAND "The Town" — big boards, long game ───────────
  'long game larry':  make('human_modern_civilians_06', { bodyType: 22, bodySize: 62, muscle: 55, skinColor: '#d4a374', hairColor: '#7a5230' }),
  'six-strong sue':   make('human_modern_civilians_11', { bodyType: 88, bodySize: 45, muscle: 60, skinColor: '#8a6a52', hairColor: '#1a0e08' }),
  'big board bo':     make('human_modern_civilians_08', { bodyType: 5,  bodySize: 80, muscle: 75, skinColor: '#b89472', hairColor: '#3d2817' }),
  'patience park':    make('human_fantasy_villagers_03', { bodyType: 30, bodySize: 50, muscle: 50, skinColor: '#e6c9a8', hairColor: '#5a3820' }),
  'marathon marc':    make('human_modern_civilians_04', { bodyType: 15, bodySize: 55, muscle: 65, skinColor: '#c49272', hairColor: '#0a0606' }),
  'grid geneva':      make('human_modern_police_05',    { bodyType: 85, bodySize: 42, muscle: 58, skinColor: '#dcb088', hairColor: '#8a3ac7' }),
  'the stretch':      make('human_fantasy_villagers_07', { bodyType: 10, bodySize: 35, muscle: 60, skinColor: '#96654a', hairColor: '#c9a16a' }),
  'wide open wynn':   make('human_modern_civilians_07', { bodyType: 18, bodySize: 58, muscle: 55, skinColor: '#f0d4b8', hairColor: '#2e1e14' }),
  'endurance eddie':  make('human_samurai_warriors_03', { bodyType: 8,  bodySize: 65, muscle: 80, skinColor: '#7a513e', hairColor: '#0a0606' }),
  'slow burn soraya': make('human_samurai_warriors_07', { bodyType: 90, bodySize: 40, muscle: 68, skinColor: '#d4a374', hairColor: '#1a1410' }),
  'the architect':    make('human_sci_fi_civilians_09', { bodyType: 82, bodySize: 48, muscle: 55, skinColor: '#b89472', hairColor: '#e8e8e8' }),
  "the town's best":  make('human_sci_fi_soldiers_03',  { bodyType: 5,  bodySize: 70, muscle: 90, skinColor: '#8a6a52', hairColor: '#f1c40f' }),

  // ── Ch7 · COMPTON "The Yard" — speed, aggressive ───────────────
  'drag race drew':   make('human_modern_civilians_07', { bodyType: 15, bodySize: 42, muscle: 68, skinColor: '#7a513e', hairColor: '#0a0606' }),
  'burnout bea':      make('human_modern_civilians_10', { bodyType: 88, bodySize: 35, muscle: 62, skinColor: '#96654a', hairColor: '#c73838' }),
  'nitrous nate':     make('human_modern_civilians_03', { bodyType: 20, bodySize: 48, muscle: 72, skinColor: '#5e3e2e', hairColor: '#1a0e08' }),
  'skidmark sky':     make('human_modern_civilians_05', { bodyType: 25, bodySize: 52, muscle: 65, skinColor: '#8a6a52', hairColor: '#3d2817' }),
  'rev rev rae':      make('human_modern_police_08',    { bodyType: 85, bodySize: 40, muscle: 70, skinColor: '#b89472', hairColor: '#e874a8' }),
  'throttle theo':    make('human_modern_police_04',    { bodyType: 10, bodySize: 55, muscle: 75, skinColor: '#c49272', hairColor: '#5a3820' }),
  'pop-off pip':      make('human_apocalypse_outlaws_04', { bodyType: 40, bodySize: 45, muscle: 68, skinColor: '#d4a374', hairColor: '#1a1410' }),
  'track star tia':   make('human_modern_police_09',    { bodyType: 90, bodySize: 38, muscle: 65, skinColor: '#dcb088', hairColor: '#0a0606' }),
  'yard hawk':        make('human_apocalypse_outlaws_08', { bodyType: 8,  bodySize: 68, muscle: 88, skinColor: '#7a513e', hairColor: '#2e1e14' }),
  'streetlight sam':  make('human_pirate_captains_05',  { bodyType: 12, bodySize: 62, muscle: 78, skinColor: '#96654a', hairColor: '#0a0606' }),
  'crash crew':       make('human_apocalypse_outlaws_04', { bodyType: 5,  bodySize: 72, muscle: 85, skinColor: '#5e3e2e', hairColor: '#1a0e08' }),
  'quick draw q':     make('human_sci_fi_soldiers_05',  { bodyType: 10, bodySize: 65, muscle: 92, skinColor: '#8a6a52', hairColor: '#0a0606' }),

  // ── Ch8 · MIAMI "South Beach" — flash, neon, jeopardy ─────────
  'neon nina':        make('human_modern_civilians_09', { bodyType: 92, bodySize: 38, muscle: 55, skinColor: '#dcb088', hairColor: '#e874a8' }),
  'tropic theo':      make('human_modern_civilians_02', { bodyType: 25, bodySize: 52, muscle: 60, skinColor: '#d4a374', hairColor: '#c9a16a' }),
  'ocean drive owen': make('human_modern_civilians_06', { bodyType: 18, bodySize: 55, muscle: 58, skinColor: '#b89472', hairColor: '#5a3820' }),
  'palm park pia':    make('human_modern_civilians_11', { bodyType: 88, bodySize: 42, muscle: 52, skinColor: '#e6c9a8', hairColor: '#3870c7' }),
  'cabana karim':     make('human_modern_civilians_04', { bodyType: 15, bodySize: 60, muscle: 65, skinColor: '#8a6a52', hairColor: '#1a0e08' }),
  'yacht yara':       make('human_modern_civilians_10', { bodyType: 85, bodySize: 40, muscle: 58, skinColor: '#f0d4b8', hairColor: '#c73838' }),
  'beach boss bria':  make('human_modern_police_05',    { bodyType: 90, bodySize: 45, muscle: 68, skinColor: '#c49272', hairColor: '#8a3ac7' }),
  'rooftop romeo':    make('human_pirate_captains_02',  { bodyType: 8,  bodySize: 65, muscle: 78, skinColor: '#96654a', hairColor: '#2e1e14' }),
  'sunset cyrus':     make('human_modern_civilians_08', { bodyType: 12, bodySize: 58, muscle: 62, skinColor: '#7a513e', hairColor: '#f1c40f' }),
  'bayside brad':     make('human_modern_police_07',    { bodyType: 5,  bodySize: 72, muscle: 85, skinColor: '#5e3e2e', hairColor: '#0a0606' }),
  'skyline skye':     make('human_sci_fi_civilians_04', { bodyType: 82, bodySize: 42, muscle: 60, skinColor: '#d4a374', hairColor: '#e8e8e8' }),
  'king of south beach': make('human_fantasy_knights_01', { bodyType: 5, bodySize: 78, muscle: 92, skinColor: '#8a6a52', hairColor: '#c9a16a' }),

  // ── Ch9 · THE VOID — surreal, skeleton/zombie/goblin ───────────
  'shade one':        make('skeleton_fantasy_skeletons_05', { bodyType: 15, bodySize: 55, muscle: 65, skinColor: '#d0ccc0', hairColor: '#1a1a1a' }),
  'echo':             make('zombie_apocalypse_zombies_02',  { bodyType: 20, bodySize: 58, muscle: 62, skinColor: '#a0a898', hairColor: '#3a3a40' }),
  'mirror':           make('goblin_goblin_fighters_04',     { bodyType: 45, bodySize: 50, muscle: 55, skinColor: '#8ab090', hairColor: '#2a5030' }),
  'the drift':        make('skeleton_fantasy_skeletons_09', { bodyType: 30, bodySize: 48, muscle: 60, skinColor: '#e8e4d0', hairColor: '#0a0a0a' }),
  'phantom':          make('zombie_apocalypse_zombies_02',  { bodyType: 10, bodySize: 62, muscle: 70, skinColor: '#808878', hairColor: '#2a2a30' }),
  'whisper':          make('skeleton_fantasy_skeletons_05', { bodyType: 80, bodySize: 42, muscle: 55, skinColor: '#d0d0c8', hairColor: '#1a1a1a' }),
  'static':           make('goblin_goblin_fighters_04',     { bodyType: 55, bodySize: 55, muscle: 65, skinColor: '#6a8a6a', hairColor: '#3a5a3a' }),
  'noise':            make('zombie_apocalypse_zombies_02',  { bodyType: 35, bodySize: 60, muscle: 68, skinColor: '#989890', hairColor: '#3a3a3a' }),
  'the hollow':       make('skeleton_fantasy_skeletons_09', { bodyType: 25, bodySize: 45, muscle: 58, skinColor: '#c8c4b8', hairColor: '#0a0a0a' }),
  'threshold':        make('human_apocalypse_outlaws_08',   { bodyType: 10, bodySize: 68, muscle: 82, skinColor: '#5e3e2e', hairColor: '#1a0e08' }),
  'the edge':         make('human_sci_fi_soldiers_03',      { bodyType: 8,  bodySize: 62, muscle: 78, skinColor: '#7a513e', hairColor: '#e8e8e8' }),
  'the void':         make('human_sci_fi_soldiers_05',      { bodyType: 5,  bodySize: 75, muscle: 95, skinColor: '#3a2a3a', hairColor: '#0a0606', outfitColors: { '10TORS': '#0a0010', '17HIPS': '#0a0010' } }),

  // ── Ch10 · ATLANTA "The Trap" — flash + hustle ─────────────────
  'drip daniel':      make('human_modern_civilians_02', { bodyType: 22, bodySize: 48, muscle: 58, skinColor: '#7a513e', hairColor: '#0a0606' }),
  'hustle henry':     make('human_modern_civilians_04', { bodyType: 15, bodySize: 55, muscle: 65, skinColor: '#5e3e2e', hairColor: '#1a0e08' }),
  'bass boost bria':  make('human_modern_civilians_10', { bodyType: 88, bodySize: 40, muscle: 60, skinColor: '#96654a', hairColor: '#e874a8' }),
  'stack cassidy':    make('human_modern_civilians_06', { bodyType: 25, bodySize: 52, muscle: 62, skinColor: '#8a6a52', hairColor: '#3d2817' }),
  'boom bap brent':   make('human_modern_police_02',    { bodyType: 10, bodySize: 65, muscle: 78, skinColor: '#7a513e', hairColor: '#0a0606' }),
  'glow up gia':      make('human_modern_civilians_11', { bodyType: 92, bodySize: 38, muscle: 55, skinColor: '#b89472', hairColor: '#8a3ac7' }),
  'real recognize rey': make('human_modern_police_04',  { bodyType: 12, bodySize: 58, muscle: 72, skinColor: '#96654a', hairColor: '#2e1e14' }),
  'drip drum':        make('human_modern_civilians_07', { bodyType: 18, bodySize: 50, muscle: 68, skinColor: '#5e3e2e', hairColor: '#1a1410' }),
  'slick sosa':       make('human_pirate_captains_05',  { bodyType: 8,  bodySize: 62, muscle: 82, skinColor: '#8a6a52', hairColor: '#0a0606' }),
  'top floor tony':   make('human_samurai_warriors_06', { bodyType: 5,  bodySize: 68, muscle: 85, skinColor: '#7a513e', hairColor: '#0a0606' }),
  'heir apparent':    make('human_sci_fi_soldiers_03',  { bodyType: 15, bodySize: 55, muscle: 75, skinColor: '#96654a', hairColor: '#c9a16a' }),
  'trap king':        make('human_fantasy_knights_01',  { bodyType: 5,  bodySize: 78, muscle: 92, skinColor: '#5e3e2e', hairColor: '#0a0606', outfitColors: { '10TORS': '#1a0a20', '17HIPS': '#1a0a20' } }),

  // ── Ch11 · HOUSTON "The Furnace" — endurance, patient ──────────
  'slow roll sage':   make('human_modern_civilians_05', { bodyType: 30, bodySize: 60, muscle: 55, skinColor: '#d4a374', hairColor: '#7a5230' }),
  'endurance earl':   make('human_modern_civilians_08', { bodyType: 15, bodySize: 65, muscle: 68, skinColor: '#c49272', hairColor: '#3d2817' }),
  'patient pez':      make('human_modern_civilians_03', { bodyType: 25, bodySize: 55, muscle: 52, skinColor: '#dcb088', hairColor: '#5a3820' }),
  'long haul hank':   make('human_modern_civilians_06', { bodyType: 10, bodySize: 72, muscle: 70, skinColor: '#8a6a52', hairColor: '#0a0606' }),
  'stalker stella':   make('human_modern_police_09',    { bodyType: 88, bodySize: 45, muscle: 62, skinColor: '#b89472', hairColor: '#c73838' }),
  'cool hand cody':   make('human_modern_civilians_04', { bodyType: 18, bodySize: 58, muscle: 60, skinColor: '#96654a', hairColor: '#1a0e08' }),
  'marathon mara':    make('human_modern_civilians_11', { bodyType: 85, bodySize: 40, muscle: 58, skinColor: '#e6c9a8', hairColor: '#e874a8' }),
  'steady steve':     make('human_modern_police_06',    { bodyType: 8,  bodySize: 65, muscle: 75, skinColor: '#7a513e', hairColor: '#2e1e14' }),
  'late bloomer lena': make('human_modern_civilians_10', { bodyType: 90, bodySize: 42, muscle: 55, skinColor: '#d4a374', hairColor: '#8a3ac7' }),
  'iron lung iris':   make('human_samurai_warriors_07', { bodyType: 82, bodySize: 48, muscle: 72, skinColor: '#c49272', hairColor: '#0a0606' }),
  'final answer felix': make('human_sci_fi_civilians_04', { bodyType: 20, bodySize: 52, muscle: 62, skinColor: '#dcb088', hairColor: '#3870c7' }),
  'houston king':     make('human_viking_warriors_04',  { bodyType: 5,  bodySize: 80, muscle: 92, skinColor: '#8a6a52', hairColor: '#c9a16a' }),

  // ── Ch12 · CLEVELAND "The Lake" — foundational, obstacle-heavy ─
  'lake effect larry': make('human_modern_civilians_02', { bodyType: 22, bodySize: 60, muscle: 58, skinColor: '#e6c9a8', hairColor: '#5a3820' }),
  'east cle eli':     make('human_modern_civilians_04', { bodyType: 15, bodySize: 55, muscle: 62, skinColor: '#7a513e', hairColor: '#0a0606' }),
  'tremont tasha':    make('human_modern_civilians_09', { bodyType: 85, bodySize: 45, muscle: 55, skinColor: '#96654a', hairColor: '#c73838' }),
  'coventry cyrus':   make('human_modern_civilians_05', { bodyType: 25, bodySize: 50, muscle: 58, skinColor: '#dcb088', hairColor: '#3d2817' }),
  'west side wynn':   make('human_modern_civilians_07', { bodyType: 18, bodySize: 52, muscle: 60, skinColor: '#8a6a52', hairColor: '#1a0e08' }),
  'slavic village stas': make('human_fantasy_villagers_07', { bodyType: 10, bodySize: 65, muscle: 70, skinColor: '#c49272', hairColor: '#c9a16a' }),
  'old brooklyn otto': make('human_modern_civilians_08', { bodyType: 5, bodySize: 70, muscle: 72, skinColor: '#d4a374', hairColor: '#2e1e14' }),
  'charlie everbrush': make('human_modern_police_07',   { bodyType: 12, bodySize: 62, muscle: 78, skinColor: '#b89472', hairColor: '#7a5230' }),
  'bedford bree':     make('human_modern_civilians_11', { bodyType: 88, bodySize: 40, muscle: 58, skinColor: '#e6c9a8', hairColor: '#e874a8' }),
  'glenville greg':   make('human_modern_police_04',    { bodyType: 8,  bodySize: 68, muscle: 82, skinColor: '#5e3e2e', hairColor: '#0a0606' }),
  'murray hill mac':  make('human_pirate_captains_02',  { bodyType: 10, bodySize: 65, muscle: 80, skinColor: '#96654a', hairColor: '#1a0e08' }),
  '755':              make('human_sci_fi_soldiers_08',  { bodyType: 5,  bodySize: 75, muscle: 92, skinColor: '#7a513e', hairColor: '#0a0606', outfitColors: { '10TORS': '#2a1a0a', '17HIPS': '#2a1a0a' } }),

  // ── Ch13 · PHILADELPHIA "The Steps" — comeback, Rocky vibe ─────
  'heavyweight hank': make('human_modern_civilians_08', { bodyType: 5,  bodySize: 78, muscle: 88, skinColor: '#c49272', hairColor: '#3d2817' }),
  'step climber stax': make('human_modern_civilians_02', { bodyType: 18, bodySize: 55, muscle: 68, skinColor: '#8a6a52', hairColor: '#0a0606' }),
  'rocky reggie':     make('human_modern_civilians_04', { bodyType: 12, bodySize: 60, muscle: 72, skinColor: '#dcb088', hairColor: '#5a3820' }),
  'iron jaw ivan':    make('human_modern_police_02',    { bodyType: 8,  bodySize: 68, muscle: 85, skinColor: '#96654a', hairColor: '#1a0e08' }),
  'right hook rae':   make('human_modern_police_08',    { bodyType: 88, bodySize: 42, muscle: 70, skinColor: '#b89472', hairColor: '#c73838' }),
  'bell ringer bria': make('human_modern_civilians_10', { bodyType: 85, bodySize: 40, muscle: 65, skinColor: '#d4a374', hairColor: '#8a3ac7' }),
  'apollo asher':     make('human_samurai_warriors_06', { bodyType: 10, bodySize: 55, muscle: 78, skinColor: '#7a513e', hairColor: '#c9a16a' }),
  'clubber cleo':     make('human_apocalypse_outlaws_04', { bodyType: 82, bodySize: 50, muscle: 72, skinColor: '#5e3e2e', hairColor: '#1a1410' }),
  'drago dom':        make('human_viking_warriors_01',  { bodyType: 5,  bodySize: 80, muscle: 95, skinColor: '#e6c9a8', hairColor: '#c9a16a' }),
  'tommy gunn tara':  make('human_modern_police_05',    { bodyType: 90, bodySize: 42, muscle: 68, skinColor: '#c49272', hairColor: '#0a0606' }),
  'italian stallion stefan': make('human_fantasy_knights_03', { bodyType: 8, bodySize: 72, muscle: 90, skinColor: '#dcb088', hairColor: '#2e1e14' }),
  'the underdog':     make('human_modern_civilians_06', { bodyType: 15, bodySize: 58, muscle: 75, skinColor: '#8a6a52', hairColor: '#5a3820' }),

  // ── Ch14 · SEATTLE "The Rain" — gloomy, puzzle-heavy ──────────
  'drizzle dane':     make('human_modern_civilians_05', { bodyType: 25, bodySize: 52, muscle: 55, skinColor: '#f0d4b8', hairColor: '#7a5230' }),
  'mist mira':        make('human_modern_civilians_09', { bodyType: 88, bodySize: 40, muscle: 50, skinColor: '#dcb088', hairColor: '#3870c7' }),
  'overcast otto':    make('human_modern_civilians_08', { bodyType: 15, bodySize: 60, muscle: 58, skinColor: '#c49272', hairColor: '#3d2817' }),
  'pour patel':       make('human_modern_civilians_04', { bodyType: 20, bodySize: 55, muscle: 60, skinColor: '#d4a374', hairColor: '#1a0e08' }),
  'downpour dakota':  make('human_modern_civilians_07', { bodyType: 30, bodySize: 48, muscle: 55, skinColor: '#b89472', hairColor: '#5a3820' }),
  'cloud cover cyrus': make('human_modern_civilians_06', { bodyType: 18, bodySize: 58, muscle: 62, skinColor: '#8a6a52', hairColor: '#c9a16a' }),
  'fog freya':        make('human_modern_civilians_11', { bodyType: 85, bodySize: 42, muscle: 55, skinColor: '#e6c9a8', hairColor: '#e8e8e8' }),
  'squall sky':       make('human_modern_police_04',    { bodyType: 10, bodySize: 52, muscle: 65, skinColor: '#96654a', hairColor: '#0a0606' }),
  'pacific pia':      make('human_modern_civilians_10', { bodyType: 90, bodySize: 38, muscle: 58, skinColor: '#dcb088', hairColor: '#8a3ac7' }),
  'cascade cain':     make('human_samurai_warriors_03', { bodyType: 8,  bodySize: 65, muscle: 78, skinColor: '#7a513e', hairColor: '#2e1e14' }),
  'soundwave sven':   make('human_sci_fi_civilians_09', { bodyType: 22, bodySize: 55, muscle: 62, skinColor: '#c49272', hairColor: '#3870c7' }),
  'the storm':        make('human_sci_fi_soldiers_05',  { bodyType: 5,  bodySize: 72, muscle: 88, skinColor: '#5e3e2e', hairColor: '#0a0606', outfitColors: { '10TORS': '#0a1a2a', '17HIPS': '#0a1a2a' } }),

  // ── Ch15 · TORONTO "The Six" — everything stacked ─────────────
  'border bea':       make('human_modern_civilians_09', { bodyType: 85, bodySize: 45, muscle: 58, skinColor: '#dcb088', hairColor: '#c73838' }),
  'north star nox':   make('human_sci_fi_civilians_04', { bodyType: 40, bodySize: 48, muscle: 62, skinColor: '#e6c9a8', hairColor: '#1a0e08' }),
  'six side sky':     make('human_modern_police_07',    { bodyType: 10, bodySize: 62, muscle: 78, skinColor: '#8a6a52', hairColor: '#0a0606' }),
  'mosaic mira':      make('human_fantasy_villagers_03', { bodyType: 88, bodySize: 42, muscle: 55, skinColor: '#b89472', hairColor: '#8a3ac7' }),
  'polyglot pria':    make('human_modern_civilians_11', { bodyType: 82, bodySize: 40, muscle: 58, skinColor: '#d4a374', hairColor: '#3870c7' }),
  'drake drago':      make('human_pirate_captains_02',  { bodyType: 8,  bodySize: 68, muscle: 82, skinColor: '#7a513e', hairColor: '#2e1e14' }),
  'maple mac':        make('human_modern_civilians_06', { bodyType: 15, bodySize: 60, muscle: 65, skinColor: '#96654a', hairColor: '#5a3820' }),
  'crown carrera':    make('human_samurai_warriors_06', { bodyType: 12, bodySize: 55, muscle: 75, skinColor: '#c49272', hairColor: '#c9a16a' }),
  'northern light nyx': make('elves_elven_warriors_03', { bodyType: 90, bodySize: 45, muscle: 62, skinColor: '#f0d4b8', hairColor: '#90c0d0' }),
  'steel stadium sosa': make('human_sci_fi_soldiers_03', { bodyType: 5, bodySize: 70, muscle: 88, skinColor: '#5e3e2e', hairColor: '#0a0606' }),
  'empire edge':      make('human_apocalypse_outlaws_08', { bodyType: 8, bodySize: 65, muscle: 82, skinColor: '#8a6a52', hairColor: '#1a0e08' }),
  'six king':         make('human_fantasy_knights_01',  { bodyType: 5,  bodySize: 82, muscle: 95, skinColor: '#7a513e', hairColor: '#0a0606', outfitColors: { '10TORS': '#3a0a0a', '17HIPS': '#3a0a0a', '11AUPL': '#3a0a0a' } }),
};

// ── Quick Play bot personas (BOT_POOLS in MatchupScreen) ──────────
const QUICK_PLAY_BOTS: Record<string, CharacterState> = {
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
 * etc.) to an AMG CharacterState. Falls back to BOT_MEDIUM for unknown keys.
 */
export function getNpcCustomization(key: string | null | undefined): CharacterState {
  if (!key) return BOT_MEDIUM;
  const k = key.toLowerCase();

  if (CAREER_NPCS[k]) return CAREER_NPCS[k];
  if (QUICK_PLAY_BOTS[k]) return QUICK_PLAY_BOTS[k];

  if (k.includes('easy'))   return BOT_EASY;
  if (k.includes('medium')) return BOT_MEDIUM;
  if (k.includes('hard'))   return BOT_HARD;
  if (k.includes('legend') || k.includes('expert')) return BOT_LEGEND;

  if (k.startsWith('lvl')) {
    const n = parseInt(k.replace('lvl', ''), 10);
    if (!isNaN(n)) {
      if (n >= 25) return BOT_LEGEND;
      if (n >= 17) return BOT_HARD;
      if (n >= 9)  return BOT_MEDIUM;
      return BOT_EASY;
    }
  }

  return BOT_MEDIUM;
}

// ── Playable roster characters (bones, pixel, luna, tank) ────────

const ROSTER_BONES: CharacterState = make('skeleton_fantasy_skeletons_01', {
  bodyType: 10, bodySize: 45, muscle: 55,
  skinColor: '#e8e4d0', hairColor: '#1a1a1a',
});

const ROSTER_PIXEL: CharacterState = make('human_sci_fi_civilians_03', {
  bodyType: 55, bodySize: 45, muscle: 50,
  skinColor: '#d4a890', hairColor: '#2a80e0',
  outfitColors: { '10TORS': '#3a50c9', '18LEGL': '#1a1a30' },
});

const ROSTER_LUNA: CharacterState = make('elves_elven_warriors_02', {
  bodyType: 88, bodySize: 40, muscle: 55,
  skinColor: '#f0d4b8', hairColor: '#c0a060',
  outfitColors: { '10TORS': '#3a5e6e', '11AUPL': '#5e8a9e' },
});

const ROSTER_TANK: CharacterState = make('human_viking_warriors_03', {
  bodyType: 5, bodySize: 80, muscle: 95,
  skinColor: '#a47e58', hairColor: '#2e1e14',
  outfitColors: { '10TORS': '#6e4a1a', '17HIPS': '#3a1a0a' },
});

const ROSTER_MAP: Record<string, CharacterState> = {
  bones: ROSTER_BONES,
  pixel: ROSTER_PIXEL,
  luna:  ROSTER_LUNA,
  tank:  ROSTER_TANK,
};

/**
 * Resolve a roster character ID ('bones', 'pixel', 'luna', 'tank') to its
 * AMG CharacterState. Returns null for the default/player character (caller
 * should fall back to the player's own amgCharacter).
 */
export function getRosterCustomization(characterId: string): CharacterState | null {
  return ROSTER_MAP[characterId] ?? null;
}
