/**
 * Pet Store — tracks which pets are owned + which is active.
 *
 * - Starter pet (Labrador) is owned by default.
 * - Pets are purchased from the shop with coins (or unlocked via career/season).
 * - Only one pet is "active" (shown alongside the player) at a time.
 * - Persisted via AsyncStorage.
 */

import { create } from 'zustand';
import { saveState, loadState } from '../services/storage';
import { PETS, STARTER_PET_ID, type PetId } from '../data/petRegistry';

interface PetState {
  ownedPets: PetId[];
  activePetId: PetId | null;

  hydrate: () => Promise<void>;
  ownsPet: (id: PetId) => boolean;
  unlockPet: (id: PetId) => void;
  setActivePet: (id: PetId | null) => void;
  purchasePet: (id: PetId, availableCoins: number) => { ok: boolean; cost: number };
}

const STORAGE_KEY = 'drop4_pets';

interface Persisted {
  ownedPets: PetId[];
  activePetId: PetId | null;
}

export const usePetStore = create<PetState>((set, get) => ({
  ownedPets: [STARTER_PET_ID],
  activePetId: STARTER_PET_ID,

  hydrate: async () => {
    const saved = await loadState<Persisted>(STORAGE_KEY);
    if (!saved) return;
    const owned = saved.ownedPets?.length ? saved.ownedPets : [STARTER_PET_ID];
    set({
      ownedPets: owned,
      activePetId: saved.activePetId ?? owned[0] ?? null,
    });
  },

  ownsPet: (id) => get().ownedPets.includes(id),

  unlockPet: (id) => {
    if (get().ownedPets.includes(id)) return;
    const owned = [...get().ownedPets, id];
    set({ ownedPets: owned });
    saveState(STORAGE_KEY, { ownedPets: owned, activePetId: get().activePetId });
  },

  setActivePet: (id) => {
    if (id !== null && !get().ownedPets.includes(id)) return;
    set({ activePetId: id });
    saveState(STORAGE_KEY, { ownedPets: get().ownedPets, activePetId: id });
  },

  purchasePet: (id, availableCoins) => {
    const pet = PETS[id];
    if (!pet) return { ok: false, cost: 0 };
    if (get().ownedPets.includes(id)) return { ok: false, cost: 0 };
    if (availableCoins < pet.price) return { ok: false, cost: pet.price };
    const owned = [...get().ownedPets, id];
    set({ ownedPets: owned, activePetId: id });
    saveState(STORAGE_KEY, { ownedPets: owned, activePetId: id });
    return { ok: true, cost: pet.price };
  },
}));
