/**
 * cosmeticAdapter — Drop4's bridge to @amg/cosmetic-ui.
 *
 * The engine package's components are headless of game stores —
 * every game wires its own `CosmeticAdapter` that wraps its zustand
 * stores + data registries into the shape the engine expects. This
 * adapter is Drop4's wrapper. Tic Tac Toe / RPS+ / Chess each get
 * their own equivalent file so the engine UI is single-source-of-
 * truth without any game-specific imports.
 *
 * The adapter is a stateless object — every read goes through
 * `useCharacterStore.getState()` so it always reflects current state.
 * Components that consume the adapter rerender via the zustand
 * subscription their parent already has (in Drop4's case, the
 * ClothesCatalog modal's own selectors).
 */
import type { ImageSourcePropType } from 'react-native';
import type {
  CosmeticAdapter,
  Rarity,
} from '@amg/cosmetic-ui';
import { useCharacterStore } from '../stores/characterStore';
import { getPartThumb } from '../data/partThumbs';
import { getCleanPartThumb } from '../data/partThumbsClean';
import {
  RARITY_COLORS,
  RARITY_LABELS,
  packPrefixFromPartName,
  getPartPrice,
} from '../data/amgPartPricing';
import { packMeta } from '../data/amgPackMeta';
import { getPackIcon } from '../data/cosmeticIcons';
import { getPartFashionName } from '../data/partFashionNames';

/** The Drop4-specific implementation of the cross-game CosmeticAdapter.
 *  Other games (TTT, RPS+, Chess) implement the same shape against
 *  their own stores + data files. */
export const drop4CosmeticAdapter: CosmeticAdapter = {
  getPartThumb: (partName: string): ImageSourcePropType | undefined => {
    // Full-character renders (clothes on a body) take priority because
    // isolated torso-only renders look like floating gray blobs.
    // TODO: Replace with proper male+female mannequin renders from Unity.
    return getPartThumb(partName) ?? getCleanPartThumb(partName);
  },

  getRarity: (partName: string): Rarity => {
    return getPartPrice(partName).rarity;
  },

  getRarityColor: (rarity: Rarity): string => {
    return (RARITY_COLORS as Record<string, string>)[rarity] ?? '#7f8c8d';
  },

  getRarityLabel: (rarity: Rarity): string => {
    return (RARITY_LABELS as Record<string, string>)[rarity] ?? String(rarity).toUpperCase();
  },

  getPackDisplayName: (partName: string): string => {
    const pack = packPrefixFromPartName(partName);
    return packMeta(pack).displayName;
  },

  // Compact name for the AmgPartCard pack strip (cards are too narrow
  // for full names like "Apocalypse Outlaws"). amgPackMeta carries
  // shortName per pack (e.g. "Outlaws", "Knights", "Civilians").
  // Falls back to displayName when a pack hasn't been short-named yet.
  // Audit 2026-05-05 (UX-4).
  getPackShortName: (partName: string): string => {
    const pack = packPrefixFromPartName(partName);
    const meta = packMeta(pack);
    return meta.shortName ?? meta.displayName;
  },

  isPartOwned: (partName: string): boolean => {
    return useCharacterStore.getState().isAmgPartOwned(partName);
  },

  isVariantOwned: (partName: string, variantId: string): boolean => {
    return useCharacterStore.getState().isPartVariantOwned(partName, variantId);
  },

  currentVariantFor: (partName: string): string => {
    return useCharacterStore.getState().equippedPartVariant[partName] ?? '';
  },

  // ──────────────────────────────────────────────────────────────────
  // AmgPartCard extensions — only the per-part shop card touches these
  // ──────────────────────────────────────────────────────────────────

  getPrice: (partName: string): number => {
    return getPartPrice(partName).price;
  },

  getPackCoverIcon: (partName: string): ImageSourcePropType | undefined => {
    // Tier 2 of the AmgPartCard hero cascade — chunky 3D AI mascot
    // for the part's owning pack (used when the painted Unity per-
    // part PNG isn't bundled yet).
    const pack = packPrefixFromPartName(partName);
    return getPackIcon(pack);
  },

  getFallbackIcon: (): ImageSourcePropType => {
    // Tier 3 — last-resort generic pack icon so cards never render
    // blank when a fresh pack lands without thumbs/cover icons yet.
    return require('../assets/images/ui/pack-humn-base.png');
  },

  getPartDisplayName: (partName: string): string | undefined => {
    // Fashion name registry — shows "Puffer Vest" instead of "TORSO #06".
    // Returns undefined for parts not yet named (card falls back to
    // slot + variant format).
    return getPartFashionName(partName);
  },
};
