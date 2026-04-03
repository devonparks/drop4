import React from 'react';
import { View, StyleSheet, ViewStyle, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface ScreenBackgroundProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'game' | 'gold';
}

const VARIANTS = {
  default: {
    colors: ['#080c22', '#0e1840', '#152060', '#1a2766'] as const,
  },
  game: {
    colors: ['#060a1e', '#0c1535', '#122050', '#182560'] as const,
  },
  gold: {
    colors: ['#1a1508', '#2d250e', '#3d3010', '#4a3a12'] as const,
  },
  bronze: {
    colors: ['#1a0f08', '#2d1a0e', '#3d2510', '#4a2e12'] as const,
  },
  silver: {
    colors: ['#0f1218', '#1a2030', '#253040', '#304050'] as const,
  },
  diamond: {
    colors: ['#081020', '#0e1a38', '#142550', '#1a3068'] as const,
  },
  darkmatter: {
    colors: ['#0a0008', '#150010', '#200018', '#2a0020'] as const,
  },
};

export function ScreenBackground({ children, style, variant = 'default' }: ScreenBackgroundProps) {
  const { colors } = VARIANTS[variant];

  return (
    <LinearGradient
      colors={[...colors]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={[styles.container, style]}
    >
      {/* Subtle radial vignette overlay */}
      <View style={styles.vignette} />

      {/* Dot pattern texture (web only — on native this is handled by the gradient) */}
      {Platform.OS === 'web' && <View style={styles.dotPattern} />}

      {/* Content */}
      <View style={styles.content}>
        {children}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  vignette: {
    ...StyleSheet.absoluteFillObject,
    // Radial vignette — darker edges
    ...(Platform.OS === 'web' ? {
      backgroundImage: 'radial-gradient(ellipse at 50% 30%, transparent 40%, rgba(0,0,0,0.4) 100%)',
    } as any : {}),
  },
  dotPattern: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.08,
    ...(Platform.OS === 'web' ? {
      backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.5) 1px, transparent 1px)',
      backgroundSize: '16px 16px',
    } as any : {}),
  },
  content: {
    flex: 1,
    zIndex: 1,
  },
});
