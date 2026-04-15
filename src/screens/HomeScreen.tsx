import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, ScrollView, Platform } from 'react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { TopBar } from '../components/ui/TopBar';
import { GlossyButton } from '../components/ui/GlossyButton';
import { AnimatedCharacter, useEmoteTrigger, EMOTE_CATEGORIES, EmoteId, IdleVariantId } from '../components/ui/AnimatedCharacter';
import { Character3D } from '../components/3d/Character3D';
import { useCharacterStore } from '../stores/characterStore';
import { OUTFITS } from '../data/outfitRegistry';
import { EmoteShowcase } from '../components/ui/EmoteShowcase';
import { HomeEmoteSelector } from '../components/ui/HomeEmoteSelector';
import { AnimationPicker } from '../components/ui/AnimationPicker';
import { IdlePicker } from '../components/ui/IdlePicker';
import { PetDisplay } from '../components/ui/PetDisplay';
import { useShopStore, getPlayerTitle, getPlayerTitleColor } from '../stores/shopStore';
import { useGameStore } from '../stores/gameStore';
import { useDailySpinStore } from '../stores/dailySpinStore';
import { useTutorialStore } from '../stores/tutorialStore';
import { useChallengeStore } from '../stores/challengeStore';
import { useCareerStore } from '../stores/careerStore';
import { useRankedStore } from '../stores/rankedStore';
import { useSeasonStore } from '../stores/seasonStore';
import { useMatchHistoryStore } from '../stores/matchHistoryStore';
import { COIN_REWARDS } from '../engine/constants';
import { playSound } from '../services/audio';
import { DailySpinWheel } from '../components/ui/DailySpinWheel';
import { WelcomeOverlay } from '../components/ui/WelcomeOverlay';
import { TutorialTooltip } from '../components/ui/TutorialTooltip';
import { getTipById } from '../data/tutorials';
import { haptics } from '../services/haptics';
import { ALL_CAREER_LEVELS } from '../data/careerLevels';
import { FEATURES } from '../config/features';
import { PressScale, Shimmer, BreathingView, SlideReveal } from '../components/animations';
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

// Pressable wrapper with scale-down feedback for menu buttons
// PressScaleView — now uses the shared PressScale component from animations library
function Character3DWrapper() {
  const cust = useCharacterStore((s) => s.customization);
  const outfit = OUTFITS[cust.outfitId] ?? OUTFITS.modern_civilians_01;
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
    />
  );
}

function PressScaleView({ children, onPress }: { children: React.ReactNode; onPress: () => void }) {
  return (
    <PressScale onPress={onPress}>
      {children}
    </PressScale>
  );
}

// Animated fire streak banner — flickers orange/red with pulse
function StreakFireBanner({ streak }: { streak: number }) {
  const flicker = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Flicker loop
    const flickerLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(flicker, { toValue: 0.7, duration: 200 + Math.random() * 100, useNativeDriver: true }),
        Animated.timing(flicker, { toValue: 1, duration: 200 + Math.random() * 100, useNativeDriver: true }),
      ])
    );
    // Pulse scale
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.03, duration: 800, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    flickerLoop.start();
    pulseLoop.start();
    return () => { flickerLoop.stop(); pulseLoop.stop(); };
  }, []);

  const fireEmojis = streak >= 5 ? '\uD83D\uDD25\uD83D\uDD25\uD83D\uDD25' : streak >= 3 ? '\uD83D\uDD25\uD83D\uDD25' : '\uD83D\uDD25';

  return (
    <Animated.View style={[styles.streakBanner, { opacity: flicker, transform: [{ scale: scaleAnim }] }]}>
      <Text style={styles.streakFireEmoji}>{fireEmojis}</Text>
      <Text style={styles.streakText}>{streak} Win Streak!</Text>
      <Text style={styles.streakFireEmoji}>{fireEmojis}</Text>
    </Animated.View>
  );
}

const NEWS_ITEMS = [
  { id: 'emotes', emoji: '🕺', text: 'NEW: 30 Emotes!', screen: 'CharacterCreator', gradient: ['rgba(255,140,0,0.25)', 'rgba(255,80,0,0.12)'] as const },
  { id: 'season', emoji: '⭐', text: 'Season 0 Rewards', screen: 'SeasonPass', gradient: ['rgba(155,89,182,0.25)', 'rgba(155,89,182,0.12)'] as const },
  { id: 'spin', emoji: '🎰', text: 'Daily Spin!', screen: null, gradient: ['rgba(241,196,15,0.25)', 'rgba(241,196,15,0.12)'] as const },
  { id: 'ranked', emoji: '🏆', text: 'Ranked Mode', screen: 'Multiplayer', gradient: ['rgba(46,204,113,0.25)', 'rgba(46,204,113,0.12)'] as const },
];

function NewsCard({ item, onPress }: { item: typeof NEWS_ITEMS[0]; onPress: () => void }) {
  return (
    <Pressable onPress={onPress}>
      <LinearGradient colors={[...item.gradient]} style={styles.newsCard}>
        <Text style={styles.newsEmoji}>{item.emoji}</Text>
        <Text style={styles.newsText} numberOfLines={1}>{item.text}</Text>
      </LinearGradient>
    </Pressable>
  );
}

export function HomeScreen() {
  const navigation = useNavigation<any>();
  const coins = useShopStore(s => s.coins);
  const gems = useShopStore(s => s.gems);
  const level = useShopStore(s => s.level);
  // Season & challenge details moved to tab bar — store import kept for future use
  const equippedIdle = useShopStore(s => s.equippedIdle);
  const equippedPet = useShopStore(s => s.equippedPet);
  const winStreak = useGameStore(s => s.winStreak);
  const challenges = useChallengeStore(s => s.challenges);
  const careerCompletedCount = useCareerStore(s => Object.values(s.progress).filter(p => p.completed).length);
  const lastSpinDate = useDailySpinStore(s => s.lastSpinDate);
  const spinAvailable = (() => {
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return lastSpinDate !== today;
  })();
  const currentSeason = useRankedStore(s => s.currentSeason);
  const rankedTier = useRankedStore(s => s.tier);
  const seasonTier = useSeasonStore(s => s.currentTier);
  const seasonMaxTier = useSeasonStore(s => s.maxTier);
  const seasonRewards = useSeasonStore(s => s.rewards);
  const seasonXp = useSeasonStore(s => s.xp);
  const seasonXpPerTier = useSeasonStore(s => s.xpPerTier);
  const hasSeenTip = useTutorialStore(s => s.hasSeenTip);
  const seenTips = useTutorialStore(s => s.seenTips); // subscribe to seenTips so re-renders reflect markTipSeen
  const equippedCustomTitle = useShopStore(s => s.equippedCustomTitle);
  const justLeveledUp = useShopStore(s => s.justLeveledUp);
  const clearLevelUp = useShopStore(s => s.clearLevelUp);
  const ownedPets = useShopStore(s => s.ownedPets);
  const claimedStarterPack = useShopStore(s => s.claimedStarterPack);
  const claimStarterPack = useShopStore(s => s.claimStarterPack);
  const { emote, triggerEmote, clearEmote } = useEmoteTrigger();
  const matches = useMatchHistoryStore(s => s.matches);

  // ═══ Play Counts for menu buttons ═══
  const aiGameCount = matches.filter(m => m.mode === 'ai' || m.mode === 'local').length;
  const totalCareerLevels = ALL_CAREER_LEVELS.length;

  // ═══ XP Earned Today ═══
  const xpEarnedToday = (() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayMs = todayStart.getTime();
    return matches
      .filter(m => m.timestamp >= todayMs && m.result === 'win')
      .reduce((sum, m) => {
        const diff = m.difficulty as keyof typeof COIN_REWARDS;
        return sum + (COIN_REWARDS[diff] || 0);
      }, 0);
  })();

  // ═══ Season Countdown (~30 day seasons) ═══
  const seasonDaysRemaining = useMemo(() => {
    const seasonLengthDays = 30;
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    const dayInSeason = dayOfYear % seasonLengthDays;
    return Math.max(seasonLengthDays - dayInSeason, 1);
  }, []);

  // ═══ Pet tap interaction ═══
  const petBounce = useRef(new Animated.Value(1)).current;
  const heartOpacity = useRef(new Animated.Value(0)).current;
  const heartTranslateY = useRef(new Animated.Value(0)).current;
  const [showPetHeart, setShowPetHeart] = useState(false);

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

  // Starter Pack — show for level 1-2 players with no pets who haven't claimed yet
  const showStarterPack = level <= 2 && ownedPets.length === 0 && !claimedStarterPack;
  const handleClaimStarterPack = () => {
    haptics.win();
    claimStarterPack();
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
  const [showcaseOpen, setShowcaseOpen] = useState(false);
  const [emoteSelectorOpen, setEmoteSelectorOpen] = useState(false);
  const [animPickerOpen, setAnimPickerOpen] = useState(false);
  const [animPickerTab, setAnimPickerTab] = useState<'emotes' | 'idles'>('emotes');
  // Subscribed so taps on the character resolve the current preference.
  const selectedHomeEmote = useShopStore((s) => s.selectedHomeEmote);
  const homeEmoteRandomMode = useShopStore((s) => s.homeEmoteRandomMode);
  const [idlePickerOpen, setIdlePickerOpen] = useState(false);
  const [spinWheelOpen, setSpinWheelOpen] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

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
      if (tutorialDismissedRef.current && !emote && !showTutorial && tapHintCountRef.current < 3) {
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
  }, [emote]);

  // All non-idle emotes for random mode tap
  const allEmoteIds: EmoteId[] = EMOTE_CATEGORIES.flatMap(c => c.emotes);
  const handleCharacterTap = () => {
    haptics.tap();
    // Hide tooltip immediately on tap
    setShowTapHint(false);
    tapHintOpacity.setValue(0);

    // Resolution: random mode → random pick; else play the equipped emote;
    // else fall back to random so taps are never a no-op.
    if (homeEmoteRandomMode || !selectedHomeEmote) {
      const randomEmote = allEmoteIds[Math.floor(Math.random() * allEmoteIds.length)];
      triggerEmote(randomEmote);
    } else {
      triggerEmote(selectedHomeEmote as EmoteId);
    }
  };

  // ═══ Smart Suggestion — contextual hint based on game state ═══
  const smartSuggestion = useMemo(() => {
    // Priority 1: Unclaimed challenge rewards
    const unclaimedChallenge = challenges.find(c => c.progress >= c.target && !c.completed);
    if (unclaimedChallenge) {
      return { text: '\uD83C\uDFAF Claim your challenge reward!', screen: 'MainTabs', tabParams: { screen: 'Challenges' } };
    }
    // Priority 2: Win streak momentum (only shown when streak > 0, replaces streak text)
    if (winStreak >= 2) {
      return { text: `\uD83D\uDD25 You're on fire! Keep the streak going!`, screen: null };
    }
    // Priority 3: Career nudge — suggest continuing career
    const nextCareerLevel = careerCompletedCount + 1;
    if (careerCompletedCount > 0) {
      return { text: `\uD83C\uDFC6 Continue your career \u2014 Level ${nextCareerLevel} awaits!`, screen: 'Career' };
    }
    return null;
  }, [challenges, winStreak, careerCompletedCount]);

  const navigateTo = (screen: string) => {
    navigation.dispatch(CommonActions.navigate({ name: screen }));
  };

  return (
    <ScreenBackground>
      <View style={styles.container}>
        <View>
          <TopBar
            coins={coins} gems={gems} level={level}
            onProfilePress={() => navigation.navigate('MainTabs', { screen: 'Profile' } as any)}
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

        {/* ═══ DROP4 LOGO — single text + decorative flare ═══ */}
        {/* Wrapped in a horizontal row so the decorative side flares sit
            beside the text instead of trying to overlap it. */}
        <View style={styles.logoArea}>
          {/* Soft orange halo behind everything */}
          <View style={styles.logoGlowHalo} pointerEvents="none" />

          {/* Side flare lines — thin gradients that fade out from the text */}
          <View style={styles.logoFlareRow} pointerEvents="none">
            <LinearGradient
              colors={['transparent', 'rgba(255,140,0,0.55)', 'rgba(255,140,0,0.85)']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.logoFlareLeft}
            />
            <View style={styles.logoFlareSpacer} />
            <LinearGradient
              colors={['rgba(255,140,0,0.85)', 'rgba(255,140,0,0.55)', 'transparent']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.logoFlareRight}
            />
          </View>

          {/* The logo itself */}
          <Text style={styles.logoMain}>
            DROP<Text style={styles.logo4}>4</Text>
          </Text>

          {/* Small triangle tick above the "4" for a scoreboard vibe */}
          <View style={styles.logoTick} pointerEvents="none" />
        </View>

        {/* ═══ CHARACTER LOBBY ═══ */}
        <View style={styles.lobbyArea}>
          {/* Emotes button (left) — opens unified picker on Emotes tab */}
          <View
            style={styles.sideBtn}
            {...(Platform.OS === 'web' ? { onClick: () => { haptics.tap(); setAnimPickerTab('emotes'); setAnimPickerOpen(true); }, style: [styles.sideBtn, { cursor: 'pointer' }] } as any : {})}
          >
            <Pressable onPress={() => { haptics.tap(); setAnimPickerTab('emotes'); setAnimPickerOpen(true); }} style={StyleSheet.absoluteFill} />
            <LinearGradient
              colors={['rgba(255,140,0,0.25)', 'rgba(255,80,0,0.15)', 'rgba(255,40,0,0.1)']}
              style={styles.sideBtnCircle}
              pointerEvents="none"
            >
              <Text style={styles.sideBtnEmoji}>🕺</Text>
            </LinearGradient>
            <Text style={styles.sideBtnLabel} pointerEvents="none">Emotes</Text>
          </View>

          {/* Character on stage */}
          <View style={styles.characterStage}>
            <View style={styles.stageGlowOuter} />
            <View style={styles.stageGlowInner} />
            <StageSparkles />

            <BreathingView intensity={0.015} speed={4000}>
            <Pressable onPress={handleCharacterTap}>
              {showTapHint && (
                <Animated.View style={[styles.tapHintBubble, { opacity: tapHintOpacity }]}>
                  <Text style={styles.tapHintText}>Tap me!</Text>
                  <View style={styles.tapHintArrow} />
                </Animated.View>
              )}
              {FEATURES.character3D ? (
                <Character3DWrapper />
              ) : (
                <AnimatedCharacter
                  size={320}
                  emote={emote}
                  selectedIdle={equippedIdle as IdleVariantId | null}
                  onEmoteComplete={clearEmote}
                />
              )}
            </Pressable>
            </BreathingView>
            {equippedPet && (
              <Pressable onPress={handlePetTap} style={styles.petPosition}>
                <Animated.View style={{ transform: [{ scale: petBounce }] }}>
                  <PetDisplay petId={equippedPet} size={80} isIdle={!emote} />
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

            {/* CUSTOMIZE button (only when 3D is enabled) */}
            {FEATURES.character3D && (
              <Pressable
                onPress={() => { haptics.tap(); navigateTo('Character3DCreator'); }}
                style={{
                  position: 'absolute',
                  bottom: -10,
                  alignSelf: 'center',
                  backgroundColor: 'rgba(255,140,0,0.18)',
                  borderWidth: 1.5,
                  borderColor: 'rgba(255,140,0,0.5)',
                  borderRadius: 20,
                  paddingHorizontal: 18,
                  paddingVertical: 7,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  zIndex: 20,
                }}
              >
                <Text style={{ fontSize: 14 }}>✨</Text>
                <Text style={{
                  fontFamily: fonts.body,
                  fontWeight: weight.bold,
                  fontSize: 12,
                  color: colors.orange,
                  letterSpacing: 1.5,
                }}>CUSTOMIZE</Text>
              </Pressable>
            )}
          </View>

          {/* Idles button (right) — opens unified picker on Idles tab */}
          <View
            style={styles.sideBtn}
            {...(Platform.OS === 'web' ? { onClick: () => { haptics.tap(); setAnimPickerTab('idles'); setAnimPickerOpen(true); }, style: [styles.sideBtn, { cursor: 'pointer' }] } as any : {})}
          >
            <Pressable onPress={() => { haptics.tap(); setAnimPickerTab('idles'); setAnimPickerOpen(true); }} style={StyleSheet.absoluteFill} />
            <LinearGradient
              colors={['rgba(80,140,255,0.25)', 'rgba(60,100,255,0.15)', 'rgba(40,80,255,0.1)']}
              style={styles.sideBtnCircle}
              pointerEvents="none"
            >
              <Text style={styles.sideBtnEmoji}>💫</Text>
            </LinearGradient>
            <Text style={styles.sideBtnLabel} pointerEvents="none">Idles</Text>
          </View>
        </View>

        {/* v1: Roster/Customize links removed — characters now live in
            the Collection tab (bottom nav). Keeping the spacer for layout. */}
        <View style={{ height: 8 }} />

        {/* ═══ MENU BUTTONS ═══ */}
        <View style={styles.menuButtons}>
          <SlideReveal from="bottom" delay={0}>
            <PressScaleView onPress={() => navigateTo('Play')}>
              <GlossyButton
                label={winStreak > 0 ? `PLAY  🔥${winStreak}` : 'PLAY'}
                subtitle={aiGameCount > 0 ? `${aiGameCount} game${aiGameCount !== 1 ? 's' : ''} played` : 'vs AI · Easy, Medium, Hard'}
                variant="orange"
                small
                icon="🎮"
                iconRight="›"
                onPress={() => navigateTo('Play')}
              />
            </PressScaleView>
          </SlideReveal>
          <SlideReveal from="bottom" delay={80}>
            <PressScaleView onPress={() => navigateTo('CareerMap')}>
              <GlossyButton
                label="CAREER"
                subtitle={careerCompletedCount > 0 ? `${careerCompletedCount}/${totalCareerLevels} levels` : 'Take the City · 3 launch cities'}
                variant="purple"
                small
                icon="🏆"
                iconRight="›"
                onPress={() => navigateTo('CareerMap')}
              />
            </PressScaleView>
          </SlideReveal>
          {FEATURES.onlineMultiplayer && (
            <PressScaleView onPress={() => navigateTo('Multiplayer')}>
              <GlossyButton
                label="MULTIPLAYER"
                subtitle="Ranked · Wager Courts · Online"
                variant="teal"
                small
                iconRight="›"
                onPress={() => navigateTo('Multiplayer')}
              />
            </PressScaleView>
          )}
          {false && (
            // Deprecated "Coming Soon" placeholder — kept in source as a
            // reference for when multiplayer ships. Do not re-enable until
            // FEATURES.onlineMultiplayer is true AND the screen is tested.
            <PressScaleView onPress={() => { haptics.tap(); }}>
              <View style={{ position: 'relative' }}><GlossyButton label="MULTIPLAYER" subtitle="Coming Soon" variant="teal" small iconRight="›" onPress={() => {}} disabled /></View>
            </PressScaleView>
          )}
          {/* Local play — pass and play, available in v1 */}
          <SlideReveal from="bottom" delay={160}>
            <PressScaleView onPress={() => navigateTo('LocalPlay')}>
              <GlossyButton
                label="LOCAL PLAY"
                subtitle="Pass & play on one device"
                variant="teal"
                small
                icon="👥"
                iconRight="›"
                onPress={() => navigateTo('LocalPlay')}
              />
            </PressScaleView>
          </SlideReveal>
        </View>

        {/* Unified Animation Picker — Emotes + Idles in one modal */}
        <AnimationPicker
          visible={animPickerOpen}
          onClose={() => setAnimPickerOpen(false)}
          initialTab={animPickerTab}
        />

        {/* Legacy modals kept for deep link / programmatic access */}
        <EmoteShowcase
          visible={showcaseOpen}
          onClose={() => setShowcaseOpen(false)}
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
  },
  // Status bar
  statusBar: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    gap: 6,
    marginTop: 4,
  },
  statusPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  statusIcon: { fontSize: 14 },
  statusLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 10,
    color: '#ffffff',
  },
  progressBarSmall: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFillSmall: {
    height: '100%',
    backgroundColor: '#9b59b6',
    borderRadius: 2,
  },
  statusValue: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 11,
    color: '#9b59b6',
  },
  challengeBadge: {
    marginLeft: 'auto',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeNum: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 11,
    color: '#ffffff',
  },
  // Logo
  logoArea: {
    alignItems: 'center',
    height: 60,
    justifyContent: 'center',
    marginTop: 2,
    marginBottom: 4,
    zIndex: 20,
    position: 'relative',
  },
  logoGlowHalo: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: 300,
    height: 56,
    borderRadius: 30,
    backgroundColor: 'rgba(255,140,0,0.2)',
    marginLeft: -150,
    marginTop: -28,
    transform: [{ scaleY: 0.75 }],
  },
  // Decorative horizontal flares flanking the text
  logoFlareRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    height: 3,
    marginTop: -1.5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoFlareLeft: {
    flex: 1,
    height: 2,
    borderRadius: 1,
  },
  logoFlareSpacer: {
    width: 200,   // reserved empty space where the text sits
  },
  logoFlareRight: {
    flex: 1,
    height: 2,
    borderRadius: 1,
  },
  // Main logo text — bright white DROP with an orange 4
  logoMain: {
    fontFamily: fonts.heading,
    fontWeight: weight.black,
    fontSize: 42,
    color: '#ffffff',
    textShadowColor: 'rgba(120,180,255,0.9)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
    letterSpacing: 4,
  },
  logo4: {
    color: '#ff9a1a',
    fontSize: 52,
    textShadowColor: 'rgba(255,140,0,0.95)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 22,
  },
  // Small orange triangle accent above the "4"
  logoTick: {
    position: 'absolute',
    top: 2,
    right: '29%',
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 7,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#ff9a1a',
    opacity: 0.85,
  },
  comingSoonBadge: {
    position: 'absolute',
    top: -4,
    right: 12,
    backgroundColor: 'rgba(155,89,182,0.9)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    shadowColor: '#9b59b6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 6,
  },
  comingSoonText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 9,
    color: '#ffffff',
    letterSpacing: 1,
  },
  seasonCountdown: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 11,
    color: 'rgba(155,89,182,0.7)',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  seasonRewardPreview: {
    marginTop: 4,
    backgroundColor: 'rgba(155,89,182,0.1)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(155,89,182,0.2)',
    alignItems: 'center',
  },
  seasonRewardText: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 10,
    color: 'rgba(200,160,240,0.85)',
    letterSpacing: 0.3,
  },
  seasonRewardProgress: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 9,
    color: 'rgba(155,89,182,0.9)',
    marginTop: 1,
  },
  logoSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 0,
  },
  logoTagline: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 13,
    color: 'rgba(200,220,255,0.5)',
    letterSpacing: 3,
  },
  homeTitleBadge: {
    marginTop: 4,
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  homeTitleText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
  },
  onlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#27ae3d',
    shadowColor: '#27ae3d',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 2,
  },
  onlineText: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 10,
    color: 'rgba(39,174,61,0.7)',
    letterSpacing: 0.5,
  },
  // Character lobby
  lobbyArea: {
    flex: 1,
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
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    shadowColor: 'rgba(255,140,0,0.4)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
  sideBtnEmoji: {
    fontSize: 26,
  },
  sideBtnLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 0.5,
  },
  characterStage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingTop: 0,
  },
  stageGlowOuter: {
    width: 300,
    height: 300,
    borderRadius: 150,
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(100,180,255,0.08)',
    backgroundColor: 'rgba(80,140,255,0.03)',
  },
  stageGlowInner: {
    width: 230,
    height: 230,
    borderRadius: 115,
    position: 'absolute',
    bottom: 70,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: 'rgba(100,180,255,0.12)',
    backgroundColor: 'rgba(80,140,255,0.04)',
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
  // News banner
  newsBanner: {
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 6,
  },
  newsCard: {
    width: 105,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
    gap: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  newsEmoji: {
    fontSize: 18,
  },
  newsText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 10,
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  // Customize link under character
  characterLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 4,
  },
  customizeLink: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  customizeLinkText: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 12,
    color: 'rgba(200,220,255,0.45)',
    letterSpacing: 1.5,
  },
  customizeLinkDivider: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 12,
    color: 'rgba(200,220,255,0.25)',
  },
  // Smart suggestion
  smartSuggestion: {
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 5,
    marginBottom: 2,
  },
  smartSuggestionText: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 12,
    color: 'rgba(200,220,255,0.7)',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  // XP Earned Today
  xpTodayText: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 11,
    color: 'rgba(155,89,182,0.8)',
    textAlign: 'center',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  // Pet heart animation
  petHeart: {
    position: 'absolute',
    top: -10,
    alignSelf: 'center',
    fontSize: 22,
    zIndex: 20,
  },
  // Win streak fire banner
  streakBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    alignSelf: 'center',
    backgroundColor: 'rgba(255,100,0,0.12)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 5,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,140,0,0.3)',
  },
  streakFireEmoji: {
    fontSize: 14,
  },
  streakText: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 14,
    color: '#ff8c00',
    textAlign: 'center',
    letterSpacing: 1,
    textShadowColor: 'rgba(255,140,0,0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  // Menu buttons
  menuButtons: {
    paddingHorizontal: 20,
    gap: 6,
    paddingBottom: 8,
  },
  playButtonRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'stretch',
  },
  quickPlayBtn: {
    width: 48,
    backgroundColor: 'rgba(255,140,0,0.2)',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,140,0,0.4)',
  },
  quickPlayIcon: {
    fontSize: 20,
    color: colors.orange,
  },
  // Starter Pack banner
  starterPackBanner: {
    marginHorizontal: 20,
    marginBottom: 6,
    borderRadius: 14,
    overflow: 'hidden',
  },
  starterPackGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(46,204,113,0.35)',
    gap: 10,
  },
  starterPackEmoji: {
    fontSize: 28,
  },
  starterPackInfo: {
    flex: 1,
  },
  starterPackTitle: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 14,
    color: '#2ecc71',
    letterSpacing: 2,
  },
  starterPackDesc: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 11,
    color: 'rgba(200,230,200,0.8)',
    marginTop: 1,
  },
  starterPackClaim: {
    backgroundColor: 'rgba(46,204,113,0.25)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(46,204,113,0.5)',
  },
  starterPackClaimText: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 14,
    color: '#2ecc71',
    letterSpacing: 1,
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
