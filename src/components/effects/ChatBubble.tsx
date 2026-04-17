import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { fonts, weight } from '../../theme/typography';

interface ChatBubbleProps {
  text: string;
  senderName: string;
  side: 'left' | 'right';
  visible: boolean;
  onDone: () => void;
}

/**
 * Floating speech bubble that appears above the board.
 * Springs in with scale, floats for 3 seconds, then fades out.
 * Positioned on left or right side depending on sender.
 */
export function ChatBubble({ text, senderName, side, visible, onDone }: ChatBubbleProps) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.3);
  const translateY = useSharedValue(10);

  useEffect(() => {
    if (!visible) return;

    // Spring in
    opacity.value = withTiming(1, { duration: 150, easing: Easing.out(Easing.ease) });
    scale.value = withSpring(1, { damping: 12, stiffness: 200, mass: 0.8 });
    translateY.value = withSpring(0, { damping: 14, stiffness: 180 });

    // After 3 seconds, fade out then call onDone
    opacity.value = withDelay(
      2800,
      withTiming(0, { duration: 300, easing: Easing.in(Easing.ease) }, (finished) => {
        if (finished) {
          runOnJS(onDone)();
        }
      })
    );
    translateY.value = withDelay(
      2800,
      withTiming(-8, { duration: 300, easing: Easing.in(Easing.ease) })
    );
  }, [visible]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { scale: scale.value },
      { translateY: translateY.value },
    ],
  }));

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        side === 'left' ? styles.leftSide : styles.rightSide,
        animStyle,
      ]}
      pointerEvents="none"
    >
      {/* Sender name */}
      <Text style={[styles.senderName, side === 'right' && styles.senderNameRight]}>
        {senderName}
      </Text>

      {/* Bubble */}
      <View style={[styles.bubble, side === 'right' && styles.bubbleRight]}>
        <Text style={styles.bubbleText}>{text}</Text>
        {/* Chat tail */}
        <View style={[styles.tail, side === 'right' ? styles.tailRight : styles.tailLeft]} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    zIndex: 200,
    maxWidth: 200,
  },
  leftSide: {
    left: 12,
    alignItems: 'flex-start',
  },
  rightSide: {
    right: 12,
    alignItems: 'flex-end',
  },
  senderName: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 0.5,
    marginBottom: 3,
    textTransform: 'uppercase',
  },
  senderNameRight: {
    textAlign: 'right',
  },
  bubble: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderTopLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
    position: 'relative',
  },
  bubbleRight: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 4,
  },
  bubbleText: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 15,
    color: '#1a1a2e',
    letterSpacing: 0.2,
  },
  tail: {
    position: 'absolute',
    bottom: -6,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#ffffff',
  },
  tailLeft: {
    left: 10,
  },
  tailRight: {
    right: 10,
  },
});
