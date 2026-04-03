import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Image, StyleSheet, ImageSourcePropType } from 'react-native';

export type EmoteId = 'idle' | 'thumbsup' | 'wave' | 'dab' | 'dance' | 'happy' | 'sad' | 'angry' | 'celebrate';

// Static image sources — until emote sprite sheets arrive from Unity,
// we use the single idle frame. When emote frames are exported, add them here.
const EMOTE_FRAMES: Record<EmoteId, ImageSourcePropType[]> = {
  idle: [
    require('../../assets/images/characters/player_idle.png'),
    // When idle frames are exported: idle_01.png, idle_02.png, idle_03.png, idle_04.png
  ],
  thumbsup: [require('../../assets/images/characters/player_idle.png')],
  wave: [require('../../assets/images/characters/player_idle.png')],
  dab: [require('../../assets/images/characters/player_idle.png')],
  dance: [require('../../assets/images/characters/player_idle.png')],
  happy: [require('../../assets/images/characters/player_idle.png')],
  sad: [require('../../assets/images/characters/player_idle.png')],
  angry: [require('../../assets/images/characters/player_idle.png')],
  celebrate: [require('../../assets/images/characters/player_idle.png')],
};

const IDLE_FPS = 4;
const EMOTE_FPS = 12;

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

  // Get frames for current animation
  const frames = EMOTE_FRAMES[activeEmote] || EMOTE_FRAMES.idle;

  // Handle emote trigger
  useEffect(() => {
    if (emote && emote !== 'idle' && EMOTE_FRAMES[emote]) {
      setActiveEmote(emote);
      setCurrentFrame(0);
    }
  }, [emote]);

  // Animation loop
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    const fps = activeEmote === 'idle' ? IDLE_FPS : EMOTE_FPS;
    const frameCount = frames.length;

    if (frameCount <= 1) {
      // Single frame — no animation needed
      setCurrentFrame(0);
      return;
    }

    intervalRef.current = setInterval(() => {
      setCurrentFrame(prev => {
        const next = prev + 1;

        if (activeEmote !== 'idle' && next >= frameCount) {
          // Emote finished — return to idle
          setActiveEmote('idle');
          onEmoteComplete?.();
          return 0;
        }

        // Loop for idle, advance for emotes
        return next % frameCount;
      });
    }, 1000 / fps);

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

// Trigger function for external use
export function useEmoteTrigger() {
  const [emote, setEmote] = useState<EmoteId | null>(null);

  const triggerEmote = useCallback((id: EmoteId) => {
    setEmote(null); // Reset first to re-trigger same emote
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
