/**
 * Feature flags for Drop4 release scoping.
 *
 * v1.0 ships single-player + cosmetics + career.
 * Multiplayer / wagers / tournaments / season pass / friends move to v1.1+.
 *
 * Flagged features remain in the codebase. They render as disabled menu items
 * with a "Coming Soon" badge so the surface area is documented for players.
 */
export const FEATURES = {
  // ── Online & Social (v1.1) ───────────────────────────────────
  onlineMultiplayer: false,   // Quick Match, Ranked
  rankedMode: false,          // ELO ladder, season resets
  goldCourt: false,           // Wager courts (depends on online)
  partyLobby: false,          // Room codes, friend invites
  spectator: false,           // Live match watching
  friends: false,             // Friend system

  // ── Tournaments (v1.1) ───────────────────────────────────────
  tournaments: false,         // 4/8/16 player local brackets

  // ── Monetization extras (v1.2) ───────────────────────────────
  seasonPass: false,          // Battle pass tracks
  lootBoxes: true,            // Keep — simple, self-contained, fun

  // ── Power-user features (v1.1) ───────────────────────────────
  customGame: false,          // Private match settings
  boardEditor: false,         // Puzzle board creator
  replayViewer: false,        // Saved replays

  // ── 3D Characters (in progress) ──────────────────────────────
  character3D: true,          // react-three-fiber 3D character system

  // ── Always on (core game) ────────────────────────────────────
  career: true,
  localPlay: true,
  shop: true,
  cosmetics: true,
  challenges: true,
  achievements: true,
  dailyReward: true,
  dailySpin: true,
  leaderboards: false,        // Needs real online data
} as const;

export type FeatureKey = keyof typeof FEATURES;

export function isFeatureEnabled(key: FeatureKey): boolean {
  return FEATURES[key];
}
