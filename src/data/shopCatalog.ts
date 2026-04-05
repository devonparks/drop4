import { colors } from '../theme/colors';

export interface ShopItem {
  id: string;
  name: string;
  price: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic' | 'darkmatter';
  preview: {
    boardColor?: string;
    p1Color?: string;
    p2Color?: string;
  };
  collection?: string;
  animated?: boolean;
  description?: string;
}

// ─── BOARD THEMES (15) ──────────────────────────────────────────────────────

export const BOARD_THEMES: ShopItem[] = [
  // --- Existing ---
  {
    id: 'default',
    name: 'Classic Blue',
    price: 0,
    rarity: 'common',
    preview: { boardColor: colors.boardBlue },
    collection: 'OG Collection',
  },
  {
    id: 'wood',
    name: 'Wooden',
    price: 500,
    rarity: 'common',
    preview: { boardColor: '#8B5E3C' },
    collection: 'OG Collection',
  },
  {
    id: 'neon',
    name: 'Neon Glow',
    price: 1000,
    rarity: 'rare',
    preview: { boardColor: '#0a2a0a' },
    collection: 'OG Collection',
  },
  {
    id: 'galaxy',
    name: 'Galaxy',
    price: 2000,
    rarity: 'epic',
    preview: { boardColor: '#1a0a30' },
    collection: 'OG Collection',
  },
  {
    id: 'gold',
    name: 'Gold Court',
    price: 5000,
    rarity: 'legendary',
    preview: { boardColor: '#3d2e0a' },
    collection: 'OG Collection',
  },
  {
    id: 'ice',
    name: 'Ice Arena',
    price: 3000,
    rarity: 'epic',
    preview: { boardColor: '#0a2a3d' },
    collection: 'OG Collection',
  },
  {
    id: 'lava',
    name: 'Lava Pit',
    price: 4000,
    rarity: 'epic',
    preview: { boardColor: '#3d0a0a' },
    collection: 'OG Collection',
  },
  {
    id: 'darkmatter',
    name: 'Dark Matter',
    price: 0,
    rarity: 'darkmatter',
    preview: { boardColor: '#050510' },
    collection: 'OG Collection',
    animated: true,
    description: 'The void stares back',
  },
  // --- New ---
  {
    id: 'midnight',
    name: 'Midnight',
    price: 300,
    rarity: 'uncommon',
    preview: { boardColor: '#0a0a14' },
    collection: 'Season 0',
    description: 'Deep black with silver trim',
  },
  {
    id: 'candy',
    name: 'Candy',
    price: 400,
    rarity: 'uncommon',
    preview: { boardColor: '#3d1a2a' },
    collection: 'Season 0',
    description: 'Sweet pink and white candy colors',
  },
  {
    id: 'matrix',
    name: 'Matrix',
    price: 1200,
    rarity: 'rare',
    preview: { boardColor: '#001a00' },
    collection: 'Neon Pack',
    description: 'Green on black, code rain feel',
  },
  {
    id: 'sunset',
    name: 'Sunset',
    price: 1500,
    rarity: 'rare',
    preview: { boardColor: '#3d1a0a' },
    collection: 'Season 0',
    description: 'Warm orange-pink gradient',
  },
  {
    id: 'crystal',
    name: 'Crystal',
    price: 2500,
    rarity: 'epic',
    preview: { boardColor: '#0a1a2a' },
    collection: 'Season 0',
    description: 'Transparent ice blue, crystalline',
  },
  {
    id: 'void',
    name: 'Void',
    price: 8000,
    rarity: 'mythic',
    preview: { boardColor: '#0a0010' },
    collection: 'Mythic Collection',
    animated: true,
    description: 'Animated black hole, purple void',
  },
  {
    id: 'rainbow',
    name: 'Rainbow',
    price: 10000,
    rarity: 'mythic',
    preview: { boardColor: '#1a0a20' },
    collection: 'Mythic Collection',
    animated: true,
    description: 'Animated cycling rainbow colors',
  },
];

// ─── PIECE SKINS (15) ───────────────────────────────────────────────────────

export const PIECE_THEMES: ShopItem[] = [
  // --- Existing ---
  {
    id: 'classic',
    name: 'Classic',
    price: 0,
    rarity: 'common',
    preview: { p1Color: colors.pieceRed, p2Color: colors.pieceYellow },
    collection: 'OG Collection',
  },
  {
    id: 'chrome',
    name: 'Chrome',
    price: 750,
    rarity: 'rare',
    preview: { p1Color: '#c0c0c0', p2Color: '#606060' },
    collection: 'OG Collection',
  },
  {
    id: 'fire_ice',
    name: 'Fire & Ice',
    price: 1500,
    rarity: 'rare',
    preview: { p1Color: '#ff4500', p2Color: '#00bfff' },
    collection: 'OG Collection',
  },
  {
    id: 'neon',
    name: 'Neon',
    price: 2000,
    rarity: 'epic',
    preview: { p1Color: '#ff00ff', p2Color: '#00ff88' },
    collection: 'Neon Pack',
  },
  {
    id: 'holo',
    name: 'Holographic',
    price: 3000,
    rarity: 'epic',
    preview: { p1Color: '#ff69b4', p2Color: '#7b68ee' },
    collection: 'OG Collection',
  },
  {
    id: 'darkmatter',
    name: 'Dark Matter',
    price: 0,
    rarity: 'darkmatter',
    preview: { p1Color: '#1a1a2e', p2Color: '#e94560' },
    collection: 'OG Collection',
    description: 'Forged in the void',
  },
  // --- New ---
  {
    id: 'mint_coral',
    name: 'Mint & Coral',
    price: 300,
    rarity: 'uncommon',
    preview: { p1Color: '#3eb489', p2Color: '#ff7f7f' },
    collection: 'Season 0',
    description: 'Fresh mint green vs warm coral',
  },
  {
    id: 'monochrome',
    name: 'Monochrome',
    price: 400,
    rarity: 'uncommon',
    preview: { p1Color: '#e0e0e0', p2Color: '#2a2a2a' },
    collection: 'Season 0',
    description: 'Pure white vs pure black',
  },
  {
    id: 'sapphire_ruby',
    name: 'Sapphire & Ruby',
    price: 1000,
    rarity: 'rare',
    preview: { p1Color: '#1a53ff', p2Color: '#dc143c' },
    collection: 'Season 0',
    description: 'Precious gemstone colors',
  },
  {
    id: 'electric',
    name: 'Electric',
    price: 1200,
    rarity: 'rare',
    preview: { p1Color: '#00c8ff', p2Color: '#ffe600' },
    collection: 'Neon Pack',
    description: 'Electric blue vs lightning yellow',
  },
  {
    id: 'toxic',
    name: 'Toxic',
    price: 2000,
    rarity: 'epic',
    preview: { p1Color: '#39ff14', p2Color: '#9b30ff' },
    collection: 'Season 0',
    description: 'Toxic green vs acid purple',
  },
  {
    id: 'galaxy_pieces',
    name: 'Galaxy',
    price: 2500,
    rarity: 'epic',
    preview: { p1Color: '#4b0082', p2Color: '#ff69b4' },
    collection: 'Mythic Collection',
    description: 'Swirling galaxy colors',
  },
  {
    id: 'gold_diamond',
    name: 'Gold & Diamond',
    price: 6000,
    rarity: 'legendary',
    preview: { p1Color: '#ffd700', p2Color: '#b9f2ff' },
    collection: 'Season 0',
    description: 'Pure gold vs diamond',
  },
  {
    id: 'obsidian',
    name: 'Obsidian',
    price: 10000,
    rarity: 'mythic',
    preview: { p1Color: '#1a1a2e', p2Color: '#3a3a5e' },
    collection: 'Mythic Collection',
    animated: true,
    description: 'Animated dark obsidian shimmer',
  },
  {
    id: 'damascus',
    name: 'Damascus',
    price: 0,
    rarity: 'mythic',
    preview: { p1Color: '#708090', p2Color: '#c0c0c0' },
    collection: 'Mythic Collection',
    animated: true,
    description: 'Animated damascus steel pattern — earned only',
  },
];

// ─── DROP EFFECTS (12) ──────────────────────────────────────────────────────

export const DROP_EFFECTS: ShopItem[] = [
  // --- Existing ---
  { id: 'none', name: 'None', price: 0, rarity: 'common', preview: {}, collection: 'OG Collection' },
  { id: 'sparks', name: 'Sparks', price: 500, rarity: 'rare', preview: {}, collection: 'OG Collection' },
  { id: 'smoke', name: 'Smoke', price: 750, rarity: 'rare', preview: {}, collection: 'OG Collection' },
  { id: 'splash', name: 'Splash', price: 1000, rarity: 'rare', preview: {}, collection: 'OG Collection' },
  { id: 'lightning', name: 'Lightning', price: 2000, rarity: 'epic', preview: {}, collection: 'OG Collection' },
  { id: 'confetti', name: 'Confetti', price: 1500, rarity: 'epic', preview: {}, collection: 'OG Collection' },
  { id: 'shockwave', name: 'Shockwave', price: 3000, rarity: 'epic', preview: {}, collection: 'OG Collection' },
  { id: 'darkmatter_drop', name: 'Dark Matter', price: 0, rarity: 'darkmatter', preview: {}, collection: 'OG Collection', description: 'Reality warps around the piece' },
  // --- New ---
  {
    id: 'fireball',
    name: 'Fireball',
    price: 4000,
    rarity: 'legendary',
    preview: {},
    collection: 'Season 0',
    description: 'Blazing fireball trail on drop',
  },
  {
    id: 'portal',
    name: 'Portal',
    price: 5000,
    rarity: 'legendary',
    preview: {},
    collection: 'Season 0',
    description: 'Piece drops through a portal',
  },
  {
    id: 'plasma',
    name: 'Plasma',
    price: 8000,
    rarity: 'mythic',
    preview: {},
    collection: 'Mythic Collection',
    animated: true,
    description: 'Animated plasma trail',
  },
  {
    id: 'darkmatter_trail',
    name: 'Dark Matter Trail',
    price: 0,
    rarity: 'darkmatter',
    preview: {},
    collection: 'Mythic Collection',
    animated: true,
    description: 'Animated dark matter energy trail — earned only',
  },
];

// ─── WIN ANIMATIONS (8) — NEW CATEGORY ──────────────────────────────────────

export const WIN_ANIMATIONS: ShopItem[] = [
  { id: 'basic', name: 'Basic', price: 0, rarity: 'common', preview: {}, collection: 'OG Collection' },
  { id: 'fireworks', name: 'Fireworks', price: 500, rarity: 'rare', preview: {}, collection: 'Season 0', description: 'Burst of celebratory fireworks' },
  { id: 'lightning_strike', name: 'Lightning Strike', price: 1000, rarity: 'rare', preview: {}, collection: 'Season 0', description: 'Lightning crashes across the board' },
  { id: 'gold_rain', name: 'Gold Rain', price: 2000, rarity: 'epic', preview: {}, collection: 'Season 0', description: 'Golden coins rain from the sky' },
  { id: 'nuke', name: 'Tactical Nuke', price: 5000, rarity: 'legendary', preview: {}, collection: 'Season 0', description: 'Wipe the board clean' },
  { id: 'meteor', name: 'Meteor Shower', price: 4000, rarity: 'legendary', preview: {}, collection: 'Season 0', description: 'Meteors crash into the board' },
  { id: 'black_hole', name: 'Black Hole', price: 8000, rarity: 'mythic', preview: {}, collection: 'Mythic Collection', animated: true, description: 'Board collapses into a black hole' },
  { id: 'darkmatter_win', name: 'Dark Matter Ascension', price: 0, rarity: 'darkmatter', preview: {}, collection: 'Mythic Collection', animated: true, description: 'Ascend to the dark matter dimension' },
];

// ─── BOARD ACCESSORIES (6) — NEW CATEGORY ───────────────────────────────────

export const BOARD_ACCESSORIES: ShopItem[] = [
  { id: 'none', name: 'None', price: 0, rarity: 'common', preview: {} },
  { id: 'flames', name: 'Flame Border', price: 1000, rarity: 'rare', preview: {}, collection: 'Season 0', description: 'Flames lick the edges of the board' },
  { id: 'vines', name: 'Neon Vines', price: 1500, rarity: 'epic', preview: {}, collection: 'Neon Pack', description: 'Glowing neon vines wrap the frame' },
  { id: 'chains', name: 'Gold Chains', price: 3000, rarity: 'legendary', preview: {}, collection: 'Season 0', description: 'Dripping gold chains surround the board' },
  { id: 'circuit', name: 'Circuit Board', price: 2000, rarity: 'epic', preview: {}, collection: 'Neon Pack', description: 'Pulsing circuit traces along the frame' },
  { id: 'darkmatter_frame', name: 'Dark Matter Frame', price: 0, rarity: 'darkmatter', preview: {}, collection: 'Mythic Collection', animated: true, description: 'The frame bleeds dark energy' },
];

// ─── EMOTES (unchanged) ─────────────────────────────────────────────────────

export const EMOTES: ShopItem[] = [
  { id: 'laugh', name: 'Laugh', price: 0, rarity: 'common', preview: {} },
  { id: 'clap', name: 'Clap', price: 0, rarity: 'common', preview: {} },
  { id: 'shrug', name: 'Shrug', price: 300, rarity: 'common', preview: {} },
  { id: 'flex', name: 'Flex', price: 500, rarity: 'rare', preview: {} },
  { id: 'dance', name: 'Dance', price: 1000, rarity: 'rare', preview: {} },
  { id: 'backflip', name: 'Backflip', price: 2000, rarity: 'epic', preview: {} },
  { id: 'crown_pose', name: 'Crown Pose', price: 3000, rarity: 'epic', preview: {} },
  { id: 'mic_drop', name: 'Mic Drop', price: 5000, rarity: 'legendary', preview: {} },
  { id: 'griddy', name: 'Griddy', price: 0, rarity: 'darkmatter', preview: {} },
];

// ─── RARITY SYSTEM ──────────────────────────────────────────────────────────

export const RARITY_COLORS: Record<string, string> = {
  common: '#8892b0',
  uncommon: '#2ecc71',
  rare: '#3498db',
  epic: '#9b59b6',
  legendary: '#f1c40f',
  mythic: '#ff6b6b',
  darkmatter: '#e94560',
};

export const RARITY_LABELS: Record<string, string> = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
  mythic: 'Mythic',
  darkmatter: 'Dark Matter',
};
