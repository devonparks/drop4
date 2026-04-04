import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { TopBar } from '../components/ui/TopBar';
import { GlossyButton } from '../components/ui/GlossyButton';
import { CharacterAvatar } from '../components/ui/CharacterAvatar';
import { useShopStore } from '../stores/shopStore';
import { useGameStore, Difficulty } from '../stores/gameStore';
import { useMatchHistoryStore } from '../stores/matchHistoryStore';
import { colors } from '../theme/colors';
import { fonts, weight } from '../theme/typography';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Play'>;
};

export function PlayScreen({ navigation }: Props) {
  const { coins, gems, level } = useShopStore();
  const newGame = useGameStore(s => s.newGame);
  const { bestStreak } = useGameStore();
  const stats = useMatchHistoryStore(s => s.getStats());

  const startGame = (difficulty: Difficulty) => {
    newGame(difficulty, true);
    navigation.navigate('Game');
  };

  return (
    <ScreenBackground>
      <View style={styles.container}>
        <TopBar
          coins={coins} gems={gems} level={level}
          showBack onBackPress={() => navigation.goBack()}
        />

        <View style={styles.mainContent}>
          {/* Title */}
          <Text style={styles.title}>PLAY</Text>

          {/* Character with glow */}
          <View style={styles.characterArea}>
            <LinearGradient
              colors={['rgba(100,180,255,0.1)', 'rgba(100,180,255,0.03)', 'transparent']}
              style={styles.characterGlow}
            >
              <CharacterAvatar size="xlarge" variant="player" />
            </LinearGradient>
          </View>

          {/* Quick stats */}
          <View style={styles.statsRow}>
            <View style={styles.statPill}>
              <Text style={styles.statValue}>{stats.wins}</Text>
              <Text style={styles.statLabel}>Wins</Text>
            </View>
            <View style={styles.statPill}>
              <Text style={[styles.statValue, { color: colors.orange }]}>
                {bestStreak > 0 ? `🔥${bestStreak}` : '0'}
              </Text>
              <Text style={styles.statLabel}>Best Streak</Text>
            </View>
            <View style={styles.statPill}>
              <Text style={styles.statValue}>{stats.winRate}%</Text>
              <Text style={styles.statLabel}>Win Rate</Text>
            </View>
          </View>

          {/* Difficulty buttons */}
          <View style={styles.buttonsWrap}>
            <GlossyButton label="EASY" subtitle="Casual & Fun" variant="green" iconRight="⭐" onPress={() => startGame('easy')} />
            <GlossyButton label="MEDIUM" subtitle="Think Ahead" variant="orange" iconRight="⭐⭐" onPress={() => startGame('medium')} />
            <GlossyButton label="HARD" subtitle="No Mercy" variant="red" iconRight="⭐⭐⭐" onPress={() => startGame('hard')} />
          </View>

          {/* Secondary buttons */}
          <View style={styles.secondaryWrap}>
            <GlossyButton label="LEARN" variant="purple" icon="📖" small onPress={() => navigation.navigate('Learn')} style={{ flex: 1 }} />
            <GlossyButton label="CUSTOM" variant="navy" icon="🔧" small onPress={() => navigation.navigate('CustomGame')} style={{ flex: 1 }} />
          </View>
        </View>
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  mainContent: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 20, gap: 6,
  },
  title: {
    fontFamily: fonts.heading, fontWeight: weight.bold,
    fontSize: 32, color: '#ffffff',
    textShadowColor: 'rgba(80,120,255,0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
    letterSpacing: 4,
  },
  characterArea: { alignItems: 'center' },
  characterGlow: {
    width: 200, height: 200, borderRadius: 100,
    alignItems: 'center', justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row', gap: 8,
  },
  statPill: {
    alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    minWidth: 70,
  },
  statValue: {
    fontFamily: fonts.body, fontWeight: weight.bold,
    fontSize: 16, color: '#ffffff',
  },
  statLabel: {
    fontFamily: fonts.body, fontWeight: weight.regular,
    fontSize: 9, color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  buttonsWrap: {
    width: '100%', maxWidth: 340, gap: 8,
  },
  secondaryWrap: {
    flexDirection: 'row', width: '100%', maxWidth: 340, gap: 8,
  },
});
