import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, withSpring, useSharedValue, withRepeat, withSequence } from 'react-native-reanimated';
import { colors } from '../../theme/colors';
import { fonts, weight } from '../../theme/typography';

interface PlayerHUDProps {
  name: string;
  avatar: string;
  level: number;
  pieceColor: 'red' | 'yellow';
  score: number;
  isActive: boolean;
  side: 'left' | 'right';
}

export function PlayerHUD({ name, avatar, level, pieceColor, score, isActive, side }: PlayerHUDProps) {
  const pulseScale = useSharedValue(1);

  React.useEffect(() => {
    if (isActive) {
      pulseScale.value = withRepeat(
        withSequence(
          withSpring(1.05, { damping: 10, stiffness: 100 }),
          withSpring(1, { damping: 10, stiffness: 100 })
        ),
        -1,
        true
      );
    } else {
      pulseScale.value = withSpring(1);
    }
  }, [isActive]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const borderColor = pieceColor === 'red' ? colors.pieceRed : colors.pieceYellow;
  const glowColor = pieceColor === 'red' ? 'rgba(230,57,70,0.6)' : 'rgba(244,166,35,0.6)';

  return (
    <Animated.View style={[styles.container, side === 'right' && styles.containerRight, animStyle]}>
      {/* Avatar with frame */}
      <View style={[
        styles.avatarFrame,
        {
          borderColor: isActive ? borderColor : 'rgba(255,255,255,0.2)',
          shadowColor: isActive ? glowColor : 'transparent',
          shadowOpacity: isActive ? 1 : 0,
        }
      ]}>
        <LinearGradient
          colors={isActive ? ['#2a2a4a', '#1a1a3a'] : ['#1a1a2a', '#101020']}
          style={styles.avatarInner}
        >
          <Text style={styles.avatarEmoji}>{avatar}</Text>
        </LinearGradient>

        {/* Level badge */}
        <View style={[styles.levelBadge, { backgroundColor: borderColor }]}>
          <Text style={styles.levelText}>{level}</Text>
        </View>
      </View>

      {/* Info */}
      <View style={[styles.info, side === 'right' && styles.infoRight]}>
        <Text style={styles.name}>{name}</Text>
        <View style={styles.pieceRow}>
          <Text style={styles.pieceIcon}>
            {pieceColor === 'red' ? '🔴' : '🟡'}
          </Text>
          <Text style={styles.scoreText}>{score}</Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  containerRight: {
    flexDirection: 'row-reverse',
  },
  avatarFrame: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 3,
    padding: 2,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 8,
    elevation: 6,
    position: 'relative',
  },
  avatarInner: {
    width: '100%',
    height: '100%',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: {
    fontSize: 26,
  },
  levelBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#0a0e27',
  },
  levelText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 10,
    color: '#ffffff',
  },
  info: {
    alignItems: 'flex-start',
  },
  infoRight: {
    alignItems: 'flex-end',
  },
  name: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 14,
    color: '#ffffff',
  },
  pieceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pieceIcon: {
    fontSize: 12,
  },
  scoreText: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
});
