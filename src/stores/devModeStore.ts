/**
 * Dev Mode Store — unlocks ALL content for testing.
 *
 * Toggle via triple-tap on the version badge in Settings, or call
 * `enableDevMode()` from the browser console. When active, every
 * cosmetic, emote, outfit, tint color, pet, and board/piece theme
 * is granted to the player's stores instantly with 999,999 coins
 * and 9,999 gems. Loot boxes of every tier are added too.
 *
 * Dev mode persists across refreshes (AsyncStorage) so you don't
 * have to re-enable every session during testing.
 *
 * Production builds: the SettingsScreen gate hides the toggle behind
 * __DEV__, but the store itself is always available so we can call
 * `enableDevMode()` from the console on any build during QA.
 */

import { create } from 'zustand';
import { saveState, loadState } from '../services/storage';

// ── Imports for the grant pass ──────────────────────────────────────
import { useShopStore } from './shopStore';
import { useCharacterStore } from './characterStore';
import { usePetStore } from './petStore';
import { useLootBoxStore, LOOT_BOXES } from './lootBoxStore';
import {
  BOARD_THEMES,
  PIECE_THEMES,
  DROP_EFFECTS,
  WIN_ANIMATIONS,
  BOARD_ACCESSORIES,
} from '../data/shopCatalog';
import { OUTFIT_SHOP_ITEMS } from '../data/cosmeticsShopCatalog';
import { OUTFITS } from '../data/outfitRegistry';
import { PETS, type PetId } from '../data/petRegistry';
import { HUMAN_EMOTES } from '../data/animationRegistry';
import { ALL_TINT_COLORS } from '../data/colorRegistry';
import { DEFAULT_PALETTE } from '@amg/cosmetic-ui';
import { COLORWAY_PALETTE } from '../data/outfitColorways';
import { buildAmgBodyForOutfit } from '../data/npcCustomizations';

// ─── Store shape ────────────────────────────────────────────────────

interface DevModeState {
  /** True when dev mode is active. */
  enabled: boolean;
  /** Toggle dev mode on/off. When toggling ON, runs the full grant pass. */
  toggle: () => void;
  /** Explicitly enable dev mode + grant everything. */
  enable: () => void;
  /** Load persisted state. */
  loadFromStorage: () => Promise<void>;
}

const STORAGE_KEY = 'drop4_devmode';

// ─── Grant pass — unlock everything in every store ──────────────────

function grantEverything(): void {
  const shop = useShopStore.getState();
  const char = useCharacterStore.getState();

  // ── Currency ──
  useShopStore.setState({
    coins: 999_999,
    gems: 9_999,
    lifetimeCoinsEarned: 999_999,
  });

  // ── Boards ──
  for (const b of BOARD_THEMES) {
    if (!shop.owned.boards.includes(b.id)) {
      shop.purchaseItem('boards', b.id, 0);
    }
  }

  // ── Pieces ──
  for (const p of PIECE_THEMES) {
    if (!shop.owned.pieces.includes(p.id)) {
      shop.purchaseItem('pieces', p.id, 0);
    }
  }

  // ── Drop Effects ──
  for (const d of DROP_EFFECTS) {
    if (!shop.owned.dropEffects.includes(d.id)) {
      shop.purchaseItem('dropEffects', d.id, 0);
    }
  }

  // ── Win Animations ──
  for (const w of WIN_ANIMATIONS) {
    if (!shop.owned.winAnimations.includes(w.id)) {
      shop.purchaseItem('winAnimations', w.id, 0);
    }
  }

  // ── Board Accessories (Frames) ──
  for (const a of BOARD_ACCESSORIES) {
    if (!shop.owned.boardAccessories.includes(a.id)) {
      shop.purchaseItem('boardAccessories', a.id, 0);
    }
  }

  // ── Emotes ──
  for (const e of HUMAN_EMOTES) {
    if (!shop.ownedEmotes.includes(e.id)) {
      shop.purchaseEmote(e.id, 0);
    }
  }

  // ── Outfits ──
  for (const id of Object.keys(OUTFITS)) {
    if (!char.isOutfitOwned(id)) {
      char.unlockOutfit(id);
    }
  }

  // ── Pets ──
  for (const petId of Object.keys(PETS)) {
    usePetStore.getState().unlockPet(petId as PetId);
  }

  // ── Tint Colors ──
  for (const tc of ALL_TINT_COLORS) {
    if (!tc.starter) {
      char.unlockTintColor(tc.id);
    }
  }

  // ── Outfit Colorways (per-outfit color presets) ──
  const { COLORWAY_PALETTE } = require('../data/outfitColorways');
  const batchColorways: Record<string, string[]> = { ...char.ownedOutfitColorways };
  for (const outfitId of Object.keys(OUTFITS)) {
    const existing = new Set(batchColorways[outfitId] ?? []);
    for (const cw of COLORWAY_PALETTE) existing.add(cw.id);
    batchColorways[outfitId] = Array.from(existing);
  }
  useCharacterStore.setState({ ownedOutfitColorways: batchColorways });

  // ── Part Variants (CoD-camo system — every part × every color) ──
  // Batch-build the full ownedPartVariants map in one pass to avoid
  // thousands of individual Zustand updates + AsyncStorage writes.
  // Includes both DEFAULT_PALETTE (per-part material variants) AND
  // COLORWAY_PALETTE (outfit colorway tints) — each part × colorway
  // is a separate collectible Devon wants in the grid.
  const nonDefaultVariantIds = DEFAULT_PALETTE
    .filter((v) => v.id !== '')
    .map((v) => v.id);
  const colorwayVariantIds = COLORWAY_PALETTE.map((c: { id: string }) => c.id);
  const allVariantIds = [...nonDefaultVariantIds, ...colorwayVariantIds];
  const batchVariants: Record<string, string[]> = { ...char.ownedPartVariants };
  for (const id of Object.keys(OUTFITS)) {
    const bodyParts = buildAmgBodyForOutfit(id);
    const partNames = Object.values(bodyParts).filter(
      (n): n is string => typeof n === 'string',
    );
    for (const partName of partNames) {
      const existing = new Set(batchVariants[partName] ?? []);
      for (const vid of allVariantIds) existing.add(vid);
      batchVariants[partName] = Array.from(existing);
    }
  }
  useCharacterStore.setState({ ownedPartVariants: batchVariants });

  // ── Loot Boxes (5 of each tier for testing) ──
  for (const box of LOOT_BOXES) {
    for (let i = 0; i < 5; i++) {
      useLootBoxStore.getState().addBox(box.id);
    }
  }

  // ── Shards (1000 of each tier for Shard Shop testing) ──
  useLootBoxStore.getState().addShards('common', 1000);
  useLootBoxStore.getState().addShards('rare', 1000);
  useLootBoxStore.getState().addShards('epic', 1000);
  useLootBoxStore.getState().addShards('legendary', 1000);

  // eslint-disable-next-line no-console
  console.log('[devMode] 🔓 ALL CONTENT UNLOCKED — dev mode active');
}

// ─── Store ──────────────────────────────────────────────────────────

export const useDevModeStore = create<DevModeState>((set, get) => ({
  enabled: false,

  toggle: () => {
    const next = !get().enabled;
    set({ enabled: next });
    if (next) grantEverything();
    // eslint-disable-next-line no-console
    console.log(`[devMode] ${next ? '🔓 ENABLED' : '🔒 DISABLED'}`);
  },

  enable: () => {
    set({ enabled: true });
    grantEverything();
  },

  loadFromStorage: async () => {
    const saved = await loadState<{ enabled?: boolean }>(STORAGE_KEY);
    if (saved?.enabled) {
      set({ enabled: true });
      // Re-grant on load so new items added since last session are unlocked.
      grantEverything();
    }
  },
}));

// Auto-save
useDevModeStore.subscribe((state) => {
  saveState(STORAGE_KEY, { enabled: state.enabled });
});

// ── Console helper ──────────────────────────────────────────────────
// Type `enableDevMode()` in browser console to activate.
if (typeof globalThis !== 'undefined') {
  (globalThis as any).enableDevMode = () => useDevModeStore.getState().enable();
  (globalThis as any).disableDevMode = () => {
    useDevModeStore.setState({ enabled: false });
    // eslint-disable-next-line no-console
    console.log('[devMode] 🔒 DISABLED');
  };
}
