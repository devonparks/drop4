import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import Animated, {
  FadeIn,
  FadeInLeft,
  FadeInRight,
  FadeInDown,
  FadeInUp,
  ZoomIn,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp, useRoute } from '@react-navigation/native';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { GlossyButton } from '../components/ui/GlossyButton';
import { Character3DPortrait } from '../components/3d/Character3DPortrait';
import { getNpcCustomization } from '../data/npcCustomizations';
import { useShopStore } from '../stores/shopStore';
import { useGameStore } from '../stores/gameStore';
import { haptics } from '../services/haptics';
import { playSound } from '../services/audio';
import { colors } from '../theme/colors';
import { fonts, weight } from '../theme/typography';
import type { RootStackParamList } from '../navigation/RootNavigator';

// ═══════════════════════════════════
// Bot Persona Data
// ═══════════════════════════════════

const BOT_POOLS: Record<string, { name: string; level: number; title: string }[]> = {
  easy: [
    { name: 'Rookie Ron', level: 5, title: 'Beginner' },
    { name: 'Beginner Ben', level: 3, title: 'Newbie' },
    { name: 'Chill Charlie', level: 7, title: 'Laid-Back' },
    { name: 'Lazy Luna', level: 4, title: 'Sleepy' },
  ],
  medium: [
    { name: 'Midfield Mike', level: 16, title: 'Strategist' },
    { name: 'Steady Steve', level: 14, title: 'Consistent' },
    { name: 'Tactical Tara', level: 18, title: 'Planner' },
    { name: 'Careful Chris', level: 15, title: 'Methodical' },
  ],
  hard: [
    { name: 'Master Maxine', level: 30, title: 'Undefeated' },
    { name: 'Grand Gary', level: 28, title: 'Grandmaster' },
    { name: 'Elite Emma', level: 32, title: 'Ruthless' },
    { name: 'Savage Sam', level: 35, title: 'No Mercy' },
  ],
};

function pickRandomBot(difficulty: string) {
  const pool = BOT_POOLS[difficulty] || BOT_POOLS.medium;
  return pool[Math.floor(Math.random() * pool.length)];
}

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Matchup'>;
};

export function MatchupScreen({ navigation }: Props) {
  const route = useRoute<RouteProp<RootStackParamList, 'Matchup'>>();
  const params = route.params;
  const playerName = useShopStore(s => s.playerName);
  const playerLevel = useShopStore(s => s.level);
  const resetScores = useGameStore(s => s.resetScores);

  // State
  const [phase, setPhase] = useState<'searching' | 'reveal' | 'ready'>('searching');

  // Determine opponent info — pick a random bot from the pool (stable per mount)
  const difficulty = params.difficulty || 'medium';
  const [botPersona] = useState(() => pickRandomBot(difficulty));
  const opponentName = params.opponentName || botPersona.name;
  const opponentLevel = params.opponentLevel ?? botPersona.level;
  const opponentTitle = params.opponentTitle || botPersona.title;

  // Court/venue name
  const courtName = params.courtName
    || (params.mode === 'career' ? 'CAREER: BOSS BATTLE' : 'CLASSIC COURT');

  // Mode badge text
  const modeBadge = (() => {
    switch (params.mode) {
      case 'casual': return 'CASUAL';
      case 'ranked': return 'RANKED';
      case 'career': return `CAREER CH.${params.careerChapter || 1}`;
      case 'wager': return 'WAGER MATCH';
      case 'local': return 'LOCAL';
      default: return 'CASUAL';
    }
  })();

  // Board/match info
  const connectCount = params.connectCount || 4;
  const timerSeconds = params.timerSeconds;

  // ═══════════════════════════════════
  // Animation: VS glow pulse
  // ═══════════════════════════════════
  const vsGlow = useSharedValue(0.6);
  const vsPulseStyle = useAnimatedStyle(() => ({
    opacity: vsGlow.value,
  }));

  useEffect(() => {
    vsGlow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.6, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, []);

  // ═══════════════════════════════════
  // Animation: Searching dots
  // ═══════════════════════════════════
  const [dots, setDots] = useState('');
  useEffect(() => {
    if (phase !== 'searching') return;
    const interval = setInterval(() => {
      setDots(prev => (prev.length >= 3 ? '' : prev + '.'));
    }, 400);
    return () => clearInterval(interval);
  }, [phase]);

  // ═══════════════════════════════════
  // Phase transitions
  // ═══════════════════════════════════
  useEffect(() => {
    // Phase 1: "Finding opponent..." for 1.5s
    const isBoss = params.mode === 'career' && courtName.includes('BOSS');
    const revealTimer = setTimeout(() => {
      setPhase('reveal');
      haptics.tap();
      playSound(isBoss ? 'boss_intro' : 'match_found');
    }, 1500);

    // Phase 2: Enable READY after another 1s
    const readyTimer = setTimeout(() => {
      setPhase('ready');
      haptics.tap();
    }, 2500);

    return () => {
      clearTimeout(revealTimer);
      clearTimeout(readyTimer);
    };
  }, []);

  // ═══════════════════════════════════
  // Navigation: READY pressed
  // ═══════════════════════════════════
  const handleReady = useCallback(() => {
    haptics.tap();
    playSound('click');
    resetScores();
    // Navigate to Game with all match params
    navigation.replace('Game', {
      rankedMode: params.mode === 'ranked',
      rankedClockSeconds: params.mode === 'ranked' ? 180 : undefined,
      careerLevelId: params.careerLevelId,
      careerLevelReward: params.careerLevelReward,
      presetBoard: params.presetBoard,
      localPlayerNames: params.localPlayerNames,
      // Forward opponent info so GameScreen can render correct 3D NPC
      opponentName,
      difficulty,
    });
  }, [navigation, params, courtName, resetScores]);

  const handleBack = useCallback(() => {
    haptics.tap();
    navigation.goBack();
  }, [navigation]);

  // ═══════════════════════════════════
  // Render
  // ═══════════════════════════════════
  const showVS = phase === 'reveal' || phase === 'ready';
  const isBossMatch = params.mode === 'career' && courtName.includes('BOSS');

  return (
    <ScreenBackground>
      <View style={styles.container}>
        {/* No TopBar — this is a cinematic VS reveal */}

        {/* Boss battle red gradient overlay */}
        {isBossMatch && (
          <LinearGradient
            colors={['rgba(180,30,30,0.25)', 'rgba(80,10,10,0.15)', 'transparent']}
            style={styles.bossOverlay}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 0.6 }}
          />
        )}

        {/* Halftone dot pattern overlay */}
        {Platform.OS === 'web' && <View style={styles.halftoneOverlay} />}

        {/* ── Top area: Court name + mode badge ── */}
        <Animated.View entering={FadeInDown.delay(200).duration(500)} style={styles.topArea}>
          <Text style={[styles.courtName, isBossMatch && styles.courtNameBoss]} accessibilityRole="header">{courtName}</Text>
          {isBossMatch && (
            <View style={styles.bossBadge}>
              <Text style={styles.bossBadgeText}>BOSS BATTLE</Text>
            </View>
          )}
          <View style={[
            styles.modeBadge,
            params.mode === 'ranked' && styles.modeBadgeRanked,
            isBossMatch && styles.modeBadgeBoss,
          ]}>
            <Text style={[styles.modeBadgeText, isBossMatch && styles.modeBadgeTextBoss]}>{modeBadge}</Text>
          </View>
        </Animated.View>

        {/* ── Main VS area ── */}
        <View style={[styles.vsArea, isBossMatch && styles.vsAreaBoss]}>

          {/* ── LEFT: Player ── */}
          <Animated.View
            entering={FadeInLeft.delay(showVS ? 300 : 0).duration(600).springify().damping(14)}
            style={styles.playerSide}
          >
            <View style={styles.characterWrap}>
              <LinearGradient
                colors={['rgba(255,140,0,0.15)', 'rgba(255,140,0,0.03)', 'transparent']}
                style={styles.characterGlow}
              >
                <Character3DPortrait width={180} height={220} showFloor={false} />
              </LinearGradient>
            </View>

            {/* Level badge */}
            <View style={styles.levelBadge}>
              <Text style={styles.levelStar}>{'*'}</Text>
              <Text style={styles.levelNum}>{playerLevel}</Text>
            </View>

            {/* Name plate */}
            <View style={[styles.namePlate, styles.namePlatePlayer]}>
              <Text style={styles.nameText} numberOfLines={1} accessibilityRole="header">
                {playerName || 'Player'}
              </Text>
            </View>
            <Text style={styles.playerTitle}>YOU</Text>
          </Animated.View>

          {/* ── CENTER: VS ── */}
          <View style={styles.vsCenter}>
            {phase === 'searching' ? (
              <Animated.View entering={FadeIn.duration(300)} style={styles.searchingWrap}>
                <Text style={styles.searchingText}>Finding{'\n'}opponent{dots}</Text>
                {/* Spinning ring */}
                <View style={styles.spinnerOuter}>
                  <View style={styles.spinnerInner} />
                </View>
              </Animated.View>
            ) : (
              <>
                <Animated.View entering={ZoomIn.springify().damping(8).stiffness(120)}>
                  <Animated.View style={vsPulseStyle}>
                    <Text style={styles.vsGlowText}>VS</Text>
                  </Animated.View>
                  <Text style={styles.vsText} accessibilityLabel="versus">VS</Text>
                </Animated.View>

                {/* Match details below VS — only show non-standard rules */}
                {(connectCount !== 4 || (timerSeconds != null && timerSeconds > 0)) && (
                  <Animated.View entering={FadeInUp.delay(600).duration(400)} style={styles.matchInfo}>
                    {connectCount !== 4 && (
                      <Text style={styles.matchRule}>Connect {connectCount}</Text>
                    )}
                    {timerSeconds != null && timerSeconds > 0 && (
                      <Text style={styles.matchDetail}>{timerSeconds}s per turn</Text>
                    )}
                  </Animated.View>
                )}
              </>
            )}
          </View>

          {/* ── RIGHT: Opponent ── */}
          {showVS ? (
            <Animated.View
              entering={FadeInRight.delay(400).duration(600).springify().damping(14)}
              style={styles.playerSide}
            >
              <View style={styles.characterWrap}>
                <LinearGradient
                  colors={['rgba(80,140,255,0.15)', 'rgba(80,140,255,0.03)', 'transparent']}
                  style={styles.characterGlow}
                >
                  <Character3DPortrait
                      width={180} height={220} showFloor={false}
                      customization={getNpcCustomization(opponentName || params.difficulty)}
                    />
                </LinearGradient>
              </View>

              {/* Level badge */}
              <View style={[styles.levelBadge, styles.levelBadgeBlue]}>
                <Text style={styles.levelStar}>{'*'}</Text>
                <Text style={styles.levelNum}>{opponentLevel}</Text>
              </View>

              {/* Name plate */}
              <View style={[styles.namePlate, styles.namePlateOpponent]}>
                <Text style={styles.nameText} numberOfLines={1} accessibilityRole="header">{opponentName}</Text>
              </View>
              <Text style={styles.opponentTitle}>{opponentTitle.toUpperCase()}</Text>
            </Animated.View>
          ) : (
            <View style={styles.playerSide}>
              {/* Placeholder silhouette while searching */}
              <View style={styles.characterWrap}>
                <View style={styles.silhouette}>
                  <Text style={styles.silhouetteIcon}>?</Text>
                </View>
              </View>
              <View style={[styles.namePlate, styles.namePlateHidden]}>
                <Text style={styles.nameText}>???</Text>
              </View>
            </View>
          )}
        </View>

        {/* ── Bottom: Buttons ── */}
        <Animated.View
          entering={FadeInDown.delay(phase === 'ready' ? 0 : 2500).duration(400)}
          style={styles.bottomArea}
        >
          {phase === 'ready' ? (
            <GlossyButton
              label="READY!"
              variant="orange"
              icon="⚔️"
              onPress={handleReady}
            />
          ) : (
            <View style={styles.waitingBtn}>
              <Text style={styles.waitingText}>
                {phase === 'searching' ? 'Searching...' : 'Get Ready...'}
              </Text>
            </View>
          )}

          <Pressable
            onPress={handleBack}
            style={styles.backBtn}
            accessibilityLabel="Back"
            accessibilityRole="button"
            accessibilityHint="Return to previous screen"
          >
            <Text style={styles.backText}>{'< '}BACK</Text>
          </Pressable>
        </Animated.View>
      </View>
    </ScreenBackground>
  );
}

// ═══════════════════════════════════
// Styles
// ═══════════════════════════════════

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 30,
  },

  // Halftone dot pattern (web only)
  halftoneOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.04,
    ...(Platform.OS === 'web' ? {
      backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)',
      backgroundSize: '12px 12px',
    } as any : {}),
    zIndex: 0,
  },

  // ── Top area ──
  topArea: {
    alignItems: 'center',
    gap: 6,
    zIndex: 1,
  },
  courtName: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 18,
    color: '#ffffff',
    letterSpacing: 3,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(100,180,255,0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  courtNameBoss: {
    color: '#e94560',
    textShadowColor: 'rgba(233,69,96,0.6)',
    textShadowRadius: 16,
  },
  bossOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  bossBadge: {
    backgroundColor: 'rgba(233,69,96,0.2)',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(233,69,96,0.5)',
  },
  bossBadgeText: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 12,
    color: '#e94560',
    letterSpacing: 3,
  },
  modeBadgeBoss: {
    backgroundColor: 'rgba(233,69,96,0.12)',
    borderColor: 'rgba(233,69,96,0.3)',
  },
  modeBadgeTextBoss: {
    color: '#e94560',
  },
  vsAreaBoss: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(233,69,96,0.1)',
  },
  modeBadge: {
    backgroundColor: 'rgba(255,140,0,0.15)',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,140,0,0.3)',
  },
  modeBadgeRanked: {
    backgroundColor: 'rgba(155,89,182,0.15)',
    borderColor: 'rgba(155,89,182,0.3)',
  },
  modeBadgeText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 11,
    color: colors.orange,
    letterSpacing: 2,
  },

  // ── VS Area (main middle) ──
  vsArea: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingHorizontal: 8,
    zIndex: 1,
  },

  // ── Player side ──
  playerSide: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  characterWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  characterGlow: {
    width: 180,
    height: 180,
    borderRadius: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Level badge
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255,140,0,0.2)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,140,0,0.35)',
  },
  levelBadgeBlue: {
    backgroundColor: 'rgba(80,140,255,0.2)',
    borderColor: 'rgba(80,140,255,0.35)',
  },
  levelStar: {
    fontSize: 12,
    color: colors.coinGold,
  },
  levelNum: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 12,
    color: '#ffffff',
  },

  // Name plates
  namePlate: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 5,
    minWidth: 100,
    alignItems: 'center',
    borderWidth: 2,
  },
  namePlatePlayer: {
    backgroundColor: 'rgba(255,140,0,0.12)',
    borderColor: 'rgba(255,140,0,0.5)',
  },
  namePlateOpponent: {
    backgroundColor: 'rgba(80,140,255,0.12)',
    borderColor: 'rgba(80,140,255,0.5)',
  },
  namePlateHidden: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: 'rgba(255,255,255,0.1)',
  },
  nameText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 13,
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  playerTitle: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 10,
    color: colors.orange,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  opponentTitle: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 10,
    color: 'rgba(120,170,255,0.8)',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  // Silhouette placeholder
  silhouette: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    borderStyle: 'dashed',
  },
  silhouetteIcon: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 44,
    color: 'rgba(255,255,255,0.15)',
  },

  // ── VS Center ──
  vsCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 100,
    zIndex: 2,
  },
  vsText: {
    fontFamily: fonts.heading,
    fontWeight: weight.black,
    fontSize: 68,
    color: '#ffffff',
    letterSpacing: 4,
    textShadowColor: 'rgba(255,140,0,0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
    position: 'absolute',
    textAlign: 'center',
    width: '100%',
  },
  vsGlowText: {
    fontFamily: fonts.heading,
    fontWeight: weight.black,
    fontSize: 68,
    color: 'rgba(255,140,0,0.3)',
    letterSpacing: 4,
    textAlign: 'center',
    // Glow layer behind the crisp text
    textShadowColor: 'rgba(255,140,0,0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 40,
  },

  // Searching state
  searchingWrap: {
    alignItems: 'center',
    gap: 12,
  },
  searchingText: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  spinnerOuter: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 3,
    borderColor: 'rgba(255,140,0,0.15)',
    borderTopColor: colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? {
      animationKeyframes: { from: { transform: 'rotate(0deg)' }, to: { transform: 'rotate(360deg)' } },
      animationDuration: '1s',
      animationTimingFunction: 'linear',
      animationIterationCount: 'infinite',
    } as any : {}),
  },
  spinnerInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.orange,
  },

  // Match info below VS
  matchInfo: {
    alignItems: 'center',
    marginTop: 50,
    gap: 3,
  },
  matchRule: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 1,
    textAlign: 'center',
  },
  matchDetail: {
    fontFamily: fonts.body,
    fontWeight: weight.regular,
    fontSize: 11,
    color: colors.textSecondary,
  },
  matchWager: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 12,
    color: colors.coinGold,
    marginTop: 2,
  },

  // ── Bottom area ──
  bottomArea: {
    paddingHorizontal: 40,
    gap: 10,
    zIndex: 1,
  },
  waitingBtn: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  waitingText: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 16,
    color: colors.textSecondary,
    letterSpacing: 1,
  },
  backBtn: {
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 28,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  backText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 13,
    color: colors.textSecondary,
    letterSpacing: 1,
  },
});
