import { CHARACTER_LOOKS } from '@amg/character-creator/packs';
import { AMG_PART_NAMES } from '../amgPartNamesIndex';

// ═══════════════════════════════════════════════════════════════════════
// Looks gallery smoke tests — every preset Look has to be applyable
// without producing missing-part 404s. These tests catch:
//   1. Part names that reference packs/variants not shipped on R2
//   2. Blendshape values out of [-1, 1] / [0, 1] range
//   3. Empty / malformed entries
// ═══════════════════════════════════════════════════════════════════════

describe('CHARACTER_LOOKS', () => {
  it('has at least 6 looks for a reasonable starting gallery', () => {
    expect(CHARACTER_LOOKS.length).toBeGreaterThanOrEqual(6);
  });

  it('every look has unique id and label', () => {
    const ids = new Set(CHARACTER_LOOKS.map((l) => l.id));
    const labels = new Set(CHARACTER_LOOKS.map((l) => l.label));
    expect(ids.size).toBe(CHARACTER_LOOKS.length);
    expect(labels.size).toBe(CHARACTER_LOOKS.length);
  });

  it('every look has a Torso, Hips, and Leg pair (renderable body)', () => {
    for (const look of CHARACTER_LOOKS) {
      expect(look.parts.Torso).toBeDefined();
      expect(look.parts.Hips).toBeDefined();
      expect(look.parts.LegLeft).toBeDefined();
      expect(look.parts.LegRight).toBeDefined();
    }
  });

  it('every part name in every look exists in the live AMG manifest', () => {
    const missing: string[] = [];
    for (const look of CHARACTER_LOOKS) {
      for (const [slot, name] of Object.entries(look.parts)) {
        if (!AMG_PART_NAMES.has(name as string)) {
          missing.push(`Look "${look.id}" references unknown part: ${slot}=${name}`);
        }
      }
    }
    expect(missing).toEqual([]);
  });

  it('blendshape values are in valid ranges', () => {
    for (const look of CHARACTER_LOOKS) {
      const { feminine, weight, muscle } = look.blendshapes;
      expect(feminine).toBeGreaterThanOrEqual(0);
      expect(feminine).toBeLessThanOrEqual(1);
      expect(weight).toBeGreaterThanOrEqual(-1);
      expect(weight).toBeLessThanOrEqual(1);
      expect(muscle).toBeGreaterThanOrEqual(0);
      expect(muscle).toBeLessThanOrEqual(1);
    }
  });

  it('every look defines core color properties (Skin / Hair / Eye)', () => {
    for (const look of CHARACTER_LOOKS) {
      expect(look.colors['Skin 01']).toBeDefined();
      expect(look.colors['Hair 01']).toBeDefined();
      expect(look.colors['Eye 01']).toBeDefined();
      // Hex sanity (3-or-6-digit, leading #)
      expect(look.colors['Skin 01']).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it('emoji + accent are non-empty for visual rendering', () => {
    for (const look of CHARACTER_LOOKS) {
      expect(look.emoji.length).toBeGreaterThan(0);
      expect(look.accentHex).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });
});
