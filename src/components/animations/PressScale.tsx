/**
 * PressScale — Tactile press feedback.
 *
 * Wraps any child in a Pressable that scales down on press-in
 * and bounces back on release. Uses Reanimated 3 for 60fps native
 * thread animation. Triggers haptic tap on press.
 *
 * Usage:
 *   <PressScale onPress={handleTap}>
 *     <GlossyButton label="PLAY" />
 *   </PressScale>
 *
 * Props:
 *   scaleTo     — how small it gets (default 0.95)
 *   overshoot   — bounce overshoot on release (default 1.02)
 *   disabled    — pass-through disable
 *   onPress     — tap handler
 *   style       — container style
 */
import React from 'react';
import { Pressable, ViewStyle, StyleProp, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from 'react-native-reanimated';
import { haptics } from '../../services/haptics';

interface Props {
  children: React.ReactNode;
  onPress?: () => void;
  scaleTo?: number;
  overshoot?: number;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  noHaptics?: boolean;
}

export function PressScale({
  children,
  onPress,
  scaleTo = 0.95,
  overshoot = 1.02,
  disabled = false,
  style,
  noHaptics = false,
}: Props) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (!noHaptics) haptics.tap();
    scale.value = withSpring(scaleTo, { damping: 15, stiffness: 400 });
  };

  const handlePressOut = () => {
    // Bounce: overshoot slightly then settle
    scale.value = withSequence(
      withSpring(overshoot, { damping: 8, stiffness: 500 }),
      withSpring(1, { damping: 12, stiffness: 200 }),
    );
  };

  // Web onClick fallback — Pressable inside complex layouts
  // (gradients, Animated.Views) sometimes drops touch events on web.
  const webClickProps = Platform.OS === 'web' && !disabled
    ? { onClick: () => { if (!noHaptics) haptics.tap(); onPress?.(); } }
    : {};

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      disabled={disabled}
      {...(webClickProps as any)}
    >
      <Animated.View style={[style, animStyle]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}
