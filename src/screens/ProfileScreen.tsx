import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Share } from 'react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { GlossyButton } from '../components/ui/GlossyButton';
import { CharacterAvatar } from '../components/ui/CharacterAvatar';
import { PetDisplay } from '../components/ui/PetDisplay';
import { getPetById } from '../data/pets';
import { useShopStore, getCoinMilestoneInfo, getPlayerTitle, getPlayerTitleColor } from '../stores/shopStore';
import { useGameStore } from '../stores/gameStore';
import { useMatchHistoryStore } from '../stores/matchHistoryStore';
import { useAchievementStore, getAchievementScore, getMaxAchievementPoints } from '../stores/achievementStore';
import { useRankedStore, RANKED_TIERS, formatRank } from '../stores/rankedStore';
import { useChallengeStore } from '../stores/challengeStore';
import { useDailyRewardStore } from '../stores/dailyRewardStore';
import { useDailySpinStore } from '../stores/dailySpinStore';
import { RankBadge } from '../components/ui/RankBadge';
import { RankProgressCard } from '../components/ui/RankProgressCard';
import { haptics } from '../services/haptics';
import { colors } from '../theme/colors';
import { fonts, weight } from '../theme/typography';

function StatCard({ label, value, color = '#ffffff' }: { label: string; value: string | number; color?: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function EquippedItem({ label, name, rarity }: { label: string; name: string; rarity: string }) {
  const rarityColors: Record<string, string> = {
    common: '#8892b0',
    rare: '#3498db',
    epic: '#9b59b6',
    legendary: '#f1c40f',
  };
  return (
    <View style={styles.equippedItem}>
      <Text style={styles.equippedLabel}>{label}</Text>
      <Text style={[styles.equippedName, { color: rarityColors[rarity] || '#fff' }]}>{name}</Text>
    </View>
  );
}

export function ProfileScreen() {
  const navigation = useNavigation<any>();
  const level = useShopStore(s => s.level);
  const xp = useShopStore(s => s.xp);
  const coins = useShopStore(s => s.coins);
  const gems = useShopStore(s => s.gems);
  const equipped = useShopStore(s => s.equipped);
  const equippedPet = useShopStore(s => s.equippedPet);
  const navigateTo = (screen: string) => navigation.dispatch(CommonActions.navigate({ name: screen }));
  const scores = useGameStore(s => s.scores);
  const winStreak = useGameStore(s => s.winStreak);
  const bestStreak = useGameStore(s => s.bestStreak);
  const allMatches = useMatchHistoryStore(s => s.matches);
  const recentMatches = useMemo(() => allMatches.slice(0, 5), [allMatches]);
  const achievements = useAchievementStore(s => s.achievements);
  const elo = useRankedStore(s => s.elo);
  const tier = useRankedStore(s => s.tier);
  const seasonHistory = useRankedStore(s => s.seasonHistory);

  // Daily goals data
  const challenges = useChallengeStore(s => s.challenges);
  const dailyRewardLastClaim = useDailyRewardStore(s => s.lastClaimDate);
  const canSpin = useDailySpinStore(s => s.canSpin);

  const totalGames = scores.player1 + scores.player2;
  const winRate = totalGames > 0 ? Math.round((scores.player1 / totalGames) * 100) : 0;

  // Daily goals calculations
  const dailyGoals = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayMs = todayStart.getTime();
    const gamesToday = allMatches.filter(m => m.timestamp >= todayMs).length;
    const completedChallenges = challenges.filter(c => c.completed).length;
    const todayStr = new Date().toISOString().split('T')[0];
    const rewardClaimed = dailyRewardLastClaim === todayStr;
    const spinUsed = !canSpin();
    return { gamesToday, completedChallenges, rewardClaimed, spinUsed };
  }, [allMatches, challenges, dailyRewardLastClaim, canSpin]);

  // Coin milestone
  const milestoneInfo = useMemo(() => getCoinMilestoneInfo(coins), [coins]);

  // Favorite difficulty (most-played)
  const favDifficulty = useMemo(() => {
    if (allMatches.length === 0) return 'N/A';
    const counts: Record<string, number> = {};
    allMatches.forEach(m => { counts[m.difficulty] = (counts[m.difficulty] || 0) + 1; });
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    return top ? top[0].charAt(0).toUpperCase() + top[0].slice(1) : 'N/A';
  }, [allMatches]);

  // Favorite opponent (most-played)
  const favOpponent = useMemo(() => {
    if (allMatches.length === 0) return null;
    const counts: Record<string, number> = {};
    allMatches.forEach(m => { counts[m.opponent] = (counts[m.opponent] || 0) + 1; });
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    return top ? { name: top[0], games: top[1] } : null;
  }, [allMatches]);

  // Share Profile handler
  const [shareCopied, setShareCopied] = useState(false);
  const handleShareProfile = async () => {
    haptics.tap();
    const playerName = useShopStore.getState().playerName;
    const title = getPlayerTitle(level, tier, coins);
    const tierInfo = RANKED_TIERS.find(t => t.id === tier) || RANKED_TIERS[0];
    const petName = equippedPet ? (getPetById(equippedPet)?.name ?? 'None') : 'None';
    const card = [
      '\uD83C\uDFAE Drop4 Player Card',
      `${playerName} (Lv.${level} ${title})`,
      `${tierInfo.icon} ${formatRank(elo)} \u2014 ${elo} ELO`,
      `\uD83D\uDCCA ${winRate}% Win Rate (${totalGames} games)`,
      `\u2B50 Favorite: ${favDifficulty}`,
      petName !== 'None' ? `\uD83D\uDC3E Pet: ${petName}` : null,
    ].filter(Boolean).join('\n');
    try {
      await Share.share({ message: card });
    } catch {}
  };

  // Map equipped IDs to display names
  const boardNames: Record<string, string> = {
    default: 'Classic Blue', wood: 'Wooden', neon: 'Neon Glow',
    galaxy: 'Galaxy', gold: 'Gold Court', ice: 'Ice Arena',
    lava: 'Lava Pit', darkmatter: 'Dark Matter',
  };
  const pieceNames: Record<string, string> = {
    classic: 'Classic', chrome: 'Chrome', fire_ice: 'Fire & Ice',
    neon: 'Neon', holo: 'Holographic', darkmatter: 'Dark Matter',
  };

  return (
    <ScreenBackground>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarSection}>
            {/* Outer glow ring */}
            <View style={styles.avatarGlow}>
              <LinearGradient
                colors={[colors.goldDark, colors.coinGold, colors.goldLight, colors.coinGold, colors.goldDark]}
                style={styles.avatarRingOuter}
              >
                <View style={styles.avatarRingGap}>
                  <LinearGradient
                    colors={['#d4ac0d', '#f1c40f', '#d4ac0d']}
                    style={styles.avatarRingInner}
                  >
                    <View style={styles.avatarInner}>
                      <CharacterAvatar size="large" variant="player" />
                    </View>
                  </LinearGradient>
                </View>
              </LinearGradient>
            </View>
            {equippedPet && (
              <PetDisplay petId={equippedPet} size={50} style={{ position: 'absolute', right: -10, bottom: -5 }} />
            )}
          </View>

          <Text style={styles.playerName}>{useShopStore.getState().playerName}</Text>

          {/* Player Title */}
          {(() => {
            const title = getPlayerTitle(level, tier, coins);
            const titleColor = getPlayerTitleColor(title);
            return (
              <View style={[styles.playerTitleBadge, { borderColor: `${titleColor}40` }]}>
                <Text style={[styles.playerTitleText, { color: titleColor }]}>{title}</Text>
              </View>
            );
          })()}

          {/* Prominent ranked tier badge */}
          {(() => {
            const tierInfo = RANKED_TIERS.find(t => t.id === tier) || RANKED_TIERS[0];
            return (
              <View style={[styles.rankBadgeRow, { borderColor: `${tierInfo.color}40` }]}>
                <Text style={styles.rankBadgeIcon}>{tierInfo.icon}</Text>
                <Text style={[styles.rankBadgeName, { color: tierInfo.color }]}>
                  {formatRank(elo)}
                </Text>
                <Text style={styles.rankBadgeElo}>{elo} ELO</Text>
              </View>
            );
          })()}

          <RankBadge size="small" showProgress style={{ marginTop: 4 }} />

          {/* Share Profile button */}
          <Pressable
            onPress={handleShareProfile}
            style={({ pressed }) => [styles.shareProfileBtn, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.shareProfileText}>{'\uD83D\uDCE4'} SHARE PROFILE</Text>
          </Pressable>

          {/* Level bar — chunky with XP inside */}
          <View style={styles.levelSection}>
            <Text style={styles.levelLabel}>Level {level}</Text>
            <View style={styles.xpBarChunky}>
              <LinearGradient
                colors={[colors.orange, '#ff6600', colors.coinGold]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.xpFillChunky, { width: `${Math.max(Math.min((xp / (level * 100)) * 100, 100), 8)}%` }]}
              >
                <Text style={styles.xpInsideText}>{xp} / {level * 100} XP</Text>
              </LinearGradient>
            </View>
            <Text style={styles.nextRewardHint}>
              Next reward at Level {level + 1}
            </Text>
          </View>
        </View>

        {/* Daily Goals */}
        <Text style={styles.sectionTitle}>DAILY GOALS</Text>
        <View style={styles.dailyGoalsCard}>
          <View style={styles.dailyGoalRow}>
            <Text style={styles.dailyGoalIcon}>🎮</Text>
            <Text style={styles.dailyGoalLabel}>Games played today</Text>
            <Text style={[styles.dailyGoalValue, dailyGoals.gamesToday > 0 && { color: colors.green }]}>
              {dailyGoals.gamesToday}
            </Text>
          </View>
          <View style={styles.dailyGoalRow}>
            <Text style={styles.dailyGoalIcon}>🎯</Text>
            <Text style={styles.dailyGoalLabel}>Challenges completed</Text>
            <Text style={[styles.dailyGoalValue, dailyGoals.completedChallenges >= 3 && { color: colors.green }]}>
              {dailyGoals.completedChallenges}/3
            </Text>
          </View>
          <View style={styles.dailyGoalRow}>
            <Text style={styles.dailyGoalIcon}>🎁</Text>
            <Text style={styles.dailyGoalLabel}>Daily reward claimed</Text>
            <Text style={[styles.dailyGoalCheck, dailyGoals.rewardClaimed && { color: colors.green }]}>
              {dailyGoals.rewardClaimed ? '✅' : '❌'}
            </Text>
          </View>
          <View style={[styles.dailyGoalRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.dailyGoalIcon}>🎰</Text>
            <Text style={styles.dailyGoalLabel}>Daily spin used</Text>
            <Text style={[styles.dailyGoalCheck, dailyGoals.spinUsed && { color: colors.green }]}>
              {dailyGoals.spinUsed ? '✅' : '❌'}
            </Text>
          </View>
        </View>

        {/* Coin Milestone */}
        <Text style={styles.sectionTitle}>COIN GOAL</Text>
        <View style={styles.milestoneCard}>
          {milestoneInfo.currentTitle && (
            <View style={styles.milestoneCurrentRow}>
              <Text style={styles.milestoneCurrentIcon}>{milestoneInfo.currentIcon}</Text>
              <Text style={styles.milestoneCurrentTitle}>{milestoneInfo.currentTitle}</Text>
            </View>
          )}
          {milestoneInfo.nextMilestone ? (
            <>
              <View style={styles.milestoneProgressOuter}>
                <LinearGradient
                  colors={[colors.coinGold, colors.orange]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.milestoneProgressFill, { width: `${Math.max(milestoneInfo.progress * 100, 4)}%` as any }]}
                />
              </View>
              <Text style={styles.milestoneNextText}>
                Next: {milestoneInfo.nextMilestone.icon} {milestoneInfo.nextMilestone.title} ({milestoneInfo.nextMilestone.coins.toLocaleString()} coins) — {milestoneInfo.coinsToGo.toLocaleString()} to go!
              </Text>
            </>
          ) : (
            <Text style={styles.milestoneMaxText}>All milestones achieved!</Text>
          )}
        </View>

        {/* Stats grid */}
        <Text style={styles.sectionTitle}>STATISTICS</Text>
        <View style={styles.statsGrid}>
          <StatCard label="Wins" value={scores.player1} color={colors.green} />
          <StatCard label="Losses" value={scores.player2} color={colors.pieceRed} />
          <StatCard label="Win Rate" value={`${winRate}%`} color={colors.orange} />
          <StatCard label="Games" value={totalGames} />
          <StatCard label="Coins" value={coins.toLocaleString()} color={colors.coinGold} />
          <StatCard label="Gems" value={gems} color={colors.gemGreen} />
        </View>

        {/* Favorite Opponent */}
        {favOpponent && (
          <View style={styles.favOpponentCard}>
            <Text style={styles.favOpponentIcon}>{'\uD83C\uDFAF'}</Text>
            <View style={styles.favOpponentTextWrap}>
              <Text style={styles.favOpponentLabel}>MOST PLAYED</Text>
              <Text style={styles.favOpponentName}>{favOpponent.name} <Text style={styles.favOpponentGames}>({favOpponent.games} game{favOpponent.games !== 1 ? 's' : ''})</Text></Text>
            </View>
          </View>
        )}

        {/* Equipped cosmetics */}
        <Text style={styles.sectionTitle}>EQUIPPED</Text>
        <View style={styles.equippedGrid}>
          <EquippedItem label="Board" name={boardNames[equipped.board] || equipped.board} rarity="common" />
          <EquippedItem label="Pieces" name={pieceNames[equipped.pieces] || equipped.pieces} rarity="common" />
          <EquippedItem label="Drop Effect" name="None" rarity="common" />
          <EquippedItem label="Win Animation" name="Basic" rarity="common" />
          <EquippedItem
            label="Pet"
            name={equippedPet ? (getPetById(equippedPet)?.name ?? 'None') : 'None'}
            rarity={equippedPet ? (getPetById(equippedPet)?.rarity ?? 'common') : 'common'}
          />
        </View>

        {/* Achievements */}
        <Text style={styles.sectionTitle}>ACHIEVEMENTS ({achievements.filter(a => a.unlocked).length}/{achievements.length})</Text>

        {/* Achievement Score */}
        <View style={styles.achievementScoreCard}>
          <Text style={styles.achievementScoreLabel}>Achievement Score</Text>
          <Text style={styles.achievementScoreValue}>
            {getAchievementScore(achievements)} / {getMaxAchievementPoints()} pts
          </Text>
        </View>

        {/* Achievement Progress Card */}
        {(() => {
          const unlocked = achievements.filter(a => a.unlocked).length;
          const total = achievements.length;
          const pct = total > 0 ? Math.round((unlocked / total) * 100) : 0;
          const nextAch = achievements.find(a => !a.unlocked);
          const progressWidth = `${Math.max(pct, 4)}%`;
          return (
            <View style={styles.achievementProgressCard}>
              {/* Progress bar */}
              <View style={styles.achProgressBarOuter}>
                <LinearGradient
                  colors={[colors.orange, colors.coinGold]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.achProgressBarFill, { width: progressWidth as any }]}
                />
              </View>
              <Text style={styles.achProgressPct}>
                {pct}% Complete {pct < 100 ? '— Keep playing to unlock more!' : '— All unlocked!'}
              </Text>
              {nextAch && (
                <View style={styles.achNextRow}>
                  <Text style={styles.achNextLabel}>Next:</Text>
                  <Text style={styles.achNextIcon}>{nextAch.icon}</Text>
                  <Text style={styles.achNextName}>{nextAch.description}</Text>
                  <Text style={styles.achNextReward}>
                    ({nextAch.name})
                  </Text>
                </View>
              )}
            </View>
          );
        })()}

        <View style={styles.achievementsList}>
          {achievements.map((ach) => (
            <View key={ach.id} style={[styles.achievementRow, ach.unlocked && styles.achievementDone]}>
              <Text style={styles.achievementIcon}>{ach.icon}</Text>
              <View style={styles.achievementInfo}>
                <Text style={[styles.achievementName, ach.unlocked && { color: colors.coinGold }]}>
                  {ach.name}
                </Text>
                <Text style={styles.achievementDesc}>{ach.description}</Text>
              </View>
              {ach.unlocked && <Text style={styles.checkmark}>✓</Text>}
            </View>
          ))}
        </View>

        {/* Ranked Progress */}
        <Text style={styles.sectionTitle}>RANKED PROGRESS</Text>
        <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
          <RankProgressCard />
        </View>

        {/* Streaks */}
        <Text style={styles.sectionTitle}>STREAKS</Text>
        <View style={styles.statsGrid}>
          <StatCard label="Current" value={winStreak > 0 ? `🔥 ${winStreak}` : '0'} color={colors.orange} />
          <StatCard label="Best" value={bestStreak} color={colors.coinGold} />
        </View>

        {/* Season History */}
        {seasonHistory.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>SEASON HISTORY</Text>
            <View style={styles.statsGrid}>
              {seasonHistory.map((s, i) => (
                <StatCard
                  key={i}
                  label={`S${s.season}`}
                  value={`${s.elo} ELO`}
                  color={RANKED_TIERS.find(t => t.id === s.tier)?.color || '#fff'}
                />
              ))}
            </View>
          </>
        )}

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>QUICK ACTIONS</Text>
        <View style={styles.quickActions}>
          <GlossyButton label="Season Pass" variant="purple" icon="⭐" small onPress={() => navigateTo('SeasonPass')} style={{ flex: 1 }} />
          <GlossyButton label="Challenges" variant="teal" icon="🎯" small onPress={() => navigateTo('Challenges')} style={{ flex: 1 }} />
        </View>
        <View style={[styles.quickActions, { marginTop: 0 }]}>
          <GlossyButton label="Replays" variant="navy" icon="🎬" small onPress={() => navigateTo('ReplayViewer')} style={{ flex: 1 }} />
          <GlossyButton label="Loot Boxes" variant="gold" icon="🎁" small onPress={() => navigateTo('LootBox')} style={{ flex: 1 }} />
        </View>
        <View style={[styles.quickActions, { marginTop: 0 }]}>
          <GlossyButton label="Match History" variant="orange" icon="📊" small onPress={() => navigateTo('MatchHistory')} style={{ flex: 1 }} />
          <GlossyButton label="Settings" variant="navy" icon="⚙️" small onPress={() => navigateTo('Settings')} style={{ flex: 1 }} />
        </View>
        <View style={[styles.quickActions, { marginTop: 0 }]}>
          <GlossyButton label="Stats" variant="navy" icon="📈" small onPress={() => navigateTo('Stats')} style={{ flex: 1 }} />
          <GlossyButton label="Collection" variant="gold" icon="🗂️" small onPress={() => navigateTo('Collection')} style={{ flex: 1 }} />
        </View>

        {/* Recent Activity */}
        {(() => {
          const activities: { icon: string; text: string; color: string }[] = [];
          // Build from match history
          if (allMatches.length > 0) {
            const last = allMatches[0];
            if (last.result === 'win') {
              activities.push({ icon: '🏆', text: `Won vs ${last.opponent} (+${last.coinsEarned} coins)`, color: colors.green });
            } else if (last.result === 'loss') {
              activities.push({ icon: '💔', text: `Lost vs ${last.opponent}`, color: colors.pieceRed });
            } else {
              activities.push({ icon: '🤝', text: `Draw vs ${last.opponent}`, color: colors.textSecondary });
            }
          }
          // Level milestone
          if (level > 1) {
            activities.push({ icon: '📈', text: `Reached Level ${level}!`, color: colors.orange });
          }
          // Achievement progress
          const unlockedAch = achievements.filter(a => a.unlocked);
          if (unlockedAch.length > 0) {
            const lastAch = unlockedAch[unlockedAch.length - 1];
            activities.push({ icon: lastAch.icon, text: `Unlocked "${lastAch.name}"`, color: colors.coinGold });
          }
          // Coin balance hint
          if (coins >= 1000) {
            activities.push({ icon: '💰', text: `Sitting on ${coins.toLocaleString()} coins`, color: colors.coinGold });
          }
          const display = activities.slice(0, 3);
          if (display.length === 0) return null;
          return (
            <>
              <Text style={styles.sectionTitle}>RECENT ACTIVITY</Text>
              <View style={styles.activityList}>
                {display.map((a, i) => (
                  <View key={i} style={styles.activityRow}>
                    <Text style={styles.activityIcon}>{a.icon}</Text>
                    <Text style={[styles.activityText, { color: a.color }]} numberOfLines={1}>{a.text}</Text>
                  </View>
                ))}
              </View>
            </>
          );
        })()}

        {/* Match History */}
        {recentMatches.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>RECENT MATCHES</Text>
              <Pressable onPress={() => { haptics.tap(); navigateTo('MatchHistory'); }}>
                <Text style={styles.viewAllLink}>View All →</Text>
              </Pressable>
            </View>
            <View style={styles.matchList}>
              {recentMatches.map(match => (
                <View key={match.id} style={styles.matchRow}>
                  <Text style={[styles.matchResult, {
                    color: match.result === 'win' ? colors.green : match.result === 'loss' ? colors.pieceRed : colors.textSecondary,
                  }]}>
                    {match.result === 'win' ? 'W' : match.result === 'loss' ? 'L' : 'D'}
                  </Text>
                  <View style={styles.matchInfo}>
                    <Text style={styles.matchOpponent}>vs {match.opponent}</Text>
                    <Text style={styles.matchMeta}>{match.moves} moves</Text>
                  </View>
                  {match.coinsEarned > 0 && (
                    <Text style={styles.matchCoins}>+{match.coinsEarned} 🪙</Text>
                  )}
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: 16,
    paddingBottom: 100,
  },
  profileHeader: {
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  avatarSection: {
    marginBottom: 12,
  },
  avatarGlow: {
    shadowColor: colors.coinGold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 12,
  },
  avatarRingOuter: {
    width: 120,
    height: 120,
    borderRadius: 60,
    padding: 3,
  },
  avatarRingGap: {
    width: '100%',
    height: '100%',
    borderRadius: 57,
    backgroundColor: '#0a0e27',
    padding: 3,
  },
  avatarRingInner: {
    width: '100%',
    height: '100%',
    borderRadius: 54,
    padding: 3,
  },
  avatarInner: {
    width: '100%',
    height: '100%',
    borderRadius: 51,
    backgroundColor: '#1a1a3a',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  playerName: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 28,
    color: '#ffffff',
  },
  playerTitleBadge: {
    marginTop: 2,
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  playerTitleText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 13,
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
  },
  achievementScoreCard: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(241,196,15,0.15)',
  },
  achievementScoreLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 14,
    color: colors.textSecondary,
  },
  achievementScoreValue: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 16,
    color: colors.coinGold,
  },
  rankBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginTop: 6,
    borderWidth: 1,
  },
  rankBadgeIcon: { fontSize: 20 },
  rankBadgeName: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 16,
  },
  rankBadgeElo: {
    fontFamily: fonts.body,
    fontWeight: weight.regular,
    fontSize: 12,
    color: colors.textSecondary,
  },
  levelSection: {
    width: '100%',
    maxWidth: 300,
    marginTop: 14,
    alignItems: 'center',
  },
  levelLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 14,
    color: '#ffffff',
    marginBottom: 6,
  },
  xpBarChunky: {
    width: '100%',
    height: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    overflow: 'hidden',
  },
  xpFillChunky: {
    height: '100%',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
  },
  xpInsideText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 10,
    color: '#ffffff',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  nextRewardHint: {
    fontFamily: fonts.body,
    fontWeight: weight.medium,
    fontSize: 11,
    color: colors.textSecondary,
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
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 16,
  },
  statCard: {
    width: '30%',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  statValue: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 22,
    marginBottom: 2,
  },
  statLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.regular,
    fontSize: 10,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  equippedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 16,
  },
  equippedItem: {
    width: '47%',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  equippedLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.regular,
    fontSize: 10,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  equippedName: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 14,
  },
  achievementsList: {
    paddingHorizontal: 16,
    gap: 6,
  },
  achievementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    opacity: 0.5,
  },
  achievementDone: {
    opacity: 1,
    borderColor: 'rgba(255,209,102,0.2)',
    backgroundColor: 'rgba(255,209,102,0.05)',
  },
  achievementIcon: {
    fontSize: 24,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementName: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 14,
    color: '#ffffff',
  },
  achievementDesc: {
    fontFamily: fonts.body,
    fontWeight: weight.regular,
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  checkmark: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 18,
    color: colors.green,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 16,
    marginBottom: 10,
  },
  matchList: {
    paddingHorizontal: 16,
    gap: 4,
    marginBottom: 16,
  },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 10,
    padding: 10,
    gap: 10,
  },
  matchResult: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 18,
    width: 24,
    textAlign: 'center',
  },
  matchInfo: {
    flex: 1,
  },
  matchOpponent: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 13,
    color: '#ffffff',
  },
  matchMeta: {
    fontFamily: fonts.body,
    fontWeight: weight.regular,
    fontSize: 10,
    color: colors.textSecondary,
  },
  matchCoins: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 12,
    color: colors.coinGold,
  },
  viewAllLink: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 13,
    color: colors.orange,
  },
  // Favorite Opponent card
  favOpponentCard: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: 'rgba(255,140,0,0.06)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,140,0,0.15)',
    gap: 10,
  },
  favOpponentIcon: {
    fontSize: 22,
  },
  favOpponentTextWrap: {
    flex: 1,
  },
  favOpponentLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 9,
    color: colors.textMuted,
    letterSpacing: 1.5,
    textTransform: 'uppercase' as const,
  },
  favOpponentName: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 15,
    color: colors.orange,
    marginTop: 1,
  },
  favOpponentGames: {
    fontFamily: fonts.body,
    fontWeight: weight.regular,
    fontSize: 12,
    color: colors.textSecondary,
  },
  // Achievement progress card
  achievementProgressCard: {
    marginHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,209,102,0.12)',
  },
  achProgressBarOuter: {
    width: '100%',
    height: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 8,
  },
  achProgressBarFill: {
    height: '100%',
    borderRadius: 6,
  },
  achProgressPct: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  achNextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  achNextLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 11,
    color: colors.orange,
  },
  achNextIcon: {
    fontSize: 14,
  },
  achNextName: {
    fontFamily: fonts.body,
    fontWeight: weight.medium,
    fontSize: 11,
    color: '#ffffff',
    flex: 1,
  },
  achNextReward: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 10,
    color: colors.coinGold,
  },
  // Coin Milestone
  milestoneCard: {
    marginHorizontal: 16,
    backgroundColor: 'rgba(255,215,0,0.06)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.15)',
  },
  milestoneCurrentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  milestoneCurrentIcon: {
    fontSize: 18,
  },
  milestoneCurrentTitle: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 14,
    color: colors.coinGold,
    letterSpacing: 0.5,
  },
  milestoneProgressOuter: {
    width: '100%',
    height: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 8,
  },
  milestoneProgressFill: {
    height: '100%',
    borderRadius: 5,
  },
  milestoneNextText: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 11,
    color: colors.textSecondary,
  },
  milestoneMaxText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 12,
    color: colors.coinGold,
    textAlign: 'center',
  },

  // Daily Goals
  dailyGoalsCard: {
    marginHorizontal: 16,
    backgroundColor: 'rgba(100,180,255,0.06)',
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(100,180,255,0.15)',
  },
  dailyGoalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  dailyGoalIcon: {
    fontSize: 16,
  },
  dailyGoalLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.medium,
    fontSize: 13,
    color: '#ffffff',
    flex: 1,
  },
  dailyGoalValue: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 15,
    color: colors.textSecondary,
  },
  dailyGoalCheck: {
    fontSize: 16,
  },

  // Share Profile button
  shareProfileBtn: {
    marginTop: 10,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,150,0,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,150,0,0.3)',
  },
  shareProfileText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold as any,
    fontSize: 12,
    color: colors.orange,
    letterSpacing: 1.5,
  },

  // Recent Activity
  activityList: {
    marginHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  activityIcon: {
    fontSize: 18,
  },
  activityText: {
    fontFamily: fonts.body,
    fontWeight: weight.medium,
    fontSize: 13,
    flex: 1,
  },
});
