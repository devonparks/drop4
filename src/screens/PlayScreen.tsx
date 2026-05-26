import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { TopBar } from '../components/ui/TopBar';
import { GlossyButton } from '../components/ui/GlossyButton';
import { LinearGradient } from 'expo-linear-gradient';
import { useShopStore } from '../stores/shopStore';
import { useGameStore, Difficulty } from '../stores/gameStore';
import { useMatchHistoryStore } from '../stores/matchHistoryStore';
import { useCareerStore } from '../stores/careerStore';
import { ALL_CAREER_LEVELS, CAREER_CITIES, CITY_BY_ID } from '../data/careerLevels';
import { colors } from '../theme/colors';
import { fonts, weight } from '../theme/typography';
import { getRandomTip } from '../data/tips';
import { useDailyRewardStore, getStreakMultiplier } from '../stores/dailyRewardStore';
import { StaggeredEntry, PressScale } from '../components/animations';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Play'>;
};

export function PlayScreen({ navigation }: Props) {
  const coins = useShopStore(s => s.coins);
  const gems = useShopStore(s => s.gems);
  const level = useShopStore(s => s.level);
  const newGame = useGameStore(s => s.newGame);
  const resetScores = useGameStore(s => s.resetScores);
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
    // Check from hardest to easiest for upgrade suggestions
    if (mediumWR !== null && mediumWR > 70) {
      return { text: 'Try Hard mode!', emoji: '\uD83D\uDD25', color: colors.pieceRed };
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

  // Career resume data
  const careerProgress = useCareerStore(s => s.progress);
  const careerResume = useMemo(() => {
    const nextLevel = ALL_CAREER_LEVELS.find(l => !careerProgress[l.id]?.completed);
    const completedCount = Object.values(careerProgress).filter(p => p.completed).length;
    const totalStars = Object.values(careerProgress).reduce((s, p) => s + p.stars, 0);
    const maxStars = ALL_CAREER_LEVELS.length * 3;
    if (!nextLevel) {
      if (totalStars < maxStars) return { complete: true as const, totalStars, maxStars, completedCount };
      return null;
    }
    const city = CAREER_CITIES.find(c => c.levelIds.includes(nextLevel.id));
    return { complete: false as const, level: nextLevel, cityName: city?.nickname ?? city?.name ?? '', completedCount, totalStars };
  }, [careerProgress]);

  // Streak / daily multiplier
  const currentStreak = useDailyRewardStore(s => s.currentStreak);
  const streakMultiplier = getStreakMultiplier();

  // Tip of the day — changes each time the screen is visited
  const [tip, setTip] = useState(getRandomTip);
  useEffect(() => { setTip(getRandomTip()); }, []);

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
    <ScreenBackground scene="play">
      <View style={styles.container}>
        <TopBar
          coins={coins} gems={gems} level={level}
          showBack onBackPress={() => navigation.goBack()}
        />

        <View style={styles.mainContent}>
          {/* Continue Career CTA */}
          {careerResume && !careerResume.complete && (
            <StaggeredEntry index={0} delay={60}>
            <PressScale
              scaleTo={0.97}
              onPress={() => {
                const city = CAREER_CITIES.find(c => c.levelIds.includes(careerResume.level.id));
                if (city) navigation.navigate('CareerCity', { cityId: city.id });
              }}
              style={styles.careerCta}
              accessibilityRole="button"
              accessibilityLabel={`Continue career: ${careerResume.level.name} in ${careerResume.cityName}`}
            >
              <LinearGradient
                colors={['rgba(255,140,0,0.15)', 'rgba(255,140,0,0.03)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.careerCtaLeft}>
                <Text style={styles.careerCtaKicker}>CONTINUE CAREER</Text>
                <Text style={styles.careerCtaTitle} numberOfLines={1}>{careerResume.cityName} — {careerResume.level.name}</Text>
              </View>
              <View style={styles.careerCtaRight}>
                <Text style={styles.careerCtaStars}>{careerResume.totalStars} ★</Text>
                <Text style={styles.careerCtaArrow}>›</Text>
              </View>
            </PressScale>
            </StaggeredEntry>
          )}

          {/* Replay for stars CTA — career complete but not all 3-star */}
          {careerResume?.complete && (
            <StaggeredEntry index={0} delay={60}>
            <PressScale
              scaleTo={0.97}
              onPress={() => navigation.navigate('CareerMap' as any)}
              style={[styles.careerCta, { borderColor: 'rgba(255,215,0,0.3)' }]}
              accessibilityRole="button"
              accessibilityLabel={`Replay career for stars: ${careerResume.totalStars} of ${careerResume.maxStars} stars`}
            >
              <LinearGradient
                colors={['rgba(255,215,0,0.12)', 'rgba(255,215,0,0.03)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.careerCtaLeft}>
                <Text style={[styles.careerCtaKicker, { color: colors.coinGold }]}>CAREER COMPLETE</Text>
                <Text style={styles.careerCtaTitle} numberOfLines={1}>Replay for 3-star perfection</Text>
              </View>
              <View style={styles.careerCtaRight}>
                <Text style={styles.careerCtaStars}>{careerResume.totalStars}/{careerResume.maxStars} ★</Text>
                <Text style={styles.careerCtaArrow}>›</Text>
              </View>
            </PressScale>
            </StaggeredEntry>
          )}

          {/* Screen heading */}
          <StaggeredEntry index={careerResume ? 1 : 0} delay={60}>
          <Text style={styles.screenHeading} accessibilityRole="header">QUICK PLAY</Text>
          </StaggeredEntry>

          {/* Compact stats line + suggestion */}
          <StaggeredEntry index={careerResume ? 2 : 1} delay={60}>
          <Text style={styles.statsLine}>
            {stats.totalGames > 0
              ? stats.gamesToday > 0
                ? `${stats.winRate}% win rate · ${stats.gamesToday} game${stats.gamesToday !== 1 ? 's' : ''} today`
                : `${stats.winRate}% win rate · ${stats.totalGames} game${stats.totalGames !== 1 ? 's' : ''}`
              : 'Choose your difficulty'}
          </Text>

          {/* Streak multiplier indicator */}
          {currentStreak > 0 && (
            <Text style={styles.streakLine}>
              {currentStreak} day streak{streakMultiplier > 1 ? ` · ${streakMultiplier}× coins` : ''}
            </Text>
          )}

          {/* Smart difficulty suggestion */}
          {difficultySuggestion && (
            <Text style={[styles.suggestionInline, { color: difficultySuggestion.color }]}>
              {difficultySuggestion.emoji} {difficultySuggestion.text}
            </Text>
          )}
          </StaggeredEntry>

          {/* Difficulty buttons — the main event.
              Calm-pass: dropped the right-side star emoji (⭐/⭐⭐/⭐⭐⭐) — the
              EASY/MEDIUM/HARD label already signals difficulty and the right
              column was making the buttons feel like config rows instead of
              CTAs. Subtitles only appear once the player has games on record
              (W·L stats). First-time players see clean labels without
              flavor copy fighting the painted icons. Matches Home's calm
              button hierarchy. */}
          <StaggeredEntry index={careerResume ? 3 : 2} delay={60}>
          <View style={styles.buttonsWrap}>
            <GlossyButton
              label="EASY"
              subtitle={mastery.easy.games > 0 ? `${mastery.easy.wins}W · ${masteryLosses.easy}L` : undefined}
              variant="green"
              iconImage={require('../assets/images/ui/diff-easy.png')}
              onPress={() => startGame('easy')}
            />
            <GlossyButton
              label="MEDIUM"
              subtitle={mastery.medium.games > 0 ? `${mastery.medium.wins}W · ${masteryLosses.medium}L` : undefined}
              variant="orange"
              iconImage={require('../assets/images/ui/diff-medium.png')}
              onPress={() => startGame('medium')}
            />
            <GlossyButton
              label="HARD"
              subtitle={mastery.hard.games > 0 ? `${mastery.hard.wins}W · ${masteryLosses.hard}L` : undefined}
              variant="red"
              iconImage={require('../assets/images/ui/diff-hard.png')}
              onPress={() => startGame('hard')}
            />
          </View>
          </StaggeredEntry>

          {/* Tip */}
          <StaggeredEntry index={careerResume ? 4 : 3} delay={60}>
          <View style={styles.tipCard}>
            <Text style={styles.tipText}>{'\uD83D\uDCA1'} {tip}</Text>
          </View>
          </StaggeredEntry>

          {/* Secondary buttons — Learn + Local Play. Local Play used to
              live on its own ModePickScreen tile, but with Career now a
              top-level tab and ModePick deleted, Local Play moved here
              as a pill since this is where the player decides "how to
              play" — it shares context with the AI difficulty buttons. */}
          <StaggeredEntry index={careerResume ? 5 : 4} delay={60}>
          <View style={styles.secondaryWrap}>
            <GlossyButton label="LEARN" variant="navy" icon="📖" small onPress={() => navigation.navigate('Learn')} style={{ flex: 1 }} />
            <GlossyButton label="LOCAL PLAY" variant="navy" icon="👥" small onPress={() => navigation.navigate('LocalPlay')} style={{ flex: 1 }} />
          </View>
          </StaggeredEntry>
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
    textShadow: '0px 0px 16px rgba(120,180,255,0.5)',
    marginBottom: -2,
  },
  statsLine: {
    fontFamily: fonts.body, fontWeight: weight.semibold,
    fontSize: 13, color: 'rgba(200,220,255,0.55)',
    letterSpacing: 0.5, textAlign: 'center',
  },
  streakLine: {
    fontFamily: fonts.body, fontWeight: weight.bold,
    fontSize: 12, color: colors.coinGold,
    letterSpacing: 0.3, textAlign: 'center',
  },
  suggestionInline: {
    fontFamily: fonts.body, fontWeight: weight.bold,
    fontSize: 13, letterSpacing: 0.3, textAlign: 'center',
  },
  buttonsWrap: {
    width: '100%', maxWidth: 340, gap: 8,
  },
  secondaryWrap: {
    flexDirection: 'row', width: '100%', maxWidth: 340, gap: 8,
  },
  careerCta: {
    width: '100%', maxWidth: 340,
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 14, overflow: 'hidden',
    paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: 'rgba(255,140,0,0.3)',
    marginBottom: 4,
  },
  careerCtaLeft: { flex: 1 },
  careerCtaKicker: {
    fontFamily: fonts.body, fontWeight: weight.black,
    fontSize: 9, color: colors.orange, letterSpacing: 1.5,
  },
  careerCtaTitle: {
    fontFamily: fonts.heading, fontWeight: weight.bold,
    fontSize: 15, color: '#ffffff', marginTop: 1,
  },
  careerCtaRight: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  careerCtaStars: {
    fontFamily: fonts.body, fontWeight: weight.bold,
    fontSize: 13, color: colors.coinGold,
  },
  careerCtaArrow: {
    fontSize: 22, color: 'rgba(255,140,0,0.6)', fontWeight: '600',
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
