import React, { useState, useMemo, useEffect } from 'react';
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
import { getRandomTip } from '../data/tips';
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
  const getMasteryStats = useMatchHistoryStore(s => s.getMasteryStats);
  const stats = useMemo(() => {
    const wins = matches.filter(m => m.result === 'win').length;
    const losses = matches.filter(m => m.result === 'loss').length;
    const draws = matches.filter(m => m.result === 'draw').length;
    const totalGames = matches.length;
    const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;
    const totalCoinsEarned = matches.reduce((sum, m) => sum + m.coinsEarned, 0);
    // Count games played today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayMs = todayStart.getTime();
    const gamesToday = matches.filter(m => m.timestamp >= todayMs).length;
    return { wins, losses, draws, totalGames, winRate, totalCoinsEarned, gamesToday };
  }, [matches]);
  const mastery = useMemo(() => getMasteryStats(), [matches]);
  // Per-difficulty loss counts from match history
  const masteryLosses = useMemo(() => {
    const aiMatches = matches.filter(m => m.mode === 'ai');
    const calc = (diff: string) => aiMatches.filter(m => m.difficulty === diff && m.result === 'loss').length;
    return { easy: calc('easy'), medium: calc('medium'), hard: calc('hard') };
  }, [matches]);

  // Personal bests from match history
  const personalBests = useMemo(() => {
    const wins = matches.filter(m => m.result === 'win');
    const fastestWin = wins.length > 0 ? Math.min(...wins.map(m => m.moves)) : null;
    const mostCoins = matches.length > 0 ? Math.max(...matches.map(m => m.coinsEarned || 0)) : null;
    return { fastestWin, longestStreak: bestStreak, mostCoins };
  }, [matches, bestStreak]);

  // Tip of the day — changes each time the screen is visited
  const [tip, setTip] = useState(getRandomTip);
  useEffect(() => { setTip(getRandomTip()); }, []);

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
            <LinearGradient
              colors={['rgba(39,174,61,0.15)', 'rgba(39,174,61,0.05)']}
              style={styles.statPill}
            >
              <Text style={styles.statValue}>{stats.wins}</Text>
              <Text style={styles.statLabel}>Wins</Text>
            </LinearGradient>
            <LinearGradient
              colors={['rgba(255,140,0,0.15)', 'rgba(255,140,0,0.05)']}
              style={styles.statPill}
            >
              <Text style={[styles.statValue, { color: colors.orange }]}>
                {bestStreak > 0 ? `\uD83D\uDD25${bestStreak}` : '0'}
              </Text>
              <Text style={styles.statLabel}>Best Streak</Text>
            </LinearGradient>
            <LinearGradient
              colors={['rgba(100,180,255,0.15)', 'rgba(100,180,255,0.05)']}
              style={styles.statPill}
            >
              <Text style={styles.statValue}>{stats.winRate}%</Text>
              <Text style={styles.statLabel}>Win Rate</Text>
            </LinearGradient>
          </View>

          {/* Games played today */}
          {stats.gamesToday > 0 && (
            <Text style={styles.gamesToday}>
              Today: {stats.gamesToday} game{stats.gamesToday !== 1 ? 's' : ''} played
            </Text>
          )}

          {/* AI Mastery tracker */}
          <View style={styles.masteryRow}>
            <View style={[styles.masteryPill, { borderColor: 'rgba(39,174,61,0.3)' }]}>
              <Text style={[styles.masteryWins, { color: colors.green }]}>{mastery.easy.wins}</Text>
              <Text style={styles.masteryLabel}>Easy</Text>
            </View>
            <View style={[styles.masteryPill, { borderColor: 'rgba(255,140,0,0.3)' }]}>
              <Text style={[styles.masteryWins, { color: colors.orange }]}>{mastery.medium.wins}</Text>
              <Text style={styles.masteryLabel}>Medium</Text>
            </View>
            <View style={[styles.masteryPill, { borderColor: 'rgba(231,76,60,0.3)' }]}>
              <Text style={[styles.masteryWins, { color: colors.pieceRed || '#e74c3c' }]}>{mastery.hard.wins}</Text>
              <Text style={styles.masteryLabel}>Hard</Text>
            </View>
          </View>

          {/* Personal Best records */}
          {(personalBests.fastestWin !== null || personalBests.longestStreak > 0 || (personalBests.mostCoins !== null && personalBests.mostCoins > 0)) && (
            <View style={styles.personalBestRow}>
              {personalBests.fastestWin !== null && (
                <View style={styles.pbItem}>
                  <Text style={styles.pbIcon}>{'\u26A1'}</Text>
                  <Text style={styles.pbValue}>{personalBests.fastestWin}</Text>
                  <Text style={styles.pbLabel}>Best Moves</Text>
                </View>
              )}
              {personalBests.longestStreak > 0 && (
                <View style={styles.pbItem}>
                  <Text style={styles.pbIcon}>{'\uD83D\uDD25'}</Text>
                  <Text style={[styles.pbValue, { color: colors.orange }]}>{personalBests.longestStreak}</Text>
                  <Text style={styles.pbLabel}>Best Streak</Text>
                </View>
              )}
              {personalBests.mostCoins !== null && personalBests.mostCoins > 0 && (
                <View style={styles.pbItem}>
                  <Text style={styles.pbIcon}>{'\uD83E\uDE99'}</Text>
                  <Text style={[styles.pbValue, { color: colors.coinGold || '#ffd700' }]}>{personalBests.mostCoins}</Text>
                  <Text style={styles.pbLabel}>Best Coins</Text>
                </View>
              )}
            </View>
          )}

          {/* Difficulty buttons */}
          <View style={styles.buttonsWrap}>
            <GlossyButton label="EASY" subtitle={`Casual & Fun${mastery.easy.games > 0 ? ` • ${mastery.easy.wins}W - ${masteryLosses.easy}L` : ''}`} variant="green" iconRight="⭐" onPress={() => startGame('easy')} />
            <GlossyButton label="MEDIUM" subtitle={`Think Ahead${mastery.medium.games > 0 ? ` • ${mastery.medium.wins}W - ${masteryLosses.medium}L` : ''}`} variant="orange" iconRight="⭐⭐" onPress={() => startGame('medium')} />
            <GlossyButton label="HARD" subtitle={`No Mercy${mastery.hard.games > 0 ? ` • ${mastery.hard.wins}W - ${masteryLosses.hard}L` : ''}`} variant="red" iconRight="⭐⭐⭐" onPress={() => startGame('hard')} />
          </View>

          {/* Tip of the day */}
          <View style={styles.tipCard}>
            <Text style={styles.tipText}>{'\uD83D\uDCA1'} {tip}</Text>
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
    fontSize: 24, color: '#ffffff',
  },
  statLabel: {
    fontFamily: fonts.body, fontWeight: weight.regular,
    fontSize: 9, color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  gamesToday: {
    fontFamily: fonts.body, fontWeight: weight.semibold,
    fontSize: 11, color: colors.textSecondary,
    letterSpacing: 0.3,
  },
  masteryRow: {
    flexDirection: 'row', gap: 8, width: '100%', maxWidth: 340,
    justifyContent: 'center',
  },
  masteryPill: {
    flex: 1, alignItems: 'center', paddingVertical: 4,
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  masteryWins: {
    fontFamily: fonts.body, fontWeight: weight.bold,
    fontSize: 18, color: '#ffffff',
  },
  masteryLabel: {
    fontFamily: fonts.body, fontWeight: weight.regular,
    fontSize: 9, color: colors.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.3,
  },
  personalBestRow: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
    maxWidth: 340,
    justifyContent: 'center',
  },
  pbItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    backgroundColor: 'rgba(255,215,0,0.06)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.12)',
  },
  pbIcon: {
    fontSize: 14,
  },
  pbValue: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 18,
    color: colors.green,
  },
  pbLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.regular,
    fontSize: 8,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  buttonsWrap: {
    width: '100%', maxWidth: 340, gap: 8,
  },
  secondaryWrap: {
    flexDirection: 'row', width: '100%', maxWidth: 340, gap: 8,
  },
  tipCard: {
    width: '100%', maxWidth: 340,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8,
  },
  tipText: {
    fontFamily: fonts.body, fontWeight: weight.regular,
    fontSize: 11, color: colors.textSecondary,
    lineHeight: 16, textAlign: 'center',
  },
});
