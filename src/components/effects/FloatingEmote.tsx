import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { fonts, weight } from '../../theme/typography';

// Map emote IDs to emoji for display (all 30 emotes + idle)
const EMOTE_EMOJI: Record<string, string> = {
  idle: '😐',
  blowkiss: '😘', callme: '🤙', fingerheart: '🫰', hearthands: '🫶',
  angry: '😤', tantrum: '🤬',
  airguitar: '🎸', beatchest: '🦍', clapping: '👏', dab: '🕺',
  dustshoulder: '😎', fingerguns: '👉',
  dancechestpump: '💃', dancetwist: '🪩', dancerunstep: '🏃',
  wave: '👋', bow: '🙇', salute: '🫡',
  thumbsup: '👍', fistpump: '✊', armsraised: '🙌',
  calmdown: '🤚', shrug: '🤷',
  facepalm: '🤦', crying: '😢', thumbsdown: '👎',
  flexbiceps: '💪', boxing: '🥊',
  laughpoint: '🤣', slowclap: '👏',
};

// Check if a string is a text phrase (not an emoji)
const isPhrase = (s: string) => /^[A-Za-z !?]+$/.test(s);

interface FloatingEmoteProps {
  emoteId?: string;
  /** Raw emoji string — use instead of emoteId for quick reactions */
  rawEmoji?: string;
  /** Which side to show: 'left' for player 1 area, 'right' for player 2 / opponent area */
  side: 'left' | 'right';
  /** Called when the animation finishes so parent can clean up */
  onDone?: () => void;
}

/**
 * Shows an emote/phrase that pops in above the board, floats up, fades out.
 * Positioned centrally for maximum visibility — not hidden in a corner.
 */
export function FloatingEmote({ emoteId, rawEmoji, side, onDone }: FloatingEmoteProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);
  const scale = useSharedValue(0.3);

  useEffect(() => {
    // Pop in → hold → fade out
    opacity.value = withSequence(
      withTiming(1, { duration: 180, easing: Easing.out(Easing.ease) }),
      withDelay(2000,
        withTiming(0, { duration: 500 }, (finished) => {
          if (finished && onDone) {
            runOnJS(onDone)();
          }
        })
      ),
    );

    // Scale: snap up big then settle
    scale.value = withSequence(
      withTiming(1.15, { duration: 180, easing: Easing.out(Easing.back(3)) }),
      withTiming(1, { duration: 120 }),
    );

    // Float upward
    translateY.value = withTiming(-40, { duration: 2700, easing: Easing.out(Easing.ease) });
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const content = rawEmoji || EMOTE_EMOJI[emoteId || ''] || '\u{1F604}';
  const isText = isPhrase(content);

  return (
    <Animated.View
      style={[
        styles.container,
        side === 'left' ? styles.leftPos : styles.rightPos,
        isText && styles.phraseContainer,
        animStyle,
        { pointerEvents: 'none' },
      ]}
    >
      {isText ? (
        <Text style={styles.phraseText}>{content}</Text>
      ) : (
        <Text style={styles.emoji}>{content}</Text>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: '18%',
    zIndex: 150,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    boxShadow: '0px 4px 12px rgba(0,0,0,0.5)',
    elevation: 10,
  },
  phraseContainer: {
    borderRadius: 20,
    paddingHorizontal: 16,
    height: 44,
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderColor: 'rgba(255,140,0,0.3)',
  },
  leftPos: {
    left: '15%',
  },
  rightPos: {
    right: '15%',
  },
  emoji: {
    fontSize: 36,
  },
  phraseText: {
    fontFamily: fonts.heading,
    fontWeight: weight.black as any,
    fontSize: 18,
    color: '#ffffff',
    letterSpacing: 1.5,
    textShadow: '0px 0px 8px rgba(255,140,0,0.6)',
  },
});
