// Drop4 Typography — Variable fonts: Fredoka (headings), Outfit (body)
// Use fontFamily + fontWeight since we're using variable .ttf files

import { TextStyle } from 'react-native';

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

// Pre-built text styles — clear hierarchy from displayXL → micro
export const textStyles: Record<string, TextStyle> = {
  // Display: hero + screen titles
  displayXL: {
    fontFamily: fonts.heading,
    fontWeight: weight.black,
    fontSize: 48,
    lineHeight: 52,
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  displayLG: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 32,
    lineHeight: 38,
    color: '#ffffff',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  displayMD: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 24,
    lineHeight: 30,
    color: '#ffffff',
  },

  // Title: card headers, big stats
  titleLG: {
    fontFamily: fonts.body,
    fontWeight: weight.extrabold,
    fontSize: 18,
    lineHeight: 22,
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  titleMD: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 15,
    lineHeight: 20,
    color: '#ffffff',
  },

  // Body: paragraphs, descriptions
  body: {
    fontFamily: fonts.body,
    fontWeight: weight.regular,
    fontSize: 14,
    lineHeight: 20,
    color: '#a8b2d4',
  },
  bodyStrong: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 14,
    lineHeight: 20,
    color: '#ffffff',
  },

  // Caption: meta info, timestamps
  caption: {
    fontFamily: fonts.body,
    fontWeight: weight.medium,
    fontSize: 12,
    lineHeight: 16,
    color: '#a8b2d4',
  },

  // Micro: badges, hud labels
  micro: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 10,
    lineHeight: 14,
    color: '#6b7595',
  },

  // Section label: ALL CAPS letterspaced (e.g. "DAILY GOALS", "OVERVIEW")
  sectionLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 11,
    lineHeight: 14,
    color: '#a8b2d4',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },

  // Specialized
  stat: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 28,
    lineHeight: 34,
    color: '#ffffff',
  },
  currency: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 16,
    lineHeight: 20,
    color: '#ffffff',
  },
  badge: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 11,
    lineHeight: 14,
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  // Legacy aliases — keep working for existing callsites
  logo: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 48,
    lineHeight: 56,
    color: '#ffffff',
  },
  screenTitle: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 32,
    lineHeight: 38,
    color: '#ffffff',
    textAlign: 'center',
  },
  sectionTitle: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 24,
    lineHeight: 30,
    color: '#ffffff',
  },
  buttonLarge: {
    fontFamily: fonts.body,
    fontWeight: weight.extrabold,
    fontSize: 22,
    lineHeight: 28,
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  buttonSub: {
    fontFamily: fonts.body,
    fontWeight: weight.medium,
    fontSize: 13,
    lineHeight: 16,
    color: 'rgba(255,255,255,0.8)',
  },
  label: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 11,
    lineHeight: 14,
    color: '#a8b2d4',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  hud: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 14,
    lineHeight: 18,
    color: '#ffffff',
  },
};
