/**
 * AMG Shop Filters — pure helpers for narrowing the manifest part list.
 *
 * Extracted from ShopScreen.tsx so the filtering logic can be unit-tested
 * independently of the shop's React rendering. Kept fully synchronous and
 * dependency-free; the shop screen passes its current state in and gets
 * a filtered slice + grouped-by-pack map back out.
 */

import { packPrefixFromPartName, isStarterPack } from './amgPartPricing';

export type AmgSpecies = 'All' | 'Human' | 'Goblin' | 'Elves' | 'Skeleton' | 'Zombie';

export type AmgSlotBucket =
  | 'All' | 'Upper Body' | 'Lower Body' | 'Face' | 'Accessories' | 'Armor';

export interface AmgManifestPart {
  species: string;
  slot: string;
  name: string;
}

export interface FilterOpts {
  species: AmgSpecies;
  bucket: AmgSlotBucket;
  /** Free-text search over part name + pack display name. Empty disables. */
  query?: string;
  /** When true, drop parts the player doesn't own. */
  ownedOnly?: boolean;
  /** Resolves part-name → owned bool. Required when `ownedOnly` is true. */
  isPartOwned?: (name: string) => boolean;
  /** Pack-prefix → display name. Used for query matching ("samurai" should
   *  find every Samurai Warriors part even though the part name encodes it
   *  as `SAMR_WARR`). */
  packDisplayName: (packPrefix: string) => string;
  /** Bucket definition — keep in sync with the shop's UI. */
  slotBuckets: Record<Exclude<AmgSlotBucket, 'All'>, readonly string[]>;
}

/** Slots considered cosmetic-equipable. Derived from the bucket list so
 *  callers don't have to keep a parallel allowlist. */
function allowedSlotsFor(buckets: FilterOpts['slotBuckets']): Set<string> {
  return new Set(Object.values(buckets).flat());
}

/** Returns the subset of `parts` that pass every active filter, with
 *  starter-pack parts excluded (already owned by every player; showing
 *  them as buyable is confusing). Order is preserved from the input. */
export function filterAmgParts(
  parts: AmgManifestPart[],
  opts: FilterOpts,
): AmgManifestPart[] {
  const allowed = allowedSlotsFor(opts.slotBuckets);
  const q = (opts.query ?? '').trim().toLowerCase();

  return parts.filter((p) => {
    if (opts.species !== 'All' && p.species !== opts.species) return false;

    if (opts.bucket === 'All') {
      if (!allowed.has(p.slot)) return false;
    } else {
      if (!opts.slotBuckets[opts.bucket].includes(p.slot)) return false;
    }

    if (q) {
      const inName = p.name.toLowerCase().includes(q);
      const inPack = opts.packDisplayName(packPrefixFromPartName(p.name)).toLowerCase().includes(q);
      if (!inName && !inPack) return false;
    }

    if (opts.ownedOnly) {
      if (!opts.isPartOwned || !opts.isPartOwned(p.name)) return false;
    }

    // Hide starter packs from the shop — players already own these for
    // free, so showing them as buyable items is misleading.
    if (isStarterPack(packPrefixFromPartName(p.name))) return false;

    return true;
  });
}

/** Group filtered parts by their pack prefix, preserving each pack's
 *  internal order from the input. */
export function groupAmgPartsByPack(
  parts: AmgManifestPart[],
): Record<string, AmgManifestPart[]> {
  const out: Record<string, AmgManifestPart[]> = {};
  for (const p of parts) {
    const pack = packPrefixFromPartName(p.name);
    (out[pack] ||= []).push(p);
  }
  return out;
}
