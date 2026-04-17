import { create } from 'zustand';
import { saveState, loadState } from '../services/storage';
import { useShopStore } from './shopStore';

type LootBoxRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface LootBoxItem {
  id: string;
  name: string;
  type: 'board' | 'pieces' | 'emote' | 'coins' | 'gems';
  rarity: LootBoxRarity;
  icon: string;
  value?: number; // for coins/gems
}

export interface LootBox {
  id: string;
  name: string;
  icon: string;
  tier: 'bronze' | 'silver' | 'gold' | 'diamond';
  cost: number; // coins to open (0 = free)
}

interface LootBoxState {
  ownedBoxes: { boxId: string; count: number }[];
  openHistory: LootBoxItem[];

  // Actions
  addBox: (boxId: string) => void;
  openBox: (boxId: string) => LootBoxItem | null;
  getBoxCount: (boxId: string) => number;
  loadFromStorage: () => Promise<void>;
}

// Available loot boxes
export const LOOT_BOXES: LootBox[] = [
  { id: 'bronze_box', name: 'Bronze Box', icon: '📦', tier: 'bronze', cost: 0 },
  { id: 'silver_box', name: 'Silver Box', icon: '🎁', tier: 'silver', cost: 100 },
  { id: 'gold_box', name: 'Gold Box', icon: '✨', tier: 'gold', cost: 500 },
  { id: 'diamond_box', name: 'Diamond Box', icon: '💎', tier: 'diamond', cost: 2000 },
];

// Drop tables (transparent as per GDD)
const DROP_TABLE: Record<string, { rarity: LootBoxRarity; chance: number }[]> = {
  bronze_box: [
    { rarity: 'common', chance: 70 },
    { rarity: 'rare', chance: 25 },
    { rarity: 'epic', chance: 4 },
    { rarity: 'legendary', chance: 1 },
  ],
  silver_box: [
    { rarity: 'common', chance: 50 },
    { rarity: 'rare', chance: 35 },
    { rarity: 'epic', chance: 12 },
    { rarity: 'legendary', chance: 3 },
  ],
  gold_box: [
    { rarity: 'common', chance: 30 },
    { rarity: 'rare', chance: 40 },
    { rarity: 'epic', chance: 22 },
    { rarity: 'legendary', chance: 8 },
  ],
  diamond_box: [
    { rarity: 'common', chance: 10 },
    { rarity: 'rare', chance: 30 },
    { rarity: 'epic', chance: 40 },
    { rarity: 'legendary', chance: 20 },
  ],
};

// Items pool per rarity
const ITEM_POOL: Record<LootBoxRarity, LootBoxItem[]> = {
  common: [
    { id: 'coins_50', name: '50 Coins', type: 'coins', rarity: 'common', icon: '🪙', value: 50 },
    { id: 'coins_100', name: '100 Coins', type: 'coins', rarity: 'common', icon: '🪙', value: 100 },
    { id: 'coins_200', name: '200 Coins', type: 'coins', rarity: 'common', icon: '🪙', value: 200 },
  ],
  rare: [
    { id: 'coins_500', name: '500 Coins', type: 'coins', rarity: 'rare', icon: '🪙', value: 500 },
    { id: 'board_wood', name: 'Wood Board', type: 'board', rarity: 'rare', icon: '🎨' },
    { id: 'pieces_chrome', name: 'Chrome Pieces', type: 'pieces', rarity: 'rare', icon: '🔴' },
    { id: 'pieces_fire_ice', name: 'Fire & Ice Pieces', type: 'pieces', rarity: 'rare', icon: '🔥' },
  ],
  epic: [
    { id: 'coins_1000', name: '1000 Coins', type: 'coins', rarity: 'epic', icon: '🪙', value: 1000 },
    { id: 'board_neon', name: 'Neon Board', type: 'board', rarity: 'epic', icon: '🎨' },
    { id: 'board_galaxy', name: 'Galaxy Board', type: 'board', rarity: 'epic', icon: '🌌' },
    { id: 'board_ice', name: 'Ice Arena', type: 'board', rarity: 'epic', icon: '❄️' },
    { id: 'pieces_neon', name: 'Neon Pieces', type: 'pieces', rarity: 'epic', icon: '💜' },
    { id: 'pieces_holo', name: 'Holographic Pieces', type: 'pieces', rarity: 'epic', icon: '✨' },
  ],
  legendary: [
    { id: 'coins_5000', name: '5000 Coins', type: 'coins', rarity: 'legendary', icon: '🪙', value: 5000 },
    { id: 'board_gold', name: 'Gold Court', type: 'board', rarity: 'legendary', icon: '🥇' },
    { id: 'board_lava', name: 'Lava Pit', type: 'board', rarity: 'legendary', icon: '🌋' },
    { id: 'gems_10', name: '10 Gems', type: 'gems', rarity: 'legendary', icon: '💎', value: 10 },
  ],
};

function rollRarity(boxId: string): LootBoxRarity {
  const table = DROP_TABLE[boxId] || DROP_TABLE.bronze_box;
  const roll = Math.random() * 100;
  let cumulative = 0;
  for (const entry of table) {
    cumulative += entry.chance;
    if (roll <= cumulative) return entry.rarity;
  }
  return 'common';
}

function pickItem(rarity: LootBoxRarity): LootBoxItem {
  const pool = ITEM_POOL[rarity];
  return pool[Math.floor(Math.random() * pool.length)];
}

export const useLootBoxStore = create<LootBoxState>((set, get) => ({
  ownedBoxes: [],
  openHistory: [],

  addBox: (boxId) => {
    set(state => {
      const existing = state.ownedBoxes.find(b => b.boxId === boxId);
      if (existing) {
        return { ownedBoxes: state.ownedBoxes.map(b => b.boxId === boxId ? { ...b, count: b.count + 1 } : b) };
      }
      return { ownedBoxes: [...state.ownedBoxes, { boxId, count: 1 }] };
    });
  },

  openBox: (boxId) => {
    const box = get().ownedBoxes.find(b => b.boxId === boxId);
    if (!box || box.count <= 0) return null;

    // Deduct box
    set(state => ({
      ownedBoxes: state.ownedBoxes.map(b => b.boxId === boxId ? { ...b, count: b.count - 1 } : b),
    }));

    // Roll and pick item
    const rarity = rollRarity(boxId);
    const item = pickItem(rarity);

    // Grant the reward to shopStore
    if (item.type === 'coins' && item.value) {
      useShopStore.getState().addCoins(item.value);
    } else if (item.type === 'gems' && item.value) {
      useShopStore.getState().addGems(item.value);
    } else if (item.type === 'board') {
      useShopStore.getState().purchaseItem('boards', item.id, 0);
    } else if (item.type === 'pieces') {
      useShopStore.getState().purchaseItem('pieces', item.id, 0);
    } else if (item.type === 'emote') {
      useShopStore.getState().purchaseEmote(item.id, 0); // free grant from loot box
    }

    // Add to history
    set(state => ({
      openHistory: [item, ...state.openHistory].slice(0, 50),
    }));

    return item;
  },

  getBoxCount: (boxId) => {
    return get().ownedBoxes.find(b => b.boxId === boxId)?.count || 0;
  },

  loadFromStorage: async () => {
    const saved = await loadState<{ ownedBoxes: any[]; openHistory: any[] }>('lootbox');
    if (saved) {
      set({
        ownedBoxes: saved.ownedBoxes || [],
        openHistory: saved.openHistory || [],
      });
    }
  },
}));

// Auto-save
useLootBoxStore.subscribe((state) => {
  saveState('lootbox', { ownedBoxes: state.ownedBoxes, openHistory: state.openHistory });
});
