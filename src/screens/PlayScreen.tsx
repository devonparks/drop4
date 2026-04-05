import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp, useRoute } from '@react-navigation/native';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { TopBar } from '../components/ui/TopBar';
import { GlossyButton } from '../components/ui/GlossyButton';
import { CharacterAvatar } from '../components/ui/CharacterAvatar';
import { useShopStore } from '../stores/shopStore';
import { useGameStore, Difficulty } from '../stores/gameStore';
import { useMatchHistoryStore } from '../stores/matchHistoryStore';
import { haptics } from '../services/haptics';
import { colors } from '../theme/colors';
import { fonts, weight } from '../theme/typography';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Play'>;
};

export function PlayScreen({ navigation }: Props) {
  const route = useRoute<RouteProp<RootStackParamList, 'Play'>>();
  const coins = useShopStore(s => s.coins);
  const gems = useShopStore(s => s.gems);
  const level = useShopStore(s => s.level);
  const newGame = useGameStore(s => s.newGame);
  const bestStreak = useGameStore(s => s.bestStreak);
  const matches = useMatchHistoryStore(s => s.matches);
  const stats = useMemo(() => {
    const wins = matches.filter(m => m.result === 'win').length;
    const losses = matches.filter(m => m.result === 'loss').length;
    const draws = matches.filter(m => m.result === 'draw').length;
    const totalGames = matches.length;
    const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;
    const totalCoinsEarned = matches.reduce((sum, m) => sum + m.coinsEarned, 0);
    return { wins, losses, draws, totalGames, winRate, totalCoinsEarned };
  }, [matches]);
  // If navigated here from Multiplayer with ranked flags, default to ranked mode
  const incomingRanked = route.params?.rankedMode;
  const [mode, setMode] = useState<'casual' | 'ranked'>(incomingRanked ? 'ranked' : 'casual');

  const startGame = (difficulty: Difficulty) => {
    // Initialize the game state
    if (mode === 'ranked') {
      newGame(difficulty, true, { timerSeconds: 15 });
    } else {
      newGame(difficulty, true);
    }

    // Navigate to Matchup screen first (VS reveal), which then navigates to Game
    navigation.navigate('Matchup', {
      mode: mode,
      difficulty,
      timerSeconds: mode === 'ranked' ? 15 : undefined,
    });
  };

  return (
    <ScreenBackground>
      <View style={styles.container}>
        <TopBar
          coins={coins} gems={gems} level={level}
          showBack onBackPress={() => navigation.goBack()}
        />

        <View style={styles.mainContent}>
          {/* Mode toggle */}
          <View style={styles.modeToggle}>
            <Pressable
              onPress={() => { haptics.tap(); setMode('casual'); }}
              style={[styles.modeBtn, mode === 'casual' && styles.modeBtnActive]}
            >
              <Text style={[styles.modeBtnText, mode === 'casual' && styles.modeBtnTextActive]}>🎮 CASUAL</Text>
            </Pressable>
            <Pressable
              onPress={() => { haptics.tap(); setMode('ranked'); }}
              style={[styles.modeBtn, mode === 'ranked' && styles.modeBtnActiveRanked]}
            >
              <Text style={[styles.modeBtnText, mode === 'ranked' && styles.modeBtnTextActive]}>🏆 RANKED</Text>
            </Pressable>
          </View>

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
          <View style={styles.secondaryWrap}>
            <GlossyButton label="BOARD EDITOR" variant="navy" icon="🏗" small onPress={() => navigation.navigate('BoardEditor')} style={{ flex: 1 }} />
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
  modeToggle: {
    flexDirection: 'row', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12, padding: 3,
  },
  modeBtn: {
    paddingHorizontal: 20, paddingVertical: 8, borderRadius: 10,
  },
  modeBtnActive: {
    backgroundColor: 'rgba(39,174,61,0.2)',
  },
  modeBtnActiveRanked: {
    backgroundColor: 'rgba(155,89,182,0.2)',
  },
  modeBtnText: {
    fontFamily: fonts.body, fontWeight: weight.bold,
    fontSize: 12, color: colors.textSecondary, letterSpacing: 0.5,
  },
  modeBtnTextActive: {
    color: '#ffffff',
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
