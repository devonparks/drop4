import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { TopBar } from '../components/ui/TopBar';
import { useMatchHistoryStore, MatchRecord } from '../stores/matchHistoryStore';
import { useShopStore } from '../stores/shopStore';
import { haptics } from '../services/haptics';
import { colors } from '../theme/colors';
import { fonts, weight } from '../theme/typography';

type FilterType = 'all' | 'win' | 'loss' | 'draw';
type SortType = 'newest' | 'oldest' | 'most-coins' | 'most-moves';

const FILTER_OPTIONS: { key: FilterType; label: string; color: string }[] = [
  { key: 'all', label: 'All', color: colors.orange },
  { key: 'win', label: 'Wins', color: colors.green },
  { key: 'loss', label: 'Losses', color: colors.pieceRed },
  { key: 'draw', label: 'Draws', color: colors.textSecondary },
];

const SORT_OPTIONS: { key: SortType; label: string }[] = [
  { key: 'newest', label: 'Newest' },
  { key: 'oldest', label: 'Oldest' },
  { key: 'most-coins', label: 'Most Coins' },
  { key: 'most-moves', label: 'Most Moves' },
];

const PAGE_SIZE = 20;

function FilterChip({ label, active, color, onPress }: {
  label: string; active: boolean; color: string; onPress: () => void;
}) {
  return (
    <Pressable
      onPress={() => { haptics.select(); onPress(); }}
      accessibilityRole="button"
      accessibilityLabel={`Filter by ${label}`}
      accessibilityState={{ selected: active }}
    >
      <View style={[styles.chip, active && { backgroundColor: color + '30', borderColor: color + '60' }]}>
        <Text style={[styles.chipText, active && { color }]}>{label}</Text>
      </View>
    </Pressable>
  );
}

function SortChip({ label, active, onPress }: {
  label: string; active: boolean; onPress: () => void;
}) {
  return (
    <Pressable
      onPress={() => { haptics.select(); onPress(); }}
      accessibilityRole="button"
      accessibilityLabel={`Sort by ${label}`}
      accessibilityState={{ selected: active }}
    >
      <View style={[styles.chip, active && { backgroundColor: 'rgba(255,140,0,0.15)', borderColor: 'rgba(255,140,0,0.4)' }]}>
        <Text style={[styles.chipText, active && { color: colors.orange }]}>{label}</Text>
      </View>
    </Pressable>
  );
}

function formatDate(timestamp: number): string {
  const d = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const MODE_BADGES: Record<string, { label: string; color: string }> = {
  ai: { label: 'AI', color: '#6c7a89' },
  local: { label: 'Local', color: '#8e44ad' },
  stage: { label: 'Stage', color: '#2980b9' },
  career: { label: 'Career', color: '#f39c12' },
  ranked: { label: 'Ranked', color: '#e74c3c' },
  wager: { label: 'Wager', color: '#e67e22' },
  online: { label: 'Online', color: '#1abc9c' },
};

const MatchRow = React.memo(function MatchRow({ match }: { match: MatchRecord }) {
  const resultColors = {
    win: colors.green,
    loss: colors.pieceRed,
    draw: colors.textSecondary,
  };
  const resultLabels = { win: 'WIN', loss: 'LOSS', draw: 'DRAW' };

  const modeBadge = MODE_BADGES[match.mode] || MODE_BADGES.ai;
  const diffLabel = match.difficulty
    ? match.difficulty.charAt(0).toUpperCase() + match.difficulty.slice(1)
    : '';

  return (
    <View style={styles.matchRow}>
      {/* Result badge */}
      <View style={[styles.resultBadge, { backgroundColor: resultColors[match.result] + '20' }]}>
        <Text style={[styles.resultText, { color: resultColors[match.result] }]}>
          {resultLabels[match.result]}
        </Text>
      </View>

      {/* Match info */}
      <View style={styles.matchInfo}>
        <Text style={styles.opponent}>vs {match.opponent}</Text>
        <View style={styles.matchMetaRow}>
          <View style={[styles.modeBadge, { backgroundColor: modeBadge.color + '20', borderColor: modeBadge.color + '40' }]}>
            <Text style={[styles.modeBadgeText, { color: modeBadge.color }]}>{modeBadge.label}</Text>
          </View>
          {diffLabel && match.mode === 'ai' && (
            <Text style={styles.matchMeta}>{diffLabel}</Text>
          )}
          <Text style={styles.matchMeta}>{match.moves} moves</Text>
        </View>
      </View>

      {/* Right side: coins + time */}
      <View style={styles.matchRight}>
        {match.coinsEarned > 0 && (
          <Text style={styles.coinsEarned}>+{match.coinsEarned} {'\uD83E\uDE99'}</Text>
        )}
        <Text style={styles.timestamp}>{formatDate(match.timestamp)}</Text>
      </View>
    </View>
  );
});

export function MatchHistoryScreen() {
  const navigation = useNavigation();
  const coins = useShopStore(s => s.coins);
  const gems = useShopStore(s => s.gems);
  const level = useShopStore(s => s.level);
  const allMatches = useMatchHistoryStore(s => s.matches);
  const stats = useMemo(() => {
    const wins = allMatches.filter(m => m.result === 'win').length;
    const losses = allMatches.filter(m => m.result === 'loss').length;
    const draws = allMatches.filter(m => m.result === 'draw').length;
    const totalGames = allMatches.length;
    const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;
    const totalCoinsEarned = allMatches.reduce((sum, m) => sum + m.coinsEarned, 0);
    return { wins, losses, draws, totalGames, winRate, totalCoinsEarned };
  }, [allMatches]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [sort, setSort] = useState<SortType>('newest');
  const [page, setPage] = useState(1);

  const filteredAndSorted = useMemo(() => {
    let result = [...allMatches];

    // Filter
    if (filter !== 'all') {
      result = result.filter(m => m.result === filter);
    }

    // Sort
    switch (sort) {
      case 'oldest':
        result.sort((a, b) => a.timestamp - b.timestamp);
        break;
      case 'most-coins':
        result.sort((a, b) => b.coinsEarned - a.coinsEarned);
        break;
      case 'most-moves':
        result.sort((a, b) => b.moves - a.moves);
        break;
      case 'newest':
      default:
        result.sort((a, b) => b.timestamp - a.timestamp);
        break;
    }

    return result;
  }, [allMatches, filter, sort]);

  const pagedMatches = useMemo(() => {
    return filteredAndSorted.slice(0, page * PAGE_SIZE);
  }, [filteredAndSorted, page]);

  const hasMore = pagedMatches.length < filteredAndSorted.length;

  const loadMore = () => {
    if (hasMore) setPage(p => p + 1);
  };

  return (
    <ScreenBackground>
      <TopBar coins={coins} gems={gems} level={level} showBack onBackPress={() => navigation.goBack()} />
      <FlatList
        data={pagedMatches}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListHeaderComponent={
          <>
            {/* Header */}
            <Text style={styles.title}>MATCH HISTORY</Text>
            <Text style={styles.subtitle}>{allMatches.length} total games played</Text>

            {/* Summary stats row */}
            <View style={styles.statsRow}>
              <View style={styles.statPill}>
                <Text style={[styles.statNum, { color: colors.green }]}>{stats.wins}</Text>
                <Text style={styles.statLabel}>W</Text>
              </View>
              <View style={styles.statPill}>
                <Text style={[styles.statNum, { color: colors.pieceRed }]}>{stats.losses}</Text>
                <Text style={styles.statLabel}>L</Text>
              </View>
              <View style={styles.statPill}>
                <Text style={[styles.statNum, { color: colors.textSecondary }]}>{stats.draws}</Text>
                <Text style={styles.statLabel}>D</Text>
              </View>
              <View style={[styles.statPill, { flex: 1.2 }]}>
                <Text style={[styles.statNum, { color: colors.orange }]}>{stats.winRate}%</Text>
                <Text style={styles.statLabel}>Win Rate</Text>
              </View>
              <View style={[styles.statPill, { flex: 1.2 }]}>
                <Text style={[styles.statNum, { color: colors.coinGold }]}>{stats.totalCoinsEarned.toLocaleString()}</Text>
                <Text style={styles.statLabel}>Coins</Text>
              </View>
            </View>

            {/* Filters */}
            <Text style={styles.sectionLabel}>FILTER</Text>
            <View style={styles.chipRow}>
              {FILTER_OPTIONS.map(opt => (
                <FilterChip
                  key={opt.key}
                  label={opt.label}
                  active={filter === opt.key}
                  color={opt.color}
                  onPress={() => { setFilter(opt.key); setPage(1); }}
                />
              ))}
            </View>

            {/* Sort */}
            <Text style={styles.sectionLabel}>SORT BY</Text>
            <View style={styles.chipRow}>
              {SORT_OPTIONS.map(opt => (
                <SortChip
                  key={opt.key}
                  label={opt.label}
                  active={sort === opt.key}
                  onPress={() => { setSort(opt.key); setPage(1); }}
                />
              ))}
            </View>

            {/* Results count */}
            <Text style={styles.resultsCount}>
              Showing {pagedMatches.length} of {filteredAndSorted.length} matches
            </Text>
          </>
        }
        renderItem={({ item }) => <MatchRow match={item} />}
        ListEmptyComponent={
          <Animated.View entering={FadeIn.duration(280)} style={styles.emptyState}>
            <Text style={styles.emptyIcon}>{'\uD83C\uDFAE'}</Text>
            <Text style={styles.emptyTitle}>No matches yet</Text>
            <Text style={styles.emptyDesc}>
              {filter === 'all'
                ? 'Play some games and your match history will appear here.'
                : `No ${filter === 'draw' ? 'draws' : filter + 's'} found.`}
            </Text>
          </Animated.View>
        }
        ListFooterComponent={
          hasMore ? (
            <Pressable
              onPress={loadMore}
              style={styles.loadMore}
              accessibilityRole="button"
              accessibilityLabel="Load more matches"
            >
              <LinearGradient
                colors={['rgba(255,140,0,0.15)', 'rgba(255,140,0,0.05)']}
                style={styles.loadMoreGradient}
              >
                <Text style={styles.loadMoreText}>Load More</Text>
              </LinearGradient>
            </Pressable>
          ) : pagedMatches.length > 0 ? (
            <Text style={styles.endText}>End of match history</Text>
          ) : null
        }
      />
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  title: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 22,
    color: '#ffffff',
    letterSpacing: 2,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: fonts.body,
    fontWeight: weight.medium,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 14,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 16,
  },
  statPill: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  statNum: {
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
  sectionLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 10,
    color: colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  chipText: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 12,
    color: colors.textSecondary,
  },
  resultsCount: {
    fontFamily: fonts.body,
    fontWeight: weight.regular,
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 10,
  },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    padding: 12,
    gap: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  resultBadge: {
    width: 44,
    paddingVertical: 4,
    borderRadius: 8,
    alignItems: 'center',
  },
  resultText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 11,
    letterSpacing: 0.5,
  },
  matchInfo: {
    flex: 1,
  },
  opponent: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 14,
    color: '#ffffff',
  },
  matchMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  modeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  modeBadgeText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 9,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  matchMeta: {
    fontFamily: fonts.body,
    fontWeight: weight.regular,
    fontSize: 11,
    color: colors.textSecondary,
  },
  matchRight: {
    alignItems: 'flex-end',
  },
  coinsEarned: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 12,
    color: colors.coinGold,
  },
  timestamp: {
    fontFamily: fonts.body,
    fontWeight: weight.regular,
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 18,
    color: '#ffffff',
    marginBottom: 4,
  },
  emptyDesc: {
    fontFamily: fonts.body,
    fontWeight: weight.regular,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 240,
  },
  loadMore: {
    marginTop: 8,
    marginBottom: 16,
  },
  loadMoreGradient: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,140,0,0.2)',
  },
  loadMoreText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 13,
    color: colors.orange,
    letterSpacing: 0.5,
  },
  endText: {
    fontFamily: fonts.body,
    fontWeight: weight.regular,
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
});
