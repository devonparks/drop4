/**
 * PulseGlow — Pulsing glow ring for attention-grabbing elements.
 *
 * Renders an animated glow behind the child that pulses in opacity
 * and scale. Use on: claim buttons, claimable rewards, new unlocks,
 * active challenges.
 *
 * Usage:
 *   <PulseGlow color="#27ae3d" size={60} active={canClaim}>
 *     <ClaimButton />
 *   </PulseGlow>
 */
import React, { useEffect } from 'react';
import { View, ViewStyle, StyleProp } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated';

interface Props {
  children: React.ReactNode;
  color?: string;
  size?: number;
  active?: boolean;
  intensity?: number; // 0-1, default 0.5
  speed?: number; // ms per pulse cycle, default 1500
  style?: StyleProp<ViewStyle>;
}

export function PulseGlow({
  children,
  color = '#ff8c00',
  size = 50,
  active = true,
  intensity = 0.5,
  speed = 1500,
  style,
}: Props) {
  const glowOpacity = useSharedValue(0);
  const glowScale = useSharedValue(1);

  useEffect(() => {
    if (active) {
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(intensity, { duration: speed / 2 }),
          withTiming(intensity * 0.3, { duration: speed / 2 }),
        ),
        -1,
        true,
      );
      glowScale.value = withRepeat(
        withSequence(
          withTiming(1.15, { duration: speed / 2 }),
          withTiming(1, { duration: speed / 2 }),
        ),
        -1,
        true,
      );
    } else {
      cancelAnimation(glowOpacity);
      cancelAnimation(glowScale);
      glowOpacity.value = withTiming(0, { duration: 200 });
      glowScale.value = withTiming(1, { duration: 200 });
    }
  }, [active]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: glowScale.value }],
  }));

  return (
    <View style={[{ alignItems: 'center', justifyContent: 'center' }, style]}>
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            width: size * 1.6,
            height: size * 1.6,
            borderRadius: size * 0.8,
            backgroundColor: color,
          },
          glowStyle,
        ]}
      />
      {children}
    </View>
  );
}
