import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../theme/colors';

interface SplashAnimationProps {
  onFinish?: () => void;
}

export function SplashAnimation({ onFinish }: SplashAnimationProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.7)).current;
  const taglineAnim = useRef(new Animated.Value(0)).current;

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
  }, [fadeAnim, scaleAnim, taglineAnim, onFinish]);

  return (
    <LinearGradient
      colors={[colors.bgDark, '#111b47', '#1a2766']}
      style={styles.container}
    >
      {/* Subtle glow behind logo */}
      <View style={styles.glowCircle} />

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
    shadowColor: colors.orange,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 60,
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
