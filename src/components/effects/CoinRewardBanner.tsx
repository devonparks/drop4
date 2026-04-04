import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeOut, SlideInUp } from 'react-native-reanimated';
import { colors } from '../../theme/colors';
import { fonts, weight } from '../../theme/typography';

interface CoinRewardBannerProps {
  amount: number;
  visible: boolean;
  onDone?: () => void;
}

export function CoinRewardBanner({ amount, visible, onDone }: CoinRewardBannerProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (visible && amount > 0) {
      setShow(true);
      const timer = setTimeout(() => {
        setShow(false);
        onDone?.();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [visible, amount]);

  if (!show) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      <Animated.View entering={SlideInUp.springify().damping(12)} exiting={FadeOut} style={styles.banner}>
        <Text style={styles.coinEmoji}>🪙</Text>
        <Text style={styles.amount}>+{amount}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 200,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(241,196,15,0.2)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(241,196,15,0.4)',
  },
  coinEmoji: { fontSize: 20 },
  amount: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 18,
    color: colors.coinGold,
  },
});
