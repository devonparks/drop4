import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { useTutorialStore } from '../../stores/tutorialStore';
import { haptics } from '../../services/haptics';
import { colors } from '../../theme/colors';
import { fonts, weight } from '../../theme/typography';
import type { TutorialTip } from '../../data/tutorials';

interface TutorialTooltipProps {
  tip: TutorialTip;
  visible: boolean;
  onDismiss?: () => void;
}

export function TutorialTooltip({ tip, visible, onDismiss }: TutorialTooltipProps) {
  const markTipSeen = useTutorialStore(s => s.markTipSeen);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, speed: 14, bounciness: 6 }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(20);
    }
  }, [visible]);

  const handleDismiss = () => {
    haptics.tap();
    // Mark seen IMMEDIATELY so re-renders don't re-show the tip
    markTipSeen(tip.id);
    // Fade out, then notify parent
    Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      onDismiss?.();
    });
  };

  if (!visible) return null;

  const positionStyle = tip.position === 'top'
    ? styles.positionTop
    : tip.position === 'bottom'
    ? styles.positionBottom
    : styles.positionCenter;

  return (
    <Animated.View
      style={[
        styles.overlay,
        { opacity: fadeAnim },
      ]}
      pointerEvents="box-none"
    >
      <Animated.View
        style={[
          styles.tooltip,
          positionStyle,
          { transform: [{ translateY: slideAnim }] },
        ]}
      >
        {/* Orange accent line */}
        <View style={styles.accentLine} />

        <View style={styles.content}>
          <Text style={styles.title}>{tip.title}</Text>
          <Text style={styles.message}>{tip.message}</Text>

          <Pressable onPress={handleDismiss} style={styles.gotItBtn}>
            <Text style={styles.gotItText}>GOT IT</Text>
          </Pressable>
        </View>

        {/* Arrow pointing towards content (for top/bottom) */}
        {tip.position === 'top' && <View style={styles.arrowDown} />}
        {tip.position === 'bottom' && <View style={styles.arrowUp} />}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tooltip: {
    width: '85%',
    maxWidth: 300,
    backgroundColor: 'rgba(10,14,39,0.95)',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255,140,0,0.4)',
    shadowColor: '#ff8c00',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
    overflow: 'hidden',
  },
  positionTop: {
    position: 'absolute',
    top: 100,
  },
  positionCenter: {
    // default — centered via overlay justifyContent
  },
  positionBottom: {
    position: 'absolute',
    bottom: 120,
  },
  accentLine: {
    width: '100%',
    height: 3,
    backgroundColor: '#ff8c00',
  },
  content: {
    padding: 16,
    alignItems: 'center',
  },
  title: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 18,
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 6,
  },
  message: {
    fontFamily: fonts.body,
    fontWeight: weight.regular,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 14,
  },
  gotItBtn: {
    backgroundColor: 'rgba(255,140,0,0.15)',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,140,0,0.3)',
  },
  gotItText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 13,
    color: colors.orange,
    letterSpacing: 1,
  },
  // Arrows for directional hints
  arrowDown: {
    alignSelf: 'center',
    marginBottom: -6,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: 'rgba(255,140,0,0.4)',
  },
  arrowUp: {
    alignSelf: 'center',
    position: 'absolute',
    top: -8,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'rgba(255,140,0,0.4)',
  },
});
