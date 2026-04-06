import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, ScrollView } from 'react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { TopBar } from '../components/ui/TopBar';
import { GlossyButton } from '../components/ui/GlossyButton';
import { AnimatedCharacter, useEmoteTrigger, EMOTE_CATEGORIES, EmoteId, IdleVariantId } from '../components/ui/AnimatedCharacter';
import { EmoteShowcase } from '../components/ui/EmoteShowcase';
import { IdlePicker } from '../components/ui/IdlePicker';
import { useShopStore } from '../stores/shopStore';
import { useDailySpinStore } from '../stores/dailySpinStore';
import { useTutorialStore } from '../stores/tutorialStore';
import { DailySpinWheel } from '../components/ui/DailySpinWheel';
import { TutorialTooltip } from '../components/ui/TutorialTooltip';
import { getTipById } from '../data/tutorials';
import { haptics } from '../services/haptics';
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
function PressScaleView({ children, onPress }: { children: React.ReactNode; onPress: () => void }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    haptics.tap();
    Animated.spring(scaleAnim, { toValue: 0.96, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 8 }).start();
  };

  return (
    <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut} onPress={onPress}>
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        {children}
      </Animated.View>
    </Pressable>
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
  const canSpin = useDailySpinStore(s => s.canSpin);
  const hasSeenTip = useTutorialStore(s => s.hasSeenTip);
  const seenTips = useTutorialStore(s => s.seenTips); // subscribe to seenTips so re-renders reflect markTipSeen
  const justLeveledUp = useShopStore(s => s.justLeveledUp);
  const clearLevelUp = useShopStore(s => s.clearLevelUp);
  const { emote, triggerEmote, clearEmote } = useEmoteTrigger();

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
  const [idlePickerOpen, setIdlePickerOpen] = useState(false);
  const [spinWheelOpen, setSpinWheelOpen] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

  // FREE SPIN text pulse when spin is available
  const spinPulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (canSpin()) {
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
  }, [canSpin()]);

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

  // All non-idle emotes for random idle tap
  const allEmoteIds: EmoteId[] = EMOTE_CATEGORIES.flatMap(c => c.emotes);
  const handleCharacterTap = () => {
    haptics.tap();
    // Hide tooltip immediately on tap
    setShowTapHint(false);
    tapHintOpacity.setValue(0);
    const randomEmote = allEmoteIds[Math.floor(Math.random() * allEmoteIds.length)];
    triggerEmote(randomEmote);
  };

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

        {/* ═══ DROP4 LOGO ═══ */}
        <View style={styles.logoArea}>
          <Text style={styles.logoMain}>
            DROP<Text style={styles.logo4}>4</Text>
          </Text>
          <Text style={styles.logoTagline}>Stack. Connect. Dominate.</Text>
        </View>

        {/* Season & Challenges moved to tab bar — more room for character */}

        {/* ═══ CHARACTER LOBBY ═══ */}
        <View style={styles.lobbyArea}>
          {/* Emotes button (left) */}
          <Pressable onPress={() => { haptics.tap(); setShowcaseOpen(true); }} style={styles.sideBtn}>
            <LinearGradient
              colors={['rgba(255,140,0,0.25)', 'rgba(255,80,0,0.15)', 'rgba(255,40,0,0.1)']}
              style={styles.sideBtnCircle}
            >
              <Text style={styles.sideBtnEmoji}>🕺</Text>
            </LinearGradient>
            <Text style={styles.sideBtnLabel}>Emotes</Text>
          </Pressable>

          {/* Character on stage */}
          <View style={styles.characterStage}>
            {/* Glow rings behind character (Fortnite-style platform) */}
            <View style={styles.stageGlowOuter} />
            <View style={styles.stageGlowInner} />

            {/* Floating sparkle particles around stage */}
            <StageSparkles />

            <Pressable onPress={handleCharacterTap}>
              {/* "Tap me!" tooltip */}
              {showTapHint && (
                <Animated.View style={[styles.tapHintBubble, { opacity: tapHintOpacity }]}>
                  <Text style={styles.tapHintText}>Tap me!</Text>
                  <View style={styles.tapHintArrow} />
                </Animated.View>
              )}
              <AnimatedCharacter
                size={320}
                emote={emote}
                selectedIdle={equippedIdle as IdleVariantId | null}
                onEmoteComplete={clearEmote}
              />
            </Pressable>
            {/* Stage platform glow */}
            <LinearGradient
              colors={['rgba(100,180,255,0.3)', 'rgba(80,140,255,0.12)', 'transparent']}
              style={styles.stagePlatform}
            />
            {/* Stage outer ring */}
            <View style={styles.stageRing} />
          </View>

          {/* Idles button (right) */}
          <Pressable onPress={() => { haptics.tap(); setIdlePickerOpen(true); }} style={styles.sideBtn}>
            <LinearGradient
              colors={['rgba(80,140,255,0.25)', 'rgba(60,100,255,0.15)', 'rgba(40,80,255,0.1)']}
              style={styles.sideBtnCircle}
            >
              <Text style={styles.sideBtnEmoji}>💫</Text>
            </LinearGradient>
            <Text style={styles.sideBtnLabel}>Idles</Text>
          </Pressable>
        </View>

        {/* News banner removed — character is the focus. News accessible via tabs.
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.newsBanner}
        >
          {NEWS_ITEMS.map(item => (
            <NewsCard
              key={item.id}
              item={item}
              onPress={() => {
                haptics.tap();
                if (item.screen) {
                  navigateTo(item.screen);
                } else if (item.id === 'spin') {
                  setSpinWheelOpen(true);
                }
              }}
            />
          ))}
        </ScrollView>
        */}

        {/* Quick action buttons */}
        <View style={styles.quickActions}>
          <Pressable onPress={() => { haptics.tap(); navigateTo('CharacterCreator'); }} style={styles.customizeBtn}>
            <Text style={styles.customizeText}>Customize</Text>
          </Pressable>
          <Pressable
            onPress={() => { haptics.tap(); setSpinWheelOpen(true); }}
            style={[styles.freeSpinBtn, !canSpin() && { opacity: 0.5 }]}
          >
            <Animated.Text style={[styles.freeSpinText, canSpin() && { opacity: spinPulse }]}>FREE SPIN</Animated.Text>
            {canSpin() && <View style={styles.freeSpinBadge} />}
          </Pressable>
          <Pressable onPress={() => { haptics.tap(); navigateTo('PartyLobby'); }} style={styles.friendsBtn}>
            <Text style={styles.friendsBtnText}>Party</Text>
          </Pressable>
        </View>

        {/* ═══ MENU BUTTONS ═══ */}
        <View style={styles.menuButtons}>
          <PressScaleView onPress={() => navigateTo('Play')}>
            <GlossyButton
              label="PLAY"
              subtitle="Quick Match"
              variant="orange"
              small
              iconRight="›"
              onPress={() => navigateTo('Play')}
            />
          </PressScaleView>
          <PressScaleView onPress={() => navigateTo('Career')}>
            <GlossyButton
              label="CAREER"
              subtitle="Progress & Unlocks"
              variant="purple"
              small
              iconRight="›"
              onPress={() => navigateTo('Career')}
            />
          </PressScaleView>
          <PressScaleView onPress={() => navigateTo('Multiplayer')}>
            <GlossyButton
              label="MULTIPLAYER"
              subtitle="Wager & Compete"
              variant="teal"
              small
              iconRight="›"
              onPress={() => navigateTo('Multiplayer')}
            />
          </PressScaleView>
        </View>

        {/* Emote Showcase Modal */}
        <EmoteShowcase
          visible={showcaseOpen}
          onClose={() => setShowcaseOpen(false)}
        />

        {/* Idle Picker Modal */}
        <IdlePicker
          visible={idlePickerOpen}
          onClose={() => setIdlePickerOpen(false)}
        />

        {/* Daily Spin Wheel */}
        <DailySpinWheel
          visible={spinWheelOpen}
          onClose={() => setSpinWheelOpen(false)}
        />

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
    marginTop: -6,
    marginBottom: -2,
  },
  logoMain: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 44,
    color: '#ffffff',
    textShadowColor: 'rgba(80,120,255,0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
    letterSpacing: 3,
  },
  logo4: {
    color: '#ff8c00',
    fontSize: 56,
    textShadowColor: 'rgba(255,140,0,0.7)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 25,
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
    paddingTop: 30,
  },
  stageGlowOuter: {
    width: 300,
    height: 300,
    borderRadius: 150,
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(100,180,255,0.08)',
    backgroundColor: 'rgba(80,140,255,0.03)',
  },
  stageGlowInner: {
    width: 220,
    height: 220,
    borderRadius: 110,
    position: 'absolute',
    bottom: 80,
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
  // Quick action buttons
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 6,
  },
  customizeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(100,180,255,0.12)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(100,180,255,0.3)',
  },
  customizeText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 12,
    color: 'rgba(200,230,255,0.9)',
    letterSpacing: 0.5,
  },
  friendsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,140,0,0.12)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,140,0,0.3)',
  },
  friendsBtnText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 12,
    color: 'rgba(255,200,130,0.9)',
    letterSpacing: 0.5,
  },
  freeSpinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(241,196,15,0.12)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(241,196,15,0.3)',
    position: 'relative',
  },
  freeSpinText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 11,
    color: 'rgba(241,196,15,0.9)',
    letterSpacing: 0.5,
  },
  freeSpinBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e74c3c',
    borderWidth: 1.5,
    borderColor: '#0a0e27',
  },
  // Menu buttons
  menuButtons: {
    paddingHorizontal: 20,
    gap: 6,
    paddingBottom: 8,
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
