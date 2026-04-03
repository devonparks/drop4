// Piece skin visual data — controls piece colors in-game when equipped

export interface PieceSkinVisuals {
  p1: { main: string; dark: string; light: string; glow: string };
  p2: { main: string; dark: string; light: string; glow: string };
}

export const PIECE_SKIN_VISUALS: Record<string, PieceSkinVisuals> = {
  classic: {
    p1: { main: '#e63946', dark: '#b82d38', light: '#ff6b7a', glow: 'rgba(230,57,70,0.6)' },
    p2: { main: '#f4a623', dark: '#c4841a', light: '#ffc247', glow: 'rgba(244,166,35,0.6)' },
  },
  chrome: {
    p1: { main: '#c0c0c0', dark: '#888888', light: '#e8e8e8', glow: 'rgba(192,192,192,0.5)' },
    p2: { main: '#606060', dark: '#404040', light: '#909090', glow: 'rgba(96,96,96,0.5)' },
  },
  fire_ice: {
    p1: { main: '#ff4500', dark: '#cc3700', light: '#ff7040', glow: 'rgba(255,69,0,0.6)' },
    p2: { main: '#00bfff', dark: '#0090cc', light: '#40d4ff', glow: 'rgba(0,191,255,0.6)' },
  },
  neon: {
    p1: { main: '#ff00ff', dark: '#cc00cc', light: '#ff66ff', glow: 'rgba(255,0,255,0.7)' },
    p2: { main: '#00ff88', dark: '#00cc6a', light: '#40ffaa', glow: 'rgba(0,255,136,0.7)' },
  },
  holo: {
    p1: { main: '#ff69b4', dark: '#cc5490', light: '#ff99cc', glow: 'rgba(255,105,180,0.6)' },
    p2: { main: '#7b68ee', dark: '#6050cc', light: '#9d90ff', glow: 'rgba(123,104,238,0.6)' },
  },
  darkmatter: {
    p1: { main: '#1a1a2e', dark: '#0a0a18', light: '#2a2a4e', glow: 'rgba(233,69,96,0.8)' },
    p2: { main: '#e94560', dark: '#c03050', light: '#ff6580', glow: 'rgba(233,69,96,0.8)' },
  },
};
