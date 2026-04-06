import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface CoinParticleProps {
  delay: number;
  angle: number;
  speed: number;
  bigWin?: boolean;
  onDone?: () => void;
}

function CoinParticle({ delay, angle, speed, bigWin, onDone }: CoinParticleProps) {
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.4)).current;
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const vx = Math.cos(angle) * speed;
    const vy = -Math.abs(Math.sin(angle)) * speed; // Always goes up initially
    const dm = bigWin ? 1.5 : 1; // Duration multiplier for big wins

    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        // Fade in quickly
        Animated.timing(opacity, { toValue: 1, duration: 80, useNativeDriver: true }),
        // Scale up
        Animated.spring(scale, { toValue: bigWin ? 1.2 : 1, speed: 40, bounciness: bigWin ? 12 : 8, useNativeDriver: true }),
        // Horizontal drift
        Animated.timing(translateX, { toValue: vx * 1.2, duration: 700 * dm, useNativeDriver: true }),
        // Vertical: go up then come down (gravity curve)
        Animated.sequence([
          Animated.timing(translateY, { toValue: vy * 0.8, duration: 350 * dm, useNativeDriver: true }),
          Animated.timing(translateY, { toValue: vy * 0.8 + (bigWin ? 90 : 60), duration: 450 * dm, useNativeDriver: true }),
        ]),
        // Spin
        Animated.timing(rotation, { toValue: 1, duration: 700 * dm, useNativeDriver: true }),
      ]),
      // Fade out
      Animated.timing(opacity, { toValue: 0, duration: bigWin ? 200 : 100, useNativeDriver: true }),
    ]).start(() => onDone?.());

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', `${180 + Math.random() * 180}deg`],
  });

  return (
    <Animated.View style={[styles.coin, {
      opacity,
      transform: [
        { translateX },
        { translateY },
        { scale },
        { rotate: spin },
      ],
    }]}>
      <Text style={styles.coinEmoji}>&#x1FA99;</Text>
    </Animated.View>
  );
}

interface CoinBurstProps {
  visible: boolean;
  amount: number;
  onDone: () => void;
}

export function CoinBurst({ visible, amount, onDone }: CoinBurstProps) {
  if (!visible) return null;

  const isBigWin = amount >= 100;
  const coinCount = isBigWin
    ? Math.min(Math.max(8, Math.ceil(amount / 30)), 12)
    : Math.min(Math.max(3, Math.ceil(amount / 20)), 5);
  const particles = Array.from({ length: coinCount }, (_, i) => ({
    id: i,
    delay: isBigWin ? i * 40 : i * 60, // Faster cascade for big wins
    angle: -Math.PI / 2 + (Math.random() - 0.5) * (isBigWin ? 2.4 : 1.8), // Wider spread
    speed: isBigWin ? 50 + Math.random() * 70 : 40 + Math.random() * 50, // More energetic
  }));

  let doneCount = 0;
  const handleParticleDone = () => {
    doneCount++;
    if (doneCount >= coinCount) {
      onDone();
    }
  };

  return (
    <View style={styles.container} pointerEvents="none">
      {particles.map(p => (
        <CoinParticle
          key={p.id}
          delay={p.delay}
          angle={p.angle}
          speed={p.speed}
          bigWin={isBigWin}
          onDone={handleParticleDone}
        />
      ))}
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
  coin: {
    position: 'absolute',
  },
  coinEmoji: {
    fontSize: 28,
    textShadowColor: 'rgba(255,215,0,0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
});
