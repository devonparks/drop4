import React, { useEffect } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  Easing,
  runOnJS,
} from 'react-native-reanimated';

// Map emote IDs to emoji for display
const EMOTE_EMOJI: Record<string, string> = {
  happy: '😄',
  thumbsup: '👍',
  wave: '👋',
  angry: '😤',
  dab: '🕺',
  dance: '💃',
  celebrate: '🎉',
  sad: '😢',
  clapping: '👏',
  laughpoint: '😂',
  shrug: '🤷',
};

interface FloatingEmoteProps {
  emoteId: string;
  /** Which side to show: 'left' for player 1 area, 'right' for player 2 / opponent area */
  side: 'left' | 'right';
  /** Called when the animation finishes so parent can clean up */
  onDone?: () => void;
}

/**
 * Shows an emote emoji that fades in, floats upward, then fades out.
 * Total duration ~2 seconds. Positioned near the opponent's avatar area.
 */
export function FloatingEmote({ emoteId, side, onDone }: FloatingEmoteProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(0.5);

  useEffect(() => {
    // Fade in + scale up (0-300ms)
    opacity.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.ease) });
    scale.value = withSequence(
      withTiming(1.3, { duration: 200, easing: Easing.out(Easing.back(2)) }),
      withTiming(1, { duration: 150 }),
    );

    // Float upward over the full duration (3 seconds)
    translateY.value = withTiming(-60, { duration: 3000, easing: Easing.out(Easing.ease) });

    // Fade out (2400-3000ms), then signal done
    opacity.value = withDelay(2400,
      withTiming(0, { duration: 600 }, (finished) => {
        if (finished && onDone) {
          runOnJS(onDone)();
        }
      })
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const emoji = EMOTE_EMOJI[emoteId] || '😄';

  return (
    <Animated.View
      style={[
        styles.container,
        side === 'left' ? styles.leftSide : styles.rightSide,
        animStyle,
      ]}
      pointerEvents="none"
    >
      <Text style={styles.emoji}>{emoji}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 10,
    zIndex: 100,
    alignItems: 'center',
    justifyContent: 'center',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  leftSide: {
    left: 20,
  },
  rightSide: {
    right: 20,
  },
  emoji: {
    fontSize: 32,
  },
});
