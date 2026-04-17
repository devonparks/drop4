// Roster store — tracks which characters the player has unlocked and which one
// they currently have equipped. The roster catalog itself lives in
// src/data/characterRoster.ts; this store only holds player state.
//
// Cross-game intent: this store's persisted shape is what every AMG ecosystem
// game (Drop4, Chess, TTT, etc.) will share via cloud sync. Keep it minimal
// and portable — strings only.

import { create } from 'zustand';
import { saveState, loadState } from '../services/storage';
import {
  DEFAULT_CHARACTER_ID,
  RosterCharacterId,
  ROSTER_BY_ID,
  ROSTER,
  getCharacterUnlockedAtLevel,
} from '../data/characterRoster';

// All starter characters are unlocked from day one.
const STARTER_IDS: RosterCharacterId[] = ROSTER
  .filter((c) => c.unlockedAtCareerLevel == null)
  .map((c) => c.id);

interface RosterState {
  equippedCharacterId: RosterCharacterId;
  unlockedCharacterIds: RosterCharacterId[];
  /**
   * Characters unlocked since last UI acknowledgment. Pop one off when the
   * unlock toast/modal is shown so we don't re-show it on app restart.
   */
  pendingUnlocks: RosterCharacterId[];

  // Actions
  equipCharacter: (id: RosterCharacterId) => void;
  /** Returns true if this is a NEW unlock (not previously owned). */
  unlockCharacter: (id: RosterCharacterId) => boolean;
  /** Convenience: unlock the character tied to a career level, if any. */
  unlockForCareerLevel: (levelId: number) => RosterCharacterId | null;
  isUnlocked: (id: RosterCharacterId) => boolean;
  consumePendingUnlock: () => RosterCharacterId | null;
  loadFromStorage: () => Promise<void>;
}

interface PersistedRoster {
  equippedCharacterId: RosterCharacterId;
  unlockedCharacterIds: RosterCharacterId[];
  pendingUnlocks: RosterCharacterId[];
}

export const useRosterStore = create<RosterState>((set, get) => ({
  equippedCharacterId: DEFAULT_CHARACTER_ID,
  unlockedCharacterIds: [...STARTER_IDS],
  pendingUnlocks: [],

  equipCharacter: (id) => {
    if (!ROSTER_BY_ID[id]) return;        // unknown id, ignore
    if (!get().unlockedCharacterIds.includes(id)) return; // not owned, ignore
    set({ equippedCharacterId: id });
  },

  unlockCharacter: (id) => {
    if (!ROSTER_BY_ID[id]) return false;
    const owned = get().unlockedCharacterIds;
    if (owned.includes(id)) return false;
    set({
      unlockedCharacterIds: [...owned, id],
      pendingUnlocks: [...get().pendingUnlocks, id],
    });
    return true;
  },

  unlockForCareerLevel: (levelId) => {
    const character = getCharacterUnlockedAtLevel(levelId);
    if (!character) return null;
    const isNew = get().unlockCharacter(character.id);
    return isNew ? character.id : null;
  },

  isUnlocked: (id) => get().unlockedCharacterIds.includes(id),

  consumePendingUnlock: () => {
    const queue = get().pendingUnlocks;
    if (queue.length === 0) return null;
    const [head, ...rest] = queue;
    set({ pendingUnlocks: rest });
    return head;
  },

  loadFromStorage: async () => {
    const saved = await loadState<PersistedRoster>('roster');
    if (!saved) return;

    // Defensive load: drop any ids that no longer exist in the catalog
    // (e.g. an opponent was renamed). The default character is always present.
    const validUnlocks = (saved.unlockedCharacterIds || []).filter((id) => !!ROSTER_BY_ID[id]);
    const unlocked = validUnlocks.includes(DEFAULT_CHARACTER_ID)
      ? validUnlocks
      : [DEFAULT_CHARACTER_ID, ...validUnlocks];

    const equipped = unlocked.includes(saved.equippedCharacterId)
      ? saved.equippedCharacterId
      : DEFAULT_CHARACTER_ID;

    set({
      equippedCharacterId: equipped,
      unlockedCharacterIds: unlocked,
      pendingUnlocks: (saved.pendingUnlocks || []).filter((id) => !!ROSTER_BY_ID[id]),
    });
  },
}));

// Auto-save on every change.
useRosterStore.subscribe((state) => {
  const persisted: PersistedRoster = {
    equippedCharacterId: state.equippedCharacterId,
    unlockedCharacterIds: state.unlockedCharacterIds,
    pendingUnlocks: state.pendingUnlocks,
  };
  saveState('roster', persisted);
});
