import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { useChallengeStore, Challenge } from '../stores/challengeStore';
import { useMatchHistoryStore } from '../stores/matchHistoryStore';
import { useCareerStore } from '../stores/careerStore';
import { useAchievementStore, Achievement, AchievementDifficulty, getAchievementScore, getMaxAchievementPoints } from '../stores/achievementStore';
import { haptics } from '../services/haptics';
import { playSound } from '../services/audio';
import { colors } from '../theme/colors';
import { fonts, weight } from '../theme/typography';
import { PressScale, StaggeredEntry, PulseGlow } from '../components/animations';

// ── Challenge type → icon color mapping ──────────────────────────────
const ICON_COLORS: Record<string, [string, string]> = {
  '🏆': ['#f4a623', '#e08d00'],
  '⭐': ['#f1c40f', '#d4ac0d'],
  '⭐⭐': ['#3498db', '#2176ae'],
  '⭐⭐⭐': ['#9b59b6', '#7d4192'],
  '🎮': ['#1abc9c', '#15967d'],
  '🎯': ['#e74c3c', '#c0392b'],
  '🔥': ['#ff6b35', '#cc5500'],
  '⚡': ['#f39c12', '#d68910'],
  '👥': ['#27ae60', '#1e8a4e'],
  '🛍': ['#e84393', '#c23076'],
};

function getIconColors(icon: string): [string, string] {
  return ICON_COLORS[icon] || [colors.orange, colors.orangeDark];
}

// ── Individual Challenge Card ────────────────────────────────────────
function ChallengeCard({ challenge, onClaim }: { challenge: Challenge; onClaim: () => void }) {
  const canClaim = challenge.progress >= challenge.target && !challenge.completed;
  const progressPct = Math.min((challenge.progress / challenge.target) * 100, 100);
  const iconColors = getIconColors(challenge.icon);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (canClaim) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.04, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [canClaim, pulseAnim]);

  return (
    <Animated.View style={[
      styles.card,
      challenge.completed && styles.cardDone,
      canClaim && styles.cardReady,
      canClaim && { transform: [{ scale: pulseAnim }] },
    ]}>
      {/* Green completed overlay */}
      {challenge.completed && (
        <View style={styles.cardDoneOverlay}>
          <LinearGradient
            colors={['rgba(39,174,61,0.08)', 'rgba(39,174,61,0.03)']}
            style={StyleSheet.absoluteFill}
          />
        </View>
      )}

      <View style={styles.cardRow}>
        {/* Left: colored icon circle */}
        <LinearGradient colors={iconColors} style={styles.iconCircle}>
          <Text style={styles.iconEmoji}>{challenge.icon}</Text>
          {challenge.completed && (
            <View style={styles.iconCheckOverlay}>
              <Text style={styles.iconCheckMark}>✓</Text>
            </View>
          )}
        </LinearGradient>

        {/* Center: title, description, progress */}
        <View style={styles.cardCenter}>
          <Text style={[styles.cardTitle, challenge.completed && styles.cardTitleDone]}>
            {challenge.title}
          </Text>
          <Text style={styles.cardDesc}>{challenge.description}</Text>

          {/* Chunky progress bar */}
          <View style={styles.progressRow}>
            <View style={styles.progressBg}>
              <LinearGradient
                colors={
                  challenge.completed
                    ? ['#27ae3d', '#1e8a30']
                    : canClaim
                      ? ['#34c94d', '#27ae3d']
                      : [colors.orange, '#ff6600']
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressFill, { width: `${progressPct}%` }]}
              />
            </View>
            <Text style={[styles.progressText, challenge.completed && { color: colors.green }]}>
              {challenge.progress}/{challenge.target}
            </Text>
          </View>
        </View>

        {/* Right: reward coin bubble or claim/done badge */}
        <View style={styles.cardRight}>
          {canClaim ? (
            <PulseGlow color="#27ae3d" size={36} active={canClaim}>
            <Pressable
              onPress={onClaim}
              style={styles.claimBtnSmall}
              accessibilityRole="button"
              accessibilityLabel={`Claim reward for ${challenge.title}`}
            >
              <LinearGradient
                colors={['#34c94d', '#27ae3d', '#1e8a30']}
                style={styles.claimBtnGradient}
              >
                <Text style={styles.claimBtnText}>CLAIM</Text>
              </LinearGradient>
            </Pressable>
            </PulseGlow>
          ) : challenge.completed ? (
            <View style={styles.doneBadge}>
              <Text style={styles.doneBadgeCheck}>✓</Text>
            </View>
          ) : (
            <View style={styles.rewardBubble}>
              <Text style={styles.rewardCoin}>🪙</Text>
              <Text style={styles.rewardAmount}>{challenge.reward}</Text>
            </View>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

// ── Collapsible Achievement Group ───────────────────────────────────
const DIFFICULTY_META: Record<AchievementDifficulty, { label: string; colors: [string, string]; icon: string }> = {
  common:  { label: 'COMMON',  colors: ['#3498db', '#2176ae'], icon: '🔵' },
  rare:    { label: 'RARE',    colors: ['#9b59b6', '#7d4192'], icon: '🟣' },
  hard:    { label: 'LEGENDARY', colors: ['#f4a623', '#e08d00'], icon: '🟡' },
};

function AchievementGroup({ difficulty, achievements }: { difficulty: AchievementDifficulty; achievements: Achievement[] }) {
  const [expanded, setExpanded] = useState(false);
  const meta = DIFFICULTY_META[difficulty];
  const unlocked = achievements.filter(a => a.unlocked).length;
  const total = achievements.length;
  const allDone = unlocked === total;

  return (
    <View style={styles.achGroup}>
      <Pressable
        onPress={() => { haptics.tap(); setExpanded(!expanded); }}
        style={styles.achGroupHeader}
        accessibilityRole="button"
        accessibilityLabel={`${meta.label} achievements, ${unlocked} of ${total} unlocked`}
        accessibilityState={{ expanded }}
      >
        <PressScale>
        <LinearGradient
          colors={[`${meta.colors[0]}20`, `${meta.colors[1]}08`]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.achGroupHeaderGradient}
        >
          <Text style={styles.achGroupIcon}>{meta.icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.achGroupLabel, { color: meta.colors[0] }]}>{meta.label}</Text>
            <Text style={styles.achGroupCount}>{unlocked}/{total} unlocked</Text>
          </View>
          {allDone && <Text style={styles.achGroupDoneCheck}>✓</Text>}
          <Text style={[styles.achGroupChevron, { color: meta.colors[0] }]}>
            {expanded ? '▲' : '▼'}
          </Text>
        </LinearGradient>
        </PressScale>
      </Pressable>

      {expanded && (
        <View style={styles.achGroupList}>
          {achievements.map((ach) => (
            <View key={ach.id} style={[styles.achRow, ach.unlocked && styles.achRowDone]}>
              <Text style={styles.achRowIcon}>{ach.icon}</Text>
              <View style={styles.achRowInfo}>
                <Text style={[styles.achRowName, ach.unlocked && { color: colors.coinGold }]}>
                  {ach.name}
                </Text>
                <Text style={styles.achRowDesc}>{ach.description}</Text>
                {ach.reward.type === 'coins' && !ach.unlocked && (
                  <Text style={styles.achRowReward}>🪙 {ach.reward.value}</Text>
                )}
                {ach.reward.type === 'title' && (
                  <Text style={[styles.achRowReward, { color: meta.colors[0] }]}>
                    🏷️ "{ach.reward.value}"
                  </Text>
                )}
              </View>
              {ach.unlocked ? (
                <View style={[styles.achCheckBadge, { borderColor: `${meta.colors[0]}50`, backgroundColor: `${meta.colors[0]}15` }]}>
                  <Text style={[styles.achCheckMark, { color: meta.colors[0] }]}>✓</Text>
                </View>
              ) : (
                <View style={styles.achLockedBadge}>
                  <Text style={styles.achLockedIcon}>🔒</Text>
                </View>
              )}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ── Achievements Section (collapsible by difficulty) ────────────────
function AchievementsSection() {
  const achievements = useAchievementStore(s => s.achievements);
  const score = getAchievementScore(achievements);
  const maxScore = getMaxAchievementPoints();
  const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  const unlocked = achievements.filter(a => a.unlocked).length;

  const common = achievements.filter(a => a.difficulty === 'common');
  const rare = achievements.filter(a => a.difficulty === 'rare');
  const hard = achievements.filter(a => a.difficulty === 'hard');

  return (
    <View style={styles.achSection}>
      <LinearGradient
        colors={['rgba(244,166,35,0.15)', 'rgba(244,166,35,0.04)', 'transparent']}
        style={styles.achHeaderGradient}
      >
        <Text style={styles.achTitle} accessibilityRole="header">ACHIEVEMENTS</Text>
        <Text style={styles.achSubtitle}>{unlocked}/{achievements.length} unlocked · {score} pts</Text>
      </LinearGradient>

      {/* Score progress bar */}
      <View style={styles.achScoreBar}>
        <View style={styles.achScoreBarBg}>
          <LinearGradient
            colors={[colors.orange, colors.coinGold]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.achScoreBarFill, { width: `${Math.max(pct, 3)}%` }]}
          />
        </View>
        <Text style={styles.achScorePct}>{pct}%</Text>
      </View>

      {/* Collapsible groups */}
      <AchievementGroup difficulty="common" achievements={common} />
      <AchievementGroup difficulty="rare" achievements={rare} />
      <AchievementGroup difficulty="hard" achievements={hard} />
    </View>
  );
}

// ── Main Screen ──────────────────────────────────────────────────────
export function ChallengesScreen() {
  const { challenges, claimReward, claimDailyBonus, claimWeeklyReward, refreshChallenges, lastRefresh, bonusClaimed, weeklyClaimed } = useChallengeStore();
  const hasAutoRefreshed = useRef(false);
  const glowAnim = useRef(new Animated.Value(0)).current;

  // Weekly progress — wins this week + career completions
  const matches = useMatchHistoryStore(s => s.matches);
  const careerCompletedCount = useCareerStore(s => s.getCompletedCount());

  const weeklyWins = useMemo(() => {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7)); // Monday
    weekStart.setHours(0, 0, 0, 0);
    return matches.filter(m => m.result === 'win' && m.timestamp >= weekStart.getTime()).length;
  }, [matches]);

  // Daily auto-refresh: if lastRefresh date differs from today, refresh challenges
  useEffect(() => {
    if (hasAutoRefreshed.current) return;
    const lastDate = new Date(lastRefresh).toDateString();
    const today = new Date().toDateString();
    if (lastDate !== today) {
      refreshChallenges();
    }
    hasAutoRefreshed.current = true;
  }, [lastRefresh, refreshChallenges]);

  const handleClaim = (challengeId: string) => {
    const reward = claimReward(challengeId);
    if (reward > 0) {
      haptics.win();
      playSound('coin');
    }
  };

  const handleClaimBonus = () => {
    const claimed = claimDailyBonus();
    if (claimed) {
      haptics.win();
      playSound('coin');
    }
  };

  const handleClaimWeekly = (id: string, amount: number) => {
    const claimed = claimWeeklyReward(id, amount);
    if (claimed) {
      haptics.win();
      playSound('coin');
    }
  };

  const totalCount = challenges.length;
  const completedCount = challenges.filter(c => c.completed).length;
  const allComplete = completedCount === totalCount && totalCount > 0;
  const bagProgressPct = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  // Glow pulse when all complete
  useEffect(() => {
    if (allComplete && !bonusClaimed) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 1000, useNativeDriver: false }),
          Animated.timing(glowAnim, { toValue: 0, duration: 1000, useNativeDriver: false }),
        ])
      ).start();
    }
  }, [allComplete, bonusClaimed, glowAnim]);

  const bagGlowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.6],
  });

  return (
    <ScreenBackground>
      <ScrollView
        style={styles.scrollRoot}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* ══ HEADER SECTION ══ */}
        <LinearGradient
          colors={['rgba(255,140,0,0.15)', 'rgba(255,100,0,0.06)', 'transparent']}
          style={styles.headerGradient}
        >
          <Text style={styles.title} accessibilityRole="header">DAILY CHALLENGES</Text>
          <Text style={styles.subtitle}>Complete challenges to earn a reward bag!</Text>
        </LinearGradient>

        {/* ══ REWARD BAG PROGRESS ══ */}
        <View style={styles.bagSection}>
          <View style={styles.bagRow}>
            <View style={styles.bagInfo}>
              <Text style={styles.bagLabel}>
                {allComplete && !bonusClaimed
                  ? 'ALL CHALLENGES DONE!'
                  : 'CHALLENGE BAG PROGRESS'}
              </Text>
              <Text style={styles.bagCount}>{completedCount}/{totalCount} challenges</Text>
            </View>
            <View style={styles.bagIconWrap}>
              <Text style={styles.bagEmoji}>🎁</Text>
              {allComplete && !bonusClaimed && (
                <Animated.View style={[styles.bagGlow, { opacity: bagGlowOpacity }]} />
              )}
            </View>
          </View>

          {/* Chunky bag progress bar */}
          <View style={styles.bagProgressBg}>
            <LinearGradient
              colors={allComplete ? ['#34c94d', '#27ae3d'] : [colors.orange, '#ff6600']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.bagProgressFill, { width: `${bagProgressPct}%` }]}
            />
            {/* Progress dots */}
            {Array.from({ length: totalCount }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.bagDot,
                  { left: `${((i + 1) / totalCount) * 100}%` },
                  i < completedCount && styles.bagDotFilled,
                ]}
              />
            ))}
          </View>

          {/* Claim reward bag button */}
          {allComplete && !bonusClaimed && (
            <PulseGlow color="#27ae3d" size={50} active>
            <Pressable
              onPress={() => { haptics.tap(); handleClaimBonus(); }}
              style={styles.claimBagBtn}
              accessibilityRole="button"
              accessibilityLabel="Claim daily reward bag, 200 coins"
            >
              <LinearGradient
                colors={['#34c94d', '#27ae3d', '#1e8a30']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.claimBagGradient}
              >
                <Text style={styles.claimBagIcon}>🎁</Text>
                <Text style={styles.claimBagText}>CLAIM REWARD BAG!</Text>
                <Text style={styles.claimBagCoins}>🪙 200</Text>
              </LinearGradient>
            </Pressable>
            </PulseGlow>
          )}
          {bonusClaimed && (
            <View style={styles.bagClaimedRow}>
              <Text style={styles.bagClaimedText}>✓ REWARD BAG CLAIMED</Text>
            </View>
          )}
        </View>

        {/* ══ CHALLENGE CARDS ══ */}
        <View style={styles.cardList}>
          {challenges.map((challenge, i) => (
            <StaggeredEntry key={challenge.id} index={i}>
            <ChallengeCard
              challenge={challenge}
              onClaim={() => handleClaim(challenge.id)}
            />
            </StaggeredEntry>
          ))}
        </View>

        {/* ══ WEEKLY CHALLENGES ══ */}
        <View style={styles.weeklySection}>
          <LinearGradient
            colors={['rgba(155,89,182,0.15)', 'rgba(155,89,182,0.04)', 'transparent']}
            style={styles.weeklyHeaderGradient}
          >
            <Text style={styles.weeklyTitle} accessibilityRole="header">WEEKLY CHALLENGES</Text>
            <Text style={styles.weeklySubtitle}>Bigger goals, bigger rewards</Text>
          </LinearGradient>

          {/* Weekly Challenge 1: Win 20 games this week */}
          {(() => {
            const target = 20;
            const progress = Math.min(weeklyWins, target);
            const pct = (progress / target) * 100;
            const done = progress >= target;
            const claimed = weeklyClaimed['wins20'] ?? false;
            const canClaim = done && !claimed;
            return (
              <View style={[styles.weeklyCard, (done || canClaim) && { borderColor: 'rgba(155,89,182,0.4)' }]}>
                <View style={styles.cardRow}>
                  <LinearGradient colors={(done || claimed) ? ['#7d4192', '#5a2d70'] : ['#9b59b6', '#7d4192']} style={styles.iconCircle}>
                    <Text style={styles.iconEmoji}>🏆</Text>
                    {claimed && (
                      <View style={styles.iconCheckOverlay}>
                        <Text style={styles.iconCheckMark}>✓</Text>
                      </View>
                    )}
                  </LinearGradient>
                  <View style={styles.cardCenter}>
                    <Text style={[styles.cardTitle, claimed && styles.cardTitleDone]}>Win 20 games this week</Text>
                    <Text style={styles.cardDesc}>Dominate across any difficulty</Text>
                    <View style={styles.progressRow}>
                      <View style={styles.progressBg}>
                        <LinearGradient
                          colors={claimed ? ['#27ae3d', '#1e8a30'] : ['#9b59b6', '#7d4192']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={[styles.progressFill, { width: `${pct}%` }]}
                        />
                      </View>
                      <Text style={[styles.progressText, claimed && { color: colors.green }]}>{progress}/{target}</Text>
                    </View>
                  </View>
                  <View style={styles.cardRight}>
                    {canClaim ? (
                      <Pressable
                        onPress={() => handleClaimWeekly('wins20', 1000)}
                        style={styles.claimBtnSmall}
                        accessibilityRole="button"
                        accessibilityLabel="Claim weekly reward, 1000 coins for winning 20 games"
                      >
                        <LinearGradient colors={['#9b59b6', '#7d4192', '#5a2d70']} style={styles.claimBtnGradient}>
                          <Text style={styles.claimBtnText}>CLAIM</Text>
                        </LinearGradient>
                      </Pressable>
                    ) : claimed ? (
                      <View style={styles.doneBadge}>
                        <Text style={styles.doneBadgeCheck}>✓</Text>
                      </View>
                    ) : (
                      <View style={[styles.rewardBubble, { borderColor: 'rgba(155,89,182,0.3)', backgroundColor: 'rgba(155,89,182,0.12)' }]}>
                        <Text style={styles.rewardCoin}>🪙</Text>
                        <Text style={[styles.rewardAmount, { color: '#b06cc7' }]}>1,000</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            );
          })()}

          {/* Weekly Challenge 2: Complete 5 career levels */}
          {(() => {
            const target = 5;
            const progress = Math.min(careerCompletedCount, target);
            const pct = (progress / target) * 100;
            const done = progress >= target;
            const claimed = weeklyClaimed['career5'] ?? false;
            const canClaim = done && !claimed;
            return (
              <View style={[styles.weeklyCard, (done || canClaim) && { borderColor: 'rgba(232,67,147,0.4)' }]}>
                <View style={styles.cardRow}>
                  <LinearGradient colors={(done || claimed) ? ['#c23076', '#8e1f54'] : ['#e84393', '#c23076']} style={styles.iconCircle}>
                    <Text style={styles.iconEmoji}>⭐</Text>
                    {claimed && (
                      <View style={styles.iconCheckOverlay}>
                        <Text style={styles.iconCheckMark}>✓</Text>
                      </View>
                    )}
                  </LinearGradient>
                  <View style={styles.cardCenter}>
                    <Text style={[styles.cardTitle, claimed && styles.cardTitleDone]}>Complete 5 career levels</Text>
                    <Text style={styles.cardDesc}>Push through the career map</Text>
                    <View style={styles.progressRow}>
                      <View style={styles.progressBg}>
                        <LinearGradient
                          colors={claimed ? ['#27ae3d', '#1e8a30'] : ['#e84393', '#c23076']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={[styles.progressFill, { width: `${pct}%` }]}
                        />
                      </View>
                      <Text style={[styles.progressText, claimed && { color: colors.green }]}>{progress}/{target}</Text>
                    </View>
                  </View>
                  <View style={styles.cardRight}>
                    {canClaim ? (
                      <Pressable
                        onPress={() => handleClaimWeekly('career5', 2000)}
                        style={styles.claimBtnSmall}
                        accessibilityRole="button"
                        accessibilityLabel="Claim weekly reward, 2000 coins for completing 5 career levels"
                      >
                        <LinearGradient colors={['#e84393', '#c23076', '#8e1f54']} style={styles.claimBtnGradient}>
                          <Text style={styles.claimBtnText}>CLAIM</Text>
                        </LinearGradient>
                      </Pressable>
                    ) : claimed ? (
                      <View style={styles.doneBadge}>
                        <Text style={styles.doneBadgeCheck}>✓</Text>
                      </View>
                    ) : (
                      <View style={[styles.rewardBubble, { borderColor: 'rgba(232,67,147,0.3)', backgroundColor: 'rgba(232,67,147,0.12)' }]}>
                        <Text style={styles.rewardCoin}>🪙</Text>
                        <Text style={[styles.rewardAmount, { color: '#e84393' }]}>2,000</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            );
          })()}
        </View>

        {/* ══ DAILY BONUS CARD ══ */}
        <Animated.View style={[
          styles.bonusCard,
          allComplete && !bonusClaimed && styles.bonusActive,
          bonusClaimed && styles.bonusClaimed,
        ]}>
          <LinearGradient
            colors={
              bonusClaimed
                ? ['rgba(39,174,61,0.08)', 'rgba(39,174,61,0.03)']
                : allComplete
                  ? ['rgba(255,209,102,0.15)', 'rgba(255,140,0,0.08)']
                  : ['rgba(255,255,255,0.03)', 'rgba(255,255,255,0.01)']
            }
            style={styles.bonusGradient}
          >
            <View style={styles.bonusLeft}>
              <View style={styles.bonusBadge}>
                <Text style={styles.bonusBadgeText}>
                  {bonusClaimed ? '✓' : `${completedCount}/${totalCount}`}
                </Text>
              </View>
            </View>
            <View style={styles.bonusCenter}>
              <Text style={[styles.bonusTitle, bonusClaimed && styles.bonusTitleDone]}>
                {bonusClaimed ? 'BONUS CLAIMED!' : `COMPLETE ALL ${totalCount}`}
              </Text>
              <Text style={styles.bonusDesc}>
                {bonusClaimed ? 'Come back tomorrow for new challenges' : 'Finish every challenge for a big bonus'}
              </Text>
            </View>
            <View style={styles.bonusRight}>
              <Text style={styles.bonusCoinIcon}>🪙</Text>
              <Text style={[styles.bonusCoinAmount, bonusClaimed && { color: colors.green }]}>200</Text>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* ══ ACHIEVEMENTS ══ */}
        <AchievementsSection />
      </ScrollView>
    </ScreenBackground>
  );
}

// ══════════════════════════════════════════════════════════════════════
// STYLES
// ══════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  scrollRoot: {
    flex: 1,
  },
  container: {
    paddingTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 100,
  },

  // ── Header ─────────────────────────────────────────────────────────
  headerGradient: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 14,
    marginHorizontal: -16,
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  title: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 28,
    color: '#ffffff',
    letterSpacing: 3,
    textShadowColor: 'rgba(255,140,0,0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontWeight: weight.medium,
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
  },

  // ── Reward Bag Section ─────────────────────────────────────────────
  bagSection: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 18,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255,140,0,0.12)',
  },
  bagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  bagInfo: {
    flex: 1,
  },
  bagLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 11,
    color: colors.orange,
    letterSpacing: 1.5,
  },
  bagCount: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  bagIconWrap: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bagEmoji: {
    fontSize: 32,
  },
  bagGlow: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(39,174,61,0.35)',
  },
  bagProgressBg: {
    height: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 5,
    overflow: 'hidden',
    position: 'relative',
  },
  bagProgressFill: {
    height: '100%',
    borderRadius: 5,
  },
  bagDot: {
    position: 'absolute',
    top: -1,
    width: 3,
    height: 12,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginLeft: -1.5,
  },
  bagDotFilled: {
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  claimBagBtn: {
    marginTop: 12,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#27ae3d',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  claimBagGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
    borderRadius: 14,
  },
  claimBagIcon: {
    fontSize: 20,
  },
  claimBagText: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 16,
    color: '#ffffff',
    letterSpacing: 1.5,
  },
  claimBagCoins: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
  },
  bagClaimedRow: {
    marginTop: 10,
    alignItems: 'center',
  },
  bagClaimedText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 12,
    color: colors.green,
    letterSpacing: 1,
  },

  // ── Weekly Challenges ──────────────────────────────────────────────
  weeklySection: {
    marginTop: 20,
    gap: 10,
  },
  weeklyHeaderGradient: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 10,
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  weeklyTitle: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 22,
    color: '#ffffff',
    letterSpacing: 2.5,
    textShadowColor: 'rgba(155,89,182,0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  weeklySubtitle: {
    fontFamily: fonts.body,
    fontWeight: weight.medium,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 3,
  },
  weeklyCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(155,89,182,0.15)',
    overflow: 'hidden',
  },

  // ── Challenge Cards ────────────────────────────────────────────────
  cardList: {
    gap: 10,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  cardReady: {
    borderColor: 'rgba(39,174,61,0.4)',
    shadowColor: '#27ae3d',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  cardDone: {
    borderColor: 'rgba(39,174,61,0.15)',
  },
  cardDoneOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 18,
    overflow: 'hidden',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  // ── Icon Circle ────────────────────────────────────────────────────
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  iconEmoji: {
    fontSize: 22,
  },
  iconCheckOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 25,
    backgroundColor: 'rgba(39,174,61,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCheckMark: {
    fontSize: 22,
    color: '#ffffff',
    fontWeight: '900',
  },

  // ── Card Center (title + desc + progress) ──────────────────────────
  cardCenter: {
    flex: 1,
  },
  cardTitle: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 15,
    color: '#ffffff',
    letterSpacing: 0.3,
  },
  cardTitleDone: {
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  cardDesc: {
    fontFamily: fonts.body,
    fontWeight: weight.regular,
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
    marginBottom: 6,
  },

  // ── Progress Bar (chunky 8px) ──────────────────────────────────────
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressBg: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 12,
    color: colors.textSecondary,
    width: 30,
    textAlign: 'right',
  },

  // ── Card Right (reward / claim / done) ─────────────────────────────
  cardRight: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 52,
  },
  rewardBubble: {
    backgroundColor: 'rgba(255,215,0,0.12)',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.2)',
  },
  rewardCoin: {
    fontSize: 16,
  },
  rewardAmount: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 13,
    color: colors.coinGold,
    marginTop: 1,
  },
  claimBtnSmall: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#27ae3d',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  claimBtnGradient: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignItems: 'center',
    borderRadius: 12,
  },
  claimBtnText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 12,
    color: '#ffffff',
    letterSpacing: 1,
  },
  doneBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(39,174,61,0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(39,174,61,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBadgeCheck: {
    fontSize: 18,
    color: colors.green,
    fontWeight: '900',
  },

  // ── Daily Bonus Card ───────────────────────────────────────────────
  bonusCard: {
    marginTop: 16,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.06)',
    opacity: 0.5,
  },
  bonusActive: {
    opacity: 1,
    borderColor: 'rgba(255,209,102,0.4)',
    shadowColor: colors.coinGold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  bonusClaimed: {
    opacity: 0.7,
    borderColor: 'rgba(39,174,61,0.2)',
  },
  bonusGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  bonusLeft: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bonusBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,140,0,0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,140,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bonusBadgeText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 12,
    color: colors.orange,
  },
  bonusCenter: {
    flex: 1,
  },
  bonusTitle: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 14,
    color: colors.coinGold,
    letterSpacing: 1,
  },
  bonusTitleDone: {
    color: colors.green,
  },
  bonusDesc: {
    fontFamily: fonts.body,
    fontWeight: weight.regular,
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  bonusRight: {
    alignItems: 'center',
  },
  bonusCoinIcon: {
    fontSize: 20,
  },
  bonusCoinAmount: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 16,
    color: colors.coinGold,
    marginTop: 1,
  },

  // ── Achievements Section ──────────────────────────────────────────
  achSection: {
    marginTop: 24,
    gap: 10,
  },
  achHeaderGradient: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 12,
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  achTitle: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 24,
    color: '#ffffff',
    letterSpacing: 2.5,
    textShadowColor: 'rgba(244,166,35,0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  achSubtitle: {
    fontFamily: fonts.body,
    fontWeight: weight.medium,
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 3,
  },
  achScoreBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 2,
    marginBottom: 4,
  },
  achScoreBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  achScoreBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  achScorePct: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 13,
    color: colors.coinGold,
    width: 36,
    textAlign: 'right',
  },

  // ── Achievement Group (collapsible) ───────────────────────────────
  achGroup: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  achGroupHeader: {
    overflow: 'hidden',
    borderRadius: 16,
  },
  achGroupHeaderGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
  },
  achGroupIcon: {
    fontSize: 18,
  },
  achGroupLabel: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 14,
    letterSpacing: 1.5,
  },
  achGroupCount: {
    fontFamily: fonts.body,
    fontWeight: weight.medium,
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  achGroupDoneCheck: {
    fontSize: 18,
    color: colors.green,
    fontWeight: '900' as any,
  },
  achGroupChevron: {
    fontSize: 12,
    fontWeight: '700' as any,
  },

  // ── Achievement Rows ──────────────────────────────────────────────
  achGroupList: {
    paddingHorizontal: 10,
    paddingBottom: 10,
    gap: 4,
  },
  achRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  achRowDone: {
    backgroundColor: 'rgba(255,215,0,0.04)',
    borderColor: 'rgba(255,215,0,0.1)',
  },
  achRowIcon: {
    fontSize: 20,
    width: 28,
    textAlign: 'center',
  },
  achRowInfo: {
    flex: 1,
  },
  achRowName: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 14,
    color: '#ffffff',
  },
  achRowDesc: {
    fontFamily: fonts.body,
    fontWeight: weight.regular,
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  achRowReward: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 11,
    color: colors.coinGold,
    marginTop: 2,
  },
  achCheckBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  achCheckMark: {
    fontSize: 16,
    fontWeight: '900' as any,
  },
  achLockedBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  achLockedIcon: {
    fontSize: 12,
  },
});
