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

  // ── Actions ──
  setAmgCharacter: (next: AmgCharacterState) => void;
  /** Equip a single AMG part (Torso, Hair, AttachmentBack, etc.) into
   *  the named slot without touching anything else. Lets the shop equip
   *  in-place after a buy without bouncing the player to the creator. */
  equipAmgPart: (slot: string, partName: string) => void;
  /** Equip an outfit pack: swaps the body slots (Hair, Torso, Hips, arms,
   *  hands, legs, feet) into amgCharacter without touching the player's
   *  Head / Eyebrows. Also sets equippedOutfitId. */
  equipOutfitPack: (outfitId: string) => void;
  /** Unlock an outfit pack: tracks ownership AND unlocks the underlying
   *  AMG parts so they're available in the creator's pickers. */
  unlockOutfit: (id: string) => void;
  unlockAmgPart: (name: string) => void;
  markAmgStarterSeen: () => void;
  isOutfitOwned: (id: string) => boolean;
  isAmgPartOwned: (name: string) => boolean;
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
  /** Legacy field — pre-Path-A migration. Read once on load to recover the
   *  player's last-equipped outfit; never written. After the first load
   *  the migrated value lives in `equippedOutfitId`. */
  customization?: { outfitId?: string };
}

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
  });
});
