/**
 * StaggeredEntry — Staggered fade-in-up for lists and grids.
 *
 * Wrap each item in a list/grid. Each item fades in and slides up
 * with a delay based on its index. Creates a cascading reveal effect.
 *
 * Usage:
 *   {items.map((item, i) => (
 *     <StaggeredEntry key={item.id} index={i}>
 *       <ItemCard item={item} />
 *     </StaggeredEntry>
 *   ))}
 */
import React from 'react';
import { ViewStyle, StyleProp } from 'react-native';
import Animated, { FadeInDown, FadeInUp, FadeInLeft, FadeInRight } from 'react-native-reanimated';

type Direction = 'up' | 'down' | 'left' | 'right';

interface Props {
  children: React.ReactNode;
  index: number;
  delay?: number;    // ms between each item (default 50)
  distance?: number; // slide distance in px (default 15)
  direction?: Direction;
  style?: StyleProp<ViewStyle>;
}

const ENTERING_MAP = {
  up: (delay: number, distance: number) =>
    FadeInDown.delay(delay).springify().damping(14).stiffness(120),
  down: (delay: number, distance: number) =>
    FadeInUp.delay(delay).springify().damping(14).stiffness(120),
  left: (delay: number, distance: number) =>
    FadeInRight.delay(delay).springify().damping(14).stiffness(120),
  right: (delay: number, distance: number) =>
    FadeInLeft.delay(delay).springify().damping(14).stiffness(120),
};

export function StaggeredEntry({
  children,
  index,
  delay = 50,
  distance = 15,
  direction = 'up',
  style,
}: Props) {
  const totalDelay = index * delay;
  const entering = ENTERING_MAP[direction](totalDelay, distance);

  return (
    <Animated.View entering={entering} style={style}>
      {children}
    </Animated.View>
  );
}
