import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, Image, StyleSheet, Pressable, Animated, Platform, PanResponder } from 'react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { TopBar } from '../components/ui/TopBar';
import { GlossyButton } from '../components/ui/GlossyButton';
import { Character3D } from '../components/3d/Character3D';
import { useCharacterStore } from '../stores/characterStore';
import { OUTFITS } from '../data/outfitRegistry';
import { HUMAN_EMOTES, DEFAULT_HUMAN_IDLE } from '../data/animationRegistry';
import { AnimationPicker } from '../components/ui/AnimationPicker';
import { PetDisplay } from '../components/ui/PetDisplay';
import { useShopStore } from '../stores/shopStore';
import { useGameStore } from '../stores/gameStore';
import { useDailySpinStore } from '../stores/dailySpinStore';
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

function StageSparkles() {
  return (
    <>
      <SparkleParticle color="rgba(255,210,80,0.9)" size={4} left={30} bottom={90} delay={0} />
      <SparkleParticle color="rgba(100,180,255,0.9)" size={3} left={200} bottom={110} delay={600} />
      <SparkleParticle color="rgba(255,210,80,0.9)" size={3.5} left={60} bottom={150} delay={1200} />
      <SparkleParticle color="rgba(100,180,255,0.9)" size={4} left={180} bottom={160} delay={800} />
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
      width={320}
      height={400}
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

  // Show tutorial on first visit — delay enough for stores to load from AsyncStorage
  const homeTip = getTipById('home_tap_character')!;
  const tipAlreadySeen = seenTips.includes('home_tap_character');
  useEffect(() => {
    if (!tipAlreadySeen) {
      // Wait 3s to ensure tutorialStore has loaded from AsyncStorage
      const timer = setTimeout(() => {
        // Re-check after delay in case store loaded in the meantime
        if (!useTutorialStore.getState().seenTips.includes('home_tap_character')) {
          setShowTutorial(true);
        }
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
    <ScreenBackground scene="home">
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

        {/* ═══ DROP4 LOGO ═══ Breathing scale so the header feels
            alive on idle. ~3% scale range on a 5s cycle — subtle
            enough to read as premium polish, not jumpy. */}
        <StaggeredEntry index={0}>
        <BreathingView intensity={0.015} speed={5000}>
          <View style={styles.logoArea}>
            <Image
              source={require('../assets/images/ui/home-logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
        </BreathingView>
        </StaggeredEntry>

        {/* ═══ CHARACTER LOBBY ═══ */}
        <StaggeredEntry index={1}>
        <View style={styles.lobbyArea}>
          {/* Emotes button (left) — opens unified picker on Emotes tab */}
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
            <View pointerEvents="none" style={styles.footGlowOuter} />
            <View pointerEvents="none" style={styles.footGlowInner} />
            <StageSparkles />
            <StagePremiumFX width={320} />

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
            <LinearGradient
              colors={['rgba(100,180,255,0.3)', 'rgba(80,140,255,0.12)', 'transparent']}
              style={styles.stagePlatform}
            />
            <View style={styles.stageRing} />

          </View>

          {/* Idles button (right) — opens unified picker on Idles tab */}
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

        {/* CUSTOMIZE moved to the Customize bottom tab — it's a full
            destination now. SPIN and LOOT boxes render as engagement
            chips in the same spot the old CUSTOMIZE/SPIN row occupied.
            Row is 0-height when neither chip is showing so the mode
            buttons don't shift. */}
        {(spinAvailable || unopenedBoxCount > 0) && (
          <StaggeredEntry index={2}>
            <View style={styles.chipRow}>
              {unopenedBoxCount > 0 && (
                <Pressable
                  onPress={() => { haptics.tap(); navigation.navigate('LootBox' as never); }}
                  style={styles.lootChip}
                  accessibilityRole="button"
                  accessibilityLabel={`${unopenedBoxCount} unopened loot box${unopenedBoxCount === 1 ? '' : 'es'} ready`}
                  accessibilityHint="Opens the loot box inventory"
                >
                  <Image
                    source={require('../assets/images/ui/loot-gold.png')}
                    style={styles.lootChipImg}
                    resizeMode="contain"
                  />
                  <Text style={styles.lootChipText}>{unopenedBoxCount}</Text>
                  <Text style={styles.chipCaption}>READY</Text>
                </Pressable>
              )}
              {spinAvailable && (
                <Pressable
                  onPress={() => { haptics.tap(); playSound('click'); setSpinWheelOpen(true); }}
                  style={styles.spinChip}
                  accessibilityRole="button"
                  accessibilityLabel="Free daily spin ready"
                  accessibilityHint="Opens the daily spin wheel"
                >
                  <Text style={styles.spinChipIcon}>🎰</Text>
                  <Text style={styles.spinChipText}>FREE SPIN</Text>
                </Pressable>
              )}
            </View>
          </StaggeredEntry>
        )}

        {/* ═══ MENU BUTTONS ═══ */}
        <View style={styles.menuButtons}>
          <SlideReveal from="bottom" delay={0}>
              <GlossyButton
                label={winStreak > 0 ? `PLAY  🔥${winStreak}` : 'PLAY'}
                subtitle={aiGameCount > 0 ? `${aiGameCount} game${aiGameCount !== 1 ? 's' : ''} played` : 'vs AI · Easy, Medium, Hard'}
                variant="orange"
                small
                icon="🎮"
                iconRight="›"
                bgImage={require('../assets/images/ui/mode-play-bg.png')}
                onPress={() => navigateTo('Play')}
              />
          </SlideReveal>
          <SlideReveal from="bottom" delay={80}>
              <GlossyButton
                label="CAREER"
                subtitle={careerCompletedCount > 0 ? `${careerCompletedCount}/${totalCareerLevels} levels` : 'Take the City · 3 launch cities'}
                variant="purple"
                small
                icon="🏆"
                iconRight="›"
                bgImage={require('../assets/images/ui/mode-career-bg.png')}
                onPress={() => navigateTo('CareerMap')}
              />
          </SlideReveal>
          {/* Local play — pass and play, available in v1 */}
          <SlideReveal from="bottom" delay={160}>
              <GlossyButton
                label="LOCAL PLAY"
                subtitle="Pass & play on one device"
                variant="teal"
                small
                icon="👥"
                iconRight="›"
                bgImage={require('../assets/images/ui/mode-local-bg.png')}
                onPress={() => navigateTo('LocalPlay')}
              />
          </SlideReveal>
        </View>

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

        {/* Tutorial tooltip */}
        <TutorialTooltip
          tip={homeTip}
          visible={showTutorial && !hasSeenTip('home_tap_character')}
          onDismiss={() => setShowTutorial(false)}
        />

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
    height: 68,
    justifyContent: 'center',
    marginTop: 0,
    marginBottom: 0,
  },
  logoImage: {
    width: 240,
    height: 110,
    marginTop: -22,
    marginBottom: -24,
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
    // Used to be `flex: 1` — which grew the character stage to eat all
    // remaining vertical space, pushing the LOCAL PLAY card below the tab
    // bar on shorter viewports. We still allow shrink on very short screens
    // but maxHeight was too low at 340 — freed padding space couldn't flow
    // here, so the character + buttons stayed high with a dead gap above the
    // tab bar. Bumping to 440 lets the lobby absorb extra vertical space,
    // which pushes the character (pinned flex-end in characterStage) and
    // the mode-button stack visually down toward the tab bar.
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 320,
    maxHeight: 440,
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
    paddingTop: 0,
  },
  // Soft warm spotlight pooling under the character's feet — a pure
  // View with a radial-gradient backgroundImage (web) plus a glowing
  // shadow (native). Reinforces the painted stage in bg-home without
  // adding another image asset that can scale/clip in weird ways.
  footGlowOuter: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    width: 320,
    height: 90,
    borderRadius: 160,
    ...(Platform.OS === 'web' ? ({
      backgroundImage: 'radial-gradient(ellipse at center, rgba(255,180,80,0.35) 0%, rgba(255,120,40,0.18) 35%, rgba(255,120,40,0) 70%)',
      filter: 'blur(6px)',
      mixBlendMode: 'screen',
    } as any) : {
      backgroundColor: 'rgba(255,140,60,0.14)',
      shadowColor: '#ff9040',
      shadowOpacity: 0.6,
      shadowRadius: 40,
      shadowOffset: { width: 0, height: 0 },
    }),
  },
  footGlowInner: {
    position: 'absolute',
    bottom: 56,
    alignSelf: 'center',
    width: 210,
    height: 60,
    borderRadius: 105,
    ...(Platform.OS === 'web' ? ({
      backgroundImage: 'radial-gradient(ellipse at center, rgba(255,220,150,0.55) 0%, rgba(255,170,80,0.2) 50%, rgba(255,170,80,0) 80%)',
      filter: 'blur(4px)',
      mixBlendMode: 'screen',
    } as any) : {
      backgroundColor: 'rgba(255,200,120,0.22)',
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
    paddingHorizontal: 20,
    gap: 6,
    paddingBottom: 0,  // was 8 — kill the internal pad so the last card
                        // sits right above the tab bar, no floating gap.
    // Never shrink — mode buttons must be fully visible. If space is tight,
    // the character stage above compresses instead (lobbyArea flexShrink=1).
    flexShrink: 0,
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
