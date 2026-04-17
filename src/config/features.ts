/**
 * Feature flags for Drop4 release scoping.
 *
 * v1.0 ships single-player + cosmetics + career + retention hooks.
 * Multiplayer / wagers / friends / tournaments were REMOVED (not flagged
 * off, actually deleted — see commit 00d9891) so they'll return via new
 * implementation in v1.5, not as flag flips.
 */
export const FEATURES = {
  // ── Core game (always on) ────────────────────────────────────
  career: true,
  localPlay: true,
  shop: true,
  cosmetics: true,
  challenges: true,
  achievements: true,
  dailyReward: true,
  dailySpin: true,

  // ── 3D character system ──────────────────────────────────────
  character3D: true,

  // ── Retention hooks (v1.0) ───────────────────────────────────
  shopRotation: true,         // Daily featured 4-pack with countdown
  streakEscalation: true,     // 7-day cycle + 14/30/60/100-day milestones
  collectionMilestones: true, // Pack completion rewards
  pushNotifications: true,    // Local daily reminders

  // ── Monetization extras ──────────────────────────────────────
  lootBoxes: true,
  seasonPass: false,          // v1.1

  // ── Power-user features (v1.1) ───────────────────────────────
  customGame: false,          // Private match settings
  boardEditor: false,         // Puzzle board creator
  replayViewer: false,        // Saved replays

  // ── v1.5+ (requires new implementation, not just flag flip) ──
  rankedMode: false,
} as const;
