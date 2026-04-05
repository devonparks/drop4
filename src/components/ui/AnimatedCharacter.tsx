import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Image, StyleSheet, ImageSourcePropType } from 'react-native';

export type EmoteId = 'idle' | 'thumbsup' | 'wave' | 'dab' | 'dance' | 'happy' | 'sad' | 'angry' | 'celebrate';
export type PoseId = 'default' | 'arms_crossed' | 'hands_on_hips' | 'lean' | 'flex' | 'point' | 'peace' | 'salute';

// ═══════════════════════════════════════════════
// EMOTE FRAMES (24 frames per emote, 12 idle)
// 256x256 resolution, 42ms/frame = 24fps smooth
// ═══════════════════════════════════════════════

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
  thumbsup: [
    require('../../assets/images/characters/emotes/emote_thumbsup_01.png'),
    require('../../assets/images/characters/emotes/emote_thumbsup_02.png'),
    require('../../assets/images/characters/emotes/emote_thumbsup_03.png'),
    require('../../assets/images/characters/emotes/emote_thumbsup_04.png'),
    require('../../assets/images/characters/emotes/emote_thumbsup_05.png'),
    require('../../assets/images/characters/emotes/emote_thumbsup_06.png'),
    require('../../assets/images/characters/emotes/emote_thumbsup_07.png'),
    require('../../assets/images/characters/emotes/emote_thumbsup_08.png'),
    require('../../assets/images/characters/emotes/emote_thumbsup_09.png'),
    require('../../assets/images/characters/emotes/emote_thumbsup_10.png'),
    require('../../assets/images/characters/emotes/emote_thumbsup_11.png'),
    require('../../assets/images/characters/emotes/emote_thumbsup_12.png'),
    require('../../assets/images/characters/emotes/emote_thumbsup_13.png'),
    require('../../assets/images/characters/emotes/emote_thumbsup_14.png'),
    require('../../assets/images/characters/emotes/emote_thumbsup_15.png'),
    require('../../assets/images/characters/emotes/emote_thumbsup_16.png'),
    require('../../assets/images/characters/emotes/emote_thumbsup_17.png'),
    require('../../assets/images/characters/emotes/emote_thumbsup_18.png'),
    require('../../assets/images/characters/emotes/emote_thumbsup_19.png'),
    require('../../assets/images/characters/emotes/emote_thumbsup_20.png'),
    require('../../assets/images/characters/emotes/emote_thumbsup_21.png'),
    require('../../assets/images/characters/emotes/emote_thumbsup_22.png'),
    require('../../assets/images/characters/emotes/emote_thumbsup_23.png'),
    require('../../assets/images/characters/emotes/emote_thumbsup_24.png'),
  ],
  wave: [
    require('../../assets/images/characters/emotes/emote_wave_01.png'),
    require('../../assets/images/characters/emotes/emote_wave_02.png'),
    require('../../assets/images/characters/emotes/emote_wave_03.png'),
    require('../../assets/images/characters/emotes/emote_wave_04.png'),
    require('../../assets/images/characters/emotes/emote_wave_05.png'),
    require('../../assets/images/characters/emotes/emote_wave_06.png'),
    require('../../assets/images/characters/emotes/emote_wave_07.png'),
    require('../../assets/images/characters/emotes/emote_wave_08.png'),
    require('../../assets/images/characters/emotes/emote_wave_09.png'),
    require('../../assets/images/characters/emotes/emote_wave_10.png'),
    require('../../assets/images/characters/emotes/emote_wave_11.png'),
    require('../../assets/images/characters/emotes/emote_wave_12.png'),
    require('../../assets/images/characters/emotes/emote_wave_13.png'),
    require('../../assets/images/characters/emotes/emote_wave_14.png'),
    require('../../assets/images/characters/emotes/emote_wave_15.png'),
    require('../../assets/images/characters/emotes/emote_wave_16.png'),
    require('../../assets/images/characters/emotes/emote_wave_17.png'),
    require('../../assets/images/characters/emotes/emote_wave_18.png'),
    require('../../assets/images/characters/emotes/emote_wave_19.png'),
    require('../../assets/images/characters/emotes/emote_wave_20.png'),
    require('../../assets/images/characters/emotes/emote_wave_21.png'),
    require('../../assets/images/characters/emotes/emote_wave_22.png'),
    require('../../assets/images/characters/emotes/emote_wave_23.png'),
    require('../../assets/images/characters/emotes/emote_wave_24.png'),
  ],
  dab: [
    require('../../assets/images/characters/emotes/emote_dab_01.png'),
    require('../../assets/images/characters/emotes/emote_dab_02.png'),
    require('../../assets/images/characters/emotes/emote_dab_03.png'),
    require('../../assets/images/characters/emotes/emote_dab_04.png'),
    require('../../assets/images/characters/emotes/emote_dab_05.png'),
    require('../../assets/images/characters/emotes/emote_dab_06.png'),
    require('../../assets/images/characters/emotes/emote_dab_07.png'),
    require('../../assets/images/characters/emotes/emote_dab_08.png'),
    require('../../assets/images/characters/emotes/emote_dab_09.png'),
    require('../../assets/images/characters/emotes/emote_dab_10.png'),
    require('../../assets/images/characters/emotes/emote_dab_11.png'),
    require('../../assets/images/characters/emotes/emote_dab_12.png'),
    require('../../assets/images/characters/emotes/emote_dab_13.png'),
    require('../../assets/images/characters/emotes/emote_dab_14.png'),
    require('../../assets/images/characters/emotes/emote_dab_15.png'),
    require('../../assets/images/characters/emotes/emote_dab_16.png'),
    require('../../assets/images/characters/emotes/emote_dab_17.png'),
    require('../../assets/images/characters/emotes/emote_dab_18.png'),
    require('../../assets/images/characters/emotes/emote_dab_19.png'),
    require('../../assets/images/characters/emotes/emote_dab_20.png'),
    require('../../assets/images/characters/emotes/emote_dab_21.png'),
    require('../../assets/images/characters/emotes/emote_dab_22.png'),
    require('../../assets/images/characters/emotes/emote_dab_23.png'),
    require('../../assets/images/characters/emotes/emote_dab_24.png'),
  ],
  dance: [
    require('../../assets/images/characters/emotes/emote_dance_01.png'),
    require('../../assets/images/characters/emotes/emote_dance_02.png'),
    require('../../assets/images/characters/emotes/emote_dance_03.png'),
    require('../../assets/images/characters/emotes/emote_dance_04.png'),
    require('../../assets/images/characters/emotes/emote_dance_05.png'),
    require('../../assets/images/characters/emotes/emote_dance_06.png'),
    require('../../assets/images/characters/emotes/emote_dance_07.png'),
    require('../../assets/images/characters/emotes/emote_dance_08.png'),
    require('../../assets/images/characters/emotes/emote_dance_09.png'),
    require('../../assets/images/characters/emotes/emote_dance_10.png'),
    require('../../assets/images/characters/emotes/emote_dance_11.png'),
    require('../../assets/images/characters/emotes/emote_dance_12.png'),
    require('../../assets/images/characters/emotes/emote_dance_13.png'),
    require('../../assets/images/characters/emotes/emote_dance_14.png'),
    require('../../assets/images/characters/emotes/emote_dance_15.png'),
    require('../../assets/images/characters/emotes/emote_dance_16.png'),
    require('../../assets/images/characters/emotes/emote_dance_17.png'),
    require('../../assets/images/characters/emotes/emote_dance_18.png'),
    require('../../assets/images/characters/emotes/emote_dance_19.png'),
    require('../../assets/images/characters/emotes/emote_dance_20.png'),
    require('../../assets/images/characters/emotes/emote_dance_21.png'),
    require('../../assets/images/characters/emotes/emote_dance_22.png'),
    require('../../assets/images/characters/emotes/emote_dance_23.png'),
    require('../../assets/images/characters/emotes/emote_dance_24.png'),
  ],
  happy: [
    require('../../assets/images/characters/emotes/emote_happy_01.png'),
    require('../../assets/images/characters/emotes/emote_happy_02.png'),
    require('../../assets/images/characters/emotes/emote_happy_03.png'),
    require('../../assets/images/characters/emotes/emote_happy_04.png'),
    require('../../assets/images/characters/emotes/emote_happy_05.png'),
    require('../../assets/images/characters/emotes/emote_happy_06.png'),
    require('../../assets/images/characters/emotes/emote_happy_07.png'),
    require('../../assets/images/characters/emotes/emote_happy_08.png'),
    require('../../assets/images/characters/emotes/emote_happy_09.png'),
    require('../../assets/images/characters/emotes/emote_happy_10.png'),
    require('../../assets/images/characters/emotes/emote_happy_11.png'),
    require('../../assets/images/characters/emotes/emote_happy_12.png'),
    require('../../assets/images/characters/emotes/emote_happy_13.png'),
    require('../../assets/images/characters/emotes/emote_happy_14.png'),
    require('../../assets/images/characters/emotes/emote_happy_15.png'),
    require('../../assets/images/characters/emotes/emote_happy_16.png'),
    require('../../assets/images/characters/emotes/emote_happy_17.png'),
    require('../../assets/images/characters/emotes/emote_happy_18.png'),
    require('../../assets/images/characters/emotes/emote_happy_19.png'),
    require('../../assets/images/characters/emotes/emote_happy_20.png'),
    require('../../assets/images/characters/emotes/emote_happy_21.png'),
    require('../../assets/images/characters/emotes/emote_happy_22.png'),
    require('../../assets/images/characters/emotes/emote_happy_23.png'),
    require('../../assets/images/characters/emotes/emote_happy_24.png'),
  ],
  sad: [
    require('../../assets/images/characters/emotes/emote_sad_01.png'),
    require('../../assets/images/characters/emotes/emote_sad_02.png'),
    require('../../assets/images/characters/emotes/emote_sad_03.png'),
    require('../../assets/images/characters/emotes/emote_sad_04.png'),
    require('../../assets/images/characters/emotes/emote_sad_05.png'),
    require('../../assets/images/characters/emotes/emote_sad_06.png'),
    require('../../assets/images/characters/emotes/emote_sad_07.png'),
    require('../../assets/images/characters/emotes/emote_sad_08.png'),
    require('../../assets/images/characters/emotes/emote_sad_09.png'),
    require('../../assets/images/characters/emotes/emote_sad_10.png'),
    require('../../assets/images/characters/emotes/emote_sad_11.png'),
    require('../../assets/images/characters/emotes/emote_sad_12.png'),
    require('../../assets/images/characters/emotes/emote_sad_13.png'),
    require('../../assets/images/characters/emotes/emote_sad_14.png'),
    require('../../assets/images/characters/emotes/emote_sad_15.png'),
    require('../../assets/images/characters/emotes/emote_sad_16.png'),
    require('../../assets/images/characters/emotes/emote_sad_17.png'),
    require('../../assets/images/characters/emotes/emote_sad_18.png'),
    require('../../assets/images/characters/emotes/emote_sad_19.png'),
    require('../../assets/images/characters/emotes/emote_sad_20.png'),
    require('../../assets/images/characters/emotes/emote_sad_21.png'),
    require('../../assets/images/characters/emotes/emote_sad_22.png'),
    require('../../assets/images/characters/emotes/emote_sad_23.png'),
    require('../../assets/images/characters/emotes/emote_sad_24.png'),
  ],
  angry: [
    require('../../assets/images/characters/emotes/emote_angry_01.png'),
    require('../../assets/images/characters/emotes/emote_angry_02.png'),
    require('../../assets/images/characters/emotes/emote_angry_03.png'),
    require('../../assets/images/characters/emotes/emote_angry_04.png'),
    require('../../assets/images/characters/emotes/emote_angry_05.png'),
    require('../../assets/images/characters/emotes/emote_angry_06.png'),
    require('../../assets/images/characters/emotes/emote_angry_07.png'),
    require('../../assets/images/characters/emotes/emote_angry_08.png'),
    require('../../assets/images/characters/emotes/emote_angry_09.png'),
    require('../../assets/images/characters/emotes/emote_angry_10.png'),
    require('../../assets/images/characters/emotes/emote_angry_11.png'),
    require('../../assets/images/characters/emotes/emote_angry_12.png'),
    require('../../assets/images/characters/emotes/emote_angry_13.png'),
    require('../../assets/images/characters/emotes/emote_angry_14.png'),
    require('../../assets/images/characters/emotes/emote_angry_15.png'),
    require('../../assets/images/characters/emotes/emote_angry_16.png'),
    require('../../assets/images/characters/emotes/emote_angry_17.png'),
    require('../../assets/images/characters/emotes/emote_angry_18.png'),
    require('../../assets/images/characters/emotes/emote_angry_19.png'),
    require('../../assets/images/characters/emotes/emote_angry_20.png'),
    require('../../assets/images/characters/emotes/emote_angry_21.png'),
    require('../../assets/images/characters/emotes/emote_angry_22.png'),
    require('../../assets/images/characters/emotes/emote_angry_23.png'),
    require('../../assets/images/characters/emotes/emote_angry_24.png'),
  ],
  celebrate: [
    require('../../assets/images/characters/emotes/emote_celebrate_01.png'),
    require('../../assets/images/characters/emotes/emote_celebrate_02.png'),
    require('../../assets/images/characters/emotes/emote_celebrate_03.png'),
    require('../../assets/images/characters/emotes/emote_celebrate_04.png'),
    require('../../assets/images/characters/emotes/emote_celebrate_05.png'),
    require('../../assets/images/characters/emotes/emote_celebrate_06.png'),
    require('../../assets/images/characters/emotes/emote_celebrate_07.png'),
    require('../../assets/images/characters/emotes/emote_celebrate_08.png'),
    require('../../assets/images/characters/emotes/emote_celebrate_09.png'),
    require('../../assets/images/characters/emotes/emote_celebrate_10.png'),
    require('../../assets/images/characters/emotes/emote_celebrate_11.png'),
    require('../../assets/images/characters/emotes/emote_celebrate_12.png'),
    require('../../assets/images/characters/emotes/emote_celebrate_13.png'),
    require('../../assets/images/characters/emotes/emote_celebrate_14.png'),
    require('../../assets/images/characters/emotes/emote_celebrate_15.png'),
    require('../../assets/images/characters/emotes/emote_celebrate_16.png'),
    require('../../assets/images/characters/emotes/emote_celebrate_17.png'),
    require('../../assets/images/characters/emotes/emote_celebrate_18.png'),
    require('../../assets/images/characters/emotes/emote_celebrate_19.png'),
    require('../../assets/images/characters/emotes/emote_celebrate_20.png'),
    require('../../assets/images/characters/emotes/emote_celebrate_21.png'),
    require('../../assets/images/characters/emotes/emote_celebrate_22.png'),
    require('../../assets/images/characters/emotes/emote_celebrate_23.png'),
    require('../../assets/images/characters/emotes/emote_celebrate_24.png'),
  ],
};

// ═══════════════════════════
// POSE IMAGES (static holds)
// ═══════════════════════════

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

// ═══════════════════
// TIMING — 24fps film-smooth
// ═══════════════════

const IDLE_INTERVAL = 100;   // 100ms per frame — smooth idle breathing
const EMOTE_INTERVAL = 42;   // 42ms per frame — 24fps film-smooth emotes

// ═══════════════════
// COMPONENT
// ═══════════════════

interface AnimatedCharacterProps {
  size?: number;
  emote?: EmoteId | null;
  pose?: PoseId;
  onEmoteComplete?: () => void;
  style?: any;
}

export function AnimatedCharacter({
  size = 300,
  emote = null,
  pose = 'default',
  onEmoteComplete,
  style,
}: AnimatedCharacterProps) {
  const [currentFrame, setCurrentFrame] = useState(0);
  const [activeEmote, setActiveEmote] = useState<EmoteId | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const frameRef = useRef(0);

  // Handle emote trigger
  useEffect(() => {
    if (emote && emote !== 'idle' && EMOTE_FRAMES[emote]) {
      setActiveEmote(emote);
      frameRef.current = 0;
      setCurrentFrame(0);
    }
  }, [emote]);

  // Animation loop
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    // If playing an emote, animate through emote frames
    if (activeEmote) {
      const frames = EMOTE_FRAMES[activeEmote];
      const frameCount = frames.length;

      intervalRef.current = setInterval(() => {
        frameRef.current += 1;

        if (frameRef.current >= frameCount) {
          // Emote done — return to idle/pose
          setActiveEmote(null);
          frameRef.current = 0;
          setCurrentFrame(0);
          onEmoteComplete?.();
          return;
        }

        setCurrentFrame(frameRef.current);
      }, EMOTE_INTERVAL);
    } else {
      // Idle breathing loop
      const idleFrames = EMOTE_FRAMES.idle;
      intervalRef.current = setInterval(() => {
        frameRef.current = (frameRef.current + 1) % idleFrames.length;
        setCurrentFrame(frameRef.current);
      }, IDLE_INTERVAL);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [activeEmote]);

  // Get current frames array and index
  const currentFrames = activeEmote ? (EMOTE_FRAMES[activeEmote] || EMOTE_FRAMES.idle) : EMOTE_FRAMES.idle;
  const frameIndex = currentFrame % currentFrames.length;

  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      {/* Render ALL idle frames stacked, toggle visibility via opacity.
          This prevents the flash caused by Image source swapping. */}
      {!activeEmote && EMOTE_FRAMES.idle.map((source, i) => (
        <Image
          key={`idle_${i}`}
          source={source}
          style={[styles.characterImage, styles.stackedFrame, { opacity: i === frameIndex ? 1 : 0 }]}
          resizeMode="contain"
        />
      ))}

      {/* For emotes, use single Image since they play once (flash is less noticeable) */}
      {activeEmote && (
        <Image
          source={currentFrames[frameIndex] || currentFrames[0]}
          style={[styles.characterImage, styles.stackedFrame]}
          resizeMode="contain"
        />
      )}
    </View>
  );
}

// ═══════════════════
// POSE DISPLAY (static, for profile/character screen)
// ═══════════════════

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

// ═══════════════════
// HOOKS
// ═══════════════════

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

export { POSE_IMAGES };

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
  stackedFrame: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});
