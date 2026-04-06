import { ImageSourcePropType } from 'react-native';

// ═══════════════════════════════════════════════════════════
// PET DATA — Dog companions for the lobby stage
// ═══════════════════════════════════════════════════════════

export interface Pet {
  id: string;
  name: string;
  breed: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  price: number; // 0 = earned only
  description?: string;
  idleImage: ImageSourcePropType;
  sitImage: ImageSourcePropType;
}

export const RARITY_ORDER = { common: 0, rare: 1, epic: 2, legendary: 3 };

export const PET_RARITY_COLORS: Record<string, string> = {
  common: '#8892b0',
  rare: '#3498db',
  epic: '#9b59b6',
  legendary: '#f1c40f',
};

export const PET_RARITY_LABELS: Record<string, string> = {
  common: 'Common',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
};

export const PETS: Pet[] = [
  // ─── Common (affordable starters) ───
  {
    id: 'labrador',
    name: 'Buddy',
    breed: 'Labrador',
    rarity: 'common',
    price: 500,
    idleImage: require('../assets/images/characters/pets/dog_labrador_idle.png'),
    sitImage: require('../assets/images/characters/pets/dog_labrador_sit.png'),
  },
  {
    id: 'goldenretrieve',
    name: 'Max',
    breed: 'Golden Retriever',
    rarity: 'common',
    price: 500,
    idleImage: require('../assets/images/characters/pets/dog_goldenretrieve_idle.png'),
    sitImage: require('../assets/images/characters/pets/dog_goldenretrieve_sit.png'),
  },
  {
    id: 'dalmatian',
    name: 'Spot',
    breed: 'Dalmatian',
    rarity: 'common',
    price: 750,
    idleImage: require('../assets/images/characters/pets/dog_dalmatian_idle.png'),
    sitImage: require('../assets/images/characters/pets/dog_dalmatian_sit.png'),
  },
  {
    id: 'pointer',
    name: 'Scout',
    breed: 'Pointer',
    rarity: 'common',
    price: 750,
    idleImage: require('../assets/images/characters/pets/dog_pointer_idle.png'),
    sitImage: require('../assets/images/characters/pets/dog_pointer_sit.png'),
  },

  // ─── Rare (mid-range) ───
  {
    id: 'husky',
    name: 'Luna',
    breed: 'Husky',
    rarity: 'rare',
    price: 2000,
    idleImage: require('../assets/images/characters/pets/dog_husky_idle.png'),
    sitImage: require('../assets/images/characters/pets/dog_husky_sit.png'),
  },
  {
    id: 'shiba',
    name: 'Mochi',
    breed: 'Shiba Inu',
    rarity: 'rare',
    price: 2500,
    idleImage: require('../assets/images/characters/pets/dog_shiba_idle.png'),
    sitImage: require('../assets/images/characters/pets/dog_shiba_sit.png'),
  },
  {
    id: 'germanshepherd',
    name: 'Rex',
    breed: 'German Shepherd',
    rarity: 'rare',
    price: 3000,
    idleImage: require('../assets/images/characters/pets/dog_germanshepherd_idle.png'),
    sitImage: require('../assets/images/characters/pets/dog_germanshepherd_sit.png'),
  },
  {
    id: 'greyhound',
    name: 'Flash',
    breed: 'Greyhound',
    rarity: 'rare',
    price: 2000,
    idleImage: require('../assets/images/characters/pets/dog_greyhound_idle.png'),
    sitImage: require('../assets/images/characters/pets/dog_greyhound_sit.png'),
  },
  {
    id: 'doberman',
    name: 'Shadow',
    breed: 'Doberman',
    rarity: 'rare',
    price: 3000,
    idleImage: require('../assets/images/characters/pets/dog_doberman_idle.png'),
    sitImage: require('../assets/images/characters/pets/dog_doberman_sit.png'),
  },

  // ─── Epic (premium) ───
  {
    id: 'fox',
    name: 'Foxy',
    breed: 'Fox',
    rarity: 'epic',
    price: 5000,
    idleImage: require('../assets/images/characters/pets/dog_fox_idle.png'),
    sitImage: require('../assets/images/characters/pets/dog_fox_sit.png'),
  },
  {
    id: 'wolf',
    name: 'Fenrir',
    breed: 'Wolf',
    rarity: 'epic',
    price: 6000,
    idleImage: require('../assets/images/characters/pets/dog_wolf_idle.png'),
    sitImage: require('../assets/images/characters/pets/dog_wolf_sit.png'),
  },
  {
    id: 'ridgeback',
    name: 'Atlas',
    breed: 'Ridgeback',
    rarity: 'epic',
    price: 5000,
    idleImage: require('../assets/images/characters/pets/dog_ridgeback_idle.png'),
    sitImage: require('../assets/images/characters/pets/dog_ridgeback_sit.png'),
  },

  // ─── Legendary (earned or very expensive) ───
  {
    id: 'hellhound',
    name: 'Cerberus',
    breed: 'Hellhound',
    rarity: 'legendary',
    price: 15000,
    idleImage: require('../assets/images/characters/pets/dog_hellhound_idle.png'),
    sitImage: require('../assets/images/characters/pets/dog_hellhound_sit.png'),
  },
  {
    id: 'robot',
    name: 'K-9',
    breed: 'Robot Dog',
    rarity: 'legendary',
    price: 20000,
    idleImage: require('../assets/images/characters/pets/dog_robot_idle.png'),
    sitImage: require('../assets/images/characters/pets/dog_robot_sit.png'),
  },
  {
    id: 'scifi',
    name: 'Nova',
    breed: 'Sci-Fi Dog',
    rarity: 'legendary',
    price: 0,
    description: 'Earn by reaching Dark Matter rank',
    idleImage: require('../assets/images/characters/pets/dog_scifi_idle.png'),
    sitImage: require('../assets/images/characters/pets/dog_scifi_sit.png'),
  },
];

/** Get a pet by ID */
export function getPetById(id: string): Pet | undefined {
  return PETS.find(p => p.id === id);
}
