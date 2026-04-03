import { create } from 'zustand';

export type Gender = 'male' | 'female';

export interface CharacterConfig {
  gender: Gender;
  skinTone: number; // 0-5
  hair: string;
  top: string;
  bottom: string;
  shoes: string;
  topColor: string;
  bottomColor: string;
  shoesColor: string;
}

interface CharacterState {
  config: CharacterConfig;
  unlockedItems: string[]; // item IDs that have been earned/purchased

  // Actions
  updateConfig: (updates: Partial<CharacterConfig>) => void;
  setGender: (gender: Gender) => void;
  unlockItem: (itemId: string) => void;
  isUnlocked: (itemId: string) => boolean;
  randomize: () => void;
}

// Default items everyone starts with
const DEFAULT_UNLOCKED = [
  // Male defaults
  'hair_short', 'hair_afro',
  'top_white-tee', 'top_hoodie',
  'bottom_jeans', 'bottom_shorts',
  'shoes_sneakers',
  // Female defaults
  'hair_braids', 'hair_bun',
  'top_f_white-tee', 'top_f_hoodie',
  'bottom_f_jeans', 'bottom_f_joggers',
  'shoes_f_af1',
];

const HAIR_OPTIONS: Record<Gender, string[]> = {
  male: ['short', 'afro', 'locs-front'],
  female: ['braids', 'bun', 'afro', 'locs'],
};

const TOP_OPTIONS: Record<Gender, string[]> = {
  male: ['white-tee', 'hoodie'],
  female: ['white-tee', 'hoodie', 'bomber', 'crop-top'],
};

const BOTTOM_OPTIONS: Record<Gender, string[]> = {
  male: ['jeans', 'shorts'],
  female: ['jeans', 'cargo', 'joggers', 'skirt'],
};

const SHOES_OPTIONS: Record<Gender, string[]> = {
  male: ['sneakers', 'barefoot'],
  female: ['af1', 'jordans', 'platforms'],
};

const COLOR_OPTIONS = ['none', 'red', 'blue', 'green', 'purple', 'gold', 'pink', 'black'];

export const useCharacterStore = create<CharacterState>((set, get) => ({
  config: {
    gender: 'male',
    skinTone: 3,
    hair: 'afro',
    top: 'hoodie',
    bottom: 'jeans',
    shoes: 'sneakers',
    topColor: 'none',
    bottomColor: 'none',
    shoesColor: 'none',
  },

  unlockedItems: [...DEFAULT_UNLOCKED],

  updateConfig: (updates) => set(s => ({
    config: { ...s.config, ...updates },
  })),

  setGender: (gender) => {
    const defaults: Record<Gender, Partial<CharacterConfig>> = {
      male: { hair: 'afro', top: 'hoodie', bottom: 'jeans', shoes: 'sneakers' },
      female: { hair: 'braids', top: 'white-tee', bottom: 'jeans', shoes: 'af1' },
    };
    set(s => ({
      config: { ...s.config, gender, ...defaults[gender] },
    }));
  },

  unlockItem: (itemId) => {
    if (!get().unlockedItems.includes(itemId)) {
      set(s => ({ unlockedItems: [...s.unlockedItems, itemId] }));
    }
  },

  isUnlocked: (itemId) => get().unlockedItems.includes(itemId),

  randomize: () => {
    const { gender } = get().config;
    const pick = <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
    set(s => ({
      config: {
        ...s.config,
        hair: pick(HAIR_OPTIONS[gender]),
        top: pick(TOP_OPTIONS[gender]),
        bottom: pick(BOTTOM_OPTIONS[gender]),
        shoes: pick(SHOES_OPTIONS[gender]),
        topColor: pick(COLOR_OPTIONS),
        bottomColor: pick(COLOR_OPTIONS),
        skinTone: Math.floor(Math.random() * 6),
      },
    }));
  },
}));

export { HAIR_OPTIONS, TOP_OPTIONS, BOTTOM_OPTIONS, SHOES_OPTIONS, COLOR_OPTIONS };
