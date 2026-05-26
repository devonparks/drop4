import React, { useEffect, useRef } from 'react';
import { Text, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../theme/colors';

interface SplashAnimationProps {
  onFinish?: () => void;
}

export function SplashAnimation({ onFinish }: SplashAnimationProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.7)).current;
  const taglineAnim = useRef(new Animated.Value(0)).current;
  // Continuous breath on the amber glow ring. Runs in a loop after the
  // entrance lands so the splash reads as "alive" while App.tsx is
  // hydrating stores / loading fonts / pre-warming the AMG manifest —
  // can sit on screen for 1-3 s on cold starts. Without this the disc
  // pops in once and goes static, which makes the splash look frozen.
  const glowAnim = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    // Logo fades in + scales up
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 80,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Then tagline fades in
      Animated.timing(taglineAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start(() => {
        // Notify parent after animation completes
        onFinish?.();
      });
    });

    // Start the glow breath in parallel — first beat lands ~halfway
    // through the logo entrance so the disc swells up with the logo.
    const breath = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1.0, duration: 1400, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.55, duration: 1400, useNativeDriver: true }),
      ]),
    );
    breath.start();
    return () => breath.stop();
  }, [fadeAnim, scaleAnim, taglineAnim, glowAnim, onFinish]);

  return (
    <LinearGradient
      colors={[colors.bgDark, '#111b47', '#1a2766']}
      style={styles.container}
    >
      {/* Subtle glow behind logo — breathes continuously so the splash
          doesn't look frozen during async hydration. */}
      <Animated.View style={[styles.glowCircle, { opacity: glowAnim }]} />

      {/* Animated logo */}
      <Animated.View
        style={[
          styles.logoWrap,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Text style={styles.logoText}>
          DROP<Text style={styles.logo4}>4</Text>
        </Text>
      </Animated.View>

      {/* Tagline */}
      <Animated.Text style={[styles.tagline, { opacity: taglineAnim }]}>
        Stack. Connect. Dominate.
      </Animated.Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowCircle: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,140,0,0.08)',
    boxShadow: '0px 0px 60px rgba(255,140,0,0.3)',
    elevation: 0,
  },
  logoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 52,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 4,
  },
  logo4: {
    color: colors.orange,
    fontSize: 58,
  },
  tagline: {
    fontSize: 13,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 3,
    marginTop: 8,
    textTransform: 'uppercase',
  },
});
