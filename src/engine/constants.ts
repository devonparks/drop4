// Board dimensions
export const BOARD_ROWS = 6;
export const BOARD_COLS = 7;
export const CONNECT_COUNT = 4;

// Coin rewards per difficulty
export const COIN_REWARDS = {
  easy: 25,
  medium: 50,
  hard: 100,
};

// AI thinking delay (ms) — makes it feel human
export const AI_THINK_DELAY = {
  easy: 600,
  medium: 800,
  hard: 1200,
};

// Spring animation configs for Candy Crush smoothness
export const SPRING = {
  // Piece drop: fast fall with small bounce
  pieceDrop: { damping: 12, stiffness: 200, mass: 0.8 },
  // Button press: snappy scale
  buttonPress: { damping: 15, stiffness: 300 },
  // Win celebration: playful bouncy
  celebration: { damping: 4, stiffness: 80 },
  // Screen transitions: smooth slide
  transition: { damping: 20, stiffness: 150 },
  // Subtle pulse / breathing
  pulse: { damping: 10, stiffness: 100 },
};
