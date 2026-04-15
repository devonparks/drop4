/**
 * Shimmer — Sweeping highlight effect for premium/gold elements.
 *
 * Renders a diagonal light streak that sweeps across the child.
 * Perfect for coin displays, equipped badges, legendary items, CTAs.
 *
 * Usage:
 *   <Shimmer color="rgba(255,215,0,0.3)" duration={2500}>
 *     <View style={styles.coinDisplay}>...</View>
 *   </Shimmer>
 */
import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

interface Props {
  children: React.ReactNode;
  color?: string;
  duration?: number;
  delay?: number;
  width?: number; // shimmer band width as % of container (default 40)
  style?: StyleProp<ViewStyle>;
  paused?: boolean;
}

export function Shimmer({
  children,
  color = 'rgba(255,255,255,0.15)',
  duration = 2800,
  delay: initialDelay = 0,
  width: bandWidth = 40,
  style,
  paused = false,
}: Props) {
  const translateX = useSharedValue(-bandWidth * 2);

  useEffect(() => {
    if (paused) return;
    translateX.value = withDelay(
      initialDelay,
      withRepeat(
        withTiming(100 + bandWidth, { duration, easing: Easing.inOut(Easing.ease) }),
        -1, // infinite
        false,
      ),
    );
  }, [paused]);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: `${translateX.value}%` as any }],
  }));

  return (
    <View style={[{ overflow: 'hidden', position: 'relative' }, style]}>
      {children}
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { width: `${bandWidth}%` },
          shimmerStyle,
        ]}
      >
        <LinearGradient
          colors={['transparent', color, 'transparent']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}
