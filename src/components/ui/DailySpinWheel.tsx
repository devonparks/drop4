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
import { haptics } from '../../services/haptics';
import { playSound } from '../../services/audio';
import { colors } from '../../theme/colors';
import { fonts, weight } from '../../theme/typography';

const WHEEL_SIZE = 250;
const SEGMENT_COUNT = SPIN_SEGMENTS.length;
const SEGMENT_ANGLE = 360 / SEGMENT_COUNT; // 45 degrees each

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
  const canSpin = useDailySpinStore(s => s.canSpin);
  const pickReward = useDailySpinStore(s => s.pickReward);
  const recordSpin = useDailySpinStore(s => s.recordSpin);
  const addCoins = useShopStore(s => s.addCoins);
  const addGems = useShopStore(s => s.addGems);
  const addBox = useLootBoxStore(s => s.addBox);

  const [spinning, setSpinning] = useState(false);
  const [resultSegment, setResultSegment] = useState<SpinSegment | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [countdown, setCountdown] = useState('');

  const spinAnim = useRef(new Animated.Value(0)).current;
  const resultScaleAnim = useRef(new Animated.Value(0)).current;
  const resultOpacityAnim = useRef(new Animated.Value(0)).current;
  const glowPulse = useRef(new Animated.Value(0)).current;

  // Countdown timer
  useEffect(() => {
    if (!visible) return;
    if (canSpin()) { setCountdown(''); return; }

    const update = () => setCountdown(getTimeUntilMidnight());
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [visible, canSpin()]);

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
    if (spinning || !canSpin()) return;

    haptics.tap();
    setSpinning(true);
    setShowResult(false);
    setResultSegment(null);

    // Pick the winning segment
    const winIndex = pickReward();
    const segment = SPIN_SEGMENTS[winIndex];

    // Calculate final rotation:
    // We want the wheel to land so that segment winIndex is at the top (pointer position).
    // Each segment spans SEGMENT_ANGLE degrees.
    // Segment 0 starts at angle 0 (right side when rotation=0).
    // The pointer is at the top, which is -90 degrees from the right.
    // So we need: finalAngle = -(winIndex * SEGMENT_ANGLE + SEGMENT_ANGLE/2) - 90
    // Plus 3-5 full rotations for visual effect.
    const fullRotations = 3 + Math.floor(Math.random() * 3); // 3-5 rotations
    const targetAngle = -(winIndex * SEGMENT_ANGLE + SEGMENT_ANGLE / 2 + Math.random() * (SEGMENT_ANGLE * 0.4) - SEGMENT_ANGLE * 0.2);
    const totalDegrees = fullRotations * 360 + targetAngle;

    spinAnim.setValue(0);
    Animated.timing(spinAnim, {
      toValue: totalDegrees,
      duration: 3000,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      // Spin complete
      haptics.heavy();
      setResultSegment(segment);
      recordSpin();

      // Show result with animation
      setTimeout(() => {
        setShowResult(true);
        resultScaleAnim.setValue(0);
        resultOpacityAnim.setValue(0);

        Animated.parallel([
          Animated.spring(resultScaleAnim, {
            toValue: 1,
            useNativeDriver: true,
            speed: 12,
            bounciness: 10,
          }),
          Animated.timing(resultOpacityAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();

        try { playSound('level_up'); } catch {}
      }, 300);
    });
  };

  const handleCollect = () => {
    if (!resultSegment) return;
    haptics.heavy();

    // Grant the reward
    if (resultSegment.rewardType === 'coins') {
      addCoins(resultSegment.amount);
    } else if (resultSegment.rewardType === 'gems') {
      addGems(resultSegment.amount);
    } else if (resultSegment.rewardType === 'lootbox') {
      addBox('bronze_box');
    }

    try { playSound('coin'); } catch {}

    // Close the modal
    setSpinning(false);
    setShowResult(false);
    setResultSegment(null);
    onClose();
  };

  const handleClose = () => {
    if (spinning && !showResult) return; // Don't close while spinning
    setSpinning(false);
    setShowResult(false);
    setResultSegment(null);
    onClose();
  };

  const spinRotation = spinAnim.interpolate({
    inputRange: [-36000, 36000],
    outputRange: ['-36000deg', '36000deg'],
  });

  const isSpinAvailable = canSpin();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>DAILY SPIN</Text>
            <Text style={styles.headerSub}>Spin the wheel for free rewards!</Text>
          </View>

          {/* Close button */}
          {(!spinning || showResult) && (
            <Pressable style={styles.closeBtn} onPress={handleClose}>
              <Text style={styles.closeBtnText}>X</Text>
            </Pressable>
          )}

          {/* Wheel container */}
          <View style={styles.wheelContainer}>
            {/* Pointer / indicator at top */}
            <View style={styles.pointer}>
              <View style={styles.pointerTriangle} />
            </View>

            {/* The wheel */}
            <Animated.View
              style={[
                styles.wheel,
                { transform: [{ rotate: spinRotation }] },
              ]}
            >
              {SPIN_SEGMENTS.map((seg, index) => {
                const rotation = index * SEGMENT_ANGLE;
                return (
                  <View
                    key={seg.id}
                    style={[
                      styles.segment,
                      {
                        transform: [
                          { rotate: `${rotation}deg` },
                          { translateY: -WHEEL_SIZE / 2 },
                        ],
                        backgroundColor: seg.color,
                        borderColor: seg.borderColor,
                      },
                    ]}
                  >
                    <View style={styles.segmentContent}>
                      <Text style={styles.segmentEmoji}>{seg.emoji}</Text>
                      <Text style={styles.segmentLabel} numberOfLines={1}>{seg.label}</Text>
                    </View>
                  </View>
                );
              })}
              {/* Center circle */}
              <View style={styles.wheelCenter}>
                <Text style={styles.wheelCenterText}>DROP4</Text>
              </View>
            </Animated.View>

            {/* Outer glow ring */}
            <View style={styles.wheelGlow} />
          </View>

          {/* Spin button / countdown */}
          {isSpinAvailable && !showResult ? (
            <Pressable
              onPress={handleSpin}
              disabled={spinning}
              style={[styles.spinBtn, spinning && { opacity: 0.5 }]}
            >
              <LinearGradient
                colors={spinning ? ['#666', '#555'] : ['#ff8c00', '#ff6a00', '#cc5500']}
                style={styles.spinBtnGradient}
              >
                <Text style={styles.spinBtnText}>{spinning ? 'SPINNING...' : 'SPIN!'}</Text>
              </LinearGradient>
            </Pressable>
          ) : !isSpinAvailable && !showResult ? (
            <View style={styles.countdownArea}>
              <Text style={styles.countdownLabel}>Come back tomorrow!</Text>
              <Text style={styles.countdownTime}>{countdown}</Text>
            </View>
          ) : null}

          {/* Result overlay */}
          {showResult && resultSegment && (
            <Animated.View
              style={[
                styles.resultCard,
                {
                  opacity: resultOpacityAnim,
                  transform: [{ scale: resultScaleAnim }],
                },
              ]}
            >
              <Animated.View style={[styles.resultGlow, { opacity: glowPulse }]}>
                <View style={[styles.resultGlowInner, { backgroundColor: getRarityGlow(resultSegment.rarity) }]} />
              </Animated.View>
              <Text style={styles.resultEmoji}>{resultSegment.emoji}</Text>
              <Text style={[styles.resultLabel, {
                color: resultSegment.rarity === 'legendary' ? colors.gold :
                       resultSegment.rarity === 'epic' ? colors.purple :
                       resultSegment.rarity === 'rare' ? '#3498db' :
                       resultSegment.rarity === 'uncommon' ? colors.green : '#fff',
              }]}>
                {resultSegment.label}
              </Text>
              <Text style={[styles.resultRarity, {
                color: resultSegment.rarity === 'legendary' ? colors.gold :
                       resultSegment.rarity === 'epic' ? colors.purple :
                       resultSegment.rarity === 'rare' ? '#3498db' :
                       resultSegment.rarity === 'uncommon' ? colors.green : colors.textMuted,
              }]}>
                {getRarityLabel(resultSegment.rarity)}
              </Text>

              <Pressable onPress={handleCollect} style={styles.collectBtn}>
                <LinearGradient
                  colors={['#27ae3d', '#1e8a30']}
                  style={styles.collectBtnGradient}
                >
                  <Text style={styles.collectBtnText}>COLLECT</Text>
                </LinearGradient>
              </Pressable>
            </Animated.View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    width: '90%',
    maxWidth: 360,
    backgroundColor: colors.surface,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    alignItems: 'center',
    paddingBottom: 24,
  },
  // Header
  header: {
    width: '100%',
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    backgroundColor: 'rgba(255,140,0,0.1)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,140,0,0.2)',
  },
  headerTitle: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 28,
    color: '#ffffff',
    letterSpacing: 2,
  },
  headerSub: {
    fontFamily: fonts.body,
    fontWeight: weight.medium,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  // Close
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  closeBtnText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
  },
  // Wheel
  wheelContainer: {
    width: WHEEL_SIZE + 20,
    height: WHEEL_SIZE + 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  pointer: {
    position: 'absolute',
    top: -6,
    zIndex: 10,
    alignItems: 'center',
  },
  pointerTriangle: {
    width: 0,
    height: 0,
    borderLeftWidth: 12,
    borderRightWidth: 12,
    borderTopWidth: 20,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#ff8c00',
  },
  wheel: {
    width: WHEEL_SIZE,
    height: WHEEL_SIZE,
    borderRadius: WHEEL_SIZE / 2,
    backgroundColor: '#1a1a3a',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,140,0,0.5)',
    overflow: 'hidden',
  },
  segment: {
    position: 'absolute',
    width: 60,
    height: WHEEL_SIZE / 2 - 8,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 8,
    left: WHEEL_SIZE / 2 - 30,
    top: WHEEL_SIZE / 2,
    transformOrigin: '30px 0px',
    borderWidth: 1,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  segmentContent: {
    alignItems: 'center',
    gap: 2,
  },
  segmentEmoji: {
    fontSize: 18,
  },
  segmentLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 7,
    color: '#ffffff',
    textAlign: 'center',
    width: 50,
  },
  wheelCenter: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#0a0e27',
    borderWidth: 3,
    borderColor: '#ff8c00',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  wheelCenterText: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 8,
    color: '#ff8c00',
    letterSpacing: 1,
  },
  wheelGlow: {
    position: 'absolute',
    width: WHEEL_SIZE + 16,
    height: WHEEL_SIZE + 16,
    borderRadius: (WHEEL_SIZE + 16) / 2,
    borderWidth: 2,
    borderColor: 'rgba(255,140,0,0.2)',
    shadowColor: '#ff8c00',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 8,
  },
  // Spin button
  spinBtn: {
    marginTop: 4,
  },
  spinBtnGradient: {
    paddingHorizontal: 48,
    paddingVertical: 14,
    borderRadius: 20,
    shadowColor: '#ff8c00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  spinBtnText: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 24,
    color: '#ffffff',
    letterSpacing: 2,
  },
  // Countdown
  countdownArea: {
    alignItems: 'center',
    marginTop: 4,
    paddingVertical: 8,
  },
  countdownLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 14,
    color: colors.textSecondary,
  },
  countdownTime: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 22,
    color: colors.orange,
    letterSpacing: 2,
    marginTop: 4,
  },
  // Result
  resultCard: {
    position: 'absolute',
    top: '25%',
    alignSelf: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(10,14,39,0.95)',
    borderRadius: 20,
    paddingHorizontal: 32,
    paddingVertical: 24,
    borderWidth: 2,
    borderColor: 'rgba(255,140,0,0.4)',
    shadowColor: '#ff8c00',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 12,
    zIndex: 20,
  },
  resultGlow: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    top: -20,
    alignSelf: 'center',
  },
  resultGlowInner: {
    width: '100%',
    height: '100%',
    borderRadius: 80,
  },
  resultEmoji: {
    fontSize: 52,
    marginBottom: 8,
  },
  resultLabel: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 22,
    color: '#ffffff',
    textAlign: 'center',
  },
  resultRarity: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 11,
    letterSpacing: 2,
    marginTop: 4,
    marginBottom: 16,
  },
  collectBtn: {
    marginTop: 4,
  },
  collectBtnGradient: {
    paddingHorizontal: 40,
    paddingVertical: 12,
    borderRadius: 16,
    shadowColor: '#27ae3d',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 6,
  },
  collectBtnText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 16,
    color: '#ffffff',
    letterSpacing: 1.5,
  },
});
