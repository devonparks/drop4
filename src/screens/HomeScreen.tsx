import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { TopBar } from '../components/ui/TopBar';
import { GlossyButton } from '../components/ui/GlossyButton';
import { AnimatedCharacter, useEmoteTrigger, EMOTE_CATEGORIES, EmoteId, IdleVariantId } from '../components/ui/AnimatedCharacter';
import { EmoteShowcase } from '../components/ui/EmoteShowcase';
import { IdlePicker } from '../components/ui/IdlePicker';
import { useShopStore } from '../stores/shopStore';
import { useSeasonStore } from '../stores/seasonStore';
import { useChallengeStore } from '../stores/challengeStore';
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

export function HomeScreen() {
  const navigation = useNavigation<any>();
  const coins = useShopStore(s => s.coins);
  const gems = useShopStore(s => s.gems);
  const level = useShopStore(s => s.level);
  const currentTier = useSeasonStore(s => s.currentTier);
  const maxTier = useSeasonStore(s => s.maxTier);
  const seasonName = useSeasonStore(s => s.seasonName);
  const challenges = useChallengeStore(s => s.challenges);
  const equippedIdle = useShopStore(s => s.equippedIdle);
  const canSpin = useDailySpinStore(s => s.canSpin);
  const hasSeenTip = useTutorialStore(s => s.hasSeenTip);
  const seenTips = useTutorialStore(s => s.seenTips); // subscribe to seenTips so re-renders reflect markTipSeen
  const { emote, triggerEmote, clearEmote } = useEmoteTrigger();
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

  // Show tutorial on first visit
  const homeTip = getTipById('home_tap_character')!;
  useEffect(() => {
    if (!hasSeenTip('home_tap_character')) {
      const timer = setTimeout(() => setShowTutorial(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  // "Tap me!" tooltip — subtle hint that character is tappable
  const [showTapHint, setShowTapHint] = useState(false);
  const tapHintCountRef = useRef(0);
  const tapHintOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const interval = setInterval(() => {
      // Only show if no emote is playing and we haven't shown 3 times yet
      if (!emote && tapHintCountRef.current < 3) {
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
    return () => clearInterval(interval);
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
        <TopBar
          coins={coins} gems={gems} level={level}
          onProfilePress={() => navigation.navigate('MainTabs', { screen: 'Profile' } as any)}
          onSettingsPress={() => navigateTo('Settings')}
          onCoinPress={() => navigation.navigate('MainTabs', { screen: 'Shop' } as any)}
          onGemPress={() => navigation.navigate('MainTabs', { screen: 'Shop' } as any)}
        />

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

        {/* Version */}
        <Text style={styles.version}>v1.0.0</Text>

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
  logoTagline: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 13,
    color: 'rgba(200,220,255,0.5)',
    letterSpacing: 3,
    marginTop: 0,
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
  // Version
  version: {
    fontFamily: fonts.body,
    fontWeight: weight.medium,
    fontSize: 10,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
});
