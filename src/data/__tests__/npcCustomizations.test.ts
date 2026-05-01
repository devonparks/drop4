import {
  getNpcCustomization,
  getRosterCustomization,
  buildAmgCharacterForOutfit,
  buildAmgBodyForOutfit,
} from '../npcCustomizations';
import { AMG_PART_NAMES } from '../amgPartNamesIndex';

// ═══════════════════════════════════════════════════════════════════════
// NPC translator smoke tests
//
// The `make()` translator in npcCustomizations.ts builds AMG part names
// from legacy outfit ids using a pack-prefix mapping + variant lookup +
// fallback chain. These tests lock in:
//   1. Every part name emitted by every NPC actually exists in the live
//      manifest (AMG_PART_NAMES is generated from the R2 manifest).
//   2. Every NPC has a renderable body (Torso + Hips + Legs minimum).
//   3. The shop's "equip outfit pack" flow produces a valid body diff.
// ═══════════════════════════════════════════════════════════════════════

const SAMPLE_NPC_KEYS = [
  // Easy-tier difficulty fallbacks
  'easy', 'medium', 'hard', 'legend',
  // Career chapter 1 names
  'rookie ron', 'beginner ben', 'tiny tim', 'king kyle',
  // Career chapter 2 mid-tier
  'iron ivan', 'mega mike', 'six-pack sam', 'grandmaster grace',
  // Career chapter 3 — covers multiple species
  'upside-down uma',  // goblin
  'storm surge sara', // elves
  'old guard otto',   // skeleton
  'ghost greg',       // zombie
  'final boss frank', // human
  'the dark lord',
  // Quick play bot personas
  'chill charlie', 'master maxine', 'savage sam',
  // Numeric career level fallbacks
  'lvl1', 'lvl15', 'lvl30',
  // Unknown key (falls back to BOT_MEDIUM)
  'unknown_key_xyz',
];

const SAMPLE_ROSTER_IDS = ['bones', 'pixel', 'luna', 'tank', 'unknown'];

const SAMPLE_OUTFIT_IDS = [
  'human_modern_civilians_01',
  'human_modern_civilians_03',
  'human_modern_police_07',
  'human_samurai_warriors_07',
  'human_apocalypse_outlaws_08',
  'goblin_goblin_fighters_04',
  'elves_elven_warriors_03',
  'skeleton_fantasy_skeletons_05',
  'zombie_apocalypse_zombies_02',
];

describe('npcCustomizations translator', () => {
  it('emits only manifest-validated part names for every NPC key', () => {
    const seen = new Set<string>();
    for (const key of SAMPLE_NPC_KEYS) {
      const character = getNpcCustomization(key);
      for (const partName of Object.values(character.parts)) {
        if (!partName) continue;
        seen.add(partName);
        expect(AMG_PART_NAMES.has(partName)).toBe(true);
      }
    }
    // Sanity: at least one part was checked
    expect(seen.size).toBeGreaterThan(0);
  });

  it('every NPC has a renderable body (Torso + Hips + LegLeft + LegRight)', () => {
    for (const key of SAMPLE_NPC_KEYS) {
      const c = getNpcCustomization(key);
      expect(c.parts.Torso).toBeDefined();
      expect(c.parts.Hips).toBeDefined();
      expect(c.parts.LegLeft).toBeDefined();
      expect(c.parts.LegRight).toBeDefined();
    }
  });

  it('roster characters resolve to valid CharacterStates', () => {
    for (const id of SAMPLE_ROSTER_IDS) {
      const c = getRosterCustomization(id);
      if (id === 'unknown') {
        expect(c).toBeNull();
        continue;
      }
      expect(c).not.toBeNull();
      for (const partName of Object.values(c!.parts)) {
        if (!partName) continue;
        expect(AMG_PART_NAMES.has(partName)).toBe(true);
      }
    }
  });

  it('buildAmgCharacterForOutfit produces valid CharacterStates', () => {
    for (const outfitId of SAMPLE_OUTFIT_IDS) {
      const c = buildAmgCharacterForOutfit(outfitId);
      // Body slots present
      expect(c.parts.Torso).toBeDefined();
      // Default colors seeded for the species
      expect(c.colors['Skin 01']).toBeDefined();
      // Blendshapes set with sensible defaults
      expect(typeof c.blendshapes.feminine).toBe('number');
      // All emitted parts are in the manifest
      for (const partName of Object.values(c.parts)) {
        if (!partName) continue;
        expect(AMG_PART_NAMES.has(partName)).toBe(true);
      }
    }
  });

  it('buildAmgBodyForOutfit excludes face slots so Head/Eyebrows are preserved on equip', () => {
    for (const outfitId of SAMPLE_OUTFIT_IDS) {
      const body = buildAmgBodyForOutfit(outfitId);
      expect((body as Record<string, string>).Head).toBeUndefined();
      expect((body as Record<string, string>).EyebrowLeft).toBeUndefined();
      expect((body as Record<string, string>).EyebrowRight).toBeUndefined();
      // Body slots are still there
      expect((body as Record<string, string>).Torso).toBeDefined();
    }
  });
});
