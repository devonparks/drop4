// Drop4 Color System — matches concept art blue gradient + vibrant accents

export const colors = {
  // Background gradient (deep navy to vibrant blue)
  bgDark: '#0a0e27',
  bgMid: '#111b47',
  bgLight: '#1a2766',
  bgGradient: ['#0a0e27', '#111b47', '#1a2766'] as const,

  // Surface colors (cards, panels)
  surface: '#1c2456',
  surfaceLight: '#243070',
  surfaceBorder: '#2d3a80',

  // Board
  boardBlue: '#1a3a8a',
  boardDark: '#0d1f5c',
  boardFrame: '#2548a8',
  boardHole: '#0a1440',

  // Pieces
  pieceRed: '#e63946',
  pieceRedDark: '#b82d38',
  pieceRedGlow: '#ff4d5a',
  pieceYellow: '#f4a623',
  pieceYellowDark: '#c4841a',
  pieceYellowGlow: '#ffc247',

  // Accent colors (buttons from concept art)
  orange: '#ff8c00',
  orangeLight: '#ffa033',
  orangeDark: '#cc7000',
  green: '#27ae3d',
  greenLight: '#34c94d',
  greenDark: '#1e8a30',
  purple: '#9b59b6',
  purpleLight: '#b06cc7',
  purpleDark: '#7d4192',
  teal: '#1abc9c',
  tealLight: '#2dd4ad',
  tealDark: '#15967d',
  red: '#e74c3c',
  redLight: '#f06050',
  redDark: '#c0392b',
  gold: '#f1c40f',
  goldLight: '#f4d03f',
  goldDark: '#d4ac0d',

  // Navy button (custom game)
  navy: '#1a2744',
  navyLight: '#243560',
  navyDark: '#0f1a30',

  // Text — brighter secondary/muted for better legibility on dark navy
  textPrimary: '#ffffff',
  textSecondary: '#a8b2d4',
  textMuted: '#6b7595',

  // Coins / currency
  coinGold: '#ffd700',
  gemGreen: '#2ecc71',

  // UI states
  success: '#2ecc71',
  error: '#e74c3c',
  warning: '#f39c12',

  // Shadows and overlays
  shadow: 'rgba(0, 0, 0, 0.4)',
  overlay: 'rgba(0, 0, 0, 0.6)',
  glow: 'rgba(255, 140, 0, 0.3)',
};
