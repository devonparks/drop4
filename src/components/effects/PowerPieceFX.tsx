import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

type PowerType = 'bomb' | 'rainbow' | 'heavy';

interface ParticleConfig {
  id: number;
  delay: number;
  angle: number;
  speed: number;
  emoji: string;
  size: number;
}

function Particle({ delay, angle, speed, emoji, size, onDone }: ParticleConfig & { onDone?: () => void }) {
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.2)).current;

  useEffect(() => {
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;

    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 60, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, speed: 50, bounciness: 10, useNativeDriver: true }),
        Animated.timing(translateX, { toValue: vx, duration: 600, useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(translateY, { toValue: vy * 0.7, duration: 300, useNativeDriver: true }),
          Animated.timing(translateY, { toValue: vy * 0.7 + 40, duration: 300, useNativeDriver: true }),
        ]),
      ]),
      Animated.timing(opacity, { toValue: 0, duration: 150, useNativeDriver: true }),
    ]).start(() => onDone?.());
  }, []);

  return (
    <Animated.View style={{
      position: 'absolute',
      opacity,
      transform: [{ translateX }, { translateY }, { scale }],
    }}>
      <Text style={{ fontSize: size }}>{emoji}</Text>
    </Animated.View>
  );
}

function FlashRing({ color, duration }: { color: string; duration: number }) {
  const scale = useRef(new Animated.Value(0.3)).current;
  const opacity = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(scale, { toValue: 3, duration, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{
      position: 'absolute',
      width: 60,
      height: 60,
      borderRadius: 30,
      borderWidth: 3,
      borderColor: color,
      opacity,
      transform: [{ scale }],
    }} />
  );
}

const CONFIGS: Record<PowerType, { emojis: string[]; ringColor: string; label: string; labelColor: string }> = {
  bomb: { emojis: ['💥', '🔥', '✨', '💣'], ringColor: '#ff4444', label: 'BOOM!', labelColor: '#ff4444' },
  rainbow: { emojis: ['🌈', '✨', '💎', '⭐'], ringColor: '#a855f7', label: 'RAINBOW!', labelColor: '#a855f7' },
  heavy: { emojis: ['💪', '⚡', '💫', '🔨'], ringColor: '#3b82f6', label: 'CRUSH!', labelColor: '#3b82f6' },
};

interface PowerPieceFXProps {
  type: PowerType;
  visible: boolean;
  onDone: () => void;
}

export function PowerPieceFX({ type, visible, onDone }: PowerPieceFXProps) {
  const labelScale = useRef(new Animated.Value(0)).current;
  const labelOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    Animated.sequence([
      Animated.parallel([
        Animated.spring(labelScale, { toValue: 1.3, speed: 30, bounciness: 15, useNativeDriver: true }),
        Animated.timing(labelOpacity, { toValue: 1, duration: 100, useNativeDriver: true }),
      ]),
      Animated.delay(300),
      Animated.parallel([
        Animated.timing(labelScale, { toValue: 0.8, duration: 200, useNativeDriver: true }),
        Animated.timing(labelOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]),
    ]).start();
  }, [visible]);

  if (!visible) return null;

  const config = CONFIGS[type];
  const particles: ParticleConfig[] = Array.from({ length: 10 }, (_, i) => ({
    id: i,
    delay: i * 30,
    angle: (Math.PI * 2 * i) / 10 + (Math.random() - 0.5) * 0.5,
    speed: 35 + Math.random() * 45,
    emoji: config.emojis[i % config.emojis.length],
    size: 16 + Math.random() * 12,
  }));

  let doneCount = 0;
  const handleDone = () => {
    doneCount++;
    if (doneCount >= particles.length) onDone();
  };

  return (
    <View style={styles.container} pointerEvents="none">
      <FlashRing color={config.ringColor} duration={500} />
      <FlashRing color={config.ringColor} duration={700} />
      {particles.map(p => (
        <Particle key={p.id} {...p} onDone={handleDone} />
      ))}
      <Animated.Text style={[
        styles.label,
        { color: config.labelColor, opacity: labelOpacity, transform: [{ scale: labelScale }] },
      ]}>
        {config.label}
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  label: {
    position: 'absolute',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 3,
    textShadow: '0px 0px 16px rgba(0,0,0,0.8)',
  },
});
