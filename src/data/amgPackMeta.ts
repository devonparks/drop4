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

// Verified against content/sidekick/manifest.json — every pack prefix
// shipped on the live R2 manifest gets a humanized entry. Without these
// the shop's pack header falls through to `pack.replace(/_/g, ' ')` and
// the player sees raw Synty names like "ELVN WARR" — Devon's audit
// flagged that as confusing, so this catches all 17 known packs.
const AMG_PACK_META: Record<string, AmgPackMeta> = {
  // ── Species base packs (always owned) ──
  HUMN_BASE: { emoji: '🧑', displayName: 'Human Base',   description: 'Essential human heads, hair, and anatomy.' },
  ELVN_BASE: { emoji: '🧝', displayName: 'Elf Base',     description: 'Essential elven heads and features.' },
  GOBL_BASE: { emoji: '👺', displayName: 'Goblin Base',  description: 'Essential goblin heads and features.' },
  SKTN_BASE: { emoji: '💀', displayName: 'Skeleton Base', description: 'Essential skeleton heads and bones.' },
  ZOMB_BASE: { emoji: '🧟', displayName: 'Zombie Base',  description: 'Essential zombie heads and features.' },

  // ── Modern (civilian + tactical) ──
  MDRN_CIVL: { emoji: '👖', displayName: 'Modern Civilians', description: 'Everyday jeans, tees, and hoodies.' },
  MDRN_POLC: { emoji: '👮', displayName: 'Modern Police',    description: 'Tactical uniforms and badge gear.' },

  // ── Sci-fi ──
  SCFI_CIVL: { emoji: '🚀', displayName: 'Sci-Fi Civilians', description: 'Clean future-casual fits with tech panels.' },
  SCFI_SOLD: { emoji: '🤖', displayName: 'Sci-Fi Soldiers',  description: 'Hard-armor exo-suits for far-future ops.' },

  // ── Fantasy ──
  FANT_KNGT: { emoji: '⚔️', displayName: 'Fantasy Knights',  description: 'Plate armor and royal-guard fits.' },
  FANT_VILL: { emoji: '🏘️', displayName: 'Fantasy Villagers', description: 'Townsfolk tunics and peasant garb.' },
  FANT_SKTN: { emoji: '☠️', displayName: 'Fantasy Skeletons', description: 'Bone-warrior armor for the undead.' },

  // ── Cultural / themed warriors ──
  SAMR_WARR: { emoji: '🗾', displayName: 'Samurai Warriors',  description: 'Feudal warlord-tier samurai armor.' },
  VIKG_WARR: { emoji: '🪓', displayName: 'Viking Warriors',   description: 'Northern raider furs and ironwork.' },
  ELVN_WARR: { emoji: '🏹', displayName: 'Elven Warriors',    description: 'Forest-bound elves built for ranged combat.' },
  GOBL_FIGT: { emoji: '🗡️', displayName: 'Goblin Fighters',   description: 'Goblin mob-boss fits with studded leather.' },

  // ── Apocalypse / horror ──
  APOC_OUTL: { emoji: '☢️', displayName: 'Apocalypse Outlaws', description: 'Wasteland raider fits for the end of the world.' },
  APOC_SURV: { emoji: '🥾', displayName: 'Apocalypse Survivors', description: 'Practical wasteland-survival fits.' },
  APOC_ZOMB: { emoji: '🧟', displayName: 'Apocalypse Zombies', description: 'Tattered remnants of the undead.' },
  HORR_VILN: { emoji: '🎭', displayName: 'Horror Villains',   description: 'Slasher and creature-feature looks.' },

  // ── Pirates ──
  PIRT_CAPT: { emoji: '🏴‍☠️', displayName: 'Pirate Captains', description: 'High-seas captains with brass and brocade.' },
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

