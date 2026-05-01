/**
 * Character Save Migration — pure helpers that adapt persisted store
 * state across schema upgrades.
 *
 * Two distinct migrations:
 *
 *  1. **Cold seed**: a brand-new player has no `amgCharacter`. They
 *     also might have a legacy `customization.outfitId` from the
 *     pre-Path-A schema (migrated into `equippedOutfitId` on load).
 *     `seedAmgCharacter` returns the starter character with that
 *     legacy outfit's body parts applied so returning players don't
 *     lose their last look.
 *
 *  2. **Forward-migrate**: an existing AMG save predates the face-slot
 *     expansion (Eye / Ear / Nose / Teeth / Tongue weren't seeded).
 *     The Sidekick head mesh renders with hollow eye sockets without
 *     these parts grafted. `mergeMissingFaceSlots` adds them without
 *     overwriting whatever the player has equipped.
 *
 * Both helpers are pure: they take the current state + a starter
 * reference + a body-builder, and return either the next state or a
 * sentinel `null` meaning "no change needed".
 */

import type { CharacterState } from '@amg/character-runtime/types';

export interface SeedInput {
  /** The complete starter character (HUMN_BASE face + MDRN_CIVL_01 body). */
  starter: CharacterState;
  /** Equipped outfit pack id to seed the body from. Falls through to the
   *  starter's body when this matches the starter's default. */
  equippedOutfitId: string;
  /** Resolves an outfit id → body-only part dictionary. The shop's
   *  buildAmgBodyForOutfit fits this signature. */
  buildBody: (outfitId: string) => Partial<CharacterState['parts']>;
  /** The starter's outfit id — when equippedOutfitId matches this, we
   *  skip the buildBody call since the starter already has those parts. */
  starterOutfitId: string;
}

/**
 * Build the cold-launch seed. If the player had a legacy outfit
 * equipped, layer that pack's body on top of the starter face so they
 * don't reset to a default look.
 */
export function seedAmgCharacter(input: SeedInput): CharacterState {
  if (input.equippedOutfitId === input.starterOutfitId) {
    return input.starter;
  }
  const body = input.buildBody(input.equippedOutfitId);
  return {
    ...input.starter,
    parts: { ...input.starter.parts, ...body },
  };
}

/**
 * Forward-migrate an existing save: ensure every slot the starter
 * defines exists on the player's character, without overwriting any
 * slot they've already customized. Returns the upgraded state when
 * any slot was added; returns `null` when the save was already up to
 * date so the caller can skip a pointless write.
 */
export function mergeMissingFaceSlots(
  current: CharacterState,
  starter: CharacterState,
): CharacterState | null {
  const curParts = (current.parts || {}) as Record<string, string>;
  const starterParts = starter.parts as Record<string, string>;
  const merged: Record<string, string> = { ...curParts };
  let added = false;
  for (const [slot, name] of Object.entries(starterParts)) {
    if (!merged[slot]) {
      merged[slot] = name;
      added = true;
    }
  }
  if (!added) return null;
  return { ...current, parts: merged as CharacterState['parts'] };
}
