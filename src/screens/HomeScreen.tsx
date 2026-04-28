import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, Image, ImageSourcePropType, StyleSheet, Pressable, Animated, Platform, PanResponder } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { TopBar } from '../components/ui/TopBar';
import { GlossyButton } from '../components/ui/GlossyButton';
import { Character3D } from '../components/3d/Character3D';
import { LiveBackground3D } from '../components/3d/LiveBackground3D';
import { useCharacterStore } from '../stores/characterStore';
import { OUTFITS } from '../data/outfitRegistry';
import { HUMAN_EMOTES, DEFAULT_HUMAN_IDLE } from '../data/animationRegistry';
import { AnimationPicker } from '../components/ui/AnimationPicker';
import { PetDisplay } from '../components/ui/PetDisplay';
import { useShopStore } from '../stores/shopStore';
import { useGameStore } from '../stores/gameStore';
import { useDailySpinStore } from '../stores/dailySpinStore';
import { useChallengeStore } from '../stores/challengeStore';
import { useTutorialStore } from '../stores/tutorialStore';
import { useCareerStore } from '../stores/careerStore';
import { useLootBoxStore } from '../stores/lootBoxStore';
import { useMatchHistoryStore } from '../stores/matchHistoryStore';
import { playSound } from '../services/audio';
import { DailySpinWheel } from '../components/ui/DailySpinWheel';
import { WelcomeOverlay } from '../components/ui/WelcomeOverlay';
import { TutorialTooltip } from '../components/ui/TutorialTooltip';
import { getTipById } from '../data/tutorials';
import { haptics } from '../services/haptics';
import { ALL_CAREER_LEVELS } from '../data/careerLevels';
import { BreathingView, SlideReveal, StaggeredEntry } from '../components/animations';
import { StagePremiumFX } from '../components/effects/StagePremiumFX';
import { colors } from '../theme/colors';
import { fonts, weight } from '../theme/typography';

// Floating sparkle dot with looping opacity + vertical drift
function SparkleParticle({ color, size, left, bottom, delay }: {
  color: string; size: number; left: number; bottom: number; delay: number;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const fadeLoop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(opacity, { toValue: 0.8, duration: 1200, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 1200, useNativeDriver: true }),
      ])
    );
    const driftLoop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(translateY, { toValue: -18, duration: 2400, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    fadeLoop.start();
    driftLoop.start();
    return () => { fadeLoop.stop(); driftLoop.stop(); };
  }, []);

  return (
    <Animated.View style={{
      position: 'absolute',
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: color,
      left,
      bottom,
      opacity,
      transform: [{ translateY }],
    }} />
  );
}

// 12 sparkles with varied colors + positions + delays so the stage
// reads as actively alive, not a static set of 4 dots. Colors match
// the live-wallpaper palette (magenta, cyan, warm gold) so the stage
// feels continuous with the cosmic bg rather than a different layer.
function StageSparkles() {
  return (
    <>
      <SparkleParticle color="rgba(255,210,80,0.9)"  size={4}   left={30}  bottom={90}  delay={0} />
      <SparkleParticle color="rgba(100,180,255,0.9)" size={3}   left={200} bottom={110} delay={600} />
      <SparkleParticle color="rgba(255,210,80,0.9)"  size={3.5} left={60}  bottom={150} delay={1200} />
      <SparkleParticle color="rgba(100,180,255,0.9)" size={4}   left={180} bottom={160} delay={800} />
      <SparkleParticle color="rgba(255,140,200,0.9)" size={3}   left={110} bottom={180} delay={1800} />
      <SparkleParticle color="rgba(255,220,120,0.9)" size={5}   left={250} bottom={130} delay={2200} />
      <SparkleParticle color="rgba(180,140,255,0.9)" size={3.5} left={80}  bottom={220} delay={2600} />
      <SparkleParticle color="rgba(120,255,200,0.9)" size={3}   left={220} bottom={200} delay={3200} />
      <SparkleParticle color="rgba(255,180,100,0.9)" size={4}   left={150} bottom={240} delay={3800} />
      <SparkleParticle color="rgba(255,120,180,0.9)" size={2.5} left={40}  bottom={260} delay={4400} />
      <SparkleParticle color="rgba(100,220,255,0.9)" size={3}   left={290} bottom={240} delay={5000} />
      <SparkleParticle color="rgba(255,240,180,0.9)" size={4.5} left={170} bottom={280} delay={5600} />
    </>
  );
}

function Character3DWrapper({ activeEmoteId, rotationY }: { activeEmoteId: string | null; rotationY: number }) {
  const cust = useCharacterStore((s) => s.customization);
  const outfit = OUTFITS[cust.outfitId] ?? OUTFITS['modern_civilians_01'];
  // When an emote is active, play it once. Otherwise, loop the default idle
  // so the character is never stuck in T-pose.
  const emoteMeta = activeEmoteId
    ? HUMAN_EMOTES.find((e) => e.id === activeEmoteId) ?? null
    : null;
  const defaultIdle = DEFAULT_HUMAN_IDLE;
  const animGlb = emoteMeta?.glb ?? defaultIdle?.glb;
  const isEmote = !!emoteMeta;
  return (
    <Character3D
      width={440}
      height={460}
      bodyGlb={outfit.glb}
      skinColor={cust.skinColor}
      hairColor={cust.hairColor}
      outfitColors={cust.outfitColors}
      bodyType={cust.bodyType}
      bodySize={cust.bodySize}
      muscle={cust.muscle}
      animationGlb={animGlb}
      animationLoop={!isEmote}
      rotationY={rotationY}
    />
  );
}

// ═══ Drifting Watermark — repeating brand text behind the lobby ═══
// Basketball-Stars-style atmospheric layer: huge faint "DROP 4" text
// drifting slowly across the screen behind everything. Two rows moving
// in opposite directions at different speeds gives the lobby a sense of
// motion without competing with the character. White at very low opacity
// + monospace-y letter-spacing reads as a stadium banner / arena watermark.
function DriftingWatermark() {
  const driftA = useRef(new Animated.Value(0)).current;
  const driftB = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.timing(driftA, { toValue: 1, duration: 38000, useNativeDriver: true }),
    ).start();
    Animated.loop(
      Animated.timing(driftB, { toValue: 1, duration: 52000, useNativeDriver: true }),
    ).start();
  }, []);
  // Each row drifts a full text cycle. The repeated string is wider than
  // the screen so the wrap-around is invisible — when one "DROP 4" exits
  // the right edge, an identical one is already visible from the left.
  const driftAX = driftA.interpolate({ inputRange: [0, 1], outputRange: [0, -460] });
  const driftBX = driftB.interpolate({ inputRange: [0, 1], outputRange: [-460, 0] });

  const REPEAT_STR = 'DROP4   DROP4   DROP4   DROP4   DROP4   DROP4';
  return (
    <View pointerEvents="none" style={watermarkStyles.layer}>
      <Animated.Text
        numberOfLines={1}
        style={[
          watermarkStyles.row,
          watermarkStyles.rowTop,
          { transform: [{ translateX: driftAX }] },
        ]}
      >
        {REPEAT_STR}
      </Animated.Text>
      <Animated.Text
        numberOfLines={1}
        style={[
          watermarkStyles.row,
          watermarkStyles.rowBottom,
          { transform: [{ translateX: driftBX }] },
        ]}
      >
        {REPEAT_STR}
      </Animated.Text>
    </View>
  );
}

const watermarkStyles = StyleSheet.create({
  layer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    overflow: 'hidden',
    // Sit behind the foreground UI container. Without this, RN-Web
    // stacks the absolute layer above flex siblings, hiding the
    // watermark behind the character + UI.
    zIndex: -1,
  },
  row: {
    fontFamily: fonts.heading,
    fontWeight: '900',
    color: 'rgba(255,235,180,0.55)',
    letterSpacing: 14,
    width: 2400,
  },
  rowTop: {
    fontSize: 160,
    top: '20%',
    left: -300,
    position: 'absolute',
  },
  rowBottom: {
    fontSize: 110,
    top: '60%',
    left: -560,
    position: 'absolute',
  },
});

// ═══ Loot Box Row — 4 reward slots between PLAY and the tab bar ═══
// Basketball Stars-style row of reward chips. Each surfaces an existing
// reward loop and opens its native UI when tapped.
function LootBoxRow({
  onSpinPress,
  onCareerPress,
  onMissionsPress,
}: {
  onSpinPress: () => void;
  onCareerPress: () => void;
  onMissionsPress: () => void;
}) {
  const lastSpinDate = useDailySpinStore((s) => s.lastSpinDate);
  const challenges = useChallengeStore((s) => s.challenges);
  const careerProgress = useCareerStore((s) => s.progress);
  const matches = useMatchHistoryStore((s) => s.matches);

  // Daily spin is once-per-day, keyed on YYYY-MM-DD string. Ready iff
  // we have not yet spun today.
  const todayStr = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();
  const canSpin = lastSpinDate !== todayStr;

  const totalWins = matches.filter((m) => m.result === 'win').length;
  const winsTowardBox = totalWins % 3;
  const winBoxReady = totalWins > 0 && winsTowardBox === 0;

  const claimableMissions = challenges.filter(
    (c) => c.progress >= c.target && !c.completed,
  ).length;

  const nextCareerLevel = ALL_CAREER_LEVELS.find(
    (l) => !careerProgress[l.id]?.completed,
  );

  return (
    <View style={styles.lootBoxRow}>
      <LootCard
        iconSrc={require('../assets/images/ui/free-spin-btn.png')}
        label="SPIN"
        status={canSpin ? 'READY!' : 'TOMORROW'}
        ready={canSpin}
        onPress={onSpinPress}
      />
      <LootCard
        iconSrc={require('../assets/images/ui/loot-bronze.png')}
        label="WIN BOX"
        status={winBoxReady ? 'READY!' : `${winsTowardBox}/3`}
        ready={winBoxReady}
        onPress={onMissionsPress /* tapping for now goes to missions; box opens at next match */}
      />
      <LootCard
        iconSrc={require('../assets/images/ui/challenge-bag.png')}
        label="MISSIONS"
        status={claimableMissions > 0 ? `${claimableMissions} READY` : 'IN PROGRESS'}
        ready={claimableMissions > 0}
        onPress={onMissionsPress}
      />
      <LootCard
        iconSrc={require('../assets/images/ui/tab-career.png')}
        label="CAREER"
        status={nextCareerLevel ? `LVL ${nextCareerLevel.id}` : 'COMPLETE!'}
        ready={false}
        onPress={onCareerPress}
      />
    </View>
  );
}

function LootCard({
  iconSrc,
  label,
  status,
  ready,
  onPress,
}: {
  iconSrc: ImageSourcePropType;
  label: string;
  status: string;
  ready: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.lootCard, ready && styles.lootCardReady]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label} ${status}`}
    >
      <Image source={iconSrc} style={styles.lootCardIcon} resizeMode="contain" />
      <Text style={styles.lootCardLabel}>{label}</Text>
      <View style={[styles.lootCardStatusPill, ready && styles.lootCardStatusPillReady]}>
        <Text style={[styles.lootCardStatusText, ready && styles.lootCardStatusTextReady]} numberOfLines={1}>
          {status}
        </Text>
      </View>
    </Pressable>
  );
}

export function HomeScreen() {
  const navigation = useNavigation<any>();
  const coins = useShopStore(s => s.coins);
  const gems = useShopStore(s => s.gems);
  const level = useShopStore(s => s.level);
  const equippedPet = useShopStore(s => s.equippedPet);
  const winStreak = useGameStore(s => s.winStreak);
  const careerCompletedCount = useCareerStore(s => Object.values(s.progress).filter(p => p.completed).length);
  const lastSpinDate = useDailySpinStore(s => s.lastSpinDate);
  const spinAvailable = (() => {
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return lastSpinDate !== today;
  })();
  // Count unopened loot boxes across all tiers — drives the home "N boxes
  // ready" floating chip. When 0, the chip doesn't render.
  const ownedBoxes = useLootBoxStore((s) => s.ownedBoxes);
  const unopenedBoxCount = ownedBoxes.reduce((sum, b) => sum + b.count, 0);
  const hasSeenTip = useTutorialStore(s => s.hasSeenTip);
  const seenTips = useTutorialStore(s => s.seenTips); // subscribe to seenTips so re-renders reflect markTipSeen
  const justLeveledUp = useShopStore(s => s.justLeveledUp);
  const clearLevelUp = useShopStore(s => s.clearLevelUp);
  const matches = useMatchHistoryStore(s => s.matches);

  // ═══ Play Counts for menu buttons ═══
  const aiGameCount = matches.filter(m => m.mode === 'ai' || m.mode === 'local').length;
  const totalCareerLevels = ALL_CAREER_LEVELS.length;

  // ═══ Pet tap interaction ═══
  const petBounce = useRef(new Animated.Value(1)).current;
  const heartOpacity = useRef(new Animated.Value(0)).current;
  const heartTranslateY = useRef(new Animated.Value(0)).current;
  const [showPetHeart, setShowPetHeart] = useState(false);

  // ═══ Character tap press-scale ═══
  // Instant-feedback scale so the tap registers before the emote animation
  // starts (~200ms later). See HomeScreen character Pressable below.
  const characterPressScale = useRef(new Animated.Value(1)).current;

  const handlePetTap = () => {
    haptics.tap();
    playSound('tap');
    // Bounce the pet
    Animated.sequence([
      Animated.spring(petBounce, { toValue: 1.25, useNativeDriver: true, speed: 50, bounciness: 12 }),
      Animated.spring(petBounce, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 8 }),
    ]).start();
    // Float heart emoji
    setShowPetHeart(true);
    heartOpacity.setValue(1);
    heartTranslateY.setValue(0);
    Animated.parallel([
      Animated.timing(heartTranslateY, { toValue: -40, duration: 1000, useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(600),
        Animated.timing(heartOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]),
    ]).start(() => setShowPetHeart(false));
  };

  // ═══ Coin earn animation ═══
  const prevCoinsRef = useRef(coins);
  const [coinDelta, setCoinDelta] = useState<number | null>(null);
  const coinAnimY = useRef(new Animated.Value(0)).current;
  const coinAnimOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (coins > prevCoinsRef.current) {
      const diff = coins - prevCoinsRef.current;
      setCoinDelta(diff);
      coinAnimY.setValue(0);
      coinAnimOpacity.setValue(1);
      Animated.parallel([
        Animated.timing(coinAnimY, { toValue: -40, duration: 1400, useNativeDriver: true }),
        Animated.sequence([
          Animated.delay(800),
          Animated.timing(coinAnimOpacity, { toValue: 0, duration: 600, useNativeDriver: true }),
        ]),
      ]).start(() => setCoinDelta(null));
    }
    prevCoinsRef.current = coins;
  }, [coins]);

  // ═══ Level Up celebration ═══
  const [showLevelUp, setShowLevelUp] = useState(false);
  const levelUpScale = useRef(new Animated.Value(0)).current;
  const levelUpOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (justLeveledUp) {
      setShowLevelUp(true);
      levelUpScale.setValue(0.3);
      levelUpOpacity.setValue(1);
      haptics.win();
      Animated.sequence([
        Animated.spring(levelUpScale, { toValue: 1.1, useNativeDriver: true, speed: 12, bounciness: 14 }),
        Animated.spring(levelUpScale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 8 }),
        Animated.delay(1600),
        Animated.timing(levelUpOpacity, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]).start(() => {
        setShowLevelUp(false);
        clearLevelUp();
      });
    }
  }, [justLeveledUp]);
  const [animPickerOpen, setAnimPickerOpen] = useState(false);
  const [animPickerTab, setAnimPickerTab] = useState<'emotes' | 'idles'>('emotes');
  const [spinWheelOpen, setSpinWheelOpen] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

  // 3D emote playback on the home character. When set, feeds animationGlb to
  // Character3DWrapper. Auto-clears after 3s so the character returns to idle.
  const [active3DEmote, setActive3DEmote] = useState<string | null>(null);
  useEffect(() => {
    if (!active3DEmote) return;
    const t = setTimeout(() => setActive3DEmote(null), 3000);
    return () => clearTimeout(t);
  }, [active3DEmote]);

  // Drag-to-rotate: player can grab the character and swipe left/right to
  // spin the Y axis. Stays where it's dropped (no snap back). Tap still
  // triggers an emote because PanResponder only claims the gesture on
  // horizontal motion beyond a small threshold — vertical taps fall
  // through to the inner Pressable.
  const [characterRotationY, setCharacterRotationY] = useState(0);
  const dragStartRotationRef = useRef(0);
  const characterPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_evt, g) => Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy),
        onPanResponderGrant: () => {
          dragStartRotationRef.current = characterRotationY;
        },
        onPanResponderMove: (_evt, g) => {
          // ~1° per pixel feels natural. Full screen swipe ≈ one full spin.
          setCharacterRotationY(dragStartRotationRef.current + g.dx * 0.012);
        },
        onPanResponderTerminationRequest: () => false,
      }),
    [characterRotationY],
  );

  // FREE SPIN text pulse when spin is available
  const spinPulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (spinAvailable) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(spinPulse, { toValue: 0.5, duration: 1000, useNativeDriver: true }),
          Animated.timing(spinPulse, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      spinPulse.setValue(1);
    }
  }, [spinAvailable]);

  // Show tutorial on first visit — defer if welcome was just dismissed (< 5 min ago)
  const homeTip = getTipById('home_tap_character')!;
  const tipAlreadySeen = seenTips.includes('home_tap_character');
  useEffect(() => {
    if (!tipAlreadySeen) {
      const timer = setTimeout(async () => {
        if (useTutorialStore.getState().seenTips.includes('home_tap_character')) return;
        const dismissedAtStr = await AsyncStorage.getItem('drop4_welcome_dismissed_at');
        if (dismissedAtStr && Date.now() - Number(dismissedAtStr) < 5 * 60 * 1000) return;
        setShowTutorial(true);
      }, 3000);
      return () => clearTimeout(timer);
    } else {
      setShowTutorial(false);
    }
  }, [tipAlreadySeen]);

  // "Tap me!" tooltip — subtle hint that character is tappable
  const [showTapHint, setShowTapHint] = useState(false);
  const tapHintCountRef = useRef(0);
  const tapHintOpacity = useRef(new Animated.Value(0)).current;
  const tutorialDismissedRef = useRef(tipAlreadySeen);

  // Track when tutorial gets dismissed so tap hint can start
  useEffect(() => {
    if (!showTutorial && tipAlreadySeen) {
      tutorialDismissedRef.current = true;
    }
  }, [showTutorial, tipAlreadySeen]);

  useEffect(() => {
    // Don't start tap hint interval until tutorial has been dismissed OR 10s safety timeout
    const safetyTimeout = setTimeout(() => {
      tutorialDismissedRef.current = true;
    }, 10000);

    const interval = setInterval(() => {
      // Only show if tutorial dismissed, no emote playing, and less than 3 times
      if (tutorialDismissedRef.current && !showTutorial && tapHintCountRef.current < 3) {
        tapHintCountRef.current += 1;
        setShowTapHint(true);
        // Fade in
        Animated.timing(tapHintOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start(() => {
          // Hold for 1.5s, then fade out
          setTimeout(() => {
            Animated.timing(tapHintOpacity, { toValue: 0, duration: 500, useNativeDriver: true }).start(() => {
              setShowTapHint(false);
            });
          }, 1500);
        });
      }
    }, 10000);
    return () => { clearInterval(interval); clearTimeout(safetyTimeout); };
  }, []);

  const handleCharacterTap = () => {
    haptics.tap();
    // Hide tooltip immediately on tap
    setShowTapHint(false);
    tapHintOpacity.setValue(0);

    // Tapping the character plays a random owned emote directly.
    // The Emotes/Idles side buttons open the full AnimationPicker for browsing.
    const ownedEmoteIds = useShopStore.getState().ownedEmotes;
    const pool = HUMAN_EMOTES.filter(
      (e) => ownedEmoteIds.includes(e.id) || (e.price ?? 0) === 0,
    );
    if (pool.length > 0) {
      const pick = pool[Math.floor(Math.random() * pool.length)];
      haptics.win();
      playSound('click');
      setActive3DEmote(pick.id);
    }
  };

  const navigateTo = (screen: string) => {
    navigation.dispatch(CommonActions.navigate({ name: screen }));
  };

  return (
    <ScreenBackground>
      {/* ═══ FINAL BACKGROUND ═══
          Three stacked atmospheric layers, all code-built (no PNG):
            1. Subtle navy gradient — top a touch lighter, bottom deeper,
               so the lobby has stage-spotlight depth instead of flat.
            2. Halftone dot pattern (web only) — faint warm-amber dots
               give the bg game-art texture without crowding.
            3. Drifting "DROP 4" watermark — two rows of huge faint text
               sliding in opposite directions. Adds the BS-style "this
               is a real game" sense of motion behind the character.
          Particles (StageSparkles + StagePremiumFX) sit inside the
          character stage on top of these layers for warm ambient life. */}
      <LinearGradient
        colors={['#1a2244', '#0c1129', '#080a1e']}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      {Platform.OS === 'web' && (
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            ({
              backgroundImage:
                'radial-gradient(circle at center, rgba(255,200,120,0.08) 1px, transparent 1.6px)',
              backgroundSize: '22px 22px',
            } as any),
          ]}
        />
      )}
      <DriftingWatermark />
      <View style={styles.container}>
        <View>
          <TopBar
            coins={coins} gems={gems} level={level}
            onProfilePress={() => navigateTo('Profile')}
            onSettingsPress={() => navigateTo('Settings')}
            onCoinPress={() => navigation.navigate('MainTabs', { screen: 'Shop' } as any)}
            onGemPress={() => navigation.navigate('MainTabs', { screen: 'Shop' } as any)}
          />
          {/* Floating +coins animation */}
          {coinDelta !== null && (
            <Animated.Text
              style={[
                styles.coinDeltaText,
                { opacity: coinAnimOpacity, transform: [{ translateY: coinAnimY }] },
              ]}
            >
              +{coinDelta}
            </Animated.Text>
          )}
        </View>

        {/* ═══ DROP4 LOGO ═══ Breathing scale + animated magenta
            halo behind the wordmark so the header reads as a neon
            sign instead of a static PNG. The halo pulses on a 3.2s
            cycle; the logo itself breathes on a 5s cycle — two
            independent rhythms so the composite never visibly
            loops. */}
        <StaggeredEntry index={0}>
        <View style={styles.logoArea}>
          <Image
            source={require('../assets/images/ui/home-logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>
        </StaggeredEntry>

        {/* ═══ CHARACTER LOBBY ═══
            Side buttons (Emotes/Idles) removed in the calm-Home pass —
            tapping the character still triggers a random owned emote
            (long-press), and the full picker lives on the Customize tab.
            StaggeredEntry needs flexGrow:1 here — without it the Animated.View
            wrapper defaults to shrink-to-fit and the inner lobbyArea's
            flex props don't reach the parent flex chain (container). Bug
            symptom: character + PLAY button pushed up off-screen, big
            empty void below PLAY before the tab bar. */}
        <StaggeredEntry index={1} style={{ flexGrow: 1, flexShrink: 1, flexBasis: 320 }}>
        <View style={styles.lobbyArea}>
          {/* Emotes side button (left) — restored per Devon's request.
              Tap → opens AnimationPicker on Emotes tab. */}
          <View
            style={styles.sideBtn}
            {...(Platform.OS === 'web' ? { onClick: () => { haptics.tap(); setAnimPickerTab('emotes'); setAnimPickerOpen(true); }, style: [styles.sideBtn, { cursor: 'pointer' }] } as any : {})}
          >
            <Pressable
              onPress={() => { haptics.tap(); setAnimPickerTab('emotes'); setAnimPickerOpen(true); }}
              style={StyleSheet.absoluteFill}
              accessibilityRole="button"
              accessibilityLabel="Open emotes picker"
            />
            <LinearGradient
              colors={['rgba(255,140,0,0.25)', 'rgba(255,80,0,0.15)', 'rgba(255,40,0,0.1)']}
              style={styles.sideBtnCircle}
              pointerEvents="none"
            >
              <Image
                source={require('../assets/images/ui/side-btn-emotes.png')}
                style={styles.sideBtnImg}
                resizeMode="contain"
              />
            </LinearGradient>
            <Text style={styles.sideBtnLabel} pointerEvents="none">Emotes</Text>
          </View>

          {/* Character on stage.
              - The painted bg-home already has a gorgeous hexagonal
                orange spotlight stage baked in — we just add two
                radial glow circles at the character's feet to cue
                the "standing on a warm spotlight" read.
              - StagePremiumFX adds rising embers + slow conic shimmer
                floating up the character silhouette. */}
          <View style={styles.characterStage}>
            {/* Character spotlight — warm radial glow behind the character
                so the player reads clearly against ANY background theme.
                This is lobby UX, not bg art — stays constant when future
                purchasable bg themes are added (Cleveland skyline, cosmic
                stadium, neon arena, etc). Sits on top of the bg layers
                but behind the 3D character + particles. */}
            <View style={styles.characterSpotlight} pointerEvents="none" />
            <StageSparkles />
            <StagePremiumFX width={400} />


            <BreathingView intensity={0.015} speed={4000}>
            <Pressable
              onPress={handleCharacterTap}
              accessibilityRole="button"
              accessibilityLabel="Player character"
              accessibilityHint="Double-tap to open the emote picker, long-press to play a random owned emote"
              onPressIn={() => {
                // Instant-feedback scale pinch so the tap feels responsive
                // (emote animation doesn't fire for ~200ms after tap).
                Animated.spring(characterPressScale, {
                  toValue: 0.97,
                  useNativeDriver: true,
                  speed: 60,
                  bounciness: 0,
                }).start();
              }}
              onPressOut={() => {
                Animated.spring(characterPressScale, {
                  toValue: 1,
                  useNativeDriver: true,
                  speed: 20,
                  bounciness: 8,
                }).start();
              }}
              onLongPress={() => {
                // Long-press: play a random OWNED emote instantly (no modal).
                const ownedEmoteIds = useShopStore.getState().ownedEmotes;
                const pool = HUMAN_EMOTES.filter(
                  (e) => ownedEmoteIds.includes(e.id) || (e.price ?? 0) === 0,
                );
                if (pool.length === 0) return;
                const pick = pool[Math.floor(Math.random() * pool.length)];
                haptics.win();
                setActive3DEmote(pick.id);
              }}
              delayLongPress={450}
            >
              {showTapHint && (
                <Animated.View style={[styles.tapHintBubble, { opacity: tapHintOpacity }]}>
                  <Text style={styles.tapHintText}>Tap me!</Text>
                  <View style={styles.tapHintArrow} />
                </Animated.View>
              )}
              <Animated.View
                style={{ transform: [{ scale: characterPressScale }] }}
                {...characterPanResponder.panHandlers}
              >
              <Character3DWrapper activeEmoteId={active3DEmote} rotationY={characterRotationY} />
              </Animated.View>
            </Pressable>
            </BreathingView>
            {equippedPet && (
              <Pressable
                onPress={handlePetTap}
                style={styles.petPosition}
                accessibilityRole="button"
                accessibilityLabel="Equipped pet"
                accessibilityHint="Double-tap to interact with your pet"
              >
                <Animated.View style={{ transform: [{ scale: petBounce }] }}>
                  <PetDisplay petId={equippedPet} size={80} isIdle />
                </Animated.View>
                {showPetHeart && (
                  <Animated.Text
                    style={[styles.petHeart, { opacity: heartOpacity, transform: [{ translateY: heartTranslateY }] }]}
                    pointerEvents="none"
                  >{'\u2764\uFE0F'}</Animated.Text>
                )}
              </Pressable>
            )}
            {/* Calm-Home pass: blue gradient platform overlay removed — it
                fought the warm orange spotlight baked into the painted bg.
                Single source of ground glow now. */}
          </View>

          {/* Idles side button (right) — restored per Devon's request.
              Tap → opens AnimationPicker on Idles tab. */}
          <View
            style={styles.sideBtn}
            {...(Platform.OS === 'web' ? { onClick: () => { haptics.tap(); setAnimPickerTab('idles'); setAnimPickerOpen(true); }, style: [styles.sideBtn, { cursor: 'pointer' }] } as any : {})}
          >
            <Pressable
              onPress={() => { haptics.tap(); setAnimPickerTab('idles'); setAnimPickerOpen(true); }}
              style={StyleSheet.absoluteFill}
              accessibilityRole="button"
              accessibilityLabel="Open idle animations picker"
            />
            <LinearGradient
              colors={['rgba(80,140,255,0.25)', 'rgba(60,100,255,0.15)', 'rgba(40,80,255,0.1)']}
              style={styles.sideBtnCircle}
              pointerEvents="none"
            >
              <Image
                source={require('../assets/images/ui/side-btn-idles.png')}
                style={styles.sideBtnImg}
                resizeMode="contain"
              />
            </LinearGradient>
            <Text style={styles.sideBtnLabel} pointerEvents="none">Idles</Text>
          </View>
        </View>
        </StaggeredEntry>

        {/* Devon's radical-simplification pass: removed the FREE SPIN +
            LOOT BOX chip row from Home. Daily spin + loot inventory still
            reachable via the daily-reward popup + Missions tab + dedicated
            screens — they don't need to live on the Home front page.
            Home is now: TopBar · Logo · Character · PLAY · TabBar. */}

        {/* ═══ MENU BUTTONS ═══
            PLAY now routes straight to PlayScreen (the AI difficulty
            picker). Career got promoted to a top-level tab, so the old
            ModePickScreen had only 2 options left (VS AI / Local Play)
            which didn't deserve a whole screen. Local Play is now a
            small pill at the bottom of PlayScreen for the rare 2-player
            case. PLAY → drop a piece in 2 taps instead of 3.

            The PLAY button is Devon's hand-made GPT button (chunky 3D
            white "PLAY" letters on an orange/yellow gradient pill with
            blue rim) — used directly as a tappable Image. */}
        <View style={styles.menuButtons}>
          <SlideReveal from="bottom" delay={0}>
            <Pressable
              onPress={() => { haptics.tap(); playSound('click'); navigateTo('Play'); }}
              style={styles.playBtn}
              accessibilityRole="button"
              accessibilityLabel="PLAY"
              accessibilityHint="Choose AI difficulty and start a quick match"
            >
              <Image
                source={require('../assets/images/ui/btn-play.png')}
                style={styles.playBtnImage}
                resizeMode="contain"
              />
            </Pressable>
          </SlideReveal>
        </View>

        {/* ═══ LOOT BOX ROW ═══
            4 reward slots between PLAY and the tab bar (Basketball Stars
            pattern). Each slot surfaces an existing reward loop:
              - Daily Spin  : useDailySpinStore (24h cooldown)
              - Win Box     : every 3rd career/AI win earns a tier box
              - Missions    : claimable challenges from useChallengeStore
              - Career Lvl  : next uncompleted career level reward
            States: "READY!" when ready to claim, progress text otherwise. */}
        <SlideReveal from="bottom" delay={80}>
        <LootBoxRow
          onSpinPress={() => { haptics.tap(); playSound('click'); setSpinWheelOpen(true); }}
          onCareerPress={() => { haptics.tap(); playSound('click'); navigation.navigate('MainTabs', { screen: 'Career' } as any); }}
          onMissionsPress={() => { haptics.tap(); playSound('click'); navigation.navigate('MainTabs', { screen: 'Missions' } as any); }}
        />
        </SlideReveal>

        {/* Unified Animation Picker — Emotes + Idles in one modal */}
        <AnimationPicker
          visible={animPickerOpen}
          onClose={() => setAnimPickerOpen(false)}
          initialTab={animPickerTab}
        />

        {/* Daily Spin Wheel */}
        <DailySpinWheel
          visible={spinWheelOpen}
          onClose={() => setSpinWheelOpen(false)}
        />



        {/* First-launch welcome modal — auto-shows once for new users */}
        <WelcomeOverlay />

        {/* Calm-Home pass: the slab TutorialTooltip card was eating ~25% of
            the home screen and resting on the character's chest. Replaced
            by the smaller `tapHintBubble` that already lives next to the
            character (see Character stage). The home_tap_character tip is
            still tracked in tutorialStore — it just shows as a small arrow
            bubble now instead of a card. */}

        {/* Level Up celebration overlay */}
        {showLevelUp && (
          <Animated.View
            style={[
              styles.levelUpOverlay,
              { opacity: levelUpOpacity, transform: [{ scale: levelUpScale }] },
            ]}
            pointerEvents="none"
          >
            <Text style={styles.levelUpEmoji}>🎉</Text>
            <Text style={styles.levelUpTitle}>LEVEL UP!</Text>
            <Text style={styles.levelUpSubtitle}>Level {level}</Text>
          </Animated.View>
        )}

      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // React Navigation's Tab.Navigator already reserves space for the tab bar
    // OUTSIDE the screen content — the bar doesn't overlap. So paddingBottom
    // here was pure dead space between LOCAL PLAY and the tab bar (Devon's
    // "buttons too high" complaint). Minimal 4px breathing room is enough to
    // keep the bottom card from touching the tab-bar top border.
    // The character stage above compensates — lobbyArea.flexGrow claims the
    // freed space, which pulls the character + mode buttons visually down.
    // the previous 80/88 values left too much air.
    paddingBottom: 4,
  },
  logoArea: {
    alignItems: 'center',
    // Bumped from 68 → 84 (Devon: "make the drop 4 logo a little bigger").
    height: 84,
    justifyContent: 'center',
    marginTop: 0,
    marginBottom: 0,
  },
  logoImage: {
    // Bumped from 240×110 → 290×135 to match the bigger logoArea height.
    // Negative margins kept proportional so the chunky logo sits flush in
    // the area without extra padding around it. Devon nudge: logo pushed
    // up another 14px (was -24, now -38) for better top spacing.
    width: 290,
    height: 135,
    marginTop: -38,
    marginBottom: -27,
  },
  // Neon-sign halo behind the wordmark. A soft magenta glow blob
  // with a CSS keyframes pulse on web (brightness + scale). On
  // native we get a static glow via shadowRadius — still reads
  // premium even without motion.
  logoHalo: {
    position: 'absolute',
    width: 260,
    height: 100,
    alignSelf: 'center',
    top: 5,
    borderRadius: 130,
    backgroundColor: 'rgba(255,60,160,0.28)',
    ...(Platform.OS === 'web' ? ({
      filter: 'blur(22px)',
      animationName: 'drop4LogoHalo',
      animationDuration: '3200ms',
      animationTimingFunction: 'ease-in-out',
      animationIterationCount: 'infinite',
      animationDirection: 'alternate',
    } as any) : {
      shadowColor: '#ff3ca0',
      shadowOpacity: 0.6,
      shadowRadius: 30,
      shadowOffset: { width: 0, height: 0 },
    }),
  },
  // Engagement chip row — sits between the character lobby and the mode
  // buttons, in the same slot the old CUSTOMIZE/SPIN pills occupied.
  // Only renders when at least one chip has something to show, otherwise
  // collapses to 0 height so the mode buttons stay put.
  chipRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
    marginTop: -2,
    marginBottom: 6,
    zIndex: 10,
  },
  lootChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingLeft: 4,
    paddingRight: 12,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: 'rgba(10,14,32,0.7)',
    borderWidth: 1.5,
    borderColor: '#ffd54f',
    shadowColor: '#ffd54f',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 6,
    elevation: 6,
  },
  lootChipImg: {
    width: 28,
    height: 28,
  },
  lootChipText: {
    fontFamily: fonts.body,
    fontWeight: weight.black,
    fontSize: 14,
    color: '#ffd54f',
  },
  chipCaption: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 9,
    color: 'rgba(255,213,79,0.8)',
    letterSpacing: 1.2,
    marginLeft: 3,
  },
  spinChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(39,174,61,0.28)',
    borderWidth: 1.5,
    borderColor: '#27ae3d',
    shadowColor: '#34c94d',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 6,
  },
  spinChipIcon: {
    fontSize: 14,
  },
  spinChipText: {
    fontFamily: fonts.body,
    fontWeight: weight.black,
    fontSize: 12,
    color: '#ffffff',
    letterSpacing: 0.8,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  // Character lobby
  lobbyArea: {
    // Calm-Home: dropped maxHeight so the character stage absorbs ALL
    // remaining vertical space. This kills the dead gap between LOCAL PLAY
    // and the tab bar that Devon called out. Character stays pinned to the
    // bottom of the lobbyArea (justifyContent: 'flex-end' on characterStage),
    // so growing lobbyArea pushes the character + ground glow visually down
    // toward the menu buttons, and the menu buttons sit just above the tabs.
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 320,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  sideBtn: {
    alignItems: 'center',
    gap: 5,
  },
  sideBtnCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,160,40,0.45)',
    backgroundColor: 'rgba(255,140,0,0.1)',
    shadowColor: 'rgba(255,140,0,0.5)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 6,
  },
  // Painted side-button icon (replaces the old 🕺 / 💫 emoji). Sits inside
  // the glowing circle so keep it tight — the circle is 58px, the icon
  // reads well at 42px with a little breathing room for the glow.
  sideBtnImg: {
    width: 42,
    height: 42,
  },
  sideBtnLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 11,
    color: 'rgba(255,200,120,0.75)',
    letterSpacing: 0.8,
  },
  characterStage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    // Devon nudge: character pushed down slightly via paddingTop, BUT
    // paddingBottom lifts the character off the menuButtons row so the
    // FEET are visible (Devon: "i want to be able to see the character's
    // feet"). paddingBottom acts as a floor margin between feet and PLAY.
    paddingTop: 28,
    paddingBottom: 18,
  },
  // Warm radial spotlight behind the character — lobby UX that survives
  // any future bg theme. Centered on character body, soft falloff, low
  // opacity so it pops the character without competing.
  characterSpotlight: {
    position: 'absolute',
    width: 360,
    height: 360,
    borderRadius: 180,
    alignSelf: 'center',
    bottom: 80,
    ...(Platform.OS === 'web'
      ? ({
          backgroundImage:
            'radial-gradient(circle at center, rgba(255,180,100,0.34) 0%, rgba(255,150,80,0.18) 30%, rgba(255,140,60,0.06) 60%, rgba(255,120,40,0) 100%)',
          filter: 'blur(8px)',
        } as any)
      : {
          backgroundColor: 'rgba(255,150,80,0.12)',
          shadowColor: '#ff9040',
          shadowOpacity: 0.7,
          shadowRadius: 60,
          shadowOffset: { width: 0, height: 0 },
        }),
  },
  // Warm spotlight pooling at the character's feet. Bounded Views with
  // radial gradients WILL clip at their box edges — so we stretch both
  // glow layers much wider than the visible frame (-40% left, +40% right
  // on web via left/right instead of width) AND push the gradient fall-
  // off all the way to 100% so the color reaches full transparency
  // before the box boundary. Result: no hard edge at any zoom level.
  footGlowOuter: {
    position: 'absolute',
    bottom: 30,
    left: -120,
    right: -120,
    height: 180,
    ...(Platform.OS === 'web' ? ({
      backgroundImage: 'radial-gradient(ellipse 55% 50% at 50% 60%, rgba(255,170,80,0.45) 0%, rgba(255,140,60,0.25) 25%, rgba(255,120,40,0.1) 55%, rgba(255,120,40,0) 100%)',
      filter: 'blur(8px)',
      mixBlendMode: 'screen',
    } as any) : {
      backgroundColor: 'rgba(255,140,60,0.12)',
      shadowColor: '#ff9040',
      shadowOpacity: 0.6,
      shadowRadius: 60,
      shadowOffset: { width: 0, height: 0 },
    }),
  },
  footGlowInner: {
    position: 'absolute',
    bottom: 50,
    left: -40,
    right: -40,
    height: 100,
    ...(Platform.OS === 'web' ? ({
      backgroundImage: 'radial-gradient(ellipse 40% 45% at 50% 60%, rgba(255,230,170,0.65) 0%, rgba(255,190,100,0.3) 40%, rgba(255,170,80,0.1) 70%, rgba(255,170,80,0) 100%)',
      filter: 'blur(6px)',
      mixBlendMode: 'screen',
    } as any) : {
      backgroundColor: 'rgba(255,200,120,0.18)',
    }),
  },
  stagePlatform: {
    width: 200,
    height: 16,
    borderRadius: 100,
    marginTop: -10,
    shadowColor: 'rgba(80,140,255,0.6)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 8,
  },
  stageRing: {
    width: 280,
    height: 6,
    borderRadius: 140,
    backgroundColor: 'rgba(100,180,255,0.08)',
    marginTop: 2,
  },
  // Pet heart animation
  petHeart: {
    position: 'absolute',
    top: -10,
    alignSelf: 'center',
    fontSize: 22,
    zIndex: 20,
  },
  // Menu buttons
  menuButtons: {
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 8,
    // Trimmed paddingTop (was 16, now 8) so PLAY isn't pulling INTO the
    // character zone — combined with characterStage paddingBottom this
    // gives the character's feet room to clear above PLAY.
    paddingTop: 8,
    paddingBottom: 6,
    flexShrink: 0,
  },
  // Devon's hand-made chunky 3D PLAY button rendered as a tappable Image.
  // Bumped from 260×96 → 320×118 — Devon: "make the play button bigger".
  // The PLAY image is 1536×1024 with the button silhouette ~60% of canvas;
  // resizeMode: 'contain' preserves the aspect.
  playBtn: {
    // Hero PLAY — sized big enough to dominate but not crowd the
    // character's feet or the loot box row. Devon-tuned at 340x130.
    width: 340,
    height: 130,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // ═══ Loot box row (Basketball Stars-pattern) ═══
  // 4 cards across the screen between PLAY and the tab bar. Each card
  // surfaces an existing reward loop (spin / win box / missions / career).
  // 'ready' state lights the card up with a warm gold rim + green pill so
  // claimable rewards visually pop.
  lootBoxRow: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 8,
    paddingTop: 0,
    paddingBottom: 6,
    alignItems: 'stretch',
  },
  lootCard: {
    flex: 1,
    minHeight: 76,
    borderRadius: 12,
    backgroundColor: 'rgba(14,18,42,0.85)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,210,120,0.25)',
    paddingVertical: 5,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lootCardReady: {
    borderColor: 'rgba(255,200,80,0.85)',
    backgroundColor: 'rgba(40,28,12,0.9)',
    ...(Platform.OS === 'web'
      ? ({
          boxShadow: '0 0 12px 2px rgba(255,180,40,0.4), inset 0 1px 0 rgba(255,230,160,0.5)',
        } as any)
      : {
          shadowColor: '#ff9040',
          shadowOpacity: 0.7,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 0 },
        }),
  },
  lootCardIcon: {
    width: 36,
    height: 36,
  },
  lootCardLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 9,
    color: 'rgba(255,210,140,0.9)',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  lootCardStatusPill: {
    minWidth: 50,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lootCardStatusPillReady: {
    backgroundColor: '#27ae3d',
  },
  lootCardStatusText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 9,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 0.4,
  },
  lootCardStatusTextReady: {
    color: '#ffffff',
  },
  playBtnImage: {
    width: '100%',
    height: '100%',
  },
  // Calm-Home pass: PLAY is the hero, CAREER + LOCAL PLAY share a row
  // beneath it. menuRowItem flex:1 so the two secondary CTAs split the
  // available width evenly. menuRowBtn forces the GlossyButton inside
  // to stretch to fill its flex:1 wrapper — without this, GlossyButton
  // sized to its text content (CAREER 6 chars vs LOCAL PLAY 10 chars)
  // and the buttons rendered at noticeably different widths.
  menuRow: {
    flexDirection: 'row',
    gap: 8,
  },
  menuRowItem: {
    flex: 1,
  },
  menuRowBtn: {
    width: '100%',
  },
  // "Tap me!" tooltip
  tapHintBubble: {
    position: 'absolute',
    top: -6,
    alignSelf: 'center',
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  tapHintText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.5,
  },
  tapHintArrow: {
    position: 'absolute',
    bottom: -5,
    alignSelf: 'center',
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 5,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  // Pet position (bottom-right of character, prominent showcase)
  petPosition: {
    position: 'absolute',
    bottom: 2,
    right: -20,
    zIndex: 5,
    // Glow effect to make pet pop
    shadowColor: 'rgba(255,200,80,0.6)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 6,
  },
  // Version (moved to Settings screen footer)
  // Coin earn animation
  coinDeltaText: {
    position: 'absolute',
    top: 8,
    alignSelf: 'center',
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 22,
    color: colors.coinGold,
    textShadowColor: 'rgba(255,200,0,0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
    zIndex: 20,
    letterSpacing: 1,
  },
  // Level Up celebration
  levelUpOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 0,
  },
  levelUpEmoji: {
    fontSize: 64,
    marginBottom: 8,
  },
  levelUpTitle: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 42,
    color: '#ffffff',
    letterSpacing: 4,
    textShadowColor: 'rgba(255,200,0,0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 30,
  },
  levelUpSubtitle: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 20,
    color: colors.coinGold,
    marginTop: 4,
    letterSpacing: 2,
  },
});

// Web-only keyframe injection for the DROP4 logo neon-halo pulse.
// Idempotent — same pattern as ScreenBackground's keyframe block.
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const ID = 'drop4-home-keyframes';
  if (!document.getElementById(ID)) {
    const el = document.createElement('style');
    el.id = ID;
    el.textContent = `
      @keyframes drop4LogoHalo {
        0%   { opacity: 0.55; transform: scale(0.96); }
        100% { opacity: 0.92; transform: scale(1.08); }
      }
    `;
    document.head.appendChild(el);
  }
}
