/**
 * Outfit Colorways — Per-outfit preset color variants.
 *
 * Each outfit (full pack) can be worn in multiple colorways. A colorway
 * defines the Primary/Secondary/Tertiary material colors for the entire
 * outfit (hoodie, pants, shoes all shift together — like real fashion
 * drops selling coordinated colorways of the same silhouette).
 *
 * The "default" colorway (empty string) is always free when you own the
 * outfit. Named colorways (Miami, Stealth, Lakers, etc.) are separate
 * collectibles unlocked via loot boxes, career rewards, or direct coin
 * purchase.
 *
 * Adding a new preset to COLORWAY_PALETTE automatically generates drop
 * entries for ALL eligible outfits. Adding a new outfit to the registry
 * automatically gets all colorways. A content update can drop 15 new
 * colorways across every outfit in one batch.
 *
 * ~129 human outfits x 30 presets = ~3,870 collectible items.
 */

import { OUTFITS, type OutfitId } from './outfitRegistry';

// ─── Types ────────────────────────────────────────────────────────────

export type ColorwayRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface ColorwayPreset {
  id: string;
  name: string;
  primary: string;   // Tops hex
  secondary: string; // Bottoms hex
  tertiary: string;  // Shoes hex
  rarity: ColorwayRarity;
}

export interface OutfitColorwayItem {
  /** Stable ID: `colorway:${outfitId}:${colorwayId}` */
  id: string;
  outfitId: OutfitId;
  colorwayId: string;
  /** Display name, e.g. "Modern Civilians 03 — Miami" */
  name: string;
  preset: ColorwayPreset;
}

// ─── ID encoding ──────────────────────────────────────────────────────

const COLORWAY_PREFIX = 'colorway';
const SEP = ':';

export function colorwayDropId(outfitId: string, colorwayId: string): string {
  return `${COLORWAY_PREFIX}${SEP}${outfitId}${SEP}${colorwayId}`;
}

export function parseColorwayDropId(id: string): { outfitId: string; colorwayId: string } | null {
  if (!id.startsWith(COLORWAY_PREFIX + SEP)) return null;
  const rest = id.slice(COLORWAY_PREFIX.length + SEP.length);
  const idx = rest.lastIndexOf(SEP);
  if (idx === -1) return null;
  return { outfitId: rest.slice(0, idx), colorwayId: rest.slice(idx + SEP.length) };
}

/** Quick check for colorway-format IDs. */
export function isColorwayDropId(id: string): boolean {
  return id.startsWith(COLORWAY_PREFIX + SEP);
}

// ─── Colorway Palette ─────────────────────────────────────────────────
//
// 30 curated presets across 4 rarity tiers. Each one is a coordinated
// Primary/Secondary/Tertiary color combo that works on any outfit.
// This is the ONLY outfit color system — the old per-part "camo"
// variants were merged into this per-outfit colorway palette.
//
// ~129 human outfits × 30 presets = ~3,870 collectible items.

export const COLORWAY_PALETTE: ColorwayPreset[] = [
  // ── Common (8) — everyday neutrals & basics ──
  { id: 'midnight',  name: 'Midnight',     primary: '#1a1a2e', secondary: '#16213e', tertiary: '#0f172a', rarity: 'common' },
  { id: 'stealth',   name: 'Stealth',      primary: '#1a1a1a', secondary: '#333333', tertiary: '#0d0d0d', rarity: 'common' },
  { id: 'cream',     name: 'Cream',        primary: '#f5f0e8', secondary: '#e8dcc8', tertiary: '#d4c5a9', rarity: 'common' },
  { id: 'forest',    name: 'Forest',       primary: '#1b4332', secondary: '#2d6a4f', tertiary: '#40916c', rarity: 'common' },
  { id: 'slate',     name: 'Slate',        primary: '#4a5568', secondary: '#718096', tertiary: '#2d3748', rarity: 'common' },
  { id: 'sand',      name: 'Sand',         primary: '#d2b48c', secondary: '#c4a67a', tertiary: '#b8976a', rarity: 'common' },
  { id: 'espresso',  name: 'Espresso',     primary: '#5d4037', secondary: '#795548', tertiary: '#3e2723', rarity: 'common' },
  { id: 'olive',     name: 'Olive',        primary: '#556b2f', secondary: '#6b8e23', tertiary: '#3b4a1f', rarity: 'common' },

  // ── Rare (8) — bold colors & tones ──
  { id: 'crimson',   name: 'Crimson',      primary: '#9b1b30', secondary: '#c1292e', tertiary: '#e63946', rarity: 'rare' },
  { id: 'ocean',     name: 'Ocean',        primary: '#023e8a', secondary: '#0077b6', tertiary: '#0096c7', rarity: 'rare' },
  { id: 'sunset',    name: 'Sunset',       primary: '#ff6b35', secondary: '#f7c948', tertiary: '#f9844a', rarity: 'rare' },
  { id: 'royal',     name: 'Royal',        primary: '#5b21b6', secondary: '#7c3aed', tertiary: '#4c1d95', rarity: 'rare' },
  { id: 'burgundy',  name: 'Burgundy',     primary: '#800020', secondary: '#a0334e', tertiary: '#5a0016', rarity: 'rare' },
  { id: 'teal',      name: 'Teal',         primary: '#008080', secondary: '#00a8a8', tertiary: '#006060', rarity: 'rare' },
  { id: 'coral',     name: 'Coral',        primary: '#ff6f61', secondary: '#ff9a8b', tertiary: '#e55b50', rarity: 'rare' },
  { id: 'lavender',  name: 'Lavender',     primary: '#9b59b6', secondary: '#bb85d0', tertiary: '#7d3f9e', rarity: 'rare' },

  // ── Epic (8) — statement pieces & duo-tones ──
  { id: 'miami',     name: 'Miami',        primary: '#e91e63', secondary: '#ffffff', tertiary: '#00bcd4', rarity: 'epic' },
  { id: 'lakers',    name: 'Lakers',       primary: '#552583', secondary: '#fdb927', tertiary: '#ffffff', rarity: 'epic' },
  { id: 'neon',      name: 'Neon',         primary: '#39ff14', secondary: '#ff073a', tertiary: '#0ff0fc', rarity: 'epic' },
  { id: 'arctic',    name: 'Arctic',       primary: '#caf0f8', secondary: '#90e0ef', tertiary: '#48cae4', rarity: 'epic' },
  { id: 'varsity',   name: 'Varsity',      primary: '#1a3060', secondary: '#e67e22', tertiary: '#1a3060', rarity: 'epic' },
  { id: 'flamingo',  name: 'Flamingo',     primary: '#ff69b4', secondary: '#fff0f5', tertiary: '#ff1493', rarity: 'epic' },
  { id: 'toxic',     name: 'Toxic',        primary: '#39ff14', secondary: '#1a1a1a', tertiary: '#00ff41', rarity: 'epic' },
  { id: 'frozen',    name: 'Frozen',       primary: '#a0d2db', secondary: '#e0f7fa', tertiary: '#80cbc4', rarity: 'epic' },

  // ── Legendary (6) — ultra-flex ──
  { id: 'gold_rush', name: 'Gold Rush',    primary: '#ffd700', secondary: '#daa520', tertiary: '#b8860b', rarity: 'legendary' },
  { id: 'shadow',    name: 'Shadow',       primary: '#0d0d0d', secondary: '#ff073a', tertiary: '#0d0d0d', rarity: 'legendary' },
  { id: 'holo',      name: 'Holographic',  primary: '#c084fc', secondary: '#67e8f9', tertiary: '#fbbf24', rarity: 'legendary' },
  { id: 'chrome',    name: 'Chrome',       primary: '#c0c0c0', secondary: '#e8e8e8', tertiary: '#a0a0a0', rarity: 'legendary' },
  { id: 'obsidian',  name: 'Obsidian',     primary: '#0d0d0d', secondary: '#4a0080', tertiary: '#1a0033', rarity: 'legendary' },
  { id: 'diamond',   name: 'Diamond',      primary: '#b9f2ff', secondary: '#e0f7fa', tertiary: '#ffffff', rarity: 'legendary' },
];

/** Quick lookup by colorway id. */
export const COLORWAY_BY_ID: Record<string, ColorwayPreset> = {};
for (const c of COLORWAY_PALETTE) COLORWAY_BY_ID[c.id] = c;

// ─── Eligible outfits ─────────────────────────────────────────────────
// Only human outfits get colorways in v1. Skeleton/zombie/goblin/elf
// outfits have unique model-specific textures where single-color tinting
// doesn't represent the art direction well.

function isEligibleForColorways(outfitId: string): boolean {
  const meta = OUTFITS[outfitId];
  return !!meta && meta.species === 'human';
}

// ─── Generator ────────────────────────────────────────────────────────

let _cachedItems: OutfitColorwayItem[] | null = null;

/** All outfit x colorway combinations as droppable items. Cached after
 *  first call. ~129 human outfits x 15 presets = ~1,935 items. */
export function getAllOutfitColorwayItems(): OutfitColorwayItem[] {
  if (_cachedItems) return _cachedItems;
  const items: OutfitColorwayItem[] = [];
  for (const outfitId of Object.keys(OUTFITS)) {
    if (!isEligibleForColorways(outfitId)) continue;
    const outfit = OUTFITS[outfitId];
    for (const preset of COLORWAY_PALETTE) {
      items.push({
        id: colorwayDropId(outfitId, preset.id),
        outfitId,
        colorwayId: preset.id,
        name: `${outfit.name} — ${preset.name}`,
        preset,
      });
    }
  }
  _cachedItems = items;
  return items;
}

/** Colorways available for a specific outfit. */
export function getColorwaysForOutfit(outfitId: string): OutfitColorwayItem[] {
  return getAllOutfitColorwayItems().filter(c => c.outfitId === outfitId);
}

/** Total number of outfit colorway collectibles in the game. */
export function getOutfitColorwayCount(): number {
  return getAllOutfitColorwayItems().length;
}
