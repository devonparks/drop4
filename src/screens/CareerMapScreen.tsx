import React, { useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
  Image,
  ImageSourcePropType,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { PressScale, SlideReveal, StaggeredEntry } from '../components/animations';
import { TopBar } from '../components/ui/TopBar';
import {
  CAREER_CITIES,
  CareerCity,
  CareerLevel,
  CAREER_RATINGS,
  isCityUnlocked,
  getCityCompletion,
  getReputationStars,
  getLevelsForCity,
  ALL_CAREER_LEVELS,
} from '../data/careerLevels';
import { useCareerStore } from '../stores/careerStore';
import { useGameStore } from '../stores/gameStore';
import { useShopStore } from '../stores/shopStore';
import { haptics } from '../services/haptics';
import { playSound } from '../services/audio';
import { colors } from '../theme/colors';
import { fonts, weight } from '../theme/typography';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'CareerMap'>;
};

const NODE_SIZE = 64;

// Flux-painted city hero art keyed by CareerCity.id. Used as an atmospheric
// backdrop on each zone card (Brooklyn blacktop, Venice beach, Harlem
// cathedral). Wide 1024x384 so it fills the card on low- and high-density
// displays. Missing keys leave the card with just its skyGradient.
const CITY_ART: Record<string, ImageSourcePropType> = {
  brooklyn: require('../assets/images/ui/city-brooklyn.png'),
  venice_beach: require('../assets/images/ui/city-venice.png'),
  harlem: require('../assets/images/ui/city-cathedral.png'),
};

// ─────────────────────────────────────────────────────────────────────────
// CareerMapScreen — Vertical Path (Candy Crush style)
//
// Single scrollable screen with all 36 levels in a zigzag trail.
// 3 themed zones (Brooklyn, Venice Beach, Harlem) separated by big
// zone transition cards. Current level pulses and auto-scrolls to view.
// ─────────────────────────────────────────────────────────────────────────

export function CareerMapScreen({ navigation }: Props) {
  const progress = useCareerStore((s) => s.progress);
  const newGame = useGameStore((s) => s.newGame);
  const coins = useShopStore((s) => s.coins);
  const gems = useShopStore((s) => s.gems);
  const level = useShopStore((s) => s.level);
  const insets = useSafeAreaInsets();

  const completedIds = useMemo(() => {
    const set = new Set<number>();
    for (const lvl of ALL_CAREER_LEVELS) {
      if (progress[lvl.id]?.completed) set.add(lvl.id);
    }
    return set;
  }, [progress]);

  const totalStars = useMemo(() => {
    let s = 0;
    for (const p of Object.values(progress)) s += p?.stars ?? 0;
    return s;
  }, [progress]);

  const reputationStars = getReputationStars(totalStars);

  // Find the next uncompleted level for auto-scroll
  const nextLevelId = useMemo(() => {
    for (const lvl of ALL_CAREER_LEVELS) {
      if (!progress[lvl.id]?.completed) return lvl.id;
    }
    return null;
  }, [progress]);

  // Build the playable cities (not "coming soon")
  const activeCities = useMemo(() =>
    CAREER_CITIES.filter((c) => !c.comingSoon),
  []);

  const scrollRef = useRef<ScrollView>(null);

  return (
    <ScreenBackground scene="career">
      <TopBar
        coins={coins}
        gems={gems}
        level={level}
        showBack
        onBackPress={() => navigation.goBack()}
      />

      {/* Hero */}
      <View style={styles.hero}>
        <Text style={styles.heroEyebrow}>CAREER MODE</Text>
        <Text style={styles.heroTitle} accessibilityRole="header">TAKE THE CITY</Text>
        <View style={styles.heroStats}>
          <Text style={styles.heroStat}>
            {completedIds.size}
            <Text style={styles.heroStatDim}>/{ALL_CAREER_LEVELS.length}</Text>
          </Text>
          <View style={styles.repRow}>
            {[0, 1, 2, 3, 4].map((i) => (
              <Text
                key={i}
                style={[
                  styles.repStar,
                  { color: i < reputationStars ? colors.coinGold : 'rgba(255,255,255,0.2)' },
                ]}
              >
                ★
              </Text>
            ))}
          </View>
        </View>
      </View>

      {/* Vertical path */}
      <ScrollView
        ref={scrollRef}
        style={styles.pathScroll}
        contentContainerStyle={[styles.pathContent, { paddingBottom: 40 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {activeCities.map((city, cityIdx) => {
          const cityLevels = getLevelsForCity(city.id);
          const unlocked = isCityUnlocked(city.id, completedIds);
          const stats = getCityCompletion(city, progress);

          return (
            <View key={city.id}>
              {/* Zone transition card */}
              <PressScale
                onPress={() => {
                  if (unlocked) {
                    haptics.tap();
                    playSound('whoosh');
                    navigation.navigate('CareerCity', { cityId: city.id });
                  }
                }}
                disabled={!unlocked}
                accessibilityRole="button"
                accessibilityLabel={
                  unlocked
                    ? `${city.name}, ${city.state} — ${stats.completed} of ${stats.total} levels complete`
                    : `${city.name} locked. Complete ${activeCities[cityIdx - 1]?.name || 'previous city'} to unlock`
                }
                accessibilityState={{ disabled: !unlocked }}
                style={[styles.zoneCard, !unlocked && styles.zoneCardLocked]}
              >
                <LinearGradient
                  colors={unlocked ? city.skyGradient : ['#0a0a12', '#0e0e18', '#12121e']}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                  style={styles.zoneGradient}
                >
                  {/* Painted city hero — Flux-generated arena scene per
                      city. Sits under the gradient at reduced opacity so
                      the skyGradient still tints the card but each city
                      gets its own atmospheric identity. Locked cities
                      render at lower opacity to read as muted. */}
                  {CITY_ART[city.id] && (
                    <View pointerEvents="none" style={styles.zoneArtLayer}>
                      <Image
                        source={CITY_ART[city.id]}
                        style={[styles.zoneArtImg, { opacity: unlocked ? 0.55 : 0.2 }]}
                        resizeMode="cover"
                      />
                    </View>
                  )}

                  {/* City name */}
                  <Text style={[styles.zoneName, { color: unlocked ? city.themeColor : 'rgba(255,255,255,0.35)' }]} accessibilityRole="header">
                    {city.nickname.toUpperCase()}
                  </Text>
                  <Text style={styles.zoneCity}>
                    {city.name}, {city.state}
                  </Text>
                  <Text style={[styles.zoneTagline, { color: unlocked ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.3)' }]}>
                    {city.tagline}
                  </Text>

                  {/* Progress bar */}
                  <View style={styles.zoneProgressRow}>
                    <View style={styles.zoneProgressTrack}>
                      <View
                        style={[
                          styles.zoneProgressFill,
                          {
                            width: `${stats.fraction * 100}%`,
                            backgroundColor: city.themeColor,
                          },
                        ]}
                      />
                    </View>
                    <Text style={[styles.zoneProgressText, { color: city.themeColor }]}>
                      {stats.completed}/{stats.total}
                    </Text>
                  </View>

                  {!unlocked && (
                    <View style={styles.zoneLockOverlay}>
                      <Text style={styles.zoneLockText}>🔒 Complete {activeCities[cityIdx - 1]?.name || 'previous'} to unlock</Text>
                    </View>
                  )}

                  {/* PLAY button for unlocked cities */}
                  {unlocked && (
                    <View style={[styles.zonePlayBtn, { backgroundColor: city.themeColor }]}>
                      <Text style={styles.zonePlayText}>PLAY ›</Text>
                    </View>
                  )}
                </LinearGradient>
              </PressScale>

              {/* Level nodes for this city — compact grid preview */}
              {unlocked && (
                <View style={styles.nodeGrid}>
                  {cityLevels.map((lvl, idx) => {
                    const isComplete = !!progress[lvl.id]?.completed;
                    const stars = progress[lvl.id]?.stars ?? 0;
                    const isNext = lvl.id === nextLevelId;
                    const priorIncomplete = cityLevels.slice(0, idx).some((l) => !progress[l.id]?.completed);
                    const isLocked = priorIncomplete && !isComplete;
                    // Pressable wrapper so tapping any unlocked level
                    // circle jumps to the city sheet for context — users
                    // instinctively try to tap the numbered circle, not
                    // the banner above. Locked circles don't fire so
                    // the padlock reads as "not yet" cleanly.
                    //
                    // Shortcut: tapping the single NEXT (current) level
                    // skips the city sheet and opens the matchup directly,
                    // since that's the most common action and the city
                    // context is unnecessary for the player's already-
                    // active level.
                    return (
                      <StaggeredEntry key={lvl.id} index={idx}>
                        <Pressable
                          disabled={isLocked}
                          onPress={() => {
                            haptics.tap();
                            playSound('click');
                            if (isNext) {
                              newGame(lvl.difficulty, true, {
                                rows: lvl.settings.rows,
                                cols: lvl.settings.cols,
                                connectCount: lvl.settings.connectCount,
                                timerSeconds: lvl.settings.timerSeconds || 0,
                                startingPlayer: (lvl.settings.playerGoesFirst === false ? 2 : 1) as 1 | 2,
                              });
                              navigation.navigate('Matchup', {
                                mode: 'career',
                                difficulty: lvl.difficulty,
                                opponentName: lvl.opponent,
                                opponentLevel: CAREER_RATINGS[lvl.id],
                                opponentTitle: lvl.opponentPersonality,
                                courtName: lvl.isBoss
                                  ? `BOSS · ${city.nickname.toUpperCase()}`
                                  : city.nickname.toUpperCase(),
                                careerLevelId: lvl.id,
                                careerLevelReward: lvl.reward
                                  ? { type: lvl.reward.type, amount: lvl.reward.amount, id: lvl.reward.id }
                                  : undefined,
                                careerChapter: lvl.chapter,
                                connectCount: lvl.settings.connectCount,
                                boardSize: lvl.settings.rows && lvl.settings.cols
                                  ? `${lvl.settings.rows}x${lvl.settings.cols}`
                                  : undefined,
                                timerSeconds: lvl.settings.timerSeconds,
                                presetBoard: lvl.settings.presetBoard as any,
                                movesLimit: lvl.settings.movesLimit,
                                rewardMultiplier: lvl.settings.rewardMultiplier,
                              });
                              return;
                            }
                            navigation.navigate('CareerCity', { cityId: city.id });
                          }}
                          accessibilityRole="button"
                          accessibilityLabel={
                            isLocked
                              ? `Level ${idx + 1} locked`
                              : isComplete
                              ? `Level ${idx + 1} complete, ${stars} of 3 stars`
                              : `Play level ${idx + 1}`
                          }
                          accessibilityState={{ disabled: isLocked }}
                        >
                          <PathNode
                            level={lvl}
                            levelNumber={idx + 1}
                            isComplete={isComplete}
                            isNext={isNext}
                            isLocked={isLocked}
                            stars={stars}
                            city={city}
                          />
                        </Pressable>
                      </StaggeredEntry>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}

        {/* Coming Soon teaser */}
        <SlideReveal from="bottom">
        <View style={styles.comingSoonCard}>
          <LinearGradient
            colors={['rgba(155,89,182,0.15)', 'rgba(155,89,182,0.04)']}
            style={styles.comingSoonGradient}
          >
            <Text style={styles.comingSoonEmoji}>🔮</Text>
            <Text style={styles.comingSoonTitle} accessibilityRole="header">MORE CITIES COMING</Text>
            <Text style={styles.comingSoonSub}>
              Chicago · Detroit · Oakland · Compton · Miami · ???
            </Text>
          </LinearGradient>
        </View>
        </SlideReveal>
      </ScrollView>
    </ScreenBackground>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// PathNode — compact circular node for the level preview grid
// ─────────────────────────────────────────────────────────────────────────
function PathNode({ level, levelNumber, isComplete, isNext, isLocked, stars, city }: {
  level: CareerLevel;
  levelNumber: number;
  isComplete: boolean;
  isNext: boolean;
  isLocked: boolean;
  stars: number;
  city: CareerCity;
}) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isNext) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 800, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [isNext, pulse]);

  const nodeColor = isLocked
    ? 'rgba(100,100,120,0.5)'
    : isComplete
    ? colors.green
    : isNext
    ? city.themeColor
    : 'rgba(255,255,255,0.3)';

  const bgColor = isLocked
    ? 'rgba(20,20,30,0.8)'
    : isComplete
    ? 'rgba(39,174,61,0.15)'
    : isNext
    ? `${city.themeColor}22`
    : 'rgba(255,255,255,0.05)';

  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.35] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] });

  return (
    <View style={[styles.node, { borderColor: nodeColor, backgroundColor: bgColor }]}>
      {isNext && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.nodePulse,
            {
              borderColor: city.themeColor,
              transform: [{ scale: ringScale }],
              opacity: ringOpacity,
            },
          ]}
        />
      )}
      {isLocked ? (
        <Text style={styles.nodeLock}>🔒</Text>
      ) : level.isBoss ? (
        <Image
          source={require('../assets/images/ui/boss-crown.png')}
          style={styles.nodeBossImg}
          resizeMode="contain"
        />
      ) : (
        <Text style={[styles.nodeNumber, { color: nodeColor }]}>{levelNumber}</Text>
      )}
      {isComplete && (
        <View style={styles.nodeStars}>
          {[0, 1, 2].map((i) => (
            <Text key={i} style={{ fontSize: 8, color: i < stars ? '#ffd700' : 'rgba(255,255,255,0.2)' }}>★</Text>
          ))}
        </View>
      )}
      {isNext && (
        <View style={[styles.nodeNextBadge, { backgroundColor: city.themeColor }]}>
          <Text style={styles.nodeNextText}>NEXT</Text>
        </View>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    paddingTop: 4,
    paddingBottom: 10,
  },
  heroEyebrow: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 11,
    color: colors.orange,
    letterSpacing: 2,
  },
  heroTitle: {
    fontFamily: fonts.heading,
    fontWeight: weight.black,
    fontSize: 28,
    color: '#ffffff',
    letterSpacing: 1,
    textShadowColor: 'rgba(255,140,0,0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 4,
  },
  heroStat: {
    fontFamily: fonts.heading,
    fontWeight: weight.black,
    fontSize: 20,
    color: '#ffffff',
  },
  heroStatDim: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: weight.medium,
  },
  repRow: {
    flexDirection: 'row',
    gap: 2,
  },
  repStar: {
    fontSize: 16,
    textShadowColor: 'rgba(255,215,0,0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },

  // Scroll
  pathScroll: {
    flex: 1,
  },
  pathContent: {
    paddingHorizontal: 16,
    paddingTop: 6,
  },

  // Zone card
  zoneCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  zoneCardLocked: {
    opacity: 0.6,
  },
  zoneGradient: {
    paddingVertical: 20,
    paddingHorizontal: 20,
    minHeight: 140,
    justifyContent: 'center',
    position: 'relative',
  },
  // Painted city art layer — sits between the gradient and the text.
  // Covers the full card so the painted arena reads as the hero visual.
  zoneArtLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  zoneArtImg: {
    width: '100%',
    height: '100%',
  },
  zoneName: {
    fontFamily: fonts.heading,
    fontWeight: weight.black,
    fontSize: 24,
    letterSpacing: 2,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  zoneCity: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  zoneTagline: {
    fontFamily: fonts.body,
    fontStyle: 'italic',
    fontSize: 11,
    marginTop: 6,
  },
  zoneProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
  },
  zoneProgressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  zoneProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  zoneProgressText: {
    fontFamily: fonts.body,
    fontWeight: weight.black,
    fontSize: 13,
  },
  zoneLockOverlay: {
    marginTop: 10,
    alignItems: 'center',
  },
  zoneLockText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },
  zonePlayBtn: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
  },
  zonePlayText: {
    fontFamily: fonts.body,
    fontWeight: weight.black,
    fontSize: 13,
    color: '#ffffff',
    letterSpacing: 1,
  },

  // Node grid (compact preview of levels within a zone)
  nodeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 4,
    paddingVertical: 8,
    marginBottom: 16,
    justifyContent: 'center',
  },
  node: {
    width: NODE_SIZE,
    height: NODE_SIZE,
    borderRadius: NODE_SIZE / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  nodePulse: {
    position: 'absolute',
    width: NODE_SIZE,
    height: NODE_SIZE,
    borderRadius: NODE_SIZE / 2,
    borderWidth: 3,
  },
  nodeNumber: {
    fontFamily: fonts.heading,
    fontWeight: weight.black,
    fontSize: 20,
    lineHeight: 22,
  },
  nodeLock: {
    fontSize: 18,
    opacity: 0.7,
  },
  // Flux-painted boss crown — replaces the 👑 emoji inside boss-level nodes.
  // Sized to fit the 64px node with comfortable padding.
  nodeBossImg: {
    width: 36,
    height: 36,
  },
  nodeStars: {
    position: 'absolute',
    bottom: -4,
    flexDirection: 'row',
    gap: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.4)',
  },
  nodeNextBadge: {
    position: 'absolute',
    top: -8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  nodeNextText: {
    fontFamily: fonts.body,
    fontWeight: weight.black,
    fontSize: 7,
    color: '#ffffff',
    letterSpacing: 0.8,
  },

  // Coming soon
  comingSoonCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(155,89,182,0.3)',
  },
  comingSoonGradient: {
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  comingSoonEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  comingSoonTitle: {
    fontFamily: fonts.heading,
    fontWeight: weight.black,
    fontSize: 16,
    color: colors.purple,
    letterSpacing: 2,
  },
  comingSoonSub: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    marginTop: 6,
  },
});
