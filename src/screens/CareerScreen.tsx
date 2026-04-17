import React, { useState, useMemo, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Animated as RNAnimated } from 'react-native';
import Animated, { FadeIn, SlideInDown, ZoomIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { TopBar } from '../components/ui/TopBar';
import { TutorialTooltip } from '../components/ui/TutorialTooltip';
import { getTipById } from '../data/tutorials';
import { useShopStore } from '../stores/shopStore';
import { useGameStore } from '../stores/gameStore';
import { useCareerStore } from '../stores/careerStore';
import { useTutorialStore } from '../stores/tutorialStore';
import { haptics } from '../services/haptics';
import { playSound } from '../services/audio';
import { ALL_CAREER_LEVELS, CHAPTERS, getChallengeTypeLabel, CareerLevel } from '../data/careerLevels';
import { colors } from '../theme/colors';
import { PressScale } from '../components/animations';
import { fonts, weight } from '../theme/typography';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Career'>;
};

// NPC avatar emojis by opponent name (first word match or full name)
const NPC_AVATARS: Record<string, string> = {
  'Rookie Ron': '🧢', 'Beginner Ben': '📗', 'Casual Carl': '😎',
  'Speedy Sam': '⚡', 'Tiny Tim': '🐭', 'Lucky Luke': '🍀',
  'Defensive Dee': '🛡️', 'Flash Fiona': '💨', 'Big Board Bob': '🦬',
  'Tricky Tara': '🕸️', 'Iron Ivan': '🔩', 'King Kyle': '👑',
  'Stretch Stevens': '🦒', 'Puzzle Pete': '🧩', 'Blitz Betty': '🔥',
  'Micro Max': '🔬', 'Stone Cold Steve': '🧱', 'Copy Cat Clara': '🐱',
  'Mega Mike': '🏔️', 'Six-Pack Sam': '💪', 'Clock Crusher': '⏰',
  'Chaos Karen': '🌪️', 'Marathon Mel': '🏃', 'Grandmaster Grace': '♟️',
  'Nightmare Nick': '💀', 'Lightning Lisa': '⚡', 'Maze Master Matt': '🌀',
  'Quick Draw Quinn': '🤠', 'Upside-Down Uma': '🙃', 'Arena Alex': '🏟️',
  'Storm Surge Sara': '🌩️', 'Old Guard Otto': '🎖️', 'Grim Reaper Gina': '💀',
  'Ghost Greg': '👻', 'Final Boss Frank': '🗡️', 'The Dark Lord': '🌑',
};

function getNpcAvatar(opponent: string): string {
  return NPC_AVATARS[opponent] || '🎮';
}

function getDifficultyBadge(difficulty: string, isBoss: boolean): { label: string; color: string; bgColor: string } {
  if (isBoss) return { label: 'BOSS', color: '#ffffff', bgColor: 'rgba(231,76,60,0.9)' };
  switch (difficulty) {
    case 'easy': return { label: 'EASY', color: '#27ae3d', bgColor: 'rgba(39,174,61,0.15)' };
    case 'medium': return { label: 'MEDIUM', color: '#ff8c00', bgColor: 'rgba(255,140,0,0.15)' };
    case 'hard': return { label: 'HARD', color: '#e74c3c', bgColor: 'rgba(231,76,60,0.15)' };
    default: return { label: 'EASY', color: '#27ae3d', bgColor: 'rgba(39,174,61,0.15)' };
  }
}

function getRulePills(level: CareerLevel): { label: string; color: string }[] {
  const pills: { label: string; color: string }[] = [];
  const s = level.settings;
  if (s.connectCount && s.connectCount !== 4) {
    pills.push({ label: `Connect ${s.connectCount}`, color: '#9b59b6' });
  }
  if (s.timerSeconds) {
    pills.push({ label: `${s.timerSeconds}s Timer`, color: '#e67e22' });
  }
  if (s.playerGoesFirst === false) {
    pills.push({ label: 'Go Second', color: '#e74c3c' });
  }
  if (s.presetBoard) {
    pills.push({ label: 'Pre-placed', color: '#3498db' });
  }
  if (s.rows && s.cols && (s.rows !== 6 || s.cols !== 7)) {
    pills.push({ label: `${s.cols}x${s.rows}`, color: '#1abc9c' });
  }
  return pills;
}

function LevelNode({ level, stars, isUnlocked, onPress, justUnlocked }: {
  level: CareerLevel;
  stars: number;
  isUnlocked: boolean;
  onPress: () => void;
  justUnlocked?: boolean;
}) {
  // Orange glow pulse for freshly unlocked levels
  const glowAnim = useRef(new RNAnimated.Value(0)).current;
  useEffect(() => {
    if (justUnlocked) {
      const pulse = RNAnimated.loop(
        RNAnimated.sequence([
          RNAnimated.timing(glowAnim, { toValue: 1, duration: 800, useNativeDriver: false }),
          RNAnimated.timing(glowAnim, { toValue: 0, duration: 800, useNativeDriver: false }),
        ]),
        { iterations: 3 }
      );
      pulse.start();
    }
  }, [justUnlocked]);

  const animatedBorderColor = justUnlocked
    ? glowAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['rgba(255,140,0,0.2)', 'rgba(255,140,0,0.7)'],
      })
    : undefined;

  const animatedShadowOpacity = justUnlocked
    ? glowAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 0.6],
      })
    : undefined;

  const bgColor = level.isBoss
    ? 'rgba(231,76,60,0.15)'
    : stars > 0
    ? 'rgba(39,174,61,0.1)'
    : isUnlocked
    ? 'rgba(255,140,0,0.08)'
    : 'rgba(255,255,255,0.02)';

  const borderColor = level.isBoss
    ? 'rgba(231,76,60,0.35)'
    : stars > 0
    ? 'rgba(39,174,61,0.25)'
    : isUnlocked
    ? 'rgba(255,140,0,0.2)'
    : 'rgba(255,255,255,0.05)';

  const badge = getDifficultyBadge(level.difficulty, level.isBoss);
  const pills = getRulePills(level);

  const NodeWrapper = justUnlocked ? RNAnimated.View : View;
  const wrapperStyle = justUnlocked
    ? [styles.levelNode, { backgroundColor: bgColor, borderColor: animatedBorderColor, opacity: isUnlocked ? 1 : 0.35, shadowColor: '#ff8c00', shadowOffset: { width: 0, height: 0 }, shadowOpacity: animatedShadowOpacity, shadowRadius: 12, elevation: 8 }] as any
    : [styles.levelNode, { backgroundColor: bgColor, borderColor, opacity: isUnlocked ? 1 : 0.35 }];

  return (
    <Pressable
      onPress={() => { if (isUnlocked) { haptics.tap(); playSound('click'); onPress(); } }}
      accessibilityRole="button"
      accessibilityLabel={`Level ${level.id}: ${level.name}${level.isBoss ? ', boss' : ''}, ${badge.label}`}
      accessibilityHint={isUnlocked ? (stars > 0 ? `Completed with ${stars} stars. Replay this level.` : 'Play this level.') : 'Locked. Complete the previous level to unlock.'}
      accessibilityState={{ disabled: !isUnlocked }}
    >
    <NodeWrapper style={wrapperStyle}>
      <View style={styles.levelLeft}>
        <View style={[styles.levelNumber, level.isBoss && styles.bossNumber]}>
          <Text style={styles.levelNumText}>{level.isBoss ? '👑' : level.id}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.levelNameRow}>
            <Text style={styles.npcAvatar}>{getNpcAvatar(level.opponent)}</Text>
            <Text style={styles.levelName} numberOfLines={1}>{level.name}</Text>
            <View style={[
              styles.diffBadge,
              { backgroundColor: badge.bgColor },
              level.isBoss && styles.bossBadge,
            ]}>
              <Text style={[
                styles.diffBadgeText,
                { color: badge.color },
                level.isBoss && styles.bossBadgeText,
              ]}>{badge.label}</Text>
            </View>
          </View>
          <Text style={styles.levelType}>
            {level.type === 'standard' ? level.opponent : `${getChallengeTypeLabel(level.type)} • ${level.opponent}`}
          </Text>
          {level.opponentPersonality && (
            <Text style={styles.levelFlavor} numberOfLines={1}>{level.opponentPersonality}</Text>
          )}
          {pills.length > 0 && (
            <View style={styles.pillRow}>
              {pills.map((pill, i) => (
                <View key={i} style={[styles.rulePill, { backgroundColor: `${pill.color}18`, borderColor: `${pill.color}40` }]}>
                  <Text style={[styles.rulePillText, { color: pill.color }]}>{pill.label}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
      <View style={styles.levelRight}>
        {stars > 0 ? (
          <View style={styles.trophyContainer}>
            <Text style={styles.trophyIcon}>
              {stars === 3 ? '🏆' : stars === 2 ? '🥈' : '🥉'}
            </Text>
            <Text style={styles.stars}>{'⭐'.repeat(stars)}{'☆'.repeat(3 - stars)}</Text>
          </View>
        ) : isUnlocked ? (
          <Text style={styles.playIcon}>▶</Text>
        ) : (
          <Text style={styles.lockIcon}>🔒</Text>
        )}
      </View>
    </NodeWrapper>
    </Pressable>
  );
}

export function CareerScreen({ navigation }: Props) {
  const coins = useShopStore(s => s.coins);
  const gems = useShopStore(s => s.gems);
  const level = useShopStore(s => s.level);
  const newGame = useGameStore(s => s.newGame);
  const progress = useCareerStore(s => s.progress);
  const getStars = (levelId: number) => progress[levelId]?.stars || 0;
  const totalStars = Object.values(progress).reduce((sum, p) => sum + p.stars, 0);
  const completedCount = Object.values(progress).filter(p => p.completed).length;
  const [activeChapter, setActiveChapter] = useState(1);

  // Snapshot lock state on mount so we can detect newly unlocked levels
  const initialLockedRef = useRef<Set<number>>(new Set());
  const [newlyUnlockedIds, setNewlyUnlockedIds] = useState<Set<number>>(new Set());
  useEffect(() => {
    const locked = new Set<number>();
    for (const lvl of ALL_CAREER_LEVELS) {
      const stars = getStars(lvl.id);
      const isUnlocked = lvl.id === 1 || getStars(lvl.id - 1) > 0 || stars > 0;
      if (!isUnlocked) locked.add(lvl.id);
    }
    initialLockedRef.current = locked;
  }, []); // snapshot once on mount

  // Detect newly unlocked levels when progress changes
  useEffect(() => {
    if (initialLockedRef.current.size === 0) return;
    const freshlyUnlocked = new Set<number>();
    for (const lvlId of initialLockedRef.current) {
      const stars = getStars(lvlId);
      const isNowUnlocked = getStars(lvlId - 1) > 0 || stars > 0;
      if (isNowUnlocked) freshlyUnlocked.add(lvlId);
    }
    if (freshlyUnlocked.size > 0) setNewlyUnlockedIds(freshlyUnlocked);
  }, [progress]);

  // Tutorial
  const hasSeenCareerTip = useTutorialStore(s => s.hasSeenTip);
  const careerTip = getTipById('career_stars')!;
  const [showCareerTutorial, setShowCareerTutorial] = useState(false);

  useEffect(() => {
    if (!hasSeenCareerTip('career_stars')) {
      const timer = setTimeout(() => setShowCareerTutorial(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handlePlayLevel = (careerLevel: CareerLevel) => {
    // Pass career level settings to the game
    const settings = {
      rows: careerLevel.settings.rows,
      cols: careerLevel.settings.cols,
      connectCount: careerLevel.settings.connectCount,
      timerSeconds: careerLevel.settings.timerSeconds || 0,
      startingPlayer: (careerLevel.settings.playerGoesFirst === false ? 2 : 1) as 1 | 2,
    };

    newGame(careerLevel.difficulty, true, settings);

    // Navigate to Matchup VS screen first, which then navigates to Game
    const rows = careerLevel.settings.rows || 6;
    const cols = careerLevel.settings.cols || 7;
    const connect = careerLevel.settings.connectCount || 4;

    // Convert row-major presetBoard to column-major for the game engine
    let columnMajorBoard: number[][] | undefined;
    if (careerLevel.settings.presetBoard) {
      const rowMajor = careerLevel.settings.presetBoard;
      const numRows = rowMajor.length;
      const numCols = rowMajor[0]?.length || cols;
      columnMajorBoard = Array.from({ length: numCols }, (_, c) =>
        Array.from({ length: numRows }, (_, r) => rowMajor[r][c])
      );
    }

    navigation.navigate('Matchup', {
      mode: 'career',
      difficulty: careerLevel.difficulty,
      opponentName: careerLevel.opponent,
      opponentTitle: careerLevel.opponentPersonality || careerLevel.difficulty,
      courtName: careerLevel.isBoss ? 'CAREER: BOSS BATTLE' : `CAREER: ${careerLevel.name.toUpperCase()}`,
      connectCount: connect,
      boardSize: `${cols}x${rows}`,
      timerSeconds: careerLevel.settings.timerSeconds,
      careerLevelId: careerLevel.id,
      careerLevelReward: careerLevel.reward as any,
      careerChapter: careerLevel.chapter,
      presetBoard: columnMajorBoard,
    });
  };

  // Quick Resume: find first uncompleted level across all chapters
  const nextUncompletedLevel = useMemo(() => {
    for (const lvl of ALL_CAREER_LEVELS) {
      const stars = getStars(lvl.id);
      const isUnlocked = lvl.id === 1 || getStars(lvl.id - 1) > 0 || stars > 0;
      if (isUnlocked && stars === 0) return lvl;
    }
    return null;
  }, [progress]);

  // "Next Unlock" hint — find the next reward the player will earn
  const nextRewardHint = useMemo(() => {
    if (!nextUncompletedLevel) return null;
    // Look for the next level with a reward, starting from the current uncompleted level
    for (let i = nextUncompletedLevel.id - 1; i < ALL_CAREER_LEVELS.length; i++) {
      const lvl = ALL_CAREER_LEVELS[i];
      if (lvl && lvl.reward && getStars(lvl.id) === 0) {
        return { reward: lvl.reward, levelId: lvl.id };
      }
    }
    return null;
  }, [progress, nextUncompletedLevel]);

  const chapter = CHAPTERS.find(c => c.id === activeChapter)!;
  const totalCoinsAvailable = useMemo(() =>
    ALL_CAREER_LEVELS.reduce((sum, l) => sum + (l.reward?.type === 'coins' && l.reward.amount ? l.reward.amount : 0), 0),
  []);
  const [chapterCelebration, setChapterCelebration] = useState<number | null>(null);

  // Detect which chapters are fully 3-starred (all levels have at least 1 star)
  const chapterCompletion = useMemo(() => {
    const result: Record<number, { complete: boolean; totalStars: number; maxStars: number }> = {};
    for (const ch of CHAPTERS) {
      const chStars = ch.levels.reduce((sum, l) => sum + getStars(l.id), 0);
      const allDone = ch.levels.every(l => getStars(l.id) > 0);
      result[ch.id] = { complete: allDone, totalStars: chStars, maxStars: ch.levels.length * 3 };
    }
    return result;
  }, [progress]);

  return (
    <ScreenBackground>
      <View style={styles.container}>
        <TopBar
          coins={coins}
          gems={gems}
          level={level}
          showBack
          onBackPress={() => navigation.goBack()}
          onCoinPress={() => navigation.navigate('MainTabs', { screen: 'Shop' } as any)}
          onGemPress={() => navigation.navigate('MainTabs', { screen: 'Shop' } as any)}
        />

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title} accessibilityRole="header">CAREER</Text>
          <View style={styles.progressRow}>
            <Text style={styles.progressText}>{completedCount}/{ALL_CAREER_LEVELS.length} completed</Text>
            <Text style={styles.starsTotal}>⭐ {totalStars}/{ALL_CAREER_LEVELS.length * 3}</Text>
            <Text style={styles.coinsTotal}>🪙 {totalCoinsAvailable.toLocaleString()} available</Text>
          </View>
        </View>

        {/* Chapter tabs */}
        <View style={styles.chapterTabs}>
          {CHAPTERS.map(ch => {
            const isActive = activeChapter === ch.id;
            const chapterStars = ch.levels.reduce((sum, l) => sum + getStars(l.id), 0);
            const isUnlocked = ch.id === 1 || completedCount >= ch.unlockLevel - 1;

            return (
              <PressScale
                key={ch.id}
                onPress={() => {
                  if (isUnlocked) {
                    haptics.tap();
                    setActiveChapter(ch.id);
                    // Show celebration if chapter is complete and user taps it
                    if (chapterCompletion[ch.id]?.complete) {
                      setChapterCelebration(ch.id);
                      playSound('level_up');
                    }
                  }
                }}
                disabled={!isUnlocked}
                scaleTo={0.95}
                accessibilityRole="tab"
                accessibilityLabel={`Chapter ${ch.id}: ${ch.name}, ${chapterStars} of ${ch.levels.length * 3} stars`}
                accessibilityState={{ selected: isActive, disabled: !isUnlocked }}
              >
                <View style={[styles.chapterTab, isActive && styles.chapterTabActive, !isUnlocked && { opacity: 0.4 }]}>
                  <View style={styles.chapterNameRow}>
                    <Text style={[styles.chapterName, isActive && styles.chapterNameActive]}>
                      Ch.{ch.id}
                    </Text>
                    {chapterCompletion[ch.id]?.complete && (
                      <Text style={styles.chapterCheck}>✅</Text>
                    )}
                  </View>
                  <Text style={[styles.chapterSubtitle, isActive && { color: colors.orange }]}>
                    {ch.name}
                  </Text>
                  {isUnlocked && (
                    <Text style={styles.chapterStars}>⭐{chapterStars}/{ch.levels.length * 3}</Text>
                  )}
                </View>
              </PressScale>
            );
          })}
        </View>

        {/* Level list */}
        <ScrollView contentContainerStyle={styles.levelList} showsVerticalScrollIndicator={false}>
          {/* Quick Resume button */}
          {nextUncompletedLevel && (
            <>
              <PressScale
                onPress={() => {
                  haptics.tap();
                  playSound('click');
                  // Switch to the correct chapter tab
                  const targetChapter = CHAPTERS.find(c => c.levels.some(l => l.id === nextUncompletedLevel.id));
                  if (targetChapter && targetChapter.id !== activeChapter) {
                    setActiveChapter(targetChapter.id);
                  }
                  handlePlayLevel(nextUncompletedLevel);
                }}
                scaleTo={0.97}
                accessibilityRole="button"
                accessibilityLabel={`Continue: Level ${nextUncompletedLevel.id}, ${nextUncompletedLevel.name}`}
                accessibilityHint="Resume career progress at the next unfinished level"
              >
                <View style={styles.continueCard}>
                  <View style={styles.continueLeft}>
                    <Text style={styles.continueArrow}>▶</Text>
                    <View>
                      <Text style={styles.continueLabel}>CONTINUE</Text>
                      <Text style={styles.continueSub}>Level {nextUncompletedLevel.id} — {nextUncompletedLevel.name}</Text>
                    </View>
                  </View>
                  <Text style={styles.continueChevron}>›</Text>
                </View>
              </PressScale>
              {/* Next Unlock hint */}
              {nextRewardHint && (
                <View style={styles.nextRewardHint}>
                  <Text style={styles.nextRewardText}>
                    Next reward: {nextRewardHint.reward.icon} {nextRewardHint.reward.name} (after Level {nextRewardHint.levelId})
                  </Text>
                </View>
              )}
            </>
          )}

          {chapter.levels.map((lvl, i) => {
            const stars = getStars(lvl.id);
            // Level is unlocked if it's the first level, or the previous level has been completed
            const isUnlocked = lvl.id === 1 || getStars(lvl.id - 1) > 0 || stars > 0;

            return (
              <React.Fragment key={lvl.id}>
                <LevelNode
                  level={lvl}
                  stars={stars}
                  isUnlocked={isUnlocked}
                  justUnlocked={newlyUnlockedIds.has(lvl.id)}
                  onPress={() => handlePlayLevel(lvl)}
                />

                {/* Connector line */}
                {i < chapter.levels.length - 1 && (
                  <View style={styles.connector}>
                    <View style={[styles.connectorLine, stars > 0 && styles.connectorDone]} />
                  </View>
                )}

                {/* Reward badge */}
                {lvl.reward && (
                  <View style={styles.rewardBadge}>
                    <Text style={styles.rewardIcon}>{lvl.reward.icon}</Text>
                    <Text style={styles.rewardText}>{lvl.reward.name}</Text>
                  </View>
                )}
              </React.Fragment>
            );
          })}
        </ScrollView>

        {/* Chapter Complete Celebration Overlay */}
        {chapterCelebration !== null && (() => {
          const celebChapter = CHAPTERS.find(c => c.id === chapterCelebration);
          const celebInfo = chapterCompletion[chapterCelebration];
          if (!celebChapter || !celebInfo) return null;
          return (
            <Animated.View entering={FadeIn.duration(300)} style={styles.celebOverlay}>
              <Animated.View entering={SlideInDown.springify().damping(12)} style={styles.celebCard}>
                <LinearGradient
                  colors={['#9b59b6', '#8e44ad']}
                  style={styles.celebHeader}
                >
                  <Animated.Text entering={ZoomIn.delay(300).springify()} style={styles.celebEmoji}>
                    🏆
                  </Animated.Text>
                  <Text style={styles.celebTitle} accessibilityRole="header">CHAPTER COMPLETE!</Text>
                </LinearGradient>
                <View style={styles.celebBody}>
                  <Text style={styles.celebChapterName}>
                    Chapter {celebChapter.id}: {celebChapter.name}
                  </Text>
                  <View style={styles.celebStarsRow}>
                    <Text style={styles.celebStarsIcon}>⭐</Text>
                    <Text style={styles.celebStarsText}>
                      {celebInfo.totalStars} / {celebInfo.maxStars} Stars
                    </Text>
                  </View>
                  {celebInfo.totalStars === celebInfo.maxStars && (
                    <View style={styles.celebPerfect}>
                      <Text style={styles.celebPerfectText}>✨ PERFECT — All 3-Star Clears! ✨</Text>
                    </View>
                  )}
                  <Pressable
                    onPress={() => { haptics.tap(); setChapterCelebration(null); }}
                    style={styles.celebButton}
                    accessibilityRole="button"
                    accessibilityLabel="Continue"
                    accessibilityHint="Dismiss the chapter complete celebration"
                  >
                    <Text style={styles.celebButtonText}>CONTINUE</Text>
                  </Pressable>
                </View>
              </Animated.View>
            </Animated.View>
          );
        })()}

        {/* Tutorial tooltip */}
        <TutorialTooltip
          tip={careerTip}
          visible={showCareerTutorial && !hasSeenCareerTip('career_stars')}
          onDismiss={() => setShowCareerTutorial(false)}
        />
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  title: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 26,
    color: '#ffffff',
    letterSpacing: 2,
  },
  progressRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 4,
  },
  progressText: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 12,
    color: colors.textSecondary,
  },
  starsTotal: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 12,
    color: colors.coinGold,
  },
  coinsTotal: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 12,
    color: colors.coinGold,
  },
  // Chapter tabs
  chapterTabs: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    gap: 6,
    marginBottom: 8,
  },
  chapterTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chapterTabActive: {
    backgroundColor: 'rgba(255,140,0,0.1)',
    borderColor: 'rgba(255,140,0,0.3)',
  },
  chapterNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  chapterCheck: {
    fontSize: 10,
  },
  chapterName: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 12,
    color: colors.textSecondary,
  },
  chapterNameActive: {
    color: colors.orange,
  },
  chapterSubtitle: {
    fontFamily: fonts.body,
    fontWeight: weight.regular,
    fontSize: 9,
    color: colors.textMuted,
    marginTop: 1,
  },
  chapterStars: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 9,
    color: colors.coinGold,
    marginTop: 2,
  },
  // Quick Resume
  continueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,140,0,0.12)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255,140,0,0.35)',
  },
  continueLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  continueArrow: {
    fontSize: 20,
    color: colors.orange,
  },
  continueLabel: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 15,
    color: colors.orange,
    letterSpacing: 1,
  },
  continueSub: {
    fontFamily: fonts.body,
    fontWeight: weight.regular,
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  continueChevron: {
    fontSize: 24,
    color: colors.orange,
    fontWeight: weight.bold as any,
  },
  // Next reward hint
  nextRewardHint: {
    alignSelf: 'center',
    marginBottom: 8,
    marginTop: -4,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(241,196,15,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(241,196,15,0.12)',
  },
  nextRewardText: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 11,
    color: colors.coinGold,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  // Level list
  levelList: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  levelNode: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  levelLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  levelNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bossNumber: {
    backgroundColor: 'rgba(231,76,60,0.2)',
  },
  levelNumText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 13,
    color: '#ffffff',
  },
  levelNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 1,
  },
  npcAvatar: {
    fontSize: 14,
  },
  levelName: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 13,
    color: '#ffffff',
    flex: 1,
  },
  diffBadge: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  diffBadgeText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 8,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  bossBadge: {
    backgroundColor: 'rgba(231,76,60,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(241,196,15,0.6)',
  },
  bossBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    letterSpacing: 1,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4,
  },
  rulePill: {
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderWidth: 1,
  },
  rulePillText: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 9,
  },
  levelType: {
    fontFamily: fonts.body,
    fontWeight: weight.regular,
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 1,
  },
  levelFlavor: {
    fontFamily: fonts.body,
    fontWeight: weight.regular,
    fontSize: 9,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginTop: 1,
  },
  levelRight: {
    marginLeft: 8,
  },
  trophyContainer: {
    alignItems: 'center',
    gap: 2,
  },
  trophyIcon: {
    fontSize: 18,
  },
  stars: { fontSize: 12 },
  playIcon: {
    fontSize: 14,
    color: colors.orange,
  },
  lockIcon: { fontSize: 12 },
  connector: {
    alignItems: 'center',
    height: 12,
  },
  connectorLine: {
    width: 2,
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  connectorDone: {
    backgroundColor: colors.green,
  },
  rewardBadge: {
    flexDirection: 'row',
    alignSelf: 'center',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,209,102,0.08)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginTop: -4,
    marginBottom: 2,
    borderWidth: 1,
    borderColor: 'rgba(255,209,102,0.15)',
  },
  rewardIcon: { fontSize: 12 },
  rewardText: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 10,
    color: colors.coinGold,
  },
  // Chapter Complete Celebration
  celebOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  celebCard: {
    width: '85%',
    maxWidth: 320,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  celebHeader: {
    paddingVertical: 28,
    alignItems: 'center',
  },
  celebEmoji: {
    fontSize: 52,
    marginBottom: 8,
  },
  celebTitle: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 22,
    color: '#ffffff',
    letterSpacing: 2,
  },
  celebBody: {
    padding: 20,
    alignItems: 'center',
  },
  celebChapterName: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 16,
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 12,
  },
  celebStarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  celebStarsIcon: {
    fontSize: 20,
  },
  celebStarsText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 18,
    color: colors.coinGold,
  },
  celebPerfect: {
    backgroundColor: 'rgba(241,196,15,0.12)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(241,196,15,0.25)',
  },
  celebPerfectText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 12,
    color: colors.coinGold,
    textAlign: 'center',
  },
  celebButton: {
    backgroundColor: colors.purple,
    borderRadius: 14,
    paddingHorizontal: 32,
    paddingVertical: 12,
    marginTop: 4,
  },
  celebButtonText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 16,
    color: '#ffffff',
    letterSpacing: 1,
  },
});
