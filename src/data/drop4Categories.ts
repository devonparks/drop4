// ═══════════════════════════════════════════════════════════════════════
// drop4Categories — Drop4's registry for the shared CustomizeHub.
//
// Tells the engine what 4 category cards to show on the Customize hub
// AND the 3-tier nav structure for KITS (the wearable umbrella). Other
// games (TTT / RPS+ / Chess) ship their own registry with the same
// shape but different cards (e.g. PADDLES for paddle games).
//
// HUB CARDS — order = render order on the right side of the hub:
//   · KITS    — every 3D wearable (Style / Outfits / Addons / Collection)
//   · EMOTES  — animation/celebration picker
//   · PIECES  — 2D Drop4-specific game pieces
//   · BOARDS  — 2D Drop4-specific game boards
//
// KITS TIERS — page-based drill-down nav inside the KITS card.
// As of 2026-05-23 KITS IS the character editor — the standalone
// AmgCreator route was deleted and species + skin tone + body sliders
// live inline so the player never leaves the screen.
//
// Restructured 2026-05-23-pm to 4 cleaner top-level tabs (was a single
// STYLE umbrella that buried body/skin editing). Each tier-1 tab
// drills into its own sub-list — only one column visible on the left
// at a time so the character preview gets full center space.
//
//   Tier 1 (page 1)   Tier 2 (page 2)
//   HAIR              Hair / Beard / Brows
//   BODY              Species / Skin / Shape
//   OUTFITS           Tops / Pants / Shoes
//   ADDONS            Hats / Face / Back / Belt / Armor
//
// Inline-editor subs (no part grid — render their own UI):
//   · species  — 5-tile species picker
//   · skin     — 12-swatch skin tone picker
//   · sliders  — feminine/weight/muscle sliders + body presets
//
// Slot-mapped subs (filter manifest by these Synty slot codes):
//   · hairstyle    → ['Hair']
//   · beard        → ['FacialHair']
//   · brows        → ['EyebrowLeft', 'EyebrowRight']
//   · tops / pants / shoes / hats →
//     DEFAULT_SLOT_BUCKETS lookup by sub id
//   · face / back / belt / armor →
//     KITS_SUB_SLOTS explicit slot lists
//
// OWNED tier was dropped — players browse owned items via per-bucket
// owned-first sort, and the global "all-owned" view wasn't pulling its
// weight in the navigation.
// ═══════════════════════════════════════════════════════════════════════

import type { TierConfig } from '@amg/cosmetic-ui';
import type { ImageSourcePropType } from 'react-native';

/** Hub-level card shown on the right side of CustomizeHub. */
export interface Drop4HubCategory {
  id: 'kits' | 'emotes' | 'pieces' | 'boards';
  label: string;
  icon: ImageSourcePropType;
  accent: string;
}

export const DROP4_HUB_CATEGORIES: Drop4HubCategory[] = [
  {
    id: 'kits',
    label: 'Kits',
    icon: require('../assets/images/ui/cat-clothes.png'),
    accent: '#ff8c00',
  },
  {
    id: 'emotes',
    label: 'Emotes',
    icon: require('../assets/images/ui/cat-emotes.png'),
    accent: '#c997e7',
  },
  {
    id: 'pieces',
    label: 'Pieces',
    icon: require('../assets/images/ui/cat-pieces.png'),
    accent: '#e63946',
  },
  {
    id: 'boards',
    label: 'Boards',
    icon: require('../assets/images/ui/cat-boards.png'),
    accent: '#3a78d4',
  },
];

/** Internal — the union of Tier-2 IDs the KITS subscreen recognises.
 *  Inline editors: species / skin / sliders.
 *  Slot-mapped grids: hairstyle / beard / brows / tops / pants / shoes /
 *  hats / face / back / belt / armor. */
export type KitsSubId =
  | 'species'
  | 'skin'
  | 'sliders'
  | 'hairstyle'
  | 'beard'
  | 'brows'
  | 'tops'
  | 'pants'
  | 'shoes'
  | 'hats'
  | 'face'
  | 'back'
  | 'belt'
  | 'armor';

/** Per-sub slot allowlist for the slot-mapped subs. Drop4 chose to
 *  surface Hair / Beard / Brows as separate tier-2 entries instead of
 *  the engine's bundled HAIR / FACE buckets, so the filter map lives
 *  here rather than reaching for DEFAULT_SLOT_BUCKETS for these subs.
 *  Tops / Pants / Shoes / Hats / Accessories still defer to the engine
 *  buckets (they match 1:1). */
export const KITS_SUB_SLOTS: Partial<Record<KitsSubId, string[]>> = {
  hairstyle: ['Hair'],
  beard:     ['FacialHair'],
  brows:     ['EyebrowLeft', 'EyebrowRight'],
  face:      ['AttachmentFace'],
  back:      ['AttachmentBack'],
  belt:      ['AttachmentHipsFront', 'AttachmentHipsBack', 'AttachmentHipsLeft', 'AttachmentHipsRight'],
  armor:     ['AttachmentShoulderLeft', 'AttachmentShoulderRight', 'AttachmentElbowLeft', 'AttachmentElbowRight', 'AttachmentKneeLeft', 'AttachmentKneeRight'],
};

/** Hero-slot mapping for multi-slot buckets. Only the hero slot shows
 *  in the grid; companion slots auto-equip from the same pack+variant. */
export const HERO_SLOTS: Record<string, { hero: string; companions: string[] }> = {
  hairstyle: { hero: 'Hair',           companions: [] },
  beard:     { hero: 'FacialHair',     companions: [] },
  brows:     { hero: 'EyebrowLeft',    companions: ['EyebrowRight'] },
  tops:      { hero: 'Torso',          companions: ['ArmUpperLeft', 'ArmUpperRight', 'ArmLowerLeft', 'ArmLowerRight', 'HandLeft', 'HandRight'] },
  pants:     { hero: 'Hips',           companions: ['LegLeft', 'LegRight'] },
  shoes:     { hero: 'FootRight',      companions: ['FootLeft'] },
  hats:      { hero: 'AttachmentHead', companions: [] },
  face:      { hero: 'AttachmentFace', companions: [] },
  back:      { hero: 'AttachmentBack', companions: [] },
  // belt & armor: no hero — all slots shown in grid independently.
  // Hip items are distinct per-slot (belt ≠ holster ≠ quiver).
  // Armor items span 3 body zones — no single hero makes sense.
};

/** Maps each KitsSubId → the SidekickColorProperty the colorway tints.
 *  Every slot-mapped sub gets a colorway picker; inline-editor subs
 *  (species / skin / sliders) don't appear here.
 *  Hair → 'Hair 01', Beard → 'FacialHair 01', Brows → 'Eyebrow 01'.
 *  FacialHair/Eyebrow fall back to Hair 01 if not explicitly set. */
export const COLORWAY_MATERIAL_MAP: Partial<Record<KitsSubId, string>> = {
  hairstyle:   'Hair 01',
  beard:       'FacialHair 01',   // independent from scalp hair
  brows:       'Eyebrow 01',      // independent from scalp hair
  tops:        'Tops',
  pants:       'Bottoms',
  shoes:       'Shoes',
  hats:        'Hat',
  face:        'Hat',   // all attachments share Hat tint channel
  back:        'Hat',
  belt:        'Hat',
  armor:       'Hat',
};

/** Which preset color (primary / secondary / tertiary) to apply per
 *  material property. Coordinated so a single colorway pick on different
 *  slots produces a cohesive outfit. */
export function colorwayColorForSlot(
  slot: string,
  preset: { primary: string; secondary: string; tertiary: string },
): string {
  if (slot === 'Bottoms') return preset.secondary;
  if (slot === 'Shoes')   return preset.tertiary;
  return preset.primary;   // Tops, Hair 01, Hat, etc. all use primary
}

export const KITS_TIERS: TierConfig[] = [
  {
    id: 'hair',
    label: 'Hair',
    glyph: '\u{2702}\u{FE0F}',
    accent: '#e07a5f',
    cameraPreset: 'face',
    subcategories: [
      { id: 'hairstyle' satisfies KitsSubId, label: 'Hair',  glyph: '\u{1F488}', cameraPreset: 'face' },
      { id: 'beard'     satisfies KitsSubId, label: 'Beard', glyph: '\u{1F9D4}', cameraPreset: 'face' },
      { id: 'brows'     satisfies KitsSubId, label: 'Brows', glyph: '\u{1F441}', cameraPreset: 'face' },
    ],
  },
  {
    id: 'body',
    label: 'Body',
    glyph: '\u{1F9EC}',
    accent: '#3eb489',
    cameraPreset: 'body',
    subcategories: [
      { id: 'species' satisfies KitsSubId, label: 'Species', glyph: '\u{1F9DD}', cameraPreset: 'body' },
      { id: 'skin'    satisfies KitsSubId, label: 'Skin',    glyph: '\u{1F3A8}', cameraPreset: 'face' },
      { id: 'sliders' satisfies KitsSubId, label: 'Shape',   glyph: '\u{1F4CF}', cameraPreset: 'body' },
    ],
  },
  {
    id: 'outfits',
    label: 'Outfits',
    glyph: '\u{1F455}',
    accent: '#ffb347',
    cameraPreset: 'body',
    subcategories: [
      { id: 'tops'  satisfies KitsSubId, label: 'Tops',  glyph: '\u{1F455}' },
      { id: 'pants' satisfies KitsSubId, label: 'Pants', glyph: '\u{1F456}' },
      { id: 'shoes' satisfies KitsSubId, label: 'Shoes', glyph: '\u{1F45F}' },
    ],
  },
  {
    id: 'addons',
    label: 'Addons',
    glyph: '\u{1F3A9}',
    accent: '#f1c40f',
    cameraPreset: 'body',
    subcategories: [
      { id: 'hats'  satisfies KitsSubId, label: 'Hats',      glyph: '\u{1F9E2}',      cameraPreset: 'face' },
      { id: 'face'  satisfies KitsSubId, label: 'Face',      glyph: '\u{1F576}\u{FE0F}', cameraPreset: 'face' },
      { id: 'back'  satisfies KitsSubId, label: 'Back',      glyph: '\u{1F392}' },
      { id: 'belt'  satisfies KitsSubId, label: 'Belt',      glyph: '\u{1F5E1}\u{FE0F}' },
      { id: 'armor' satisfies KitsSubId, label: 'Armor',     glyph: '\u{1F6E1}\u{FE0F}' },
    ],
  },
];
