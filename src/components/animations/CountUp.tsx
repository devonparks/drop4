/**
 * CountUp — Animated number counter.
 *
 * Smoothly animates from 0 (or a previous value) to the target number.
 * Perfect for coin balances, XP bars, stat displays, level numbers.
 *
 * Usage:
 *   <CountUp value={2430} style={styles.coinValue} prefix="🪙 " />
 *   <CountUp value={85} suffix="%" duration={800} />
 */
import React, { useEffect } from 'react';
import { TextStyle, StyleProp } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { TextInput } from 'react-native';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

interface Props {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  style?: StyleProp<TextStyle>;
  formatter?: (n: number) => string;
}

export function CountUp({
  value,
  duration = 600,
  prefix = '',
  suffix = '',
  style,
  formatter,
}: Props) {
  const animatedValue = useSharedValue(0);

  useEffect(() => {
    animatedValue.value = withTiming(value, {
      duration,
      easing: Easing.out(Easing.cubic),
    });
  }, [value]);

  const animatedProps = useAnimatedProps(() => {
    const current = Math.round(animatedValue.value);
    const formatted = formatter
      ? formatter(current)
      : current.toLocaleString();
    return {
      text: `${prefix}${formatted}${suffix}`,
      defaultValue: `${prefix}${formatted}${suffix}`,
    };
  });

  return (
    <AnimatedTextInput
      underlineColorAndroid="transparent"
      editable={false}
      animatedProps={animatedProps}
      style={[
        {
          color: '#ffffff',
          padding: 0,
          // TextInput defaults — override with style prop
        },
        style,
      ]}
    />
  );
}
