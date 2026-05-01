import {
  seedAmgCharacter,
  mergeMissingFaceSlots,
} from '../characterMigration';
import { STARTER_HUMAN_CHARACTER } from '@amg/character-runtime/types';
import type { CharacterState } from '@amg/character-runtime/types';

// ═══════════════════════════════════════════════════════════════════════
// Migration helper tests
//
// These cover the two upgrade paths a returning player can land in:
//   1. No amgCharacter at all (cold seed) — they shouldn't lose the
//      legacy outfit they had equipped before Path-A landed.
//   2. amgCharacter exists but predates the face-slot expansion — they
//      shouldn't render with hollow eye sockets just because their save
//      pre-dates the new seed shape.
// ═══════════════════════════════════════════════════════════════════════

const STARTER_OUTFIT_ID = 'human_modern_civilians_01';

// Stand-in for npcCustomizations.buildAmgBodyForOutfit — keeps the
// migration tests independent of the real translator. The shape of
// the returned object is what matters: a partial parts dict.
function fakeBuildBody(outfitId: string): Partial<CharacterState['parts']> {
  if (outfitId === 'human_apocalypse_outlaws_05') {
    return {
      Hair:          'SK_APOC_OUTL_05_02HAIR_HU01',
      Torso:         'SK_APOC_OUTL_05_10TORS_HU01',
      Hips:          'SK_APOC_OUTL_05_17HIPS_HU01',
      LegLeft:       'SK_APOC_OUTL_05_18LEGL_HU01',
      LegRight:      'SK_APOC_OUTL_05_19LEGR_HU01',
      ArmUpperLeft:  'SK_APOC_OUTL_05_11AUPL_HU01',
      ArmUpperRight: 'SK_APOC_OUTL_05_12AUPR_HU01',
      ArmLowerLeft:  'SK_APOC_OUTL_05_13ALWL_HU01',
      ArmLowerRight: 'SK_APOC_OUTL_05_14ALWR_HU01',
      HandLeft:      'SK_APOC_OUTL_05_15HNDL_HU01',
      HandRight:     'SK_APOC_OUTL_05_16HNDR_HU01',
      FootLeft:      'SK_APOC_OUTL_05_20FOTL_HU01',
      FootRight:     'SK_APOC_OUTL_05_21FOTR_HU01',
    };
  }
  return {};
}

describe('seedAmgCharacter', () => {
  it('returns the starter as-is when equippedOutfitId matches the starter outfit', () => {
    const result = seedAmgCharacter({
      starter: STARTER_HUMAN_CHARACTER,
      equippedOutfitId: STARTER_OUTFIT_ID,
      starterOutfitId: STARTER_OUTFIT_ID,
      buildBody: fakeBuildBody,
    });
    expect(result).toEqual(STARTER_HUMAN_CHARACTER);
  });

  it('layers a non-starter outfit body on top of the starter face', () => {
    const result = seedAmgCharacter({
      starter: STARTER_HUMAN_CHARACTER,
      equippedOutfitId: 'human_apocalypse_outlaws_05',
      starterOutfitId: STARTER_OUTFIT_ID,
      buildBody: fakeBuildBody,
    });
    // Body slots come from the legacy outfit
    expect(result.parts.Torso).toBe('SK_APOC_OUTL_05_10TORS_HU01');
    expect(result.parts.LegLeft).toBe('SK_APOC_OUTL_05_18LEGL_HU01');
    // Face slots survive from the starter (returning users don't lose
    // their face just because their legacy outfit didn't ship one)
    expect(result.parts.Head).toBe(STARTER_HUMAN_CHARACTER.parts.Head);
    expect(result.parts.EyeLeft).toBe(STARTER_HUMAN_CHARACTER.parts.EyeLeft);
    expect(result.parts.EyebrowLeft).toBe(STARTER_HUMAN_CHARACTER.parts.EyebrowLeft);
  });

  it('preserves species + colors + blendshapes from the starter', () => {
    const result = seedAmgCharacter({
      starter: STARTER_HUMAN_CHARACTER,
      equippedOutfitId: 'human_apocalypse_outlaws_05',
      starterOutfitId: STARTER_OUTFIT_ID,
      buildBody: fakeBuildBody,
    });
    expect(result.species).toBe(STARTER_HUMAN_CHARACTER.species);
    expect(result.colors).toEqual(STARTER_HUMAN_CHARACTER.colors);
    expect(result.blendshapes).toEqual(STARTER_HUMAN_CHARACTER.blendshapes);
  });
});

describe('mergeMissingFaceSlots', () => {
  it('returns null when the save already has every starter slot', () => {
    // amgCharacter equal to STARTER means nothing to merge
    const result = mergeMissingFaceSlots(
      STARTER_HUMAN_CHARACTER,
      STARTER_HUMAN_CHARACTER,
    );
    expect(result).toBeNull();
  });

  it('adds missing face slots without overwriting equipped parts', () => {
    // Simulate an old save: only the original 16 essential slots
    const oldSave: CharacterState = {
      species: 'Human',
      parts: {
        Head:         'SK_HUMN_BASE_01_01HEAD_HU01',
        Hair:         'SK_SAMR_WARR_01_02HAIR_HU01', // player customized to Samurai hair
        EyebrowLeft:  'SK_HUMN_BASE_01_03EBRL_HU01',
        EyebrowRight: 'SK_HUMN_BASE_01_04EBRR_HU01',
        Torso:        'SK_SAMR_WARR_03_10TORS_HU01', // player equipped Samurai torso
        Hips:         'SK_MDRN_CIVL_01_17HIPS_HU01',
        // No EyeLeft / EyeRight / Nose / Teeth / Tongue / Ears
      },
      blendshapes: { feminine: 0.5, weight: 0, muscle: 0.5 },
      colors: { 'Skin 01': '#dcb088' },
      animation: null,
      expression: null,
    };
    const result = mergeMissingFaceSlots(oldSave, STARTER_HUMAN_CHARACTER);
    expect(result).not.toBeNull();
    // New face slots present
    expect(result!.parts.EyeLeft).toBe(STARTER_HUMAN_CHARACTER.parts.EyeLeft);
    expect(result!.parts.EyeRight).toBe(STARTER_HUMAN_CHARACTER.parts.EyeRight);
    expect(result!.parts.Nose).toBe(STARTER_HUMAN_CHARACTER.parts.Nose);
    expect(result!.parts.Teeth).toBe(STARTER_HUMAN_CHARACTER.parts.Teeth);
    expect(result!.parts.Tongue).toBe(STARTER_HUMAN_CHARACTER.parts.Tongue);
    // Player's customizations preserved
    expect(result!.parts.Hair).toBe('SK_SAMR_WARR_01_02HAIR_HU01');
    expect(result!.parts.Torso).toBe('SK_SAMR_WARR_03_10TORS_HU01');
  });

  it('preserves species, colors, and blendshapes from the saved state', () => {
    const oldSave: CharacterState = {
      species: 'Human',
      parts: {
        Head: 'SK_HUMN_BASE_01_01HEAD_HU01',
        Torso: 'SK_SAMR_WARR_03_10TORS_HU01',
      },
      blendshapes: { feminine: 0.85, weight: -0.2, muscle: 0.6 },
      colors: { 'Skin 01': '#7a513e', 'Hair 01': '#c73838' },
      animation: null,
      expression: null,
    };
    const result = mergeMissingFaceSlots(oldSave, STARTER_HUMAN_CHARACTER);
    expect(result).not.toBeNull();
    expect(result!.species).toBe('Human');
    expect(result!.blendshapes).toEqual(oldSave.blendshapes);
    expect(result!.colors).toEqual(oldSave.colors);
  });

  it('handles saves with empty parts (e.g. a paused species swap)', () => {
    const empty: CharacterState = {
      species: 'Human',
      parts: {},
      blendshapes: { feminine: 0.5, weight: 0, muscle: 0.5 },
      colors: {},
      animation: null,
      expression: null,
    };
    const result = mergeMissingFaceSlots(empty, STARTER_HUMAN_CHARACTER);
    expect(result).not.toBeNull();
    // Every starter slot lands
    for (const [slot, name] of Object.entries(STARTER_HUMAN_CHARACTER.parts)) {
      expect((result!.parts as Record<string, string>)[slot]).toBe(name);
    }
  });
});
