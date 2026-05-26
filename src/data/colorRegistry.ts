/**
 * Color Registry — Unlockable tint colors for the AMG character system.
 *
 * Each color is a droppable item from loot boxes. Per-slot unlocks
 * (e.g. "Red for Tops" ≠ "Red for Hair") maximize loot box variety.
 * Starter colors (2 per slot) are free for all players.
 *
 * 64 total colors: 4 slots × 16 colors each.
 * 8 starters (free) + 56 loot-box-only.
 *
 * The tint system in @amg/character-runtime applies these as runtime
 * material overrides via SidekickColorProperty names (e.g. 'Hair 01',
 * 'Tops'). This registry defines WHICH colors exist and
 * gates access behind ownership.
 */

// ─── Types ────────────────────────────────────────────────────────────

/** 4-tier rarity matching lootBoxStore's LootBoxRarity (defined inline
 *  to avoid circular dep on the store module). */
type ColorRarity = 'common' | 'rare' | 'epic' | 'legendary';

export type TintSlot = 'hair' | 'tops' | 'pants' | 'shoes';

export interface TintColor {
  /** Stable ID: `tint_<slot>_<hexNoHash>` */
  id: string;
  /** Display name shown in loot box reveal + swatch tooltip */
  name: string;
  /** Hex color value with # prefix */
  hex: string;
  /** Which slot category this color belongs to */
  slot: TintSlot;
  /** The Sidekick material property this tints */
  property: string;
  /** Loot box rarity tier */
  rarity: ColorRarity;
  /** True = free for all players, no unlock needed */
  starter: boolean;
}

// ─── Slot → Sidekick property mapping ─────────────────────────────────

export const TINT_SLOT_PROPERTY: Record<TintSlot, string> = {
  hair:  'Hair 01',
  tops:  'Tops',
  pants: 'Bottoms',
  shoes: 'Shoes',
};

export const TINT_SLOT_LABEL: Record<TintSlot, string> = {
  hair:  'Hair',
  tops:  'Tops',
  pants: 'Pants',
  shoes: 'Shoes',
};

/** Build a stable color ID from slot + hex. */
export function tintColorId(slot: TintSlot, hex: string): string {
  return `tint_${slot}_${hex.replace('#', '').toLowerCase()}`;
}

// ─── Color definitions ────────────────────────────────────────────────

function def(
  slot: TintSlot,
  hex: string,
  name: string,
  rarity: ColorRarity,
  starter = false,
): TintColor {
  return {
    id: tintColorId(slot, hex),
    name,
    hex,
    slot,
    property: TINT_SLOT_PROPERTY[slot],
    rarity,
    starter,
  };
}

// ── Hair colors (16) ──────────────────────────────────────────────────
// 2 starters + 4 common + 4 rare + 4 epic + 2 legendary

const HAIR: TintColor[] = [
  // Starters (free)
  def('hair', '#1a1a2e', 'Midnight Black', 'common', true),
  def('hair', '#3d2914', 'Dark Brown',     'common', true),
  // Common
  def('hair', '#6b4423', 'Chestnut',       'common'),
  def('hair', '#8b6340', 'Light Brown',    'common'),
  def('hair', '#c4956a', 'Sandy Blonde',   'common'),
  def('hair', '#deb887', 'Golden Blonde',  'common'),
  // Rare
  def('hair', '#f0e68c', 'Platinum',       'rare'),
  def('hair', '#e8e8e8', 'Silver',         'rare'),
  def('hair', '#8b2020', 'Auburn',         'rare'),
  def('hair', '#cc3333', 'Crimson',        'rare'),
  // Epic
  def('hair', '#ff6b6b', 'Rose',           'epic'),
  def('hair', '#4a69bd', 'Ocean Blue',     'epic'),
  def('hair', '#6c5ce7', 'Violet',         'epic'),
  def('hair', '#2ecc71', 'Emerald',        'epic'),
  // Legendary
  def('hair', '#e67e22', 'Fire Orange',    'legendary'),
  def('hair', '#95a5a6', 'Ghost Gray',     'legendary'),
];

// ── Outfit colors (16 per slot × 3 slots) ─────────────────────────────
// Same palette for tops / pants / shoes — separate unlocks per slot.

function outfitSlot(slot: TintSlot): TintColor[] {
  return [
    // Starters (free)
    def(slot, '#f0f0f0', 'White',     'common', true),
    def(slot, '#2c2c2c', 'Black',     'common', true),
    // Common
    def(slot, '#4a5568', 'Slate',     'common'),
    def(slot, '#c53030', 'Red',       'common'),
    def(slot, '#2b6cb0', 'Blue',      'common'),
    def(slot, '#276749', 'Forest',    'common'),
    // Rare
    def(slot, '#975a16', 'Bronze',    'rare'),
    def(slot, '#6b46c1', 'Purple',    'rare'),
    def(slot, '#d69e2e', 'Gold',      'rare'),
    def(slot, '#2d3748', 'Charcoal',  'rare'),
    // Epic
    def(slot, '#38a169', 'Jade',      'epic'),
    def(slot, '#d53f8c', 'Hot Pink',  'epic'),
    def(slot, '#dd6b20', 'Tangerine', 'epic'),
    def(slot, '#319795', 'Teal',      'epic'),
    // Legendary
    def(slot, '#718096', 'Platinum',  'legendary'),
    def(slot, '#e53e3e', 'Scarlet',   'legendary'),
  ];
}

const TOPS:  TintColor[] = outfitSlot('tops');
const PANTS: TintColor[] = outfitSlot('pants');
const SHOES: TintColor[] = outfitSlot('shoes');

// ─── Exports ──────────────────────────────────────────────────────────

/** All unlockable tint colors across all slots (64 total). */
export const ALL_TINT_COLORS: TintColor[] = [...HAIR, ...TOPS, ...PANTS, ...SHOES];

/** Colors grouped by slot for UI rendering. */
export const TINT_COLORS_BY_SLOT: Record<TintSlot, TintColor[]> = {
  hair:  HAIR,
  tops:  TOPS,
  pants: PANTS,
  shoes: SHOES,
};

/** Set of starter color IDs — always owned, never in loot pool. */
export const STARTER_TINT_COLORS: Set<string> = new Set(
  ALL_TINT_COLORS.filter((c) => c.starter).map((c) => c.id),
);

/** Quick lookup: id → TintColor. */
export const TINT_COLOR_BY_ID: Record<string, TintColor> = {};
for (const color of ALL_TINT_COLORS) {
  TINT_COLOR_BY_ID[color.id] = color;
}
