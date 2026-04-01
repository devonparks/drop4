import { colors } from '../theme/colors';

export interface ShopItem {
  id: string;
  name: string;
  price: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary' | 'darkmatter';
  preview: {
    boardColor?: string;
    p1Color?: string;
    p2Color?: string;
  };
}

export const BOARD_THEMES: ShopItem[] = [
  {
    id: 'default',
    name: 'Classic Blue',
    price: 0,
    rarity: 'common',
    preview: { boardColor: colors.boardBlue },
  },
  {
    id: 'wood',
    name: 'Wooden',
    price: 500,
    rarity: 'common',
    preview: { boardColor: '#8B5E3C' },
  },
  {
    id: 'neon',
    name: 'Neon Glow',
    price: 1000,
    rarity: 'rare',
    preview: { boardColor: '#0a2a0a' },
  },
  {
    id: 'galaxy',
    name: 'Galaxy',
    price: 2000,
    rarity: 'epic',
    preview: { boardColor: '#1a0a30' },
  },
  {
    id: 'gold',
    name: 'Gold Court',
    price: 5000,
    rarity: 'legendary',
    preview: { boardColor: '#3d2e0a' },
  },
  {
    id: 'ice',
    name: 'Ice Arena',
    price: 3000,
    rarity: 'epic',
    preview: { boardColor: '#0a2a3d' },
  },
  {
    id: 'lava',
    name: 'Lava Pit',
    price: 4000,
    rarity: 'epic',
    preview: { boardColor: '#3d0a0a' },
  },
  {
    id: 'darkmatter',
    name: 'Dark Matter',
    price: 0, // Cannot be purchased — earned only
    rarity: 'darkmatter',
    preview: { boardColor: '#050510' },
  },
];

export const PIECE_THEMES: ShopItem[] = [
  {
    id: 'classic',
    name: 'Classic',
    price: 0,
    rarity: 'common',
    preview: { p1Color: colors.pieceRed, p2Color: colors.pieceYellow },
  },
  {
    id: 'chrome',
    name: 'Chrome',
    price: 750,
    rarity: 'rare',
    preview: { p1Color: '#c0c0c0', p2Color: '#606060' },
  },
  {
    id: 'fire_ice',
    name: 'Fire & Ice',
    price: 1500,
    rarity: 'rare',
    preview: { p1Color: '#ff4500', p2Color: '#00bfff' },
  },
  {
    id: 'neon',
    name: 'Neon',
    price: 2000,
    rarity: 'epic',
    preview: { p1Color: '#ff00ff', p2Color: '#00ff88' },
  },
  {
    id: 'holo',
    name: 'Holographic',
    price: 3000,
    rarity: 'epic',
    preview: { p1Color: '#ff69b4', p2Color: '#7b68ee' },
  },
  {
    id: 'darkmatter',
    name: 'Dark Matter',
    price: 0,
    rarity: 'darkmatter',
    preview: { p1Color: '#1a1a2e', p2Color: '#e94560' },
  },
];

export const RARITY_COLORS: Record<string, string> = {
  common: '#8892b0',
  rare: '#3498db',
  epic: '#9b59b6',
  legendary: '#f1c40f',
  darkmatter: '#e94560',
};

export const RARITY_LABELS: Record<string, string> = {
  common: 'Common',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
  darkmatter: 'Dark Matter',
};
