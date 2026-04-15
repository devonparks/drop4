import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp, useRoute } from '@react-navigation/native';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { TopBar } from '../components/ui/TopBar';
import { GlossyButton } from '../components/ui/GlossyButton';
import { useShopStore } from '../stores/shopStore';
import { useGameStore, Difficulty } from '../stores/gameStore';
import { useMatchHistoryStore } from '../stores/matchHistoryStore';
import { haptics } from '../services/haptics';
import { colors } from '../theme/colors';
import { fonts, weight } from '../theme/typography';
import { getRandomTip } from '../data/tips';
import { PETS } from '../data/pets';
import { FEATURES } from '../config/features';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Play'>;
};

export function PlayScreen({ navigation }: Props) {
  const route = useRoute<RouteProp<RootStackParamList, 'Play'>>();
  const coins = useShopStore(s => s.coins);
  const gems = useShopStore(s => s.gems);
  const level = useShopStore(s => s.level);
  const equipped = useShopStore(s => s.equipped);
  const equippedPet = useShopStore(s => s.equippedPet);
  const newGame = useGameStore(s => s.newGame);
  const resetScores = useGameStore(s => s.resetScores);
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

  // Smart difficulty suggestion based on performance
  const difficultySuggestion = useMemo(() => {
    const aiMatches = matches.filter(m => m.mode === 'ai');
    const calcWinRate = (diff: string) => {
      const diffMatches = aiMatches.filter(m => m.difficulty === diff);
      if (diffMatches.length < 3) return null; // Need at least 3 games for a suggestion
      const wins = diffMatches.filter(m => m.result === 'win').length;
      return Math.round((wins / diffMatches.length) * 100);
    };
    const easyWR = calcWinRate('easy');
    const mediumWR = calcWinRate('medium');
    const hardWR = calcWinRate('hard');

    // Check from hardest to easiest for upgrade suggestions
    if (mediumWR !== null && mediumWR > 70) {
      return { text: 'Try Hard mode!', emoji: '\uD83D\uDD25', color: colors.pieceRed || '#e74c3c' };
    }
    if (easyWR !== null && easyWR > 80) {
      return { text: 'Ready for Medium!', emoji: '\uD83D\uDCC8', color: colors.orange };
    }
    // Check for struggling — recent 5 games on current difficulty
    const recentAi = aiMatches.slice(0, 5);
    if (recentAi.length >= 3) {
      const recentLosses = recentAi.filter(m => m.result === 'loss').length;
      const playingHard = recentAi.filter(m => m.difficulty === 'hard').length >= 2;
      const playingMedium = recentAi.filter(m => m.difficulty === 'medium').length >= 2;
      if (recentLosses >= 4 && playingHard) {
        return { text: 'No shame in Medium!', emoji: '\uD83D\uDCAA', color: colors.orange };
      }
      if (recentLosses >= 4 && playingMedium) {
        return { text: 'No shame in Easy!', emoji: '\uD83D\uDCAA', color: colors.green };
      }
    }
    return null;
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

  // Equipped summary — prettify IDs into display names
  const equippedSummary = useMemo(() => {
    const prettify = (id: string) => id.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const boardName = prettify(equipped.board);
    const piecesName = prettify(equipped.pieces);
    const petName = equippedPet ? (PETS.find(p => p.id === equippedPet)?.name ?? prettify(equippedPet)) : 'None';
    return `Board: ${boardName}  |  Pieces: ${piecesName}  |  Pet: ${petName}`;
  }, [equipped.board, equipped.pieces, equippedPet]);

  // Ranked is gated v1.1+. v1 is casual-only.
  const startGame = (difficulty: Difficulty) => {
    resetScores();
    newGame(difficulty, true);
    navigation.navigate('Matchup', {
      mode: 'casual',
      difficulty,
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
          {/* Screen heading */}
          <Text style={styles.screenHeading}>QUICK PLAY</Text>

          {/* Compact stats line */}
          <Text style={styles.statsLine}>
            {stats.totalGames > 0
              ? `${stats.winRate}% win rate · ${stats.totalGames} game${stats.totalGames !== 1 ? 's' : ''}`
              : 'Choose your difficulty'}
          </Text>

          {/* Smart difficulty suggestion */}
          {difficultySuggestion && (
            <Text style={[styles.suggestionInline, { color: difficultySuggestion.color }]}>
              {difficultySuggestion.emoji} {difficultySuggestion.text}
            </Text>
          )}

          {/* Difficulty buttons — the main event */}
          <View style={styles.buttonsWrap}>
            <GlossyButton
              label="EASY"
              subtitle={mastery.easy.games > 0 ? `${mastery.easy.wins}W · ${masteryLosses.easy}L` : 'Casual & Fun'}
              variant="green" iconRight="⭐" onPress={() => startGame('easy')}
            />
            <GlossyButton
              label="MEDIUM"
              subtitle={mastery.medium.games > 0 ? `${mastery.medium.wins}W · ${masteryLosses.medium}L` : 'Think Ahead'}
              variant="orange" iconRight="⭐⭐" onPress={() => startGame('medium')}
            />
            <GlossyButton
              label="HARD"
              subtitle={mastery.hard.games > 0 ? `${mastery.hard.wins}W · ${masteryLosses.hard}L` : 'No Mercy'}
              variant="red" iconRight="⭐⭐⭐" onPress={() => startGame('hard')}
            />
          </View>

          {/* Tip */}
          <View style={styles.tipCard}>
            <Text style={styles.tipText}>{'\uD83D\uDCA1'} {tip}</Text>
          </View>

          {/* Secondary buttons — only show enabled features */}
          <View style={styles.secondaryWrap}>
            <GlossyButton label="LEARN" variant="navy" icon="📖" small onPress={() => navigation.navigate('Learn')} style={{ flex: 1 }} />
            {FEATURES.customGame && (
              <GlossyButton label="CUSTOM" variant="navy" icon="🔧" small onPress={() => navigation.navigate('CustomGame')} style={{ flex: 1 }} />
            )}
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
    paddingHorizontal: 20, gap: 10,
  },
  screenHeading: {
    fontFamily: fonts.heading, fontWeight: weight.black,
    fontSize: 32, color: '#ffffff',
    letterSpacing: 3,
    textShadowColor: 'rgba(120,180,255,0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
    marginBottom: -2,
  },
  statsLine: {
    fontFamily: fonts.body, fontWeight: weight.semibold,
    fontSize: 13, color: 'rgba(200,220,255,0.55)',
    letterSpacing: 0.5, textAlign: 'center',
  },
  suggestionInline: {
    fontFamily: fonts.body, fontWeight: weight.bold,
    fontSize: 13, letterSpacing: 0.3, textAlign: 'center',
  },
  buttonsWrap: {
    width: '100%', maxWidth: 340, gap: 8,
  },
  levelGateHint: {
    fontFamily: fonts.body, fontWeight: weight.regular,
    fontSize: 10, color: 'rgba(255,255,255,0.35)',
    textAlign: 'center' as const, marginTop: 2,
    letterSpacing: 0.3,
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
