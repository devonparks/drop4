/**
 * CountUp — animate an integer from 0 (or a starting value) to a target.
 *
 * Used at match-end so the coin reward HITS like a slot-machine roll-up
 * instead of just snapping to a static number. ~800ms cubic-easeOut by
 * default; the math feels good (fast at start, slow at end).
 *
 * Usage:
 *   <CountUp value={totalCoinsEarned} style={styles.goTotalCoinsAmount} prefix="+" />
 *
 * Props:
 *   value     — the final number to land on
 *   from      — start value (default 0)
 *   duration  — ms (default 800)
 *   prefix    — prepended to the number (e.g. "+" for rewards)
 *   suffix    — appended (e.g. " XP")
 *   style     — passed through to the inner <Text>
 *
 * Note: useNativeDriver=false because we're animating a Text value
 * which the native driver can't touch. The animation runs on the JS
 * thread for ~800ms — short enough that frame drops are not a concern.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Text, TextStyle, StyleProp } from 'react-native';

interface Props {
  value: number;
  from?: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  style?: StyleProp<TextStyle>;
  /** When true, the animation re-fires on every value change. Default
   *  fires once on mount; subsequent changes snap. Match-end rewards
   *  appear once and don't change, so the default is what you want. */
  retriggerOnChange?: boolean;
}

export function CountUp({
  value,
  from = 0,
  duration = 800,
  prefix = '',
  suffix = '',
  style,
  retriggerOnChange = false,
}: Props) {
  const anim = useRef(new Animated.Value(from)).current;
  const [display, setDisplay] = useState(from);
  const lastValue = useRef<number | null>(null);

  useEffect(() => {
    // Only run once per value, unless retriggerOnChange is set.
    if (!retriggerOnChange && lastValue.current === value) return;
    lastValue.current = value;

    const listener = anim.addListener(({ value: v }) => {
      setDisplay(Math.round(v));
    });
    anim.setValue(from);
    Animated.timing(anim, {
      toValue: value,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    return () => anim.removeListener(listener);
  }, [value, from, duration, retriggerOnChange, anim]);

  return <Text style={style}>{prefix}{display}{suffix}</Text>;
}
