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
