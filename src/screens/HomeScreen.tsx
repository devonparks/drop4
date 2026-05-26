import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, Image, ImageSourcePropType, StyleSheet, Pressable, Animated, Platform, PanResponder, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { TopBar } from '../components/ui/TopBar';
import { Canvas, useFrame } from '@react-three/fiber/native';
import * as THREE from 'three';
import { CompositeCharacter, type CharacterState, type ContentSource } from '@amg/character-runtime';
import { LiveBackground3D } from '../components/3d/LiveBackground3D';
import { useCharacterStore } from '../stores/characterStore';
import { HUMAN_EMOTES } from '../data/animationRegistry';
import { AnimationPicker } from '../components/ui/AnimationPicker';
import { PetDisplay } from '../components/ui/PetDisplay';
import { useShopStore } from '../stores/shopStore';
import { usePetStore } from '../stores/petStore';
import { PETS_ENABLED } from '../data/featureFlags';
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
import { ALL_CAREER_LEVELS, CAREER_CITIES, getLevelsForCity } from '../data/careerLevels';
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
    // Single unified loop — fade + drift run in parallel, then the
    // translateY resets ONLY after the particle is fully invisible
    // (opacity = 0). Two separate loops drifted and caused a visible
    // snap-back mid-fade.
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.sequence([
            Animated.timing(opacity, { toValue: 0.8, duration: 1200, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0, duration: 1200, useNativeDriver: true }),
          ]),
          Animated.timing(translateY, { toValue: -18, duration: 2400, useNativeDriver: true }),
        ]),
        // Reset drift while invisible
        Animated.timing(translateY, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
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

// CDN base URL for AMG part GLBs and animations. Same source the
// CharacterCreatorScreen uses; both must agree so the home and the
// creator render the same character from the same content set.
const CONTENT_SOURCE: ContentSource = {
  baseUrl: 'https://pub-8953453f2512408f9c58656d4ea4e681.r2.dev',
};

// Idle pool shared with the creator (CREATOR_IDLE_LIST). The runtime
// crossfades between these every 8–15 s so the home character isn't
// locked to a single pose — same vibe as Sims/Avakin lobbies.
//
// "Random" pool when the player hasn't pinned a specific idle in the
// AnimationPicker. We expanded from the 3 calm-loop idles to all 7
// unique poses (3 loop + 4 one-shots) so Random feels alive — Devon's
// spec says "do a random idle every ~10 seconds." When the player picks
// a SPECIFIC idle this list is replaced with `[that one idle]` so the
// runtime stops cycling and just plays the chosen pose forever.
const HOME_IDLE_RANDOM_POOL: string[] = [
  'idles/idle_base.glb',
  'idles/idle_hands_on_hips.glb',
  'idles/idle_arms_folded.glb',
  'idles/idle_bored_foot_tap.glb',
  'idles/idle_bored_swing_arms.glb',
  'idles/idle_bored_slump.glb',
  'idles/idle_check_watch.glb',
];

// Drag-rotation rig: parents the composed character so the home's pan
// gesture controls Y rotation independently of any animation playing.
// Lerps toward the target so the character doesn't snap when the caller
// jumps from 0 to ±2π in one drag.
function RotatingGroup({ rotationY, children }: { rotationY: number; children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (!ref.current) return;
    const current = ref.current.rotation.y;
    ref.current.rotation.y = current + (rotationY - current) * Math.min(delta * 12, 1);
  });
  return <group ref={ref}>{children}</group>;
}

function Character3DWrapper({ activeEmoteId, rotationY }: { activeEmoteId: string | null; rotationY: number }) {
  // Source of truth: amgCharacter (multi-GLB CompositeCharacter). The
  // App.tsx boot seed guarantees this is populated by the time the home
  // mounts, so a null check is just defensive.
  const amgCharacter = useCharacterStore((s) => s.amgCharacter) as unknown as CharacterState | null;

  // Player's pinned idle from the AnimationPicker. null = Random (cycle
  // through the full pool every ~10 s). A specific id = play just that
  // one pose forever — pass a single-entry list so CompositeCharacter
  // has nothing to rotate to.
  const equippedIdle = useShopStore((s) => s.equippedIdle);
  const idleList = useMemo(
    () => (equippedIdle ? [`idles/${equippedIdle}.glb`] : HOME_IDLE_RANDOM_POOL),
    [equippedIdle],
  );
  const [loaded, setLoaded] = useState(false);
  // Stalled state — flips on if the character hasn't finished loading
  // after 15 s, or if CompositeCharacter surfaces an error. Shows a
  // tappable retry instead of an infinite spinner so the player isn't
  // staring at a blank stage when R2 is slow / the network drops.
  const [stalled, setStalled] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!loaded) return;
    const anim = Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true });
    anim.start();
    return () => anim.stop();
  }, [loaded, fadeAnim]);

  // 15 s safety timeout — if onReady hasn't fired by then, surface the
  // retry chip. Resets every reload attempt.
  useEffect(() => {
    if (loaded) return;
    const t = setTimeout(() => setStalled(true), 15_000);
    return () => clearTimeout(t);
  }, [loaded, reloadKey]);

  const retry = () => {
    setStalled(false);
    setLoaded(false);
    setReloadKey((k) => k + 1);
  };

  const stateForRender = useMemo<CharacterState | null>(() => {
    if (!amgCharacter) return null;
    // Map the home's emote id (e.g. 'emote_dab') to a relative animation
    // path the runtime can fetch directly. Full path form bypasses the
    // runtime's automatic 'emote_' prefix injection so we never end up
    // with 'emote_emote_dab.glb'.
    const animation = activeEmoteId ? `emotes/${activeEmoteId}.glb` : null;
    return { ...amgCharacter, animation };
  }, [amgCharacter, activeEmoteId]);

  if (!stateForRender) return null;

  return (
    <View style={{ width: 520, height: 620, pointerEvents: 'none' }}>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: fadeAnim }]}>
        <Canvas
          // frameloop="always" — demand mode was causing r3f native to intercept
          // ALL screen touches (not just the canvas area), making the entire app
          // unresponsive on iOS. The mesh merge (Path B, 2026-05-22) already cuts
          // per-frame cost ~6x so demand mode is no longer needed for perf.
          frameloop="always"
          gl={{ antialias: false, alpha: true } as any}
          camera={{ position: [0, 1.1, 3.2], fov: 42, near: 0.01, far: 1000 }}
          // lookAt y at 1.1 — frames a 1.8 m character so feet sit
          // ~3 % from the canvas bottom (right above PLAY) and the
          // head extends into the logo area for the depth Devon
          // wanted. Was 0.95 (head far from logo) and 1.15 (way too
          // low). 1.1 is the sweet spot.
          onCreated={(canvasState: any) => { canvasState.camera.lookAt(0, 1.1, 0); }}
          style={StyleSheet.absoluteFill as any}
        >
          {/* Three-point lighting matches the legacy Character3D so the
              premium silhouette read carries over to the AMG path. */}
          <ambientLight intensity={0.55} color="#c0ccf0" />
          <directionalLight
            position={[2.5, 4, 3]}
            intensity={1.3}
            color="#fff4e0"
          />
          <directionalLight position={[-2, 2, 1.5]} intensity={0.6} color="#a8c8f0" />
          <directionalLight position={[0, 3, -3]} intensity={1.4} color="#ff9a5a" />
          <hemisphereLight args={['#6080a0', '#1a1820', 0.5]} />

          <RotatingGroup rotationY={rotationY}>
            <CompositeCharacter
              key={reloadKey}
              source={CONTENT_SOURCE}
              state={stateForRender}
              // Devon-tuned: back to 1.8 m so the character feels
              // hero-sized and the head crashes into the DROP4 logo
              // for depth. Feet visibility is handled by raising the
              // camera's lookAt (see onCreated above) and tightening
              // the canvas-to-PLAY padding (characterStage paddingBottom + menuButtons paddingTop).
              targetHeightMeters={1.8}
              idleList={idleList}
              onReady={() => { setLoaded(true); setStalled(false); }}
              onError={() => setStalled(true)}
            />
          </RotatingGroup>

        </Canvas>
      </Animated.View>

      {/* Loading overlay — first home mount fetches the manifest + base
          skeleton + ~17 part GLBs from the AMG CDN. The spinner gives the
          player something to look at instead of a blank stage during
          that ~3-5 s window. Cached on subsequent mounts. */}
      {!loaded && !stalled && (
        <View style={[styles.characterLoadingOverlay, { pointerEvents: 'none' }]}>
          <ActivityIndicator color={colors.orange} size="large" />
        </View>
      )}

      {/* Stalled-load retry — surfaced after a 15 s timeout or when
          CompositeCharacter raises onError. Without this the player
          sees an infinite spinner if R2 is slow / down. Tapping rebuilds
          the CompositeCharacter via a key bump so all the fetches re-fire.

          Note: rendered as <Text onPress=> instead of <Pressable> so it
          doesn't nest inside the outer character-tap <Pressable> (which
          rendered as <button><button> on web, firing a React hydration
          error). Text with onPress is supported by React Native and
          renders as a non-interactive span/div on web — no button-in-
          button. Polish 2026-05-06. */}
      {stalled && !loaded && (
        <View style={styles.characterStalledOverlay}>
          <Text style={styles.characterStalledText}>
            Couldn't load your character{'\n'}— check your connection
          </Text>
          {/* Text with onPress, no accessibilityRole — RN-Web only emits
              <button> when role="button" is set explicitly. Without it
              Text renders as <span>/<div>, so it doesn't nest inside
              the outer <Pressable role=button> as <button><button>. */}
          <Text
            onPress={() => { haptics.tap(); retry(); }}
            style={[styles.characterRetryBtn, styles.characterRetryText]}
            accessibilityLabel="Retry loading character"
          >
            ↻ RETRY
          </Text>
        </View>
      )}
    </View>
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
    <View style={[watermarkStyles.layer, { pointerEvents: 'none' }]}>
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
  onLootBoxPress,
}: {
  onSpinPress: () => void;
  onCareerPress: () => void;
  onMissionsPress: () => void;
  onLootBoxPress: () => void;
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

  const ownedBoxes = useLootBoxStore((s) => s.ownedBoxes);
  const unopenedBoxCount = ownedBoxes.reduce((sum: number, b: { count: number }) => sum + b.count, 0);
  const totalWins = matches.filter((m) => m.result === 'win').length;
  const winsTowardBox = totalWins % 3;
  const winBoxReady = unopenedBoxCount > 0 || (totalWins > 0 && winsTowardBox === 0);

  const claimableMissions = challenges.filter(
    (c) => c.progress >= c.target && !c.completed,
  ).length;

  const nearestChallenge = claimableMissions === 0
    ? challenges
        .filter(c => !c.completed && c.progress < c.target)
        .sort((a, b) => (b.progress / b.target) - (a.progress / a.target))[0]
    : null;

  const nextCareerLevel = ALL_CAREER_LEVELS.find(
    (l) => !careerProgress[l.id]?.completed,
  );
  const currentCity = nextCareerLevel
    ? CAREER_CITIES.find(c => getLevelsForCity(c.id).some(l => l.id === nextCareerLevel.id))
    : null;
  const cityLevelIndex = currentCity && nextCareerLevel
    ? getLevelsForCity(currentCity.id).findIndex(l => l.id === nextCareerLevel.id) + 1
    : 0;
  const cityLevelCount = currentCity ? getLevelsForCity(currentCity.id).length : 0;

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
        status={unopenedBoxCount > 0 ? `${unopenedBoxCount} OPEN` : `${winsTowardBox}/3`}
        ready={winBoxReady}
        onPress={onLootBoxPress}
      />
      <LootCard
        iconSrc={require('../assets/images/ui/challenge-bag.png')}
        label="MISSIONS"
        status={claimableMissions > 0 ? `${claimableMissions} READY` : nearestChallenge ? `${nearestChallenge.progress}/${nearestChallenge.target}` : 'DONE'}
        ready={claimableMissions > 0}
        onPress={onMissionsPress}
      />
      <LootCard
        iconSrc={require('../assets/images/ui/tab-career.png')}
        label="CAREER"
        status={nextCareerLevel ? `${cityLevelIndex}/${cityLevelCount} · ${currentCity?.nickname ?? ''}` : 'COMPLETE!'}
        ready={!!nextCareerLevel}
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
  // Subtle opacity pulse on the READY status pill so SPIN / WIN BOX /
  // MISSIONS catch the eye when there's something to claim. Stays
  // gentle (75%↔100%) so it doesn't fight the rest of the lobby
  // visuals; same pattern the TAP TO PREVIEW EMOTES hint uses.
  // AAA polish 2026-05-05.
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!ready) {
      pulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.75, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [ready, pulse]);
  return (
    <Pressable
      style={[styles.lootCard, ready && styles.lootCardReady]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label} ${status}`}
    >
      <Image source={iconSrc} style={styles.lootCardIcon} resizeMode="contain" />
      <Text style={styles.lootCardLabel}>{label}</Text>
      <Animated.View
        style={[
          styles.lootCardStatusPill,
          ready && styles.lootCardStatusPillReady,
          ready && { opacity: pulse },
        ]}
      >
        <Text style={[styles.lootCardStatusText, ready && styles.lootCardStatusTextReady]} numberOfLines={1}>
          {status}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

export function HomeScreen() {
  const navigation = useNavigation<any>();
  const coins = useShopStore(s => s.coins);
  const gems = useShopStore(s => s.gems);
  const level = useShopStore(s => s.level);
  // Pet system: prefer the 3D petStore (Polygon Dogs registry); fall
  // back to the legacy shopStore.equippedPet only when activePetId is
  // null. The two stores use different id schemes — petStore.activePetId
  // is `dog_labrador` (matches PETS_3D registry); shopStore.equippedPet
  // is the legacy `labrador` (2D pet ids). PetDisplay does the right
  // thing for either one — but Home was passing the legacy id only,
  // which fails the 3D registry lookup. Fix 2026-05-05.
  const activePetId3D = usePetStore(s => s.activePetId);
  const equippedPetLegacy = useShopStore(s => s.equippedPet);
  const equippedPet = activePetId3D ?? equippedPetLegacy;
  const winStreak = useGameStore(s => s.winStreak);
  const careerCompletedCount = useCareerStore(s => Object.values(s.progress).filter(p => p.completed).length);
  const lastSpinDate = useDailySpinStore(s => s.lastSpinDate);
  const spinAvailable = (() => {
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return lastSpinDate !== today;
  })();
  // Loot box count now shown via LootBoxRow's WIN BOX card status.
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
  // Character3DWrapper. Auto-clears after 5s so the character returns to idle.
  // Was 3 s; bumped 2026-05-04 because most Sidekick emotes run 3.5-5 s and
  // 3 s was cutting them off mid-motion — the crossfade-back-to-idle then
  // caught the character at an extreme pose and read as a "glitch."
  const [active3DEmote, setActive3DEmote] = useState<string | null>(null);
  useEffect(() => {
    if (!active3DEmote) return;
    const t = setTimeout(() => setActive3DEmote(null), 5000);
    return () => clearTimeout(t);
  }, [active3DEmote]);

  // Drag-to-rotate: player can grab the character and swipe left/right to
  // spin the Y axis. Stays where it's dropped (no snap back). Tap still
  // triggers an emote because PanResponder only claims the gesture on
  // horizontal motion beyond a small threshold — vertical taps fall
  // through to the inner Pressable.
  const [characterRotationY, setCharacterRotationY] = useState(0);
  // Keep current rotation in a ref so PanResponder callbacks can read it
  // without being recreated on every state change (was causing gesture stutter).
  const rotationRef = useRef(0);
  rotationRef.current = characterRotationY;
  const dragStartRotationRef = useRef(0);
  const characterPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_evt, g) => Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy),
        onPanResponderGrant: () => {
          dragStartRotationRef.current = rotationRef.current;
        },
        onPanResponderMove: (_evt, g) => {
          // ~1° per pixel feels natural. Full screen swipe ≈ one full spin.
          setCharacterRotationY(dragStartRotationRef.current + g.dx * 0.012);
        },
        onPanResponderTerminationRequest: () => false,
      }),
    [], // Stable — reads refs, not state
  );

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

    // Resolve which emote to play from the player's AnimationPicker
    // selection. Three states:
    //   • homeEmoteRandomMode === true  → pick a random OWNED emote
    //   • specific selectedHomeEmote    → play that one (validate it's
    //                                     still owned in case the save
    //                                     references a stale legacy id)
    //   • neither (fresh save / cleared)→ fall through to random
    // Random pool is owned + free starters; the picker filters the
    // same way so the two stay in sync.
    const { selectedHomeEmote, homeEmoteRandomMode, ownedEmotes } = useShopStore.getState();
    const ownedPool = HUMAN_EMOTES.filter(
      (e) => ownedEmotes.includes(e.id) || (e.price ?? 0) === 0,
    );
    if (ownedPool.length === 0) return;

    const wantsRandom = homeEmoteRandomMode || !selectedHomeEmote;
    let pickId: string;
    if (wantsRandom) {
      pickId = ownedPool[Math.floor(Math.random() * ownedPool.length)].id;
    } else {
      // Specific pick. If the saved id isn't in the AMG-owned pool
      // (e.g. the save predates the picker rewrite and has a legacy
      // id like 'dab'), fall back to random so the player always sees
      // an animation play instead of nothing.
      const isOwned = ownedPool.some((e) => e.id === selectedHomeEmote);
      pickId = isOwned ? selectedHomeEmote : ownedPool[Math.floor(Math.random() * ownedPool.length)].id;
    }

    haptics.win();
    playSound('click');
    setActive3DEmote(pickId);
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
        style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}
      />
      {Platform.OS === 'web' && (
        <View
          style={[
            StyleSheet.absoluteFill,
            { pointerEvents: 'none' },
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
        <View style={styles.topBarWrap}>
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
              style={[styles.sideBtnCircle, { pointerEvents: 'none' }]}
            >
              <Image
                source={require('../assets/images/ui/side-btn-emotes.png')}
                style={styles.sideBtnImg}
                resizeMode="contain"
              />
            </LinearGradient>
            <Text style={[styles.sideBtnLabel, { pointerEvents: 'none' }]}>Emotes</Text>
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
            <View style={[styles.characterSpotlight, { pointerEvents: 'none' }]} />
            <StageSparkles />
            <StagePremiumFX width={400} />


            <BreathingView intensity={0.015} speed={4000}>
            <Pressable
              onPress={handleCharacterTap}
              style={styles.characterTapArea}
              accessibilityRole="button"
              accessibilityLabel="Player character"
              accessibilityHint="Tap to play your selected emote. Open the Emotes button to change it."
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
              // No onLongPress override — both tap and long-press should
              // honor the player's AnimationPicker selection (a specific
              // emote, or random if that's chosen). Devon's spec: "once
              // you select [an emote], every time you press the character
              // it will do that emote." Single source of truth.
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
            {/* Pet moved out of the character stage 2026-05-05 per
                Devon \u2014 was at character's feet with a heavy amber glow
                that read as a UI frame. Now floats beside the PLAY
                button below (see menuButtons block). */}
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
              style={[styles.sideBtnCircle, { pointerEvents: 'none' }]}
            >
              <Image
                source={require('../assets/images/ui/side-btn-idles.png')}
                style={styles.sideBtnImg}
                resizeMode="contain"
              />
            </LinearGradient>
            <Text style={[styles.sideBtnLabel, { pointerEvents: 'none' }]}>Idles</Text>
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
        {/* PLAY + dog side by side — Devon 2026-05-05: "put it on
            the right side of the play button." Phone is 390 wide,
            PLAY at full 340 left no room beside it (dog would
            overlap). Now: PLAY shrunk to 240 + dog at 130 = 370 px
            total, fits with 10 px margin. They flex-row align so
            the row stays balanced. */}
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
          {PETS_ENABLED && equippedPet && (
            <Pressable
              onPress={handlePetTap}
              style={styles.petBesidePlay}
              accessibilityRole="button"
              accessibilityLabel="Equipped pet"
              accessibilityHint="Tap to interact with your pet"
            >
              <Animated.View style={{ transform: [{ scale: petBounce }] }}>
                <PetDisplay petId={equippedPet} size={120} isIdle />
              </Animated.View>
              {showPetHeart && (
                <Animated.Text
                  style={[styles.petHeart, { opacity: heartOpacity, transform: [{ translateY: heartTranslateY }], pointerEvents: 'none' }]}
                >{'❤️'}</Animated.Text>
              )}
            </Pressable>
          )}
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
          // WIN BOX tap routes to LootBoxScreen so the player can actually
          // open the boxes their wins have been accumulating in
          // ownedBoxes. Previously routed to Missions with a "box opens at
          // next match" comment — but boxes never auto-opened, they just
          // piled up unreachable. (See lootBoxStore.addBox callers in
          // GameScreen, DailyRewardPopup, DailySpinWheel.)
          onLootBoxPress={() => { haptics.tap(); playSound('click'); navigation.navigate('LootBox' as any); }}
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
              { pointerEvents: 'none' },
            ]}
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
  // Wrap the TopBar in its own View with high zIndex so the character
  // canvas can never absorb taps meant for the Profile / Settings /
  // coin / gem buttons. Belt-and-braces alongside characterStage's
  // `overflow: 'hidden'`.
  topBarWrap: {
    zIndex: 100,
  },
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
    // The character canvas is 520x620 — bigger than the lobbyArea's
    // middle column on a 390-wide phone, so it overflows and covers
    // the Emotes button (rendered first in JSX). zIndex bumps both
    // side buttons above the character so taps reach the right
    // handler. Was Devon's "emotes button doesn't work" bug.
    zIndex: 10,
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
    boxShadow: '0px 0px 10px rgba(255,140,0,0.5)',
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
    paddingTop: 28,
    // paddingBottom dropped 18 → 4: with the camera-tuned framing
    // (lookAt 1.1) the feet land ~3 % from the canvas bottom, so the
    // bigger 18 px buffer was just extra empty stage between the
    // feet and the PLAY button. 4 px keeps a hair of breathing room
    // without the gap Devon flagged.
    paddingBottom: 4,
    // Note: overflow stays `visible` so the spotlight + foot-glow can
    // extend past the stage column (they're intentionally wider than
    // the column). Tap-area containment is handled lower down on the
    // Pressable itself — see characterTapArea.
  },
  // Constrains the character Pressable's hit area so the 520-wide
  // Character3DWrapper canvas inside doesn't bleed taps onto the
  // TopBar / side buttons. The canvas paints OVER the wrapper bounds
  // (transparent margins) but the tap region stays within ~280 px,
  // matching the visible stage column. Spotlight + foot-glow render
  // on a sibling layer in characterStage so they're unaffected.
  characterTapArea: {
    width: 280,
    height: 620,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
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
          boxShadow: '0px 0px 60px rgba(255,144,64,0.7)',
        }),
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
    // paddingTop trimmed back to 10 — with the bigger character (1.8 m)
    // + camera at lookAt 1.1, the feet end up right at the canvas
    // bottom edge, so PLAY only needs a small breathing gap before it
    // starts. Devon: "feet right above the play button."
    paddingTop: 10,
    // Position relative so the absolutely-positioned pet child anchors
    // here (not to a higher ancestor). Devon 2026-05-05: "play button
    // got moved you need to move it back" — restored PLAY to its 340 px
    // hero width + this row to centered column; pet now floats absolute
    // beside PLAY without disturbing PLAY's geometry.
    position: 'relative',
    paddingBottom: 6,
    flexShrink: 0,
  },
  // Devon's hand-made chunky 3D PLAY button rendered as a tappable Image.
  // Bumped from 260×96 → 320×118 — Devon: "make the play button bigger".
  // The PLAY image is 1536×1024 with the button silhouette ~60% of canvas;
  // resizeMode: 'contain' preserves the aspect.
  playBtn: {
    // Hero PLAY — back at 340x130 per Devon ("play button got moved
    // you need to move it back"). Dog companion floats absolute on
    // top of PLAY's right side; transparent dog canvas BG means the
    // overlap doesn't visually obscure PLAY's text.
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
    boxShadow: '0px 0px 8px rgba(255,144,64,0.7)',
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
  // Pet beside PLAY — absolute, anchored to the right edge of
  // menuButtons (so PLAY stays centered as the hero). Pet canvas
  // BG is transparent so the partial overlap with PLAY's right
  // side reads as "dog standing next to PLAY" — the dog's body
  // doesn't sit on top of PLAY's text.
  petBesidePlay: {
    position: 'absolute',
    right: 4,
    top: 6,
    zIndex: 5,
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
    textShadow: '0px 0px 12px rgba(255,200,0,0.6)',
    zIndex: 20,
    letterSpacing: 1,
  },
  characterLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  characterStalledOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingHorizontal: 30,
  },
  characterStalledText: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 13,
    color: 'rgba(255,200,180,0.9)',
    textAlign: 'center',
    lineHeight: 18,
  },
  characterRetryBtn: {
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: colors.orange,
    backgroundColor: 'rgba(255,140,0,0.18)',
  },
  characterRetryText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 13,
    color: colors.orange,
    letterSpacing: 1.4,
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
    textShadow: '0px 0px 30px rgba(255,200,0,0.8)',
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
