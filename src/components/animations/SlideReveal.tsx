/**
 * SlideReveal — Slide-in from any direction on mount.
 *
 * Simple mounting animation with configurable direction and spring physics.
 * Use for modals, bottom sheets, section headers, toast notifications.
 *
 * Usage:
 *   <SlideReveal from="bottom" delay={200}>
 *     <BottomSheet />
 *   </SlideReveal>
 */
import React from 'react';
import { ViewStyle, StyleProp } from 'react-native';
import Animated, {
  FadeInDown,
  FadeInUp,
  FadeInLeft,
  FadeInRight,
  SlideInDown,
  SlideInUp,
  SlideInLeft,
  SlideInRight,
} from 'react-native-reanimated';

type Direction = 'top' | 'bottom' | 'left' | 'right';

interface Props {
  children: React.ReactNode;
  from?: Direction;
  delay?: number;
  fade?: boolean; // true = fade+slide, false = slide only
  style?: StyleProp<ViewStyle>;
}

export function SlideReveal({
  children,
  from = 'bottom',
  delay = 0,
  fade = true,
  style,
}: Props) {
  const enteringMap = fade
    ? {
        top: FadeInUp.delay(delay).springify().damping(14),
        bottom: FadeInDown.delay(delay).springify().damping(14),
        left: FadeInLeft.delay(delay).springify().damping(14),
        right: FadeInRight.delay(delay).springify().damping(14),
      }
    : {
        top: SlideInUp.delay(delay).springify().damping(14),
        bottom: SlideInDown.delay(delay).springify().damping(14),
        left: SlideInLeft.delay(delay).springify().damping(14),
        right: SlideInRight.delay(delay).springify().damping(14),
      };

  return (
    <Animated.View entering={enteringMap[from]} style={style}>
      {children}
    </Animated.View>
  );
}
