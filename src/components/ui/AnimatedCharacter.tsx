// ═══════════════════════════════════════════════════════════════════════
// AnimatedCharacter — legacy 2D sprite-sheet module
//
// HISTORY
// -------
// This file used to render characters via 732 individual PNG frames,
// then via 41 sprite sheets. The sprite-sheet renderer lived here for
// most of Drop4's early development. It's now dead weight — the r3f
// pipeline in `components/3d/Character3D.tsx` replaced it.
//
// WHAT'S LEFT
// -----------
// The TYPES and the EMOTE_CATEGORIES constant. These describe the set
// of emotes + idles the r3f pipeline also uses, and they're imported
// by:
//   - AnimationPicker (emote/idle picker UI)
//   - FortniteEmoteWheel (hotbar wheel)
//   - EmoteShowcase (emoji + display-name maps)
//
// Delete this file only after those imports are migrated to a shared
// `types/animations.ts` module. For now it stands as a thin declarations
// file so the r3f code doesn't have to move.
// ═══════════════════════════════════════════════════════════════════════

export type EmoteId =
  | 'idle'
  // Affection
  | 'blowkiss' | 'callme' | 'fingerheart' | 'hearthands'
  // Angry
  | 'angry' | 'tantrum'
  // Celebrate
  | 'airguitar' | 'beatchest' | 'clapping' | 'dab' | 'dustshoulder' | 'fingerguns'
  // Dance
  | 'dancechestpump' | 'dancetwist' | 'dancerunstep'
  // Greet
  | 'wave' | 'bow' | 'salute'
  // Happy
  | 'thumbsup' | 'fistpump' | 'armsraised'
  // Reproach
  | 'calmdown' | 'shrug'
  // Sad
  | 'facepalm' | 'crying' | 'thumbsdown'
  // Sporty
  | 'flexbiceps' | 'boxing'
  // Taunt
  | 'laughpoint' | 'slowclap';

export type IdleVariantId =
  | 'foottap' | 'swingarms' | 'checkwatch' | 'headnod' | 'lookaround'
  | 'stretch' | 'yawn' | 'chinscratch' | 'weightshift' | 'phonescroll';

export type PoseId = 'default' | 'arms_crossed' | 'hands_on_hips' | 'lean' | 'flex' | 'point' | 'peace' | 'salute';

export const EMOTE_CATEGORIES: { name: string; emotes: EmoteId[] }[] = [
  { name: 'Affection', emotes: ['blowkiss', 'callme', 'fingerheart', 'hearthands'] },
  { name: 'Angry', emotes: ['angry', 'tantrum'] },
  { name: 'Celebrate', emotes: ['airguitar', 'beatchest', 'clapping', 'dab', 'dustshoulder', 'fingerguns'] },
  { name: 'Dance', emotes: ['dancechestpump', 'dancetwist', 'dancerunstep'] },
  { name: 'Greet', emotes: ['wave', 'bow', 'salute'] },
  { name: 'Happy', emotes: ['thumbsup', 'fistpump', 'armsraised'] },
  { name: 'Reproach', emotes: ['calmdown', 'shrug'] },
  { name: 'Sad', emotes: ['facepalm', 'crying', 'thumbsdown'] },
  { name: 'Sporty', emotes: ['flexbiceps', 'boxing'] },
  { name: 'Taunt', emotes: ['laughpoint', 'slowclap'] },
];
