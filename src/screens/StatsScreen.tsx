import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { TopBar } from '../components/ui/TopBar';
import { useShopStore } from '../stores/shopStore';
import { useGameStore } from '../stores/gameStore';
import { useMatchHistoryStore } from '../stores/matchHistoryStore';
import { useRankedStore, RANKED_TIERS, formatRank } from '../stores/rankedStore';
import { useCareerStore } from '../stores/careerStore';
import { BOARD_THEMES, PIECE_THEMES } from '../data/shopCatalog';
import { PETS } from '../data/pets';
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

const CARD_GRADIENTS: Record<string, [string, string]> = {
  '#ffffff': ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)'],
  [colors.green]: ['rgba(39,174,61,0.18)', 'rgba(39,174,61,0.04)'],
  [colors.coinGold]: ['rgba(255,215,0,0.16)', 'rgba(255,215,0,0.03)'],
  [colors.teal]: ['rgba(26,188,156,0.16)', 'rgba(26,188,156,0.03)'],
  [colors.orange]: ['rgba(255,140,0,0.16)', 'rgba(255,140,0,0.03)'],
  [colors.pieceRed]: ['rgba(230,57,70,0.16)', 'rgba(230,57,70,0.03)'],
};

function OverviewCard({ label, value, color = '#ffffff', icon }: {
  label: string; value: string | number; color?: string; icon?: string;
}) {
  const grad = CARD_GRADIENTS[color] || CARD_GRADIENTS['#ffffff'];
  return (
    <LinearGradient
      colors={grad}
      style={styles.overviewCard}
    >
      {icon && <Text style={styles.cardIcon}>{icon}</Text>}
      <Text style={[styles.cardValue, { color }]}>{value}</Text>
      <Text style={styles.cardLabel}>{label}</Text>
    </LinearGradient>
  );
}

function ProgressBar({ label, value, max, color, showPct = true }: {
  label: string; value: number; max: number; color: string; showPct?: boolean;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  const valueColor = value > 0 ? color : colors.textMuted;
  return (
    <View style={styles.progressRow}>
      <View style={styles.progressLabelRow}>
        <Text style={styles.progressLabel}>{label}</Text>
        <Text style={[styles.progressValue, { color: valueColor }]}>
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
  const coins = useShopStore(s => s.coins);
  const gems = useShopStore(s => s.gems);
  const level = useShopStore(s => s.level);
  const lifetimeCoinsEarned = useShopStore(s => s.lifetimeCoinsEarned);
  const scores = useGameStore(s => s.scores);
  const winStreak = useGameStore(s => s.winStreak);
  const bestStreak = useGameStore(s => s.bestStreak);
  const matches = useMatchHistoryStore(s => s.matches);
  const elo = useRankedStore(s => s.elo);
  const tier = useRankedStore(s => s.tier);
  const rankedGames = useRankedStore(s => s.rankedGames);
  const rankedWins = useRankedStore(s => s.rankedWins);
  const rankedLosses = useRankedStore(s => s.rankedLosses);
  const seasonHighElo = useRankedStore(s => s.seasonHighElo);
  const seasonHistory = useRankedStore(s => s.seasonHistory);
  const careerProgress = useCareerStore(s => s.progress);
  const equippedBoard = useShopStore(s => s.equipped.board);
  const equippedPieces = useShopStore(s => s.equipped.pieces);
  const equippedPet = useShopStore(s => s.equippedPet);

  const stats = useMemo(() => {
    const wins = matches.filter(m => m.result === 'win').length;
    const losses = matches.filter(m => m.result === 'loss').length;
    const draws = matches.filter(m => m.result === 'draw').length;
    const totalGames = matches.length;
    const totalCoinsEarned = matches.reduce((sum, m) => sum + (m.coinsEarned || 0), 0);
    const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;

    // Difficulty win breakdown
    const easyWins = matches.filter(m => m.result === 'win' && m.difficulty === 'easy').length;
    const mediumWins = matches.filter(m => m.result === 'win' && m.difficulty === 'medium').length;
    const hardWins = matches.filter(m => m.result === 'win' && m.difficulty === 'hard').length;
    const totalDiffWins = easyWins + mediumWins + hardWins;

    // Mode breakdown
    const aiGames = matches.filter(m => m.mode === 'ai').length;
    const localGames = matches.filter(m => m.mode === 'local').length;
    const wagerGames = matches.filter(m => m.mode === 'wager').length;

    // Time estimate
    const avgMoves = matches.length > 0
      ? matches.reduce((sum, m) => sum + (m.moves || 20), 0) / matches.length
      : 20;
    const estimatedMinutes = Math.round(totalGames * avgMoves * 5 / 60);
    const hoursPlayed = estimatedMinutes >= 60
      ? `${(estimatedMinutes / 60).toFixed(1)}h`
      : `${estimatedMinutes}m`;

    // Losing streak
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

    // Best performance
    const winMatches = matches.filter(m => m.result === 'win');
    const fastestWin = winMatches.length > 0 ? Math.min(...winMatches.map(m => m.moves)) : null;
    const mostCoins = matches.length > 0 ? Math.max(...matches.map(m => m.coinsEarned || 0)) : null;

    // Recent form & ranked recent
    const recentForm = matches.slice(0, 10);
    const rankedMatches = matches.filter(m => m.mode === 'stage').slice(0, 10);

    return {
      totalGames, wins, losses, draws, winRate, totalCoinsEarned,
      easyWins, mediumWins, hardWins, totalDiffWins,
      aiGames, localGames, wagerGames,
      hoursPlayed,
      longestLoseStreak,
      fastestWin, mostCoins,
      recentForm, rankedMatches,
    };
  }, [matches]);

  const tierInfo = useMemo(() => {
    return RANKED_TIERS.find(t => t.id === tier) || RANKED_TIERS[0];
  }, [tier]);

  const completedCount = useMemo(() => {
    return Object.values(careerProgress).filter(p => p.completed).length;
  }, [careerProgress]);

  const totalStars = useMemo(() => {
    return Object.values(careerProgress).reduce((sum, p) => sum + p.stars, 0);
  }, [careerProgress]);

  // Equipped cosmetic display names
  const boardName = useMemo(() =>
    BOARD_THEMES.find(b => b.id === equippedBoard)?.name || 'Classic Blue',
  [equippedBoard]);
  const piecesName = useMemo(() =>
    PIECE_THEMES.find(p => p.id === equippedPieces)?.name || 'Classic',
  [equippedPieces]);
  const petName = useMemo(() => {
    if (!equippedPet) return null;
    const pet = PETS.find(p => p.id === equippedPet);
    return pet ? `${pet.name} the ${pet.breed}` : null;
  }, [equippedPet]);

  const {
    easyWins, mediumWins, hardWins, totalDiffWins,
    aiGames, localGames, wagerGames,
    hoursPlayed,
    longestLoseStreak,
    fastestWin, mostCoins,
    recentForm, rankedMatches,
  } = stats;

  return (
    <ScreenBackground>
      <TopBar
        coins={coins}
        gems={gems}
        level={level}
        showBack
        onBackPress={() => navigation.goBack()}
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header with player level badge */}
        <View style={styles.screenHeaderRow}>
          <Text style={styles.screenHeader}>YOUR STATS</Text>
          <View style={styles.levelBadge}>
            <Text style={styles.levelBadgeText}>LVL {level}</Text>
          </View>
        </View>

        {/* ---------- 1. Overview Cards ---------- */}
        <SectionTitle title="OVERVIEW" />
        <View style={styles.grid}>
          <OverviewCard icon="🎮" label="Total Games" value={stats.totalGames} />
          <OverviewCard icon="🏆" label="Win Rate" value={`${stats.winRate}%`} color={colors.green} />
          <OverviewCard icon="🪙" label="Lifetime Earnings" value={Math.max(lifetimeCoinsEarned, stats.totalCoinsEarned).toLocaleString()} color={colors.coinGold} />
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
            <ModeItem label="Wager" count={wagerGames} icon="💰" />
            <ModeItem label="Ranked" count={rankedGames} icon="🏅" />
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

        {/* ---------- 5b. Best Performance ---------- */}
        <SectionTitle title="BEST PERFORMANCE" />
        <View style={styles.bestPerfCard}>
          <LinearGradient
            colors={['rgba(255,215,0,0.12)', 'rgba(155,89,182,0.08)', 'rgba(255,140,0,0.06)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.bestPerfGradient}
          >
            <View style={styles.bestPerfRow}>
              <View style={styles.bestPerfItem}>
                <Text style={styles.bestPerfIcon}>{'\u26A1'}</Text>
                <Text style={styles.bestPerfValue}>
                  {fastestWin ?? '--'}
                </Text>
                <Text style={styles.bestPerfLabel}>Fastest Win</Text>
                <Text style={styles.bestPerfSub}>(fewest moves)</Text>
              </View>
              <View style={styles.bestPerfDivider} />
              <View style={styles.bestPerfItem}>
                <Text style={styles.bestPerfIcon}>{'\uD83D\uDD25'}</Text>
                <Text style={[styles.bestPerfValue, { color: colors.orange }]}>{bestStreak}</Text>
                <Text style={styles.bestPerfLabel}>Longest Streak</Text>
                <Text style={styles.bestPerfSub}>consecutive wins</Text>
              </View>
              <View style={styles.bestPerfDivider} />
              <View style={styles.bestPerfItem}>
                <Text style={styles.bestPerfIcon}>{'\uD83E\uDE99'}</Text>
                <Text style={[styles.bestPerfValue, { color: colors.coinGold }]}>
                  {mostCoins ?? '--'}
                </Text>
                <Text style={styles.bestPerfLabel}>Most Coins</Text>
                <Text style={styles.bestPerfSub}>in one game</Text>
              </View>
            </View>
          </LinearGradient>
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
                    m.result === 'win' && {
                      shadowColor: colors.green,
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: 0.6,
                      shadowRadius: 6,
                      elevation: 4,
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
        {rankedGames > 0 && (
          <>
            <SectionTitle title="RANKED / ELO" />
            <View style={styles.card}>
              <View style={styles.eloHeader}>
                <Text style={styles.eloIcon}>{tierInfo.icon}</Text>
                <View>
                  <Text style={[styles.eloTierName, { color: tierInfo.color }]}>{formatRank(elo)}</Text>
                  <Text style={styles.eloValue}>{elo} ELO</Text>
                </View>
                <View style={styles.eloStats}>
                  <Text style={[styles.eloStatNum, { color: colors.green }]}>{rankedWins}W</Text>
                  <Text style={styles.eloStatSep}>/</Text>
                  <Text style={[styles.eloStatNum, { color: colors.pieceRed }]}>{rankedLosses}L</Text>
                </View>
              </View>
              {seasonHighElo > 0 && (
                <View style={styles.eloMetaRow}>
                  <Text style={styles.eloMetaLabel}>Season High</Text>
                  <Text style={[styles.eloMetaValue, { color: colors.coinGold }]}>{seasonHighElo}</Text>
                </View>
              )}
              {seasonHistory.length > 0 && (
                <View style={{ marginTop: 8 }}>
                  <Text style={styles.eloHistoryLabel}>Past Seasons</Text>
                  {seasonHistory.slice(-5).reverse().map((s, i) => {
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

        {/* ---------- Equipped Loadout ---------- */}
        <SectionTitle title="EQUIPPED LOADOUT" />
        <View style={styles.card}>
          <View style={styles.loadoutRow}>
            <Text style={styles.loadoutIcon}>🎨</Text>
            <Text style={styles.loadoutLabel}>Board</Text>
            <Text style={styles.loadoutValue}>{boardName}</Text>
          </View>
          <View style={[styles.loadoutRow, !petName && { borderBottomWidth: 0 }]}>
            <Text style={styles.loadoutIcon}>🔵</Text>
            <Text style={styles.loadoutLabel}>Pieces</Text>
            <Text style={styles.loadoutValue}>{piecesName}</Text>
          </View>
          {petName && (
            <View style={[styles.loadoutRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.loadoutIcon}>🐕</Text>
              <Text style={styles.loadoutLabel}>Pet</Text>
              <Text style={styles.loadoutValue}>{petName}</Text>
            </View>
          )}
        </View>

        {/* ---------- Career ---------- */}
        <SectionTitle title="CAREER" />
        <View style={styles.grid}>
          <OverviewCard icon="✅" label="Completed" value={completedCount} color={colors.green} />
          <OverviewCard icon="⭐" label="Total Stars" value={totalStars} color={colors.coinGold} />
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
  screenHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 16,
    marginTop: 4,
  },
  screenHeader: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 30,
    color: '#ffffff',
    textAlign: 'center',
    letterSpacing: 2,
  },
  levelBadge: {
    backgroundColor: colors.orange,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  levelBadgeText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 12,
    color: '#ffffff',
    letterSpacing: 1,
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

  /* W/L bar — chunkier */
  wlBar: {
    flexDirection: 'row',
    height: 14,
    borderRadius: 7,
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

  /* Recent form — bigger dots */
  formRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  formDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
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

  /* Equipped Loadout */
  loadoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  loadoutIcon: {
    fontSize: 16,
    width: 24,
    textAlign: 'center',
  },
  loadoutLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.regular,
    fontSize: 13,
    color: colors.textSecondary,
    width: 60,
  },
  loadoutValue: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 13,
    color: '#ffffff',
    flex: 1,
  },

  /* Best Performance highlight card */
  bestPerfCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.15)',
  },
  bestPerfGradient: {
    borderRadius: 16,
    padding: 16,
  },
  bestPerfRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bestPerfItem: {
    flex: 1,
    alignItems: 'center',
  },
  bestPerfDivider: {
    width: 1,
    height: 50,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  bestPerfIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  bestPerfValue: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 24,
    color: colors.green,
  },
  bestPerfLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 10,
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  bestPerfSub: {
    fontFamily: fonts.body,
    fontWeight: weight.regular,
    fontSize: 9,
    color: colors.textMuted,
  },
});
