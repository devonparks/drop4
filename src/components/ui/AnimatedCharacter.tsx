import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Image, StyleSheet, ImageSourcePropType } from 'react-native';

export type EmoteId = 'idle' | 'thumbsup' | 'wave' | 'dab' | 'dance' | 'happy' | 'sad' | 'angry' | 'celebrate';

// All frame sources must be statically required for React Native bundler
const EMOTE_FRAMES: Record<EmoteId, ImageSourcePropType[]> = {
  idle: [
    require('../../assets/images/characters/emotes/idle_01.png'),
    require('../../assets/images/characters/emotes/idle_02.png'),
    require('../../assets/images/characters/emotes/idle_03.png'),
    require('../../assets/images/characters/emotes/idle_04.png'),
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
  ],
};

const IDLE_INTERVAL = 300;  // 300ms per frame = ~3.3fps idle breathing
const EMOTE_INTERVAL = 120; // 120ms per frame = ~8fps emote playback

interface AnimatedCharacterProps {
  size?: number;
  emote?: EmoteId | null;
  onEmoteComplete?: () => void;
  style?: any;
}

export function AnimatedCharacter({
  size = 300,
  emote = null,
  onEmoteComplete,
  style,
}: AnimatedCharacterProps) {
  const [currentFrame, setCurrentFrame] = useState(0);
  const [activeEmote, setActiveEmote] = useState<EmoteId>('idle');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const frameRef = useRef(0);

  // Get frames for current animation
  const frames = EMOTE_FRAMES[activeEmote] || EMOTE_FRAMES.idle;

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

    const interval = activeEmote === 'idle' ? IDLE_INTERVAL : EMOTE_INTERVAL;
    const frameCount = frames.length;

    intervalRef.current = setInterval(() => {
      frameRef.current += 1;

      if (activeEmote !== 'idle' && frameRef.current >= frameCount) {
        // Emote finished — return to idle
        setActiveEmote('idle');
        frameRef.current = 0;
        setCurrentFrame(0);
        onEmoteComplete?.();
        return;
      }

      setCurrentFrame(frameRef.current % frameCount);
    }, interval);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [activeEmote, frames.length]);

  const source = frames[currentFrame] || frames[0];

  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      <Image
        source={source}
        style={styles.characterImage}
        resizeMode="contain"
      />
    </View>
  );
}

// Hook for external emote triggering
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
