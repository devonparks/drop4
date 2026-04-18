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
  // Shortened from "Point & Laugh" — old label truncated to "POINT & LAU..."
  // in the 70px wheel slot. "Laughing" is clear, single word, fits cleanly.
  laughpoint: 'Laughing', slowclap: 'Slow Clap',
};

