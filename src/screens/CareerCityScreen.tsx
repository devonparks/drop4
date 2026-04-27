import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Animated,
  Modal,
  Image,
  ImageSourcePropType,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { PressScale, StaggeredEntry } from '../components/animations';
import {
  CITY_BY_ID,
  CareerCity,
  CareerLevel,
  CAREER_RATINGS,
  getLevelsForCity,
} from '../data/careerLevels';
import { useCareerStore } from '../stores/careerStore';
import { useGameStore } from '../stores/gameStore';
import { haptics } from '../services/haptics';
import { playSound } from '../services/audio';
import { colors } from '../theme/colors';
import { fonts, weight } from '../theme/typography';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'CareerCity'>;

// Calm-pass: same painted city art used as the CareerMap zone-card preview
// is now used as the full-screen backdrop INSIDE the city. Reusing one
// asset across both surfaces ties the navigation visually — the user taps
// the painted Brooklyn dusk and lands inside that exact scene.
const CITY_ART: Record<string, ImageSourcePropType> = {
  brooklyn: require('../assets/images/ui/city-brooklyn.png'),
  venice_beach: require('../assets/images/ui/city-venice.png'),
  harlem: require('../assets/images/ui/city-cathedral.png'),
};

// ─────────────────────────────────────────────────────────────────────────
// CareerCityScreen — "The Court" (Basketball Stars tribute)
//
// Per-city node path. Layout rules:
//   • 12 opponent nodes arranged in a snake pattern down the screen
//   • Snake = alternating rows where odd rows run left→right, even rows
//     run right→left, creating a zig-zag trail players scroll through
//   • Each node is a circular "player card" with a rating number
//   • Background is procedural per-city: sky gradient + themed shapes
//   • Persistent header: back button + city name + progress
//   • Tap node → OpponentCard modal with details and PLAY button
// ─────────────────────────────────────────────────────────────────────────

const NODE_SIZE = 72;
const BOSS_NODE_SIZE = 92;
const NODE_ROW_HEIGHT = 170;  // vertical space per node step
const NODES_PER_ROW = 2;      // zig-zag has 2 nodes visible per row

export function CareerCityScreen({ navigation, route }: Props) {
  const { cityId } = route.params;
  const city = CITY_BY_ID[cityId];
  const progress = useCareerStore((s) => s.progress);
  const newGame = useGameStore((s) => s.newGame);
  const [selectedLevelId, setSelectedLevelId] = useState<number | null>(null);
  const insets = useSafeAreaInsets();

  const levels = useMemo(() => getLevelsForCity(cityId), [cityId]);

  // Determine which level is "next" — first uncompleted in order.
  const nextUncompletedId = useMemo(() => {
    for (const lvl of levels) {
      if (!progress[lvl.id]?.completed) return lvl.id;
    }
    return null;
  }, [levels, progress]);

  if (!city) {
    return (
      <ScreenBackground>
        <View style={styles.errorWrap}>
          <Text style={styles.errorText}>City not found.</Text>
          <Pressable
            onPress={() => { haptics.tap(); playSound('click'); navigation.goBack(); }}
            style={styles.errorBtn}
            accessibilityRole="button"
            accessibilityLabel="Back to map"
          >
            <Text style={styles.errorBtnText}>← Back to Map</Text>
          </Pressable>
        </View>
      </ScreenBackground>
    );
  }

  const completedCount = levels.filter((l) => progress[l.id]?.completed).length;

  const handleNodePress = (level: CareerLevel) => {
    // Gate: only tappable if all prior levels in this city are completed,
    // OR this level is already completed (replay).
    const idx = levels.findIndex((l) => l.id === level.id);
    const priorIncomplete = levels.slice(0, idx).some((l) => !progress[l.id]?.completed);
    if (priorIncomplete && !progress[level.id]?.completed) {
      haptics.error?.();
      return;
    }
    haptics.tap();
    playSound('click');
    setSelectedLevelId(level.id);
  };

  const selectedLevel = selectedLevelId != null
    ? levels.find((l) => l.id === selectedLevelId) ?? null
    : null;

  return (
    <ScreenBackground>
      {/* Calm-pass: previously a per-city LinearGradient + procedural
          CityEnvironmentLayer (silhouette buildings / palms / arches drawn
          as Views). Now the painted city PNG (Brooklyn dusk / Venice sunset
          / Harlem cathedral) is the full-screen backdrop — same asset the
          user tapped on the CareerMap card. Painted scenes are A-tier; the
          procedural shapes were a placeholder. CityEnvironmentLayer + its
          BrooklynScene / VeniceBeachScene / HarlemScene helpers are now
          dead code (left in file for now, can be cleaned in a follow-up). */}
      {CITY_ART[city.id] && (
        <Image
          source={CITY_ART[city.id]}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
      )}
      {/* Soft dark overlay so the painted scene recedes behind the
          opponent nodes / labels — pure darken, no color tint. */}
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(5,8,20,0.35)' }]} />

      {/* ─── Header ─── */}
      <StaggeredEntry index={0} delay={60}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Pressable
          onPress={() => { haptics.tap(); playSound('click'); navigation.goBack(); }}
          style={styles.backBtn}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Back to career map"
        >
          <LinearGradient
            colors={[colors.orange, colors.orangeDark]}
            style={styles.backBtnBg}
          >
            <Text style={styles.backBtnText}>‹</Text>
          </LinearGradient>
        </Pressable>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerNickname} accessibilityRole="header">{city.nickname.toUpperCase()}</Text>
          <Text style={styles.headerCity}>
            {city.name}, <Text style={styles.headerState}>{city.state}</Text>
          </Text>
        </View>
        <View style={[styles.progressChip, { borderColor: city.themeColor }]}>
          <Text style={[styles.progressChipText, { color: city.themeColor }]}>
            {completedCount}/{levels.length}
          </Text>
        </View>
      </View>
      </StaggeredEntry>

      {/* ─── Node path ─── */}
      <StaggeredEntry index={1} delay={60} style={{ flex: 1 }}>
      <ScrollView
        style={styles.pathScroll}
        contentContainerStyle={[styles.pathContent, { paddingBottom: 120 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.tagline, { color: city.accentColor }]}>
          "{city.tagline}"
        </Text>

        <View style={styles.pathWrap}>
          {levels.map((level, index) => {
            const isComplete = !!progress[level.id]?.completed;
            const stars = progress[level.id]?.stars ?? 0;
            const isNext = level.id === nextUncompletedId;
            const idx = levels.findIndex((l) => l.id === level.id);
            const priorIncomplete = levels.slice(0, idx).some((l) => !progress[l.id]?.completed);
            const isLocked = priorIncomplete && !isComplete;
            return (
              <OpponentNode
                key={level.id}
                level={level}
                index={index}
                total={levels.length}
                isComplete={isComplete}
                isNext={isNext}
                isLocked={isLocked}
                stars={stars}
                city={city}
                onPress={() => handleNodePress(level)}
              />
            );
          })}
        </View>
      </ScrollView>
      </StaggeredEntry>

      {/* ─── Bottom HUD (Basketball Stars style) ─── */}
      <StaggeredEntry index={2} delay={60}>
      {/* Persistent bar along the bottom. Gives the screen proper structure
          on mobile instead of letting the path scroll fade into empty space. */}
      <View style={[styles.bottomHud, { paddingBottom: Math.max(12, insets.bottom) }]}>
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0.9)']}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        {/* Calm-pass: 4 HUD buttons unified to ONE shared style — translucent
            dark navy circle with a thin warm-amber border. Was previously 4
            different bright gradients (orange / city color / purple / gold)
            that fought the cinematic bg. Now they read as a single chrome
            row, supporting the painted scene rather than competing with it. */}
        <PressScale
          onPress={() => { haptics.tap(); playSound('click'); navigation.goBack(); }}
          style={styles.hudBtn}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel="Map"
          accessibilityHint="Return to the career map"
        >
          <View style={styles.hudBtnBgCalm}>
            <Text style={styles.hudBtnIcon}>‹</Text>
          </View>
          <Text style={styles.hudBtnLabel}>MAP</Text>
        </PressScale>

        <PressScale
          onPress={() => { haptics.tap(); playSound('click'); navigation.navigate('Roster'); }}
          style={styles.hudBtn}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel="Roster"
          accessibilityHint="Open the character roster"
        >
          <View style={styles.hudBtnBgCalm}>
            <Text style={[styles.hudBtnIcon, { fontSize: 20 }]}>★</Text>
          </View>
          <Text style={styles.hudBtnLabel}>ROSTER</Text>
        </PressScale>

        <PressScale
          onPress={() => { haptics.tap(); playSound('click'); navigation.navigate('Character3DCreator'); }}
          style={styles.hudBtn}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel="Customize"
          accessibilityHint="Open the character creator"
        >
          <View style={styles.hudBtnBgCalm}>
            <Text style={[styles.hudBtnIcon, { fontSize: 18 }]}>✎</Text>
          </View>
          <Text style={styles.hudBtnLabel}>CUSTOMIZE</Text>
        </PressScale>

        <PressScale
          onPress={() => { haptics.tap(); playSound('click'); navigation.getParent()?.navigate('MainTabs', { screen: 'Shop' } as any); }}
          style={styles.hudBtn}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel="Shop"
          accessibilityHint="Open the shop"
        >
          <View style={styles.hudBtnBgCalm}>
            <Text style={[styles.hudBtnIcon, { fontSize: 18 }]}>🛒</Text>
          </View>
          <Text style={styles.hudBtnLabel}>SHOP</Text>
        </PressScale>
      </View>
      </StaggeredEntry>

      {/* ─── Opponent detail modal ─── */}
      <OpponentCardModal
        level={selectedLevel}
        city={city}
        visible={!!selectedLevel}
        onClose={() => setSelectedLevelId(null)}
        onPlay={(lvl) => {
          setSelectedLevelId(null);
          // Reset gameStore for the fresh match. Without this, stale state
          // from the previous game (status='draw'/'won', leftover board,
          // wrong opponent) carries over and the column-tap handler is
          // gated by `disabled = status !== 'playing'` so pieces can't drop.
          // Mirrors the pattern in the old CareerScreen.handlePlayLevel.
          newGame(lvl.difficulty, true, {
            rows: lvl.settings.rows,
            cols: lvl.settings.cols,
            connectCount: lvl.settings.connectCount,
            timerSeconds: lvl.settings.timerSeconds || 0,
            startingPlayer: (lvl.settings.playerGoesFirst === false ? 2 : 1) as 1 | 2,
          });
          // Navigate to Matchup with the career level params (same API the
          // old career screen used — we're not breaking the game flow).
          navigation.navigate('Matchup', {
            mode: 'career',
            difficulty: lvl.difficulty,
            opponentName: lvl.opponent,
            opponentLevel: CAREER_RATINGS[lvl.id],
            opponentTitle: lvl.opponentPersonality,
            // Court label: city nickname for normal levels, BOSS BATTLE for bosses.
            // Without this, MatchupScreen falls back to 'CAREER: BOSS BATTLE' for
            // every career match and flags every opponent as a boss (wrong).
            courtName: lvl.isBoss
              ? `BOSS · ${city.nickname.toUpperCase()}`
              : city.nickname.toUpperCase(),
            careerLevelId: lvl.id,
            careerLevelReward: lvl.reward
              ? {
                  type: lvl.reward.type,
                  amount: lvl.reward.amount,
                  id: lvl.reward.id,
                }
              : undefined,
            careerChapter: lvl.chapter,
            connectCount: lvl.settings.connectCount,
            boardSize: lvl.settings.rows && lvl.settings.cols
              ? `${lvl.settings.rows}x${lvl.settings.cols}`
              : undefined,
            timerSeconds: lvl.settings.timerSeconds,
            presetBoard: lvl.settings.presetBoard as any,
            // Phase 2: jeopardy 3× rewards + moves-limit target levels.
            movesLimit: lvl.settings.movesLimit,
            rewardMultiplier: lvl.settings.rewardMultiplier,
          });
        }}
      />
    </ScreenBackground>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// CityEnvironmentLayer + BrooklynScene/VeniceBeachScene/HarlemScene + the
// absFill helper were procedural-shape backdrops drawn with View+rgba
// rectangles to imply each city's atmosphere. Removed in the calm-pass —
// CareerCity now renders the painted city-* PNGs full-screen instead. The
// procedural layer was always meant as a placeholder per its original
// docstring ("This is where we'll later drop in real art — the layout
// stays the same, you just swap the Views for an Image"). Real art is now
// in. Keeping the file lean.
// ─────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────
// OpponentNode — single circular node on the path.
// Renders a player-card style circle with a big rating number. Decorates
// based on state (current/completed/locked/boss).
// ─────────────────────────────────────────────────────────────────────────
interface OpponentNodeProps {
  level: CareerLevel;
  index: number;
  total: number;
  isComplete: boolean;
  isNext: boolean;
  isLocked: boolean;
  stars: number;
  city: CareerCity;
  onPress: () => void;
}

function OpponentNode({
  level, index, total: _total, isComplete, isNext, isLocked, stars, city, onPress,
}: OpponentNodeProps) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isNext) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 900, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [isNext, pulse]);

  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.35] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] });

  // Snake positioning: even rows run left→right, odd rows run right→left.
  const row = Math.floor(index / NODES_PER_ROW);
  const col = index % NODES_PER_ROW;
  const actualCol = row % 2 === 0 ? col : NODES_PER_ROW - 1 - col;
  const leftPct = (actualCol + 0.5) * (100 / NODES_PER_ROW);
  const top = row * NODE_ROW_HEIGHT;
  const size = level.isBoss ? BOSS_NODE_SIZE : NODE_SIZE;

  // Rating color by tier
  const rating = CAREER_RATINGS[level.id];
  const ratingTierColor =
    level.isBoss ? '#ffd700' :
    rating >= 86 ? '#e74c3c' :
    rating >= 78 ? '#3498db' :
    '#f4a623';

  const nodeColor = isLocked
    ? 'rgba(120,120,140,0.5)'
    : isComplete
    ? '#2ecc71'
    : isNext
    ? city.themeColor
    : ratingTierColor;

  // Difficulty-based background color tone
  const bgGradient: [string, string] =
    level.isBoss ? ['#5a3e00', '#3a2800'] :
    rating >= 86 ? ['#5a1e1e', '#3a0f0f'] :
    rating >= 78 ? ['#1e3a5a', '#0f1e3a'] :
    ['#5a3e0a', '#3a2800'];

  return (
    <PressScale
      onPress={onPress}
      disabled={isLocked}
      accessibilityRole="button"
      accessibilityLabel={
        isLocked
          ? `Locked opponent, rating ${rating}`
          : `${level.opponent}${level.isBoss ? ', boss' : ''}, rating ${rating}${isComplete ? `, completed with ${stars} stars` : isNext ? ', next match' : ''}`
      }
      accessibilityState={{ disabled: isLocked, selected: isNext }}
      accessibilityHint={isLocked ? undefined : 'Open match details'}
      containerStyle={{
        position: 'absolute',
        left: `${leftPct}%`,
        top,
        width: size + 20,
        height: size + 36,
        marginLeft: -(size + 20) / 2,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Pulse halo for NEXT node */}
      {isNext && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: 3,
            borderColor: city.themeColor,
            transform: [{ scale: ringScale }],
            opacity: ringOpacity,
          }}
        />
      )}

      {/* Main node circle */}
      <View
        style={[
          styles.node,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: nodeColor,
            borderWidth: level.isBoss ? 4 : 3,
            shadowColor: nodeColor,
          },
          isLocked && { opacity: 0.55 },
        ]}
      >
        <LinearGradient
          colors={isLocked ? ['rgba(40,40,50,0.8)', 'rgba(20,20,25,0.9)'] : bgGradient}
          style={[styles.nodeGradient, { borderRadius: size / 2 - 2 }]}
        >
          {/* Calm-pass: locked nodes used to render a giant 🔒 emoji with no
              hint of what was coming — Devon's audit called out the visual
              monotony (11 identical padlocks). Now locked nodes show the
              opponent's RATING dimmed + small "LOCKED" caption, giving
              variety per node and teasing difficulty. The grey border +
              opacity 0.55 on the wrapper still signals "you can't tap me." */}
          <Text style={[
            styles.nodeRating,
            { color: nodeColor },
            isLocked && { opacity: 0.45 },
          ]}>
            {rating}
          </Text>
          <Text style={[
            styles.nodeOvr,
            isLocked && { opacity: 0.55, letterSpacing: 1.2 },
          ]}>
            {isLocked ? 'LOCKED' : 'OVR'}
          </Text>
        </LinearGradient>

        {/* Boss rays */}
        {level.isBoss && !isLocked && (
          <View pointerEvents="none" style={styles.bossRays}>
            {[0, 60, 120, 180, 240, 300].map((deg) => (
              <View
                key={deg}
                style={[
                  styles.bossRay,
                  { transform: [{ rotate: `${deg}deg` }] },
                ]}
              />
            ))}
          </View>
        )}

        {/* Star medal overlay for completed */}
        {isComplete && (
          <View style={styles.nodeStars}>
            {[0, 1, 2].map((i) => (
              <Text
                key={i}
                style={[
                  styles.nodeStar,
                  { color: i < stars ? '#ffd700' : 'rgba(255,255,255,0.2)' },
                ]}
              >
                ★
              </Text>
            ))}
          </View>
        )}

        {/* Level-type chip — small badge so players can tell a timed level,
            puzzle, or big-board level apart from a normal match at a glance.
            Boss already has rays/crown treatment so skip the chip there. */}
        {!isLocked && !level.isBoss && (() => {
          // Phase 2 types (jeopardy, moves_limit) take priority — they're
          // the most distinct experiences, so the chip should name them
          // even if the level also happens to be a big board or timed.
          const icon =
            level.type === 'jeopardy' || level.settings.rewardMultiplier ? '💰' :
            level.type === 'moves_limit' || level.settings.movesLimit ? '🎯' :
            level.type === 'speed' || (level.settings.timerSeconds && level.settings.timerSeconds <= 5) ? '⚡' :
            level.type === 'timed' || level.settings.timerSeconds ? '⏱️' :
            level.type === 'puzzle' || level.settings.presetBoard ? '🧩' :
            level.type === 'connect3' ? '3' :
            level.type === 'connect5' ? '5' :
            level.type === 'connect6' ? '6' :
            level.type === 'go_second' ? '↩' :
            (level.settings.rows && level.settings.cols && (level.settings.rows > 7 || level.settings.cols > 8)) ? '📏' :
            null;
          if (!icon) return null;
          const isPhase2 = level.type === 'jeopardy' || level.type === 'moves_limit';
          return (
            <View style={[styles.nodeTypeChip, isPhase2 && styles.nodeTypeChipPhase2]} pointerEvents="none">
              <Text style={[styles.nodeTypeChipText, isPhase2 && styles.nodeTypeChipTextPhase2]}>{icon}</Text>
            </View>
          );
        })()}
      </View>

      {/* Name label */}
      <Text
        style={[
          styles.nodeName,
          isLocked && { color: 'rgba(255,255,255,0.35)' },
          level.isBoss && { color: '#ffd700', fontWeight: '900' },
        ]}
        numberOfLines={1}
      >
        {isLocked ? '???' : level.opponent}
      </Text>
    </PressScale>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// OpponentCardModal — slide-up detail card with PLAY button
// ─────────────────────────────────────────────────────────────────────────
interface OpponentCardModalProps {
  level: CareerLevel | null;
  city: CareerCity;
  visible: boolean;
  onClose: () => void;
  onPlay: (level: CareerLevel) => void;
}

function OpponentCardModal({ level, city, visible, onClose, onPlay }: OpponentCardModalProps) {
  const slide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(slide, {
      toValue: visible ? 1 : 0,
      useNativeDriver: true,
      damping: 18,
      stiffness: 150,
    }).start();
  }, [visible, slide]);

  if (!level) return null;

  const rating = CAREER_RATINGS[level.id];

  const modifierPills: string[] = [];
  if (level.settings.rewardMultiplier && level.settings.rewardMultiplier >= 2) {
    modifierPills.push(`💰 ${level.settings.rewardMultiplier}× Coins`);
  }
  if (level.settings.movesLimit) {
    modifierPills.push(`🎯 ${level.settings.movesLimit} Move Limit`);
  }
  if (level.settings.connectCount && level.settings.connectCount !== 4) {
    modifierPills.push(`Connect ${level.settings.connectCount}`);
  }
  if (level.settings.rows && level.settings.cols) {
    modifierPills.push(`${level.settings.rows}x${level.settings.cols}`);
  }
  if (level.settings.timerSeconds) {
    modifierPills.push(`${level.settings.timerSeconds}s Timer`);
  }
  if (level.settings.playerGoesFirst === false) {
    modifierPills.push('Go Second');
  }
  if (level.settings.presetBoard) {
    modifierPills.push('Pre-placed');
  }

  const translateY = slide.interpolate({ inputRange: [0, 1], outputRange: [500, 0] });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={styles.modalBackdrop}
        onPress={() => { haptics.tap(); playSound('click'); onClose(); }}
        accessibilityRole="button"
        accessibilityLabel="Dismiss"
      >
        <Animated.View
          style={[styles.modalCard, { transform: [{ translateY }] }]}
          onStartShouldSetResponder={() => true}
        >
          <LinearGradient
            colors={['rgba(40,30,70,0.98)', 'rgba(20,15,40,0.98)']}
            style={styles.modalInner}
          >
            <View style={[styles.modalRatingRing, { borderColor: city.themeColor, shadowColor: city.themeColor }]}>
              <Text style={[styles.modalRating, { color: city.themeColor }]}>{rating}</Text>
              <Text style={styles.modalRatingLabel}>OVR</Text>
            </View>

            <Text style={styles.modalName} accessibilityRole="header">{level.opponent}</Text>
            <Text style={styles.modalLevelName}>{level.name}</Text>
            <Text style={styles.modalPersonality}>"{level.opponentPersonality}"</Text>

            {modifierPills.length > 0 && (
              <View style={styles.modalPills}>
                {modifierPills.map((m) => (
                  <View key={m} style={[styles.modalPill, { borderColor: city.themeColor }]}>
                    <Text style={[styles.modalPillText, { color: city.themeColor }]}>{m}</Text>
                  </View>
                ))}
              </View>
            )}

            {level.reward && (
              <View style={styles.modalReward}>
                <Text style={styles.modalRewardLabel} accessibilityRole="header">REWARD</Text>
                <Text style={styles.modalRewardName}>
                  {level.reward.icon} {level.reward.name}
                </Text>
              </View>
            )}

            <PressScale
              style={styles.modalPlayBtn}
              onPress={() => { haptics.tap(); playSound('whoosh'); onPlay(level); }}
              accessibilityRole="button"
              accessibilityLabel={`Play match against ${level.opponent}`}
            >
              <LinearGradient
                colors={[colors.orange, colors.orangeDark]}
                style={styles.modalPlayBtnBg}
              >
                <Text style={styles.modalPlayBtnText}>PLAY MATCH ›</Text>
              </LinearGradient>
            </PressScale>

            <Pressable
              style={styles.modalCloseBtn}
              onPress={() => { haptics.tap(); playSound('click'); onClose(); }}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
            >
              <Text style={styles.modalCloseBtnText}>CANCEL</Text>
            </Pressable>
          </LinearGradient>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  errorWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontFamily: fonts.body,
    color: '#ffffff',
    fontSize: 16,
    marginBottom: 12,
  },
  errorBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: colors.orange,
    borderRadius: 12,
  },
  errorBtnText: {
    color: '#ffffff',
    fontWeight: weight.bold,
    fontFamily: fonts.body,
  },

  // Header — paddingTop is applied inline from useSafeAreaInsets()
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingBottom: 10,
    gap: 10,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    shadowColor: colors.orange,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 6,
  },
  backBtnBg: {
    width: '100%',
    height: '100%',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '900',
    marginTop: -4,
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerNickname: {
    fontFamily: fonts.heading,
    fontWeight: weight.black,
    fontSize: 22,
    color: '#ffffff',
    letterSpacing: 1,
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  headerCity: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 1,
  },
  headerState: {
    fontWeight: weight.bold,
    color: colors.coinGold,
  },
  progressChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 2,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  progressChipText: {
    fontFamily: fonts.body,
    fontWeight: weight.black,
    fontSize: 13,
  },

  // Path
  pathScroll: {
    flex: 1,
  },
  pathContent: {
    paddingTop: 6,
    paddingBottom: 120,
  },
  tagline: {
    textAlign: 'center',
    fontFamily: fonts.body,
    fontStyle: 'italic',
    fontSize: 12,
    paddingHorizontal: 24,
    marginBottom: 12,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  pathWrap: {
    position: 'relative',
    // Height = number of rows * row height. For 12 nodes at 2 per row = 6 rows.
    height: 6 * NODE_ROW_HEIGHT + 60,
  },

  // Node
  node: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 12,
    elevation: 8,
  },
  nodeGradient: {
    position: 'absolute',
    top: 2,
    left: 2,
    right: 2,
    bottom: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeRating: {
    fontFamily: fonts.heading,
    fontWeight: weight.black,
    fontSize: 28,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  nodeOvr: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 8,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 1,
    marginTop: -2,
  },
  bossRays: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bossRay: {
    position: 'absolute',
    width: 2,
    height: 14,
    backgroundColor: '#ffd700',
    top: -18,
  },
  nodeStars: {
    position: 'absolute',
    bottom: -8,
    flexDirection: 'row',
    gap: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.5)',
  },
  nodeStar: {
    fontSize: 9,
  },
  nodeTypeChip: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(10,14,32,0.95)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,200,80,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    shadowColor: '#ffcc50',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 4,
  },
  nodeTypeChipText: {
    fontFamily: fonts.body,
    fontWeight: weight.black,
    fontSize: 11,
    color: '#ffcc50',
  },
  // Phase 2 chips (jeopardy / moves_limit) get a brighter gold ring so they
  // pop in the city view — these are the highest-stakes matches in the chapter.
  nodeTypeChipPhase2: {
    borderColor: '#ffd54f',
    backgroundColor: 'rgba(40,20,0,0.95)',
    shadowColor: '#ffd54f',
    shadowOpacity: 0.9,
    shadowRadius: 6,
  },
  nodeTypeChipTextPhase2: {
    color: '#ffd54f',
  },
  nodeName: {
    marginTop: 10,
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 10,
    color: '#ffffff',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    maxWidth: 110,
  },

  // Persistent bottom HUD bar
  bottomHud: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 14,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  hudBtn: {
    alignItems: 'center',
    gap: 4,
  },
  // Calm-pass replacement for the 4 different bright gradient bgs.
  // Single shared circular surface: translucent dark navy + thin warm-amber
  // border + matching subtle drop shadow. Reads as one chrome row.
  hudBtnBgCalm: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(10,14,32,0.65)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,180,90,0.45)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4,
  },
  hudBtnBg: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 4,
  },
  hudBtnIcon: {
    fontSize: 26,
    fontWeight: '900',
    color: '#ffffff',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  hudBtnLabel: {
    fontFamily: fonts.body,
    fontSize: 9,
    fontWeight: weight.bold,
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: 0.8,
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    marginHorizontal: 16,
    marginBottom: 32,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  modalInner: {
    padding: 24,
    alignItems: 'center',
  },
  modalRatingRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 16,
    elevation: 10,
    marginBottom: 12,
  },
  modalRating: {
    fontFamily: fonts.heading,
    fontWeight: weight.black,
    fontSize: 32,
    lineHeight: 34,
  },
  modalRatingLabel: {
    fontFamily: fonts.body,
    fontSize: 9,
    fontWeight: weight.bold,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 1,
  },
  modalName: {
    fontFamily: fonts.heading,
    fontWeight: weight.black,
    fontSize: 22,
    color: '#ffffff',
    textAlign: 'center',
  },
  modalLevelName: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 12,
    color: colors.coinGold,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  modalPersonality: {
    fontFamily: fonts.body,
    fontStyle: 'italic',
    fontSize: 12,
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 12,
  },
  modalPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginTop: 14,
  },
  modalPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  modalPillText: {
    fontFamily: fonts.body,
    fontSize: 10,
    fontWeight: weight.bold,
    letterSpacing: 0.5,
  },
  modalReward: {
    marginTop: 14,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255,215,0,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.3)',
    borderRadius: 10,
    alignItems: 'center',
  },
  modalRewardLabel: {
    fontFamily: fonts.body,
    fontSize: 9,
    fontWeight: weight.bold,
    color: colors.coinGold,
    letterSpacing: 1.2,
  },
  modalRewardName: {
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: weight.bold,
    color: '#ffffff',
    marginTop: 2,
  },
  modalPlayBtn: {
    marginTop: 18,
    alignSelf: 'stretch',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: colors.orange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 10,
  },
  modalPlayBtnBg: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalPlayBtnText: {
    fontFamily: fonts.body,
    fontWeight: weight.black,
    fontSize: 16,
    color: '#ffffff',
    letterSpacing: 1,
  },
  modalCloseBtn: {
    marginTop: 10,
    paddingVertical: 8,
  },
  modalCloseBtnText: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: weight.bold,
    letterSpacing: 1,
  },
});
