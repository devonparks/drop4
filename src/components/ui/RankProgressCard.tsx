import React, { useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRankedStore, RANKED_TIERS, RankedTierInfo } from '../../stores/rankedStore';
import { colors } from '../../theme/colors';
import { fonts, weight } from '../../theme/typography';

interface RankProgressCardProps {
  /** Show a smaller inline version without the stats row */
  compact?: boolean;
}

export function RankProgressCard({ compact = false }: RankProgressCardProps) {
  const elo = useRankedStore(s => s.elo);
  const tier = useRankedStore(s => s.tier);
  const rankedWins = useRankedStore(s => s.rankedWins);
  const rankedLosses = useRankedStore(s => s.rankedLosses);
  const rankedGames = useRankedStore(s => s.rankedGames);
  const seasonHighElo = useRankedStore(s => s.seasonHighElo);
  const currentSeason = useRankedStore(s => s.currentSeason);
  const tierInfo = useMemo(() => {
    return RANKED_TIERS.find(t => t.id === tier) || RANKED_TIERS[0];
  }, [tier]);
  const progress = useMemo(() => {
    const currentTierInfo = RANKED_TIERS.find(t => t.id === tier)!;
    const currentTierIdx = RANKED_TIERS.indexOf(currentTierInfo);
    const nextTier = RANKED_TIERS[currentTierIdx + 1];
    if (!nextTier) return 100;
    const range = nextTier.minElo - currentTierInfo.minElo;
    return Math.min(100, Math.round(((elo - currentTierInfo.minElo) / range) * 100));
  }, [elo, tier]);

  // Find next tier
  const currentIdx = RANKED_TIERS.findIndex(t => t.id === tier);
  const nextTier: RankedTierInfo | null = currentIdx < RANKED_TIERS.length - 1
    ? RANKED_TIERS[currentIdx + 1]
    : null;

  // Animated progress bar
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  });

  const winRate = rankedGames > 0 ? Math.round((rankedWins / rankedGames) * 100) : 0;

  if (compact) {
    return (
      <View style={styles.compactCard}>
        <View style={styles.compactHeader}>
          <Text style={styles.compactTierIcon}>{tierInfo.icon}</Text>
          <Text style={[styles.compactTierName, { color: tierInfo.color }]}>{tierInfo.name}</Text>
          <Text style={styles.compactElo}>{elo} ELO</Text>
        </View>
        <View style={styles.progressBarBg}>
          <Animated.View style={[styles.progressBarFill, { width: progressWidth, backgroundColor: tierInfo.color }]} />
        </View>
        {nextTier && (
          <Text style={styles.compactNextLabel}>{nextTier.minElo - elo} ELO to {nextTier.name}</Text>
        )}
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <LinearGradient
        colors={[`${tierInfo.color}15`, `${tierInfo.color}05`]}
        style={styles.cardGradient}
      >
        {/* Header row: tier icon + name + ELO */}
        <View style={styles.headerRow}>
          <View style={styles.tierSection}>
            <Text style={styles.tierIconLarge}>{tierInfo.icon}</Text>
            <View>
              <Text style={[styles.tierName, { color: tierInfo.color }]}>{tierInfo.name}</Text>
              <Text style={styles.seasonLabel}>Season {currentSeason}</Text>
            </View>
          </View>
          <View style={styles.eloSection}>
            <Text style={styles.eloValue}>{elo}</Text>
            <Text style={styles.eloLabel}>ELO</Text>
          </View>
        </View>

        {/* Progress bar to next tier */}
        <View style={styles.progressSection}>
          <View style={styles.progressLabelRow}>
            <Text style={[styles.progressTierLabel, { color: tierInfo.color }]}>
              {tierInfo.name}
            </Text>
            <Text style={styles.progressPct}>{progress}%</Text>
            {nextTier ? (
              <Text style={[styles.progressTierLabel, { color: nextTier.color, textAlign: 'right' }]}>
                {nextTier.name}
              </Text>
            ) : (
              <Text style={[styles.progressTierLabel, { color: tierInfo.color, textAlign: 'right' }]}>
                MAX
              </Text>
            )}
          </View>
          <View style={styles.progressBarBg}>
            <Animated.View
              style={[
                styles.progressBarFill,
                { width: progressWidth, backgroundColor: tierInfo.color },
              ]}
            />
          </View>
          {nextTier && (
            <Text style={styles.eloToNext}>
              {nextTier.minElo - elo} ELO to {nextTier.name}
            </Text>
          )}
        </View>

        {/* Stats row: W / L / Win Rate / Season High */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.green }]}>{rankedWins}</Text>
            <Text style={styles.statLabel}>Wins</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.pieceRed }]}>{rankedLosses}</Text>
            <Text style={styles.statLabel}>Losses</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.orange }]}>{winRate}%</Text>
            <Text style={styles.statLabel}>Win Rate</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.coinGold }]}>{seasonHighElo}</Text>
            <Text style={styles.statLabel}>Season High</Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  // === Full card ===
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  cardGradient: {
    padding: 16,
    borderRadius: 16,
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tierSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tierIconLarge: {
    fontSize: 32,
  },
  tierName: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 18,
  },
  seasonLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.medium,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  eloSection: {
    alignItems: 'flex-end',
  },
  eloValue: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 28,
    color: '#ffffff',
    lineHeight: 30,
  },
  eloLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 10,
    color: colors.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  // === Progress bar ===
  progressSection: {},
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressTierLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 11,
    width: 70,
  },
  progressPct: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 11,
    color: '#ffffff',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  eloToNext: {
    fontFamily: fonts.body,
    fontWeight: weight.medium,
    fontSize: 10,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },

  // === Stats row ===
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 18,
  },
  statLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.medium,
    fontSize: 9,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 1,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },

  // === Compact variant ===
  compactCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  compactTierIcon: {
    fontSize: 18,
  },
  compactTierName: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 14,
  },
  compactElo: {
    fontFamily: fonts.body,
    fontWeight: weight.medium,
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: 'auto',
  },
  compactNextLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.medium,
    fontSize: 10,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
});
