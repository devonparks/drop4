/**
 * Cosmetics Shop Catalog
 *
 * Generates ShopItem arrays for the three new cosmetic categories powered by
 * the 3D pipeline: OUTFITS (152 Synty pieces), PETS (16 Polygon Dogs), and
 * EMOTES (21 Mixamo-style animation clips).
 *
 * Prices + rarities are derived from the pack/breed and emote metadata so the
 * shop always matches what's on disk — regenerate the outfit registry and
 * these entries update automatically.
 */

import { OUTFITS, PACKS, type OutfitMeta, type Species } from './outfitRegistry';
import { PETS, type PetMeta } from './petRegistry';
import { HUMAN_EMOTES, type AnimationMeta } from './animationRegistry';
import type { ShopItem } from './shopCatalog';

// ── Outfit pricing ─────────────────────────────────────────────────

const SPECIES_LABEL: Record<Species, string> = {
  human: 'Human',
  elves: 'Elven',
  goblin: 'Goblin',
  skeleton: 'Skeleton',
  zombie: 'Zombie',
};

// Price + rarity per pack. "Modern" stuff is entry-level; fantasy/sci-fi pricier.
const PACK_PRICING: Record<string, { price: number; rarity: ShopItem['rarity']; collection: string }> = {
  modern_civilians:    { price: 300,  rarity: 'common',    collection: 'Modern Civilians'   },
  modern_police:       { price: 500,  rarity: 'uncommon',  collection: 'Modern Police'      },
  apocalypse_outlaws:  { price: 750,  rarity: 'rare',      collection: 'Apocalypse'         },
  apocalypse_survivor: { price: 750,  rarity: 'rare',      collection: 'Apocalypse'         },
  apocalypse_zombies:  { price: 1000, rarity: 'epic',      collection: 'Apocalypse'         },
  fantasy_villagers:   { price: 500,  rarity: 'uncommon',  collection: 'Fantasy'            },
  fantasy_knights:     { price: 1500, rarity: 'epic',      collection: 'Fantasy'            },
  fantasy_skeletons:   { price: 2000, rarity: 'epic',      collection: 'Fantasy'            },
  elven_warriors:      { price: 1500, rarity: 'epic',      collection: 'Elven'              },
  goblin_fighters:     { price: 1000, rarity: 'rare',      collection: 'Goblin'             },
  pirate_captains:     { price: 1500, rarity: 'epic',      collection: 'Pirates'            },
  samurai_warriors:    { price: 2000, rarity: 'epic',      collection: 'Samurai'            },
  viking_warriors:     { price: 1500, rarity: 'epic',      collection: 'Vikings'            },
  sci_fi_civilians:    { price: 750,  rarity: 'rare',      collection: 'Sci-Fi'             },
  sci_fi_soldiers:     { price: 2000, rarity: 'legendary', collection: 'Sci-Fi'             },
};

// Species with locked starter packs — unlocked via career progression.
const LOCKED_SPECIES: Set<Species> = new Set(['elves', 'goblin', 'skeleton', 'zombie']);

function outfitToShopItem(o: OutfitMeta): ShopItem {
  const pricing = PACK_PRICING[o.pack] ?? { price: 500, rarity: 'common', collection: 'Misc' };
  // First outfit of any non-locked pack is always free (starter for that pack).
  const isStarter =
    o.index === 1 && !LOCKED_SPECIES.has(o.species) && o.pack === 'modern_civilians';
  return {
    id: o.id,
    name: `${o.packLabel} ${String(o.index).padStart(2, '0')}`,
    price: isStarter ? 0 : pricing.price,
    rarity: pricing.rarity,
    preview: {},
    collection: `${SPECIES_LABEL[o.species]} · ${pricing.collection}`,
    description: `${SPECIES_LABEL[o.species]} ${pricing.collection} #${o.index}`,
  };
}

export const OUTFIT_SHOP_ITEMS: ShopItem[] = Object.values(OUTFITS).map(outfitToShopItem);

// Group by pack for UI display
export interface OutfitCollection {
  species: Species;
  pack: string;
  label: string;
  items: ShopItem[];
}

export const OUTFIT_COLLECTIONS: OutfitCollection[] = PACKS.map((p) => ({
  species: p.species,
  pack: p.pack,
  label: `${SPECIES_LABEL[p.species]} · ${p.label}`,
  items: p.outfitIds.map((id) => outfitToShopItem(OUTFITS[id])),
}));

// ── Pet pricing → ShopItem ────────────────────────────────────────

const PET_RARITY_TO_SHOP: Record<PetMeta['rarity'], ShopItem['rarity']> = {
  common: 'common',
  rare: 'rare',
  epic: 'epic',
  legendary: 'legendary',
};

function petToShopItem(p: PetMeta): ShopItem {
  return {
    id: p.id,
    name: p.name,
    price: p.price,
    rarity: PET_RARITY_TO_SHOP[p.rarity],
    preview: {},
    collection: 'Pet Pack',
    description: p.unlockVia ? `Unlock: ${p.unlockVia}` : `${p.rarity} pet`,
  };
}

export const PET_SHOP_ITEMS: ShopItem[] = Object.values(PETS).map(petToShopItem);

// ── Emote pricing → ShopItem ──────────────────────────────────────

const EMOTE_PRICE_TO_RARITY = (price: number): ShopItem['rarity'] => {
  if (price <= 0) return 'common';
  if (price <= 300) return 'uncommon';
  if (price <= 600) return 'rare';
  if (price <= 900) return 'epic';
  return 'legendary';
};

function emoteToShopItem(e: AnimationMeta): ShopItem {
  const price = e.price ?? 500;
  return {
    id: e.id,
    name: e.name,
    price,
    rarity: EMOTE_PRICE_TO_RARITY(price),
    preview: {},
    collection: e.category === 'dance' ? 'Dance Pack'
      : e.category === 'taunt' ? 'Taunt Pack'
      : e.category === 'greet' ? 'Greet Pack'
      : 'Emote Pack',
    description: `${e.category} emote`,
  };
}

export const EMOTE_SHOP_ITEMS: ShopItem[] = HUMAN_EMOTES.map(emoteToShopItem);

// ── Summary helpers ───────────────────────────────────────────────

export const TOTAL_COSMETIC_COUNT =
  OUTFIT_SHOP_ITEMS.length + PET_SHOP_ITEMS.length + EMOTE_SHOP_ITEMS.length;
