import { useCharacterStore } from '../characterStore';
import { STARTER_HUMAN_CHARACTER } from '@amg/character-runtime/types';
import type { CharacterState } from '@amg/character-runtime/types';

// Reset store between tests so state from one doesn't leak into another.
beforeEach(() => {
  useCharacterStore.setState({
    amgCharacter: null,
    ownedOutfits: ['human_modern_civilians_01', 'human_modern_civilians_02'],
    equippedOutfitId: 'human_modern_civilians_01',
    ownedAmgParts: [],
    amgPartUnlockedAt: {},
    amgStarterSeen: false,
  });
});

describe('characterStore — equipOutfitPack', () => {
  it('swaps body slots while preserving face slots (Head, Eyebrows, Eyes, etc.)', () => {
    // Seed with the starter character
    useCharacterStore.getState().setAmgCharacter(
      STARTER_HUMAN_CHARACTER as unknown as Record<string, unknown>,
    );
    const before = useCharacterStore.getState().amgCharacter as unknown as CharacterState;
    expect(before.parts.Head).toBe('SK_HUMN_BASE_01_01HEAD_HU01');
    expect(before.parts.Torso).toBe('SK_MDRN_CIVL_01_10TORS_HU01');

    // Equip a Samurai pack
    useCharacterStore.getState().equipOutfitPack('human_samurai_warriors_03');
    const after = useCharacterStore.getState().amgCharacter as unknown as CharacterState;

    // Body slots updated
    expect(after.parts.Torso).toBe('SK_SAMR_WARR_03_10TORS_HU01');
    // Face slots preserved
    expect(after.parts.Head).toBe(before.parts.Head);
    expect(after.parts.EyebrowLeft).toBe(before.parts.EyebrowLeft);
    expect(after.parts.EyeLeft).toBe(before.parts.EyeLeft);
    expect(after.parts.Nose).toBe(before.parts.Nose);
    // equippedOutfitId mirrors the equip
    expect(useCharacterStore.getState().equippedOutfitId).toBe('human_samurai_warriors_03');
  });

  it('seeds with STARTER + outfit body when amgCharacter is null', () => {
    // amgCharacter is null in beforeEach
    useCharacterStore.getState().equipOutfitPack('human_apocalypse_outlaws_05');
    const after = useCharacterStore.getState().amgCharacter as unknown as CharacterState;
    expect(after).not.toBeNull();
    // Has STARTER face
    expect(after.parts.Head).toBe('SK_HUMN_BASE_01_01HEAD_HU01');
    // Has the new outfit's body
    expect(after.parts.Torso).toBe('SK_APOC_OUTL_05_10TORS_HU01');
  });
});

describe('characterStore — unlockOutfit', () => {
  it('adds outfit id to ownedOutfits and auto-unlocks the underlying AMG parts', () => {
    const id = 'human_samurai_warriors_03';
    expect(useCharacterStore.getState().ownedOutfits).not.toContain(id);
    expect(useCharacterStore.getState().ownedAmgParts).toEqual([]);

    useCharacterStore.getState().unlockOutfit(id);

    expect(useCharacterStore.getState().ownedOutfits).toContain(id);
    // Body parts from the unlocked pack are now owned
    expect(useCharacterStore.getState().ownedAmgParts).toContain('SK_SAMR_WARR_03_10TORS_HU01');
    // Each new part has an unlock timestamp
    expect(useCharacterStore.getState().amgPartUnlockedAt['SK_SAMR_WARR_03_10TORS_HU01']).toBeDefined();
  });

  it('is idempotent — re-unlocking does not add duplicate entries', () => {
    const id = 'human_samurai_warriors_03';
    useCharacterStore.getState().unlockOutfit(id);
    const ownedAfterFirst = [...useCharacterStore.getState().ownedAmgParts];
    const tsAfterFirst = useCharacterStore.getState().amgPartUnlockedAt['SK_SAMR_WARR_03_10TORS_HU01'];

    useCharacterStore.getState().unlockOutfit(id);
    expect(useCharacterStore.getState().ownedAmgParts).toEqual(ownedAfterFirst);
    // Timestamp should not be re-set on the second call (preserves NEW badge fairness)
    expect(useCharacterStore.getState().amgPartUnlockedAt['SK_SAMR_WARR_03_10TORS_HU01']).toBe(tsAfterFirst);
  });
});

describe('characterStore — isOutfitOwned', () => {
  it('returns true for starter outfits even if not in ownedOutfits', () => {
    useCharacterStore.setState({ ownedOutfits: [] });
    expect(useCharacterStore.getState().isOutfitOwned('human_modern_civilians_01')).toBe(true);
  });

  it('returns true for outfits in ownedOutfits', () => {
    useCharacterStore.setState({ ownedOutfits: ['human_samurai_warriors_03'] });
    expect(useCharacterStore.getState().isOutfitOwned('human_samurai_warriors_03')).toBe(true);
  });

  it('returns false for outfits the player does not own', () => {
    expect(useCharacterStore.getState().isOutfitOwned('human_samurai_warriors_03')).toBe(false);
  });
});

describe('characterStore — isAmgPartOwned', () => {
  it('returns true for starter-pack parts even when ownedAmgParts is empty', () => {
    expect(useCharacterStore.getState().isAmgPartOwned('SK_MDRN_CIVL_01_10TORS_HU01')).toBe(true);
    expect(useCharacterStore.getState().isAmgPartOwned('SK_HUMN_BASE_01_01HEAD_HU01')).toBe(true);
  });

  it('returns true for parts the player has explicitly unlocked', () => {
    useCharacterStore.getState().unlockAmgPart('SK_SAMR_WARR_03_10TORS_HU01');
    expect(useCharacterStore.getState().isAmgPartOwned('SK_SAMR_WARR_03_10TORS_HU01')).toBe(true);
  });

  it('returns false for unowned non-starter parts', () => {
    expect(useCharacterStore.getState().isAmgPartOwned('SK_SAMR_WARR_03_10TORS_HU01')).toBe(false);
  });
});

describe('characterStore — unlockAmgPart', () => {
  it('adds a single part with an unlock timestamp', () => {
    useCharacterStore.getState().unlockAmgPart('SK_SAMR_WARR_03_10TORS_HU01');
    expect(useCharacterStore.getState().ownedAmgParts).toContain('SK_SAMR_WARR_03_10TORS_HU01');
    expect(useCharacterStore.getState().amgPartUnlockedAt['SK_SAMR_WARR_03_10TORS_HU01']).toBeDefined();
  });

  it('is idempotent — re-unlocking a part is a no-op', () => {
    useCharacterStore.getState().unlockAmgPart('SK_SAMR_WARR_03_10TORS_HU01');
    const owned = [...useCharacterStore.getState().ownedAmgParts];
    useCharacterStore.getState().unlockAmgPart('SK_SAMR_WARR_03_10TORS_HU01');
    expect(useCharacterStore.getState().ownedAmgParts).toEqual(owned);
  });
});

describe('characterStore — equipAmgPart', () => {
  it('updates a single slot without touching others', () => {
    useCharacterStore.getState().setAmgCharacter(
      STARTER_HUMAN_CHARACTER as unknown as Record<string, unknown>,
    );
    const before = useCharacterStore.getState().amgCharacter as unknown as CharacterState;
    const beforeHair = before.parts.Hair;
    const beforeLeg = before.parts.LegLeft;

    useCharacterStore.getState().equipAmgPart('Torso', 'SK_SAMR_WARR_03_10TORS_HU01');

    const after = useCharacterStore.getState().amgCharacter as unknown as CharacterState;
    expect(after.parts.Torso).toBe('SK_SAMR_WARR_03_10TORS_HU01');
    // Other slots untouched
    expect(after.parts.Hair).toBe(beforeHair);
    expect(after.parts.LegLeft).toBe(beforeLeg);
    expect(after.parts.Head).toBe(STARTER_HUMAN_CHARACTER.parts.Head);
  });

  it('seeds STARTER + the equipped part when amgCharacter is null', () => {
    useCharacterStore.setState({ amgCharacter: null });
    useCharacterStore.getState().equipAmgPart('AttachmentBack', 'SK_APOC_OUTL_03_24ABAC_HU01');
    const after = useCharacterStore.getState().amgCharacter as unknown as CharacterState;
    expect(after).not.toBeNull();
    expect(after.parts.AttachmentBack).toBe('SK_APOC_OUTL_03_24ABAC_HU01');
    // Starter face also seeded
    expect(after.parts.Head).toBe(STARTER_HUMAN_CHARACTER.parts.Head);
  });

  it('overwrites an already-equipped part', () => {
    useCharacterStore.getState().setAmgCharacter(
      STARTER_HUMAN_CHARACTER as unknown as Record<string, unknown>,
    );
    useCharacterStore.getState().equipAmgPart('Torso', 'SK_SAMR_WARR_03_10TORS_HU01');
    useCharacterStore.getState().equipAmgPart('Torso', 'SK_APOC_OUTL_05_10TORS_HU01');
    const after = useCharacterStore.getState().amgCharacter as unknown as CharacterState;
    expect(after.parts.Torso).toBe('SK_APOC_OUTL_05_10TORS_HU01');
  });
});

describe('characterStore — buy + equip end-to-end', () => {
  // Mirror the ShopScreen.handleOutfitBuy flow: unlockOutfit then equipOutfitPack.
  // Verifies the outfit pack lands in ownedOutfits, every body slot's part is
  // owned, the character's parts swap to the new pack, and the equippedOutfitId
  // mirrors the equip — all the things the player sees after tapping BUY.
  it('player buys an outfit pack: outfit + parts owned, character equipped, equippedOutfitId updated', () => {
    useCharacterStore.getState().setAmgCharacter(
      STARTER_HUMAN_CHARACTER as unknown as Record<string, unknown>,
    );
    const id = 'human_apocalypse_outlaws_05';

    // Pre-conditions
    expect(useCharacterStore.getState().isOutfitOwned(id)).toBe(false);
    expect(useCharacterStore.getState().equippedOutfitId).toBe('human_modern_civilians_01');

    // The buy flow
    useCharacterStore.getState().unlockOutfit(id);
    useCharacterStore.getState().equipOutfitPack(id);

    // Post-conditions
    expect(useCharacterStore.getState().isOutfitOwned(id)).toBe(true);
    expect(useCharacterStore.getState().equippedOutfitId).toBe(id);
    const after = useCharacterStore.getState().amgCharacter as unknown as CharacterState;
    expect(after.parts.Torso).toBe('SK_APOC_OUTL_05_10TORS_HU01');
    expect(after.parts.LegLeft).toBe('SK_APOC_OUTL_05_18LEGL_HU01');
    // Player's face survives the equip (Devon's "preserve face on equip" mandate)
    expect(after.parts.Head).toBe(STARTER_HUMAN_CHARACTER.parts.Head);
    expect(after.parts.EyeLeft).toBe(STARTER_HUMAN_CHARACTER.parts.EyeLeft);
    // Underlying parts are now owned in the creator
    expect(useCharacterStore.getState().isAmgPartOwned('SK_APOC_OUTL_05_10TORS_HU01')).toBe(true);
  });

  it('after buy, swapping individual parts in the creator works (player can mix-and-match)', () => {
    useCharacterStore.getState().setAmgCharacter(
      STARTER_HUMAN_CHARACTER as unknown as Record<string, unknown>,
    );
    useCharacterStore.getState().unlockOutfit('human_samurai_warriors_03');
    // Player went into the creator and wants only the samurai TORSO,
    // keeping the modern civilian pants. setAmgCharacter writes the
    // partial swap directly.
    const cur = useCharacterStore.getState().amgCharacter as unknown as CharacterState;
    useCharacterStore.getState().setAmgCharacter({
      ...cur,
      parts: {
        ...cur.parts,
        Torso: 'SK_SAMR_WARR_03_10TORS_HU01',
      },
    } as unknown as Record<string, unknown>);
    const after = useCharacterStore.getState().amgCharacter as unknown as CharacterState;
    expect(after.parts.Torso).toBe('SK_SAMR_WARR_03_10TORS_HU01');
    // Pants stayed Modern Civilians (mix-and-match)
    expect(after.parts.LegLeft).toBe(STARTER_HUMAN_CHARACTER.parts.LegLeft);
  });
});
