// Character cosmetic items with unlock conditions

export interface CharacterItem {
  id: string;
  name: string;
  category: 'hair' | 'top' | 'bottom' | 'shoes' | 'accessory';
  gender: 'male' | 'female' | 'both';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  unlock: UnlockCondition;
  icon: string;
}

export type UnlockCondition =
  | { type: 'default' }                    // Available from start
  | { type: 'wins'; count: number }        // Win X games
  | { type: 'level'; level: number }       // Reach level X
  | { type: 'streak'; count: number }      // Get X win streak
  | { type: 'coins'; price: number }       // Purchase with coins
  | { type: 'career'; level: number }      // Complete career level X
  | { type: 'games'; count: number }       // Play X total games
  | { type: 'hard_wins'; count: number };  // Beat Hard AI X times

export const CHARACTER_ITEMS: CharacterItem[] = [
  // === HAIR ===
  { id: 'hair_short', name: 'Short', category: 'hair', gender: 'male', rarity: 'common', unlock: { type: 'default' }, icon: '💇‍♂️' },
  { id: 'hair_afro', name: 'Afro', category: 'hair', gender: 'both', rarity: 'common', unlock: { type: 'default' }, icon: '🧑🏾' },
  { id: 'hair_locs', name: 'Locs', category: 'hair', gender: 'both', rarity: 'rare', unlock: { type: 'wins', count: 5 }, icon: '🔒' },
  { id: 'hair_braids', name: 'Braids', category: 'hair', gender: 'female', rarity: 'common', unlock: { type: 'default' }, icon: '💇‍♀️' },
  { id: 'hair_bun', name: 'Bun', category: 'hair', gender: 'female', rarity: 'rare', unlock: { type: 'level', level: 5 }, icon: '👩' },

  // === TOPS ===
  { id: 'top_white-tee', name: 'White Tee', category: 'top', gender: 'both', rarity: 'common', unlock: { type: 'default' }, icon: '👕' },
  { id: 'top_hoodie', name: 'Hoodie', category: 'top', gender: 'both', rarity: 'common', unlock: { type: 'default' }, icon: '🧥' },
  { id: 'top_bomber', name: 'Bomber Jacket', category: 'top', gender: 'female', rarity: 'rare', unlock: { type: 'wins', count: 10 }, icon: '🧥' },
  { id: 'top_crop-top', name: 'Crop Top', category: 'top', gender: 'female', rarity: 'epic', unlock: { type: 'streak', count: 3 }, icon: '👚' },

  // === BOTTOMS ===
  { id: 'bottom_jeans', name: 'Jeans', category: 'bottom', gender: 'both', rarity: 'common', unlock: { type: 'default' }, icon: '👖' },
  { id: 'bottom_shorts', name: 'Shorts', category: 'bottom', gender: 'male', rarity: 'common', unlock: { type: 'default' }, icon: '🩳' },
  { id: 'bottom_cargo', name: 'Cargo Pants', category: 'bottom', gender: 'female', rarity: 'rare', unlock: { type: 'games', count: 20 }, icon: '👖' },
  { id: 'bottom_joggers', name: 'Joggers', category: 'bottom', gender: 'female', rarity: 'common', unlock: { type: 'default' }, icon: '👖' },
  { id: 'bottom_skirt', name: 'Skirt', category: 'bottom', gender: 'female', rarity: 'rare', unlock: { type: 'coins', price: 500 }, icon: '👗' },

  // === SHOES ===
  { id: 'shoes_sneakers', name: 'Sneakers', category: 'shoes', gender: 'male', rarity: 'common', unlock: { type: 'default' }, icon: '👟' },
  { id: 'shoes_barefoot', name: 'Barefoot', category: 'shoes', gender: 'male', rarity: 'common', unlock: { type: 'default' }, icon: '🦶' },
  { id: 'shoes_af1', name: 'Air Force 1s', category: 'shoes', gender: 'female', rarity: 'common', unlock: { type: 'default' }, icon: '👟' },
  { id: 'shoes_jordans', name: 'Jordans', category: 'shoes', gender: 'female', rarity: 'epic', unlock: { type: 'hard_wins', count: 5 }, icon: '👟' },
  { id: 'shoes_platforms', name: 'Platforms', category: 'shoes', gender: 'female', rarity: 'legendary', unlock: { type: 'career', level: 12 }, icon: '👠' },
];

// Get human-readable unlock description
export function getUnlockDescription(condition: UnlockCondition): string {
  switch (condition.type) {
    case 'default': return 'Available';
    case 'wins': return `Win ${condition.count} games`;
    case 'level': return `Reach Level ${condition.level}`;
    case 'streak': return `Get ${condition.count} win streak`;
    case 'coins': return `${condition.price} coins`;
    case 'games': return `Play ${condition.count} games`;
    case 'hard_wins': return `Beat Hard AI ${condition.count}x`;
    case 'career': return `Complete Career Level ${condition.level}`;
    default: return 'Locked';
  }
}
