/**
 * Character Store (AMG-native)
 *
 * Tracks the player's character entirely as an AMG `CharacterState`:
 *  - species + per-slot equipped part names + colors + blendshapes
 *  - which AMG parts the player owns (drives lock chips in the creator)
 *  - which outfit packs / cards are owned (drives shop/collection state)
 *  - the currently-equipped outfit pack id (legacy concept; mirrors the
 *    Torso part swap performed by `equipOutfitPack`)
 *
 * The legacy single-GLB `CharacterCustomization` shape (outfitId + skin /
 * hair / outfit colors / body sliders) was retired in the Path A migration
 * — every renderer reads `amgCharacter` and every editor writes it.
 */

import { create } from 'zustand';
// Import from the runtime's submodules instead of the package index so
// the test runner can load this without dragging in CompositeCharacter
// (which pulls React + R3F). The runtime ships its data/types from leaf
// modules, so this is safe and matches npcCustomizations.ts.
import type { CharacterState } from '@amg/character-runtime/types';
import { STARTER_HUMAN_CHARACTER } from '@amg/character-runtime/types';
import { saveState, loadState } from '../services/storage';
import { isStarterPack, packPrefixFromPartName } from '../data/amgPartPricing';
import { buildAmgBodyForOutfit } from '../data/npcCustomizations';
import { STARTER_TINT_COLORS } from '../data/colorRegistry';
import { DEFAULT_PALETTE } from '@amg/cosmetic-ui';
import { DEFAULT_COLORS_BY_SPECIES } from '@amg/character-runtime/types';

// AMG character state in the store stays loosely typed (Record<string,
// unknown>) so the store doesn't take a hard import dep on the runtime
// type at construction time. We cast at API boundaries.
type AmgCharacterState = Record<string, unknown>;

// ── Store shape ────────────────────────────────────────────────────────

interface CharacterStoreState {
  /** Source of truth for what the player looks like. Seeded at boot in
   *  App.tsx if the store hydrated to null. */
  amgCharacter: AmgCharacterState | null;

  /** Outfit-pack ownership. Players own these packs by purchasing them
   *  in the shop or earning them via career/loot rewards. Starter packs
   *  count as owned via STARTER_OUTFITS even when not enumerated here. */
  ownedOutfits: string[];

  /** Currently-equipped outfit pack id (e.g. 'human_modern_civilians_03').
   *  Mirrors the Torso slot in amgCharacter — kept as a top-level field so
   *  the shop's "EQUIPPED" badge can do an O(1) check without parsing
   *  part names. Updated by `equipOutfitPack`. */
  equippedOutfitId: string;

  /** GTA-meets-Sims AMG part ownership. Every Sidekick part the player
   *  has bought (by exact part name like 'SK_SAMR_WARR_03_10TORS_HU01').
   *  STARTER_PACKS are treated as owned for free — `isAmgPartOwned()`
   *  reads this set plus the starter override. */
  ownedAmgParts: string[];

  /** Unlock timestamps for AMG parts — `partName → epoch millis` at
   *  purchase time. The Shop reads this to show a "NEW" badge for parts
   *  unlocked in the last 7 days. */
  amgPartUnlockedAt: Record<string, number>;

  /** True after the player has seen the "starter wardrobe unlocked"
   *  toast. Gates CharacterCreatorScreen's first-open ceremony so the
   *  toast doesn't fire every time they open the creator. */
  amgStarterSeen: boolean;

  /** Color-variant ownership per AMG part — Path A from the variant
   *  pivot 2026-05-04. Each owned part can have N color variants
   *  unlocked independently (the "Goku transformations" model — same
   *  base part, different color). Default variant is the empty string
   *  '' which represents the as-rendered Synty default colorway.
   *
   *  Backward-compat: if a player owns a part via the legacy
   *  `ownedAmgParts` set but has nothing in `ownedPartVariants` for
   *  that part, the runtime treats it as owning the default variant.
   *  Migration on load populates `[''] (default)` for every part in
   *  `ownedAmgParts` so the new ownership map is always consistent.
   *
   *  Variant id format: typically a color slug ('red', 'cyan',
   *  'gold', 'camo'), but the lootbox can mint any unique string per
   *  drop. Empty-string '' is reserved for the default colorway. */
  ownedPartVariants: Record<string, string[]>;

  /** Currently-equipped color variant per (slot, part) — keyed by
   *  partName so swapping variants on an already-equipped part is a
   *  one-line update. Empty string means "default colorway." */
  equippedPartVariant: Record<string, string>;

  /** Equipped equipped pack-VARIANT — separate from equippedOutfitId
   *  so a single pack can be worn in multiple colorways without
   *  forking the pack id. '' = default. Drives the COLOR tab of
   *  the creator and the Goku-gallery picker. */
  equippedOutfitVariant: string;

  /** Unlockable tint color ownership. Each id is a color registry entry
   *  like 'tint_hair_c53030'. Starter colors are implicitly owned (checked
   *  via STARTER_TINT_COLORS set) and never appear here. */
  ownedTintColors: string[];

  // ── Actions ──
  setAmgCharacter: (next: AmgCharacterState) => void;
  /** Equip a single AMG part (Torso, Hair, AttachmentBack, etc.) into
   *  the named slot without touching anything else. Lets the shop equip
   *  in-place after a buy without bouncing the player to the creator. */
  equipAmgPart: (slot: string, partName: string) => void;
  /** Unequip a slot — reverts to starter default if the slot is
   *  required (body parts), or removes the part entirely for optional
   *  slots (beard, hats, accessories). For hero-slot subs, also
   *  reverts companion slots. */
  unequipSlot: (slot: string, companionSlots?: string[]) => void;
  /** Equip a specific color variant of a part. Auto-equips the part
   *  too if it's not already in the active loadout. */
  equipPartVariant: (slot: string, partName: string, variantId: string) => void;
  /** Equip an outfit pack: swaps the body slots (Hair, Torso, Hips, arms,
   *  hands, legs, feet) into amgCharacter without touching the player's
   *  Head / Eyebrows. Also sets equippedOutfitId. */
  equipOutfitPack: (outfitId: string) => void;
  /** Unlock an outfit pack: tracks ownership AND unlocks the underlying
   *  AMG parts so they're available in the creator's pickers. */
  unlockOutfit: (id: string) => void;
  unlockAmgPart: (name: string) => void;
  /** Unlock a specific color variant of a part. Adds to the part's
   *  variant set; auto-unlocks the base part too if not already owned. */
  unlockPartVariant: (partName: string, variantId: string) => void;
  markAmgStarterSeen: () => void;
  isOutfitOwned: (id: string) => boolean;
  isAmgPartOwned: (name: string) => boolean;
  /** True when the player owns the given (part, variant) tuple.
   *  Variant '' = default colorway, always owned if base part is owned. */
  isPartVariantOwned: (partName: string, variantId: string) => boolean;
  /** All variant ids the player owns for the given part (includes ''
   *  default when the base part is owned). */
  ownedVariantsForPart: (partName: string) => string[];
  /** Apply a camo variant to the entire outfit (CoD model). Sets
   *  equippedOutfitVariant AND updates the outfit color properties so
   *  the 3D renderer shows the variant colors immediately. Pass '' to
   *  revert to the player's manual tint colors. */
  setOutfitVariant: (variantId: string) => void;
  /** Unlock a tint color from the color registry (loot box grant). */
  unlockTintColor: (colorId: string) => void;
  /** True when the player owns this tint color (or it's a starter). */
  isTintColorOwned: (colorId: string) => boolean;
  loadFromStorage: () => Promise<void>;
}

const STORAGE_KEY = 'drop4_character';

interface PersistedCharacter {
  amgCharacter?: AmgCharacterState | null;
  ownedOutfits?: string[];
  equippedOutfitId?: string;
  ownedAmgParts?: string[];
  amgPartUnlockedAt?: Record<string, number>;
  amgStarterSeen?: boolean;
  ownedPartVariants?: Record<string, string[]>;
  equippedPartVariant?: Record<string, string>;
  equippedOutfitVariant?: string;
  ownedTintColors?: string[];
  /** Legacy field — pre-Path-A migration. Read once on load to recover the
   *  player's last-equipped outfit; never written. After the first load
   *  the migrated value lives in `equippedOutfitId`. */
  customization?: { outfitId?: string };
}

/** The default colorway id — represents the as-rendered Synty default
 *  material colors that ship with each part. Whenever the player owns
 *  the base part (legacy ownership), they always own this variant. */
export const DEFAULT_VARIANT_ID = '';

// Starter outfits every player owns for free (one per species). These
// IDs come from `outfitRegistry.ts` — adding more here grants free
// access to additional packs at boot for new and returning users.
const STARTER_OUTFITS = [
  'human_modern_civilians_01',
  'human_modern_civilians_02',
];

const DEFAULT_EQUIPPED_OUTFIT = 'human_modern_civilians_01';

// ── Helpers ───────────────────────────────────────────────────────────

/** Count unique camo variant IDs across all owned parts. Deduplicates
 *  because the same variantId can appear on multiple parts — we only
 *  count distinct colorways the player has collected. */
export function countUniqueCamos(
  ownedPartVariants: Record<string, string[]>,
): number {
  const seen = new Set<string>();
  for (const ids of Object.values(ownedPartVariants)) {
    for (const id of ids) seen.add(id);
  }
  return seen.size;
}

// ── Store ──────────────────────────────────────────────────────────────

export const useCharacterStore = create<CharacterStoreState>((set, get) => ({
  amgCharacter: null,
  ownedOutfits: [...STARTER_OUTFITS],
  equippedOutfitId: DEFAULT_EQUIPPED_OUTFIT,
  ownedAmgParts: [],
  amgPartUnlockedAt: {},
  amgStarterSeen: false,
  ownedPartVariants: {},
  equippedPartVariant: {},
  equippedOutfitVariant: DEFAULT_VARIANT_ID,
  ownedTintColors: [],

  setAmgCharacter: (next) => set({ amgCharacter: next }),

  equipAmgPart: (slot, partName) => set((s) => {
    const current = s.amgCharacter as unknown as CharacterState | null;
    const baseChar = current ?? STARTER_HUMAN_CHARACTER;
    return {
      amgCharacter: {
        ...baseChar,
        parts: { ...baseChar.parts, [slot]: partName },
      } as unknown as AmgCharacterState,
    };
  }),

  unequipSlot: (slot, companionSlots) => set((s) => {
    const current = s.amgCharacter as unknown as CharacterState | null;
    const baseChar = current ?? STARTER_HUMAN_CHARACTER;
    const nextParts: Record<string, string> = { ...(baseChar.parts as Record<string, string>) };
    const starterParts = STARTER_HUMAN_CHARACTER.parts as Record<string, string>;
    const slotsToRevert = [slot, ...(companionSlots ?? [])];
    for (const sl of slotsToRevert) {
      if (starterParts[sl]) {
        nextParts[sl] = starterParts[sl];
      } else {
        delete nextParts[sl];
      }
    }
    return {
      amgCharacter: {
        ...baseChar,
        parts: nextParts,
      } as unknown as AmgCharacterState,
    };
  }),

  equipOutfitPack: (outfitId) => set((s) => {
    const current = s.amgCharacter as unknown as CharacterState | null;
    const bodyParts = buildAmgBodyForOutfit(outfitId);
    const nextCharacter: CharacterState = current
      ? { ...current, parts: { ...current.parts, ...bodyParts } }
      : { ...STARTER_HUMAN_CHARACTER, parts: { ...STARTER_HUMAN_CHARACTER.parts, ...bodyParts } };
    return {
      amgCharacter: nextCharacter as unknown as AmgCharacterState,
      equippedOutfitId: outfitId,
    };
  }),

  unlockOutfit: (id) => set((s) => {
    if (s.ownedOutfits.includes(id)) return s;
    // Auto-unlock the underlying AMG parts so the player can mix-and-match
    // them in the creator immediately after purchase.
    const partNames = Object.values(buildAmgBodyForOutfit(id)).filter(
      (n): n is string => typeof n === 'string',
    );
    const nextOwnedParts = [...s.ownedAmgParts];
    const nextUnlockedAt = { ...s.amgPartUnlockedAt };
    const now = Date.now();
    for (const name of partNames) {
      if (!nextOwnedParts.includes(name)) {
        nextOwnedParts.push(name);
        nextUnlockedAt[name] = now;
      }
    }
    return {
      ownedOutfits: [...s.ownedOutfits, id],
      ownedAmgParts: nextOwnedParts,
      amgPartUnlockedAt: nextUnlockedAt,
    };
  }),

  isOutfitOwned: (id) => get().ownedOutfits.includes(id) || STARTER_OUTFITS.includes(id),

  // AMG part unlocks. Called from the shop after a successful purchase;
  // the creator reads ownership via isAmgPartOwned() to decide whether
  // to show a lock overlay / buy prompt on a part grid thumbnail.
  unlockAmgPart: (name) => set((s) => {
    if (s.ownedAmgParts.includes(name)) return s;
    return {
      ownedAmgParts: [...s.ownedAmgParts, name],
      amgPartUnlockedAt: { ...s.amgPartUnlockedAt, [name]: Date.now() },
    };
  }),
  isAmgPartOwned: (name) => {
    if (isStarterPack(packPrefixFromPartName(name))) return true;
    return get().ownedAmgParts.includes(name);
  },

  // ── Variant ownership API ────────────────────────────────────
  // Path A from the 2026-05-04 pivot: each part can have N color
  // variants unlocked independently. Starter / base ownership
  // implicitly grants the default variant '' so legacy saves keep
  // working without migration on the player's end. New variant drops
  // populate `ownedPartVariants[partName]` with the variant id.

  unlockPartVariant: (partName, variantId) => set((s) => {
    // Auto-unlock the base part too — variants are meaningless if
    // the part itself isn't in the loadout pickers. Mirrors GTA's
    // "first colorway buy unlocks the silhouette."
    const next: Partial<CharacterStoreState> = {};
    if (!s.ownedAmgParts.includes(partName)) {
      next.ownedAmgParts = [...s.ownedAmgParts, partName];
      next.amgPartUnlockedAt = { ...s.amgPartUnlockedAt, [partName]: Date.now() };
    }
    const existing = s.ownedPartVariants[partName] ?? [];
    if (!existing.includes(variantId)) {
      next.ownedPartVariants = {
        ...s.ownedPartVariants,
        [partName]: [...existing, variantId],
      };
    }
    return next;
  }),

  isPartVariantOwned: (partName, variantId) => {
    // Default variant: always owned when the base part is owned.
    if (variantId === DEFAULT_VARIANT_ID) {
      return get().isAmgPartOwned(partName);
    }
    const list = get().ownedPartVariants[partName];
    return !!list && list.includes(variantId);
  },

  ownedVariantsForPart: (partName) => {
    const explicit = get().ownedPartVariants[partName] ?? [];
    // Always include '' (default) when the base part is owned.
    if (get().isAmgPartOwned(partName)) {
      if (!explicit.includes(DEFAULT_VARIANT_ID)) {
        return [DEFAULT_VARIANT_ID, ...explicit];
      }
    }
    return explicit;
  },

  equipPartVariant: (slot, partName, variantId) => set((s) => {
    const current = s.amgCharacter as unknown as CharacterState | null;
    const baseChar = current ?? STARTER_HUMAN_CHARACTER;
    return {
      amgCharacter: {
        ...baseChar,
        parts: { ...baseChar.parts, [slot]: partName },
      } as unknown as AmgCharacterState,
      equippedPartVariant: { ...s.equippedPartVariant, [partName]: variantId },
    };
  }),

  // ── Tint color ownership API ──────────────────────────────────
  // Unlockable material tint colors (Hair 01, Outfit 01 Primary, etc.)
  // from the color registry. Starter colors are always owned via
  // STARTER_TINT_COLORS — no unlock needed. Non-starter colors drop
  // from loot boxes and are tracked here.

  unlockTintColor: (colorId) => set((s) => {
    if (s.ownedTintColors.includes(colorId)) return s;
    return { ownedTintColors: [...s.ownedTintColors, colorId] };
  }),

  isTintColorOwned: (colorId) => {
    if (STARTER_TINT_COLORS.has(colorId)) return true;
    return get().ownedTintColors.includes(colorId);
  },

  // ── Outfit variant ("camo") API ──────────────────────────────────
  // CoD-camo model: selecting a variant applies its color scheme to the
  // entire outfit at once. The variant's `color` → Primary, `accent`
  // (or color if no accent) → Secondary, color → Tertiary. Selecting
  // the default variant ('') leaves colors untouched so the player's
  // manual tint picks stay.
  setOutfitVariant: (variantId) => set((s) => {
    const current = s.amgCharacter as unknown as CharacterState | null;
    if (!current) return { equippedOutfitVariant: variantId };

    // Default variant — restore the species-default outfit colors so
    // the character doesn't keep the last variant's tint forever.
    if (!variantId || variantId === '') {
      const species = (current as any).species ?? 'Human';
      const defaults = DEFAULT_COLORS_BY_SPECIES[species as keyof typeof DEFAULT_COLORS_BY_SPECIES]
        ?? DEFAULT_COLORS_BY_SPECIES.Human;
      const colors = {
        ...(current.colors ?? {}),
        'Outfit 01 Primary': defaults['Outfit 01 Primary'],
        'Outfit 01 Secondary': defaults['Outfit 01 Secondary'],
        'Outfit 01 Tertiary': defaults['Outfit 01 Tertiary'],
      };
      return {
        amgCharacter: { ...current, colors } as unknown as AmgCharacterState,
        equippedOutfitVariant: '',
      };
    }

    // Look up the variant's color scheme in the palette.
    const variant = DEFAULT_PALETTE.find((v) => v.id === variantId);
    if (!variant) return { equippedOutfitVariant: variantId };

    // Apply: color → Primary (torso/arms), accent|color → Secondary
    // (hips/legs), color → Tertiary (feet). Duo-chrome variants get
    // a two-tone look; solid variants are uniform across all regions.
    const colors = {
      ...(current.colors ?? {}),
      'Outfit 01 Primary': variant.color,
      'Outfit 01 Secondary': variant.accent ?? variant.color,
      'Outfit 01 Tertiary': variant.accent ? variant.color : variant.color,
    };

    return {
      amgCharacter: { ...current, colors } as unknown as AmgCharacterState,
      equippedOutfitVariant: variantId,
    };
  }),

  markAmgStarterSeen: () => set({ amgStarterSeen: true }),

  loadFromStorage: async () => {
    const saved = await loadState<PersistedCharacter>(STORAGE_KEY);
    if (saved) {
      const owned = saved.ownedOutfits ?? [];
      // Migration: pre-Path-A saves stored the equipped outfit under
      // `customization.outfitId`. Recover that on first load post-upgrade
      // so returning players don't lose their last-equipped pack on the
      // schema flip. The new `equippedOutfitId` field takes precedence
      // once present.
      const legacyOutfit = saved.customization?.outfitId;
      const equipped = saved.equippedOutfitId
        ?? (legacyOutfit && legacyOutfit !== '' ? legacyOutfit : DEFAULT_EQUIPPED_OUTFIT);
      set({
        amgCharacter: saved.amgCharacter ?? null,
        // Merge saved + starter so new starter additions land for existing saves.
        ownedOutfits: Array.from(new Set([...STARTER_OUTFITS, ...owned])),
        equippedOutfitId: equipped,
        ownedAmgParts: saved.ownedAmgParts ?? [],
        amgPartUnlockedAt: saved.amgPartUnlockedAt ?? {},
        amgStarterSeen: saved.amgStarterSeen ?? false,
        // Variant fields land for the first time on saves that pre-date
        // the 2026-05-04 pivot. Default is empty maps — `ownedVariantsForPart`
        // synthesizes the default colorway from `ownedAmgParts` so no
        // migration step is required.
        ownedPartVariants: saved.ownedPartVariants ?? {},
        equippedPartVariant: saved.equippedPartVariant ?? {},
        equippedOutfitVariant: saved.equippedOutfitVariant ?? DEFAULT_VARIANT_ID,
        ownedTintColors: saved.ownedTintColors ?? [],
      });
    }
  },
}));

// Auto-save on any change
useCharacterStore.subscribe((state) => {
  saveState(STORAGE_KEY, {
    amgCharacter: state.amgCharacter,
    ownedOutfits: state.ownedOutfits,
    equippedOutfitId: state.equippedOutfitId,
    ownedAmgParts: state.ownedAmgParts,
    amgPartUnlockedAt: state.amgPartUnlockedAt,
    amgStarterSeen: state.amgStarterSeen,
    ownedPartVariants: state.ownedPartVariants,
    equippedPartVariant: state.equippedPartVariant,
    equippedOutfitVariant: state.equippedOutfitVariant,
    ownedTintColors: state.ownedTintColors,
  });
});
