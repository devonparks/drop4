import React, { useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import { CharacterCreator } from '@amg/character-creator';
import {
  NEUTRAL_CHARACTER,
  type CharacterState,
  type ContentSource,
} from '@amg/character-runtime';
import { useCharacterStore } from '../stores/characterStore';
import { useShopStore } from '../stores/shopStore';
import { haptics } from '../services/haptics';

// ═══════════════════════════════════════════════════════════════════════
// CharacterCreatorScreen — Drop4's wiring for the shared AMG creator
//
// The creator itself lives in @amg/character-creator. This screen only:
//   1. Pulls the current character state from Drop4's characterStore
//   2. Hands it to <CharacterCreator> alongside the content source
//   3. Persists the result back on Save
//
// Drop4 doesn't track per-part ownership yet at the AMG level (the
// existing ownedOutfits store is for the legacy single-GLB outfit
// system), so we pass ownedParts=null — every part is treated as
// owned during the creator UX transition. When Drop4 migrates to the
// parts-based shop we'll wire ownedParts here.
// ═══════════════════════════════════════════════════════════════════════

// Local dev server for now. Flip to the R2 URL when production content
// goes live; the component + runtime don't care which.
const CONTENT_SOURCE: ContentSource = {
  baseUrl: 'http://localhost:8080',
};

export function CharacterCreatorScreen() {
  const navigation = useNavigation<any>();

  // characterStore now has a dedicated amgCharacter slot persisted to
  // AsyncStorage alongside the legacy single-GLB customization. First
  // open gets NEUTRAL_CHARACTER; subsequent opens restore the last save.
  //
  // The store types amgCharacter as Record<string, unknown> to stay
  // decoupled from @amg/character-runtime. We cast at this boundary
  // since this screen is the one place that knows the shape is
  // actually CharacterState.
  const amgCharacter = useCharacterStore((s) => s.amgCharacter) as unknown as CharacterState | null;
  const setAmgCharacter = useCharacterStore((s) => s.setAmgCharacter);
  const initial = useMemo<CharacterState>(
    () => amgCharacter ?? NEUTRAL_CHARACTER,
    [amgCharacter],
  );

  function handleSave(next: CharacterState) {
    haptics.win();
    setAmgCharacter(next as unknown as Record<string, unknown>);
    navigation.goBack();
  }

  function handleCancel() {
    haptics.tap();
    navigation.goBack();
  }

  return (
    <CharacterCreator
      source={CONTENT_SOURCE}
      initial={initial}
      ownedParts={null}
      onSave={handleSave}
      onCancel={handleCancel}
    />
  );
}
