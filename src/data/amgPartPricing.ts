// ═══════════════════════════════════════════════════════════════════════
// amgPartPricing.ts — GTA-meets-Sims part pricing tiers
//
// Every Sidekick part has a stable name like `SK_MDRN_CIVL_01_10TORS_HU01`.
// We derive a price from the pack prefix (the 4-letter segment after SK_):
//   * BASE (human base head/hair)       → free starter, always owned
//   * MDRN_CIVL (modern civilians)      → 100c   common
//   * SCFI_CIVL, MDRN_CASH, MDRN_POLC   → 250c   uncommon
//   * MDRN_FIGT, GOBL_FIGT, ELVS_WARR…  → 500c   rare
//   * SAMR_WARR, APOC_OUTL, ZOMB_*      → 1000c  epic
//   * Anything else                     → 500c   fallback rare
//
// The tier also drives the card border / UI rarity badge so the shop
// can show "COMMON 100c" vs "EPIC 1000c" without each call site
// hardcoding the same logic.
//
// This table is intentionally rough — Devon can tune individual packs
// later by adding explicit entries to PACK_PRICE_OVERRIDES.
// ═══════════════════════════════════════════════════════════════════════

export type PartRarity = 'starter' | 'common' | 'uncommon' | 'rare' | 'epic';

export interface PartPriceInfo {
  /** Coin cost. 0 = starter / always owned. */
  price: number;
  /** Rarity tier — drives UI color + badge copy. */
  rarity: PartRarity;
  /** The pack prefix we detected (e.g. 'MDRN_CIVL'). Useful for grouping
   *  parts in the shop by pack and picking a pack icon/name. */
  pack: string;
}

/** Parts that every new player owns for free, so the creator has something
 *  to put on a fresh avatar even before the player spends a single coin. */
export const STARTER_PACKS: readonly string[] = [
  'HUMN_BASE', 'GOBL_BASE', 'ELVS_BASE', 'SKEL_BASE', 'ZOMB_BASE', // base heads/hair per species
  'MDRN_CIVL', // the default outfit pack — jeans + tee, 12 variants
];

/** Explicit price overrides for specific packs. If a pack isn't listed
 *  here we fall back to the rarity table below. Use this for premium
 *  packs that deserve a different price point than their tier default. */
export const PACK_PRICE_OVERRIDES: Record<string, { price: number; rarity: PartRarity }> = {
  'HUMN_BASE': { price: 0,    rarity: 'starter' },
  'GOBL_BASE': { price: 0,    rarity: 'starter' },
  'ELVS_BASE': { price: 0,    rarity: 'starter' },
  'SKEL_BASE': { price: 0,    rarity: 'starter' },
  'ZOMB_BASE': { price: 0,    rarity: 'starter' },
  'MDRN_CIVL': { price: 0,    rarity: 'starter' }, // default outfit — free
  'MDRN_CASH': { price: 150,  rarity: 'common'   },
  'MDRN_POLC': { price: 250,  rarity: 'uncommon' },
  'SCFI_CIVL': { price: 300,  rarity: 'uncommon' },
  'MDRN_FIGT': { price: 400,  rarity: 'rare'     },
  'GOBL_FIGT': { price: 450,  rarity: 'rare'     },
  'ELVS_WARR': { price: 500,  rarity: 'rare'     },
  'SAMR_WARR': { price: 800,  rarity: 'epic'     },
  'APOC_OUTL': { price: 1000, rarity: 'epic'     },
};

/** Extract the pack prefix from a Sidekick part name. Sidekick names look
 *  like `SK_<PACK>_<variant>_<slotCode>_<speciesTail>`, where <PACK> is
 *  a 9-char 2-group token (e.g. 'MDRN_CIVL'). The regex pulls the first
 *  two underscore-separated 4-letter groups after 'SK_'. */
export function packPrefixFromPartName(name: string): string {
  const m = name.match(/^SK_([A-Z]{4})_([A-Z]{4})_/);
  if (!m) return 'UNKN';
  return `${m[1]}_${m[2]}`;
}

const RARITY_DEFAULTS: Record<PartRarity, number> = {
  starter: 0,
  common: 100,
  uncommon: 250,
  rare: 500,
  epic: 1000,
};

/** Guess a rarity from the pack prefix when no explicit override exists.
 *  Keywords: FIGT/WARR → rare, SAMR/APOC/ZOMB → epic, everything else → common. */
function inferRarity(pack: string): PartRarity {
  if (/SAMR|APOC|ZOMB/.test(pack)) return 'epic';
  if (/FIGT|WARR|KNIG|MAGE|DRAG/.test(pack)) return 'rare';
  if (/POLC|CASH|SCFI|SPCE/.test(pack)) return 'uncommon';
  return 'common';
}

/** Resolve price + rarity for a part name. Pure function — safe to call
 *  from hot paths like a grid render. */
export function getPartPrice(partName: string): PartPriceInfo {
  const pack = packPrefixFromPartName(partName);
  const override = PACK_PRICE_OVERRIDES[pack];
  if (override) return { ...override, pack };
  const rarity = inferRarity(pack);
  return { price: RARITY_DEFAULTS[rarity], rarity, pack };
}

/** Every starter part name we know of, computed once at module load.
 *  Called from characterStore to seed `ownedAmgParts` on first launch
 *  without the shop mechanic gating access to a basic avatar. */
export function isStarterPack(pack: string): boolean {
  return STARTER_PACKS.includes(pack);
}

/** Hex colors per rarity tier — the shop + creator lock overlay reuse
 *  these for border/glow so the whole economy reads at a glance. */
export const RARITY_COLORS: Record<PartRarity, string> = {
  starter:  '#6a6a72', // muted grey — free, not flashy
  common:   '#4a9a4a', // green
  uncommon: '#3a78d4', // blue
  rare:     '#9a4ad4', // purple
  epic:     '#d49a3a', // gold
};

/** Display label per rarity — shown on shop cards + creator lock chips. */
export const RARITY_LABELS: Record<PartRarity, string> = {
  starter:  'FREE',
  common:   'COMMON',
  uncommon: 'UNCOMMON',
  rare:     'RARE',
  epic:     'EPIC',
};
