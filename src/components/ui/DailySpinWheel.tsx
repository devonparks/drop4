import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useDailySpinStore, SPIN_SEGMENTS, SpinSegment } from '../../stores/dailySpinStore';
import { useShopStore } from '../../stores/shopStore';
import { useLootBoxStore } from '../../stores/lootBoxStore';
import { PETS } from '../../data/pets';
import { haptics } from '../../services/haptics';
import { playSound } from '../../services/audio';
import { colors } from '../../theme/colors';
import { fonts, weight } from '../../theme/typography';

const { width: SCREEN_W } = Dimensions.get('window');
const WHEEL_SIZE = Math.min(280, SCREEN_W * 0.72);
const SEGMENT_COUNT = SPIN_SEGMENTS.length;
const SEGMENT_ANGLE = 360 / SEGMENT_COUNT;

// Vibrant segment colors (Basketball Stars style)
const VIBRANT_COLORS: { bg: string; border: string }[] = [
  { bg: '#e74c3c', border: '#ff6b5a' },  // bright red
  { bg: '#27ae3d', border: '#34c94d' },  // green
  { bg: '#2980b9', border: '#3498db' },  // blue
  { bg: '#e84393', border: '#fd79a8' },  // pink
  { bg: '#f39c12', border: '#f4d03f' },  // orange
  { bg: '#8e44ad', border: '#a569bd' },  // purple
  { bg: '#1abc9c', border: '#2dd4ad' },  // teal
  { bg: '#d4ac0d', border: '#f1c40f' },  // gold
  { bg: '#e67e22', border: '#f5a623' },  // warm orange (pet)
];

interface DailySpinWheelProps {
  visible: boolean;
  onClose: () => void;
}

function getTimeUntilMidnight(): string {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setDate(midnight.getDate() + 1);
  midnight.setHours(0, 0, 0, 0);
  const diff = midnight.getTime() - now.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function getRarityGlow(rarity: SpinSegment['rarity']): string {
  switch (rarity) {
    case 'common': return 'rgba(255,255,255,0.3)';
    case 'uncommon': return 'rgba(39,174,61,0.6)';
    case 'rare': return 'rgba(52,152,219,0.6)';
    case 'epic': return 'rgba(155,89,182,0.6)';
    case 'legendary': return 'rgba(241,196,15,0.8)';
  }
}

function getRarityLabel(rarity: SpinSegment['rarity']): string {
  switch (rarity) {
    case 'common': return 'COMMON';
    case 'uncommon': return 'UNCOMMON';
    case 'rare': return 'RARE';
    case 'epic': return 'EPIC';
    case 'legendary': return 'LEGENDARY';
  }
}

export function DailySpinWheel({ visible, onClose }: DailySpinWheelProps) {
  const lastSpinDate = useDailySpinStore(s => s.lastSpinDate);
  const pickReward = useDailySpinStore(s => s.pickReward);
  const pickGoldenReward = useDailySpinStore(s => s.pickGoldenReward);
  const recordSpin = useDailySpinStore(s => s.recordSpin);
  const addCoins = useShopStore(s => s.addCoins);
  const addGems = useShopStore(s => s.addGems);
  const spendGems = useShopStore(s => s.spendGems);
  const gems = useShopStore(s => s.gems);
  const addBox = useLootBoxStore(s => s.addBox);

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const canSpin = lastSpinDate !== todayStr;

  const [spinning, setSpinning] = useState(false);
  const [resultSegment, setResultSegment] = useState<SpinSegment | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [countdown, setCountdown] = useState('');
  const [showGoldenSpin, setShowGoldenSpin] = useState(false);

  const spinAnim = useRef(new Animated.Value(0)).current;
  const resultScaleAnim = useRef(new Animated.Value(0)).current;
  const resultOpacityAnim = useRef(new Animated.Value(0)).current;
  const glowPulse = useRef(new Animated.Value(0)).current;
  const starburstAnim = useRef(new Animated.Value(0)).current;
  const lightDotsAnim = useRef(new Animated.Value(0)).current;

  // Starburst rotation
  useEffect(() => {
    if (!visible) return;
    const anim = Animated.loop(
      Animated.timing(starburstAnim, { toValue: 1, duration: 30000, easing: Easing.linear, useNativeDriver: true })
    );
    anim.start();
    return () => anim.stop();
  }, [visible]);

  // Light dots pulsing
  useEffect(() => {
    if (!visible) return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(lightDotsAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(lightDotsAnim, { toValue: 0.3, duration: 600, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [visible]);

  // Countdown timer
  useEffect(() => {
    if (!visible) return;
    if (canSpin) { setCountdown(''); return; }
    const update = () => setCountdown(getTimeUntilMidnight());
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [visible, canSpin]);

  // Glow pulse for result
  useEffect(() => {
    if (!showResult) return;
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(glowPulse, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [showResult]);

  const handleSpin = () => {
    if (spinning || !canSpin) return;
    haptics.tap();
    playSound('click');
    setSpinning(true);
    setShowResult(false);
    setResultSegment(null);

    const winIndex = pickReward();
    const segment = SPIN_SEGMENTS[winIndex];
    const fullRotations = 3 + Math.floor(Math.random() * 3);
    const targetAngle = -(winIndex * SEGMENT_ANGLE + SEGMENT_ANGLE / 2 + Math.random() * (SEGMENT_ANGLE * 0.4) - SEGMENT_ANGLE * 0.2);
    const totalDegrees = fullRotations * 360 + targetAngle;

    spinAnim.setValue(0);
    Animated.timing(spinAnim, {
      toValue: totalDegrees,
      duration: 3000,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      haptics.heavy();
      setResultSegment(segment);
      recordSpin();

      setTimeout(() => {
        setShowResult(true);
        resultScaleAnim.setValue(0);
        resultOpacityAnim.setValue(0);
        Animated.parallel([
          Animated.spring(resultScaleAnim, { toValue: 1, useNativeDriver: true, speed: 12, bounciness: 10 }),
          Animated.timing(resultOpacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        ]).start();
        try { playSound('level_up'); } catch {}
      }, 300);
    });
  };

  const handleGoldenSpin = () => {
    if (spinning) return;
    if (!spendGems(50)) {
      haptics.error(); playSound('error');
      return;
    }
    haptics.tap();
    playSound('click');
    setSpinning(true);
    setShowResult(false);
    setResultSegment(null);
    setShowGoldenSpin(false);

    const winIndex = pickGoldenReward();
    const segment = SPIN_SEGMENTS[winIndex];
    const fullRotations = 4 + Math.floor(Math.random() * 3);
    const targetAngle = -(winIndex * SEGMENT_ANGLE + SEGMENT_ANGLE / 2 + Math.random() * (SEGMENT_ANGLE * 0.4) - SEGMENT_ANGLE * 0.2);
    const totalDegrees = fullRotations * 360 + targetAngle;

    spinAnim.setValue(0);
    Animated.timing(spinAnim, {
      toValue: totalDegrees,
      duration: 3500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      haptics.heavy();
      setResultSegment(segment);
      // Golden spin does NOT consume the daily spin

      setTimeout(() => {
        setShowResult(true);
        resultScaleAnim.setValue(0);
        resultOpacityAnim.setValue(0);
        Animated.parallel([
          Animated.spring(resultScaleAnim, { toValue: 1, useNativeDriver: true, speed: 12, bounciness: 10 }),
          Animated.timing(resultOpacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        ]).start();
        try { playSound('level_up'); } catch {}
      }, 300);
    });
  };

  const handleCollect = () => {
    if (!resultSegment) return;
    haptics.heavy();
    if (resultSegment.rewardType === 'coins') addCoins(resultSegment.amount);
    else if (resultSegment.rewardType === 'gems') addGems(resultSegment.amount);
    else if (resultSegment.rewardType === 'lootbox') addBox('bronze_box');
    else if (resultSegment.rewardType === 'pet') {
      const shopState = useShopStore.getState();
      const commonPets = PETS.filter(p => p.rarity === 'common');
      const unownedCommon = commonPets.filter(p => !shopState.ownedPets.includes(p.id));
      if (unownedCommon.length > 0) {
        const pick = unownedCommon[Math.floor(Math.random() * unownedCommon.length)];
        shopState.purchasePet(pick.id, 0); // free grant — cost 0
      } else {
        addCoins(500); // fallback: all common pets owned
      }
    }
    try { playSound('coin'); } catch {}
    setSpinning(false);
    setShowResult(false);
    setResultSegment(null);
    setShowGoldenSpin(true);
  };

  const handleClose = () => {
    if (spinning && !showResult) return;
    haptics.tap();
    playSound('click');
    setSpinning(false);
    setShowResult(false);
    setResultSegment(null);
    setShowGoldenSpin(false);
    onClose();
  };

  const spinRotation = spinAnim.interpolate({
    inputRange: [-36000, 36000],
    outputRange: ['-36000deg', '36000deg'],
  });

  const starburstRotation = starburstAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const isSpinAvailable = canSpin;

  // Generate light dots around the wheel
  const lightDots = Array.from({ length: 20 }, (_, i) => {
    const angle = (i / 20) * 360;
    const rad = (angle * Math.PI) / 180;
    const radius = WHEEL_SIZE / 2 + 14;
    return {
      left: Math.cos(rad) * radius + WHEEL_SIZE / 2 + 6,
      top: Math.sin(rad) * radius + WHEEL_SIZE / 2 + 6,
    };
  });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={st.overlay}>
        {/* Purple starburst background */}
        <View style={st.starburstContainer}>
          <Animated.View style={[st.starburst, { transform: [{ rotate: starburstRotation }] }]}>
            {Array.from({ length: 16 }).map((_, i) => (
              <View
                key={i}
                style={[st.starburstRay, {
                  transform: [{ rotate: `${(i / 16) * 360}deg` }],
                  opacity: i % 2 === 0 ? 0.15 : 0.08,
                }]}
              />
            ))}
          </Animated.View>
        </View>

        <View style={st.container}>
          {/* ── SPIN & WIN Header Banner ── */}
          <View style={st.headerBanner}>
            <LinearGradient
              colors={['#7b2ff7', '#4a00e0', '#8e2de2']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={st.headerGradient}
            >
              <View style={st.headerNeonBorder} />
              <Text style={st.headerTitle} accessibilityRole="header">SPIN & WIN</Text>
              <Text style={st.headerSub}>Spin the wheel for free rewards!</Text>
            </LinearGradient>
          </View>

          {/* ── FREE DAILY Ribbon ── */}
          <View style={st.freeRibbon}>
            <LinearGradient colors={['#00d2ff', '#3a7bd5']} style={st.freeRibbonInner}>
              <Text style={st.freeRibbonText}>FREE{'\n'}DAILY</Text>
            </LinearGradient>
          </View>

          {/* Close button */}
          {(!spinning || showResult) && (
            <Pressable
              style={st.closeBtn}
              onPress={handleClose}
              accessibilityRole="button"
              accessibilityLabel="Close daily spin"
            >
              <Text style={st.closeBtnText}>{'\u2715'}</Text>
            </Pressable>
          )}

          {/* ── Wheel container ── */}
          <View style={st.wheelContainer}>
            {/* Light dots around wheel */}
            {lightDots.map((dot, i) => (
              <Animated.View
                key={i}
                style={[st.lightDot, {
                  left: dot.left - 4,
                  top: dot.top - 4,
                  opacity: lightDotsAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: i % 2 === 0 ? [0.3, 1] : [1, 0.3],
                  }),
                  backgroundColor: i % 3 === 0 ? '#00d2ff' : i % 3 === 1 ? '#ff8c00' : '#fff',
                }]}
              />
            ))}

            {/* Pointer */}
            <View style={st.pointer}>
              <View style={st.pointerTriangle} />
              <View style={st.pointerShadow} />
            </View>

            {/* The wheel */}
            <Animated.View
              style={[st.wheel, { transform: [{ rotate: spinRotation }] }]}
            >
              {/* Cyan metallic frame */}
              <View style={st.wheelFrame} />

              {SPIN_SEGMENTS.map((seg, index) => {
                const rotation = index * SEGMENT_ANGLE;
                const vc = VIBRANT_COLORS[index % VIBRANT_COLORS.length];
                return (
                  <View
                    key={seg.id}
                    style={[st.segment, {
                      transform: [
                        { rotate: `${rotation}deg` },
                        { translateY: -WHEEL_SIZE / 2 },
                      ],
                      backgroundColor: vc.bg,
                      borderColor: vc.border,
                    }]}
                  >
                    <View style={st.segmentContent}>
                      <Text style={st.segmentEmoji}>{seg.emoji}</Text>
                      <Text style={st.segmentLabel} numberOfLines={1}>{seg.label}</Text>
                    </View>
                  </View>
                );
              })}

              {/* Center button */}
              <View style={st.wheelCenter}>
                <LinearGradient colors={['#ffffff', '#e0e0e0', '#c0c0c0']} style={st.wheelCenterGradient}>
                  <Text style={st.wheelCenterText}>SPIN{'\n'}FREE</Text>
                </LinearGradient>
              </View>
            </Animated.View>

            {/* Outer glow ring */}
            <View style={st.wheelGlow} />
          </View>

          {/* ── Bottom text ── */}
          <Text style={st.bottomInfo}>Win up to 1,000 coins! Come back every day for a Free Spin!</Text>

          {/* ── Spin button / countdown ── */}
          {!showGoldenSpin && isSpinAvailable && !showResult ? (
            <Pressable
              onPress={handleSpin}
              disabled={spinning}
              style={[st.spinBtn, spinning && { opacity: 0.5 }]}
              accessibilityRole="button"
              accessibilityLabel={spinning ? 'Spinning' : 'Spin free daily wheel'}
              accessibilityState={{ disabled: spinning, busy: spinning }}
            >
              <LinearGradient
                colors={spinning ? ['#666', '#555'] : ['#00d2ff', '#0098d6', '#006ea0']}
                style={st.spinBtnGradient}
              >
                <Text style={st.spinBtnText}>{spinning ? 'SPINNING...' : 'SPIN FREE!'}</Text>
              </LinearGradient>
            </Pressable>
          ) : !showGoldenSpin && !isSpinAvailable && !showResult ? (
            <View style={st.countdownArea}>
              <Text style={st.countdownLabel}>Come back tomorrow!</Text>
              <Text style={st.countdownTime}>{countdown}</Text>
            </View>
          ) : null}

          {/* ── Golden Spin section ── */}
          {showGoldenSpin && !showResult && (
            <Animated.View style={st.goldenSpinSection}>
              <View style={st.goldenDivider}>
                <View style={st.goldenDividerLine} />
                <Text style={st.goldenDividerText}>OR</Text>
                <View style={st.goldenDividerLine} />
              </View>
              <LinearGradient colors={['rgba(241,196,15,0.15)', 'rgba(241,196,15,0.03)']} style={st.goldenCard}>
                <View style={st.goldenHeader}>
                  <Text style={st.goldenTitle} accessibilityRole="header">{'\u2728'} GOLDEN SPIN</Text>
                  <View style={st.goldenBadge}>
                    <Text style={st.goldenBadgeText}>10x PRIZES</Text>
                  </View>
                </View>
                <Text style={st.goldenSub}>Legendary-weighted prizes!</Text>
                <View style={st.goldenBtns}>
                  <Pressable
                    style={[st.goldenBtn, gems < 50 && { opacity: 0.5 }]}
                    onPress={handleGoldenSpin}
                    accessibilityRole="button"
                    accessibilityLabel="Golden spin for 50 gems"
                    accessibilityState={{ disabled: gems < 50 }}
                  >
                    <LinearGradient colors={['#f1c40f', '#d4ac0d', '#b8960a']} style={st.goldenBtnGradient}>
                      <Text style={st.goldenBtnText}>SPIN 50 {'\u{1F48E}'}</Text>
                      {gems < 50 && <Text style={[st.goldenBtnText, { fontSize: 9, opacity: 0.8 }]}>({gems} gems)</Text>}
                    </LinearGradient>
                  </Pressable>
                  <Pressable
                    style={st.goldenBtn}
                    onPress={() => { haptics.tap(); playSound('click'); }}
                    accessibilityRole="button"
                    accessibilityLabel="Golden spin for 0.99 dollars"
                  >
                    <LinearGradient colors={['#e74c3c', '#c0392b']} style={st.goldenBtnGradient}>
                      <Text style={st.goldenBtnText}>SPIN $0.99</Text>
                    </LinearGradient>
                  </Pressable>
                </View>
              </LinearGradient>
              <Pressable
                onPress={handleClose}
                style={st.goldenSkip}
                accessibilityRole="button"
                accessibilityLabel="Skip golden spin"
              >
                <Text style={st.goldenSkipText}>No thanks</Text>
              </Pressable>
            </Animated.View>
          )}

          {/* ── Result overlay ── */}
          {showResult && resultSegment && (
            <Animated.View
              style={[st.resultCard, {
                opacity: resultOpacityAnim,
                transform: [{ scale: resultScaleAnim }],
              }]}
            >
              <Animated.View style={[st.resultGlow, { opacity: glowPulse }]}>
                <View style={[st.resultGlowInner, { backgroundColor: getRarityGlow(resultSegment.rarity) }]} />
              </Animated.View>
              <Text style={st.resultEmoji}>{resultSegment.emoji}</Text>
              <Text style={[st.resultLabel, {
                color: resultSegment.rarity === 'legendary' ? colors.gold :
                       resultSegment.rarity === 'epic' ? colors.purple :
                       resultSegment.rarity === 'rare' ? '#3498db' :
                       resultSegment.rarity === 'uncommon' ? colors.green : '#fff',
              }]}>{resultSegment.label}</Text>
              <Text style={[st.resultRarity, {
                color: resultSegment.rarity === 'legendary' ? colors.gold :
                       resultSegment.rarity === 'epic' ? colors.purple :
                       resultSegment.rarity === 'rare' ? '#3498db' :
                       resultSegment.rarity === 'uncommon' ? colors.green : colors.textMuted,
              }]}>{getRarityLabel(resultSegment.rarity)}</Text>
              <Pressable
                onPress={handleCollect}
                style={st.collectBtn}
                accessibilityRole="button"
                accessibilityLabel={`Collect ${resultSegment.label}`}
              >
                <LinearGradient colors={['#27ae3d', '#1e8a30']} style={st.collectBtnGradient}>
                  <Text style={st.collectBtnText}>COLLECT</Text>
                </LinearGradient>
              </Pressable>
            </Animated.View>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════
const st = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.9)',
    alignItems: 'center', justifyContent: 'center',
  },

  // ── Starburst background ──
  starburstContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  starburst: {
    width: SCREEN_W * 2, height: SCREEN_W * 2,
    alignItems: 'center', justifyContent: 'center',
  },
  starburstRay: {
    position: 'absolute', width: 0, height: 0,
    borderLeftWidth: SCREEN_W * 0.15,
    borderRightWidth: SCREEN_W * 0.15,
    borderBottomWidth: SCREEN_W,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#7b2ff7',
    transformOrigin: `${SCREEN_W * 0.15}px ${SCREEN_W}px`,
  },

  container: {
    width: '92%', maxWidth: 380,
    backgroundColor: 'rgba(20,10,50,0.95)',
    borderRadius: 24, overflow: 'hidden',
    borderWidth: 2, borderColor: 'rgba(123,47,247,0.5)',
    alignItems: 'center', paddingBottom: 20,
  },

  // ── Header banner ──
  headerBanner: { width: '100%', overflow: 'hidden' },
  headerGradient: {
    paddingVertical: 16, paddingHorizontal: 20, alignItems: 'center',
    position: 'relative',
  },
  headerNeonBorder: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 2,
    backgroundColor: '#00d2ff',
    shadowColor: '#00d2ff', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1, shadowRadius: 8, elevation: 8,
  },
  headerTitle: {
    fontFamily: fonts.heading, fontWeight: weight.bold, fontSize: 32,
    color: '#ffffff', letterSpacing: 3,
    textShadowColor: 'rgba(0,210,255,0.5)', textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  headerSub: {
    fontFamily: fonts.body, fontWeight: weight.medium, fontSize: 12,
    color: 'rgba(255,255,255,0.7)', marginTop: 2,
  },

  // ── Free Daily ribbon ──
  freeRibbon: {
    position: 'absolute', top: 10, right: -20,
    transform: [{ rotate: '30deg' }], zIndex: 20,
  },
  freeRibbonInner: {
    paddingHorizontal: 24, paddingVertical: 4, borderRadius: 2,
  },
  freeRibbonText: {
    fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 8,
    color: '#ffffff', textAlign: 'center', letterSpacing: 1, lineHeight: 11,
  },

  // ── Close ──
  closeBtn: {
    position: 'absolute', top: 12, left: 12,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center', zIndex: 20,
  },
  closeBtnText: { fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 14, color: 'rgba(255,255,255,0.5)' },

  // ── Wheel ──
  wheelContainer: {
    width: WHEEL_SIZE + 32, height: WHEEL_SIZE + 32,
    alignItems: 'center', justifyContent: 'center', marginVertical: 16,
  },
  lightDot: {
    position: 'absolute', width: 8, height: 8, borderRadius: 4,
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 4, elevation: 4,
  },
  pointer: {
    position: 'absolute', top: -2, zIndex: 10, alignItems: 'center',
  },
  pointerTriangle: {
    width: 0, height: 0,
    borderLeftWidth: 14, borderRightWidth: 14, borderTopWidth: 24,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
    borderTopColor: '#00d2ff',
  },
  pointerShadow: {
    position: 'absolute', top: 2,
    width: 0, height: 0,
    borderLeftWidth: 14, borderRightWidth: 14, borderTopWidth: 24,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
    borderTopColor: 'rgba(0,0,0,0.3)',
    zIndex: -1,
  },
  wheel: {
    width: WHEEL_SIZE, height: WHEEL_SIZE,
    borderRadius: WHEEL_SIZE / 2,
    backgroundColor: '#1a0a3a',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 4, borderColor: '#00d2ff',
    overflow: 'hidden',
    shadowColor: '#00d2ff', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6, shadowRadius: 20, elevation: 12,
  },
  wheelFrame: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: WHEEL_SIZE / 2,
    borderWidth: 2, borderColor: 'rgba(0,210,255,0.3)',
  },
  segment: {
    position: 'absolute',
    width: 64, height: WHEEL_SIZE / 2 - 10,
    alignItems: 'center', justifyContent: 'flex-start', paddingTop: 8,
    left: WHEEL_SIZE / 2 - 32, top: WHEEL_SIZE / 2,
    transformOrigin: '32px 0px',
    borderWidth: 1.5,
    borderTopLeftRadius: 6, borderTopRightRadius: 6,
  },
  segmentContent: { alignItems: 'center', gap: 2 },
  segmentEmoji: { fontSize: 20 },
  segmentLabel: {
    fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 7,
    color: '#ffffff', textAlign: 'center', width: 54,
    textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2,
  },
  wheelCenter: {
    width: 52, height: 52, borderRadius: 26,
    overflow: 'hidden', zIndex: 5,
    shadowColor: '#fff', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  wheelCenterGradient: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    borderRadius: 26,
  },
  wheelCenterText: {
    fontFamily: fonts.heading, fontWeight: weight.bold, fontSize: 10,
    color: '#333', letterSpacing: 0.5, textAlign: 'center', lineHeight: 13,
  },
  wheelGlow: {
    position: 'absolute',
    width: WHEEL_SIZE + 20, height: WHEEL_SIZE + 20,
    borderRadius: (WHEEL_SIZE + 20) / 2,
    borderWidth: 2, borderColor: 'rgba(0,210,255,0.15)',
    shadowColor: '#00d2ff', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4, shadowRadius: 24, elevation: 8,
  },

  // ── Bottom info ──
  bottomInfo: {
    fontFamily: fonts.body, fontWeight: weight.medium, fontSize: 11,
    color: '#00d2ff', textAlign: 'center', paddingHorizontal: 24, marginBottom: 8,
  },

  // ── Spin button ──
  spinBtn: { marginTop: 4 },
  spinBtnGradient: {
    paddingHorizontal: 52, paddingVertical: 14, borderRadius: 22,
    shadowColor: '#00d2ff', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6, shadowRadius: 14, elevation: 10,
  },
  spinBtnText: {
    fontFamily: fonts.heading, fontWeight: weight.bold, fontSize: 22,
    color: '#ffffff', letterSpacing: 2,
    textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4,
  },

  // ── Countdown ──
  countdownArea: { alignItems: 'center', marginTop: 4, paddingVertical: 8 },
  countdownLabel: { fontFamily: fonts.body, fontWeight: weight.semibold, fontSize: 14, color: colors.textSecondary },
  countdownTime: {
    fontFamily: fonts.heading, fontWeight: weight.bold, fontSize: 22,
    color: '#00d2ff', letterSpacing: 2, marginTop: 4,
  },

  // ── Golden Spin ──
  goldenSpinSection: { alignItems: 'center', width: '100%', paddingHorizontal: 20 },
  goldenDivider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 10 },
  goldenDividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(241,196,15,0.3)' },
  goldenDividerText: { fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 12, color: 'rgba(241,196,15,0.6)' },
  goldenCard: {
    width: '100%', borderRadius: 16, padding: 14,
    borderWidth: 1.5, borderColor: 'rgba(241,196,15,0.4)', alignItems: 'center',
  },
  goldenHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  goldenTitle: {
    fontFamily: fonts.heading, fontWeight: weight.bold, fontSize: 18,
    color: '#f1c40f', letterSpacing: 1,
  },
  goldenBadge: {
    backgroundColor: '#e74c3c', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  goldenBadgeText: { fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 9, color: '#fff', letterSpacing: 0.5 },
  goldenSub: {
    fontFamily: fonts.body, fontWeight: weight.medium, fontSize: 11,
    color: 'rgba(241,196,15,0.7)', marginTop: 4, marginBottom: 10,
  },
  goldenBtns: { flexDirection: 'row', gap: 10 },
  goldenBtn: { flex: 1 },
  goldenBtnGradient: {
    paddingVertical: 10, borderRadius: 14, alignItems: 'center',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 8, elevation: 6,
  },
  goldenBtnText: {
    fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 13,
    color: '#ffffff', letterSpacing: 1,
  },
  goldenSkip: { marginTop: 10 },
  goldenSkipText: { fontFamily: fonts.body, fontWeight: weight.medium, fontSize: 12, color: 'rgba(255,255,255,0.4)' },

  // ── Result ──
  resultCard: {
    position: 'absolute', top: '25%', alignSelf: 'center',
    alignItems: 'center', backgroundColor: 'rgba(20,10,50,0.97)',
    borderRadius: 20, paddingHorizontal: 32, paddingVertical: 24,
    borderWidth: 2, borderColor: 'rgba(0,210,255,0.4)',
    shadowColor: '#00d2ff', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6, shadowRadius: 24, elevation: 12, zIndex: 20,
  },
  resultGlow: {
    position: 'absolute', width: 160, height: 160, borderRadius: 80,
    top: -20, alignSelf: 'center',
  },
  resultGlowInner: { width: '100%', height: '100%', borderRadius: 80 },
  resultEmoji: { fontSize: 52, marginBottom: 8 },
  resultLabel: { fontFamily: fonts.heading, fontWeight: weight.bold, fontSize: 22, color: '#ffffff', textAlign: 'center' },
  resultRarity: { fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 11, letterSpacing: 2, marginTop: 4, marginBottom: 16 },
  collectBtn: { marginTop: 4 },
  collectBtnGradient: {
    paddingHorizontal: 40, paddingVertical: 12, borderRadius: 16,
    shadowColor: '#27ae3d', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5, shadowRadius: 10, elevation: 6,
  },
  collectBtnText: { fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 16, color: '#ffffff', letterSpacing: 1.5 },
});
