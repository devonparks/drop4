import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeOut, SlideInRight } from 'react-native-reanimated';
import { playSound } from '../../services/audio';
import { haptics } from '../../services/haptics';
import { colors } from '../../theme/colors';
import { fonts, weight } from '../../theme/typography';

interface AchievementToastProps {
  name: string;
  icon?: string;
  visible: boolean;
  onDone?: () => void;
}

export function AchievementToast({ name, icon = '🏆', visible, onDone }: AchievementToastProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (visible && name) {
      setShow(true);
      playSound('achievement');
      haptics.achievement();
      const timer = setTimeout(() => {
        setShow(false);
        onDone?.();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [visible, name]);

  if (!show) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      <Animated.View
        entering={SlideInRight.springify()}
        exiting={FadeOut}
        style={styles.toast}
        accessible
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        accessibilityLabel={`Achievement unlocked: ${name}`}
      >
        <Text style={styles.icon}>{icon}</Text>
        <View>
          <Text style={styles.label}>ACHIEVEMENT UNLOCKED</Text>
          <Text style={styles.name}>{name}</Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 80,
    right: 0,
    zIndex: 300,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(241,196,15,0.15)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(241,196,15,0.3)',
    shadowColor: colors.coinGold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  icon: { fontSize: 28 },
  label: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 8,
    color: colors.coinGold,
    letterSpacing: 1,
  },
  name: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 14,
    color: '#ffffff',
    marginTop: 1,
  },
});
