// Character Roster — the playable cast for Drop4 (and the wider AMG ecosystem).
//
// Drop4's customization model is "beat them, become them": every named NPC in
// career mode becomes a playable skin once defeated. There is also a default
// player character that everyone starts with.
//
// Each roster entry is one character. Universal emotes are available to every
// character; signature emotes are exclusive to one character (Mixamo imports).
//
// 3D models (GLB) are loaded via Character3D using the player's outfit
// customization from characterStore. The roster defines identity and
// personality; visual appearance is driven by the outfit/skin system.

import { ALL_CAREER_LEVELS } from './careerLevels';

export type RosterCharacterId = string;

export interface SignatureEmote {
  id: string;          // unique signature emote id (also the sprite sheet basename)
  name: string;        // display name shown in the emote wheel
  icon: string;        // emoji used until we have a proper icon asset
  source: 'mixamo' | 'sidekick' | 'custom';
}

export interface RosterCharacter {
  id: RosterCharacterId;
  name: string;
  title: string;                       // short flavor tag, e.g. "The Sprinter"
  personality: string;                 // one-line vibe note (drives style + signatures)
  /**
   * Career level whose completion unlocks this character. `null` for the
   * default starting character. The unlock fires from rosterStore listening to
   * careerStore.completeLevel — see rosterStore.ts.
   */
  unlockedAtCareerLevel: number | null;
  /** True for boss-tier characters (Chapter bosses + final boss). */
  isBoss: boolean;
  signatureEmotes: SignatureEmote[];
}

// ─── Default starter character ─────────────────────────────────────────────
// This is what every new player gets on day one. Uses the default 3D outfit
// (modern_civilians_01) via Character3D.
export const DEFAULT_CHARACTER_ID: RosterCharacterId = 'default_player';

// ─── Base/Starter characters — available from day one, never locked ───────
// These give new players immediate roster variety before they unlock anyone
// from career. 5 starters across 4 species so the Roster grid looks populated.
const STARTER_CHARACTERS: RosterCharacter[] = [
  {
    id: DEFAULT_CHARACTER_ID,
    name: 'Rookie',
    title: 'The Newcomer',
    personality: 'Day one. No rep, no record. Just a board and a dream.',
    unlockedAtCareerLevel: null,
    isBoss: false,
    signatureEmotes: [],
  },
  {
    id: 'bones',
    name: 'Bones',
    title: 'The OG',
    personality: 'Been playing since before you were alive. Literally.',
    unlockedAtCareerLevel: null,
    isBoss: false,
    signatureEmotes: [
      { id: 'bone_rattle', name: 'Bone Rattle', icon: '💀', source: 'mixamo' },
    ],
  },
  {
    id: 'pixel',
    name: 'Pixel',
    title: 'The Hacker',
    personality: 'Hacked the leaderboard once. Got caught. Now proves it legit.',
    unlockedAtCareerLevel: null,
    isBoss: false,
    signatureEmotes: [
      { id: 'glitch_dance', name: 'Glitch Dance', icon: '🤖', source: 'mixamo' },
    ],
  },
  {
    id: 'luna',
    name: 'Luna',
    title: 'The Seer',
    personality: 'Sees three moves ahead. Doesn\'t need to rush.',
    unlockedAtCareerLevel: null,
    isBoss: false,
    signatureEmotes: [
      { id: 'moonrise', name: 'Moonrise', icon: '🌙', source: 'mixamo' },
    ],
  },
  {
    id: 'tank',
    name: 'Tank',
    title: 'The Builder',
    personality: 'Plays like he builds — strong foundation, no shortcuts.',
    unlockedAtCareerLevel: null,
    isBoss: false,
    signatureEmotes: [
      { id: 'ground_pound', name: 'Ground Pound', icon: '💪', source: 'mixamo' },
    ],
  },
];

// ─── Helpers for generating roster ids deterministically ───────────────────
function toCharacterId(opponentName: string): RosterCharacterId {
  return opponentName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

// Lightweight personality / title overrides keyed by opponent name.
// Falls back to the career level's `opponentPersonality` if not specified.
const TITLE_OVERRIDES: Record<string, { title: string; signatures?: SignatureEmote[] }> = {
  // ─── Chapter 1 — Brooklyn "The Rec" ──────────────────────────────────
  'Rookie Ron':         { title: 'The First Foe', signatures: [{ id: 'nervous_shuffle', name: 'Nervous Shuffle', icon: '😬', source: 'mixamo' }] },
  'Beginner Ben':       { title: 'The Bookworm', signatures: [{ id: 'book_smart', name: 'Book Smart', icon: '🤓', source: 'mixamo' }] },
  'Casual Carl':        { title: 'Beach Bum', signatures: [{ id: 'beach_vibes', name: 'Beach Vibes', icon: '🤙', source: 'mixamo' }] },
  'Speedy Sam':         { title: 'The Sprinter', signatures: [
    { id: 'speed_dash', name: 'Speed Dash', icon: '💨', source: 'mixamo' },
    { id: 'victory_lap', name: 'Victory Lap', icon: '🏃', source: 'mixamo' },
  ]},
  'Tiny Tim':           { title: 'Small but Mighty', signatures: [{ id: 'tiny_dance', name: 'Tiny Dance', icon: '🕺', source: 'mixamo' }] },
  'Lucky Luke':         { title: 'The Cowboy', signatures: [{ id: 'coin_flip', name: 'Coin Flip', icon: '🪙', source: 'mixamo' }] },
  'Defensive Dee':      { title: 'The Wall', signatures: [{ id: 'block_party', name: 'Block Party', icon: '🛡️', source: 'mixamo' }] },
  'Flash Fiona':        { title: 'Lightning Fingers', signatures: [{ id: 'lightning_strike', name: 'Lightning Strike', icon: '⚡', source: 'mixamo' }] },
  'Big Board Bob':      { title: 'The Carpenter', signatures: [{ id: 'blueprint_unroll', name: 'Blueprint Unroll', icon: '📐', source: 'mixamo' }] },
  'Tricky Tara':        { title: 'The Magician', signatures: [{ id: 'card_trick', name: 'Card Trick', icon: '🃏', source: 'mixamo' }] },
  'Iron Ivan':          { title: 'The Strongman', signatures: [{ id: 'iron_flex', name: 'Iron Flex', icon: '🏋️', source: 'mixamo' }] },
  'King Kyle':          { title: 'The Rookie King', signatures: [
    { id: 'royal_wave', name: 'Royal Wave', icon: '👑', source: 'mixamo' },
    { id: 'crown_tap', name: 'Crown Tap', icon: '✨', source: 'mixamo' },
  ]},

  // ─── Chapter 2 — Venice Beach "The Boardwalk" ────────────────────────
  'Stretch Stevens':    { title: 'The Skater', signatures: [{ id: 'kickflip', name: 'Kickflip', icon: '🛹', source: 'mixamo' }] },
  'Puzzle Pete':        { title: 'The Professor', signatures: [{ id: 'eureka', name: 'Eureka', icon: '💡', source: 'mixamo' }] },
  'Blitz Betty':        { title: 'Derby Queen', signatures: [{ id: 'derby_spin', name: 'Derby Spin', icon: '🛼', source: 'mixamo' }] },
  'Micro Max':          { title: 'Mech Pilot', signatures: [{ id: 'mech_stomp', name: 'Mech Stomp', icon: '🤖', source: 'mixamo' }] },
  'Stone Cold Steve':   { title: 'Immovable', signatures: [{ id: 'stone_stare', name: 'Stone Stare', icon: '🪨', source: 'mixamo' }] },
  'Copy Cat Clara':     { title: 'The Mirror', signatures: [{ id: 'mirror_dance', name: 'Mirror Dance', icon: '🪞', source: 'mixamo' }] },
  'Mega Mike':          { title: 'The Wrestler', signatures: [{ id: 'belt_raise', name: 'Belt Raise', icon: '🏆', source: 'mixamo' }] },
  'Six-Pack Sam':       { title: 'The Lifeguard', signatures: [{ id: 'whistle_blow', name: 'Whistle Blow', icon: '📣', source: 'mixamo' }] },
  'Clock Crusher':      { title: 'Time Lord', signatures: [{ id: 'time_stop', name: 'Time Stop', icon: '⏰', source: 'mixamo' }] },
  'Chaos Karen':        { title: 'Punk Princess', signatures: [{ id: 'chaos_scream', name: 'Chaos Scream', icon: '🤘', source: 'mixamo' }] },
  'Marathon Mel':       { title: 'The Runner', signatures: [{ id: 'finish_line', name: 'Finish Line', icon: '🏁', source: 'mixamo' }] },
  'Grandmaster Grace':  { title: 'The Strategist', signatures: [
    { id: 'three_moves_ahead', name: 'Three Moves Ahead', icon: '♟️', source: 'mixamo' },
    { id: 'grandmaster_bow', name: 'Grandmaster Bow', icon: '🎩', source: 'mixamo' },
  ]},

  // ─── Chapter 3 — Harlem "The Cathedral" ──────────────────────────────
  'Nightmare Nick':     { title: 'The Bad Dream', signatures: [{ id: 'night_terror', name: 'Night Terror', icon: '👻', source: 'mixamo' }] },
  'Lightning Lisa':     { title: 'Storm Chaser', signatures: [{ id: 'thunder_clap', name: 'Thunder Clap', icon: '⛈️', source: 'mixamo' }] },
  'Maze Master Matt':   { title: 'The Architect', signatures: [{ id: 'maze_solve', name: 'Maze Solve', icon: '🧩', source: 'mixamo' }] },
  'Quick Draw Quinn':   { title: 'The Gunslinger', signatures: [{ id: 'quick_draw', name: 'Quick Draw', icon: '🔫', source: 'mixamo' }] },
  'Upside-Down Uma':    { title: 'The Acrobat', signatures: [{ id: 'gravity_flip', name: 'Gravity Flip', icon: '🔄', source: 'mixamo' }] },
  'Arena Alex':         { title: 'The Gladiator', signatures: [{ id: 'gladiator_salute', name: 'Gladiator Salute', icon: '⚔️', source: 'mixamo' }] },
  'Storm Surge Sara':   { title: 'The Captain', signatures: [{ id: 'storm_call', name: 'Storm Call', icon: '🌊', source: 'mixamo' }] },
  'Old Guard Otto':     { title: 'The Veteran', signatures: [{ id: 'medal_flash', name: 'Medal Flash', icon: '🎖️', source: 'mixamo' }] },
  'Grim Reaper Gina':   { title: 'Sudden Death', signatures: [{ id: 'reaper_slice', name: 'Reaper Slice', icon: '💀', source: 'mixamo' }] },
  'Ghost Greg':         { title: 'The Phantom', signatures: [{ id: 'phase_through', name: 'Phase Through', icon: '👤', source: 'mixamo' }] },
  'Final Boss Frank':   { title: 'The Commander', signatures: [{ id: 'commanders_orders', name: "Commander's Orders", icon: '🎖️', source: 'mixamo' }] },
  'The Dark Lord':      { title: 'Dark Matter', signatures: [
    { id: 'dark_aura', name: 'Dark Aura', icon: '🌑', source: 'mixamo' },
    { id: 'reality_break', name: 'Reality Break', icon: '💀', source: 'mixamo' },
    { id: 'sinister_laugh', name: 'Sinister Laugh', icon: '😈', source: 'mixamo' },
  ]},
};

// ─── Build the roster from career levels ──────────────────────────────────
// One roster entry per career level. The opponent's name -> id is deterministic
// so anything that wants to look up "the character you unlock at level 4" can
// use ROSTER_BY_CAREER_LEVEL[4] without hardcoding ids.
function buildCareerRoster(): RosterCharacter[] {
  return ALL_CAREER_LEVELS.map((level) => {
    const id = toCharacterId(level.opponent);
    const overrides = TITLE_OVERRIDES[level.opponent];
    return {
      id,
      name: level.opponent,
      title: overrides?.title ?? level.opponentPersonality,
      personality: level.opponentPersonality,
      unlockedAtCareerLevel: level.id,
      isBoss: level.isBoss,
      signatureEmotes: overrides?.signatures ?? [],
    };
  });
}

export const CAREER_ROSTER: RosterCharacter[] = buildCareerRoster();
// Full roster: 5 starters (always unlocked) + 36 career unlockables = 41 total.
export const ROSTER: RosterCharacter[] = [...STARTER_CHARACTERS, ...CAREER_ROSTER];

// Lookup tables — built once, used everywhere.
export const ROSTER_BY_ID: Record<RosterCharacterId, RosterCharacter> = ROSTER.reduce(
  (acc, c) => {
    acc[c.id] = c;
    return acc;
  },
  {} as Record<RosterCharacterId, RosterCharacter>,
);

export const ROSTER_BY_CAREER_LEVEL: Record<number, RosterCharacter> = CAREER_ROSTER.reduce(
  (acc, c) => {
    if (c.unlockedAtCareerLevel != null) acc[c.unlockedAtCareerLevel] = c;
    return acc;
  },
  {} as Record<number, RosterCharacter>,
);

// ─── Public helpers ───────────────────────────────────────────────────────
export function getCharacter(id: RosterCharacterId): RosterCharacter | undefined {
  return ROSTER_BY_ID[id];
}

export function getCharacterUnlockedAtLevel(levelId: number): RosterCharacter | undefined {
  return ROSTER_BY_CAREER_LEVEL[levelId];
}

