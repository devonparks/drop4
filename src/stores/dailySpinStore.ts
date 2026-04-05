import { create } from 'zustand';
import { saveState, loadState } from '../services/storage';

export interface SpinSegment {
  id: number;
  label: string;
  emoji: string;
  rewardType: 'coins' | 'gems' | 'lootbox';
  amount: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  color: string;        // segment fill
  borderColor: string;  // segment border accent
  weight: number;       // probability weight (out of 100)
}

export const SPIN_SEGMENTS: SpinSegment[] = [
  { id: 0, label: '50 Coins',        emoji: '\u{1FA99}', rewardType: 'coins',   amount: 50,   rarity: 'common',    color: '#4a4a5a', borderColor: '#6a6a7a', weight: 20 },
  { id: 1, label: '100 Coins',       emoji: '\u{1FA99}', rewardType: 'coins',   amount: 100,  rarity: 'common',    color: '#555565', borderColor: '#7a7a8a', weight: 20 },
  { id: 2, label: '250 Coins',       emoji: '\u{1FA99}', rewardType: 'coins',   amount: 250,  rarity: 'uncommon',  color: '#27ae3d', borderColor: '#34c94d', weight: 20 },
  { id: 3, label: '5 Gems',          emoji: '\u{1F48E}', rewardType: 'gems',    amount: 5,    rarity: 'rare',      color: '#2980b9', borderColor: '#3498db', weight: 10 },
  { id: 4, label: '500 Coins',       emoji: '\u{1FA99}', rewardType: 'coins',   amount: 500,  rarity: 'rare',      color: '#2471a3', borderColor: '#2e86c1', weight: 10 },
  { id: 5, label: 'Bronze Loot Box', emoji: '\u{1F381}', rewardType: 'lootbox', amount: 1,    rarity: 'epic',      color: '#8e44ad', borderColor: '#9b59b6', weight: 12 },
  { id: 6, label: '25 Gems',         emoji: '\u{1F48E}', rewardType: 'gems',    amount: 25,   rarity: 'legendary', color: '#d4ac0d', borderColor: '#f1c40f', weight: 4 },
  { id: 7, label: '1,000 Coins',     emoji: '\u{1FA99}', rewardType: 'coins',   amount: 1000, rarity: 'legendary', color: '#c4841a', borderColor: '#f4a623', weight: 4 },
];

function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

/** Weighted random pick — returns segment index */
function pickWeightedSegment(): number {
  const totalWeight = SPIN_SEGMENTS.reduce((sum, s) => sum + s.weight, 0);
  let rand = Math.random() * totalWeight;
  for (let i = 0; i < SPIN_SEGMENTS.length; i++) {
    rand -= SPIN_SEGMENTS[i].weight;
    if (rand <= 0) return i;
  }
  return 0; // fallback
}

interface DailySpinState {
  lastSpinDate: string;

  // Derived
  canSpin: () => boolean;
  pickReward: () => number; // returns segment index
  recordSpin: () => void;

  // Persistence
  loadFromStorage: () => Promise<void>;
}

export const useDailySpinStore = create<DailySpinState>((set, get) => ({
  lastSpinDate: '',

  canSpin: () => {
    return get().lastSpinDate !== getTodayString();
  },

  pickReward: () => {
    return pickWeightedSegment();
  },

  recordSpin: () => {
    set({ lastSpinDate: getTodayString() });
  },

  loadFromStorage: async () => {
    const saved = await loadState<{ lastSpinDate: string }>('dailySpin');
    if (saved) {
      set({ lastSpinDate: saved.lastSpinDate || '' });
    }
  },
}));

// Auto-save
useDailySpinStore.subscribe((state) => {
  saveState('dailySpin', {
    lastSpinDate: state.lastSpinDate,
  });
});
