/**
 * Character Customization Store
 *
 * Tracks the player's 3D character customization:
 * - Which outfit GLB to load (Modern Civilians 01-12)
 * - Skin color (any hex)
 * - Hair color (free basics + unlockable premium colors)
 * - Outfit color overrides per part (free + premium colorways)
 * - Body shape sliders (masculine↔feminine, skinny↔heavy, lean↔buff)
 * - Gender (affects body blendshape)
 *
 * Color packs are unlocked via the shop (coins).
 * Body sliders are 0-100 values that map to Synty's blendshapes.
 */

import { create } from 'zustand';
import { saveState, loadState } from '../services/storage';
import { isStarterPack, packPrefixFromPartName } from '../data/amgPartPricing';

// ── Types ──────────────────────────────────────────────────────

// OutfitId is now an open string — any `<species>_<pack>_NN` id produced by
// the generator is valid. See src/data/outfitRegistry.ts for the live list.
export type OutfitId = string;

export interface CharacterCustomization {
  outfitId: OutfitId;
  // Body shape sliders (0-100 each)
  bodyType: number;    // 0=masculine, 100=feminine
  bodySize: number;    // 0=skinny, 50=neutral, 100=heavy
  muscle: number;      // 0=lean, 100=buff
  // Colors (hex strings)
  skinColor: string;
  hairColor: string;
  // Outfit color overrides — maps part code ("10TORS", "18LEGL", etc.) to hex
  outfitColors: Record<string, string>;
}

// ── Free vs premium unlockables ─────────────────────────────────

export const FREE_HAIR_COLORS: string[] = [
  '#0a0606', // jet black
  '#3d2817', // dark brown
  '#7a5230', // medium brown
  '#c9a16a', // blonde
];

export const PREMIUM_HAIR_COLORS: { id: string; hex: string; name: string; price: number }[] = [
  { id: 'platinum', hex: '#e8e8e8', name: 'Platinum', price: 500 },
  { id: 'silver',   hex: '#b0b0b8', name: 'Silver', price: 500 },
  { id: 'red',      hex: '#c73838', name: 'Fire Red', price: 750 },
  { id: 'auburn',   hex: '#8a3520', name: 'Auburn', price: 500 },
  { id: 'pink',     hex: '#e874a8', name: 'Hot Pink', price: 1000 },
  { id: 'rose',     hex: '#c9677a', name: 'Rose Gold', price: 1000 },
  { id: 'blue',     hex: '#3870c7', name: 'Electric Blue', price: 1000 },
  { id: 'teal',     hex: '#2aa8a8', name: 'Teal', price: 1000 },
  { id: 'green',    hex: '#3aa83a', name: 'Emerald', price: 1000 },
  { id: 'purple',   hex: '#8a3ac7', name: 'Purple', price: 1000 },
  { id: 'white',    hex: '#f8f8fa', name: 'Snow White', price: 1500 },
  { id: 'rainbow',  hex: '#ff00ff', name: 'Rainbow', price: 2500 },
];

// Outfit colorway packs (each pack applies a preset color scheme to the outfit)
interface OutfitColorPack {
  id: string;
  name: string;
  price: number;
  // Maps part code to hex color
  colors: Record<string, string>;
}

export const FREE_OUTFIT_PACKS: OutfitColorPack[] = [
  { id: 'default', name: 'Default', price: 0, colors: {} }, // empty = use Synty defaults
  { id: 'street',  name: 'Street', price: 0, colors: {
    '10TORS': '#2c2c30', '11AUPL': '#2c2c30', '12AUPR': '#2c2c30',
    '13ALWL': '#2c2c30', '14ALWR': '#2c2c30',
    '17HIPS': '#1a1a20', '18LEGL': '#242830', '19LEGR': '#242830',
    '20FOTL': '#0a0a10', '21FOTR': '#0a0a10',
  }},
  { id: 'sunset', name: 'Sunset', price: 0, colors: {
    '10TORS': '#d4613a', '11AUPL': '#d4613a', '12AUPR': '#d4613a',
    '13ALWL': '#d4613a', '14ALWR': '#d4613a',
    '17HIPS': '#8a3520', '18LEGL': '#b04830', '19LEGR': '#b04830',
    '20FOTL': '#3a1a10', '21FOTR': '#3a1a10',
  }},
];

export const PREMIUM_OUTFIT_PACKS: OutfitColorPack[] = [
  { id: 'neon', name: 'Neon Pack', price: 1500, colors: {
    '10TORS': '#00e5ff', '11AUPL': '#00e5ff', '12AUPR': '#00e5ff',
    '13ALWL': '#00e5ff', '14ALWR': '#00e5ff',
    '17HIPS': '#ff00c8', '18LEGL': '#ff00c8', '19LEGR': '#ff00c8',
    '20FOTL': '#1a0020', '21FOTR': '#1a0020',
  }},
  { id: 'gold', name: 'Gold Plated', price: 2500, colors: {
    '10TORS': '#f4d05c', '11AUPL': '#f4d05c', '12AUPR': '#f4d05c',
    '13ALWL': '#f4d05c', '14ALWR': '#f4d05c',
    '17HIPS': '#c09434', '18LEGL': '#d4a848', '19LEGR': '#d4a848',
    '20FOTL': '#4a3820', '21FOTR': '#4a3820',
  }},
  { id: 'pastel', name: 'Pastel Dream', price: 1200, colors: {
    '10TORS': '#f4a8c8', '11AUPL': '#f4a8c8', '12AUPR': '#f4a8c8',
    '13ALWL': '#f4a8c8', '14ALWR': '#f4a8c8',
    '17HIPS': '#a8c8f4', '18LEGL': '#b8d4f8', '19LEGR': '#b8d4f8',
    '20FOTL': '#f8f4e8', '21FOTR': '#f8f4e8',
  }},
  { id: 'mono', name: 'Monochrome', price: 800, colors: {
    '10TORS': '#f8f8fa', '11AUPL': '#f8f8fa', '12AUPR': '#f8f8fa',
    '13ALWL': '#f8f8fa', '14ALWR': '#f8f8fa',
    '17HIPS': '#1a1a20', '18LEGL': '#1a1a20', '19LEGR': '#1a1a20',
    '20FOTL': '#0a0a10', '21FOTR': '#0a0a10',
  }},
];

// ── Default customization ──────────────────────────────────────

const DEFAULT_CUSTOMIZATION: CharacterCustomization = {
  outfitId: 'modern_civilians_01',
  bodyType: 30,   // slightly masculine
  bodySize: 50,   // neutral
  muscle: 55,     // slightly toned
  skinColor: '#dcb088',
  hairColor: '#3d2817',
  outfitColors: {},
};

// ── Store ──────────────────────────────────────────────────────

// New AMG CharacterState shape from @amg/character-runtime. Kept loosely
// typed here (Record<string, unknown>) to avoid coupling the store to
// the runtime package — the runtime still owns the canonical type.
type AmgCharacterState = Record<string, unknown>;

interface CharacterState {
  customization: CharacterCustomization;
  // Unlocks
  unlockedHairColors: string[];     // PREMIUM_HAIR_COLORS ids
  unlockedOutfitPacks: string[];    // PREMIUM_OUTFIT_PACKS ids (color packs)
  ownedOutfits: string[];           // outfit IDs from outfitRegistry
  // GTA-meets-Sims AMG part ownership. Every Sidekick part the player has
  // bought (by exact part name like 'SK_SAMR_WARR_03_10TORS_HU01').
  // STARTER_PACKS are treated as owned for free — isAmgPartOwned() reads
  // this set plus the starter override. The shop adds to it, the creator
  // reads from it via the `ownedParts` prop to render lock overlays.
  ownedAmgParts: string[];
  // New: AMG Studios character state (from the Sims-tier creator).
  // When present, this is the source of truth for the player's avatar
  // across every AMG game. Legacy `customization` stays for the existing
  // single-GLB renderer until all screens migrate.
  amgCharacter: AmgCharacterState | null;
  // Actions
  setOutfit: (id: OutfitId) => void;
  setSkinColor: (hex: string) => void;
  setHairColor: (hex: string) => void;
  setOutfitColors: (colors: Record<string, string>) => void;
  setBodyType: (v: number) => void;
  setBodySize: (v: number) => void;
  setMuscle: (v: number) => void;
  setAmgCharacter: (next: AmgCharacterState) => void;
  unlockHairColor: (id: string) => void;
  unlockOutfitPack: (id: string) => void;
  unlockOutfit: (id: string) => void;
  unlockAmgPart: (name: string) => void;
  isOutfitOwned: (id: string) => boolean;
  isHairColorUnlocked: (hex: string) => boolean;
  isOutfitPackUnlocked: (id: string) => boolean;
  isAmgPartOwned: (name: string) => boolean;
  resetCustomization: () => void;
  loadFromStorage: () => Promise<void>;
}

const STORAGE_KEY = 'drop4_character';

interface PersistedCharacter {
  customization: CharacterCustomization;
  unlockedHairColors: string[];
  unlockedOutfitPacks: string[];
  ownedOutfits?: string[];
  ownedAmgParts?: string[];
  amgCharacter?: AmgCharacterState | null;
}

// Starter outfits every player owns for free (one per species).
const STARTER_OUTFITS = [
  'human_modern_civilians_01',
  'human_modern_civilians_02',
  'modern_civilians_01', // legacy filename, same asset
];

export const useCharacterStore = create<CharacterState>((set, get) => ({
  customization: { ...DEFAULT_CUSTOMIZATION },
  unlockedHairColors: [],
  unlockedOutfitPacks: [],
  ownedOutfits: [...STARTER_OUTFITS],
  // Empty by default — isAmgPartOwned() treats STARTER_PACKS parts as
  // owned automatically, so a fresh player can already equip base
  // heads/hair + MDRN_CIVL outfits without any purchases.
  ownedAmgParts: [],
  amgCharacter: null,

  setOutfit: (id) => set((s) => ({
    customization: { ...s.customization, outfitId: id },
  })),
  setSkinColor: (hex) => set((s) => ({
    customization: { ...s.customization, skinColor: hex },
  })),
  setHairColor: (hex) => set((s) => ({
    customization: { ...s.customization, hairColor: hex },
  })),
  setOutfitColors: (colors) => set((s) => ({
    customization: { ...s.customization, outfitColors: { ...colors } },
  })),
  setBodyType: (v) => set((s) => ({
    customization: { ...s.customization, bodyType: Math.max(0, Math.min(100, v)) },
  })),
  setBodySize: (v) => set((s) => ({
    customization: { ...s.customization, bodySize: Math.max(0, Math.min(100, v)) },
  })),
  setMuscle: (v) => set((s) => ({
    customization: { ...s.customization, muscle: Math.max(0, Math.min(100, v)) },
  })),

  // Persist the full AMG character blob from @amg/character-creator.
  // Written whenever the player taps Save in the new creator; consumed
  // by CharacterCreatorScreen's `initial` prop on next open, and
  // (eventually) by in-game renderers once they migrate off the legacy
  // single-GLB Character3D.
  setAmgCharacter: (next) => set({ amgCharacter: next }),

  unlockHairColor: (id) => set((s) => ({
    unlockedHairColors: s.unlockedHairColors.includes(id) ? s.unlockedHairColors : [...s.unlockedHairColors, id],
  })),
  unlockOutfitPack: (id) => set((s) => ({
    unlockedOutfitPacks: s.unlockedOutfitPacks.includes(id) ? s.unlockedOutfitPacks : [...s.unlockedOutfitPacks, id],
  })),
  unlockOutfit: (id) => set((s) => ({
    ownedOutfits: s.ownedOutfits.includes(id) ? s.ownedOutfits : [...s.ownedOutfits, id],
  })),
  isOutfitOwned: (id) => get().ownedOutfits.includes(id) || STARTER_OUTFITS.includes(id),

  // AMG part unlocks. Called from the shop after a successful purchase;
  // the creator reads ownership via isAmgPartOwned() to decide whether
  // to show a lock overlay / buy prompt on a part grid thumbnail.
  unlockAmgPart: (name) => set((s) => ({
    ownedAmgParts: s.ownedAmgParts.includes(name) ? s.ownedAmgParts : [...s.ownedAmgParts, name],
  })),
  isAmgPartOwned: (name) => {
    // Fast path: starter packs are owned for free.
    if (isStarterPack(packPrefixFromPartName(name))) return true;
    return get().ownedAmgParts.includes(name);
  },

  isHairColorUnlocked: (hex) => {
    if (FREE_HAIR_COLORS.includes(hex)) return true;
    const premium = PREMIUM_HAIR_COLORS.find((c) => c.hex === hex);
    return premium ? get().unlockedHairColors.includes(premium.id) : false;
  },
  isOutfitPackUnlocked: (id) => {
    if (FREE_OUTFIT_PACKS.some((p) => p.id === id)) return true;
    return get().unlockedOutfitPacks.includes(id);
  },

  resetCustomization: () => set({ customization: { ...DEFAULT_CUSTOMIZATION } }),

  loadFromStorage: async () => {
    const saved = await loadState<PersistedCharacter>(STORAGE_KEY);
    if (saved) {
      const owned = saved.ownedOutfits ?? [];
      set({
        customization: { ...DEFAULT_CUSTOMIZATION, ...saved.customization },
        unlockedHairColors: saved.unlockedHairColors || [],
        unlockedOutfitPacks: saved.unlockedOutfitPacks || [],
        // Merge saved + starter so new starter additions land for existing saves.
        ownedOutfits: Array.from(new Set([...STARTER_OUTFITS, ...owned])),
        ownedAmgParts: saved.ownedAmgParts ?? [],
        amgCharacter: saved.amgCharacter ?? null,
      });
    }
  },
}));

// Auto-save on any change
useCharacterStore.subscribe((state) => {
  saveState(STORAGE_KEY, {
    customization: state.customization,
    unlockedHairColors: state.unlockedHairColors,
    unlockedOutfitPacks: state.unlockedOutfitPacks,
    ownedOutfits: state.ownedOutfits,
    ownedAmgParts: state.ownedAmgParts,
    amgCharacter: state.amgCharacter,
  });
});
