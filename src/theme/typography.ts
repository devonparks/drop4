// Drop4 Typography — Variable fonts: Fredoka (headings), Outfit (body)
// Use fontFamily + fontWeight since we're using variable .ttf files

// Font family constants — use with fontWeight for different weights
export const fonts = {
  heading: 'Fredoka',
  body: 'Outfit',
};

// Weight shortcuts for readability
export const weight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
  black: '900' as const,
};

// (textStyles record removed 2026-05-04 — pre-built styles ladder
// hadn't picked up callers across the codebase, every screen rolls
// inline TextStyle blocks against fonts + weight directly. ~115
// lines of dead exports cleaned up.)
