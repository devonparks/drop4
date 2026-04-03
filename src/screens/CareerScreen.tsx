import React from 'react';
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
import { colors } from '../theme/colors';
import { fonts, weight } from '../theme/typography';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Career'>;
};

interface CareerLevel {
  id: number;
  name: string;
  opponent: string;
  type: string;
  difficulty: 'easy' | 'medium' | 'hard';
  stars: number; // 0 = not completed, 1-3 = star rating
  isBoss: boolean;
  reward?: string;
}

const CAREER_LEVELS: CareerLevel[] = [
  { id: 1, name: 'First Drop', opponent: 'Rookie Ron', type: 'Standard 6x7', difficulty: 'easy', stars: 0, isBoss: false },
  { id: 2, name: 'Getting Started', opponent: 'Beginner Ben', type: 'Standard 6x7', difficulty: 'easy', stars: 0, isBoss: false },
  { id: 3, name: 'Center Control', opponent: 'Casual Carl', type: 'Standard 6x7', difficulty: 'easy', stars: 0, isBoss: false },
  { id: 4, name: 'Quick Thinking', opponent: 'Speedy Sam', type: 'Timed (10s)', difficulty: 'easy', stars: 0, isBoss: false },
  { id: 5, name: 'Mini Match', opponent: 'Tiny Tim', type: 'Connect 3 (5x5)', difficulty: 'easy', stars: 0, isBoss: false, reward: '🎨 Wood Board' },
  { id: 6, name: 'BOSS: The Opener', opponent: 'Captain Connect', type: 'Standard 6x7', difficulty: 'medium', stars: 0, isBoss: true, reward: '500 Coins' },
  { id: 7, name: 'Trap Setup', opponent: 'Tricky Tara', type: 'Standard 6x7', difficulty: 'medium', stars: 0, isBoss: false },
  { id: 8, name: 'Going Second', opponent: 'Lucky Luke', type: 'You go 2nd', difficulty: 'medium', stars: 0, isBoss: false },
  { id: 9, name: 'Speed Round', opponent: 'Flash Fiona', type: 'Timed (5s)', difficulty: 'medium', stars: 0, isBoss: false },
  { id: 10, name: 'Big Board', opponent: 'Giant George', type: 'Connect 5 (8x8)', difficulty: 'medium', stars: 0, isBoss: false, reward: '🎨 Neon Pieces' },
  { id: 11, name: 'Puzzle: Find the Win', opponent: 'Puzzle Pete', type: 'Preset Board', difficulty: 'medium', stars: 0, isBoss: false },
  { id: 12, name: 'BOSS: The Strategist', opponent: 'Master Ming', type: 'Best of 3', difficulty: 'hard', stars: 0, isBoss: true, reward: '1000 Coins' },
];

function LevelNode({ level, onPress, isUnlocked }: {
  level: CareerLevel;
  onPress: () => void;
  isUnlocked: boolean;
}) {
  const bgColor = level.isBoss
    ? 'rgba(231,76,60,0.2)'
    : level.stars > 0
    ? 'rgba(39,174,61,0.15)'
    : isUnlocked
    ? 'rgba(255,140,0,0.1)'
    : 'rgba(255,255,255,0.03)';

  const borderColor = level.isBoss
    ? 'rgba(231,76,60,0.4)'
    : level.stars > 0
    ? 'rgba(39,174,61,0.3)'
    : isUnlocked
    ? 'rgba(255,140,0,0.3)'
    : 'rgba(255,255,255,0.06)';

  return (
    <Pressable
      onPress={() => { if (isUnlocked) { haptics.tap(); onPress(); } }}
      style={[styles.levelNode, { backgroundColor: bgColor, borderColor, opacity: isUnlocked ? 1 : 0.4 }]}
    >
      <View style={styles.levelLeft}>
        <View style={[styles.levelNumber, level.isBoss && styles.bossNumber]}>
          <Text style={styles.levelNumText}>{level.isBoss ? '👑' : level.id}</Text>
        </View>
        <View>
          <Text style={styles.levelName}>{level.name}</Text>
          <Text style={styles.levelType}>{level.type} • {level.opponent}</Text>
        </View>
      </View>
      <View style={styles.levelRight}>
        {level.stars > 0 ? (
          <Text style={styles.stars}>{'⭐'.repeat(level.stars)}{'☆'.repeat(3 - level.stars)}</Text>
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
  const { getStars, isLevelUnlocked, getTotalStars, getCompletedCount } = useCareerStore();

  const handlePlayLevel = (careerLevel: CareerLevel) => {
    newGame(careerLevel.difficulty, true);
    navigation.navigate('Game');
  };

  // Merge career store progress into level data for display
  const levelsWithProgress = CAREER_LEVELS.map(l => ({
    ...l,
    stars: getStars(l.id),
  }));

  const firstIncomplete = levelsWithProgress.findIndex(l => l.stars === 0);

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

        <View style={styles.header}>
          <Text style={styles.title}>CAREER</Text>
          <Text style={styles.subtitle}>Chapter 1: The Basics</Text>
          <View style={styles.progressRow}>
            <Text style={styles.progressText}>
              {getCompletedCount()} / {CAREER_LEVELS.length} completed
            </Text>
            <Text style={styles.starsTotal}>
              ⭐ {getTotalStars()} / {CAREER_LEVELS.length * 3}
            </Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.levelList} showsVerticalScrollIndicator={false}>
          {levelsWithProgress.map((lvl, i) => (
            <React.Fragment key={lvl.id}>
              <LevelNode
                level={lvl}
                isUnlocked={i <= (firstIncomplete >= 0 ? firstIncomplete : levelsWithProgress.length)}
                onPress={() => handlePlayLevel(lvl)}
              />
              {/* Connector line between levels */}
              {i < CAREER_LEVELS.length - 1 && (
                <View style={styles.connector}>
                  <View style={[styles.connectorLine, i < firstIncomplete && styles.connectorDone]} />
                </View>
              )}
              {/* Reward badge */}
              {lvl.reward && (
                <View style={styles.rewardBadge}>
                  <Text style={styles.rewardText}>{lvl.reward}</Text>
                </View>
              )}
            </React.Fragment>
          ))}
        </ScrollView>
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 4,
    marginBottom: 12,
  },
  title: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 28,
    color: '#ffffff',
    letterSpacing: 2,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontWeight: weight.medium,
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  progressRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
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
  levelList: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  levelNode: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
  },
  levelLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  levelNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bossNumber: {
    backgroundColor: 'rgba(231,76,60,0.3)',
  },
  levelNumText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 14,
    color: '#ffffff',
  },
  levelName: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 14,
    color: '#ffffff',
  },
  levelType: {
    fontFamily: fonts.body,
    fontWeight: weight.regular,
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  levelRight: {
    marginLeft: 8,
  },
  stars: {
    fontSize: 14,
  },
  playIcon: {
    fontSize: 16,
    color: colors.orange,
  },
  lockIcon: {
    fontSize: 14,
  },
  connector: {
    alignItems: 'center',
    height: 16,
  },
  connectorLine: {
    width: 2,
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  connectorDone: {
    backgroundColor: colors.green,
  },
  rewardBadge: {
    alignSelf: 'center',
    backgroundColor: 'rgba(255,209,102,0.1)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginTop: -4,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,209,102,0.2)',
  },
  rewardText: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 11,
    color: colors.coinGold,
  },
});
