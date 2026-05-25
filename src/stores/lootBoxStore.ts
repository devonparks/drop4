/**
 * Loot Box Store — Drop4's full-economy gacha layer.
 *
 * Pivot 2026-05-03: every cosmetic in the game is obtained primarily from
 * loot boxes. Direct purchase of individual cosmetics is killed. Players
 * still spend coins/gems to BUY boxes (and to convert SHARDS → specific
 * items in the Shard Shop), but no individual cosmetic is buyable from
 * a sub-tab anymore.
 *
 * What lives here:
 *  - Box catalog: tiered boxes (Bronze/Silver/Gold/Diamond) + themed
 *    boxes (Outfits/Pets/Boards/Pieces/Emotes) + a deterministic weekly
 *    Featured box.
 *  - Drop pool: sourced from the canonical data registries
 *    (BOARD_THEMES / PIECE_THEMES / DROP_EFFECTS / WIN_ANIMATIONS /
 *    BOARD_ACCESSORIES / OUTFIT_SHOP_ITEMS / PETS / HUMAN_EMOTES).
 *    Adding a new board/piece/etc. to those registries automatically
 *    flows into the loot pool — single source of truth.
 *  - Shards: 4 buckets (common/rare/epic/legendary) earned from dupes.
 *    Spendable in the Shard Shop to unlock any specific item.
 *  - Pity timer: per-tier counter that guarantees an Epic by box 10 and
 *    a Legendary by box 30 within a tier. Resets on the rarity it
 *    triggered. Standard mobile-gacha protection against bad streaks.
 *  - Dupe handling: when the rolled item is already owned, give the
 *    player shards + a small coin refund instead of a wasted drop.
 *
 * What does NOT live here:
 *  - The reveal animation / "open" UX (LootBoxScreen owns that)
 *  - The achievement → specific-item unlock path (a future store layer
 *    grants a fixed `LootBoxItem` directly via `grantItem`)
 *  - Tattoos (v1.1)
 */

import { create } from 'zustand';
import { saveState, loadState } from '../services/storage';
import { useShopStore } from './shopStore';
import { useCharacterStore } from './characterStore';
import { usePetStore } from './petStore';
import {
  BOARD_THEMES,
  PIECE_THEMES,
  DROP_EFFECTS,
  WIN_ANIMATIONS,
  BOARD_ACCESSORIES,
  type ShopItem,
} from '../data/shopCatalog';
import { OUTFIT_SHOP_ITEMS } from '../data/cosmeticsShopCatalog';
import { PETS, type PetMeta, type PetId } from '../data/petRegistry';
import { HUMAN_EMOTES, type AnimationMeta } from '../data/animationRegistry';
// Variant id encoding + lootbox economy constants live in the engine
// — every AMG game encodes variant tuples the same way and runs the
// same dupe/shard math so cross-game cloud sync has a single source
// of truth.
import {
  variantDropId as engineVariantDropId,
  parseVariantDropId as engineParseVariantDropId,
  VARIANT_ID_SEP,
  SHARD_UNLOCK_COST as ENGINE_SHARD_UNLOCK_COST,
  DUPE_COIN_REFUND as ENGINE_DUPE_COIN_REFUND,
  DUPE_SHARDS_AWARDED as ENGINE_DUPE_SHARDS_AWARDED,
} from '@amg/cosmetic-runtime';
import { ALL_TINT_COLORS, TINT_SLOT_LABEL, type TintColor } from '../data/colorRegistry';

// ─── Rarity ────────────────────────────────────────────────────────────
//
// Source registries use a 7-tier rarity system (common/uncommon/rare/epic/
// legendary/mythic/darkmatter). For loot rolls we collapse to 4 tiers.
// Darkmatter is excluded entirely — those are earn-only ascendant unlocks
// and must not appear in any drop table.

export type LootBoxRarity = 'common' | 'rare' | 'epic' | 'legendary';

const RARITY_ORDER: LootBoxRarity[] = ['common', 'rare', 'epic', 'legendary'];

/** Map a source-registry rarity string into the 4-tier loot rarity. */
function normalizeRarity(r: string | undefined): LootBoxRarity | null {
  switch (r) {
    case 'common':
    case 'uncommon':
    case 'starter':
      return 'common';
    case 'rare':
      return 'rare';
    case 'epic':
      return 'epic';
    case 'legendary':
    case 'mythic':
      return 'legendary';
    case 'darkmatter':
    default:
      return null; // excluded from drops
  }
}

// ─── Loot item types ───────────────────────────────────────────────────

export type LootItemType =
  | 'board' | 'pieces' | 'dropFx' | 'winFx' | 'frame'
  | 'outfit' | 'pet' | 'emote'
  | 'partVariant'   // Path A variants (2026-05-04) — (partName, variantId) tuple drops
  | 'tintColor'     // Unlockable material tint colors (2026-05-24) — per-slot color unlocks
  | 'coins' | 'gems';

export interface LootBoxItem {
  /** Stable id used to look up + persist. For cosmetics this matches the
   *  source registry id. For coin/gem rewards it's a synthetic id like
   *  'coins_500'. */
  id: string;
  name: string;
  type: LootItemType;
  rarity: LootBoxRarity;
  /** Source-registry rarity tag preserved for display. The 4-tier
   *  `rarity` above collapses 'uncommon' → 'common' and 'mythic' →
   *  'legendary' for shard-cost accounting, but the reveal screen and
   *  the cards in CategoryBrowser show the granular tag (e.g. an
   *  Uncommon piece reveals as "UNCOMMON", not "COMMON"). Falls back
   *  to `rarity` when not set. */
  displayRarity?: string;
  /** Currency value for coin/gem drops. Cosmetics ignore this. */
  value?: number;
  /** Cosmetic category surface — "boards", "outfits", etc. — used by
   *  themed boxes to bias toward a category and by the dupe path to
   *  call the right grant action. */
  category: LootCategory;
}

/** Cosmetic surface categories. "currency" is a synthetic category for
 *  filler coin/gem drops so all items share the same shape. */
export type LootCategory =
  | 'boards' | 'pieces' | 'effects' | 'wins' | 'frames'
  | 'outfits' | 'pets' | 'emotes' | 'currency';

// ─── Box catalog ───────────────────────────────────────────────────────

export type LootBoxTier = 'bronze' | 'silver' | 'gold' | 'diamond' | 'featured';

export interface LootBox {
  id: string;
  name: string;
  /** Bronze/Silver/Gold/Diamond use the rendered LootChest. Themed boxes
   *  use the same component but visually tinted by `themedAccent`. */
  tier: LootBoxTier;
  /** Coin cost to buy. 0 = free (e.g. daily Bronze). */
  cost: number;
  /** When set, the rolled item type is biased toward this category.
   *  Drops still respect the tier's rarity table; only the category mix
   *  shifts. Undefined = generic box (rolls from full pool). */
  themedCategory?: LootCategory;
  /** Hex accent for themed cards (matches the category's vibe). */
  themedAccent?: string;
  /** Short blurb shown on the box card. */
  blurb: string;
}

/** Tiered + themed catalog. Order matters — the LootBoxScreen renders
 *  this list in two sections (Tiered first, then Themed). */
export const LOOT_BOXES: LootBox[] = [
  // Tiered (generic pool, rarity-biased)
  { id: 'bronze_box',  name: 'Bronze Box',  tier: 'bronze',  cost: 0,    blurb: 'Daily free box. Mostly common.' },
  { id: 'silver_box',  name: 'Silver Box',  tier: 'silver',  cost: 100,  blurb: 'Better odds for rare.' },
  { id: 'gold_box',    name: 'Gold Box',    tier: 'gold',    cost: 500,  blurb: 'Strong epic chance.' },
  { id: 'diamond_box', name: 'Diamond Box', tier: 'diamond', cost: 2000, blurb: 'Legendary-tier odds.' },

  // Themed (category-biased, rarity-bias same as Gold). Accent colors
  // mirror the Customize loadout cell CATEGORY_ACCENT map so the
  // player builds one consistent visual language across screens.
  { id: 'outfits_box', name: 'Outfits Box', tier: 'gold', cost: 750, themedCategory: 'outfits', themedAccent: '#ffb347', blurb: 'Bias toward outfits + characters.' },
  { id: 'pets_box',    name: 'Pets Box',    tier: 'gold', cost: 750, themedCategory: 'pets',    themedAccent: '#3eb489', blurb: 'Bias toward dog companions.' },
  { id: 'boards_box',  name: 'Boards Box',  tier: 'gold', cost: 750, themedCategory: 'boards',  themedAccent: '#3a78d4', blurb: 'Bias toward board skins.' },
  { id: 'pieces_box',  name: 'Pieces Box',  tier: 'gold', cost: 750, themedCategory: 'pieces',  themedAccent: '#e63946', blurb: 'Bias toward piece skins.' },
  { id: 'emotes_box',  name: 'Emotes Box',  tier: 'gold', cost: 750, themedCategory: 'emotes',  themedAccent: '#c997e7', blurb: 'Bias toward emotes + dances.' },

  // Featured (weekly hand-curated rotation, see featuredItemsForWeek)
  { id: 'featured_box', name: 'Featured Box', tier: 'featured', cost: 1500, themedAccent: '#f1c40f', blurb: 'This week’s hand-picked drops.' },
];

// ─── Drop tables ───────────────────────────────────────────────────────
//
// Per-tier rarity weights. Themed boxes inherit the Gold table by default
// but bias the CATEGORY pick toward their `themedCategory` after the
// rarity is rolled.

type RarityWeights = Record<LootBoxRarity, number>;

/** Per-tier drop rates. Exposed so the LootBoxScreen's transparency
 *  panel can render the real numbers per tier instead of a single
 *  static average across all boxes. */
export const TIER_RARITY_WEIGHTS: Record<LootBoxTier, RarityWeights> = {
  bronze:   { common: 70, rare: 25, epic: 4,  legendary: 1  },
  silver:   { common: 50, rare: 35, epic: 12, legendary: 3  },
  gold:     { common: 30, rare: 40, epic: 22, legendary: 8  },
  diamond:  { common: 10, rare: 30, epic: 40, legendary: 20 },
  featured: { common: 20, rare: 40, epic: 30, legendary: 10 },
};

// Within a roll, after rarity is locked, this is how often each category
// appears in a generic (non-themed) box. Currency is the filler so a roll
// that finds zero matching items in pool falls back gracefully.
const GENERIC_CATEGORY_WEIGHTS: Record<LootCategory, number> = {
  boards: 14,
  pieces: 14,
  effects: 8,
  wins: 8,
  frames: 6,
  outfits: 25,
  pets: 12,
  emotes: 12,
  currency: 1, // small chance of bonus coin even from a non-currency roll
};

/** Themed boxes bump their target category to ~60% of the category roll
 *  while keeping all others non-zero so you can still get pleasant
 *  surprises. */
function themedCategoryWeights(target: LootCategory): Record<LootCategory, number> {
  const w: Record<LootCategory, number> = { ...GENERIC_CATEGORY_WEIGHTS };
  // Halve everything else, then 6x the target.
  for (const k of Object.keys(w) as LootCategory[]) w[k] = Math.max(1, Math.round(w[k] * 0.5));
  w[target] = 60;
  return w;
}

// ─── Item pool ─────────────────────────────────────────────────────────
//
// Built once at module load from the canonical data registries. Every
// item is bucketed by (category, rarity) so the roller can pick by both
// dimensions in O(1).

interface PoolBucket {
  /** Items ready to drop, segmented by category × rarity. */
  byCatRarity: Record<LootCategory, Record<LootBoxRarity, LootBoxItem[]>>;
  /** Flat lookup id → item. Used by the Shard Shop and dupe path. */
  byId: Record<string, LootBoxItem>;
}

function emptyByCatRarity(): PoolBucket['byCatRarity'] {
  const cats: LootCategory[] = ['boards', 'pieces', 'effects', 'wins', 'frames', 'outfits', 'pets', 'emotes', 'currency'];
  const out: PoolBucket['byCatRarity'] = {} as PoolBucket['byCatRarity'];
  for (const c of cats) {
    out[c] = { common: [], rare: [], epic: [], legendary: [] };
  }
  return out;
}

function shopItemToLoot(item: ShopItem, type: LootItemType, category: LootCategory): LootBoxItem | null {
  const rarity = normalizeRarity(item.rarity);
  if (!rarity) return null;
  // Preserve the source rarity (which can be 'uncommon' / 'mythic' /
  // etc.) so the reveal screen + dupe banner display the same tag the
  // player saw in CategoryBrowser. The 4-tier `rarity` is internal
  // accounting only.
  return { id: item.id, name: item.name, type, rarity, category, displayRarity: item.rarity };
}

function petToLoot(p: PetMeta): LootBoxItem | null {
  const rarity = normalizeRarity(p.rarity);
  if (!rarity) return null;
  return { id: p.id, name: p.name, type: 'pet', rarity, category: 'pets', displayRarity: p.rarity };
}

function emoteToLoot(e: AnimationMeta): LootBoxItem {
  // Emotes don't have a registry rarity; derive from price bands.
  const price = e.price ?? 0;
  let rarity: LootBoxRarity = 'common';
  if (price >= 900) rarity = 'epic';
  else if (price >= 400) rarity = 'rare';
  return { id: e.id, name: e.name, type: 'emote', rarity, category: 'emotes' };
}

// ─── Part-variant drop helpers (Path A, 2026-05-04) ────────────────
//
// The encoding moved to @amg/cosmetic-runtime so every AMG game speaks
// the same variant id format — critical for cross-game cloud sync of
// variant ownership keys. Internal callers below use these aliases;
// no external Drop4 file imports them, so they're not re-exported.

const variantDropId = engineVariantDropId;
const parseVariantDropId = engineParseVariantDropId;

/** Mint a LootBoxItem for a (partName, variantId) tuple at the given
 *  rarity. Used by achievement grants and the future colorway-manifest
 *  pool seeder once Unity finishes the Path A render batch. */
export function mintPartVariantItem(
  partName: string,
  variantId: string,
  rarity: LootBoxRarity,
  displayName?: string,
): LootBoxItem {
  return {
    id: variantDropId(partName, variantId),
    name: displayName ?? `${partName}${variantId ? ` · ${variantId}` : ''}`,
    type: 'partVariant',
    rarity,
    category: 'outfits', // variant drops bias toward the outfit themed box
  };
}

/** Append items to the active drop POOL after module load. Drop4
 *  calls this once at app boot from `seedDrop4Variants` to inject the
 *  variant-tuple drops for outfit packs. Tic Tac Toe will call its
 *  own seeder. The function is idempotent — items already in
 *  POOL.byId by id are skipped so duplicate seed runs are safe.
 *
 *  Why a runtime mutation rather than a re-build: the POOL is
 *  module-level and cached at first import. Pieces of the catalog
 *  (e.g. variant data) arrive after import (manifest fetch, store
 *  hydration). The mutation pattern keeps the existing roll logic
 *  untouched while letting the catalog grow over the app's life. */
export function appendItemsToPool(items: LootBoxItem[]): void {
  let added = 0;
  for (const item of items) {
    if (POOL.byId[item.id]) continue; // dedup against existing pool
    POOL.byId[item.id] = item;
    POOL.byCatRarity[item.category][item.rarity].push(item);
    added++;
  }
  if (added > 0 && typeof __DEV__ !== 'undefined' && __DEV__) {
    // eslint-disable-next-line no-console
    console.log(`[lootBoxStore] appended ${added} items to pool (total ${Object.keys(POOL.byId).length})`);
  }
}

const COIN_FILLERS: LootBoxItem[] = [
  { id: 'coins_50',   name: '50 Coins',   type: 'coins', rarity: 'common',    value: 50,   category: 'currency' },
  { id: 'coins_100',  name: '100 Coins',  type: 'coins', rarity: 'common',    value: 100,  category: 'currency' },
  { id: 'coins_250',  name: '250 Coins',  type: 'coins', rarity: 'common',    value: 250,  category: 'currency' },
  { id: 'coins_500',  name: '500 Coins',  type: 'coins', rarity: 'rare',      value: 500,  category: 'currency' },
  { id: 'coins_1000', name: '1000 Coins', type: 'coins', rarity: 'rare',      value: 1000, category: 'currency' },
  { id: 'coins_2500', name: '2500 Coins', type: 'coins', rarity: 'epic',      value: 2500, category: 'currency' },
  { id: 'coins_5000', name: '5000 Coins', type: 'coins', rarity: 'epic',      value: 5000, category: 'currency' },
  { id: 'gems_5',     name: '5 Gems',     type: 'gems',  rarity: 'rare',      value: 5,    category: 'currency' },
  { id: 'gems_10',    name: '10 Gems',    type: 'gems',  rarity: 'epic',      value: 10,   category: 'currency' },
  { id: 'gems_25',    name: '25 Gems',    type: 'gems',  rarity: 'legendary', value: 25,   category: 'currency' },
];

function buildPool(): PoolBucket {
  const byCatRarity = emptyByCatRarity();
  const byId: Record<string, LootBoxItem> = {};

  function add(item: LootBoxItem | null) {
    if (!item) return;
    // Skip "free" items that every player already has (the registry uses
    // price=0 for these). The drop pool exists to hand out content the
    // player doesn't already own; rolling 'Classic Blue Board' is wasted.
    byCatRarity[item.category][item.rarity].push(item);
    byId[item.id] = item;
  }

  // Free starters are skipped so players don't get a Bronze Box reward
  // of an item they already own at level 1. The exception: currency
  // fillers always populate the currency bucket.
  const skipFree = (item: ShopItem) => (item.price ?? 0) === 0;

  for (const b of BOARD_THEMES) if (!skipFree(b)) add(shopItemToLoot(b, 'board', 'boards'));
  for (const p of PIECE_THEMES) if (!skipFree(p)) add(shopItemToLoot(p, 'pieces', 'pieces'));
  for (const f of DROP_EFFECTS) if (!skipFree(f)) add(shopItemToLoot(f, 'dropFx', 'effects'));
  for (const w of WIN_ANIMATIONS) if (!skipFree(w)) add(shopItemToLoot(w, 'winFx', 'wins'));
  for (const a of BOARD_ACCESSORIES) if (!skipFree(a)) add(shopItemToLoot(a, 'frame', 'frames'));
  for (const o of OUTFIT_SHOP_ITEMS) if (!skipFree(o)) add(shopItemToLoot(o, 'outfit', 'outfits'));
  for (const p of Object.values(PETS)) if (p.price > 0) add(petToLoot(p));
  for (const e of HUMAN_EMOTES) if ((e.price ?? 0) > 0) add(emoteToLoot(e));

  // Tint colors — per-slot unlockable material colors. Starters are
  // free (always owned), so they're excluded from the drop pool.
  for (const tc of ALL_TINT_COLORS) {
    if (tc.starter) continue;
    add({
      id: tc.id,
      name: `${tc.name} (${TINT_SLOT_LABEL[tc.slot]})`,
      type: 'tintColor',
      rarity: tc.rarity as LootBoxRarity,
      category: 'outfits',
    });
  }

  // Currency always fills its bucket regardless of "free" filter.
  for (const c of COIN_FILLERS) {
    byCatRarity.currency[c.rarity].push(c);
    byId[c.id] = c;
  }

  return { byCatRarity, byId };
}

const POOL: PoolBucket = buildPool();

/** Public lookup so other modules (Shard Shop UI, achievement grant) can
 *  resolve an id without re-deriving it. Falls back to a synthesized
 *  partVariant item for ids that match the `partName__variantId`
 *  pattern (so the lootbox can grant manifest-driven variants without
 *  pre-registering every one in the pool builder). */
export function getLootItemById(id: string): LootBoxItem | null {
  const direct = POOL.byId[id];
  if (direct) return direct;
  // Variant id fallback — synthesizes a LootBoxItem on-demand for any
  // (partName, variantId) tuple. Rarity is taken from the base part's
  // shop pricing tier; defaults to common when the part is unknown.
  if (id.includes(VARIANT_ID_SEP)) {
    const { partName, variantId } = parseVariantDropId(id);
    return mintPartVariantItem(partName, variantId, 'common');
  }
  return null;
}

/** Enumerate every droppable item. Used by the Customize tab progress
 *  bars ("you own 12 of 245 lootable items"). Excludes currency. */
export function getAllLootableItems(): LootBoxItem[] {
  return Object.values(POOL.byId).filter((it) => it.category !== 'currency');
}

// ─── Featured rotation (deterministic by week) ─────────────────────────
//
// Picks 10 items that change every Monday at 00:00 UTC. We don't persist
// the picks — the seed is the week index since epoch, so every player
// sees the same curated set without server coordination.

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function weekIndex(date = new Date()): number {
  return Math.floor(date.getTime() / WEEK_MS);
}

// Tiny deterministic PRNG (mulberry32). Pure function of (seed, salt).
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function featuredItemsForWeek(date?: Date): LootBoxItem[] {
  const w = weekIndex(date);
  const r = rng(w);
  const all = getAllLootableItems();
  // Bias the featured pool toward rare+ so the list feels premium.
  const premium = all.filter((it) => it.rarity !== 'common');
  const pool = premium.length >= 20 ? premium : all;
  // Shuffle (Fisher-Yates with deterministic rng) and slice 10.
  const arr = [...pool];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, 10);
}

// ─── Shards & Shard Shop ───────────────────────────────────────────────

type ShardBucket = LootBoxRarity;

/** Cost in shards to directly unlock a specific item, by rarity. */
export const SHARD_UNLOCK_COST = ENGINE_SHARD_UNLOCK_COST;

/** Coin refund granted alongside shards when a dupe is rolled.
 *  Internal-only (no external callers); engine-sourced. */
const DUPE_COIN_REFUND = ENGINE_DUPE_COIN_REFUND;

/** Shards awarded per dupe (in addition to the coin refund).
 *  Internal-only (no external callers); engine-sourced. */
const DUPE_SHARDS_AWARDED = ENGINE_DUPE_SHARDS_AWARDED;

// ─── Pity timers ───────────────────────────────────────────────────────
//
// Per-tier counter tracking the number of opens since the player's last
// Epic+ / Legendary drop. Hits the cap → next roll is forced to the
// pitied rarity. Only "tiered" boxes accumulate; themed/featured share
// the gold counter to avoid people farming a themed cap.

const PITY_TIERS: LootBoxTier[] = ['bronze', 'silver', 'gold', 'diamond', 'featured'];

interface PityCounters {
  /** Boxes opened in this tier since the last EPIC OR HIGHER drop. */
  sinceEpic: Record<LootBoxTier, number>;
  /** Boxes opened in this tier since the last LEGENDARY drop. */
  sinceLegendary: Record<LootBoxTier, number>;
}

const PITY_CAP_EPIC: Record<LootBoxTier, number> = {
  bronze: 25,
  silver: 15,
  gold: 10,
  diamond: 5,
  featured: 8,
};

const PITY_CAP_LEGENDARY: Record<LootBoxTier, number> = {
  bronze: 100,
  silver: 60,
  gold: 30,
  diamond: 15,
  featured: 25,
};

function emptyPity(): PityCounters {
  const sinceEpic = {} as Record<LootBoxTier, number>;
  const sinceLegendary = {} as Record<LootBoxTier, number>;
  for (const t of PITY_TIERS) { sinceEpic[t] = 0; sinceLegendary[t] = 0; }
  return { sinceEpic, sinceLegendary };
}

// ─── Roll logic ────────────────────────────────────────────────────────

function pickWeighted<T>(entries: Array<[T, number]>, rand: () => number): T | null {
  if (entries.length === 0) return null;
  let total = 0;
  for (const [, w] of entries) total += w;
  if (total <= 0) return null;
  let r = rand() * total;
  for (const [v, w] of entries) {
    r -= w;
    if (r <= 0) return v;
  }
  return entries[entries.length - 1][0];
}

interface RollContext {
  box: LootBox;
  pity: PityCounters;
}

function rollRarity(ctx: RollContext, rand: () => number): LootBoxRarity {
  const t = ctx.box.tier;
  // Pity overrides: legendary takes priority over epic.
  if (ctx.pity.sinceLegendary[t] >= PITY_CAP_LEGENDARY[t] - 1) return 'legendary';
  if (ctx.pity.sinceEpic[t] >= PITY_CAP_EPIC[t] - 1) return 'epic';

  const weights = TIER_RARITY_WEIGHTS[t];
  const result = pickWeighted(
    (RARITY_ORDER.map((r) => [r, weights[r]]) as Array<[LootBoxRarity, number]>),
    rand,
  );
  return result ?? 'common';
}

function rollCategory(ctx: RollContext, rarity: LootBoxRarity, rand: () => number): LootCategory {
  const themed = ctx.box.themedCategory;
  const weights = themed ? themedCategoryWeights(themed) : GENERIC_CATEGORY_WEIGHTS;
  // Filter out categories that have ZERO items at this rarity so we
  // don't waste a roll. Currency is always allowed because COIN_FILLERS
  // covers all rarities.
  const cats = (Object.keys(weights) as LootCategory[]).filter((c) => {
    if (c === 'currency') return true;
    return POOL.byCatRarity[c][rarity].length > 0;
  });
  if (cats.length === 0) return 'currency';
  const entries = cats.map((c) => [c, weights[c]] as [LootCategory, number]);
  const result = pickWeighted(entries, rand);
  return result ?? 'currency';
}

function pickItem(category: LootCategory, rarity: LootBoxRarity, rand: () => number): LootBoxItem | null {
  const pool = POOL.byCatRarity[category][rarity];
  if (pool.length === 0) {
    // Fallback to currency at the same rarity so the player never gets
    // null. This should be rare in practice.
    const fillers = POOL.byCatRarity.currency[rarity];
    if (fillers.length === 0) return null;
    return fillers[Math.floor(rand() * fillers.length)];
  }
  return pool[Math.floor(rand() * pool.length)];
}

// ─── Featured pick (special path) ──────────────────────────────────────
//
// Featured Box ignores the generic pool and picks from the curated
// weekly list — but still respects the tier rarity weighting so the
// distribution feels predictable.

function pickFeaturedItem(rarity: LootBoxRarity, rand: () => number, dateOverride?: Date): LootBoxItem {
  const list = featuredItemsForWeek(dateOverride);
  const matching = list.filter((it) => it.rarity === rarity);
  const fallback = list.length > 0 ? list[Math.floor(rand() * list.length)] : COIN_FILLERS[0];
  if (matching.length === 0) return fallback;
  return matching[Math.floor(rand() * matching.length)];
}

// ─── Open result shape ─────────────────────────────────────────────────

export interface OpenBoxResult {
  /** The item rolled. Always set on success — the grant outcome lives in
   *  separate fields so the screen can show "DUPE" / "PITY" overlays. */
  item: LootBoxItem;
  /** True when the player already owned the rolled item; in that case
   *  we did NOT change ownership and instead handed out shards + coins. */
  isDupe: boolean;
  /** Shards awarded (0 unless isDupe). */
  shardsAwarded: number;
  /** Coins refunded on a dupe (0 unless isDupe). */
  coinRefund: number;
  /** True when this roll triggered the epic-pity guarantee. */
  wasPityEpic: boolean;
  /** True when this roll triggered the legendary-pity guarantee. */
  wasPityLegendary: boolean;
}

// ─── Ownership helpers ─────────────────────────────────────────────────
//
// Centralized so the dupe path uses the same logic the Customize tab
// will use to gate locked overlays.

export function isLootItemOwned(item: LootBoxItem): boolean {
  switch (item.type) {
    case 'board':   return useShopStore.getState().owned.boards.includes(item.id);
    case 'pieces':  return useShopStore.getState().owned.pieces.includes(item.id);
    case 'dropFx':  return useShopStore.getState().owned.dropEffects.includes(item.id);
    case 'winFx':   return useShopStore.getState().owned.winAnimations.includes(item.id);
    case 'frame':   return useShopStore.getState().owned.boardAccessories.includes(item.id);
    case 'outfit':  return useCharacterStore.getState().isOutfitOwned(item.id);
    case 'partVariant': {
      const { partName, variantId } = parseVariantDropId(item.id);
      return useCharacterStore.getState().isPartVariantOwned(partName, variantId);
    }
    case 'pet':     return usePetStore.getState().ownedPets.includes(item.id as PetId);
    case 'emote':   return useShopStore.getState().ownedEmotes.includes(item.id);
    case 'tintColor': return useCharacterStore.getState().isTintColorOwned(item.id);
    case 'coins':
    case 'gems':    return false; // currency is never a "dupe"
  }
}

/** Grant the item to the appropriate store. No-op when already owned. */
function grantItem(item: LootBoxItem): void {
  const shop = useShopStore.getState();
  switch (item.type) {
    case 'board':   shop.purchaseItem('boards', item.id, 0); break;
    case 'pieces':  shop.purchaseItem('pieces', item.id, 0); break;
    case 'dropFx':  shop.purchaseItem('dropEffects', item.id, 0); break;
    case 'winFx':   shop.purchaseItem('winAnimations', item.id, 0); break;
    case 'frame':   shop.purchaseItem('boardAccessories', item.id, 0); break;
    case 'outfit':  useCharacterStore.getState().unlockOutfit(item.id); break;
    case 'partVariant': {
      const { partName, variantId } = parseVariantDropId(item.id);
      useCharacterStore.getState().unlockPartVariant(partName, variantId);
      break;
    }
    case 'pet':     usePetStore.getState().unlockPet(item.id as PetId); break;
    case 'emote':   shop.purchaseEmote(item.id, 0); break;
    case 'tintColor': useCharacterStore.getState().unlockTintColor(item.id); break;
    case 'coins':   if (item.value) shop.addCoins(item.value); break;
    case 'gems':    if (item.value) shop.addGems(item.value); break;
  }
}

// ─── Store ─────────────────────────────────────────────────────────────

interface LootBoxState {
  ownedBoxes: { boxId: string; count: number }[];
  openHistory: LootBoxItem[];

  /** Per-rarity shard balance. Spendable in the Shard Shop. */
  shards: Record<ShardBucket, number>;

  /** Per-tier pity counters. */
  pity: PityCounters;

  /** Lifetime opens, for analytics + "X boxes opened" stats. */
  lifetimeOpens: number;

  // Actions
  addBox: (boxId: string) => void;
  /** Buy a box with coins. Returns true on success. */
  purchaseBox: (boxId: string) => boolean;
  /** Open a box from inventory. Returns null when no box of that id is
   *  available. Otherwise returns the full result shape. */
  openBox: (boxId: string) => OpenBoxResult | null;
  /** Spend shards to unlock a specific item directly. Returns true when
   *  the spend succeeded (sufficient shards + item not already owned). */
  spendShardsForItem: (itemId: string) => boolean;
  /** Add shards from non-dupe sources (achievement reward, etc.). */
  addShards: (rarity: ShardBucket, amount: number) => void;
  getBoxCount: (boxId: string) => number;
  getBoxById: (boxId: string) => LootBox | null;
  loadFromStorage: () => Promise<void>;
}

export const useLootBoxStore = create<LootBoxState>((set, get) => ({
  ownedBoxes: [],
  openHistory: [],
  shards: { common: 0, rare: 0, epic: 0, legendary: 0 },
  pity: emptyPity(),
  lifetimeOpens: 0,

  addBox: (boxId) => {
    // Defensive: reject ids that don't exist in the LOOT_BOXES catalog
    // so a fat-fingered call from the daily-reward / dev-hook path
    // can't create orphan inventory entries that no UI surfaces.
    // Audit 2026-05-06 caught the dev-hook footgun where addBox('gold')
    // (vs addBox('gold_box')) silently succeeded.
    if (!LOOT_BOXES.some((b) => b.id === boxId)) {
      if (__DEV__) console.warn(`[lootBoxStore] addBox: unknown boxId '${boxId}' — ignored. Valid ids: ${LOOT_BOXES.map(b => b.id).join(', ')}`);
      return;
    }
    set((state) => {
      const existing = state.ownedBoxes.find((b) => b.boxId === boxId);
      if (existing) {
        return {
          ownedBoxes: state.ownedBoxes.map((b) =>
            b.boxId === boxId ? { ...b, count: b.count + 1 } : b,
          ),
        };
      }
      return { ownedBoxes: [...state.ownedBoxes, { boxId, count: 1 }] };
    });
  },

  purchaseBox: (boxId) => {
    const meta = LOOT_BOXES.find((b) => b.id === boxId);
    if (!meta) return false;
    if (meta.cost === 0) {
      // Free box — should be granted via daily reward, not purchased.
      // Still allow but don't deduct anything.
      get().addBox(boxId);
      return true;
    }
    const ok = useShopStore.getState().spendCoins(meta.cost);
    if (!ok) return false;
    get().addBox(boxId);
    return true;
  },

  openBox: (boxId) => {
    const inv = get().ownedBoxes.find((b) => b.boxId === boxId);
    if (!inv || inv.count <= 0) return null;
    const meta = LOOT_BOXES.find((b) => b.id === boxId);
    if (!meta) return null;

    // Deduct one box.
    set((state) => ({
      ownedBoxes: state.ownedBoxes.map((b) =>
        b.boxId === boxId ? { ...b, count: b.count - 1 } : b,
      ),
    }));

    const ctx: RollContext = { box: meta, pity: get().pity };
    const rand = Math.random;

    // Track if pity actually fired (vs. natural roll landing on epic+).
    const wasPityEpic = ctx.pity.sinceEpic[meta.tier] >= PITY_CAP_EPIC[meta.tier] - 1;
    const wasPityLegendary = ctx.pity.sinceLegendary[meta.tier] >= PITY_CAP_LEGENDARY[meta.tier] - 1;

    const rarity = rollRarity(ctx, rand);

    let item: LootBoxItem;
    if (meta.tier === 'featured') {
      item = pickFeaturedItem(rarity, rand);
    } else {
      const cat = rollCategory(ctx, rarity, rand);
      const picked = pickItem(cat, rarity, rand);
      // Hard guarantee: never return null. Fallback to a coin filler.
      item = picked ?? COIN_FILLERS[0];
    }

    // Dupe check (only meaningful for cosmetics, not currency).
    const isCosmetic = item.type !== 'coins' && item.type !== 'gems';
    const isDupe = isCosmetic && isLootItemOwned(item);

    let shardsAwarded = 0;
    let coinRefund = 0;
    if (isDupe) {
      shardsAwarded = DUPE_SHARDS_AWARDED[item.rarity];
      coinRefund = DUPE_COIN_REFUND[item.rarity];
      set((state) => ({
        shards: {
          ...state.shards,
          [item.rarity]: state.shards[item.rarity] + shardsAwarded,
        },
      }));
      if (coinRefund > 0) useShopStore.getState().addCoins(coinRefund);
    } else {
      grantItem(item);
    }

    // Update pity counters.
    set((state) => {
      const next = {
        sinceEpic: { ...state.pity.sinceEpic },
        sinceLegendary: { ...state.pity.sinceLegendary },
      };
      const t = meta.tier;
      if (item.rarity === 'epic' || item.rarity === 'legendary') {
        next.sinceEpic[t] = 0;
      } else {
        next.sinceEpic[t] = next.sinceEpic[t] + 1;
      }
      if (item.rarity === 'legendary') {
        next.sinceLegendary[t] = 0;
      } else {
        next.sinceLegendary[t] = next.sinceLegendary[t] + 1;
      }
      return {
        pity: next,
        openHistory: [item, ...state.openHistory].slice(0, 100),
        lifetimeOpens: state.lifetimeOpens + 1,
      };
    });

    return { item, isDupe, shardsAwarded, coinRefund, wasPityEpic, wasPityLegendary };
  },

  spendShardsForItem: (itemId) => {
    const item = getLootItemById(itemId);
    if (!item) return false;
    if (item.category === 'currency') return false;
    if (isLootItemOwned(item)) return false;
    const cost = SHARD_UNLOCK_COST[item.rarity];
    const have = get().shards[item.rarity];
    if (have < cost) return false;
    set((state) => ({
      shards: { ...state.shards, [item.rarity]: state.shards[item.rarity] - cost },
    }));
    grantItem(item);
    return true;
  },

  addShards: (rarity, amount) => {
    if (amount <= 0) return;
    set((state) => ({
      shards: { ...state.shards, [rarity]: state.shards[rarity] + amount },
    }));
  },

  getBoxCount: (boxId) => get().ownedBoxes.find((b) => b.boxId === boxId)?.count ?? 0,
  getBoxById: (boxId) => LOOT_BOXES.find((b) => b.id === boxId) ?? null,

  loadFromStorage: async () => {
    const saved = await loadState<{
      ownedBoxes: any[];
      openHistory: any[];
      shards?: Record<ShardBucket, number>;
      pity?: PityCounters;
      lifetimeOpens?: number;
    }>('lootbox');
    if (saved) {
      set({
        ownedBoxes: saved.ownedBoxes ?? [],
        openHistory: saved.openHistory ?? [],
        shards: saved.shards ?? { common: 0, rare: 0, epic: 0, legendary: 0 },
        pity: saved.pity ?? emptyPity(),
        lifetimeOpens: saved.lifetimeOpens ?? 0,
      });
    }
  },
}));

// Auto-save
useLootBoxStore.subscribe((state) => {
  saveState('lootbox', {
    ownedBoxes: state.ownedBoxes,
    openHistory: state.openHistory,
    shards: state.shards,
    pity: state.pity,
    lifetimeOpens: state.lifetimeOpens,
  });
});

// ─── Derived selectors ─────────────────────────────────────────────────

/** Total number of boxes the player has waiting to open across all tiers. */
export function selectWaitingBoxCount(state: LootBoxState): number {
  return state.ownedBoxes.reduce((sum, b) => sum + b.count, 0);
}

/** Items the player currently has enough shards to unlock right now. */
export function selectShardUnlockableItems(state: LootBoxState): LootBoxItem[] {
  const result: LootBoxItem[] = [];
  for (const item of getAllLootableItems()) {
    if (isLootItemOwned(item)) continue;
    const cost = SHARD_UNLOCK_COST[item.rarity];
    if (state.shards[item.rarity] >= cost) result.push(item);
  }
  return result;
}
