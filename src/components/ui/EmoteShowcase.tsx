import type { EmoteId } from './AnimatedCharacter';

// ── Emoji map for each emote ──
export const EMOTE_EMOJI: Record<EmoteId, string> = {
  idle: '😐',
  blowkiss: '😘', callme: '🤙', fingerheart: '🫰', hearthands: '🫶',
  angry: '😡', tantrum: '🤬',
  airguitar: '🎸', beatchest: '🦍', clapping: '👏', dab: '🕺', dustshoulder: '💅', fingerguns: '👈',
  dancechestpump: '💃', dancetwist: '🪩', dancerunstep: '🏃',
  wave: '👋', bow: '🙇', salute: '🫡',
  thumbsup: '👍', fistpump: '✊', armsraised: '🙌',
  calmdown: '🤚', shrug: '🤷',
  facepalm: '🤦', crying: '😭', thumbsdown: '👎',
  flexbiceps: '💪', boxing: '🥊',
  laughpoint: '🤣', slowclap: '👏',
};

// ── Display names ──
export const EMOTE_NAME: Record<EmoteId, string> = {
  idle: 'Idle',
  blowkiss: 'Blow Kiss', callme: 'Call Me', fingerheart: 'Finger Heart', hearthands: 'Heart Hands',
  angry: 'Angry', tantrum: 'Tantrum',
  airguitar: 'Air Guitar', beatchest: 'Beat Chest', clapping: 'Clapping', dab: 'Dab', dustshoulder: 'Dust Off', fingerguns: 'Finger Guns',
  dancechestpump: 'Chest Pump', dancetwist: 'Twist', dancerunstep: 'Running Man',
  wave: 'Wave', bow: 'Bow', salute: 'Salute',
  thumbsup: 'Thumbs Up', fistpump: 'Fist Pump', armsraised: 'Arms Raised',
  calmdown: 'Calm Down', shrug: 'Shrug',
  facepalm: 'Facepalm', crying: 'Crying', thumbsdown: 'Thumbs Down',
  flexbiceps: 'Flex', boxing: 'Boxing',
  laughpoint: 'Point & Laugh', slowclap: 'Slow Clap',
};

// ── Unlock requirements per emote ──
export interface EmoteUnlock {
  unlocked: boolean;
  requirement?: string;
}

export const EMOTE_UNLOCKS: Record<EmoteId, EmoteUnlock> = {
  idle: { unlocked: true },
  // Affection — mostly locked
  blowkiss: { unlocked: false, requirement: 'Reach Level 8' },
  callme: { unlocked: true },
  fingerheart: { unlocked: true },
  hearthands: { unlocked: false, requirement: 'Win 25 games' },
  // Angry
  angry: { unlocked: true },
  tantrum: { unlocked: false, requirement: 'Lose 10 games in a row' },
  // Celebrate
  airguitar: { unlocked: false, requirement: 'Reach Level 15' },
  beatchest: { unlocked: false, requirement: 'Win 50 games' },
  clapping: { unlocked: true },
  dab: { unlocked: true },
  dustshoulder: { unlocked: false, requirement: 'Win 10 games' },
  fingerguns: { unlocked: true },
  // Dance
  dancechestpump: { unlocked: true },
  dancetwist: { unlocked: false, requirement: 'Reach Level 12' },
  dancerunstep: { unlocked: false, requirement: 'Win a tournament' },
  // Greet
  wave: { unlocked: true },
  bow: { unlocked: true },
  salute: { unlocked: false, requirement: 'Reach Level 20' },
  // Happy
  thumbsup: { unlocked: true },
  fistpump: { unlocked: true },
  armsraised: { unlocked: false, requirement: 'Win 5 games' },
  // Reproach
  calmdown: { unlocked: true },
  shrug: { unlocked: true },
  // Sad
  facepalm: { unlocked: true },
  crying: { unlocked: false, requirement: 'Reach Level 10' },
  thumbsdown: { unlocked: true },
  // Sporty
  flexbiceps: { unlocked: true },
  boxing: { unlocked: false, requirement: 'Win 30 games' },
  // Taunt
  laughpoint: { unlocked: true },
  slowclap: { unlocked: false, requirement: 'Reach Level 5' },
};

// ── Category emoji ──
export const CATEGORY_EMOJI: Record<string, string> = {
  Affection: '💕',
  Angry: '😤',
  Celebrate: '🎉',
  Dance: '💃',
  Greet: '👋',
  Happy: '😊',
  Reproach: '😒',
  Sad: '😢',
  Sporty: '🏋️',
  Taunt: '😈',
};
