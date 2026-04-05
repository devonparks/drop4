import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { RANKED_TIERS, RankedTierInfo } from '../../stores/rankedStore';
import { colors } from '../../theme/colors';
import { fonts, weight } from '../../theme/typography';

interface EloChangeAnimationProps {
  eloBefore: number;
  eloAfter: number;
}

function getTierForElo(elo: number): RankedTierInfo {
  for (let i = RANKED_TIERS.length - 1; i >= 0; i--) {
    if (elo >= RANKED_TIERS[i].minElo) return RANKED_TIERS[i];
  }
  return RANKED_TIERS[0];
}

export function EloChangeAnimation({ eloBefore, eloAfter }: EloChangeAnimationProps) {
  const animatedElo = useRef(new Animated.Value(eloBefore)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const displayElo = useRef(eloBefore);

  const change = eloAfter - eloBefore;
  const isGain = change >= 0;
  const changeColor = isGain ? colors.green : colors.pieceRed;
  const changeSign = isGain ? '+' : '';

  const tierBefore = getTierForElo(eloBefore);
  const tierAfter = getTierForElo(eloAfter);
  const tierChanged = tierBefore.id !== tierAfter.id;
  const isPromotion = RANKED_TIERS.indexOf(tierAfter) > RANKED_TIERS.indexOf(tierBefore);

  // Track the interpolated value for display
  const [displayValue, setDisplayValue] = React.useState(eloBefore);

  useEffect(() => {
    // Fade in + scale
    Animated.parallel([
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Animate the counter
    const listenerId = animatedElo.addListener(({ value }) => {
      setDisplayValue(Math.round(value));
    });

    Animated.timing(animatedElo, {
      toValue: eloAfter,
      duration: 1000,
      useNativeDriver: false,
    }).start();

    return () => {
      animatedElo.removeListener(listenerId);
    };
  }, []);

  return (
    <Animated.View style={[
      styles.container,
      {
        opacity: fadeIn,
        transform: [{ scale: scaleAnim }],
        borderColor: `${changeColor}30`,
        backgroundColor: `${changeColor}10`,
      },
    ]}>
      {/* ELO Change Row */}
      <View style={styles.eloRow}>
        <Text style={styles.eloLabel}>ELO</Text>
        <View style={styles.eloNumbers}>
          <Text style={styles.eloBefore}>{eloBefore}</Text>
          <Text style={styles.arrow}>{' \u2192 '}</Text>
          <Text style={[styles.eloAfter, { color: changeColor }]}>{displayValue}</Text>
          <Text style={[styles.eloChange, { color: changeColor }]}>
            {' ('}
            {changeSign}
            {Math.abs(change)}
            {')'}
          </Text>
        </View>
      </View>

      {/* Tier Change Banner */}
      {tierChanged && (
        <View style={[
          styles.tierBanner,
          {
            backgroundColor: `${tierAfter.color}18`,
            borderColor: `${tierAfter.color}40`,
          },
        ]}>
          <Text style={styles.tierIcon}>{tierAfter.icon}</Text>
          <Text style={[styles.tierText, { color: tierAfter.color }]}>
            {isPromotion ? 'PROMOTED' : 'DEMOTED'} to {tierAfter.name}!
          </Text>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  eloRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eloLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.medium,
    fontSize: 14,
    color: colors.textSecondary,
  },
  eloNumbers: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eloBefore: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 16,
    color: colors.textSecondary,
  },
  arrow: {
    fontFamily: fonts.body,
    fontWeight: weight.regular,
    fontSize: 14,
    color: colors.textMuted,
  },
  eloAfter: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 18,
  },
  eloChange: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 14,
  },
  tierBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  tierIcon: {
    fontSize: 18,
  },
  tierText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 13,
    letterSpacing: 1,
  },
});
