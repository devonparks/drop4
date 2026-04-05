import React, { useEffect, useRef, useMemo } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// ── Types ──────────────────────────────────────────────────────────────────

interface DarkMatterCamoProps {
  width: number;
  height: number;
  borderRadius?: number;
  /** Controls animation speed and brightness */
  intensity?: 'low' | 'medium' | 'high';
  style?: any;
}

// ── Palette ────────────────────────────────────────────────────────────────

const DARK_MATTER_COLORS = {
  base: '#0a0518',
  deepPurple: '#6b1a8a',
  hotPink: '#e94560',
  electricBlue: '#1a5ae9',
  darkRed: '#8a1a2a',
  brightPink: '#ff69b4',
  brightPurple: '#bf5fff',
  shimmerWhite: 'rgba(255,255,255,0.35)',
};

// Speed multipliers per intensity
const INTENSITY_SPEED: Record<string, number> = {
  low: 1.4,
  medium: 1,
  high: 0.7,
};

const INTENSITY_OPACITY: Record<string, number> = {
  low: 0.5,
  medium: 0.7,
  high: 0.9,
};

// ── Animated Orb ───────────────────────────────────────────────────────────

interface OrbProps {
  color: string;
  size: number;
  /** Starting position as fraction of container (0-1) */
  startX: number;
  startY: number;
  /** Movement range in pixels */
  rangeX: number;
  rangeY: number;
  /** Loop duration in ms (before intensity multiplier) */
  duration: number;
  containerWidth: number;
  containerHeight: number;
  speedMultiplier: number;
  maxOpacity: number;
}

function EnergyOrb({
  color,
  size,
  startX,
  startY,
  rangeX,
  rangeY,
  duration,
  containerWidth,
  containerHeight,
  speedMultiplier,
  maxOpacity,
}: OrbProps) {
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(maxOpacity * 0.6)).current;
  const scale = useRef(new Animated.Value(0.9)).current;

  const adjustedDuration = duration * speedMultiplier;

  useEffect(() => {
    // Horizontal drift loop
    const xLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(translateX, {
          toValue: rangeX,
          duration: adjustedDuration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: -rangeX * 0.6,
          duration: adjustedDuration * 0.8,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: 0,
          duration: adjustedDuration * 0.5,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );

    // Vertical drift loop (different timing for organic feel)
    const yLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(translateY, {
          toValue: -rangeY,
          duration: adjustedDuration * 1.2,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: rangeY * 0.7,
          duration: adjustedDuration * 0.9,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: adjustedDuration * 0.6,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );

    // Pulsing glow
    const opacityLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: maxOpacity,
          duration: adjustedDuration * 0.7,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: maxOpacity * 0.4,
          duration: adjustedDuration * 0.7,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    // Breathing scale
    const scaleLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.15,
          duration: adjustedDuration * 0.9,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 0.85,
          duration: adjustedDuration * 0.9,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );

    xLoop.start();
    yLoop.start();
    opacityLoop.start();
    scaleLoop.start();

    return () => {
      xLoop.stop();
      yLoop.stop();
      opacityLoop.stop();
      scaleLoop.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const posLeft = startX * containerWidth - size / 2;
  const posTop = startY * containerHeight - size / 2;

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: posLeft,
        top: posTop,
        width: size,
        height: size,
        borderRadius: size / 2,
        opacity,
        transform: [{ translateX }, { translateY }, { scale }],
      }}
    >
      <LinearGradient
        colors={[color, 'transparent']}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
        }}
        start={{ x: 0.5, y: 0.5 }}
        end={{ x: 1, y: 1 }}
      />
    </Animated.View>
  );
}

// ── Shimmer Sweep ──────────────────────────────────────────────────────────

interface ShimmerProps {
  containerWidth: number;
  containerHeight: number;
  speedMultiplier: number;
}

function ShimmerSweep({ containerWidth, containerHeight, speedMultiplier }: ShimmerProps) {
  const translateX = useRef(new Animated.Value(-containerWidth * 0.6)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const sweepDuration = 2000 * speedMultiplier;
  const pauseDuration = 4000 * speedMultiplier;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        // Fade in at start
        Animated.timing(opacity, {
          toValue: 0.6,
          duration: 150,
          useNativeDriver: true,
        }),
        // Sweep across
        Animated.timing(translateX, {
          toValue: containerWidth * 1.2,
          duration: sweepDuration,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        // Fade out
        Animated.timing(opacity, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
        // Reset position instantly
        Animated.timing(translateX, {
          toValue: -containerWidth * 0.6,
          duration: 0,
          useNativeDriver: true,
        }),
        // Wait before next sweep
        Animated.delay(pauseDuration),
      ]),
    );

    loop.start();
    return () => loop.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Diagonal line (rotated narrow rectangle)
  const lineWidth = Math.max(containerWidth, containerHeight) * 1.6;
  const lineThickness = 3;

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: -lineWidth * 0.2,
        width: lineThickness,
        height: lineWidth,
        opacity,
        transform: [
          { translateX },
          { rotate: '35deg' },
        ],
      }}
    >
      <LinearGradient
        colors={[
          'transparent',
          'rgba(255,255,255,0.05)',
          DARK_MATTER_COLORS.shimmerWhite,
          'rgba(255,255,255,0.05)',
          'transparent',
        ]}
        style={{ flex: 1 }}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />
    </Animated.View>
  );
}

// ── Particle Dot ───────────────────────────────────────────────────────────

interface ParticleDotProps {
  color: string;
  size: number;
  startX: number;
  startY: number;
  containerWidth: number;
  containerHeight: number;
  delay: number;
  speedMultiplier: number;
}

function ParticleDot({
  color,
  size,
  startX,
  startY,
  containerWidth,
  containerHeight,
  delay,
  speedMultiplier,
}: ParticleDotProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(0)).current;

  const driftDuration = (3000 + Math.random() * 2000) * speedMultiplier;

  useEffect(() => {
    // Twinkling opacity
    const fadeLoop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(opacity, {
          toValue: 0.9,
          duration: 800 * speedMultiplier,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.1,
          duration: 1200 * speedMultiplier,
          useNativeDriver: true,
        }),
      ]),
    );

    // Slow vertical drift
    const yLoop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(translateY, {
          toValue: -(15 + Math.random() * 20),
          duration: driftDuration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );

    // Gentle horizontal sway
    const xLoop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(translateX, {
          toValue: (Math.random() - 0.5) * 16,
          duration: driftDuration * 0.8,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: 0,
          duration: driftDuration * 0.4,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );

    fadeLoop.start();
    yLoop.start();
    xLoop.start();

    return () => {
      fadeLoop.stop();
      yLoop.stop();
      xLoop.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: startX * containerWidth,
        top: startY * containerHeight,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity,
        transform: [{ translateX }, { translateY }],
        shadowColor: color,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 4,
        elevation: 2,
      }}
    />
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

/**
 * Animated Dark Matter camo effect inspired by Black Ops 3.
 *
 * Renders swirling purple/red/blue energy orbs, a diagonal shimmer sweep,
 * and twinkling particle dots over a deep-space background.
 *
 * Uses only React Native's basic Animated API for broad compatibility.
 *
 * Usage:
 *   - Behind pieces that have the Dark Matter skin
 *   - Behind the board frame for the Dark Matter board theme
 *   - In the shop as a preview card background
 *   - In the character creator for Dark Matter cosmetic previews
 */
export function DarkMatterCamo({
  width,
  height,
  borderRadius = 0,
  intensity = 'medium',
  style,
}: DarkMatterCamoProps) {
  const speedMultiplier = INTENSITY_SPEED[intensity];
  const maxOpacity = INTENSITY_OPACITY[intensity];

  // Stable orb configs — memoized so they don't rebuild on re-render
  const orbConfigs = useMemo(
    () => [
      {
        color: DARK_MATTER_COLORS.deepPurple,
        size: Math.max(width, height) * 0.7,
        startX: 0.2,
        startY: 0.3,
        rangeX: width * 0.3,
        rangeY: height * 0.25,
        duration: 4000,
      },
      {
        color: DARK_MATTER_COLORS.hotPink,
        size: Math.max(width, height) * 0.55,
        startX: 0.75,
        startY: 0.6,
        rangeX: width * 0.25,
        rangeY: height * 0.3,
        duration: 5000,
      },
      {
        color: DARK_MATTER_COLORS.electricBlue,
        size: Math.max(width, height) * 0.5,
        startX: 0.5,
        startY: 0.15,
        rangeX: width * 0.35,
        rangeY: height * 0.2,
        duration: 3000,
      },
      {
        color: DARK_MATTER_COLORS.darkRed,
        size: Math.max(width, height) * 0.45,
        startX: 0.35,
        startY: 0.8,
        rangeX: width * 0.2,
        rangeY: height * 0.15,
        duration: 7000,
      },
    ],
    [width, height],
  );

  // Stable particle configs
  const particleConfigs = useMemo(
    () => [
      { color: DARK_MATTER_COLORS.brightPink, size: 2.5, startX: 0.15, startY: 0.2, delay: 0 },
      { color: DARK_MATTER_COLORS.brightPurple, size: 2, startX: 0.8, startY: 0.35, delay: 400 },
      { color: DARK_MATTER_COLORS.brightPink, size: 3, startX: 0.45, startY: 0.7, delay: 800 },
      { color: DARK_MATTER_COLORS.brightPurple, size: 2, startX: 0.65, startY: 0.1, delay: 1200 },
      { color: DARK_MATTER_COLORS.brightPink, size: 2.5, startX: 0.3, startY: 0.55, delay: 600 },
      { color: DARK_MATTER_COLORS.brightPurple, size: 3, startX: 0.9, startY: 0.8, delay: 1000 },
      { color: DARK_MATTER_COLORS.brightPink, size: 2, startX: 0.1, startY: 0.9, delay: 200 },
      { color: DARK_MATTER_COLORS.brightPurple, size: 2.5, startX: 0.55, startY: 0.45, delay: 1400 },
    ],
    [],
  );

  return (
    <View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: DARK_MATTER_COLORS.base,
          overflow: 'hidden',
        },
        style,
      ]}
      pointerEvents="none"
    >
      {/* Subtle radial-ish base glow in centre */}
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            alignItems: 'center',
            justifyContent: 'center',
          },
        ]}
      >
        <View
          style={{
            width: width * 0.8,
            height: height * 0.8,
            borderRadius: Math.max(width, height) * 0.4,
            backgroundColor: 'rgba(60, 10, 80, 0.35)',
          }}
        />
      </View>

      {/* Animated energy orbs */}
      {orbConfigs.map((orb, i) => (
        <EnergyOrb
          key={`orb-${i}`}
          {...orb}
          containerWidth={width}
          containerHeight={height}
          speedMultiplier={speedMultiplier}
          maxOpacity={maxOpacity}
        />
      ))}

      {/* Diagonal shimmer sweep */}
      <ShimmerSweep
        containerWidth={width}
        containerHeight={height}
        speedMultiplier={speedMultiplier}
      />

      {/* Floating particle dots */}
      {particleConfigs.map((p, i) => (
        <ParticleDot
          key={`particle-${i}`}
          {...p}
          containerWidth={width}
          containerHeight={height}
          speedMultiplier={speedMultiplier}
        />
      ))}

      {/* Top vignette overlay for depth */}
      <LinearGradient
        colors={['rgba(10,5,24,0.6)', 'transparent', 'rgba(10,5,24,0.4)']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        pointerEvents="none"
      />
    </View>
  );
}
