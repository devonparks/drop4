// ═══════════════════════════════════════════════════════════════════════
// amgPackMeta.ts — display metadata for Sidekick pack prefixes
//
// Every Sidekick part belongs to a 9-char pack prefix (e.g. 'MDRN_CIVL',
// 'SAMR_WARR'). The shop + collection + creator all need the same
// "what is this pack called and what icon represents it" lookup.
// Centralize here so every call site renders identically.
//
// Fallback: packs not listed fall back to a generic 👕 icon + the raw
// prefix as display name. Add entries as Devon expands the content
// library beyond what's currently on R2.
// ═══════════════════════════════════════════════════════════════════════

interface AmgPackMeta {
  /** Single emoji for shop section headers and card corners. */
  emoji: string;
  /** Player-facing pack name. No "Pack" suffix — the UI adds it. */
  displayName: string;
  /** Short blurb for section headers / pack detail screens. */
  description: string;
}

const AMG_PACK_META: Record<string, AmgPackMeta> = {
  // Starter — always owned
  HUMN_BASE: { emoji: '🧑', displayName: 'Human Base', description: 'Essential human heads, hair, and anatomy.' },
  GOBL_BASE: { emoji: '👺', displayName: 'Goblin Base', description: 'Essential goblin heads and features.' },
  ELVS_BASE: { emoji: '🧝', displayName: 'Elf Base', description: 'Essential elven heads and features.' },
  SKEL_BASE: { emoji: '💀', displayName: 'Skeleton Base', description: 'Essential skeleton heads and bones.' },
  ZOMB_BASE: { emoji: '🧟', displayName: 'Zombie Base', description: 'Essential zombie heads and features.' },

  // Common — modern civilian fits
  MDRN_CIVL: { emoji: '👖', displayName: 'Modern Civilians', description: 'Everyday jeans, tees, and hoodies for a grounded look.' },
  MDRN_CASH: { emoji: '🧥', displayName: 'Modern Casuals', description: 'Relaxed modern streetwear for days off.' },

  // Uncommon — themed modern fits
  MDRN_POLC: { emoji: '👮', displayName: 'Modern Police', description: 'Tactical uniforms and badge-carrying gear.' },
  SCFI_CIVL: { emoji: '👨‍🚀', displayName: 'Sci-Fi Civilians', description: 'Clean future-casual fits with subtle tech panels.' },

  // Rare — combat-ready sets
  MDRN_FIGT: { emoji: '🥊', displayName: 'Modern Fighters', description: 'Street-brawl-ready tracksuits and fight gear.' },
  GOBL_FIGT: { emoji: '🗡️', displayName: 'Goblin Fighters', description: 'Goblin mob-boss fits with studded leather.' },
  ELVS_WARR: { emoji: '🏹', displayName: 'Elven Warriors', description: 'Forest-bound elves built for long-range combat.' },

  // Epic — top-tier themed sets
  SAMR_WARR: { emoji: '🗾', displayName: 'Samurai Warriors', description: 'Feudal warlord-tier samurai armor.' },
  APOC_OUTL: { emoji: '☢️', displayName: 'Apocalypse Outlaws', description: 'Wasteland raider fits for the end of the world.' },
};

/** Display metadata for a pack prefix. Returns a generic fallback for
 *  unknown packs so the shop never has blank section headers. */
export function packMeta(pack: string): AmgPackMeta {
  const hit = AMG_PACK_META[pack];
  if (hit) return hit;
  return {
    emoji: '👕',
    displayName: pack.replace(/_/g, ' '),
    description: 'Sidekick pack',
  };
}

/** Stable ordering for shop section headers: starters first, then rising
 *  rarity tiers, then anything else alphabetically. Callers can pass
 *  their live list of packs and get an ordered copy. */
export function sortPacksForShop(packs: string[]): string[] {
  const TIER: Record<string, number> = {
    HUMN_BASE: 0, GOBL_BASE: 0, ELVS_BASE: 0, SKEL_BASE: 0, ZOMB_BASE: 0,
    MDRN_CIVL: 1, MDRN_CASH: 1,
    MDRN_POLC: 2, SCFI_CIVL: 2,
    MDRN_FIGT: 3, GOBL_FIGT: 3, ELVS_WARR: 3,
    SAMR_WARR: 4, APOC_OUTL: 4,
  };
  const unique = Array.from(new Set(packs));
  return unique.sort((a, b) => {
    const ta = TIER[a] ?? 5;
    const tb = TIER[b] ?? 5;
    if (ta !== tb) return ta - tb;
    return a.localeCompare(b);
  });
}
