/**
 * Part Fashion Names — human-readable display names for every clothing item.
 *
 * Instead of showing "TORSO #06" on the card, we show "Puffer Vest".
 * Names were identified from the Unity-rendered thumbnail PNGs and matched
 * to real fashion/costume terminology.
 *
 * Convention:
 * - Modern packs → real fashion names (Puffer Vest, Zip Hoodie, etc.)
 * - Fantasy/Sci-fi/Historical packs → thematic costume names (Plate Cuirass, etc.)
 * - Base/starter parts → simple descriptive names (Base Top, etc.)
 *
 * If a part isn't in this registry, the card falls back to "SLOT #VAR"
 * (the old behavior). Add names as new packs ship.
 */

// ─── Registry ────────────────────────────────────────────────────────

const FASHION_NAMES: Record<string, string> = {
  // ═══════════════════════════════════════════════════════════════════
  // TORSO (10TORS)
  // ═══════════════════════════════════════════════════════════════════

  // ── Modern Civilians (MDRN_CIVL) ──
  'SK_MDRN_CIVL_01_10TORS_HU01': 'Crewneck',
  'SK_MDRN_CIVL_02_10TORS_HU01': 'V-Neck Tee',
  'SK_MDRN_CIVL_03_10TORS_HU01': 'Henley',
  'SK_MDRN_CIVL_04_10TORS_HU02': 'Fitted Tee',
  'SK_MDRN_CIVL_05_10TORS_HU01': 'Crop Top',
  'SK_MDRN_CIVL_06_10TORS_HU01': 'Puffer Vest',
  'SK_MDRN_CIVL_07_10TORS_HU01': 'Zip Hoodie',
  'SK_MDRN_CIVL_08_10TORS_HU01': 'Denim Jacket',
  'SK_MDRN_CIVL_09_10TORS_HU01': 'Prep Layer',
  'SK_MDRN_CIVL_10_10TORS_HU01': 'Barista Apron',
  'SK_MDRN_CIVL_11_10TORS_HU01': 'Tactical Top',
  'SK_MDRN_CIVL_12_10TORS_HU01': 'Sailor Top',
  'SK_MDRN_CIVL_13_10TORS_HU01': 'Polo',
  'SK_MDRN_CIVL_14_10TORS_HU01': 'Tac Vest',
  'SK_MDRN_CIVL_15_10TORS_HU01': 'Anorak',
  'SK_MDRN_CIVL_16_10TORS_HU01': 'Cowl Tank',
  'SK_MDRN_CIVL_17_10TORS_HU01': 'Tank Top',
  'SK_MDRN_CIVL_18_10TORS_HU01': 'Baseball Tee',

  // ── Apocalypse Outlaws (APOC_OUTL) ──
  'SK_APOC_OUTL_01_10TORS_HU01': 'Scrap Plate',
  'SK_APOC_OUTL_02_10TORS_HU01': 'Raider Harness',
  'SK_APOC_OUTL_03_10TORS_HU01': 'Spike Plates',
  'SK_APOC_OUTL_04_10TORS_HU01': 'Wasteland Vest',
  'SK_APOC_OUTL_05_10TORS_HU01': 'Road Warrior',
  'SK_APOC_OUTL_06_10TORS_HU01': 'Scavenger Wrap',
  'SK_APOC_OUTL_07_10TORS_HU01': 'Bone Armor',
  'SK_APOC_OUTL_08_10TORS_HU01': 'Chain Harness',
  'SK_APOC_OUTL_09_10TORS_HU01': 'Junkyard Coat',
  'SK_APOC_OUTL_10_10TORS_HU01': 'War Paint',

  // ── Apocalypse Survivors (APOC_SURV) ──
  'SK_APOC_SURV_01_10TORS_HU01': 'Survivor Sling',
  'SK_APOC_SURV_02_10TORS_HU01': 'Patched Hoodie',
  'SK_APOC_SURV_03_10TORS_HU01': 'Makeshift Vest',
  'SK_APOC_SURV_04_10TORS_HU01': 'Cargo Jacket',
  'SK_APOC_SURV_05_10TORS_HU01': 'Field Medic',
  'SK_APOC_SURV_06_10TORS_HU01': 'Scrap Poncho',

  // ── Pirate Captains (PIRT_CAPT) ──
  'SK_PIRT_CAPT_01_10TORS_HU01': 'Baldric Coat',
  'SK_PIRT_CAPT_02_10TORS_HU01': 'Gunner Jacket',
  'SK_PIRT_CAPT_03_10TORS_HU01': 'Captain Longcoat',
  'SK_PIRT_CAPT_04_10TORS_HU01': 'Corsair Vest',
  'SK_PIRT_CAPT_05_10TORS_HU01': 'First Mate',
  'SK_PIRT_CAPT_06_10TORS_HU01': 'Deckhand Shirt',
  'SK_PIRT_CAPT_07_10TORS_HU01': 'Admiral Coat',
  'SK_PIRT_CAPT_08_10TORS_HU01': 'Buccaneer Wrap',
  'SK_PIRT_CAPT_09_10TORS_HU01': 'Seafarer Tunic',
  'SK_PIRT_CAPT_10_10TORS_HU01': 'Mariner Jerkin',

  // ── Fantasy Knights (FANT_KNGT) ──
  'SK_FANT_KNGT_01_10TORS_HU01': 'Lion Cuirass',
  'SK_FANT_KNGT_02_10TORS_HU01': 'Plate Cuirass',
  'SK_FANT_KNGT_03_10TORS_HU01': 'Chain Hauberk',
  'SK_FANT_KNGT_04_10TORS_HU01': 'Knight Tabard',
  'SK_FANT_KNGT_05_10TORS_HU01': 'Crusader Mail',
  'SK_FANT_KNGT_06_10TORS_HU01': 'Squire Tunic',
  'SK_FANT_KNGT_17_10TORS_HU01': 'Royal Guard',

  // ── Fantasy Villains (FANT_VILL) ──
  'SK_FANT_VILL_01_10TORS_HU01': 'Peasant Vest',
  'SK_FANT_VILL_02_10TORS_HU01': 'Dark Robe',
  'SK_FANT_VILL_03_10TORS_HU01': 'Warlock Wrap',
  'SK_FANT_VILL_04_10TORS_HU01': 'Shadow Cloak',
  'SK_FANT_VILL_05_10TORS_HU01': 'Necro Harness',
  'SK_FANT_VILL_06_10TORS_HU01': 'Dark Plate',
  'SK_FANT_VILL_07_10TORS_HU01': 'Dark Mantle',

  // ── Sci-Fi Soldiers (SCFI_SOLD) ──
  'SK_SCFI_SOLD_01_10TORS_HU01': 'Assault Rig',
  'SK_SCFI_SOLD_02_10TORS_HU01': 'Recon Vest',
  'SK_SCFI_SOLD_03_10TORS_HU01': 'Heavy Plating',
  'SK_SCFI_SOLD_04_10TORS_HU01': 'Stealth Suit',
  'SK_SCFI_SOLD_05_10TORS_HU01': 'Exo Frame',
  'SK_SCFI_SOLD_06_10TORS_HU01': 'Commando Rig',
  'SK_SCFI_SOLD_07_10TORS_HU01': 'Drop Trooper',
  'SK_SCFI_SOLD_08_10TORS_HU01': 'Mech Harness',
  'SK_SCFI_SOLD_09_10TORS_HU01': 'Spec Ops',
  'SK_SCFI_SOLD_10_10TORS_HU01': 'Void Walker',

  // ── Sci-Fi Civilians (SCFI_CIVL) ──
  'SK_SCFI_CIVL_01_10TORS_HU01': 'Flight Suit',
  'SK_SCFI_CIVL_02_10TORS_HU01': 'Tech Jacket',
  'SK_SCFI_CIVL_03_10TORS_HU01': 'Neon Hoodie',
  'SK_SCFI_CIVL_04_10TORS_HU01': 'Cyber Vest',
  'SK_SCFI_CIVL_05_10TORS_HU01': 'Smuggler Coat',
  'SK_SCFI_CIVL_06_10TORS_HU01': 'Colony Suit',
  'SK_SCFI_CIVL_07_10TORS_HU01': 'Drift Poncho',
  'SK_SCFI_CIVL_09_10TORS_HU01': 'Station Wrap',

  // ── Modern Police (MDRN_POLC) ──
  'SK_MDRN_POLC_01_10TORS_HU01': 'Duty Shirt',
  'SK_MDRN_POLC_02_10TORS_HU01': 'Patrol Vest',
  'SK_MDRN_POLC_03_10TORS_HU01': 'Riot Gear',
  'SK_MDRN_POLC_04_10TORS_HU01': 'Detective Coat',
  'SK_MDRN_POLC_05_10TORS_HU01': 'SWAT Plate',
  'SK_MDRN_POLC_06_10TORS_HU01': 'Tactical Shirt',
  'SK_MDRN_POLC_07_10TORS_HU01': 'Undercover',
  'SK_MDRN_POLC_08_10TORS_HU01': 'K-9 Unit',
  'SK_MDRN_POLC_09_10TORS_HU01': 'Captain',

  // ── Viking Warriors (VIKG_WARR) ──
  'SK_VIKG_WARR_01_10TORS_HU01': 'Studded Baldric',
  'SK_VIKG_WARR_02_10TORS_HU01': 'Fur Mantle',
  'SK_VIKG_WARR_03_10TORS_HU01': 'Raider Mail',
  'SK_VIKG_WARR_04_10TORS_HU01': 'War Chief',
  'SK_VIKG_WARR_05_10TORS_HU01': 'Berserker Wrap',
  'SK_VIKG_WARR_06_10TORS_HU01': 'Shield Maiden',

  // ── Samurai Warriors (SAMR_WARR) ──
  'SK_SAMR_WARR_01_10TORS_HU01': 'Lamellar',
  'SK_SAMR_WARR_02_10TORS_HU01': 'Ronin Robe',
  'SK_SAMR_WARR_03_10TORS_HU01': 'Shogun Plate',
  'SK_SAMR_WARR_04_10TORS_HU01': 'Ninja Wrap',
  'SK_SAMR_WARR_05_10TORS_HU01': 'Ashigaru Armor',
  'SK_SAMR_WARR_06_10TORS_HU01': 'Daimyo Robe',

  // ── Elven Warriors (ELVN_WARR) ──
  'SK_ELVN_WARR_01_10TORS_HU01': 'Ranger Wrap',
  'SK_ELVN_WARR_02_10TORS_HU01': 'Elven Mail',
  'SK_ELVN_WARR_03_10TORS_HU01': 'Sylvan Robe',
  'SK_ELVN_WARR_04_10TORS_HU01': 'Leaf Armor',
  'SK_ELVN_WARR_05_10TORS_HU01': 'Arcane Tunic',
  'SK_ELVN_WARR_06_10TORS_HU01': 'High Elf Plate',

  // ── Fantasy Skeletons (FANT_SKTN) ──
  'SK_FANT_SKTN_01_10TORS_SN01': 'Bone Cage',
  'SK_FANT_SKTN_02_10TORS_SN01': 'Rib Plate',
  'SK_FANT_SKTN_03_10TORS_SN01': 'Crypt Rags',
  'SK_FANT_SKTN_04_10TORS_SN01': 'Tomb Guard',
  'SK_FANT_SKTN_05_10TORS_SN01': 'Wraith Shroud',
  'SK_FANT_SKTN_06_10TORS_SN01': 'Death Knight',
  'SK_FANT_SKTN_07_10TORS_SN01': 'Lich Mantle',

  // ── Goblin Fighters (GOBL_FIGT) ──
  'SK_GOBL_FIGT_01_10TORS_GO01': 'Scrap Chest',
  'SK_GOBL_FIGT_02_10TORS_GO01': 'Fang Harness',
  'SK_GOBL_FIGT_03_10TORS_GO01': 'Warboss Plate',
  'SK_GOBL_FIGT_04_10TORS_GO01': 'Shaman Wrap',
  'SK_GOBL_FIGT_05_10TORS_GO01': 'Cave Armor',
  'SK_GOBL_FIGT_06_10TORS_GO01': 'Raider Rig',
  'SK_GOBL_FIGT_07_10TORS_GO01': 'Tribal Vest',
  'SK_GOBL_FIGT_08_10TORS_GO01': 'Tinkerer Apron',
  'SK_GOBL_FIGT_09_10TORS_GO01': 'Chieftain Mail',
  'SK_GOBL_FIGT_10_10TORS_GO01': 'Bone Trophy',

  // ── Zombie Base (ZOMB_BASE) ──
  'SK_ZOMB_BASE_01_10TORS_ZB01': 'Torn Shirt',
  'SK_ZOMB_BASE_02_10TORS_ZB01': 'Shredded Hoodie',
  'SK_ZOMB_BASE_03_10TORS_ZB01': 'Ripped Jacket',
  'SK_ZOMB_BASE_04_10TORS_ZB01': 'Hospital Gown',
  'SK_ZOMB_BASE_05_10TORS_ZB01': 'Tattered Suit',
  'SK_ZOMB_BASE_06_10TORS_ZB01': 'Bloody Scrubs',
  'SK_ZOMB_BASE_07_10TORS_ZB01': 'Decayed Vest',
  'SK_ZOMB_BASE_08_10TORS_ZB01': 'Corpse Rags',
  'SK_ZOMB_BASE_09_10TORS_ZB01': 'Gravedigger',

  // ── Base species (1 each) ──
  'SK_HUMN_BASE_01_10TORS_HU01': 'Base Top',
  'SK_ELVN_BASE_01_10TORS_EV01': 'Elven Base',
  'SK_GOBL_BASE_01_10TORS_GO01': 'Goblin Base',
  'SK_SKTN_BASE_01_10TORS_SN01': 'Skeleton Base',

  // ═══════════════════════════════════════════════════════════════════
  // LEGS (20LEGS) — extend as thumbnails are identified
  // ═══════════════════════════════════════════════════════════════════

  // ── Modern Civilians ──
  'SK_MDRN_CIVL_01_20LEGS_HU01': 'Slim Jeans',
  'SK_MDRN_CIVL_02_20LEGS_HU01': 'Cargo Pants',
  'SK_MDRN_CIVL_03_20LEGS_HU01': 'Joggers',
  'SK_MDRN_CIVL_04_20LEGS_HU01': 'Chinos',
  'SK_MDRN_CIVL_05_20LEGS_HU01': 'Shorts',
  'SK_MDRN_CIVL_06_20LEGS_HU01': 'Wide Leg',
  'SK_MDRN_CIVL_07_20LEGS_HU01': 'Pleated Trousers',
  'SK_MDRN_CIVL_08_20LEGS_HU01': 'Baggy Jeans',
  'SK_MDRN_CIVL_09_20LEGS_HU01': 'Leggings',
  'SK_MDRN_CIVL_10_20LEGS_HU01': 'Mini Skirt',
  'SK_MDRN_CIVL_11_20LEGS_HU01': 'Sweatpants',

  // ═══════════════════════════════════════════════════════════════════
  // FEET (30FEET) — extend as thumbnails are identified
  // ═══════════════════════════════════════════════════════════════════

  // ── Modern Civilians ──
  'SK_MDRN_CIVL_01_30FEET_HU01': 'Sneakers',
  'SK_MDRN_CIVL_02_30FEET_HU01': 'High Tops',
  'SK_MDRN_CIVL_03_30FEET_HU01': 'Boots',
  'SK_MDRN_CIVL_04_30FEET_HU01': 'Loafers',
  'SK_MDRN_CIVL_05_30FEET_HU01': 'Sandals',
  'SK_MDRN_CIVL_06_30FEET_HU01': 'Chelsea Boots',
  'SK_MDRN_CIVL_07_30FEET_HU01': 'Platforms',
  'SK_MDRN_CIVL_08_30FEET_HU01': 'Combat Boots',
};

// ─── Lookup ──────────────────────────────────────────────────────────

/**
 * Get the fashion display name for a part. Returns undefined when the
 * part hasn't been named yet — callers fall back to "SLOT #VAR".
 */
export function getPartFashionName(partName: string): string | undefined {
  return FASHION_NAMES[partName];
}

/** Total named items (for devtools/stats). */
export const FASHION_NAME_COUNT = Object.keys(FASHION_NAMES).length;
