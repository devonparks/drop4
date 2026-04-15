/**
 * BreathingView — Gentle scale pulse for idle attention-grab.
 *
 * A subtle, slow breathing animation that draws the eye without
 * being distracting. Use on: character on home screen, logo,
 * daily reward icon, anything that needs passive attention.
 *
 * Usage:
 *   <BreathingView intensity={0.03} speed={3000}>
 *     <AnimatedCharacter />
 *   </BreathingView>
 */
import React, { useEffect } from 'react';
import { ViewStyle, StyleProp } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';

interface Props {
  children: React.ReactNode;
  intensity?: number; // scale delta, default 0.02 (subtle)
  speed?: number;     // ms per full breath cycle, default 3000
  active?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function BreathingView({
  children,
  intensity = 0.02,
  speed = 3000,
  active = true,
  style,
}: Props) {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (active) {
      scale.value = withRepeat(
        withSequence(
          withTiming(1 + intensity, { duration: speed / 2, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: speed / 2, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
    } else {
      scale.value = withTiming(1, { duration: 300 });
    }
  }, [active, intensity, speed]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[style, animStyle]}>
      {children}
    </Animated.View>
  );
}
