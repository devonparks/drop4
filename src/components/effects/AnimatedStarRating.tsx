import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

// ═══════════════════════════════════════════════════════════════════════
// AnimatedStarRating
//
// 3-star earned-rating display with each star scaling in with a spring,
// staggered for that satisfying "chunk chunk chunk" reveal you see on
// mobile games like Angry Birds / Cut the Rope.
//
// Props:
//   • earned: 0-3 — how many stars are filled
//   • size: visual size of each star (default 36)
//   • delay: ms to wait before starting the reveal (default 0)
//
// Use inside game over modals, career end cards, tournament finals, etc.
// ═══════════════════════════════════════════════════════════════════════

interface AnimatedStarRatingProps {
  earned: number;
  size?: number;
  delay?: number;
  gold?: boolean;
}

export function AnimatedStarRating({
  earned,
  size = 36,
  delay = 0,
  gold = true,
}: AnimatedStarRatingProps) {
  const filled = Math.max(0, Math.min(3, Math.floor(earned)));
  const scales = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;
  const rotations = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  useEffect(() => {
    // Pop all three stars in sequence. Empty stars still show but at
    // reduced scale + opacity so the player can see what's missing.
    const anims = scales.map((s, i) =>
      Animated.sequence([
        Animated.delay(delay + i * 220),
        Animated.parallel([
          Animated.spring(s, {
            toValue: 1,
            useNativeDriver: true,
            damping: 10,
            stiffness: 180,
          }),
          Animated.timing(rotations[i], {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),
      ]),
    );
    Animated.stagger(0, anims).start();
  }, [filled, delay]);

  return (
    <View style={styles.row}>
      {[0, 1, 2].map((i) => {
        const isFilled = i < filled;
        const rotate = rotations[i].interpolate({
          inputRange: [0, 1],
          outputRange: ['-180deg', '0deg'],
        });
        return (
          <Animated.View
            key={i}
            style={{
              marginHorizontal: size * 0.08,
              transform: [
                { scale: scales[i] },
                { rotate },
              ],
            }}
          >
            <StarShape size={size} filled={isFilled} gold={gold} />
          </Animated.View>
        );
      })}
    </View>
  );
}

// Single star rendered as a colored text glyph with a glow halo View behind it.
function StarShape({ size, filled, gold }: { size: number; filled: boolean; gold: boolean }) {
  const color = filled ? (gold ? '#ffd93d' : '#4ac8ff') : 'rgba(255,255,255,0.18)';
  const glowColor = filled ? (gold ? 'rgba(255,217,61,0.75)' : 'rgba(74,200,255,0.75)') : 'transparent';
  return (
    <View
      style={{
        width: size * 1.1,
        height: size * 1.1,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Halo glow */}
      {filled && (
        <View
          style={{
            position: 'absolute',
            width: size * 1.35,
            height: size * 1.35,
            borderRadius: size,
            backgroundColor: glowColor,
            opacity: 0.55,
          }}
        />
      )}
      <Text
        style={{
          fontSize: size,
          color,
          textShadowColor: glowColor,
          textShadowOffset: { width: 0, height: 0 },
          textShadowRadius: size * 0.4,
        }}
      >
        ★
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
