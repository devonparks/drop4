import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useRankedStore, RANKED_TIERS, RankedTierInfo, formatRank, getDivisionProgress } from '../../stores/rankedStore';
import { fonts, weight } from '../../theme/typography';
import { colors } from '../../theme/colors';

interface RankBadgeProps {
  /** Size variant */
  size?: 'small' | 'medium' | 'large';
  /** Show the ELO number (default true) */
  showElo?: boolean;
  /** Show tier progress bar toward next tier */
  showProgress?: boolean;
  /** Show division (e.g., "Gold II") for tiers below Master. Default true. */
  showDivision?: boolean;
  /** Override tier info instead of reading from store */
  tierOverride?: RankedTierInfo;
  /** Override ELO instead of reading from store */
  eloOverride?: number;
  /** Additional styles */
  style?: ViewStyle;
}

/**
 * Reusable ranked tier badge in compact pill format.
 * Shows the tier icon, name, and optionally ELO + progress bar.
 * Use across screens to replace inline ranked displays.
 */
export function RankBadge({
  size = 'medium',
  showElo = true,
  showProgress = false,
  showDivision = true,
  tierOverride,
  eloOverride,
  style,
}: RankBadgeProps) {
  const storeElo = useRankedStore(s => s.elo);
  const storeTier = useRankedStore(s => s.tier);
  const storeTierInfo = useMemo(() => {
    return RANKED_TIERS.find(t => t.id === storeTier) || RANKED_TIERS[0];
  }, [storeTier]);

  const tierInfo = tierOverride || storeTierInfo;
  const elo = eloOverride ?? storeElo;

  // Use division-based progress (within current division, not whole tier)
  const progress = useMemo(() => getDivisionProgress(elo), [elo]);

  // Formatted rank with division (e.g., "Gold II" or "Master")
  const displayName = useMemo(() => {
    if (!showDivision) return tierInfo.name;
    return formatRank(elo);
  }, [elo, tierInfo, showDivision]);

  const fontSize = size === 'small' ? 10 : size === 'large' ? 16 : 13;
  const iconSize = size === 'small' ? 14 : size === 'large' ? 24 : 18;
  const padding = size === 'small' ? 4 : size === 'large' ? 10 : 6;
  const gapSize = size === 'small' ? 3 : size === 'large' ? 8 : 5;

  return (
    <View style={[
      styles.container,
      {
        paddingHorizontal: padding + 6,
        paddingVertical: padding,
        borderColor: `${tierInfo.color}40`,
        backgroundColor: `${tierInfo.color}12`,
        gap: gapSize,
      },
      style,
    ]}>
      <Text style={{ fontSize: iconSize }}>{tierInfo.icon}</Text>
      <Text style={[styles.tierName, { fontSize, color: tierInfo.color }]}>{displayName}</Text>
      {showElo && (
        <Text style={[styles.elo, { fontSize: fontSize - 2 }]}>{elo}</Text>
      )}
      {showProgress && (
        <View style={styles.progressWrap}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: tierInfo.color }]} />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
  },
  tierName: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
  },
  elo: {
    fontFamily: fonts.body,
    fontWeight: weight.regular,
    color: colors.textSecondary,
  },
  progressWrap: {
    width: 40,
    marginLeft: 2,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
});
