import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { TopBar } from '../components/ui/TopBar';
import { GlossyButton } from '../components/ui/GlossyButton';
import { useShopStore } from '../stores/shopStore';
import { useGameStore } from '../stores/gameStore';
import { useCareerStore } from '../stores/careerStore';
import { haptics } from '../services/haptics';
import { ALL_CAREER_LEVELS, CHAPTERS, getChallengeTypeLabel, CareerLevel } from '../data/careerLevels';
import { colors } from '../theme/colors';
import { fonts, weight } from '../theme/typography';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Career'>;
};

function LevelNode({ level, stars, isUnlocked, onPress }: {
  level: CareerLevel;
  stars: number;
  isUnlocked: boolean;
  onPress: () => void;
}) {
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

  return (
    <Pressable
      onPress={() => { if (isUnlocked) { haptics.tap(); onPress(); } }}
      style={[styles.levelNode, { backgroundColor: bgColor, borderColor, opacity: isUnlocked ? 1 : 0.35 }]}
    >
      <View style={styles.levelLeft}>
        <View style={[styles.levelNumber, level.isBoss && styles.bossNumber]}>
          <Text style={styles.levelNumText}>{level.isBoss ? '👑' : level.id}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.levelName} numberOfLines={1}>{level.name}</Text>
          <Text style={styles.levelType}>{getChallengeTypeLabel(level.type)} • {level.opponent}</Text>
          {level.opponentPersonality && (
            <Text style={styles.levelFlavor} numberOfLines={1}>{level.opponentPersonality}</Text>
          )}
        </View>
      </View>
      <View style={styles.levelRight}>
        {stars > 0 ? (
          <Text style={styles.stars}>{'⭐'.repeat(stars)}{'☆'.repeat(3 - stars)}</Text>
        ) : isUnlocked ? (
          <Text style={styles.playIcon}>▶</Text>
        ) : (
          <Text style={styles.lockIcon}>🔒</Text>
        )}
      </View>
    </Pressable>
  );
}

export function CareerScreen({ navigation }: Props) {
  const { coins, gems, level } = useShopStore();
  const newGame = useGameStore(s => s.newGame);
  const { getStars, getTotalStars, getCompletedCount } = useCareerStore();
  const [activeChapter, setActiveChapter] = useState(1);

  const handlePlayLevel = (careerLevel: CareerLevel) => {
    // Pass career level settings to the game
    const settings = {
      rows: careerLevel.settings.rows,
      cols: careerLevel.settings.cols,
      connectCount: careerLevel.settings.connectCount,
      timerSeconds: careerLevel.settings.timerSeconds || 0,
    };

    // Determine if player goes first
    const playerFirst = careerLevel.settings.playerGoesFirst !== false;

    newGame(careerLevel.difficulty, true, settings);

    // Store which career level we're playing so we can update it on result
    // Using a global ref since we can't pass params through navigation easily
    (global as any).__careerLevelId = careerLevel.id;
    (global as any).__careerLevelReward = careerLevel.reward;

    navigation.navigate('Game');
  };

  const chapter = CHAPTERS.find(c => c.id === activeChapter)!;
  const totalStars = getTotalStars();
  const completedCount = getCompletedCount();

  return (
    <ScreenBackground>
      <View style={styles.container}>
        <TopBar
          coins={coins}
          gems={gems}
          level={level}
          showBack
          onBackPress={() => navigation.goBack()}
        />

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>CAREER</Text>
          <View style={styles.progressRow}>
            <Text style={styles.progressText}>{completedCount}/{ALL_CAREER_LEVELS.length} completed</Text>
            <Text style={styles.starsTotal}>⭐ {totalStars}/{ALL_CAREER_LEVELS.length * 3}</Text>
          </View>
        </View>

        {/* Chapter tabs */}
        <View style={styles.chapterTabs}>
          {CHAPTERS.map(ch => {
            const isActive = activeChapter === ch.id;
            const chapterStars = ch.levels.reduce((sum, l) => sum + getStars(l.id), 0);
            const isUnlocked = ch.id === 1 || getCompletedCount() >= ch.unlockLevel - 1;

            return (
              <Pressable
                key={ch.id}
                onPress={() => { if (isUnlocked) { haptics.tap(); setActiveChapter(ch.id); } }}
                style={[styles.chapterTab, isActive && styles.chapterTabActive, !isUnlocked && { opacity: 0.4 }]}
              >
                <Text style={[styles.chapterName, isActive && styles.chapterNameActive]}>
                  Ch.{ch.id}
                </Text>
                <Text style={[styles.chapterSubtitle, isActive && { color: colors.orange }]}>
                  {ch.name}
                </Text>
                {isUnlocked && (
                  <Text style={styles.chapterStars}>⭐{chapterStars}/{ch.levels.length * 3}</Text>
                )}
              </Pressable>
            );
          })}
        </View>

        {/* Level list */}
        <ScrollView contentContainerStyle={styles.levelList} showsVerticalScrollIndicator={false}>
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
  levelName: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 13,
    color: '#ffffff',
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
});
