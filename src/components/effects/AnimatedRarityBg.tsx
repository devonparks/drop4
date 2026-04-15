import React, { useEffect, useRef, useMemo } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

/**
 * AnimatedRarityBg — Animated background for premium cosmetic items.
 *
 * Like DarkMatterCamo but generalized with per-rarity color palettes.
 * Shows swirling energy orbs, shimmer sweep, and floating particles.
 *
 * Usage:
 *   <AnimatedRarityBg rarity="legendary" width={280} height={200} />
 *   <AnimatedRarityBg rarity="mythic" width={108} height={64} />
 */

interface Props {
  rarity: 'epic' | 'legendary' | 'mythic' | 'darkmatter';
  width: number;
  height: number;
  borderRadius?: number;
  style?: any;
}

interface Palette {
  base: string;
  orb1: string;
  orb2: string;
  orb3: string;
  particle: string;
  particleAlt: string;
  shimmer: string;
  centerGlow: string;
}

const PALETTES: Record<string, Palette> = {
  epic: {
    base: '#0a0520',
    orb1: '#6b1a8a',
    orb2: '#9b59b6',
    orb3: '#4a0e6b',
    particle: '#bf5fff',
    particleAlt: '#d68fff',
    shimmer: 'rgba(155,89,182,0.3)',
    centerGlow: 'rgba(100,30,140,0.3)',
  },
  legendary: {
    base: '#0a0800',
    orb1: '#d4a017',
    orb2: '#ff8c00',
    orb3: '#b8860b',
    particle: '#ffd700',
    particleAlt: '#ffaa00',
    shimmer: 'rgba(255,215,0,0.35)',
    centerGlow: 'rgba(180,130,0,0.25)',
  },
  mythic: {
    base: '#0a0005',
    orb1: '#e63946',
    orb2: '#ff6b6b',
    orb3: '#c0392b',
    particle: '#ff4d6a',
    particleAlt: '#ff8fa3',
    shimmer: 'rgba(255,100,100,0.3)',
    centerGlow: 'rgba(200,40,60,0.25)',
  },
  darkmatter: {
    base: '#0a0518',
    orb1: '#6b1a8a',
    orb2: '#e94560',
    orb3: '#1a5ae9',
    particle: '#ff69b4',
    particleAlt: '#bf5fff',
    shimmer: 'rgba(255,255,255,0.35)',
    centerGlow: 'rgba(60,10,80,0.35)',
  },
};

// ── Animated Orb ──
function Orb({ color, size, startX, startY, rangeX, rangeY, duration, w, h }: {
  color: string; size: number; startX: number; startY: number;
  rangeX: number; rangeY: number; duration: number; w: number; h: number;
}) {
  const tx = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(0)).current;
  const op = useRef(new Animated.Value(0.5)).current;
  const sc = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    const loops = [
      Animated.loop(Animated.sequence([
        Animated.timing(tx, { toValue: rangeX, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(tx, { toValue: -rangeX * 0.6, duration: duration * 0.8, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(tx, { toValue: 0, duration: duration * 0.5, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])),
      Animated.loop(Animated.sequence([
        Animated.timing(ty, { toValue: -rangeY, duration: duration * 1.2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(ty, { toValue: rangeY * 0.7, duration: duration * 0.9, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(ty, { toValue: 0, duration: duration * 0.6, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])),
      Animated.loop(Animated.sequence([
        Animated.timing(op, { toValue: 0.8, duration: duration * 0.7, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(op, { toValue: 0.3, duration: duration * 0.7, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])),
      Animated.loop(Animated.sequence([
        Animated.timing(sc, { toValue: 1.15, duration: duration * 0.9, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(sc, { toValue: 0.85, duration: duration * 0.9, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])),
    ];
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, []);

  return (
    <Animated.View style={{
      position: 'absolute', left: startX * w - size / 2, top: startY * h - size / 2,
      width: size, height: size, borderRadius: size / 2,
      opacity: op, transform: [{ translateX: tx }, { translateY: ty }, { scale: sc }],
    }}>
      <LinearGradient colors={[color, 'transparent']} style={{ width: size, height: size, borderRadius: size / 2 }}
        start={{ x: 0.5, y: 0.5 }} end={{ x: 1, y: 1 }} />
    </Animated.View>
  );
}

// ── Shimmer Sweep ──
function Sweep({ w, h, color }: { w: number; h: number; color: string }) {
  const tx = useRef(new Animated.Value(-w * 0.6)).current;
  const op = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(op, { toValue: 0.6, duration: 150, useNativeDriver: true }),
      Animated.timing(tx, { toValue: w * 1.2, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(op, { toValue: 0, duration: 100, useNativeDriver: true }),
      Animated.timing(tx, { toValue: -w * 0.6, duration: 0, useNativeDriver: true }),
      Animated.delay(4000),
    ]));
    loop.start();
    return () => loop.stop();
  }, []);

  const lineH = Math.max(w, h) * 1.6;
  return (
    <Animated.View style={{ position: 'absolute', top: -lineH * 0.2, width: 3, height: lineH, opacity: op, transform: [{ translateX: tx }, { rotate: '35deg' }] }}>
      <LinearGradient colors={['transparent', 'rgba(255,255,255,0.05)', color, 'rgba(255,255,255,0.05)', 'transparent']}
        style={{ flex: 1 }} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} />
    </Animated.View>
  );
}

// ── Particle Dot ──
function Dot({ color, size, x, y, w, h, delay }: {
  color: string; size: number; x: number; y: number; w: number; h: number; delay: number;
}) {
  const op = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loops = [
      Animated.loop(Animated.sequence([
        Animated.delay(delay),
        Animated.timing(op, { toValue: 0.9, duration: 800, useNativeDriver: true }),
        Animated.timing(op, { toValue: 0.1, duration: 1200, useNativeDriver: true }),
      ])),
      Animated.loop(Animated.sequence([
        Animated.delay(delay),
        Animated.timing(ty, { toValue: -(10 + Math.random() * 15), duration: 3000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(ty, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])),
    ];
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, []);

  return (
    <Animated.View style={{
      position: 'absolute', left: x * w, top: y * h, width: size, height: size, borderRadius: size / 2,
      backgroundColor: color, opacity: op, transform: [{ translateY: ty }],
      shadowColor: color, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 3, elevation: 2,
    }} />
  );
}

// ── Main Component ──
export function AnimatedRarityBg({ rarity, width, height, borderRadius = 0, style }: Props) {
  const p = PALETTES[rarity] || PALETTES.epic;

  const orbs = useMemo(() => [
    { color: p.orb1, size: Math.max(width, height) * 0.65, startX: 0.2, startY: 0.3, rangeX: width * 0.28, rangeY: height * 0.22, duration: 4000 },
    { color: p.orb2, size: Math.max(width, height) * 0.5, startX: 0.75, startY: 0.6, rangeX: width * 0.22, rangeY: height * 0.28, duration: 5000 },
    { color: p.orb3, size: Math.max(width, height) * 0.45, startX: 0.5, startY: 0.15, rangeX: width * 0.3, rangeY: height * 0.18, duration: 3500 },
  ], [width, height, p]);

  const dots = useMemo(() => [
    { color: p.particle, size: 2.5, x: 0.15, y: 0.2, delay: 0 },
    { color: p.particleAlt, size: 2, x: 0.8, y: 0.35, delay: 400 },
    { color: p.particle, size: 3, x: 0.45, y: 0.7, delay: 800 },
    { color: p.particleAlt, size: 2, x: 0.65, y: 0.1, delay: 1200 },
    { color: p.particle, size: 2.5, x: 0.3, y: 0.55, delay: 600 },
    { color: p.particleAlt, size: 2.5, x: 0.9, y: 0.8, delay: 1000 },
  ], [p]);

  return (
    <View style={[{ width, height, borderRadius, backgroundColor: p.base, overflow: 'hidden' }, style]} pointerEvents="none">
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
        <View style={{ width: width * 0.75, height: height * 0.75, borderRadius: Math.max(width, height) * 0.4, backgroundColor: p.centerGlow }} />
      </View>
      {orbs.map((o, i) => <Orb key={i} {...o} w={width} h={height} />)}
      <Sweep w={width} h={height} color={p.shimmer} />
      {dots.map((d, i) => <Dot key={i} {...d} w={width} h={height} />)}
      <LinearGradient colors={[`${p.base}99`, 'transparent', `${p.base}66`]}
        style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} pointerEvents="none" />
    </View>
  );
}
