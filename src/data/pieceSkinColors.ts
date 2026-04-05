// Piece skin visual data — controls piece colors in-game when equipped

export interface PieceSkinVisuals {
  p1: { main: string; dark: string; light: string; glow: string };
  p2: { main: string; dark: string; light: string; glow: string };
}

export const PIECE_SKIN_VISUALS: Record<string, PieceSkinVisuals> = {
  // ─── OG Collection ──────────────────────────────────────────────────────
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

  // ─── Season 0 / New Skins ──────────────────────────────────────────────

  mint_coral: {
    p1: { main: '#3eb489', dark: '#2a8a66', light: '#60d4a8', glow: 'rgba(62,180,137,0.6)' },
    p2: { main: '#ff7f7f', dark: '#cc5a5a', light: '#ffa8a8', glow: 'rgba(255,127,127,0.6)' },
  },

  monochrome: {
    p1: { main: '#e0e0e0', dark: '#b0b0b0', light: '#ffffff', glow: 'rgba(224,224,224,0.5)' },
    p2: { main: '#2a2a2a', dark: '#141414', light: '#4a4a4a', glow: 'rgba(42,42,42,0.5)' },
  },

  sapphire_ruby: {
    p1: { main: '#1a53ff', dark: '#0a3acc', light: '#4a7aff', glow: 'rgba(26,83,255,0.6)' },
    p2: { main: '#dc143c', dark: '#a8102e', light: '#ff3860', glow: 'rgba(220,20,60,0.6)' },
  },

  electric: {
    p1: { main: '#00c8ff', dark: '#009acc', light: '#40daff', glow: 'rgba(0,200,255,0.7)' },
    p2: { main: '#ffe600', dark: '#ccb800', light: '#ffee40', glow: 'rgba(255,230,0,0.7)' },
  },

  toxic: {
    p1: { main: '#39ff14', dark: '#28cc0e', light: '#66ff44', glow: 'rgba(57,255,20,0.7)' },
    p2: { main: '#9b30ff', dark: '#7a20cc', light: '#b860ff', glow: 'rgba(155,48,255,0.7)' },
  },

  galaxy_pieces: {
    p1: { main: '#4b0082', dark: '#300058', light: '#6a20a8', glow: 'rgba(75,0,130,0.7)' },
    p2: { main: '#ff69b4', dark: '#cc5490', light: '#ff90cc', glow: 'rgba(255,105,180,0.7)' },
  },

  gold_diamond: {
    p1: { main: '#ffd700', dark: '#ccac00', light: '#ffe540', glow: 'rgba(255,215,0,0.7)' },
    p2: { main: '#b9f2ff', dark: '#8ad8ee', light: '#d8f8ff', glow: 'rgba(185,242,255,0.7)' },
  },

  obsidian: {
    p1: { main: '#1a1a2e', dark: '#0c0c18', light: '#2e2e4a', glow: 'rgba(60,60,100,0.8)' },
    p2: { main: '#3a3a5e', dark: '#2a2a44', light: '#5a5a80', glow: 'rgba(90,90,130,0.8)' },
  },

  damascus: {
    p1: { main: '#708090', dark: '#4a5a68', light: '#90a0b0', glow: 'rgba(112,128,144,0.7)' },
    p2: { main: '#c0c0c0', dark: '#909090', light: '#e0e0e0', glow: 'rgba(192,192,192,0.7)' },
  },
};
