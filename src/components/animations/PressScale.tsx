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
import { Pressable, ViewStyle, StyleProp, Platform, AccessibilityState, Insets } from 'react-native';
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
  /** Style applied to the inner Animated.View (scales with the press). */
  style?: StyleProp<ViewStyle>;
  /**
   * Style applied to the outer Pressable. Use when the touch surface needs
   * absolute positioning, hitSlop area, or layout the scale animation
   * shouldn't affect (e.g. snake-pattern node placement in CareerCity).
   */
  containerStyle?: StyleProp<ViewStyle>;
  /** Extra tap tolerance around the visual node. */
  hitSlop?: number | Insets;
  noHaptics?: boolean;
  /** Screen-reader label. Strongly recommended — PressScale wraps most tappable UI. */
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: 'button' | 'link' | 'tab' | 'menuitem';
  /** Extra a11y state flags (selected, checked, busy). `disabled` is auto-merged from props. */
  accessibilityState?: AccessibilityState;
}

export function PressScale({
  children,
  onPress,
  scaleTo = 0.95,
  overshoot = 1.02,
  disabled = false,
  style,
  containerStyle,
  hitSlop,
  noHaptics = false,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole = 'button',
  accessibilityState,
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
      hitSlop={hitSlop}
      style={containerStyle}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ ...accessibilityState, disabled: !!disabled }}
      {...(webClickProps as any)}
    >
      <Animated.View style={[style, animStyle]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}
