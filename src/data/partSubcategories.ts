/**
 * Sub-category taxonomy for the GTA-style Clothes catalog.
 *
 * Pivot 2026-05-04: Devon's vision is shopping like GTA / Skyrim —
 * top-level categories (TOPS / BOTTOMS / SHOES / HAIR / FACE / HATS /
 * ACCESSORIES) split into sub-categories the player understands by
 * silhouette ("Hoodies" / "Shirts" / "Jackets" / etc.).
 *
 * The Synty manifest gives us slot codes (Torso, Hips, Legs, etc.)
 * but NOT a "this Torso is a hoodie vs a t-shirt" tag. We tag by
 * pack here — every part in `modern_civilians` is "Casual," every
 * part in `fantasy_knights` is "Armor," etc. As the manifest grows
 * we refine the tagging per-pack rather than per-part to keep this
 * file maintainable (200+ packs vs 2870+ parts).
 *
 * If a pack isn't in the table, the catalog falls back to "Other"
 * within each top-level bucket so nothing renders as untagged.
 */

import { packPrefixFromPartName } from './amgPartPricing';

// ─── Top-level buckets (mirror the bucket chip row in ClothesCatalog) ─

export type TopBucket =
  | 'tops'
  | 'pants'
  | 'shoes'
  | 'hair'
  | 'face'
  | 'hats'
  | 'accessories';

// ─── Sub-categories per top bucket ───────────────────────────────────
//
// The catalog renders sub-tabs INSIDE each top-bucket so the player
// drills down: TOPS → [All / Hoodies / Shirts / Jackets / Tanks / …].
// Order matters — left-to-right reading priority.

export const SUB_CATEGORIES: Record<TopBucket, string[]> = {
  tops:        ['All', 'Hoodies', 'Shirts', 'Jackets', 'Armor', 'Tanks', 'Sweaters', 'Other'],
  pants:       ['All', 'Pants', 'Cargos', 'Jeans', 'Shorts', 'Skirts', 'Robes', 'Other'],
  shoes:       ['All', 'Sneakers', 'Boots', 'Sandals', 'Dress', 'Other'],
  // 2026-05-23: FacialHair moved from FACE into HAIR per Devon — beards
  // and hairstyles read as one grooming choice in real life, so the
  // catalog mirrors that. Beard / Stubble / Sideburns sub-tabs live here.
  hair:        ['All', 'Short', 'Medium', 'Long', 'Buzzed', 'Styled', 'Beards', 'Stubble', 'Sideburns', 'Other'],
  face:        ['All', 'Brows', 'Ears', 'Other'],
  hats:        ['All', 'Caps', 'Helmets', 'Crowns', 'Hoods', 'Beanies', 'Other'],
  accessories: ['All', 'Backpacks', 'Belts', 'Pauldrons', 'Knee Pads', 'Bracers', 'Other'],
};

// ─── Pack → sub-category mapping ─────────────────────────────────────
//
// Each Sidekick pack (identified by its 9-char prefix like 'MDRN_CIVL')
// gets one sub-category per top bucket. A pack like Modern Civilians
// has casual tops AND casual pants AND sneakers, so we map the pack's
// parts to the right sub-category PER SLOT.
//
// Schema: { [packPrefix]: { tops, pants, shoes, hair, hats, accessories } }
// 'face' and 'hair' are species-driven (hair styles aren't pack-themed
// the way clothes are) so those are tagged below by slot pattern.

interface PackSubcategoryMap {
  tops?: string;
  pants?: string;
  shoes?: string;
  hats?: string;
  accessories?: string;
}

const PACK_SUBCATEGORIES: Record<string, PackSubcategoryMap> = {
  // Modern lifestyle packs — everyday casualwear
  MDRN_CIVL: { tops: 'Hoodies',  pants: 'Jeans',   shoes: 'Sneakers', hats: 'Caps',     accessories: 'Backpacks' },
  MDRN_CASH: { tops: 'Jackets',  pants: 'Pants',   shoes: 'Dress',    hats: 'Caps',     accessories: 'Belts' },
  MDRN_POLC: { tops: 'Armor',    pants: 'Cargos',  shoes: 'Boots',    hats: 'Helmets',  accessories: 'Belts' },
  MDRN_FIGT: { tops: 'Jackets',  pants: 'Cargos',  shoes: 'Boots',    hats: 'Helmets',  accessories: 'Bracers' },

  // Sci-Fi
  SCFI_CIVL: { tops: 'Jackets',  pants: 'Pants',   shoes: 'Boots',    hats: 'Caps',     accessories: 'Backpacks' },
  SCFI_SOLD: { tops: 'Armor',    pants: 'Cargos',  shoes: 'Boots',    hats: 'Helmets',  accessories: 'Pauldrons' },

  // Apocalypse / Survival
  APOC_OUTL: { tops: 'Jackets',  pants: 'Pants',   shoes: 'Boots',    hats: 'Hoods',    accessories: 'Belts' },
  APOC_SURV: { tops: 'Jackets',  pants: 'Cargos',  shoes: 'Boots',    hats: 'Hoods',    accessories: 'Backpacks' },
  APOC_ZOMB: { tops: 'Shirts',   pants: 'Pants',   shoes: 'Boots',    hats: 'Other',    accessories: 'Other' },

  // Fantasy
  FANT_VILL: { tops: 'Shirts',   pants: 'Pants',   shoes: 'Boots',    hats: 'Hoods',    accessories: 'Belts' },
  FANT_KNGT: { tops: 'Armor',    pants: 'Pants',   shoes: 'Boots',    hats: 'Helmets',  accessories: 'Pauldrons' },
  FANT_SKTN: { tops: 'Armor',    pants: 'Pants',   shoes: 'Boots',    hats: 'Helmets',  accessories: 'Pauldrons' },

  // Elven
  ELVN_WARR: { tops: 'Armor',    pants: 'Pants',   shoes: 'Boots',    hats: 'Helmets',  accessories: 'Pauldrons' },

  // Goblin
  GOBL_FIGT: { tops: 'Armor',    pants: 'Pants',   shoes: 'Boots',    hats: 'Helmets',  accessories: 'Pauldrons' },

  // Pirates / Samurai / Vikings
  PIRT_CAPT: { tops: 'Jackets',  pants: 'Pants',   shoes: 'Boots',    hats: 'Hats',     accessories: 'Belts' } as any,
  SAMR_WARR: { tops: 'Armor',    pants: 'Robes',   shoes: 'Sandals',  hats: 'Helmets',  accessories: 'Pauldrons' },
  VIKG_WARR: { tops: 'Armor',    pants: 'Pants',   shoes: 'Boots',    hats: 'Helmets',  accessories: 'Pauldrons' },
};

// Slot → top-bucket map. Used to resolve a part to its top bucket.
const SLOT_TO_BUCKET: Record<string, TopBucket> = {
  Torso:                'tops',
  ArmUpperLeft:         'tops',
  ArmUpperRight:        'tops',
  ArmLowerLeft:         'tops',
  ArmLowerRight:        'tops',
  HandLeft:             'tops',
  HandRight:            'tops',
  Hips:                 'pants',
  LegLeft:              'pants',
  LegRight:             'pants',
  FootLeft:             'shoes',
  FootRight:            'shoes',
  Hair:                 'hair',
  EyebrowLeft:          'face',
  EyebrowRight:         'face',
  EarLeft:              'face',
  EarRight:             'face',
  // 2026-05-23: FacialHair lives in HAIR now (was 'face'). Beards
  // are a grooming choice, not a facial-feature choice — pairing them
  // with hairstyles matches what Devon expected to find on the same tab.
  FacialHair:           'hair',
  AttachmentHead:       'hats',
  AttachmentFace:       'accessories',
  AttachmentBack:       'accessories',
  AttachmentHipsFront:  'accessories',
  AttachmentHipsBack:   'accessories',
  AttachmentHipsLeft:   'accessories',
  AttachmentHipsRight:  'accessories',
  AttachmentShoulderLeft:  'accessories',
  AttachmentShoulderRight: 'accessories',
  AttachmentElbowLeft:  'accessories',
  AttachmentElbowRight: 'accessories',
  AttachmentKneeLeft:   'accessories',
  AttachmentKneeRight:  'accessories',
};

// ─── Hair / Face per-slot heuristics ─────────────────────────────────
//
// Hair sub-categories aren't pack-themed (a "Modern Civilians" hair
// could be short or long depending on variant). These get tagged by
// part-name pattern when possible, otherwise default to 'Other'.
//
// For v1 we lean on the 4-letter pack-name suffix when present. As
// the catalog grows Devon can add per-part overrides below.

function hairSubcategoryFor(partName: string, slot: string): string {
  // FacialHair parts (now living in the HAIR bucket as of 2026-05-23)
  // get beard-flavored sub-tags. Stubble / Sideburns are name-pattern
  // hints; default beard slot reads as 'Beards' so the player always
  // has a bucket to land in.
  if (slot === 'FacialHair') {
    const lower = partName.toLowerCase();
    if (lower.includes('stubble') || lower.includes('5o')) return 'Stubble';
    if (lower.includes('sideburn') || lower.includes('side_burn')) return 'Sideburns';
    return 'Beards';
  }
  // Synty hair name patterns mostly encode length in the first segment.
  // No reliable pattern across all 5 species — default to 'Styled' so
  // every hair is buy-able. Refine here as variants get authored.
  const lower = partName.toLowerCase();
  if (lower.includes('buzz') || lower.includes('shave') || lower.includes('crop')) return 'Buzzed';
  if (lower.includes('long') || lower.includes('flow')) return 'Long';
  if (lower.includes('short')) return 'Short';
  if (lower.includes('mid')  || lower.includes('mediu')) return 'Medium';
  return 'Styled';
}

function faceSubcategoryFor(slot: string): string {
  if (slot === 'EyebrowLeft' || slot === 'EyebrowRight') return 'Brows';
  if (slot === 'EarLeft' || slot === 'EarRight') return 'Ears';
  return 'Other';
}

function accessorySubcategoryFor(slot: string): string {
  if (slot === 'AttachmentBack') return 'Backpacks';
  if (slot.startsWith('AttachmentHips')) return 'Belts';
  if (slot.startsWith('AttachmentShoulder')) return 'Pauldrons';
  if (slot.startsWith('AttachmentKnee')) return 'Knee Pads';
  if (slot.startsWith('AttachmentElbow')) return 'Bracers';
  return 'Other';
}

// ─── Public API ─────────────────────────────────────────────────────

/** Resolve the top-level bucket (TOPS/PANTS/etc.) for a Synty slot. */
export function bucketForSlot(slot: string): TopBucket | null {
  return SLOT_TO_BUCKET[slot] ?? null;
}

/** Resolve the sub-category label for a (pack, slot, partName) trio.
 *  Falls back through pack-table → slot-heuristic → 'Other'. */
export function subcategoryForPart(partName: string, slot: string): string {
  const bucket = bucketForSlot(slot);
  if (!bucket) return 'Other';

  // Hair: name-pattern heuristic (no pack tagging — same pack has
  // multiple hair lengths). Slot-aware so FacialHair (now in this
  // bucket) routes to Beards / Stubble / Sideburns instead of length
  // categories.
  if (bucket === 'hair') return hairSubcategoryFor(partName, slot);

  // Face: slot-driven taxonomy (brows / beards / ears).
  if (bucket === 'face') return faceSubcategoryFor(slot);

  // Accessories: slot-driven (backpack vs belt vs pauldron).
  if (bucket === 'accessories') return accessorySubcategoryFor(slot);

  // Tops / Pants / Shoes / Hats: pack-table tagging.
  const pack = packPrefixFromPartName(partName);
  const map = PACK_SUBCATEGORIES[pack];
  if (!map) return 'Other';
  return map[bucket as keyof PackSubcategoryMap] ?? 'Other';
}

/** Sub-category list for the active top bucket — drives the
 *  ClothesCatalog sub-tab row. Always starts with 'All'. */
export function subcategoriesForBucket(bucket: TopBucket): string[] {
  return SUB_CATEGORIES[bucket] ?? ['All', 'Other'];
}
