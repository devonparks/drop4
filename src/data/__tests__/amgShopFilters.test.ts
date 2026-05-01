import {
  filterAmgParts,
  groupAmgPartsByPack,
  type AmgManifestPart,
  type AmgSlotBucket,
} from '../amgShopFilters';

// Mirror of ShopScreen.tsx's SLOT_BUCKETS — kept inline so test failures
// flag drift between the two source-of-truths.
const SLOT_BUCKETS: Record<Exclude<AmgSlotBucket, 'All'>, readonly string[]> = {
  'Upper Body': ['Torso', 'ArmUpperLeft', 'ArmUpperRight', 'ArmLowerLeft', 'ArmLowerRight', 'HandLeft', 'HandRight'],
  'Lower Body': ['Hips', 'LegLeft', 'LegRight', 'FootLeft', 'FootRight'],
  'Face':       ['Head', 'Hair', 'FacialHair', 'EyebrowLeft', 'EyebrowRight', 'EyeLeft', 'EyeRight', 'Nose', 'EarLeft', 'EarRight'],
  'Accessories':['AttachmentHead', 'AttachmentFace', 'AttachmentBack', 'Wrap'],
  'Armor':      [
    'AttachmentHipsFront', 'AttachmentHipsBack',
    'AttachmentHipsLeft', 'AttachmentHipsRight',
    'AttachmentShoulderLeft', 'AttachmentShoulderRight',
    'AttachmentElbowLeft', 'AttachmentElbowRight',
    'AttachmentKneeLeft', 'AttachmentKneeRight',
  ],
};

const PACK_NAMES: Record<string, string> = {
  MDRN_CIVL: 'Modern Civilians',
  SAMR_WARR: 'Samurai Warriors',
  APOC_OUTL: 'Apocalypse Outlaws',
  GOBL_FIGT: 'Goblin Fighters',
};

const packDisplayName = (prefix: string) => PACK_NAMES[prefix] ?? prefix;

// Sample manifest — covers Human / Goblin, multiple slots, multiple packs,
// including a starter (MDRN_CIVL — must be hidden from shop output).
const PARTS: AmgManifestPart[] = [
  // Modern Civilians (starter — should be hidden)
  { species: 'Human', slot: 'Torso', name: 'SK_MDRN_CIVL_01_10TORS_HU01' },
  { species: 'Human', slot: 'Hair',  name: 'SK_MDRN_CIVL_01_02HAIR_HU01' },
  // Samurai Warriors (Human, multiple slots)
  { species: 'Human', slot: 'Torso',                 name: 'SK_SAMR_WARR_03_10TORS_HU01' },
  { species: 'Human', slot: 'Hair',                  name: 'SK_SAMR_WARR_02_02HAIR_HU01' },
  { species: 'Human', slot: 'AttachmentShoulderLeft', name: 'SK_SAMR_WARR_01_29ASHL_HU01' },
  { species: 'Human', slot: 'EyebrowLeft',           name: 'SK_SAMR_WARR_01_03EBRL_HU01' },
  // Apocalypse Outlaws (Human, more variety)
  { species: 'Human', slot: 'Torso',           name: 'SK_APOC_OUTL_05_10TORS_HU01' },
  { species: 'Human', slot: 'AttachmentBack',  name: 'SK_APOC_OUTL_02_24ABAC_HU01' },
  { species: 'Human', slot: 'AttachmentHipsRight', name: 'SK_APOC_OUTL_03_28AHPR_HU01' },
  // Goblin Fighters
  { species: 'Goblin', slot: 'Torso', name: 'SK_GOBL_FIGT_04_10TORS_GO01' },
  { species: 'Goblin', slot: 'Hair',  name: 'SK_GOBL_FIGT_04_02HAIR_GO01' },
];

const baseOpts = {
  packDisplayName,
  slotBuckets: SLOT_BUCKETS,
};

describe('filterAmgParts', () => {
  it('with All/All returns every cosmetic part except starter packs', () => {
    const out = filterAmgParts(PARTS, {
      ...baseOpts,
      species: 'All',
      bucket: 'All',
    });
    // All non-starter parts: 2 SAMR torso/hair, 1 SAMR shoulder, 1 SAMR brow,
    // 1 APOC torso, 1 APOC back, 1 APOC hip, 2 GOBL = 9
    expect(out).toHaveLength(9);
    // Starter MDRN_CIVL parts must be hidden
    expect(out.find((p) => p.name.includes('MDRN_CIVL'))).toBeUndefined();
  });

  it('species filter narrows to the selected species', () => {
    const human = filterAmgParts(PARTS, { ...baseOpts, species: 'Human', bucket: 'All' });
    expect(human.every((p) => p.species === 'Human')).toBe(true);

    const goblin = filterAmgParts(PARTS, { ...baseOpts, species: 'Goblin', bucket: 'All' });
    expect(goblin.every((p) => p.species === 'Goblin')).toBe(true);
    expect(goblin).toHaveLength(2);
  });

  it('bucket filter restricts to the bucket\'s slot list', () => {
    const armor = filterAmgParts(PARTS, { ...baseOpts, species: 'All', bucket: 'Armor' });
    expect(armor.every((p) => SLOT_BUCKETS.Armor.includes(p.slot))).toBe(true);
    // SAMR shoulder + APOC hip = 2
    expect(armor).toHaveLength(2);

    const face = filterAmgParts(PARTS, { ...baseOpts, species: 'All', bucket: 'Face' });
    // SAMR hair, SAMR brow, GOBL hair = 3 (no head/etc in fixture)
    expect(face.length).toBeGreaterThan(0);
    expect(face.every((p) => SLOT_BUCKETS.Face.includes(p.slot))).toBe(true);
  });

  it('search matches part names', () => {
    const out = filterAmgParts(PARTS, {
      ...baseOpts,
      species: 'All',
      bucket: 'All',
      query: 'SAMR',
    });
    expect(out.length).toBeGreaterThan(0);
    expect(out.every((p) => p.name.includes('SAMR'))).toBe(true);
  });

  it('search matches pack display names (case-insensitive)', () => {
    const out = filterAmgParts(PARTS, {
      ...baseOpts,
      species: 'All',
      bucket: 'All',
      query: 'samurai',
    });
    expect(out.length).toBeGreaterThan(0);
    expect(out.every((p) => p.name.includes('SAMR'))).toBe(true);
  });

  it('search returning no results returns an empty array', () => {
    const out = filterAmgParts(PARTS, {
      ...baseOpts,
      species: 'All',
      bucket: 'All',
      query: 'unicorn',
    });
    expect(out).toHaveLength(0);
  });

  it('ownedOnly filter strips parts the player does not own', () => {
    const ownedSet = new Set(['SK_SAMR_WARR_03_10TORS_HU01', 'SK_GOBL_FIGT_04_10TORS_GO01']);
    const out = filterAmgParts(PARTS, {
      ...baseOpts,
      species: 'All',
      bucket: 'All',
      ownedOnly: true,
      isPartOwned: (n) => ownedSet.has(n),
    });
    expect(out).toHaveLength(2);
    expect(out.every((p) => ownedSet.has(p.name))).toBe(true);
  });

  it('combines filters as AND (species + bucket + query + ownedOnly)', () => {
    const ownedSet = new Set(['SK_SAMR_WARR_03_10TORS_HU01']);
    const out = filterAmgParts(PARTS, {
      ...baseOpts,
      species: 'Human',
      bucket: 'Upper Body',
      query: 'samurai',
      ownedOnly: true,
      isPartOwned: (n) => ownedSet.has(n),
    });
    expect(out).toHaveLength(1);
    expect(out[0].name).toBe('SK_SAMR_WARR_03_10TORS_HU01');
  });

  it('preserves input order within the filtered result', () => {
    const out = filterAmgParts(PARTS, { ...baseOpts, species: 'Human', bucket: 'All' });
    // Indices in original PARTS where species === Human, excluding starter packs
    const expectedNames = PARTS
      .filter((p) => p.species === 'Human' && !p.name.includes('MDRN_CIVL'))
      .map((p) => p.name);
    expect(out.map((p) => p.name)).toEqual(expectedNames);
  });
});

describe('groupAmgPartsByPack', () => {
  it('buckets parts by their pack prefix', () => {
    const grouped = groupAmgPartsByPack(PARTS.filter((p) => !p.name.includes('MDRN_CIVL')));
    expect(Object.keys(grouped).sort()).toEqual(['APOC_OUTL', 'GOBL_FIGT', 'SAMR_WARR']);
    expect(grouped.SAMR_WARR.length).toBe(4);
    expect(grouped.APOC_OUTL.length).toBe(3);
    expect(grouped.GOBL_FIGT.length).toBe(2);
  });

  it('preserves order within each pack', () => {
    const grouped = groupAmgPartsByPack(PARTS);
    const samurai = grouped.SAMR_WARR;
    expect(samurai[0].slot).toBe('Torso'); // first in PARTS
    expect(samurai[samurai.length - 1].slot).toBe('EyebrowLeft'); // last
  });
});
