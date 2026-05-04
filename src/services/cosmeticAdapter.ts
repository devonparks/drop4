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
import {
  RARITY_COLORS,
  RARITY_LABELS,
  packPrefixFromPartName,
  getPartPrice,
} from '../data/amgPartPricing';
import { packMeta } from '../data/amgPackMeta';
import { getPackIcon } from '../data/cosmeticIcons';

/** The Drop4-specific implementation of the cross-game CosmeticAdapter.
 *  Other games (TTT, RPS+, Chess) implement the same shape against
 *  their own stores + data files. */
export const drop4CosmeticAdapter: CosmeticAdapter = {
  getPartThumb: (partName: string): ImageSourcePropType | undefined => {
    // Painted Unity-rendered PNG for the part. Falls through to
    // undefined when the part isn't in the bundled thumbnail map
    // (fresh pack added since the last Unity render batch).
    return getPartThumb(partName);
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
};
