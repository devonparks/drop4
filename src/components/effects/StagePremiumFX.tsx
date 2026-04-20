// ═══════════════════════════════════════════════════════════════════════
// StagePremiumFX — home-stage "alive" layer
//
// Sims-meets-Fortnite lobby vibe: rising embers + a slow-rotating conic
// light shimmer behind the character. Drops in behind <Character3D> and
// handles its own animation loops so HomeScreen doesn't balloon.
//
// Designed to ride ON TOP of the new painted bg-home.png (cosmic sky +
// hexagonal orange stage with a built-in spotlight beam). The embers
// look like they're floating up from the stage; the shimmer reinforces
// the painted spotlight with subtle motion.
//
// All animations run on the native driver. 18 embers total — dense
// enough to read as alive, sparse enough that nothing stutters.
// ═══════════════════════════════════════════════════════════════════════

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing, Platform } from 'react-native';

// ── Ember particle ────────────────────────────────────────────────────

interface EmberConfig {
  /** Horizontal position as 0..1 of the container width. */
  left: number;
  /** Starting y-offset from the bottom as 0..1. Usually small (0..0.2). */
  startBottom: number;
  /** Rise distance in px — how high the ember travels before recycling. */
  rise: number;
  /** Duration in ms for one rise cycle. Longer = slower, lazier ember. */
  duration: number;
  /** Delay before first start (ms) so embers don't all spawn together. */
  delay: number;
  /** Ember diameter in px. */
  size: number;
  /** Tailwind-ish color. Warm orange/gold for the stage fire feel. */
  color: string;
  /** Horizontal sway amplitude in px (0 = straight up). */
  swayAmp: number;
}

function Ember({ config, containerWidth }: { config: EmberConfig; containerWidth: number }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(config.delay),
        Animated.timing(progress, {
          toValue: 1,
          duration: config.duration,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [config.delay, config.duration, progress]);

  // Fade in for the first 15%, stay lit, fade out in the last 40%.
  // Biased toward "visible most of the time" so the field reads dense.
  const opacity = progress.interpolate({
    inputRange: [0, 0.15, 0.6, 1],
    outputRange: [0, 0.95, 0.85, 0],
  });
  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -config.rise],
  });
  // Gentle sinusoidal sway. We fake sin() by chaining two cosine-ish
  // easing curves so the motion is smooth on both ends of the path.
  const translateX = progress.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [0, config.swayAmp, 0, -config.swayAmp, 0],
  });
  // Subtle scale pulse — ember "glows" on its way up.
  const scale = progress.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0.6, 1.1, 0.4],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: config.left * containerWidth - config.size / 2,
        bottom: config.startBottom * 100,
        width: config.size,
        height: config.size,
        borderRadius: config.size / 2,
        backgroundColor: config.color,
        opacity,
        transform: [{ translateY }, { translateX }, { scale }],
        // Soft glow on web. Native gets a subtle shadow to compensate.
        ...(Platform.OS === 'web'
          ? ({ filter: `blur(${config.size * 0.3}px)` } as any)
          : { shadowColor: config.color, shadowOpacity: 0.8, shadowRadius: config.size * 0.6, shadowOffset: { width: 0, height: 0 } }),
      }}
    />
  );
}

// Palette tuned to the painted bg-home: warm orange stage spotlight +
// magenta + cyan nebula. Embers bias toward warm so they read as stage
// fire rather than stars (stars are the painted + the ScreenBackground
// layer's job).
const EMBER_COLORS = [
  '#ffb347', // warm orange
  '#ffd18c', // peach
  '#ffe4a3', // gold
  '#ff8040', // deep orange
  '#ffcf5a', // amber
  '#ff6bb3', // magenta accent (matches sky nebula)
  '#6bdcff', // cyan accent (matches sky nebula)
];

// 18 embers across a range of sizes/speeds. The random-ish distribution
// here is actually deterministic so every mount produces the same
// beautiful layout — no "the first render looks bad" issue.
const EMBERS: EmberConfig[] = [
  { left: 0.18, startBottom: 0.35, rise: 260, duration: 4800, delay: 0,    size: 5, color: EMBER_COLORS[0], swayAmp: 14 },
  { left: 0.82, startBottom: 0.42, rise: 240, duration: 5200, delay: 400,  size: 4, color: EMBER_COLORS[1], swayAmp: 10 },
  { left: 0.35, startBottom: 0.30, rise: 300, duration: 5600, delay: 800,  size: 6, color: EMBER_COLORS[2], swayAmp: 18 },
  { left: 0.68, startBottom: 0.38, rise: 280, duration: 5000, delay: 1200, size: 5, color: EMBER_COLORS[0], swayAmp: 12 },
  { left: 0.50, startBottom: 0.45, rise: 320, duration: 6000, delay: 1600, size: 7, color: EMBER_COLORS[3], swayAmp: 22 },
  { left: 0.12, startBottom: 0.50, rise: 220, duration: 4400, delay: 2000, size: 3, color: EMBER_COLORS[4], swayAmp: 8  },
  { left: 0.90, startBottom: 0.34, rise: 250, duration: 5400, delay: 2400, size: 4, color: EMBER_COLORS[1], swayAmp: 10 },
  { left: 0.45, startBottom: 0.20, rise: 340, duration: 6400, delay: 2800, size: 6, color: EMBER_COLORS[5], swayAmp: 20 },
  { left: 0.25, startBottom: 0.55, rise: 200, duration: 4200, delay: 3200, size: 3, color: EMBER_COLORS[2], swayAmp: 6  },
  { left: 0.75, startBottom: 0.28, rise: 290, duration: 5800, delay: 3600, size: 5, color: EMBER_COLORS[0], swayAmp: 16 },
  { left: 0.55, startBottom: 0.60, rise: 180, duration: 4000, delay: 4000, size: 3, color: EMBER_COLORS[4], swayAmp: 8  },
  { left: 0.08, startBottom: 0.25, rise: 310, duration: 6200, delay: 4400, size: 5, color: EMBER_COLORS[6], swayAmp: 16 },
  { left: 0.62, startBottom: 0.50, rise: 210, duration: 4600, delay: 4800, size: 4, color: EMBER_COLORS[1], swayAmp: 10 },
  { left: 0.40, startBottom: 0.40, rise: 270, duration: 5200, delay: 5200, size: 5, color: EMBER_COLORS[3], swayAmp: 14 },
  { left: 0.86, startBottom: 0.55, rise: 230, duration: 4800, delay: 5600, size: 4, color: EMBER_COLORS[0], swayAmp: 12 },
  { left: 0.22, startBottom: 0.18, rise: 360, duration: 6600, delay: 6000, size: 6, color: EMBER_COLORS[5], swayAmp: 24 },
  { left: 0.58, startBottom: 0.32, rise: 260, duration: 5000, delay: 6400, size: 4, color: EMBER_COLORS[4], swayAmp: 12 },
  { left: 0.30, startBottom: 0.48, rise: 240, duration: 4800, delay: 6800, size: 5, color: EMBER_COLORS[6], swayAmp: 14 },
];

// ── Shimmer — slow-rotating conic gradient behind the spotlight ────────

function Shimmer() {
  const rotate = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(rotate, {
        toValue: 1,
        duration: 45_000, // a full slow 45s rotation
        useNativeDriver: true,
        easing: Easing.linear,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [rotate]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.shimmer,
        {
          transform: [
            {
              rotate: rotate.interpolate({
                inputRange: [0, 1],
                outputRange: ['0deg', '360deg'],
              }),
            },
          ],
        },
      ]}
    />
  );
}

// ── Main component ────────────────────────────────────────────────────

export function StagePremiumFX({ width }: { width: number }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Shimmer />
      {EMBERS.map((cfg, i) => (
        <Ember key={i} config={cfg} containerWidth={width} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  shimmer: {
    position: 'absolute',
    top: '10%',
    left: '10%',
    width: '80%',
    height: '80%',
    borderRadius: 9999,
    // Web-only conic gradient. On native we fall back to a soft radial
    // glow via shadow (renders as a subtle bright center).
    ...(Platform.OS === 'web'
      ? ({
          // A warm beam sweeping across the background. Low opacity
          // stops keep it subtle; the animation makes it feel volumetric.
          backgroundImage:
            'conic-gradient(from 0deg, rgba(255,200,120,0) 0deg, rgba(255,200,120,0.18) 30deg, rgba(255,200,120,0) 80deg, rgba(255,140,80,0) 180deg, rgba(255,120,200,0.12) 220deg, rgba(255,120,200,0) 280deg, rgba(255,200,120,0) 360deg)',
          filter: 'blur(30px)',
          mixBlendMode: 'screen',
        } as any)
      : {
          backgroundColor: 'rgba(255,200,120,0.12)',
          shadowColor: '#ffb347',
          shadowOpacity: 0.4,
          shadowRadius: 40,
          shadowOffset: { width: 0, height: 0 },
        }),
  },
});
