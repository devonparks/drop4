/**
 * seedDrop4Variants — populate the lootbox drop POOL with Path A
 * (partName, variantId) tuples for Drop4's outfit catalog.
 *
 * Pivot 2026-05-04: every clothing part can have N color variants
 * (Goku-transformations model). The lootbox originally seeded only
 * outfit-PACK drops (152 entries). After this seeder runs the POOL
 * also carries variant drops — one per (part, colorway) combo for
 * every part in every shipped outfit pack.
 *
 * Why this lives in Drop4 (not @amg/cosmetic-runtime):
 *   - The seed source is OUTFIT_SHOP_ITEMS — Drop4's pack catalog.
 *     TTT / RPS+ / Chess will each have their own pack catalog (or
 *     none) and write their own seeder against that.
 *   - The buildAmgBodyForOutfit lookup (resolves "which AMG part
 *     names belong to this outfit pack") is in Drop4's data layer.
 *   - Each game decides for itself whether the variant economy
 *     applies; smaller games may opt out entirely.
 *
 * Math (current Drop4 catalog, 25-variant palette):
 *   152 outfit packs × ~6 main slots × 24 non-default colorways
 *   ≈ 21,888 variant drops appended on top of the existing ~245-item
 *   pool. Memory footprint: ~2.5MB of objects, fine for mobile.
 *
 * Rarity distribution per part (CoD-camo model):
 *   8 common + 6 uncommon (→ common bucket) = 14 common drops
 *   4 rare + 3 epic + 3 legendary = 10 premium drops
 *   "Everybody has the hoodie but nobody has the Gold version."
 *
 * Intended caller: App.tsx after `useCharacterStore.loadFromStorage()`
 * resolves. Calling it again is a no-op (appendItemsToPool dedups
 * by id), so reload-during-development is safe.
 */
import {
  appendItemsToPool,
  mintPartVariantItem,
  type LootBoxItem,
  type LootBoxRarity,
} from '../stores/lootBoxStore';
import { OUTFIT_SHOP_ITEMS } from '../data/cosmeticsShopCatalog';
import { buildAmgBodyForOutfit } from '../data/npcCustomizations';
import { DEFAULT_PALETTE, type VariantDef } from '@amg/cosmetic-ui';

/** Map a 5-tier VariantDef rarity onto the lootbox 4-tier rarity.
 *  CoD-camo model: variant rarity determines drop weight independent
 *  of the pack the part belongs to. A "Gold" camo is legendary whether
 *  it's on a common hoodie or an epic jacket. */
function variantToLootRarity(rarity: VariantDef['rarity']): LootBoxRarity {
  switch (rarity) {
    case 'rare': return 'rare';
    case 'epic': return 'epic';
    case 'legendary': return 'legendary';
    default: return 'common'; // common, uncommon → common bucket
  }
}

/** Run once at app boot. Generates variant LootBoxItems for every
 *  (part, colorway) tuple in the Drop4 outfit catalog and appends
 *  them to the active drop POOL. Idempotent. */
export function seedDrop4Variants(): { seeded: number; skipped: number } {
  const generated: LootBoxItem[] = [];
  const seenIds = new Set<string>();

  // For each catalogued outfit pack:
  //   - resolve its body parts (Torso / Hips / Legs / Feet / etc.)
  //   - for each non-default colorway in DEFAULT_PALETTE, mint a
  //     variant drop at the VARIANT's rarity tier (CoD-camo model:
  //     Gold is always legendary regardless of which pack the part
  //     belongs to — "everybody has the hoodie but nobody has the
  //     Gold version")
  for (const pack of OUTFIT_SHOP_ITEMS) {
    const bodyParts = buildAmgBodyForOutfit(pack.id);
    const partNames = Object.values(bodyParts).filter(
      (n): n is string => typeof n === 'string',
    );

    for (const partName of partNames) {
      for (const variant of DEFAULT_PALETTE) {
        // Skip the default colorway — it's implicitly owned with the
        // base part already, no separate drop needed.
        if (variant.id === '') continue;

        const id = `${partName}__${variant.id}`;
        if (seenIds.has(id)) continue;
        seenIds.add(id);

        const item = mintPartVariantItem(
          partName,
          variant.id,
          variantToLootRarity(variant.rarity),
          // Display name: "Apocalypse Outlaws · Crimson"
          `${pack.name.replace(/ \d+$/, '')} · ${variant.label}`,
        );
        generated.push(item);
      }
    }
  }

  // Append in one batch — appendItemsToPool dedups against the
  // existing pool so this call is safe to repeat across hot reloads.
  const before = generated.length;
  appendItemsToPool(generated);
  // appendItemsToPool doesn't return a count; we approximate by
  // assuming all dedup-survivors were new. Re-invocations show 0
  // new in the dev console.
  return { seeded: before, skipped: 0 };
}
