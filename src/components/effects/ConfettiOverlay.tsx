import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CONFETTI_COUNT = 30;
const CONFETTI_COLORS = ['#f1c40f', '#e74c3c', '#3498db', '#2ecc71', '#9b59b6', '#ff8c00', '#e84393', '#00cec9'];
const CONFETTI_EMOJIS = ['🎉', '✨', '⭐', '🌟', '💫', '🪙'];

function ConfettiPiece({ delay, index }: { delay: number; index: number }) {
  const translateY = useSharedValue(-50);
  const translateX = useSharedValue(0);
  const rotate = useSharedValue(0);
  const opacity = useSharedValue(1);

  const startX = Math.random() * SCREEN_WIDTH;
  const endX = startX + (Math.random() - 0.5) * 100;
  const color = CONFETTI_COLORS[index % CONFETTI_COLORS.length];
  const isEmoji = Math.random() > 0.6;
  const emoji = CONFETTI_EMOJIS[Math.floor(Math.random() * CONFETTI_EMOJIS.length)];
  const size = 6 + Math.random() * 8;

  useEffect(() => {
    translateY.value = withDelay(delay,
      withTiming(SCREEN_HEIGHT + 50, { duration: 2000 + Math.random() * 1500, easing: Easing.out(Easing.quad) })
    );
    translateX.value = withDelay(delay,
      withTiming(endX - startX, { duration: 2500 })
    );
    rotate.value = withDelay(delay,
      withTiming(360 * (2 + Math.random() * 3), { duration: 2500 })
    );
    opacity.value = withDelay(delay + 1500,
      withTiming(0, { duration: 1000 })
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { translateX: translateX.value },
      { rotate: `${rotate.value}deg` },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.piece, { left: startX }, animStyle]}>
      {isEmoji ? (
        <Text style={{ fontSize: size + 4 }}>{emoji}</Text>
      ) : (
        <View style={[styles.confettiRect, { width: size, height: size * 1.5, backgroundColor: color }]} />
      )}
    </Animated.View>
  );
}

interface ConfettiOverlayProps {
  visible: boolean;
  onDone?: () => void;
}

export function ConfettiOverlay({ visible, onDone }: ConfettiOverlayProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (visible) {
      setShow(true);
      const timer = setTimeout(() => {
        setShow(false);
        onDone?.();
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (!show) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {Array.from({ length: CONFETTI_COUNT }).map((_, i) => (
        <ConfettiPiece key={i} index={i} delay={Math.random() * 500} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 500,
    overflow: 'hidden',
  },
  piece: {
    position: 'absolute',
    top: -20,
  },
  confettiRect: {
    borderRadius: 2,
  },
});
