// Visual theme data for each board skin — controls the game board appearance

export interface BoardThemeVisuals {
  frameGradient: [string, string, string];
  frameBorder: string;
  holeColor: string;
  holeBorder: string;
  baseGradient: [string, string, string];
}

export const BOARD_THEME_VISUALS: Record<string, BoardThemeVisuals> = {
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
};
