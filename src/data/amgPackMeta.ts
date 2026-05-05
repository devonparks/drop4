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
  /** Compact display name for tight card chrome (catalog grid cards
   *  truncate at ~14 chars on a 96-px card). Falls back to displayName
   *  when omitted. Per Customize audit 2026-05-05 (UX-4) — full names
   *  like "Apocalypse Outlaws" hard-truncated to "Apocalypse Outla..."
   *  on every card. */
  shortName?: string;
  /** Short blurb for section headers / pack detail screens. */
  description: string;
}

// Verified against content/sidekick/manifest.json — every pack prefix
// shipped on the live R2 manifest gets a humanized entry. Without these
// the shop's pack header falls through to `pack.replace(/_/g, ' ')` and
// the player sees raw Synty names like "ELVN WARR" — Devon's audit
// flagged that as confusing, so this catches all 17 known packs.
const AMG_PACK_META: Record<string, AmgPackMeta> = {
  // ── Species base packs (always owned) ──
  HUMN_BASE: { emoji: '🧑', displayName: 'Human Base',   shortName: 'Human',   description: 'Essential human heads, hair, and anatomy.' },
  ELVN_BASE: { emoji: '🧝', displayName: 'Elf Base',     shortName: 'Elf',     description: 'Essential elven heads and features.' },
  GOBL_BASE: { emoji: '👺', displayName: 'Goblin Base',  shortName: 'Goblin',  description: 'Essential goblin heads and features.' },
  SKTN_BASE: { emoji: '💀', displayName: 'Skeleton Base', shortName: 'Skeleton', description: 'Essential skeleton heads and bones.' },
  ZOMB_BASE: { emoji: '🧟', displayName: 'Zombie Base',  shortName: 'Zombie',  description: 'Essential zombie heads and features.' },

  // ── Modern (civilian + tactical) ──
  MDRN_CIVL: { emoji: '👖', displayName: 'Modern Civilians', shortName: 'Civilians', description: 'Everyday jeans, tees, and hoodies.' },
  MDRN_POLC: { emoji: '👮', displayName: 'Modern Police',    shortName: 'Police',    description: 'Tactical uniforms and badge gear.' },

  // ── Sci-fi ──
  SCFI_CIVL: { emoji: '🚀', displayName: 'Sci-Fi Civilians', shortName: 'Sci-Fi Civ', description: 'Clean future-casual fits with tech panels.' },
  SCFI_SOLD: { emoji: '🤖', displayName: 'Sci-Fi Soldiers',  shortName: 'Sci-Fi Sold', description: 'Hard-armor exo-suits for far-future ops.' },

  // ── Fantasy ──
  FANT_KNGT: { emoji: '⚔️', displayName: 'Fantasy Knights',  shortName: 'Knights',    description: 'Plate armor and royal-guard fits.' },
  FANT_VILL: { emoji: '🏘️', displayName: 'Fantasy Villagers', shortName: 'Villagers',  description: 'Townsfolk tunics and peasant garb.' },
  FANT_SKTN: { emoji: '☠️', displayName: 'Fantasy Skeletons', shortName: 'Bonewalkers', description: 'Bone-warrior armor for the undead.' },

  // ── Cultural / themed warriors ──
  SAMR_WARR: { emoji: '🗾', displayName: 'Samurai Warriors',  shortName: 'Samurai',     description: 'Feudal warlord-tier samurai armor.' },
  VIKG_WARR: { emoji: '🪓', displayName: 'Viking Warriors',   shortName: 'Vikings',     description: 'Northern raider furs and ironwork.' },
  ELVN_WARR: { emoji: '🏹', displayName: 'Elven Warriors',    shortName: 'Elf Warriors', description: 'Forest-bound elves built for ranged combat.' },
  GOBL_FIGT: { emoji: '🗡️', displayName: 'Goblin Fighters',   shortName: 'Goblin Brigade', description: 'Goblin mob-boss fits with studded leather.' },

  // ── Apocalypse / horror ──
  APOC_OUTL: { emoji: '☢️', displayName: 'Apocalypse Outlaws',  shortName: 'Outlaws',    description: 'Wasteland raider fits for the end of the world.' },
  APOC_SURV: { emoji: '🥾', displayName: 'Apocalypse Survivors', shortName: 'Survivors',  description: 'Practical wasteland-survival fits.' },
  APOC_ZOMB: { emoji: '🧟', displayName: 'Apocalypse Zombies',  shortName: 'Apoc Zombies', description: 'Tattered remnants of the undead.' },
  HORR_VILN: { emoji: '🎭', displayName: 'Horror Villains',     shortName: 'Slashers',   description: 'Slasher and creature-feature looks.' },

  // ── Pirates ──
  PIRT_CAPT: { emoji: '🏴‍☠️', displayName: 'Pirate Captains', shortName: 'Pirates', description: 'High-seas captains with brass and brocade.' },
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

/** Translator from outfit-registry pack slugs ('elven_warriors') to the
 *  Sidekick content prefix ('ELVN_WARR'). Used by every screen that
 *  resolves a Drop4 outfit pack to its painted icon — getPackIcon()
 *  reads the Sidekick prefix, not the slug. Centralized here so the
 *  Customize tab + Shop tab + any future surface render identically. */
export const OUTFIT_PACK_TO_SIDEKICK: Record<string, string> = {
  modern_civilians:    'MDRN_CIVL',
  modern_police:       'MDRN_POLC',
  apocalypse_outlaws:  'APOC_OUTL',
  apocalypse_survivor: 'APOC_SURV',
  apocalypse_zombies:  'APOC_ZOMB',
  fantasy_villagers:   'FANT_VILL',
  fantasy_knights:     'FANT_KNGT',
  fantasy_skeletons:   'FANT_SKTN',
  elven_warriors:      'ELVN_WARR',
  goblin_fighters:     'GOBL_FIGT',
  pirate_captains:     'PIRT_CAPT',
  samurai_warriors:    'SAMR_WARR',
  viking_warriors:     'VIKG_WARR',
  sci_fi_civilians:    'SCFI_CIVL',
  sci_fi_soldiers:     'SCFI_SOLD',
};

// ── Slot-code → emoji mapping ────────────────────────────────────────
//
// The Sidekick part-code is the 2-digit + 3-5-letter segment in every
// part name (e.g. 'SK_MDRN_CIVL_01_10TORS_HU01' → '10TORS'). Mapping
// these to slot-specific emoji lets the shop card show at-a-glance
// what body region the part is for (👕 torso, 👖 legs, 🧢 head, etc.)
// instead of the same pack emoji on every variant. Playtest caught
// that 6 Modern Police cards in a row all showed 👮👮👮 and were
// indistinguishable without 3D thumbnails — slot emoji fixes that.

const SLOT_EMOJI: Record<string, string> = {
  // Head + face
  '01HEAD': '😊',
  '02HAIR': '✂️',
  '03EBRL': '➰',  // eyebrow left (correct code per manifest)
  '04EBRR': '➰',  // eyebrow right
  '05EYEL': '👁️',
  '06EYER': '👁️',
  '07EARL': '👂',
  '08EARR': '👂',
  '09FCHR': '🧔‍♂️',
  '35NOSE': '👃',
  '36TETH': '🦷',
  '37TONG': '👅',
  // Upper body
  '10TORS': '👕',
  '11AUPL': '💪',
  '12AUPR': '💪',
  '13ALWL': '🫲',
  '14ALWR': '🫱',
  '15HNDL': '🧤',
  '16HNDR': '🧤',
  // Lower body
  '17HIPS': '👖',
  '18LEGL': '🦵',
  '19LEGR': '🦵',
  '20FOTL': '👟',
  '21FOTR': '👟',
  // Wrap (full-body one-piece)
  '38WRAP': '🥋',
  // Attachments — head/face/back visible accessories
  '22AHED': '🧢',  // AttachmentHead (hat)
  '23AFAC': '🕶️', // AttachmentFace (glasses / masks)
  '24ABAC': '🎒',  // AttachmentBack (backpack)
  // Attachment hips + shoulders + elbows + knees (armor / holsters)
  '25AHPF': '🗡️', // hips front
  '26AHPB': '🗡️', // hips back
  '27AHPL': '🗡️', // hips left
  '28AHPR': '🗡️', // hips right
  '29ASHL': '🛡️', // shoulder left
  '30ASHR': '🛡️', // shoulder right
  '31AEBL': '🛡️', // elbow left
  '32AEBR': '🛡️', // elbow right
  '33AKNL': '🦿',  // knee left (mechanical leg emoji = knee pad)
  '34AKNR': '🦿',  // knee right
};

/** Emoji for a Sidekick part based on its slot code. Extract the slot
 *  code from the part name first (regex match for _XXYYYY_ segment),
 *  then look up the slot emoji. Falls back to the pack emoji via
 *  packMeta if we can't derive a slot. */
export function slotEmoji(partName: string, packEmoji: string): string {
  const m = partName.match(/_\d{2}[A-Z]{3,4}(?=_|$)/);
  if (!m) return packEmoji;
  const code = m[0].slice(1); // drop leading underscore
  return SLOT_EMOJI[code] || packEmoji;
}

