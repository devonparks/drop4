// Visual theme data for each board skin — controls the game board appearance

export interface BoardThemeVisuals {
  frameGradient: [string, string, string];
  frameBorder: string;
  holeColor: string;
  holeBorder: string;
  baseGradient: [string, string, string];
}

export const BOARD_THEME_VISUALS: Record<string, BoardThemeVisuals> = {
  // ─── OG Collection ──────────────────────────────────────────────────────
  default: {
    frameGradient: ['#2a5bce', '#1a3a8a', '#0d2060'],
    frameBorder: '#3668d4',
    holeColor: '#091440',
    holeBorder: '#071030',
    baseGradient: ['#1a3a8a', '#0d2060', '#091540'],
  },
  wood: {
    frameGradient: ['#a0724a', '#8B5E3C', '#6b4226'],
    frameBorder: '#b8845a',
    holeColor: '#3a2010',
    holeBorder: '#2a1508',
    baseGradient: ['#8B5E3C', '#6b4226', '#4a2d18'],
  },
  neon: {
    frameGradient: ['#0a3a0a', '#082808', '#041404'],
    frameBorder: '#00ff88',
    holeColor: '#020a02',
    holeBorder: '#00ff4433',
    baseGradient: ['#082808', '#041404', '#020a02'],
  },
  galaxy: {
    frameGradient: ['#3a1a6b', '#2a0e50', '#1a0630'],
    frameBorder: '#6b3ab8',
    holeColor: '#0a0318',
    holeBorder: '#150828',
    baseGradient: ['#2a0e50', '#1a0630', '#0a0318'],
  },
  gold: {
    frameGradient: ['#c8a030', '#a08020', '#786010'],
    frameBorder: '#e8c848',
    holeColor: '#1a1508',
    holeBorder: '#2d250e',
    baseGradient: ['#a08020', '#786010', '#584808'],
  },
  ice: {
    frameGradient: ['#4a8ab8', '#2a6a98', '#1a4a78'],
    frameBorder: '#6aacda',
    holeColor: '#081828',
    holeBorder: '#0c2238',
    baseGradient: ['#2a6a98', '#1a4a78', '#0a3058'],
  },
  lava: {
    frameGradient: ['#8a2a1a', '#6a1a0a', '#4a0a00'],
    frameBorder: '#c84020',
    holeColor: '#1a0500',
    holeBorder: '#300a00',
    baseGradient: ['#6a1a0a', '#4a0a00', '#2a0500'],
  },
  darkmatter: {
    frameGradient: ['#1a1028', '#100818', '#080410'],
    frameBorder: '#e94560',
    holeColor: '#030208',
    holeBorder: '#e9456033',
    baseGradient: ['#100818', '#080410', '#030208'],
  },

  // ─── Season 0 / New Themes ──────────────────────────────────────────────

  midnight: {
    frameGradient: ['#1a1a2e', '#0e0e1a', '#060610'],
    frameBorder: '#8892b0',
    holeColor: '#030308',
    holeBorder: '#8892b022',
    baseGradient: ['#0e0e1a', '#060610', '#020206'],
  },

  candy: {
    frameGradient: ['#e88aaf', '#d15a8a', '#a83a6a'],
    frameBorder: '#ffb6d5',
    holeColor: '#3d0a20',
    holeBorder: '#5a1530',
    baseGradient: ['#d15a8a', '#a83a6a', '#801a4a'],
  },

  matrix: {
    frameGradient: ['#0a2a0a', '#061a06', '#020e02'],
    frameBorder: '#00ff41',
    holeColor: '#010800',
    holeBorder: '#00ff4122',
    baseGradient: ['#061a06', '#020e02', '#010800'],
  },

  sunset: {
    frameGradient: ['#e86830', '#c84820', '#8a2a10'],
    frameBorder: '#ff9060',
    holeColor: '#1a0800',
    holeBorder: '#301208',
    baseGradient: ['#c84820', '#8a2a10', '#5a1a08'],
  },

  crystal: {
    frameGradient: ['#6ac8e8', '#3a98c8', '#1a6898'],
    frameBorder: '#a0e8ff',
    holeColor: '#081a28',
    holeBorder: '#a0e8ff22',
    baseGradient: ['#3a98c8', '#1a6898', '#0a4868'],
  },

  void: {
    frameGradient: ['#2a0848', '#180430', '#0a0018'],
    frameBorder: '#8a40c8',
    holeColor: '#02000a',
    holeBorder: '#8a40c833',
    baseGradient: ['#180430', '#0a0018', '#02000a'],
  },

  rainbow: {
    frameGradient: ['#6a2a8a', '#2a4a8a', '#2a6a4a'],
    frameBorder: '#c840e8',
    holeColor: '#0a0810',
    holeBorder: '#c840e833',
    baseGradient: ['#2a4a8a', '#2a6a4a', '#6a6a2a'],
  },
};
