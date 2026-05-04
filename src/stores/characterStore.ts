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

  // ── Actions ──
  setAmgCharacter: (next: AmgCharacterState) => void;
  /** Equip a single AMG part (Torso, Hair, AttachmentBack, etc.) into
   *  the named slot without touching anything else. Lets the shop equip
   *  in-place after a buy without bouncing the player to the creator. */
  equipAmgPart: (slot: string, partName: string) => void;
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
  });
});
