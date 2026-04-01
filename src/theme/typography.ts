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

// Pre-built text styles
export const textStyles: Record<string, TextStyle> = {
  logo: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 52,
    lineHeight: 60,
    color: '#ffffff',
  },
  screenTitle: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 36,
    lineHeight: 42,
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
  body: {
    fontFamily: fonts.body,
    fontWeight: weight.regular,
    fontSize: 15,
    lineHeight: 22,
    color: '#8892b0',
  },
  label: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 12,
    lineHeight: 16,
    color: '#8892b0',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
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
  hud: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 14,
    lineHeight: 18,
    color: '#ffffff',
  },
  badge: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 11,
    lineHeight: 14,
    color: '#ffffff',
  },
};
