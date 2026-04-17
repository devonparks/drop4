/**
 * Pet GLB Registry — Polygon Dog breeds.
 *
 * Each breed maps to a GLB produced by the pipeline:
 *   1) Unity → Tools/Drop4/Export Polygon Dogs As FBX
 *   2) npm run convert-fbx pets
 */

export type PetId =
  | 'dog_coyote' | 'dog_dalmatian' | 'dog_doberman' | 'dog_fox'
  | 'dog_german_shepherd' | 'dog_golden_retrieve' | 'dog_greyhound'
  | 'dog_hellhound' | 'dog_husky' | 'dog_labrador' | 'dog_pointer'
  | 'dog_ridgeback' | 'dog_robot' | 'dog_scifi' | 'dog_shiba' | 'dog_wolf';

export type PetRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface PetMeta {
  id: PetId;
  name: string;
  species: 'dog';
  rarity: PetRarity;
  price: number;         // in coins (0 = free/starter)
  unlockedByDefault?: boolean;
  unlockVia?: string;
  glb: number;
}

// GLB filenames are lowercased concatenations ('dog_germanshepherd.glb')
// while the PetId uses underscored slugs. Keep both in sync here.
export const PETS: Record<PetId, PetMeta> = {
  dog_labrador:         { id: 'dog_labrador',         name: 'Labrador',         species: 'dog', rarity: 'common',    price: 0,    unlockedByDefault: true, glb: require('../assets/models/pets/dog_labrador.glb') },
  dog_golden_retrieve:  { id: 'dog_golden_retrieve',  name: 'Golden Retriever', species: 'dog', rarity: 'common',    price: 500,  glb: require('../assets/models/pets/dog_goldenretrieve.glb') },
  dog_shiba:            { id: 'dog_shiba',            name: 'Shiba',            species: 'dog', rarity: 'common',    price: 500,  glb: require('../assets/models/pets/dog_shiba.glb') },
  dog_dalmatian:        { id: 'dog_dalmatian',        name: 'Dalmatian',        species: 'dog', rarity: 'rare',      price: 750,  glb: require('../assets/models/pets/dog_dalmatian.glb') },
  dog_husky:            { id: 'dog_husky',            name: 'Husky',            species: 'dog', rarity: 'rare',      price: 1000, glb: require('../assets/models/pets/dog_husky.glb') },
  dog_german_shepherd:  { id: 'dog_german_shepherd',  name: 'German Shepherd',  species: 'dog', rarity: 'rare',      price: 1000, glb: require('../assets/models/pets/dog_germanshepherd.glb') },
  dog_doberman:         { id: 'dog_doberman',         name: 'Doberman',         species: 'dog', rarity: 'rare',      price: 1000, glb: require('../assets/models/pets/dog_doberman.glb') },
  dog_pointer:          { id: 'dog_pointer',          name: 'Pointer',          species: 'dog', rarity: 'rare',      price: 750,  glb: require('../assets/models/pets/dog_pointer.glb') },
  dog_ridgeback:        { id: 'dog_ridgeback',        name: 'Ridgeback',        species: 'dog', rarity: 'rare',      price: 1000, glb: require('../assets/models/pets/dog_ridgeback.glb') },
  dog_greyhound:        { id: 'dog_greyhound',        name: 'Greyhound',        species: 'dog', rarity: 'rare',      price: 1000, glb: require('../assets/models/pets/dog_greyhound.glb') },
  dog_fox:              { id: 'dog_fox',              name: 'Fox',              species: 'dog', rarity: 'epic',      price: 2000, glb: require('../assets/models/pets/dog_fox.glb') },
  dog_coyote:           { id: 'dog_coyote',           name: 'Coyote',           species: 'dog', rarity: 'epic',      price: 2000, glb: require('../assets/models/pets/dog_coyote.glb') },
  dog_wolf:             { id: 'dog_wolf',             name: 'Wolf',             species: 'dog', rarity: 'epic',      price: 3000, glb: require('../assets/models/pets/dog_wolf.glb') },
  dog_hellhound:        { id: 'dog_hellhound',        name: 'Hellhound',        species: 'dog', rarity: 'legendary', price: 5000, unlockVia: 'Complete Hell Court',      glb: require('../assets/models/pets/dog_hellhound.glb') },
  dog_robot:            { id: 'dog_robot',            name: 'Robo-Pup',         species: 'dog', rarity: 'legendary', price: 5000, unlockVia: 'Complete Scifi Chapter',   glb: require('../assets/models/pets/dog_robot.glb') },
  dog_scifi:            { id: 'dog_scifi',            name: 'Cyber Hound',      species: 'dog', rarity: 'legendary', price: 7500, unlockVia: 'Season Pass Tier 50',      glb: require('../assets/models/pets/dog_scifi.glb') },
};

export const PET_IDS: PetId[] = Object.keys(PETS) as PetId[];

export const STARTER_PET_ID: PetId = 'dog_labrador';

export function getPet(id: PetId): PetMeta {
  return PETS[id];
}
