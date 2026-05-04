// ═══════════════════════════════════════════════════════════════════════
// amgEngine.test.ts — pure-function tests for the @amg/cosmetic-* packages
//
// Drop4 is the first AMG game consuming the engine, so these tests live
// here for now. When TTT scaffolds it'll inherit the same pure-utility
// guarantees (the regex parsers + variant id encoding don't change per
// game). If a third game lands, lift the test file into the engine
// package itself with its own jest config — until then, free coverage
// without engine-side jest setup.
// ═══════════════════════════════════════════════════════════════════════

// Pull from specific subpaths instead of the package index — the index
// re-exports React components which jest can't resolve from the engine
// package's directory (cosmetic-ui has no node_modules of its own; it
// peer-deps onto the host game's installed React). Importing the pure-
// utility submodules directly bypasses that and keeps the test fast.
import {
  slotLabel,
  variantFromPartName,
  SLOT_LABEL,
} from '@amg/cosmetic-ui/utils/partName';
import {
  bucketForSlot,
  DEFAULT_SLOT_BUCKETS,
  filterManifestForGame,
  type AmgManifestPart,
} from '@amg/cosmetic-ui/types/slots';
import {
  DEFAULT_PALETTE,
  DEFAULT_VARIANT_ID,
} from '@amg/cosmetic-ui/types/index';
import {
  variantDropId,
  parseVariantDropId,
  VARIANT_ID_SEP,
} from '@amg/cosmetic-runtime/variantId';
import {
  RARITY_TO_LOOT,
  SHARD_UNLOCK_COST,
  DUPE_COIN_REFUND,
  DUPE_SHARDS_AWARDED,
} from '@amg/cosmetic-runtime/economy';
import {
  DEFAULT_VARIANT_ID as RUNTIME_DEFAULT_VARIANT_ID,
} from '@amg/cosmetic-runtime/wardrobe';

// ─── slotLabel ────────────────────────────────────────────────────────

describe('@amg/cosmetic-ui slotLabel()', () => {
  test('resolves all canonical Sidekick slot codes', () => {
    expect(slotLabel('SK_MDRN_CIVL_01_10TORS_HU01')).toBe('TORSO');
    expect(slotLabel('SK_FANT_KNGT_03_22AHED_HU01')).toBe('HELM');
    expect(slotLabel('SK_APOC_OUTL_05_02HAIR_HU01')).toBe('HAIR');
    expect(slotLabel('SK_SAMR_WARR_07_18LEGL_HU01')).toBe('LEG L');
    expect(slotLabel('SK_VIKG_WARR_02_24ABAC_HU01')).toBe('BACK');
  });

  test('returns PART for off-schema names', () => {
    expect(slotLabel('not-a-sidekick-name')).toBe('PART');
    expect(slotLabel('')).toBe('PART');
    expect(slotLabel('SK_NOTHING_HERE')).toBe('PART');
  });

  test('returns PART for unknown slot codes', () => {
    expect(slotLabel('SK_FOO_BAR_99_99XXX_HU01')).toBe('PART');
  });

  test('SLOT_LABEL covers all 30+ Sidekick slots', () => {
    const codes = Object.keys(SLOT_LABEL);
    // Sanity: at minimum the 7 GTA buckets (head, torso, hips, legs, feet,
    // helm, back) are in the label map.
    expect(codes).toContain('01HEAD');
    expect(codes).toContain('10TORS');
    expect(codes).toContain('17HIPS');
    expect(codes).toContain('18LEGL');
    expect(codes).toContain('20FOTL');
    expect(codes).toContain('22AHED');
    expect(codes).toContain('24ABAC');
    expect(codes.length).toBeGreaterThanOrEqual(30);
  });
});

// ─── variantFromPartName ──────────────────────────────────────────────

describe('@amg/cosmetic-ui variantFromPartName()', () => {
  test('extracts the 2-digit variant', () => {
    expect(variantFromPartName('SK_MDRN_CIVL_01_10TORS_HU01')).toBe('01');
    expect(variantFromPartName('SK_FANT_KNGT_07_22AHED_HU01')).toBe('07');
    expect(variantFromPartName('SK_APOC_OUTL_99_18LEGL_HU01')).toBe('99');
  });

  test('returns ?? for off-schema names', () => {
    expect(variantFromPartName('not-a-sidekick')).toBe('??');
    expect(variantFromPartName('SK_TOO_SHORT')).toBe('??');
    expect(variantFromPartName('')).toBe('??');
  });
});

// ─── bucketForSlot ────────────────────────────────────────────────────

// ─── filterManifestForGame ────────────────────────────────────────────

describe('@amg/cosmetic-ui filterManifestForGame()', () => {
  // Three-part manifest: cross-game (no flag), Drop4-exclusive,
  // TTT-exclusive. Each game's lootbox roller filters via this helper.
  const manifest: AmgManifestPart[] = [
    { name: 'cross_game_part',  species: 'Human', slot: 'Torso', file: 'a.glb' },
    { name: 'drop4_only_part',  species: 'Human', slot: 'Torso', file: 'b.glb', gameExclusive: 'drop4' },
    { name: 'ttt_only_part',    species: 'Human', slot: 'Torso', file: 'c.glb', gameExclusive: 'ttt' },
  ];

  test('Drop4 lootbox sees cross-game + Drop4 exclusives only', () => {
    const filtered = filterManifestForGame(manifest, 'drop4');
    const names = filtered.map((p) => p.name);
    expect(names).toContain('cross_game_part');
    expect(names).toContain('drop4_only_part');
    expect(names).not.toContain('ttt_only_part');
  });

  test('TTT lootbox sees cross-game + TTT exclusives only', () => {
    const filtered = filterManifestForGame(manifest, 'ttt');
    const names = filtered.map((p) => p.name);
    expect(names).toContain('cross_game_part');
    expect(names).toContain('ttt_only_part');
    expect(names).not.toContain('drop4_only_part');
  });

  test('A future game with no exclusives sees only cross-game parts', () => {
    const filtered = filterManifestForGame(manifest, 'rps');
    expect(filtered.length).toBe(1);
    expect(filtered[0].name).toBe('cross_game_part');
  });

  test('Empty manifest stays empty', () => {
    expect(filterManifestForGame([], 'drop4')).toEqual([]);
  });
});

describe('@amg/cosmetic-ui bucketForSlot()', () => {
  // bucketForSlot takes the manifest's Synty slot NAME (e.g. 'Torso',
  // 'Hips') — NOT the part-name slot code (e.g. '10TORS', '17HIPS').
  // The two taxonomies serve different layers: slotLabel reads the
  // part name; bucketForSlot reads the manifest entry.
  test('maps Synty slot names to bucket ids', () => {
    expect(bucketForSlot('Torso')).toBe('tops');
    expect(bucketForSlot('Hips')).toBe('pants');
    expect(bucketForSlot('FootLeft')).toBe('shoes');
    expect(bucketForSlot('Hair')).toBe('hair');
    expect(bucketForSlot('AttachmentHead')).toBe('hats');
    expect(bucketForSlot('AttachmentBack')).toBe('accessories');
  });

  test('returns null for unknown slot names', () => {
    expect(bucketForSlot('NotARealSlot')).toBeNull();
    expect(bucketForSlot('')).toBeNull();
  });

  test('DEFAULT_SLOT_BUCKETS has 7 entries (GTA layout)', () => {
    expect(DEFAULT_SLOT_BUCKETS.length).toBe(7);
    const ids = DEFAULT_SLOT_BUCKETS.map((b) => b.id);
    expect(ids).toContain('tops');
    expect(ids).toContain('pants');
    expect(ids).toContain('shoes');
    expect(ids).toContain('hair');
    expect(ids).toContain('face');
    expect(ids).toContain('hats');
    expect(ids).toContain('accessories');
  });
});

// ─── DEFAULT_PALETTE ──────────────────────────────────────────────────

describe('@amg/cosmetic-ui DEFAULT_PALETTE', () => {
  test('has 10 entries with the default colorway first', () => {
    expect(DEFAULT_PALETTE.length).toBe(10);
    expect(DEFAULT_PALETTE[0].id).toBe(DEFAULT_VARIANT_ID); // ''
    expect(DEFAULT_PALETTE[0].label).toBe('Default');
  });

  test('all entries have id, label, color', () => {
    for (const v of DEFAULT_PALETTE) {
      expect(typeof v.id).toBe('string');
      expect(typeof v.label).toBe('string');
      expect(v.color).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  test('exactly 3 premium variants (gold, camo, neon)', () => {
    const premium = DEFAULT_PALETTE.filter((v) => v.premium);
    expect(premium.length).toBe(3);
    expect(premium.map((p) => p.id).sort()).toEqual(['camo', 'gold', 'neon']);
  });
});

// ─── variantDropId / parseVariantDropId roundtrip ─────────────────────

describe('@amg/cosmetic-runtime variantDropId() / parseVariantDropId()', () => {
  test('encodes (partName, variantId) tuples', () => {
    expect(variantDropId('SK_MDRN_CIVL_01_10TORS_HU01', 'cyan')).toBe(
      'SK_MDRN_CIVL_01_10TORS_HU01__cyan',
    );
    expect(variantDropId('SK_FANT_KNGT_03_22AHED_HU01', 'gold')).toBe(
      'SK_FANT_KNGT_03_22AHED_HU01__gold',
    );
  });

  test('default variantId collapses to bare partName', () => {
    expect(variantDropId('SK_MDRN_CIVL_01_10TORS_HU01', '')).toBe(
      'SK_MDRN_CIVL_01_10TORS_HU01',
    );
    expect(variantDropId('SK_MDRN_CIVL_01_10TORS_HU01', DEFAULT_VARIANT_ID)).toBe(
      'SK_MDRN_CIVL_01_10TORS_HU01',
    );
  });

  test('parseVariantDropId is the inverse of variantDropId', () => {
    const cases = [
      ['SK_MDRN_CIVL_01_10TORS_HU01', 'cyan'],
      ['SK_FANT_KNGT_03_22AHED_HU01', 'gold'],
      ['SK_APOC_OUTL_05_18LEGL_HU01', 'red'],
    ];
    for (const [partName, variantId] of cases) {
      const id = variantDropId(partName, variantId);
      const parsed = parseVariantDropId(id);
      expect(parsed.partName).toBe(partName);
      expect(parsed.variantId).toBe(variantId);
    }
  });

  test('parseVariantDropId returns variantId="" for legacy non-variant ids', () => {
    const parsed = parseVariantDropId('SK_MDRN_CIVL_01_10TORS_HU01');
    expect(parsed.partName).toBe('SK_MDRN_CIVL_01_10TORS_HU01');
    expect(parsed.variantId).toBe('');
  });

  test('VARIANT_ID_SEP is the documented "__" separator', () => {
    expect(VARIANT_ID_SEP).toBe('__');
  });

  test('DEFAULT_VARIANT_ID matches across both packages', () => {
    expect(DEFAULT_VARIANT_ID).toBe(RUNTIME_DEFAULT_VARIANT_ID);
    expect(DEFAULT_VARIANT_ID).toBe('');
  });
});

// ─── Lootbox economy primitives ───────────────────────────────────────

describe('@amg/cosmetic-runtime economy', () => {
  test('RARITY_TO_LOOT collapses 7-tier to 4-tier', () => {
    expect(RARITY_TO_LOOT.starter).toBe('common');
    expect(RARITY_TO_LOOT.common).toBe('common');
    expect(RARITY_TO_LOOT.uncommon).toBe('common');
    expect(RARITY_TO_LOOT.rare).toBe('rare');
    expect(RARITY_TO_LOOT.epic).toBe('epic');
    expect(RARITY_TO_LOOT.legendary).toBe('legendary');
    expect(RARITY_TO_LOOT.mythic).toBe('legendary');
    // Darkmatter is earn-only and never drops
    expect(RARITY_TO_LOOT.darkmatter).toBeNull();
  });

  test('shard cost ladder strictly increases by rarity', () => {
    expect(SHARD_UNLOCK_COST.common).toBeLessThan(SHARD_UNLOCK_COST.rare);
    expect(SHARD_UNLOCK_COST.rare).toBeLessThan(SHARD_UNLOCK_COST.epic);
    expect(SHARD_UNLOCK_COST.epic).toBeLessThan(SHARD_UNLOCK_COST.legendary);
  });

  test('dupe coin refund ladder strictly increases by rarity', () => {
    expect(DUPE_COIN_REFUND.common).toBeLessThan(DUPE_COIN_REFUND.rare);
    expect(DUPE_COIN_REFUND.rare).toBeLessThan(DUPE_COIN_REFUND.epic);
    expect(DUPE_COIN_REFUND.epic).toBeLessThan(DUPE_COIN_REFUND.legendary);
  });

  test('dupe shards ladder strictly increases by rarity', () => {
    expect(DUPE_SHARDS_AWARDED.common).toBeLessThan(DUPE_SHARDS_AWARDED.rare);
    expect(DUPE_SHARDS_AWARDED.rare).toBeLessThan(DUPE_SHARDS_AWARDED.epic);
    expect(DUPE_SHARDS_AWARDED.epic).toBeLessThan(DUPE_SHARDS_AWARDED.legendary);
  });

  test('dupe shard payout is < shard cost (genuine grind, not free)', () => {
    // Dupes shouldn't pay out enough shards to instantly buy another
    // copy of the same rarity — that would defeat the purpose of the
    // dupe-protection economy.
    for (const tier of ['common', 'rare', 'epic', 'legendary'] as const) {
      expect(DUPE_SHARDS_AWARDED[tier]).toBeLessThan(SHARD_UNLOCK_COST[tier]);
    }
  });
});
