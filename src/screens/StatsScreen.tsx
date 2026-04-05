import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { TopBar } from '../components/ui/TopBar';
import { useShopStore } from '../stores/shopStore';
import { useGameStore } from '../stores/gameStore';
import { useMatchHistoryStore, MatchRecord } from '../stores/matchHistoryStore';
import { useRankedStore, RANKED_TIERS } from '../stores/rankedStore';
import { useCareerStore } from '../stores/careerStore';
import { colors } from '../theme/colors';
import { fonts, weight } from '../theme/typography';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Stats'>;
};

/* ---------- helper components ---------- */

function SectionTitle({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

function OverviewCard({ label, value, color = '#ffffff', icon }: {
  label: string; value: string | number; color?: string; icon?: string;
}) {
  return (
    <View style={styles.overviewCard}>
      {icon && <Text style={styles.cardIcon}>{icon}</Text>}
      <Text style={[styles.cardValue, { color }]}>{value}</Text>
      <Text style={styles.cardLabel}>{label}</Text>
    </View>
  );
}

function ProgressBar({ label, value, max, color, showPct = true }: {
  label: string; value: number; max: number; color: string; showPct?: boolean;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <View style={styles.progressRow}>
      <View style={styles.progressLabelRow}>
        <Text style={styles.progressLabel}>{label}</Text>
        <Text style={[styles.progressValue, { color }]}>
          {value}{showPct ? ` (${pct}%)` : ''}
        </Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${Math.min(pct, 100)}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

/* ---------- main screen ---------- */

export function StatsScreen({ navigation }: Props) {
  const { coins, level } = useShopStore();
  const { scores, winStreak, bestStreak, totalGamesPlayed } = useGameStore();
  const matches = useMatchHistoryStore(s => s.matches);
  const getStats = useMatchHistoryStore(s => s.getStats);
  const ranked = useRankedStore();
  const career = useCareerStore();

  const stats = getStats();

  // Difficulty breakdown from match history
  const easyWins = matches.filter(m => m.result === 'win' && m.difficulty === 'easy').length;
  const mediumWins = matches.filter(m => m.result === 'win' && m.difficulty === 'medium').length;
  const hardWins = matches.filter(m => m.result === 'win' && m.difficulty === 'hard').length;
  const totalDiffWins = easyWins + mediumWins + hardWins;

  // Mode breakdown
  const aiGames = matches.filter(m => m.mode === 'ai').length;
  const localGames = matches.filter(m => m.mode === 'local').length;
  const stageGames = matches.filter(m => m.mode === 'stage').length;

  // Hours played estimate (avg ~3 min per game)
  const estimatedMinutes = stats.totalGames * 3;
  const hoursPlayed = estimatedMinutes >= 60
    ? `${(estimatedMinutes / 60).toFixed(1)}h`
    : `${estimatedMinutes}m`;

  // Streaks — compute longest losing streak from match history
  let currentLoseStreak = 0;
  let longestLoseStreak = 0;
  for (const m of matches) {
    if (m.result === 'loss') {
      currentLoseStreak++;
      longestLoseStreak = Math.max(longestLoseStreak, currentLoseStreak);
    } else {
      currentLoseStreak = 0;
    }
  }

  // Recent form (last 10 games, newest first)
  const recentForm = matches.slice(0, 10);

  // ELO history — derive from ranked games in match history
  // We show the ranked ELO progression as text entries
  const rankedMatches = matches.filter(m => m.mode === 'stage').slice(0, 10);

  // Current tier info
  const tierInfo = ranked.getTier();

  return (
    <ScreenBackground>
      <TopBar
        coins={coins}
        gems={useShopStore.getState().gems}
        level={level}
        showBack
        onBackPress={() => navigation.goBack()}
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Text style={styles.screenHeader}>Statistics</Text>

        {/* ---------- 1. Overview Cards ---------- */}
        <SectionTitle title="OVERVIEW" />
        <View style={styles.grid}>
          <OverviewCard icon="🎮" label="Total Games" value={stats.totalGames} />
          <OverviewCard icon="🏆" label="Win Rate" value={`${stats.winRate}%`} color={colors.green} />
          <OverviewCard icon="🪙" label="Coins Earned" value={stats.totalCoinsEarned.toLocaleString()} color={colors.coinGold} />
          <OverviewCard icon="⏱" label="Time Played" value={hoursPlayed} color={colors.teal} />
        </View>

        {/* ---------- 2. Win/Loss Breakdown ---------- */}
        <SectionTitle title="WIN / LOSS BREAKDOWN" />
        <View style={styles.card}>
          {/* Colored bar */}
          {stats.totalGames > 0 && (
            <View style={styles.wlBar}>
              <View style={[styles.wlSegment, {
                flex: stats.wins || 0.01,
                backgroundColor: colors.green,
                borderTopLeftRadius: 6, borderBottomLeftRadius: 6,
              }]} />
              <View style={[styles.wlSegment, {
                flex: stats.draws || 0.01,
                backgroundColor: colors.textSecondary,
              }]} />
              <View style={[styles.wlSegment, {
                flex: stats.losses || 0.01,
                backgroundColor: colors.pieceRed,
                borderTopRightRadius: 6, borderBottomRightRadius: 6,
              }]} />
            </View>
          )}
          <View style={styles.wlLabels}>
            <View style={styles.wlItem}>
              <View style={[styles.wlDot, { backgroundColor: colors.green }]} />
              <Text style={styles.wlText}>Wins {stats.wins}</Text>
            </View>
            <View style={styles.wlItem}>
              <View style={[styles.wlDot, { backgroundColor: colors.textSecondary }]} />
              <Text style={styles.wlText}>Draws {stats.draws}</Text>
            </View>
            <View style={styles.wlItem}>
              <View style={[styles.wlDot, { backgroundColor: colors.pieceRed }]} />
              <Text style={styles.wlText}>Losses {stats.losses}</Text>
            </View>
          </View>
        </View>

        {/* ---------- 3. Difficulty Breakdown ---------- */}
        <SectionTitle title="DIFFICULTY BREAKDOWN" />
        <View style={styles.card}>
          <ProgressBar label="Easy" value={easyWins} max={Math.max(totalDiffWins, 1)} color={colors.green} />
          <ProgressBar label="Medium" value={mediumWins} max={Math.max(totalDiffWins, 1)} color={colors.orange} />
          <ProgressBar label="Hard" value={hardWins} max={Math.max(totalDiffWins, 1)} color={colors.pieceRed} />
        </View>

        {/* ---------- 4. Mode Breakdown ---------- */}
        <SectionTitle title="MODE BREAKDOWN" />
        <View style={styles.card}>
          <View style={styles.modeRow}>
            <ModeItem label="vs AI" count={aiGames} icon="🤖" />
            <ModeItem label="Local" count={localGames} icon="👥" />
            <ModeItem label="Wager" count={stageGames} icon="💰" />
            <ModeItem label="Ranked" count={ranked.rankedGames} icon="🏅" />
          </View>
        </View>

        {/* ---------- 5. Streaks ---------- */}
        <SectionTitle title="STREAKS" />
        <View style={styles.grid}>
          <OverviewCard
            icon="🔥"
            label="Current"
            value={winStreak > 0 ? winStreak : 0}
            color={winStreak > 0 ? colors.orange : '#ffffff'}
          />
          <OverviewCard icon="⭐" label="Best" value={bestStreak} color={colors.coinGold} />
          <OverviewCard icon="📉" label="Worst Loss" value={longestLoseStreak} color={colors.pieceRed} />
        </View>

        {/* ---------- 6. Recent Form ---------- */}
        <SectionTitle title="RECENT FORM" />
        <View style={styles.card}>
          {recentForm.length === 0 ? (
            <Text style={styles.emptyText}>No recent games</Text>
          ) : (
            <View style={styles.formRow}>
              {recentForm.map((m, i) => (
                <View
                  key={m.id}
                  style={[
                    styles.formDot,
                    {
                      backgroundColor:
                        m.result === 'win' ? colors.green
                          : m.result === 'loss' ? colors.pieceRed
                            : colors.textSecondary,
                    },
                  ]}
                />
              ))}
              {/* Pad remaining slots with empty dots */}
              {Array.from({ length: Math.max(0, 10 - recentForm.length) }).map((_, i) => (
                <View key={`empty-${i}`} style={[styles.formDot, { backgroundColor: 'rgba(255,255,255,0.08)' }]} />
              ))}
            </View>
          )}
          <View style={styles.formLegend}>
            <View style={styles.wlItem}>
              <View style={[styles.wlDot, { backgroundColor: colors.green }]} />
              <Text style={styles.legendText}>Win</Text>
            </View>
            <View style={styles.wlItem}>
              <View style={[styles.wlDot, { backgroundColor: colors.pieceRed }]} />
              <Text style={styles.legendText}>Loss</Text>
            </View>
            <View style={styles.wlItem}>
              <View style={[styles.wlDot, { backgroundColor: colors.textSecondary }]} />
              <Text style={styles.legendText}>Draw</Text>
            </View>
          </View>
        </View>

        {/* ---------- 7. ELO History ---------- */}
        {ranked.rankedGames > 0 && (
          <>
            <SectionTitle title="RANKED / ELO" />
            <View style={styles.card}>
              <View style={styles.eloHeader}>
                <Text style={styles.eloIcon}>{tierInfo.icon}</Text>
                <View>
                  <Text style={[styles.eloTierName, { color: tierInfo.color }]}>{tierInfo.name}</Text>
                  <Text style={styles.eloValue}>{ranked.elo} ELO</Text>
                </View>
                <View style={styles.eloStats}>
                  <Text style={[styles.eloStatNum, { color: colors.green }]}>{ranked.rankedWins}W</Text>
                  <Text style={styles.eloStatSep}>/</Text>
                  <Text style={[styles.eloStatNum, { color: colors.pieceRed }]}>{ranked.rankedLosses}L</Text>
                </View>
              </View>
              {ranked.seasonHighElo > 0 && (
                <View style={styles.eloMetaRow}>
                  <Text style={styles.eloMetaLabel}>Season High</Text>
                  <Text style={[styles.eloMetaValue, { color: colors.coinGold }]}>{ranked.seasonHighElo}</Text>
                </View>
              )}
              {ranked.seasonHistory.length > 0 && (
                <View style={{ marginTop: 8 }}>
                  <Text style={styles.eloHistoryLabel}>Past Seasons</Text>
                  {ranked.seasonHistory.slice(-5).reverse().map((s, i) => {
                    const tier = RANKED_TIERS.find(t => t.id === s.tier) || RANKED_TIERS[0];
                    return (
                      <View key={i} style={styles.eloHistoryRow}>
                        <Text style={styles.eloHistorySeason}>Season {s.season + 1}</Text>
                        <Text style={{ fontSize: 14 }}>{tier.icon}</Text>
                        <Text style={[styles.eloHistoryElo, { color: tier.color }]}>{s.elo}</Text>
                        <Text style={styles.eloHistoryRecord}>{s.wins}W / {s.losses}L</Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          </>
        )}

        {/* ---------- Career ---------- */}
        <SectionTitle title="CAREER" />
        <View style={styles.grid}>
          <OverviewCard icon="✅" label="Completed" value={career.getCompletedCount()} color={colors.green} />
          <OverviewCard icon="⭐" label="Total Stars" value={career.getTotalStars()} color={colors.coinGold} />
        </View>
      </ScrollView>
    </ScreenBackground>
  );
}

/* ---------- small sub-component ---------- */

function ModeItem({ label, count, icon }: { label: string; count: number; icon: string }) {
  return (
    <View style={styles.modeItem}>
      <Text style={styles.modeIcon}>{icon}</Text>
      <Text style={styles.modeCount}>{count}</Text>
      <Text style={styles.modeLabel}>{label}</Text>
    </View>
  );
}

/* ---------- styles ---------- */

const styles = StyleSheet.create({
  content: {
    paddingBottom: 100,
  },
  screenHeader: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 28,
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 16,
    marginTop: 4,
  },
  sectionTitle: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 12,
    color: colors.textSecondary,
    letterSpacing: 2,
    paddingHorizontal: 20,
    marginBottom: 10,
    marginTop: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 12,
  },
  overviewCard: {
    flex: 1,
    minWidth: '28%',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  cardIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  cardValue: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 22,
    marginBottom: 2,
  },
  cardLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.regular,
    fontSize: 10,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    marginHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginBottom: 12,
  },

  /* W/L bar */
  wlBar: {
    flexDirection: 'row',
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 10,
  },
  wlSegment: {
    height: '100%',
  },
  wlLabels: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  wlItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  wlDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  wlText: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 12,
    color: '#ffffff',
  },

  /* Progress bars (difficulty) */
  progressRow: {
    marginBottom: 10,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  progressLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.medium,
    fontSize: 13,
    color: colors.textSecondary,
  },
  progressValue: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 13,
  },
  progressTrack: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },

  /* Mode breakdown */
  modeRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  modeItem: {
    alignItems: 'center',
    gap: 2,
  },
  modeIcon: {
    fontSize: 22,
  },
  modeCount: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 20,
    color: '#ffffff',
  },
  modeLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.regular,
    fontSize: 10,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  /* Recent form */
  formRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  formDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  formLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 4,
  },
  legendText: {
    fontFamily: fonts.body,
    fontWeight: weight.regular,
    fontSize: 11,
    color: colors.textSecondary,
  },
  emptyText: {
    fontFamily: fonts.body,
    fontWeight: weight.regular,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: 8,
  },

  /* ELO / Ranked */
  eloHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  eloIcon: {
    fontSize: 32,
  },
  eloTierName: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 16,
  },
  eloValue: {
    fontFamily: fonts.body,
    fontWeight: weight.regular,
    fontSize: 12,
    color: colors.textSecondary,
  },
  eloStats: {
    flexDirection: 'row',
    marginLeft: 'auto',
    alignItems: 'center',
    gap: 2,
  },
  eloStatNum: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 14,
  },
  eloStatSep: {
    fontFamily: fonts.body,
    fontWeight: weight.regular,
    fontSize: 12,
    color: colors.textMuted,
  },
  eloMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  eloMetaLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.regular,
    fontSize: 13,
    color: colors.textSecondary,
  },
  eloMetaValue: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 14,
  },
  eloHistoryLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 11,
    color: colors.textSecondary,
    letterSpacing: 1,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  eloHistoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  eloHistorySeason: {
    fontFamily: fonts.body,
    fontWeight: weight.medium,
    fontSize: 12,
    color: colors.textSecondary,
    width: 70,
  },
  eloHistoryElo: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 14,
  },
  eloHistoryRecord: {
    fontFamily: fonts.body,
    fontWeight: weight.regular,
    fontSize: 11,
    color: colors.textMuted,
    marginLeft: 'auto',
  },
});
