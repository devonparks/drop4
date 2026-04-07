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
    colors: ['#050520', '#0a1040', '#121a55', '#1a2266'] as const,
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

      {/* Star field texture (web only) */}
      {Platform.OS === 'web' && <View style={styles.starField} />}
      {Platform.OS === 'web' && <View style={styles.starFieldSmall1} />}
      {Platform.OS === 'web' && <View style={styles.starFieldSmall2} />}

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
    ...(Platform.OS === 'web' ? {
      backgroundImage: [
        'radial-gradient(ellipse at 50% 20%, rgba(60,40,120,0.3) 0%, transparent 60%)',
        'radial-gradient(ellipse at 30% 70%, rgba(20,40,100,0.2) 0%, transparent 50%)',
        'radial-gradient(ellipse at 70% 50%, rgba(40,20,80,0.15) 0%, transparent 50%)',
        'radial-gradient(ellipse at 50% 50%, transparent 30%, rgba(0,0,0,0.5) 100%)',
      ].join(', '),
    } as any : {}),
  },
  starField: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.25,
    ...(Platform.OS === 'web' ? {
      backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.9) 0.5px, transparent 0.5px)',
      backgroundSize: '50px',
    } as any : {}),
  },
  starFieldSmall1: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.15,
    ...(Platform.OS === 'web' ? {
      backgroundImage: 'radial-gradient(circle, rgba(200,220,255,0.7) 0.3px, transparent 0.3px)',
      backgroundSize: '25px',
    } as any : {}),
  },
  starFieldSmall2: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.15,
    ...(Platform.OS === 'web' ? {
      backgroundImage: 'radial-gradient(circle, rgba(255,200,255,0.4) 0.2px, transparent 0.2px)',
      backgroundSize: '39px',
    } as any : {}),
  },
  content: {
    flex: 1,
    zIndex: 1,
  },
});
