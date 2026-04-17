/**
 * Feature flags for Drop4 release scoping.
 *
 * v1.0 ships single-player + cosmetics + career + retention hooks.
 * Multiplayer / wagers / friends / tournaments were REMOVED (not flagged
 * off, actually deleted — see commit 00d9891) so they'll return via new
 * implementation in v1.5, not as flag flips.
 *
 * Only flags that are actually checked in code live here.
 * Always-on features (career, shop, challenges, etc.) don't need flags.
 */
export const FEATURES = {
  // ── Power-user features (v1.1) ───────────────────────────────
  customGame: false,          // Private match settings

  // ── v1.5+ (requires new implementation, not just flag flip) ──
  rankedMode: false,
} as const;
