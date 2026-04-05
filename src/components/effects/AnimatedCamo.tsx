import React, { useEffect, useRef, useMemo } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// ── Types ──────────────────────────────────────────────────────────────────

type CamoType = 'void' | 'rainbow' | 'obsidian' | 'damascus' | 'plasma';

interface AnimatedCamoProps {
  type: CamoType;
  width: number;
  height: number;
  borderRadius?: number;
  style?: any;
}

// ── Palettes ───────────────────────────────────────────────────────────────

const CAMO_PALETTES: Record<CamoType, { base: string; colors: string[] }> = {
  void: {
    base: '#050010',
    colors: ['#2d0a4e', '#1a0633', '#3d1266', '#0d0022'],
  },
  rainbow: {
    base: '#1a1a2e',
    colors: ['#e74c3c', '#e67e22', '#f1c40f', '#2ecc71', '#3498db', '#9b59b6'],
  },
  obsidian: {
    base: '#0a0a0a',
    colors: ['#1a1a1a', '#2a2a2a', '#3a3a3a', '#111111'],
  },
  damascus: {
    base: '#1a1a1f',
    colors: ['#8a8a95', '#b0b0bc', '#6a6a75', '#c5c5d0'],
  },
  plasma: {
    base: '#020818',
    colors: ['#1a5ae9', '#4d8cff', '#ffffff', '#0a3db8'],
  },
};

// ── Void ───────────────────────────────────────────────────────────────────
// Swirling dark purple/black with a central gravity-well effect

function VoidCamo({ width, height }: { width: number; height: number }) {
  const rotation = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0.7)).current;
  const innerPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const rotateLoop = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 12000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.5,
          duration: 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );

    const innerLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(innerPulse, {
          toValue: 1.3,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(innerPulse, {
          toValue: 0.8,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    rotateLoop.start();
    pulseLoop.start();
    innerLoop.start();
    return () => { rotateLoop.stop(); pulseLoop.stop(); innerLoop.stop(); };
  }, []);

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const orbSize = Math.max(width, height) * 0.9;

  return (
    <>
      {/* Outer swirling ring */}
      <Animated.View
        style={{
          position: 'absolute',
          left: width / 2 - orbSize / 2,
          top: height / 2 - orbSize / 2,
          width: orbSize,
          height: orbSize,
          borderRadius: orbSize / 2,
          opacity: pulse,
          transform: [{ rotate: spin }],
        }}
      >
        <LinearGradient
          colors={['#2d0a4e', 'transparent', '#1a0633', 'transparent']}
          style={{ width: orbSize, height: orbSize, borderRadius: orbSize / 2 }}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      </Animated.View>

      {/* Inner gravity well */}
      <Animated.View
        style={{
          position: 'absolute',
          left: width / 2 - orbSize * 0.2,
          top: height / 2 - orbSize * 0.2,
          width: orbSize * 0.4,
          height: orbSize * 0.4,
          borderRadius: orbSize * 0.2,
          backgroundColor: '#0d0022',
          transform: [{ scale: innerPulse }],
          shadowColor: '#6b1a8a',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.8,
          shadowRadius: 20,
          elevation: 8,
        }}
      />

      {/* Wisp arms */}
      {[0, 90, 180, 270].map((deg, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            left: width / 2 - 1.5,
            top: height / 2 - orbSize * 0.35,
            width: 3,
            height: orbSize * 0.35,
            opacity: pulse,
            transform: [
              { translateY: orbSize * 0.175 },
              { rotate: spin },
              { rotate: `${deg}deg` },
              { translateY: -orbSize * 0.175 },
            ],
          }}
        >
          <LinearGradient
            colors={['transparent', '#3d1266', 'transparent']}
            style={{ flex: 1 }}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
          />
        </Animated.View>
      ))}
    </>
  );
}

// ── Rainbow ────────────────────────────────────────────────────────────────
// Cycling hue shift across the surface

function RainbowCamo({ width, height }: { width: number; height: number }) {
  // We animate the position of a wide gradient strip to create the hue-cycling effect
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const xLoop = Animated.loop(
      Animated.timing(translateX, {
        toValue: -width,
        duration: 4000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );

    const yLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(translateY, {
          toValue: -height * 0.15,
          duration: 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: height * 0.15,
          duration: 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );

    xLoop.start();
    yLoop.start();
    return () => { xLoop.stop(); yLoop.stop(); };
  }, []);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: 0,
        top: -height * 0.15,
        width: width * 3,
        height: height * 1.3,
        transform: [{ translateX }, { translateY }],
      }}
    >
      <LinearGradient
        colors={[
          '#e74c3c', '#e67e22', '#f1c40f', '#2ecc71',
          '#3498db', '#9b59b6', '#e74c3c', '#e67e22',
          '#f1c40f', '#2ecc71', '#3498db', '#9b59b6',
        ]}
        style={{ flex: 1 }}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
      />
    </Animated.View>
  );
}

// ── Obsidian ───────────────────────────────────────────────────────────────
// Dark with occasional bright reflective flashes

function ObsidianCamo({ width, height }: { width: number; height: number }) {
  const flash1Opacity = useRef(new Animated.Value(0)).current;
  const flash1X = useRef(new Animated.Value(width * 0.2)).current;
  const flash2Opacity = useRef(new Animated.Value(0)).current;
  const flash2X = useRef(new Animated.Value(width * 0.7)).current;
  const sheen = useRef(new Animated.Value(-width * 0.5)).current;

  useEffect(() => {
    // Flash 1 — quick bright reflective flash
    const flash1Loop = Animated.loop(
      Animated.sequence([
        Animated.delay(2000),
        Animated.timing(flash1Opacity, {
          toValue: 0.7,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(flash1Opacity, {
          toValue: 0,
          duration: 400,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.delay(3000),
      ]),
    );

    // Flash 2 — offset timing
    const flash2Loop = Animated.loop(
      Animated.sequence([
        Animated.delay(4000),
        Animated.timing(flash2Opacity, {
          toValue: 0.5,
          duration: 80,
          useNativeDriver: true,
        }),
        Animated.timing(flash2Opacity, {
          toValue: 0,
          duration: 350,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.delay(2500),
      ]),
    );

    // Slow gliding sheen
    const sheenLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(sheen, {
          toValue: width * 1.5,
          duration: 6000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(sheen, {
          toValue: -width * 0.5,
          duration: 0,
          useNativeDriver: true,
        }),
        Animated.delay(3000),
      ]),
    );

    flash1Loop.start();
    flash2Loop.start();
    sheenLoop.start();
    return () => { flash1Loop.stop(); flash2Loop.stop(); sheenLoop.stop(); };
  }, []);

  const flashSize = Math.min(width, height) * 0.6;

  return (
    <>
      {/* Subtle dark texture layers */}
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: 'rgba(25,25,25,0.4)' },
        ]}
      />

      {/* Flash spot 1 */}
      <Animated.View
        style={{
          position: 'absolute',
          left: width * 0.15,
          top: height * 0.3,
          width: flashSize,
          height: flashSize,
          borderRadius: flashSize / 2,
          backgroundColor: 'rgba(255,255,255,0.4)',
          opacity: flash1Opacity,
          shadowColor: '#fff',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 1,
          shadowRadius: 15,
          elevation: 4,
        }}
      />

      {/* Flash spot 2 */}
      <Animated.View
        style={{
          position: 'absolute',
          left: width * 0.6,
          top: height * 0.55,
          width: flashSize * 0.7,
          height: flashSize * 0.7,
          borderRadius: (flashSize * 0.7) / 2,
          backgroundColor: 'rgba(200,200,220,0.3)',
          opacity: flash2Opacity,
          shadowColor: '#ccc',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 1,
          shadowRadius: 10,
          elevation: 3,
        }}
      />

      {/* Gliding sheen line */}
      <Animated.View
        style={{
          position: 'absolute',
          top: -height * 0.2,
          width: 4,
          height: height * 1.5,
          transform: [{ translateX: sheen }, { rotate: '25deg' }],
        }}
      >
        <LinearGradient
          colors={['transparent', 'rgba(255,255,255,0.15)', 'transparent']}
          style={{ flex: 1 }}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
      </Animated.View>
    </>
  );
}

// ── Damascus ───────────────────────────────────────────────────────────────
// Flowing wavy metallic pattern in silver/gray

function DamascusCamo({ width, height }: { width: number; height: number }) {
  // Multiple wave strips that flow horizontally at different speeds
  const wave1 = useRef(new Animated.Value(0)).current;
  const wave2 = useRef(new Animated.Value(0)).current;
  const wave3 = useRef(new Animated.Value(0)).current;
  const shimmer = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const w1 = Animated.loop(
      Animated.timing(wave1, {
        toValue: -width,
        duration: 8000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );

    const w2 = Animated.loop(
      Animated.timing(wave2, {
        toValue: width * 0.8,
        duration: 10000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );

    const w3 = Animated.loop(
      Animated.timing(wave3, {
        toValue: -width * 0.6,
        duration: 6000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );

    const shimmerLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 0.6,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0.25,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );

    w1.start();
    w2.start();
    w3.start();
    shimmerLoop.start();
    return () => { w1.stop(); w2.stop(); w3.stop(); shimmerLoop.stop(); };
  }, []);

  const waveHeight = height * 0.35;

  return (
    <>
      {/* Wave strip 1 — light silver */}
      <Animated.View
        style={{
          position: 'absolute',
          left: 0,
          top: height * 0.1,
          width: width * 3,
          height: waveHeight,
          opacity: shimmer,
          transform: [{ translateX: wave1 }],
        }}
      >
        <LinearGradient
          colors={['transparent', 'rgba(180,180,195,0.25)', 'rgba(220,220,230,0.3)', 'transparent']}
          style={{ flex: 1 }}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0.5 }}
        />
      </Animated.View>

      {/* Wave strip 2 — darker */}
      <Animated.View
        style={{
          position: 'absolute',
          left: -width,
          top: height * 0.35,
          width: width * 3,
          height: waveHeight * 0.8,
          opacity: 0.4,
          transform: [{ translateX: wave2 }],
        }}
      >
        <LinearGradient
          colors={['transparent', 'rgba(100,100,115,0.35)', 'rgba(140,140,155,0.25)', 'transparent']}
          style={{ flex: 1 }}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0 }}
        />
      </Animated.View>

      {/* Wave strip 3 — bright accent */}
      <Animated.View
        style={{
          position: 'absolute',
          left: 0,
          top: height * 0.6,
          width: width * 3,
          height: waveHeight * 0.6,
          opacity: 0.35,
          transform: [{ translateX: wave3 }],
        }}
      >
        <LinearGradient
          colors={['transparent', 'rgba(200,200,215,0.3)', 'transparent']}
          style={{ flex: 1 }}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
        />
      </Animated.View>

      {/* Overall metallic overlay */}
      <LinearGradient
        colors={['rgba(160,160,175,0.08)', 'transparent', 'rgba(160,160,175,0.06)']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
    </>
  );
}

// ── Plasma ──────────────────────────────────────────────────────────────────
// Electric blue/white energy pulses

function PlasmaCamo({ width, height }: { width: number; height: number }) {
  const pulse1 = useRef(new Animated.Value(0.3)).current;
  const pulse2 = useRef(new Animated.Value(0.5)).current;
  const bolt1X = useRef(new Animated.Value(width * 0.2)).current;
  const bolt1Scale = useRef(new Animated.Value(1)).current;
  const bolt2X = useRef(new Animated.Value(width * 0.6)).current;
  const coreGlow = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    // Pulsing orb 1
    const p1 = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse1, {
          toValue: 0.8,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse1, {
          toValue: 0.2,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    // Pulsing orb 2 (offset)
    const p2 = Animated.loop(
      Animated.sequence([
        Animated.delay(700),
        Animated.timing(pulse2, {
          toValue: 0.7,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse2, {
          toValue: 0.15,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    // Energy bolt movement
    const b1 = Animated.loop(
      Animated.sequence([
        Animated.timing(bolt1X, {
          toValue: width * 0.7,
          duration: 2500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(bolt1X, {
          toValue: width * 0.1,
          duration: 2500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );

    // Bolt scale throb
    const b1Scale = Animated.loop(
      Animated.sequence([
        Animated.timing(bolt1Scale, {
          toValue: 1.6,
          duration: 800,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(bolt1Scale, {
          toValue: 0.8,
          duration: 800,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    // Central glow pulse
    const coreLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(coreGlow, {
          toValue: 0.7,
          duration: 1000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(coreGlow, {
          toValue: 0.3,
          duration: 1000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );

    p1.start();
    p2.start();
    b1.start();
    b1Scale.start();
    coreLoop.start();
    return () => { p1.stop(); p2.stop(); b1.stop(); b1Scale.stop(); coreLoop.stop(); };
  }, []);

  const orbSize = Math.min(width, height) * 0.6;
  const boltSize = 6;

  return (
    <>
      {/* Electric orb 1 */}
      <Animated.View
        style={{
          position: 'absolute',
          left: width * 0.15,
          top: height * 0.2,
          width: orbSize,
          height: orbSize,
          borderRadius: orbSize / 2,
          opacity: pulse1,
        }}
      >
        <LinearGradient
          colors={['#4d8cff', 'transparent']}
          style={{ width: orbSize, height: orbSize, borderRadius: orbSize / 2 }}
          start={{ x: 0.5, y: 0.5 }}
          end={{ x: 1, y: 1 }}
        />
      </Animated.View>

      {/* Electric orb 2 */}
      <Animated.View
        style={{
          position: 'absolute',
          left: width * 0.5,
          top: height * 0.45,
          width: orbSize * 0.75,
          height: orbSize * 0.75,
          borderRadius: (orbSize * 0.75) / 2,
          opacity: pulse2,
        }}
      >
        <LinearGradient
          colors={['#1a5ae9', 'transparent']}
          style={{
            width: orbSize * 0.75,
            height: orbSize * 0.75,
            borderRadius: (orbSize * 0.75) / 2,
          }}
          start={{ x: 0.5, y: 0.5 }}
          end={{ x: 0, y: 0 }}
        />
      </Animated.View>

      {/* Moving energy bolt (bright dot) */}
      <Animated.View
        style={{
          position: 'absolute',
          top: height * 0.4,
          width: boltSize,
          height: boltSize,
          borderRadius: boltSize / 2,
          backgroundColor: '#ffffff',
          transform: [{ translateX: bolt1X }, { scale: bolt1Scale }],
          shadowColor: '#4d8cff',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 1,
          shadowRadius: 10,
          elevation: 6,
        }}
      />

      {/* Static energy dots */}
      {[
        { x: 0.3, y: 0.15, s: 3 },
        { x: 0.7, y: 0.7, s: 2.5 },
        { x: 0.15, y: 0.8, s: 2 },
        { x: 0.85, y: 0.25, s: 3 },
      ].map((dot, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            left: dot.x * width,
            top: dot.y * height,
            width: dot.s,
            height: dot.s,
            borderRadius: dot.s / 2,
            backgroundColor: i % 2 === 0 ? '#4d8cff' : '#ffffff',
            opacity: i % 2 === 0 ? pulse1 : pulse2,
            shadowColor: '#4d8cff',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.8,
            shadowRadius: 4,
            elevation: 2,
          }}
        />
      ))}

      {/* Central glow */}
      <Animated.View
        style={{
          position: 'absolute',
          left: width * 0.25,
          top: height * 0.25,
          width: width * 0.5,
          height: height * 0.5,
          borderRadius: Math.min(width, height) * 0.25,
          backgroundColor: 'rgba(26,90,233,0.15)',
          opacity: coreGlow,
        }}
      />
    </>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

/**
 * Multi-type animated camo effect using only the basic React Native Animated API.
 *
 * Supports five camo types:
 *   - **void**     — Swirling dark purple/black with a central gravity-well effect
 *   - **rainbow**  — Cycling hue shift (red through purple and back)
 *   - **obsidian** — Dark glass with occasional bright reflective flashes
 *   - **damascus** — Flowing wavy metallic pattern in silver/gray
 *   - **plasma**   — Electric blue/white energy pulses
 *
 * Each uses Animated.loop with View-based gradients and color interpolation.
 */
export function AnimatedCamo({
  type,
  width,
  height,
  borderRadius = 0,
  style,
}: AnimatedCamoProps) {
  const palette = CAMO_PALETTES[type];

  return (
    <View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: palette.base,
          overflow: 'hidden',
        },
        style,
      ]}
      pointerEvents="none"
    >
      {type === 'void' && <VoidCamo width={width} height={height} />}
      {type === 'rainbow' && <RainbowCamo width={width} height={height} />}
      {type === 'obsidian' && <ObsidianCamo width={width} height={height} />}
      {type === 'damascus' && <DamascusCamo width={width} height={height} />}
      {type === 'plasma' && <PlasmaCamo width={width} height={height} />}
    </View>
  );
}
