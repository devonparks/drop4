import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Image, StyleSheet, ImageSourcePropType } from 'react-native';
import { ScaledSpriteSheet } from './SpriteSheetAnimator';
import { useRosterStore } from '../../stores/rosterStore';
import { DEFAULT_CHARACTER_ID, RosterCharacterId } from '../../data/characterRoster';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════
// EMOTE CATEGORIES (for UI pickers)
// ═══════════════════════════════════════════════════════════

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

// All idle variant IDs for random selection
const IDLE_VARIANT_IDS: IdleVariantId[] = [
  'foottap', 'swingarms', 'checkwatch', 'headnod', 'lookaround',
  'stretch', 'yawn', 'chinscratch', 'weightshift', 'phonescroll',
];

// ═══════════════════════════════════════════════════════════
// SPRITE SHEETS — 41 PNGs replacing 732 individual frames
// Emotes: 6col x 4row = 24 frames, 1536x1024
// Idle: 4col x 3row = 12 frames, 1024x768
// ═══════════════════════════════════════════════════════════

const SPRITE_SHEETS: Record<string, ImageSourcePropType> = {
  // Base idle
  idle: require('../../assets/images/characters/spritesheets/sheet_idle.png'),

  // Emotes (30 emotes, 24 frames each)
  blowkiss: require('../../assets/images/characters/spritesheets/sheet_blowkiss.png'),
  callme: require('../../assets/images/characters/spritesheets/sheet_callme.png'),
  fingerheart: require('../../assets/images/characters/spritesheets/sheet_fingerheart.png'),
  hearthands: require('../../assets/images/characters/spritesheets/sheet_hearthands.png'),
  angry: require('../../assets/images/characters/spritesheets/sheet_angry.png'),
  tantrum: require('../../assets/images/characters/spritesheets/sheet_tantrum.png'),
  airguitar: require('../../assets/images/characters/spritesheets/sheet_airguitar.png'),
  beatchest: require('../../assets/images/characters/spritesheets/sheet_beatchest.png'),
  clapping: require('../../assets/images/characters/spritesheets/sheet_clapping.png'),
  dab: require('../../assets/images/characters/spritesheets/sheet_dab.png'),
  dustshoulder: require('../../assets/images/characters/spritesheets/sheet_dustshoulder.png'),
  fingerguns: require('../../assets/images/characters/spritesheets/sheet_fingerguns.png'),
  dancechestpump: require('../../assets/images/characters/spritesheets/sheet_dancechestpump.png'),
  dancetwist: require('../../assets/images/characters/spritesheets/sheet_dancetwist.png'),
  dancerunstep: require('../../assets/images/characters/spritesheets/sheet_dancerunstep.png'),
  wave: require('../../assets/images/characters/spritesheets/sheet_wave.png'),
  bow: require('../../assets/images/characters/spritesheets/sheet_bow.png'),
  salute: require('../../assets/images/characters/spritesheets/sheet_salute.png'),
  thumbsup: require('../../assets/images/characters/spritesheets/sheet_thumbsup.png'),
  fistpump: require('../../assets/images/characters/spritesheets/sheet_fistpump.png'),
  armsraised: require('../../assets/images/characters/spritesheets/sheet_armsraised.png'),
  calmdown: require('../../assets/images/characters/spritesheets/sheet_calmdown.png'),
  shrug: require('../../assets/images/characters/spritesheets/sheet_shrug.png'),
  facepalm: require('../../assets/images/characters/spritesheets/sheet_facepalm.png'),
  crying: require('../../assets/images/characters/spritesheets/sheet_crying.png'),
  thumbsdown: require('../../assets/images/characters/spritesheets/sheet_thumbsdown.png'),
  flexbiceps: require('../../assets/images/characters/spritesheets/sheet_flexbiceps.png'),
  boxing: require('../../assets/images/characters/spritesheets/sheet_boxing.png'),
  laughpoint: require('../../assets/images/characters/spritesheets/sheet_laughpoint.png'),
  slowclap: require('../../assets/images/characters/spritesheets/sheet_slowclap.png'),

  // Idle variants (10 variants, 12 frames each)
  idle_foottap: require('../../assets/images/characters/spritesheets/sheet_idle_foottap.png'),
  idle_swingarms: require('../../assets/images/characters/spritesheets/sheet_idle_swingarms.png'),
  idle_checkwatch: require('../../assets/images/characters/spritesheets/sheet_idle_checkwatch.png'),
  idle_headnod: require('../../assets/images/characters/spritesheets/sheet_idle_headnod.png'),
  idle_lookaround: require('../../assets/images/characters/spritesheets/sheet_idle_lookaround.png'),
  idle_stretch: require('../../assets/images/characters/spritesheets/sheet_idle_stretch.png'),
  idle_yawn: require('../../assets/images/characters/spritesheets/sheet_idle_yawn.png'),
  idle_chinscratch: require('../../assets/images/characters/spritesheets/sheet_idle_chinscratch.png'),
  idle_weightshift: require('../../assets/images/characters/spritesheets/sheet_idle_weightshift.png'),
  idle_phonescroll: require('../../assets/images/characters/spritesheets/sheet_idle_phonescroll.png'),
};

// ═══════════════════════════════════════════════════════════
// PER-CHARACTER SPRITE SHEET OVERRIDES
//
// Each entry is a partial map of sheet keys -> require()'d images for ONE
// roster character. React Native's bundler requires `require()` to take a
// static literal, so we cannot interpolate the character id into the path —
// every character must be registered explicitly here as their assets land in
// `src/assets/images/characters/rosters/{characterId}/`.
//
// Lookup falls back to the default `SPRITE_SHEETS` for any missing key, so
// you can ship a character with just an idle sheet and the rest will use the
// default player animations until you render the full set in Unity.
//
// Signature emote ids (from characterRoster.ts) also live in this map under
// the same shape — just add them as new keys alongside the universal ones.
// ═══════════════════════════════════════════════════════════

type CharacterSheetMap = Record<string, ImageSourcePropType>;

const ROSTER_SPRITE_SHEETS: Partial<Record<RosterCharacterId, CharacterSheetMap>> = {
  // Example for when you ship a roster character:
  //
  // speedy_sam: {
  //   idle: require('../../assets/images/characters/rosters/speedy_sam/sheet_idle.png'),
  //   wave: require('../../assets/images/characters/rosters/speedy_sam/sheet_wave.png'),
  //   speed_dash: require('../../assets/images/characters/rosters/speedy_sam/sheet_speed_dash.png'),
  // },
};

/**
 * Returns the sprite sheet image source for `key` (e.g. 'idle', 'wave',
 * 'speed_dash') for the given character. Falls back to the default player
 * sheets when the character has no override for that key.
 */
function getSheet(characterId: RosterCharacterId, key: string): ImageSourcePropType | undefined {
  const overrides = ROSTER_SPRITE_SHEETS[characterId];
  if (overrides && overrides[key]) return overrides[key];
  return SPRITE_SHEETS[key];
}

// ═══════════════════════════════════════════════════════════
// SPRITE SHEET CONFIG — grid dimensions per animation type
// ═══════════════════════════════════════════════════════════

interface SheetConfig {
  columns: number;
  totalFrames: number;
  frameWidth: number;
  frameHeight: number;
  frameInterval: number;
}

const EMOTE_SHEET_CONFIG: SheetConfig = {
  columns: 6,
  totalFrames: 24,
  frameWidth: 256,
  frameHeight: 256,
  frameInterval: 42,    // 24fps film-smooth
};

const IDLE_SHEET_CONFIG: SheetConfig = {
  columns: 4,
  totalFrames: 12,
  frameWidth: 256,
  frameHeight: 256,
  frameInterval: 100,   // smooth idle breathing
};

// Base idle has a different grid layout (3 cols × 4 rows = 768×1024)
// vs idle variants which are (4 cols × 3 rows = 1024×768)
const BASE_IDLE_SHEET_CONFIG: SheetConfig = {
  columns: 3,
  totalFrames: 12,
  frameWidth: 256,
  frameHeight: 256,
  frameInterval: 100,
};

// ═══════════════════════════════════════════════════════════
// LEGACY EMOTE FRAMES — kept as fallback exports for other
// components (EmoteShowcase, CharacterCreator, etc.)
// ═══════════════════════════════════════════════════════════

const EMOTE_FRAMES: Record<EmoteId, ImageSourcePropType[]> = {
  idle: [
    require('../../assets/images/characters/emotes/idle_01.png'),
    require('../../assets/images/characters/emotes/idle_02.png'),
    require('../../assets/images/characters/emotes/idle_03.png'),
    require('../../assets/images/characters/emotes/idle_04.png'),
    require('../../assets/images/characters/emotes/idle_05.png'),
    require('../../assets/images/characters/emotes/idle_06.png'),
    require('../../assets/images/characters/emotes/idle_07.png'),
    require('../../assets/images/characters/emotes/idle_08.png'),
    require('../../assets/images/characters/emotes/idle_09.png'),
    require('../../assets/images/characters/emotes/idle_10.png'),
    require('../../assets/images/characters/emotes/idle_11.png'),
    require('../../assets/images/characters/emotes/idle_12.png'),
  ],
  blowkiss: [
    require('../../assets/images/characters/emotes/emote_blowkiss_01.png'),
    require('../../assets/images/characters/emotes/emote_blowkiss_02.png'),
    require('../../assets/images/characters/emotes/emote_blowkiss_03.png'),
    require('../../assets/images/characters/emotes/emote_blowkiss_04.png'),
    require('../../assets/images/characters/emotes/emote_blowkiss_05.png'),
    require('../../assets/images/characters/emotes/emote_blowkiss_06.png'),
    require('../../assets/images/characters/emotes/emote_blowkiss_07.png'),
    require('../../assets/images/characters/emotes/emote_blowkiss_08.png'),
    require('../../assets/images/characters/emotes/emote_blowkiss_09.png'),
    require('../../assets/images/characters/emotes/emote_blowkiss_10.png'),
    require('../../assets/images/characters/emotes/emote_blowkiss_11.png'),
    require('../../assets/images/characters/emotes/emote_blowkiss_12.png'),
    require('../../assets/images/characters/emotes/emote_blowkiss_13.png'),
    require('../../assets/images/characters/emotes/emote_blowkiss_14.png'),
    require('../../assets/images/characters/emotes/emote_blowkiss_15.png'),
    require('../../assets/images/characters/emotes/emote_blowkiss_16.png'),
    require('../../assets/images/characters/emotes/emote_blowkiss_17.png'),
    require('../../assets/images/characters/emotes/emote_blowkiss_18.png'),
    require('../../assets/images/characters/emotes/emote_blowkiss_19.png'),
    require('../../assets/images/characters/emotes/emote_blowkiss_20.png'),
    require('../../assets/images/characters/emotes/emote_blowkiss_21.png'),
    require('../../assets/images/characters/emotes/emote_blowkiss_22.png'),
    require('../../assets/images/characters/emotes/emote_blowkiss_23.png'),
    require('../../assets/images/characters/emotes/emote_blowkiss_24.png'),
  ],
  callme: [require('../../assets/images/characters/emotes/emote_callme_01.png'), require('../../assets/images/characters/emotes/emote_callme_02.png'), require('../../assets/images/characters/emotes/emote_callme_03.png'), require('../../assets/images/characters/emotes/emote_callme_04.png'), require('../../assets/images/characters/emotes/emote_callme_05.png'), require('../../assets/images/characters/emotes/emote_callme_06.png'), require('../../assets/images/characters/emotes/emote_callme_07.png'), require('../../assets/images/characters/emotes/emote_callme_08.png'), require('../../assets/images/characters/emotes/emote_callme_09.png'), require('../../assets/images/characters/emotes/emote_callme_10.png'), require('../../assets/images/characters/emotes/emote_callme_11.png'), require('../../assets/images/characters/emotes/emote_callme_12.png'), require('../../assets/images/characters/emotes/emote_callme_13.png'), require('../../assets/images/characters/emotes/emote_callme_14.png'), require('../../assets/images/characters/emotes/emote_callme_15.png'), require('../../assets/images/characters/emotes/emote_callme_16.png'), require('../../assets/images/characters/emotes/emote_callme_17.png'), require('../../assets/images/characters/emotes/emote_callme_18.png'), require('../../assets/images/characters/emotes/emote_callme_19.png'), require('../../assets/images/characters/emotes/emote_callme_20.png'), require('../../assets/images/characters/emotes/emote_callme_21.png'), require('../../assets/images/characters/emotes/emote_callme_22.png'), require('../../assets/images/characters/emotes/emote_callme_23.png'), require('../../assets/images/characters/emotes/emote_callme_24.png')],
  fingerheart: [require('../../assets/images/characters/emotes/emote_fingerheart_01.png'), require('../../assets/images/characters/emotes/emote_fingerheart_02.png'), require('../../assets/images/characters/emotes/emote_fingerheart_03.png'), require('../../assets/images/characters/emotes/emote_fingerheart_04.png'), require('../../assets/images/characters/emotes/emote_fingerheart_05.png'), require('../../assets/images/characters/emotes/emote_fingerheart_06.png'), require('../../assets/images/characters/emotes/emote_fingerheart_07.png'), require('../../assets/images/characters/emotes/emote_fingerheart_08.png'), require('../../assets/images/characters/emotes/emote_fingerheart_09.png'), require('../../assets/images/characters/emotes/emote_fingerheart_10.png'), require('../../assets/images/characters/emotes/emote_fingerheart_11.png'), require('../../assets/images/characters/emotes/emote_fingerheart_12.png'), require('../../assets/images/characters/emotes/emote_fingerheart_13.png'), require('../../assets/images/characters/emotes/emote_fingerheart_14.png'), require('../../assets/images/characters/emotes/emote_fingerheart_15.png'), require('../../assets/images/characters/emotes/emote_fingerheart_16.png'), require('../../assets/images/characters/emotes/emote_fingerheart_17.png'), require('../../assets/images/characters/emotes/emote_fingerheart_18.png'), require('../../assets/images/characters/emotes/emote_fingerheart_19.png'), require('../../assets/images/characters/emotes/emote_fingerheart_20.png'), require('../../assets/images/characters/emotes/emote_fingerheart_21.png'), require('../../assets/images/characters/emotes/emote_fingerheart_22.png'), require('../../assets/images/characters/emotes/emote_fingerheart_23.png'), require('../../assets/images/characters/emotes/emote_fingerheart_24.png')],
  hearthands: [require('../../assets/images/characters/emotes/emote_hearthands_01.png'), require('../../assets/images/characters/emotes/emote_hearthands_02.png'), require('../../assets/images/characters/emotes/emote_hearthands_03.png'), require('../../assets/images/characters/emotes/emote_hearthands_04.png'), require('../../assets/images/characters/emotes/emote_hearthands_05.png'), require('../../assets/images/characters/emotes/emote_hearthands_06.png'), require('../../assets/images/characters/emotes/emote_hearthands_07.png'), require('../../assets/images/characters/emotes/emote_hearthands_08.png'), require('../../assets/images/characters/emotes/emote_hearthands_09.png'), require('../../assets/images/characters/emotes/emote_hearthands_10.png'), require('../../assets/images/characters/emotes/emote_hearthands_11.png'), require('../../assets/images/characters/emotes/emote_hearthands_12.png'), require('../../assets/images/characters/emotes/emote_hearthands_13.png'), require('../../assets/images/characters/emotes/emote_hearthands_14.png'), require('../../assets/images/characters/emotes/emote_hearthands_15.png'), require('../../assets/images/characters/emotes/emote_hearthands_16.png'), require('../../assets/images/characters/emotes/emote_hearthands_17.png'), require('../../assets/images/characters/emotes/emote_hearthands_18.png'), require('../../assets/images/characters/emotes/emote_hearthands_19.png'), require('../../assets/images/characters/emotes/emote_hearthands_20.png'), require('../../assets/images/characters/emotes/emote_hearthands_21.png'), require('../../assets/images/characters/emotes/emote_hearthands_22.png'), require('../../assets/images/characters/emotes/emote_hearthands_23.png'), require('../../assets/images/characters/emotes/emote_hearthands_24.png')],
  angry: [require('../../assets/images/characters/emotes/emote_angry_01.png'), require('../../assets/images/characters/emotes/emote_angry_02.png'), require('../../assets/images/characters/emotes/emote_angry_03.png'), require('../../assets/images/characters/emotes/emote_angry_04.png'), require('../../assets/images/characters/emotes/emote_angry_05.png'), require('../../assets/images/characters/emotes/emote_angry_06.png'), require('../../assets/images/characters/emotes/emote_angry_07.png'), require('../../assets/images/characters/emotes/emote_angry_08.png'), require('../../assets/images/characters/emotes/emote_angry_09.png'), require('../../assets/images/characters/emotes/emote_angry_10.png'), require('../../assets/images/characters/emotes/emote_angry_11.png'), require('../../assets/images/characters/emotes/emote_angry_12.png'), require('../../assets/images/characters/emotes/emote_angry_13.png'), require('../../assets/images/characters/emotes/emote_angry_14.png'), require('../../assets/images/characters/emotes/emote_angry_15.png'), require('../../assets/images/characters/emotes/emote_angry_16.png'), require('../../assets/images/characters/emotes/emote_angry_17.png'), require('../../assets/images/characters/emotes/emote_angry_18.png'), require('../../assets/images/characters/emotes/emote_angry_19.png'), require('../../assets/images/characters/emotes/emote_angry_20.png'), require('../../assets/images/characters/emotes/emote_angry_21.png'), require('../../assets/images/characters/emotes/emote_angry_22.png'), require('../../assets/images/characters/emotes/emote_angry_23.png'), require('../../assets/images/characters/emotes/emote_angry_24.png')],
  tantrum: [require('../../assets/images/characters/emotes/emote_tantrum_01.png'), require('../../assets/images/characters/emotes/emote_tantrum_02.png'), require('../../assets/images/characters/emotes/emote_tantrum_03.png'), require('../../assets/images/characters/emotes/emote_tantrum_04.png'), require('../../assets/images/characters/emotes/emote_tantrum_05.png'), require('../../assets/images/characters/emotes/emote_tantrum_06.png'), require('../../assets/images/characters/emotes/emote_tantrum_07.png'), require('../../assets/images/characters/emotes/emote_tantrum_08.png'), require('../../assets/images/characters/emotes/emote_tantrum_09.png'), require('../../assets/images/characters/emotes/emote_tantrum_10.png'), require('../../assets/images/characters/emotes/emote_tantrum_11.png'), require('../../assets/images/characters/emotes/emote_tantrum_12.png'), require('../../assets/images/characters/emotes/emote_tantrum_13.png'), require('../../assets/images/characters/emotes/emote_tantrum_14.png'), require('../../assets/images/characters/emotes/emote_tantrum_15.png'), require('../../assets/images/characters/emotes/emote_tantrum_16.png'), require('../../assets/images/characters/emotes/emote_tantrum_17.png'), require('../../assets/images/characters/emotes/emote_tantrum_18.png'), require('../../assets/images/characters/emotes/emote_tantrum_19.png'), require('../../assets/images/characters/emotes/emote_tantrum_20.png'), require('../../assets/images/characters/emotes/emote_tantrum_21.png'), require('../../assets/images/characters/emotes/emote_tantrum_22.png'), require('../../assets/images/characters/emotes/emote_tantrum_23.png'), require('../../assets/images/characters/emotes/emote_tantrum_24.png')],
  airguitar: [require('../../assets/images/characters/emotes/emote_airguitar_01.png'), require('../../assets/images/characters/emotes/emote_airguitar_02.png'), require('../../assets/images/characters/emotes/emote_airguitar_03.png'), require('../../assets/images/characters/emotes/emote_airguitar_04.png'), require('../../assets/images/characters/emotes/emote_airguitar_05.png'), require('../../assets/images/characters/emotes/emote_airguitar_06.png'), require('../../assets/images/characters/emotes/emote_airguitar_07.png'), require('../../assets/images/characters/emotes/emote_airguitar_08.png'), require('../../assets/images/characters/emotes/emote_airguitar_09.png'), require('../../assets/images/characters/emotes/emote_airguitar_10.png'), require('../../assets/images/characters/emotes/emote_airguitar_11.png'), require('../../assets/images/characters/emotes/emote_airguitar_12.png'), require('../../assets/images/characters/emotes/emote_airguitar_13.png'), require('../../assets/images/characters/emotes/emote_airguitar_14.png'), require('../../assets/images/characters/emotes/emote_airguitar_15.png'), require('../../assets/images/characters/emotes/emote_airguitar_16.png'), require('../../assets/images/characters/emotes/emote_airguitar_17.png'), require('../../assets/images/characters/emotes/emote_airguitar_18.png'), require('../../assets/images/characters/emotes/emote_airguitar_19.png'), require('../../assets/images/characters/emotes/emote_airguitar_20.png'), require('../../assets/images/characters/emotes/emote_airguitar_21.png'), require('../../assets/images/characters/emotes/emote_airguitar_22.png'), require('../../assets/images/characters/emotes/emote_airguitar_23.png'), require('../../assets/images/characters/emotes/emote_airguitar_24.png')],
  beatchest: [require('../../assets/images/characters/emotes/emote_beatchest_01.png'), require('../../assets/images/characters/emotes/emote_beatchest_02.png'), require('../../assets/images/characters/emotes/emote_beatchest_03.png'), require('../../assets/images/characters/emotes/emote_beatchest_04.png'), require('../../assets/images/characters/emotes/emote_beatchest_05.png'), require('../../assets/images/characters/emotes/emote_beatchest_06.png'), require('../../assets/images/characters/emotes/emote_beatchest_07.png'), require('../../assets/images/characters/emotes/emote_beatchest_08.png'), require('../../assets/images/characters/emotes/emote_beatchest_09.png'), require('../../assets/images/characters/emotes/emote_beatchest_10.png'), require('../../assets/images/characters/emotes/emote_beatchest_11.png'), require('../../assets/images/characters/emotes/emote_beatchest_12.png'), require('../../assets/images/characters/emotes/emote_beatchest_13.png'), require('../../assets/images/characters/emotes/emote_beatchest_14.png'), require('../../assets/images/characters/emotes/emote_beatchest_15.png'), require('../../assets/images/characters/emotes/emote_beatchest_16.png'), require('../../assets/images/characters/emotes/emote_beatchest_17.png'), require('../../assets/images/characters/emotes/emote_beatchest_18.png'), require('../../assets/images/characters/emotes/emote_beatchest_19.png'), require('../../assets/images/characters/emotes/emote_beatchest_20.png'), require('../../assets/images/characters/emotes/emote_beatchest_21.png'), require('../../assets/images/characters/emotes/emote_beatchest_22.png'), require('../../assets/images/characters/emotes/emote_beatchest_23.png'), require('../../assets/images/characters/emotes/emote_beatchest_24.png')],
  clapping: [require('../../assets/images/characters/emotes/emote_clapping_01.png'), require('../../assets/images/characters/emotes/emote_clapping_02.png'), require('../../assets/images/characters/emotes/emote_clapping_03.png'), require('../../assets/images/characters/emotes/emote_clapping_04.png'), require('../../assets/images/characters/emotes/emote_clapping_05.png'), require('../../assets/images/characters/emotes/emote_clapping_06.png'), require('../../assets/images/characters/emotes/emote_clapping_07.png'), require('../../assets/images/characters/emotes/emote_clapping_08.png'), require('../../assets/images/characters/emotes/emote_clapping_09.png'), require('../../assets/images/characters/emotes/emote_clapping_10.png'), require('../../assets/images/characters/emotes/emote_clapping_11.png'), require('../../assets/images/characters/emotes/emote_clapping_12.png'), require('../../assets/images/characters/emotes/emote_clapping_13.png'), require('../../assets/images/characters/emotes/emote_clapping_14.png'), require('../../assets/images/characters/emotes/emote_clapping_15.png'), require('../../assets/images/characters/emotes/emote_clapping_16.png'), require('../../assets/images/characters/emotes/emote_clapping_17.png'), require('../../assets/images/characters/emotes/emote_clapping_18.png'), require('../../assets/images/characters/emotes/emote_clapping_19.png'), require('../../assets/images/characters/emotes/emote_clapping_20.png'), require('../../assets/images/characters/emotes/emote_clapping_21.png'), require('../../assets/images/characters/emotes/emote_clapping_22.png'), require('../../assets/images/characters/emotes/emote_clapping_23.png'), require('../../assets/images/characters/emotes/emote_clapping_24.png')],
  dab: [require('../../assets/images/characters/emotes/emote_dab_01.png'), require('../../assets/images/characters/emotes/emote_dab_02.png'), require('../../assets/images/characters/emotes/emote_dab_03.png'), require('../../assets/images/characters/emotes/emote_dab_04.png'), require('../../assets/images/characters/emotes/emote_dab_05.png'), require('../../assets/images/characters/emotes/emote_dab_06.png'), require('../../assets/images/characters/emotes/emote_dab_07.png'), require('../../assets/images/characters/emotes/emote_dab_08.png'), require('../../assets/images/characters/emotes/emote_dab_09.png'), require('../../assets/images/characters/emotes/emote_dab_10.png'), require('../../assets/images/characters/emotes/emote_dab_11.png'), require('../../assets/images/characters/emotes/emote_dab_12.png'), require('../../assets/images/characters/emotes/emote_dab_13.png'), require('../../assets/images/characters/emotes/emote_dab_14.png'), require('../../assets/images/characters/emotes/emote_dab_15.png'), require('../../assets/images/characters/emotes/emote_dab_16.png'), require('../../assets/images/characters/emotes/emote_dab_17.png'), require('../../assets/images/characters/emotes/emote_dab_18.png'), require('../../assets/images/characters/emotes/emote_dab_19.png'), require('../../assets/images/characters/emotes/emote_dab_20.png'), require('../../assets/images/characters/emotes/emote_dab_21.png'), require('../../assets/images/characters/emotes/emote_dab_22.png'), require('../../assets/images/characters/emotes/emote_dab_23.png'), require('../../assets/images/characters/emotes/emote_dab_24.png')],
  dustshoulder: [require('../../assets/images/characters/emotes/emote_dustshoulder_01.png'), require('../../assets/images/characters/emotes/emote_dustshoulder_02.png'), require('../../assets/images/characters/emotes/emote_dustshoulder_03.png'), require('../../assets/images/characters/emotes/emote_dustshoulder_04.png'), require('../../assets/images/characters/emotes/emote_dustshoulder_05.png'), require('../../assets/images/characters/emotes/emote_dustshoulder_06.png'), require('../../assets/images/characters/emotes/emote_dustshoulder_07.png'), require('../../assets/images/characters/emotes/emote_dustshoulder_08.png'), require('../../assets/images/characters/emotes/emote_dustshoulder_09.png'), require('../../assets/images/characters/emotes/emote_dustshoulder_10.png'), require('../../assets/images/characters/emotes/emote_dustshoulder_11.png'), require('../../assets/images/characters/emotes/emote_dustshoulder_12.png'), require('../../assets/images/characters/emotes/emote_dustshoulder_13.png'), require('../../assets/images/characters/emotes/emote_dustshoulder_14.png'), require('../../assets/images/characters/emotes/emote_dustshoulder_15.png'), require('../../assets/images/characters/emotes/emote_dustshoulder_16.png'), require('../../assets/images/characters/emotes/emote_dustshoulder_17.png'), require('../../assets/images/characters/emotes/emote_dustshoulder_18.png'), require('../../assets/images/characters/emotes/emote_dustshoulder_19.png'), require('../../assets/images/characters/emotes/emote_dustshoulder_20.png'), require('../../assets/images/characters/emotes/emote_dustshoulder_21.png'), require('../../assets/images/characters/emotes/emote_dustshoulder_22.png'), require('../../assets/images/characters/emotes/emote_dustshoulder_23.png'), require('../../assets/images/characters/emotes/emote_dustshoulder_24.png')],
  fingerguns: [require('../../assets/images/characters/emotes/emote_fingerguns_01.png'), require('../../assets/images/characters/emotes/emote_fingerguns_02.png'), require('../../assets/images/characters/emotes/emote_fingerguns_03.png'), require('../../assets/images/characters/emotes/emote_fingerguns_04.png'), require('../../assets/images/characters/emotes/emote_fingerguns_05.png'), require('../../assets/images/characters/emotes/emote_fingerguns_06.png'), require('../../assets/images/characters/emotes/emote_fingerguns_07.png'), require('../../assets/images/characters/emotes/emote_fingerguns_08.png'), require('../../assets/images/characters/emotes/emote_fingerguns_09.png'), require('../../assets/images/characters/emotes/emote_fingerguns_10.png'), require('../../assets/images/characters/emotes/emote_fingerguns_11.png'), require('../../assets/images/characters/emotes/emote_fingerguns_12.png'), require('../../assets/images/characters/emotes/emote_fingerguns_13.png'), require('../../assets/images/characters/emotes/emote_fingerguns_14.png'), require('../../assets/images/characters/emotes/emote_fingerguns_15.png'), require('../../assets/images/characters/emotes/emote_fingerguns_16.png'), require('../../assets/images/characters/emotes/emote_fingerguns_17.png'), require('../../assets/images/characters/emotes/emote_fingerguns_18.png'), require('../../assets/images/characters/emotes/emote_fingerguns_19.png'), require('../../assets/images/characters/emotes/emote_fingerguns_20.png'), require('../../assets/images/characters/emotes/emote_fingerguns_21.png'), require('../../assets/images/characters/emotes/emote_fingerguns_22.png'), require('../../assets/images/characters/emotes/emote_fingerguns_23.png'), require('../../assets/images/characters/emotes/emote_fingerguns_24.png')],
  dancechestpump: [require('../../assets/images/characters/emotes/emote_dancechestpump_01.png'), require('../../assets/images/characters/emotes/emote_dancechestpump_02.png'), require('../../assets/images/characters/emotes/emote_dancechestpump_03.png'), require('../../assets/images/characters/emotes/emote_dancechestpump_04.png'), require('../../assets/images/characters/emotes/emote_dancechestpump_05.png'), require('../../assets/images/characters/emotes/emote_dancechestpump_06.png'), require('../../assets/images/characters/emotes/emote_dancechestpump_07.png'), require('../../assets/images/characters/emotes/emote_dancechestpump_08.png'), require('../../assets/images/characters/emotes/emote_dancechestpump_09.png'), require('../../assets/images/characters/emotes/emote_dancechestpump_10.png'), require('../../assets/images/characters/emotes/emote_dancechestpump_11.png'), require('../../assets/images/characters/emotes/emote_dancechestpump_12.png'), require('../../assets/images/characters/emotes/emote_dancechestpump_13.png'), require('../../assets/images/characters/emotes/emote_dancechestpump_14.png'), require('../../assets/images/characters/emotes/emote_dancechestpump_15.png'), require('../../assets/images/characters/emotes/emote_dancechestpump_16.png'), require('../../assets/images/characters/emotes/emote_dancechestpump_17.png'), require('../../assets/images/characters/emotes/emote_dancechestpump_18.png'), require('../../assets/images/characters/emotes/emote_dancechestpump_19.png'), require('../../assets/images/characters/emotes/emote_dancechestpump_20.png'), require('../../assets/images/characters/emotes/emote_dancechestpump_21.png'), require('../../assets/images/characters/emotes/emote_dancechestpump_22.png'), require('../../assets/images/characters/emotes/emote_dancechestpump_23.png'), require('../../assets/images/characters/emotes/emote_dancechestpump_24.png')],
  dancetwist: [require('../../assets/images/characters/emotes/emote_dancetwist_01.png'), require('../../assets/images/characters/emotes/emote_dancetwist_02.png'), require('../../assets/images/characters/emotes/emote_dancetwist_03.png'), require('../../assets/images/characters/emotes/emote_dancetwist_04.png'), require('../../assets/images/characters/emotes/emote_dancetwist_05.png'), require('../../assets/images/characters/emotes/emote_dancetwist_06.png'), require('../../assets/images/characters/emotes/emote_dancetwist_07.png'), require('../../assets/images/characters/emotes/emote_dancetwist_08.png'), require('../../assets/images/characters/emotes/emote_dancetwist_09.png'), require('../../assets/images/characters/emotes/emote_dancetwist_10.png'), require('../../assets/images/characters/emotes/emote_dancetwist_11.png'), require('../../assets/images/characters/emotes/emote_dancetwist_12.png'), require('../../assets/images/characters/emotes/emote_dancetwist_13.png'), require('../../assets/images/characters/emotes/emote_dancetwist_14.png'), require('../../assets/images/characters/emotes/emote_dancetwist_15.png'), require('../../assets/images/characters/emotes/emote_dancetwist_16.png'), require('../../assets/images/characters/emotes/emote_dancetwist_17.png'), require('../../assets/images/characters/emotes/emote_dancetwist_18.png'), require('../../assets/images/characters/emotes/emote_dancetwist_19.png'), require('../../assets/images/characters/emotes/emote_dancetwist_20.png'), require('../../assets/images/characters/emotes/emote_dancetwist_21.png'), require('../../assets/images/characters/emotes/emote_dancetwist_22.png'), require('../../assets/images/characters/emotes/emote_dancetwist_23.png'), require('../../assets/images/characters/emotes/emote_dancetwist_24.png')],
  dancerunstep: [require('../../assets/images/characters/emotes/emote_dancerunstep_01.png'), require('../../assets/images/characters/emotes/emote_dancerunstep_02.png'), require('../../assets/images/characters/emotes/emote_dancerunstep_03.png'), require('../../assets/images/characters/emotes/emote_dancerunstep_04.png'), require('../../assets/images/characters/emotes/emote_dancerunstep_05.png'), require('../../assets/images/characters/emotes/emote_dancerunstep_06.png'), require('../../assets/images/characters/emotes/emote_dancerunstep_07.png'), require('../../assets/images/characters/emotes/emote_dancerunstep_08.png'), require('../../assets/images/characters/emotes/emote_dancerunstep_09.png'), require('../../assets/images/characters/emotes/emote_dancerunstep_10.png'), require('../../assets/images/characters/emotes/emote_dancerunstep_11.png'), require('../../assets/images/characters/emotes/emote_dancerunstep_12.png'), require('../../assets/images/characters/emotes/emote_dancerunstep_13.png'), require('../../assets/images/characters/emotes/emote_dancerunstep_14.png'), require('../../assets/images/characters/emotes/emote_dancerunstep_15.png'), require('../../assets/images/characters/emotes/emote_dancerunstep_16.png'), require('../../assets/images/characters/emotes/emote_dancerunstep_17.png'), require('../../assets/images/characters/emotes/emote_dancerunstep_18.png'), require('../../assets/images/characters/emotes/emote_dancerunstep_19.png'), require('../../assets/images/characters/emotes/emote_dancerunstep_20.png'), require('../../assets/images/characters/emotes/emote_dancerunstep_21.png'), require('../../assets/images/characters/emotes/emote_dancerunstep_22.png'), require('../../assets/images/characters/emotes/emote_dancerunstep_23.png'), require('../../assets/images/characters/emotes/emote_dancerunstep_24.png')],
  wave: [require('../../assets/images/characters/emotes/emote_wave_01.png'), require('../../assets/images/characters/emotes/emote_wave_02.png'), require('../../assets/images/characters/emotes/emote_wave_03.png'), require('../../assets/images/characters/emotes/emote_wave_04.png'), require('../../assets/images/characters/emotes/emote_wave_05.png'), require('../../assets/images/characters/emotes/emote_wave_06.png'), require('../../assets/images/characters/emotes/emote_wave_07.png'), require('../../assets/images/characters/emotes/emote_wave_08.png'), require('../../assets/images/characters/emotes/emote_wave_09.png'), require('../../assets/images/characters/emotes/emote_wave_10.png'), require('../../assets/images/characters/emotes/emote_wave_11.png'), require('../../assets/images/characters/emotes/emote_wave_12.png'), require('../../assets/images/characters/emotes/emote_wave_13.png'), require('../../assets/images/characters/emotes/emote_wave_14.png'), require('../../assets/images/characters/emotes/emote_wave_15.png'), require('../../assets/images/characters/emotes/emote_wave_16.png'), require('../../assets/images/characters/emotes/emote_wave_17.png'), require('../../assets/images/characters/emotes/emote_wave_18.png'), require('../../assets/images/characters/emotes/emote_wave_19.png'), require('../../assets/images/characters/emotes/emote_wave_20.png'), require('../../assets/images/characters/emotes/emote_wave_21.png'), require('../../assets/images/characters/emotes/emote_wave_22.png'), require('../../assets/images/characters/emotes/emote_wave_23.png'), require('../../assets/images/characters/emotes/emote_wave_24.png')],
  bow: [require('../../assets/images/characters/emotes/emote_bow_01.png'), require('../../assets/images/characters/emotes/emote_bow_02.png'), require('../../assets/images/characters/emotes/emote_bow_03.png'), require('../../assets/images/characters/emotes/emote_bow_04.png'), require('../../assets/images/characters/emotes/emote_bow_05.png'), require('../../assets/images/characters/emotes/emote_bow_06.png'), require('../../assets/images/characters/emotes/emote_bow_07.png'), require('../../assets/images/characters/emotes/emote_bow_08.png'), require('../../assets/images/characters/emotes/emote_bow_09.png'), require('../../assets/images/characters/emotes/emote_bow_10.png'), require('../../assets/images/characters/emotes/emote_bow_11.png'), require('../../assets/images/characters/emotes/emote_bow_12.png'), require('../../assets/images/characters/emotes/emote_bow_13.png'), require('../../assets/images/characters/emotes/emote_bow_14.png'), require('../../assets/images/characters/emotes/emote_bow_15.png'), require('../../assets/images/characters/emotes/emote_bow_16.png'), require('../../assets/images/characters/emotes/emote_bow_17.png'), require('../../assets/images/characters/emotes/emote_bow_18.png'), require('../../assets/images/characters/emotes/emote_bow_19.png'), require('../../assets/images/characters/emotes/emote_bow_20.png'), require('../../assets/images/characters/emotes/emote_bow_21.png'), require('../../assets/images/characters/emotes/emote_bow_22.png'), require('../../assets/images/characters/emotes/emote_bow_23.png'), require('../../assets/images/characters/emotes/emote_bow_24.png')],
  salute: [require('../../assets/images/characters/emotes/emote_salute_01.png'), require('../../assets/images/characters/emotes/emote_salute_02.png'), require('../../assets/images/characters/emotes/emote_salute_03.png'), require('../../assets/images/characters/emotes/emote_salute_04.png'), require('../../assets/images/characters/emotes/emote_salute_05.png'), require('../../assets/images/characters/emotes/emote_salute_06.png'), require('../../assets/images/characters/emotes/emote_salute_07.png'), require('../../assets/images/characters/emotes/emote_salute_08.png'), require('../../assets/images/characters/emotes/emote_salute_09.png'), require('../../assets/images/characters/emotes/emote_salute_10.png'), require('../../assets/images/characters/emotes/emote_salute_11.png'), require('../../assets/images/characters/emotes/emote_salute_12.png'), require('../../assets/images/characters/emotes/emote_salute_13.png'), require('../../assets/images/characters/emotes/emote_salute_14.png'), require('../../assets/images/characters/emotes/emote_salute_15.png'), require('../../assets/images/characters/emotes/emote_salute_16.png'), require('../../assets/images/characters/emotes/emote_salute_17.png'), require('../../assets/images/characters/emotes/emote_salute_18.png'), require('../../assets/images/characters/emotes/emote_salute_19.png'), require('../../assets/images/characters/emotes/emote_salute_20.png'), require('../../assets/images/characters/emotes/emote_salute_21.png'), require('../../assets/images/characters/emotes/emote_salute_22.png'), require('../../assets/images/characters/emotes/emote_salute_23.png'), require('../../assets/images/characters/emotes/emote_salute_24.png')],
  thumbsup: [require('../../assets/images/characters/emotes/emote_thumbsup_01.png'), require('../../assets/images/characters/emotes/emote_thumbsup_02.png'), require('../../assets/images/characters/emotes/emote_thumbsup_03.png'), require('../../assets/images/characters/emotes/emote_thumbsup_04.png'), require('../../assets/images/characters/emotes/emote_thumbsup_05.png'), require('../../assets/images/characters/emotes/emote_thumbsup_06.png'), require('../../assets/images/characters/emotes/emote_thumbsup_07.png'), require('../../assets/images/characters/emotes/emote_thumbsup_08.png'), require('../../assets/images/characters/emotes/emote_thumbsup_09.png'), require('../../assets/images/characters/emotes/emote_thumbsup_10.png'), require('../../assets/images/characters/emotes/emote_thumbsup_11.png'), require('../../assets/images/characters/emotes/emote_thumbsup_12.png'), require('../../assets/images/characters/emotes/emote_thumbsup_13.png'), require('../../assets/images/characters/emotes/emote_thumbsup_14.png'), require('../../assets/images/characters/emotes/emote_thumbsup_15.png'), require('../../assets/images/characters/emotes/emote_thumbsup_16.png'), require('../../assets/images/characters/emotes/emote_thumbsup_17.png'), require('../../assets/images/characters/emotes/emote_thumbsup_18.png'), require('../../assets/images/characters/emotes/emote_thumbsup_19.png'), require('../../assets/images/characters/emotes/emote_thumbsup_20.png'), require('../../assets/images/characters/emotes/emote_thumbsup_21.png'), require('../../assets/images/characters/emotes/emote_thumbsup_22.png'), require('../../assets/images/characters/emotes/emote_thumbsup_23.png'), require('../../assets/images/characters/emotes/emote_thumbsup_24.png')],
  fistpump: [require('../../assets/images/characters/emotes/emote_fistpump_01.png'), require('../../assets/images/characters/emotes/emote_fistpump_02.png'), require('../../assets/images/characters/emotes/emote_fistpump_03.png'), require('../../assets/images/characters/emotes/emote_fistpump_04.png'), require('../../assets/images/characters/emotes/emote_fistpump_05.png'), require('../../assets/images/characters/emotes/emote_fistpump_06.png'), require('../../assets/images/characters/emotes/emote_fistpump_07.png'), require('../../assets/images/characters/emotes/emote_fistpump_08.png'), require('../../assets/images/characters/emotes/emote_fistpump_09.png'), require('../../assets/images/characters/emotes/emote_fistpump_10.png'), require('../../assets/images/characters/emotes/emote_fistpump_11.png'), require('../../assets/images/characters/emotes/emote_fistpump_12.png'), require('../../assets/images/characters/emotes/emote_fistpump_13.png'), require('../../assets/images/characters/emotes/emote_fistpump_14.png'), require('../../assets/images/characters/emotes/emote_fistpump_15.png'), require('../../assets/images/characters/emotes/emote_fistpump_16.png'), require('../../assets/images/characters/emotes/emote_fistpump_17.png'), require('../../assets/images/characters/emotes/emote_fistpump_18.png'), require('../../assets/images/characters/emotes/emote_fistpump_19.png'), require('../../assets/images/characters/emotes/emote_fistpump_20.png'), require('../../assets/images/characters/emotes/emote_fistpump_21.png'), require('../../assets/images/characters/emotes/emote_fistpump_22.png'), require('../../assets/images/characters/emotes/emote_fistpump_23.png'), require('../../assets/images/characters/emotes/emote_fistpump_24.png')],
  armsraised: [require('../../assets/images/characters/emotes/emote_armsraised_01.png'), require('../../assets/images/characters/emotes/emote_armsraised_02.png'), require('../../assets/images/characters/emotes/emote_armsraised_03.png'), require('../../assets/images/characters/emotes/emote_armsraised_04.png'), require('../../assets/images/characters/emotes/emote_armsraised_05.png'), require('../../assets/images/characters/emotes/emote_armsraised_06.png'), require('../../assets/images/characters/emotes/emote_armsraised_07.png'), require('../../assets/images/characters/emotes/emote_armsraised_08.png'), require('../../assets/images/characters/emotes/emote_armsraised_09.png'), require('../../assets/images/characters/emotes/emote_armsraised_10.png'), require('../../assets/images/characters/emotes/emote_armsraised_11.png'), require('../../assets/images/characters/emotes/emote_armsraised_12.png'), require('../../assets/images/characters/emotes/emote_armsraised_13.png'), require('../../assets/images/characters/emotes/emote_armsraised_14.png'), require('../../assets/images/characters/emotes/emote_armsraised_15.png'), require('../../assets/images/characters/emotes/emote_armsraised_16.png'), require('../../assets/images/characters/emotes/emote_armsraised_17.png'), require('../../assets/images/characters/emotes/emote_armsraised_18.png'), require('../../assets/images/characters/emotes/emote_armsraised_19.png'), require('../../assets/images/characters/emotes/emote_armsraised_20.png'), require('../../assets/images/characters/emotes/emote_armsraised_21.png'), require('../../assets/images/characters/emotes/emote_armsraised_22.png'), require('../../assets/images/characters/emotes/emote_armsraised_23.png'), require('../../assets/images/characters/emotes/emote_armsraised_24.png')],
  calmdown: [require('../../assets/images/characters/emotes/emote_calmdown_01.png'), require('../../assets/images/characters/emotes/emote_calmdown_02.png'), require('../../assets/images/characters/emotes/emote_calmdown_03.png'), require('../../assets/images/characters/emotes/emote_calmdown_04.png'), require('../../assets/images/characters/emotes/emote_calmdown_05.png'), require('../../assets/images/characters/emotes/emote_calmdown_06.png'), require('../../assets/images/characters/emotes/emote_calmdown_07.png'), require('../../assets/images/characters/emotes/emote_calmdown_08.png'), require('../../assets/images/characters/emotes/emote_calmdown_09.png'), require('../../assets/images/characters/emotes/emote_calmdown_10.png'), require('../../assets/images/characters/emotes/emote_calmdown_11.png'), require('../../assets/images/characters/emotes/emote_calmdown_12.png'), require('../../assets/images/characters/emotes/emote_calmdown_13.png'), require('../../assets/images/characters/emotes/emote_calmdown_14.png'), require('../../assets/images/characters/emotes/emote_calmdown_15.png'), require('../../assets/images/characters/emotes/emote_calmdown_16.png'), require('../../assets/images/characters/emotes/emote_calmdown_17.png'), require('../../assets/images/characters/emotes/emote_calmdown_18.png'), require('../../assets/images/characters/emotes/emote_calmdown_19.png'), require('../../assets/images/characters/emotes/emote_calmdown_20.png'), require('../../assets/images/characters/emotes/emote_calmdown_21.png'), require('../../assets/images/characters/emotes/emote_calmdown_22.png'), require('../../assets/images/characters/emotes/emote_calmdown_23.png'), require('../../assets/images/characters/emotes/emote_calmdown_24.png')],
  shrug: [require('../../assets/images/characters/emotes/emote_shrug_01.png'), require('../../assets/images/characters/emotes/emote_shrug_02.png'), require('../../assets/images/characters/emotes/emote_shrug_03.png'), require('../../assets/images/characters/emotes/emote_shrug_04.png'), require('../../assets/images/characters/emotes/emote_shrug_05.png'), require('../../assets/images/characters/emotes/emote_shrug_06.png'), require('../../assets/images/characters/emotes/emote_shrug_07.png'), require('../../assets/images/characters/emotes/emote_shrug_08.png'), require('../../assets/images/characters/emotes/emote_shrug_09.png'), require('../../assets/images/characters/emotes/emote_shrug_10.png'), require('../../assets/images/characters/emotes/emote_shrug_11.png'), require('../../assets/images/characters/emotes/emote_shrug_12.png'), require('../../assets/images/characters/emotes/emote_shrug_13.png'), require('../../assets/images/characters/emotes/emote_shrug_14.png'), require('../../assets/images/characters/emotes/emote_shrug_15.png'), require('../../assets/images/characters/emotes/emote_shrug_16.png'), require('../../assets/images/characters/emotes/emote_shrug_17.png'), require('../../assets/images/characters/emotes/emote_shrug_18.png'), require('../../assets/images/characters/emotes/emote_shrug_19.png'), require('../../assets/images/characters/emotes/emote_shrug_20.png'), require('../../assets/images/characters/emotes/emote_shrug_21.png'), require('../../assets/images/characters/emotes/emote_shrug_22.png'), require('../../assets/images/characters/emotes/emote_shrug_23.png'), require('../../assets/images/characters/emotes/emote_shrug_24.png')],
  facepalm: [require('../../assets/images/characters/emotes/emote_facepalm_01.png'), require('../../assets/images/characters/emotes/emote_facepalm_02.png'), require('../../assets/images/characters/emotes/emote_facepalm_03.png'), require('../../assets/images/characters/emotes/emote_facepalm_04.png'), require('../../assets/images/characters/emotes/emote_facepalm_05.png'), require('../../assets/images/characters/emotes/emote_facepalm_06.png'), require('../../assets/images/characters/emotes/emote_facepalm_07.png'), require('../../assets/images/characters/emotes/emote_facepalm_08.png'), require('../../assets/images/characters/emotes/emote_facepalm_09.png'), require('../../assets/images/characters/emotes/emote_facepalm_10.png'), require('../../assets/images/characters/emotes/emote_facepalm_11.png'), require('../../assets/images/characters/emotes/emote_facepalm_12.png'), require('../../assets/images/characters/emotes/emote_facepalm_13.png'), require('../../assets/images/characters/emotes/emote_facepalm_14.png'), require('../../assets/images/characters/emotes/emote_facepalm_15.png'), require('../../assets/images/characters/emotes/emote_facepalm_16.png'), require('../../assets/images/characters/emotes/emote_facepalm_17.png'), require('../../assets/images/characters/emotes/emote_facepalm_18.png'), require('../../assets/images/characters/emotes/emote_facepalm_19.png'), require('../../assets/images/characters/emotes/emote_facepalm_20.png'), require('../../assets/images/characters/emotes/emote_facepalm_21.png'), require('../../assets/images/characters/emotes/emote_facepalm_22.png'), require('../../assets/images/characters/emotes/emote_facepalm_23.png'), require('../../assets/images/characters/emotes/emote_facepalm_24.png')],
  crying: [require('../../assets/images/characters/emotes/emote_crying_01.png'), require('../../assets/images/characters/emotes/emote_crying_02.png'), require('../../assets/images/characters/emotes/emote_crying_03.png'), require('../../assets/images/characters/emotes/emote_crying_04.png'), require('../../assets/images/characters/emotes/emote_crying_05.png'), require('../../assets/images/characters/emotes/emote_crying_06.png'), require('../../assets/images/characters/emotes/emote_crying_07.png'), require('../../assets/images/characters/emotes/emote_crying_08.png'), require('../../assets/images/characters/emotes/emote_crying_09.png'), require('../../assets/images/characters/emotes/emote_crying_10.png'), require('../../assets/images/characters/emotes/emote_crying_11.png'), require('../../assets/images/characters/emotes/emote_crying_12.png'), require('../../assets/images/characters/emotes/emote_crying_13.png'), require('../../assets/images/characters/emotes/emote_crying_14.png'), require('../../assets/images/characters/emotes/emote_crying_15.png'), require('../../assets/images/characters/emotes/emote_crying_16.png'), require('../../assets/images/characters/emotes/emote_crying_17.png'), require('../../assets/images/characters/emotes/emote_crying_18.png'), require('../../assets/images/characters/emotes/emote_crying_19.png'), require('../../assets/images/characters/emotes/emote_crying_20.png'), require('../../assets/images/characters/emotes/emote_crying_21.png'), require('../../assets/images/characters/emotes/emote_crying_22.png'), require('../../assets/images/characters/emotes/emote_crying_23.png'), require('../../assets/images/characters/emotes/emote_crying_24.png')],
  thumbsdown: [require('../../assets/images/characters/emotes/emote_thumbsdown_01.png'), require('../../assets/images/characters/emotes/emote_thumbsdown_02.png'), require('../../assets/images/characters/emotes/emote_thumbsdown_03.png'), require('../../assets/images/characters/emotes/emote_thumbsdown_04.png'), require('../../assets/images/characters/emotes/emote_thumbsdown_05.png'), require('../../assets/images/characters/emotes/emote_thumbsdown_06.png'), require('../../assets/images/characters/emotes/emote_thumbsdown_07.png'), require('../../assets/images/characters/emotes/emote_thumbsdown_08.png'), require('../../assets/images/characters/emotes/emote_thumbsdown_09.png'), require('../../assets/images/characters/emotes/emote_thumbsdown_10.png'), require('../../assets/images/characters/emotes/emote_thumbsdown_11.png'), require('../../assets/images/characters/emotes/emote_thumbsdown_12.png'), require('../../assets/images/characters/emotes/emote_thumbsdown_13.png'), require('../../assets/images/characters/emotes/emote_thumbsdown_14.png'), require('../../assets/images/characters/emotes/emote_thumbsdown_15.png'), require('../../assets/images/characters/emotes/emote_thumbsdown_16.png'), require('../../assets/images/characters/emotes/emote_thumbsdown_17.png'), require('../../assets/images/characters/emotes/emote_thumbsdown_18.png'), require('../../assets/images/characters/emotes/emote_thumbsdown_19.png'), require('../../assets/images/characters/emotes/emote_thumbsdown_20.png'), require('../../assets/images/characters/emotes/emote_thumbsdown_21.png'), require('../../assets/images/characters/emotes/emote_thumbsdown_22.png'), require('../../assets/images/characters/emotes/emote_thumbsdown_23.png'), require('../../assets/images/characters/emotes/emote_thumbsdown_24.png')],
  flexbiceps: [require('../../assets/images/characters/emotes/emote_flexbiceps_01.png'), require('../../assets/images/characters/emotes/emote_flexbiceps_02.png'), require('../../assets/images/characters/emotes/emote_flexbiceps_03.png'), require('../../assets/images/characters/emotes/emote_flexbiceps_04.png'), require('../../assets/images/characters/emotes/emote_flexbiceps_05.png'), require('../../assets/images/characters/emotes/emote_flexbiceps_06.png'), require('../../assets/images/characters/emotes/emote_flexbiceps_07.png'), require('../../assets/images/characters/emotes/emote_flexbiceps_08.png'), require('../../assets/images/characters/emotes/emote_flexbiceps_09.png'), require('../../assets/images/characters/emotes/emote_flexbiceps_10.png'), require('../../assets/images/characters/emotes/emote_flexbiceps_11.png'), require('../../assets/images/characters/emotes/emote_flexbiceps_12.png'), require('../../assets/images/characters/emotes/emote_flexbiceps_13.png'), require('../../assets/images/characters/emotes/emote_flexbiceps_14.png'), require('../../assets/images/characters/emotes/emote_flexbiceps_15.png'), require('../../assets/images/characters/emotes/emote_flexbiceps_16.png'), require('../../assets/images/characters/emotes/emote_flexbiceps_17.png'), require('../../assets/images/characters/emotes/emote_flexbiceps_18.png'), require('../../assets/images/characters/emotes/emote_flexbiceps_19.png'), require('../../assets/images/characters/emotes/emote_flexbiceps_20.png'), require('../../assets/images/characters/emotes/emote_flexbiceps_21.png'), require('../../assets/images/characters/emotes/emote_flexbiceps_22.png'), require('../../assets/images/characters/emotes/emote_flexbiceps_23.png'), require('../../assets/images/characters/emotes/emote_flexbiceps_24.png')],
  boxing: [require('../../assets/images/characters/emotes/emote_boxing_01.png'), require('../../assets/images/characters/emotes/emote_boxing_02.png'), require('../../assets/images/characters/emotes/emote_boxing_03.png'), require('../../assets/images/characters/emotes/emote_boxing_04.png'), require('../../assets/images/characters/emotes/emote_boxing_05.png'), require('../../assets/images/characters/emotes/emote_boxing_06.png'), require('../../assets/images/characters/emotes/emote_boxing_07.png'), require('../../assets/images/characters/emotes/emote_boxing_08.png'), require('../../assets/images/characters/emotes/emote_boxing_09.png'), require('../../assets/images/characters/emotes/emote_boxing_10.png'), require('../../assets/images/characters/emotes/emote_boxing_11.png'), require('../../assets/images/characters/emotes/emote_boxing_12.png'), require('../../assets/images/characters/emotes/emote_boxing_13.png'), require('../../assets/images/characters/emotes/emote_boxing_14.png'), require('../../assets/images/characters/emotes/emote_boxing_15.png'), require('../../assets/images/characters/emotes/emote_boxing_16.png'), require('../../assets/images/characters/emotes/emote_boxing_17.png'), require('../../assets/images/characters/emotes/emote_boxing_18.png'), require('../../assets/images/characters/emotes/emote_boxing_19.png'), require('../../assets/images/characters/emotes/emote_boxing_20.png'), require('../../assets/images/characters/emotes/emote_boxing_21.png'), require('../../assets/images/characters/emotes/emote_boxing_22.png'), require('../../assets/images/characters/emotes/emote_boxing_23.png'), require('../../assets/images/characters/emotes/emote_boxing_24.png')],
  laughpoint: [require('../../assets/images/characters/emotes/emote_laughpoint_01.png'), require('../../assets/images/characters/emotes/emote_laughpoint_02.png'), require('../../assets/images/characters/emotes/emote_laughpoint_03.png'), require('../../assets/images/characters/emotes/emote_laughpoint_04.png'), require('../../assets/images/characters/emotes/emote_laughpoint_05.png'), require('../../assets/images/characters/emotes/emote_laughpoint_06.png'), require('../../assets/images/characters/emotes/emote_laughpoint_07.png'), require('../../assets/images/characters/emotes/emote_laughpoint_08.png'), require('../../assets/images/characters/emotes/emote_laughpoint_09.png'), require('../../assets/images/characters/emotes/emote_laughpoint_10.png'), require('../../assets/images/characters/emotes/emote_laughpoint_11.png'), require('../../assets/images/characters/emotes/emote_laughpoint_12.png'), require('../../assets/images/characters/emotes/emote_laughpoint_13.png'), require('../../assets/images/characters/emotes/emote_laughpoint_14.png'), require('../../assets/images/characters/emotes/emote_laughpoint_15.png'), require('../../assets/images/characters/emotes/emote_laughpoint_16.png'), require('../../assets/images/characters/emotes/emote_laughpoint_17.png'), require('../../assets/images/characters/emotes/emote_laughpoint_18.png'), require('../../assets/images/characters/emotes/emote_laughpoint_19.png'), require('../../assets/images/characters/emotes/emote_laughpoint_20.png'), require('../../assets/images/characters/emotes/emote_laughpoint_21.png'), require('../../assets/images/characters/emotes/emote_laughpoint_22.png'), require('../../assets/images/characters/emotes/emote_laughpoint_23.png'), require('../../assets/images/characters/emotes/emote_laughpoint_24.png')],
  slowclap: [require('../../assets/images/characters/emotes/emote_slowclap_01.png'), require('../../assets/images/characters/emotes/emote_slowclap_02.png'), require('../../assets/images/characters/emotes/emote_slowclap_03.png'), require('../../assets/images/characters/emotes/emote_slowclap_04.png'), require('../../assets/images/characters/emotes/emote_slowclap_05.png'), require('../../assets/images/characters/emotes/emote_slowclap_06.png'), require('../../assets/images/characters/emotes/emote_slowclap_07.png'), require('../../assets/images/characters/emotes/emote_slowclap_08.png'), require('../../assets/images/characters/emotes/emote_slowclap_09.png'), require('../../assets/images/characters/emotes/emote_slowclap_10.png'), require('../../assets/images/characters/emotes/emote_slowclap_11.png'), require('../../assets/images/characters/emotes/emote_slowclap_12.png'), require('../../assets/images/characters/emotes/emote_slowclap_13.png'), require('../../assets/images/characters/emotes/emote_slowclap_14.png'), require('../../assets/images/characters/emotes/emote_slowclap_15.png'), require('../../assets/images/characters/emotes/emote_slowclap_16.png'), require('../../assets/images/characters/emotes/emote_slowclap_17.png'), require('../../assets/images/characters/emotes/emote_slowclap_18.png'), require('../../assets/images/characters/emotes/emote_slowclap_19.png'), require('../../assets/images/characters/emotes/emote_slowclap_20.png'), require('../../assets/images/characters/emotes/emote_slowclap_21.png'), require('../../assets/images/characters/emotes/emote_slowclap_22.png'), require('../../assets/images/characters/emotes/emote_slowclap_23.png'), require('../../assets/images/characters/emotes/emote_slowclap_24.png')],
};

// Legacy idle variants (kept for exports)
const IDLE_VARIANTS: Record<IdleVariantId, ImageSourcePropType[]> = {
  foottap: [require('../../assets/images/characters/idles/idle_foottap_01.png'), require('../../assets/images/characters/idles/idle_foottap_02.png'), require('../../assets/images/characters/idles/idle_foottap_03.png'), require('../../assets/images/characters/idles/idle_foottap_04.png'), require('../../assets/images/characters/idles/idle_foottap_05.png'), require('../../assets/images/characters/idles/idle_foottap_06.png'), require('../../assets/images/characters/idles/idle_foottap_07.png'), require('../../assets/images/characters/idles/idle_foottap_08.png'), require('../../assets/images/characters/idles/idle_foottap_09.png'), require('../../assets/images/characters/idles/idle_foottap_10.png'), require('../../assets/images/characters/idles/idle_foottap_11.png'), require('../../assets/images/characters/idles/idle_foottap_12.png')],
  swingarms: [require('../../assets/images/characters/idles/idle_swingarms_01.png'), require('../../assets/images/characters/idles/idle_swingarms_02.png'), require('../../assets/images/characters/idles/idle_swingarms_03.png'), require('../../assets/images/characters/idles/idle_swingarms_04.png'), require('../../assets/images/characters/idles/idle_swingarms_05.png'), require('../../assets/images/characters/idles/idle_swingarms_06.png'), require('../../assets/images/characters/idles/idle_swingarms_07.png'), require('../../assets/images/characters/idles/idle_swingarms_08.png'), require('../../assets/images/characters/idles/idle_swingarms_09.png'), require('../../assets/images/characters/idles/idle_swingarms_10.png'), require('../../assets/images/characters/idles/idle_swingarms_11.png'), require('../../assets/images/characters/idles/idle_swingarms_12.png')],
  checkwatch: [require('../../assets/images/characters/idles/idle_checkwatch_01.png'), require('../../assets/images/characters/idles/idle_checkwatch_02.png'), require('../../assets/images/characters/idles/idle_checkwatch_03.png'), require('../../assets/images/characters/idles/idle_checkwatch_04.png'), require('../../assets/images/characters/idles/idle_checkwatch_05.png'), require('../../assets/images/characters/idles/idle_checkwatch_06.png'), require('../../assets/images/characters/idles/idle_checkwatch_07.png'), require('../../assets/images/characters/idles/idle_checkwatch_08.png'), require('../../assets/images/characters/idles/idle_checkwatch_09.png'), require('../../assets/images/characters/idles/idle_checkwatch_10.png'), require('../../assets/images/characters/idles/idle_checkwatch_11.png'), require('../../assets/images/characters/idles/idle_checkwatch_12.png')],
  headnod: [require('../../assets/images/characters/idles/idle_headnod_01.png'), require('../../assets/images/characters/idles/idle_headnod_02.png'), require('../../assets/images/characters/idles/idle_headnod_03.png'), require('../../assets/images/characters/idles/idle_headnod_04.png'), require('../../assets/images/characters/idles/idle_headnod_05.png'), require('../../assets/images/characters/idles/idle_headnod_06.png'), require('../../assets/images/characters/idles/idle_headnod_07.png'), require('../../assets/images/characters/idles/idle_headnod_08.png'), require('../../assets/images/characters/idles/idle_headnod_09.png'), require('../../assets/images/characters/idles/idle_headnod_10.png'), require('../../assets/images/characters/idles/idle_headnod_11.png'), require('../../assets/images/characters/idles/idle_headnod_12.png')],
  lookaround: [require('../../assets/images/characters/idles/idle_lookaround_01.png'), require('../../assets/images/characters/idles/idle_lookaround_02.png'), require('../../assets/images/characters/idles/idle_lookaround_03.png'), require('../../assets/images/characters/idles/idle_lookaround_04.png'), require('../../assets/images/characters/idles/idle_lookaround_05.png'), require('../../assets/images/characters/idles/idle_lookaround_06.png'), require('../../assets/images/characters/idles/idle_lookaround_07.png'), require('../../assets/images/characters/idles/idle_lookaround_08.png'), require('../../assets/images/characters/idles/idle_lookaround_09.png'), require('../../assets/images/characters/idles/idle_lookaround_10.png'), require('../../assets/images/characters/idles/idle_lookaround_11.png'), require('../../assets/images/characters/idles/idle_lookaround_12.png')],
  stretch: [require('../../assets/images/characters/idles/idle_stretch_01.png'), require('../../assets/images/characters/idles/idle_stretch_02.png'), require('../../assets/images/characters/idles/idle_stretch_03.png'), require('../../assets/images/characters/idles/idle_stretch_04.png'), require('../../assets/images/characters/idles/idle_stretch_05.png'), require('../../assets/images/characters/idles/idle_stretch_06.png'), require('../../assets/images/characters/idles/idle_stretch_07.png'), require('../../assets/images/characters/idles/idle_stretch_08.png'), require('../../assets/images/characters/idles/idle_stretch_09.png'), require('../../assets/images/characters/idles/idle_stretch_10.png'), require('../../assets/images/characters/idles/idle_stretch_11.png'), require('../../assets/images/characters/idles/idle_stretch_12.png')],
  yawn: [require('../../assets/images/characters/idles/idle_yawn_01.png'), require('../../assets/images/characters/idles/idle_yawn_02.png'), require('../../assets/images/characters/idles/idle_yawn_03.png'), require('../../assets/images/characters/idles/idle_yawn_04.png'), require('../../assets/images/characters/idles/idle_yawn_05.png'), require('../../assets/images/characters/idles/idle_yawn_06.png'), require('../../assets/images/characters/idles/idle_yawn_07.png'), require('../../assets/images/characters/idles/idle_yawn_08.png'), require('../../assets/images/characters/idles/idle_yawn_09.png'), require('../../assets/images/characters/idles/idle_yawn_10.png'), require('../../assets/images/characters/idles/idle_yawn_11.png'), require('../../assets/images/characters/idles/idle_yawn_12.png')],
  chinscratch: [require('../../assets/images/characters/idles/idle_chinscratch_01.png'), require('../../assets/images/characters/idles/idle_chinscratch_02.png'), require('../../assets/images/characters/idles/idle_chinscratch_03.png'), require('../../assets/images/characters/idles/idle_chinscratch_04.png'), require('../../assets/images/characters/idles/idle_chinscratch_05.png'), require('../../assets/images/characters/idles/idle_chinscratch_06.png'), require('../../assets/images/characters/idles/idle_chinscratch_07.png'), require('../../assets/images/characters/idles/idle_chinscratch_08.png'), require('../../assets/images/characters/idles/idle_chinscratch_09.png'), require('../../assets/images/characters/idles/idle_chinscratch_10.png'), require('../../assets/images/characters/idles/idle_chinscratch_11.png'), require('../../assets/images/characters/idles/idle_chinscratch_12.png')],
  weightshift: [require('../../assets/images/characters/idles/idle_weightshift_01.png'), require('../../assets/images/characters/idles/idle_weightshift_02.png'), require('../../assets/images/characters/idles/idle_weightshift_03.png'), require('../../assets/images/characters/idles/idle_weightshift_04.png'), require('../../assets/images/characters/idles/idle_weightshift_05.png'), require('../../assets/images/characters/idles/idle_weightshift_06.png'), require('../../assets/images/characters/idles/idle_weightshift_07.png'), require('../../assets/images/characters/idles/idle_weightshift_08.png'), require('../../assets/images/characters/idles/idle_weightshift_09.png'), require('../../assets/images/characters/idles/idle_weightshift_10.png'), require('../../assets/images/characters/idles/idle_weightshift_11.png'), require('../../assets/images/characters/idles/idle_weightshift_12.png')],
  phonescroll: [require('../../assets/images/characters/idles/idle_phonescroll_01.png'), require('../../assets/images/characters/idles/idle_phonescroll_02.png'), require('../../assets/images/characters/idles/idle_phonescroll_03.png'), require('../../assets/images/characters/idles/idle_phonescroll_04.png'), require('../../assets/images/characters/idles/idle_phonescroll_05.png'), require('../../assets/images/characters/idles/idle_phonescroll_06.png'), require('../../assets/images/characters/idles/idle_phonescroll_07.png'), require('../../assets/images/characters/idles/idle_phonescroll_08.png'), require('../../assets/images/characters/idles/idle_phonescroll_09.png'), require('../../assets/images/characters/idles/idle_phonescroll_10.png'), require('../../assets/images/characters/idles/idle_phonescroll_11.png'), require('../../assets/images/characters/idles/idle_phonescroll_12.png')],
};

// ═══════════════════════════════════════════════════════════
// POSE IMAGES (static holds)
// ═══════════════════════════════════════════════════════════

const POSE_IMAGES: Record<PoseId, ImageSourcePropType> = {
  default: require('../../assets/images/characters/poses/pose_default.png'),
  arms_crossed: require('../../assets/images/characters/poses/pose_arms_crossed.png'),
  hands_on_hips: require('../../assets/images/characters/poses/pose_hands_on_hips.png'),
  lean: require('../../assets/images/characters/poses/pose_lean.png'),
  flex: require('../../assets/images/characters/poses/pose_flex.png'),
  point: require('../../assets/images/characters/poses/pose_point.png'),
  peace: require('../../assets/images/characters/poses/pose_peace.png'),
  salute: require('../../assets/images/characters/poses/pose_salute.png'),
};

// ═══════════════════════════════════════════════════════════
// TIMING
// ═══════════════════════════════════════════════════════════

const IDLE_VARIANT_MIN_DELAY = 8000;
const IDLE_VARIANT_MAX_DELAY = 12000;

function randomVariantDelay(): number {
  return IDLE_VARIANT_MIN_DELAY + Math.random() * (IDLE_VARIANT_MAX_DELAY - IDLE_VARIANT_MIN_DELAY);
}

function randomIdleVariant(): IdleVariantId {
  return IDLE_VARIANT_IDS[Math.floor(Math.random() * IDLE_VARIANT_IDS.length)];
}

// ═══════════════════════════════════════════════════════════
// ANIMATION STATE MACHINE
// ═══════════════════════════════════════════════════════════
// States:
//   'idle'          — looping base idle (12 frames @ 100ms)
//   'idle_variant'  — playing a one-shot idle variant (12 frames @ 100ms)
//   'emote'         — playing a triggered emote (24 frames @ 42ms)

type AnimState = 'idle' | 'idle_variant' | 'emote';

// ═══════════════════════════════════════════════════════════
// COMPONENT — Uses ScaledSpriteSheet for properly scaled rendering
// ═══════════════════════════════════════════════════════════

interface AnimatedCharacterProps {
  size?: number;
  emote?: EmoteId | string | null;     // accepts signature emote ids too
  pose?: PoseId;
  selectedIdle?: IdleVariantId | null;
  onEmoteComplete?: () => void;
  style?: any;
  /**
   * Roster character to render. Defaults to whichever character the player has
   * equipped. Pass an explicit id to render a specific opponent (e.g. on the
   * career level card or character select screen).
   */
  characterId?: RosterCharacterId;
}

export function AnimatedCharacter({
  size = 300,
  emote = null,
  pose = 'default',
  selectedIdle = null,
  onEmoteComplete,
  style,
  characterId,
}: AnimatedCharacterProps) {
  // Subscribe to the equipped character so the active player avatar updates
  // automatically when the player swaps skins. Explicit `characterId` always
  // wins so callers rendering a specific opponent are not affected.
  const equippedId = useRosterStore((s) => s.equippedCharacterId);
  const activeCharacterId: RosterCharacterId = characterId ?? equippedId ?? DEFAULT_CHARACTER_ID;
  const [animState, setAnimState] = useState<AnimState>('idle');
  const [activeEmote, setActiveEmote] = useState<EmoteId | null>(null);
  const [activeVariant, setActiveVariant] = useState<IdleVariantId | null>(null);

  const variantTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Schedule next idle variant (skipped when a specific idle is equipped) ───
  const scheduleVariant = useCallback(() => {
    if (selectedIdle) return;
    if (variantTimerRef.current) clearTimeout(variantTimerRef.current);
    variantTimerRef.current = setTimeout(() => {
      setAnimState((prev) => {
        if (prev === 'idle') {
          const variant = randomIdleVariant();
          setActiveVariant(variant);
          return 'idle_variant';
        }
        scheduleVariant();
        return prev;
      });
    }, randomVariantDelay());
  }, [selectedIdle]);

  // ─── Handle emote trigger from props ───
  // Accepts both universal emote ids (typed EmoteId) and signature emote ids
  // (string), as long as the active character or default has a sheet for them.
  useEffect(() => {
    if (emote && emote !== 'idle' && getSheet(activeCharacterId, emote)) {
      if (variantTimerRef.current) clearTimeout(variantTimerRef.current);
      setActiveEmote(emote as EmoteId);
      setActiveVariant(null);
      setAnimState('emote');
    }
  }, [emote, activeCharacterId]);

  // ─── Start the variant timer on mount ───
  useEffect(() => {
    scheduleVariant();
    return () => {
      if (variantTimerRef.current) clearTimeout(variantTimerRef.current);
    };
  }, [scheduleVariant]);

  // ─── Handle animation complete callbacks ───
  const handleEmoteComplete = useCallback(() => {
    setActiveEmote(null);
    setAnimState('idle');
    onEmoteComplete?.();
    scheduleVariant();
  }, [onEmoteComplete, scheduleVariant]);

  const handleVariantComplete = useCallback(() => {
    setActiveVariant(null);
    setAnimState('idle');
    scheduleVariant();
  }, [scheduleVariant]);

  // ─── Determine which sheet and config to use ───
  let sheetSource: ImageSourcePropType;
  let config: SheetConfig;
  let loop: boolean;
  let handleComplete: (() => void) | undefined;

  // All sheet lookups now go through getSheet so per-character overrides work.
  // Missing keys silently fall back to the default player's sheet for that key.
  if (animState === 'emote' && activeEmote && getSheet(activeCharacterId, activeEmote)) {
    sheetSource = getSheet(activeCharacterId, activeEmote)!;
    config = EMOTE_SHEET_CONFIG;
    loop = false;
    handleComplete = handleEmoteComplete;
  } else if (animState === 'idle_variant' && activeVariant) {
    const key = `idle_${activeVariant}`;
    const variantSheet = getSheet(activeCharacterId, key);
    if (variantSheet) {
      sheetSource = variantSheet;
      config = IDLE_SHEET_CONFIG; // variants are 4 cols × 3 rows
    } else {
      sheetSource = getSheet(activeCharacterId, 'idle')!;
      config = BASE_IDLE_SHEET_CONFIG; // fallback to base idle (3 cols × 4 rows)
    }
    loop = false;
    handleComplete = handleVariantComplete;
  } else if (selectedIdle) {
    const key = `idle_${selectedIdle}`;
    const resolvedSource = getSheet(activeCharacterId, key);
    if (resolvedSource) {
      sheetSource = resolvedSource;
      config = IDLE_SHEET_CONFIG; // variants are 4×3
    } else {
      sheetSource = getSheet(activeCharacterId, 'idle')!;
      config = BASE_IDLE_SHEET_CONFIG; // base idle is 3×4
    }
    loop = true;
    handleComplete = undefined;
  } else {
    sheetSource = getSheet(activeCharacterId, 'idle')!;
    config = BASE_IDLE_SHEET_CONFIG; // base idle is 3×4 (768×1024)
    loop = true;
    handleComplete = undefined;
  }

  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      <ScaledSpriteSheet
        source={sheetSource}
        frameWidth={config.frameWidth}
        frameHeight={config.frameHeight}
        columns={config.columns}
        totalFrames={config.totalFrames}
        frameInterval={config.frameInterval}
        loop={loop}
        playing={true}
        onComplete={handleComplete}
        size={size}
      />
    </View>
  );
}

// ═══════════════════════════════════════════════════════════
// POSE DISPLAY (static, for profile/character screen)
// ═══════════════════════════════════════════════════════════

interface PoseDisplayProps {
  pose: PoseId;
  size?: number;
  style?: any;
}

export function PoseDisplay({ pose, size = 200, style }: PoseDisplayProps) {
  const source = POSE_IMAGES[pose] || POSE_IMAGES.default;

  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      <Image source={source} style={styles.characterImage} resizeMode="contain" />
    </View>
  );
}

// ═══════════════════════════════════════════════════════════
// HOOKS
// ═══════════════════════════════════════════════════════════

export function useEmoteTrigger() {
  const [emote, setEmote] = useState<EmoteId | null>(null);

  const triggerEmote = useCallback((id: EmoteId) => {
    setEmote(null);
    setTimeout(() => setEmote(id), 10);
  }, []);

  const clearEmote = useCallback(() => {
    setEmote(null);
  }, []);

  return { emote, triggerEmote, clearEmote };
}

// ═══════════════════════════════════════════════════════════
// EXPORTS — Legacy frame arrays kept for other components
// ═══════════════════════════════════════════════════════════

export { POSE_IMAGES, IDLE_VARIANTS, IDLE_VARIANT_IDS, EMOTE_FRAMES, SPRITE_SHEETS };

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  characterImage: {
    width: '100%',
    height: '100%',
  },
});
