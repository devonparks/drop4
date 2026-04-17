import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Animated,
  Modal,
  ViewStyle,
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
import { haptics } from '../services/haptics';
import { playSound } from '../services/audio';
import { colors } from '../theme/colors';
import { fonts, weight } from '../theme/typography';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'CareerCity'>;

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
            onPress={() => navigation.goBack()}
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
      {/* City backdrop: full-screen gradient based on city's sky palette */}
      <LinearGradient
        colors={city.skyGradient}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <CityEnvironmentLayer city={city} />

      {/* ─── Header ─── */}
      <StaggeredEntry index={0} delay={60}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Pressable
          onPress={() => navigation.goBack()}
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
        <PressScale>
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.hudBtn}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel="Map"
          accessibilityHint="Return to the career map"
        >
          <LinearGradient colors={[colors.orange, colors.orangeDark]} style={styles.hudBtnBg}>
            <Text style={styles.hudBtnIcon}>‹</Text>
          </LinearGradient>
          <Text style={styles.hudBtnLabel}>MAP</Text>
        </Pressable>
        </PressScale>

        <PressScale>
        <Pressable
          onPress={() => { haptics.tap(); navigation.navigate('Roster'); }}
          style={styles.hudBtn}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel="Roster"
          accessibilityHint="Open the character roster"
        >
          <LinearGradient
            colors={[city.themeColor, city.accentColor]}
            style={styles.hudBtnBg}
          >
            <Text style={[styles.hudBtnIcon, { fontSize: 20 }]}>★</Text>
          </LinearGradient>
          <Text style={styles.hudBtnLabel}>ROSTER</Text>
        </Pressable>
        </PressScale>

        <PressScale>
        <Pressable
          onPress={() => { haptics.tap(); navigation.navigate('Character3DCreator'); }}
          style={styles.hudBtn}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel="Customize"
          accessibilityHint="Open the character creator"
        >
          <LinearGradient colors={['#9b59b6', '#6a3c8a']} style={styles.hudBtnBg}>
            <Text style={[styles.hudBtnIcon, { fontSize: 18 }]}>✎</Text>
          </LinearGradient>
          <Text style={styles.hudBtnLabel}>CUSTOMIZE</Text>
        </Pressable>
        </PressScale>

        <PressScale>
        <Pressable
          onPress={() => { haptics.tap(); navigation.getParent()?.navigate('MainTabs', { screen: 'Shop' } as any); }}
          style={styles.hudBtn}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel="Shop"
          accessibilityHint="Open the shop"
        >
          <LinearGradient colors={[colors.coinGold, '#c89030']} style={styles.hudBtnBg}>
            <Text style={[styles.hudBtnIcon, { fontSize: 18 }]}>🛒</Text>
          </LinearGradient>
          <Text style={styles.hudBtnLabel}>SHOP</Text>
        </Pressable>
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
          // Navigate to Matchup with the career level params (same API the
          // old career screen used — we're not breaking the game flow).
          navigation.navigate('Matchup', {
            mode: 'career',
            difficulty: lvl.difficulty,
            opponentName: lvl.opponent,
            opponentLevel: CAREER_RATINGS[lvl.id],
            opponentTitle: lvl.opponentPersonality,
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
          });
        }}
      />
    </ScreenBackground>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// CityEnvironmentLayer — procedural scene per city.
//
// Each city gets a distinct silhouette layer (buildings, trees, beach, etc.)
// drawn from simple shapes. This is where we'll later drop in real art —
// the layout stays the same, you just swap the `View`s for an Image.
// ─────────────────────────────────────────────────────────────────────────
function CityEnvironmentLayer({ city }: { city: CareerCity }) {
  if (city.id === 'brooklyn') {
    return <BrooklynScene city={city} />;
  }
  if (city.id === 'venice_beach') {
    return <VeniceBeachScene city={city} />;
  }
  if (city.id === 'harlem') {
    return <HarlemScene city={city} />;
  }
  return null;
}

function BrooklynScene(_props: { city: CareerCity }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Distant building silhouettes */}
      <View style={[absFill('10%', 0, '40%'), { flexDirection: 'row', alignItems: 'flex-end' }]}>
        {[60, 90, 45, 110, 70, 85, 50, 95].map((h, i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: h,
              backgroundColor: 'rgba(0,0,0,0.45)',
              borderTopLeftRadius: 2,
              borderTopRightRadius: 2,
              marginHorizontal: 1,
              borderTopWidth: 1,
              borderColor: 'rgba(255,255,255,0.05)',
            }}
          />
        ))}
      </View>
      {/* Ground line / blacktop gradient */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.55)']}
        style={{ position: 'absolute', left: 0, right: 0, top: '45%', bottom: 0 }}
      />
      {/* Cracks / pavement texture — thin diagonal lines */}
      {[...Array(18)].map((_, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            left: `${(i * 13) % 100}%`,
            top: `${50 + ((i * 7) % 45)}%`,
            width: 18,
            height: 1,
            backgroundColor: 'rgba(255,255,255,0.05)',
            transform: [{ rotate: `${(i * 23) % 90 - 45}deg` }],
          }}
        />
      ))}
    </View>
  );
}

function VeniceBeachScene(_props: { city: CareerCity }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Sun */}
      <View style={{
        position: 'absolute',
        left: '35%' as any,
        top: '18%' as any,
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255,230,180,0.55)',
        shadowColor: '#ffb347',
        shadowOpacity: 1,
        shadowRadius: 40,
      }} />
      {/* Ocean horizon */}
      <View style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: '38%',
        height: 2,
        backgroundColor: 'rgba(0,0,0,0.3)',
      }} />
      {/* Palm trees */}
      {([{ l: '8%', h: 140 }, { l: '80%', h: 120 }, { l: '90%', h: 160 }] as const).map((p, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            left: p.l as any,
            top: `${35 - (p.h / 8)}%` as `${number}%`,
            width: 6,
            height: p.h,
            backgroundColor: 'rgba(0,0,0,0.55)',
          }}
        >
          {/* Fronds */}
          <View style={{ position: 'absolute', top: -16, left: -28, width: 60, height: 18, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 30, transform: [{ rotate: '-20deg' }] }} />
          <View style={{ position: 'absolute', top: -14, left: -24, width: 60, height: 18, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 30, transform: [{ rotate: '15deg' }] }} />
        </View>
      ))}
      {/* Sand gradient at the bottom */}
      <LinearGradient
        colors={['transparent', 'rgba(244,164,96,0.25)', 'rgba(210,140,70,0.4)']}
        style={{ position: 'absolute', left: 0, right: 0, top: '55%', bottom: 0 }}
      />
    </View>
  );
}

function HarlemScene(_props: { city: CareerCity }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Building silhouettes with window lights */}
      <View style={[absFill('5%', 0, '45%'), { flexDirection: 'row', alignItems: 'flex-end' }]}>
        {[180, 140, 220, 160, 200, 130, 170].map((h, i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: h,
              backgroundColor: 'rgba(0,0,0,0.7)',
              marginHorizontal: 1,
              position: 'relative',
              borderTopWidth: 1,
              borderColor: 'rgba(155,89,182,0.25)',
            }}
          >
            {/* Window lights grid */}
            {[...Array(Math.floor(h / 18))].map((_, w) => (
              <View
                key={w}
                style={{
                  position: 'absolute',
                  top: w * 18 + 8,
                  left: '20%',
                  width: 4,
                  height: 4,
                  backgroundColor: (w + i) % 3 === 0 ? '#f1c40f' : 'transparent',
                }}
              />
            ))}
            {[...Array(Math.floor(h / 18))].map((_, w) => (
              <View
                key={`r${w}`}
                style={{
                  position: 'absolute',
                  top: w * 18 + 8,
                  right: '20%',
                  width: 4,
                  height: 4,
                  backgroundColor: (w + i + 1) % 3 === 0 ? '#f1c40f' : 'transparent',
                }}
              />
            ))}
          </View>
        ))}
      </View>
      {/* Street glow at bottom */}
      <LinearGradient
        colors={['transparent', 'rgba(155,89,182,0.2)', 'rgba(155,89,182,0.35)']}
        style={{ position: 'absolute', left: 0, right: 0, top: '45%', bottom: 0 }}
      />
      {/* Streetlight pools */}
      {[0.15, 0.5, 0.85].map((x, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            left: `${x * 100 - 8}%`,
            top: '65%',
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: 'rgba(241,196,15,0.08)',
          }}
        />
      ))}
    </View>
  );
}

// tiny helper used by scenes
function absFill(top: ViewStyle['top'], left: number, height: ViewStyle['height']): ViewStyle {
  return {
    position: 'absolute',
    left,
    right: 0,
    top,
    height,
  };
}

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
    <Pressable
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
      style={{
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
      <PressScale>
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
          {isLocked ? (
            <Text style={styles.nodeLock}>🔒</Text>
          ) : (
            <>
              <Text style={[styles.nodeRating, { color: nodeColor }]}>
                {rating}
              </Text>
              <Text style={styles.nodeOvr}>OVR</Text>
            </>
          )}
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
    </Pressable>
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
        onPress={onClose}
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

            <PressScale>
            <Pressable
              style={styles.modalPlayBtn}
              onPress={() => onPlay(level)}
              accessibilityRole="button"
              accessibilityLabel={`Play match against ${level.opponent}`}
            >
              <LinearGradient
                colors={[colors.orange, colors.orangeDark]}
                style={styles.modalPlayBtnBg}
              >
                <Text style={styles.modalPlayBtnText}>PLAY MATCH ›</Text>
              </LinearGradient>
            </Pressable>
            </PressScale>

            <Pressable
              style={styles.modalCloseBtn}
              onPress={onClose}
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
  nodeLock: {
    fontSize: 22,
    opacity: 0.8,
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
