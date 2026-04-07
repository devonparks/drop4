import React from 'react';
import { View, ViewStyle, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../theme/colors';
import { borderRadius, spacing } from '../../theme/spacing';

/**
 * Premium card pattern used across Drop4.
 *
 *   gradient surface (8% → 3% white)
 *   1.5px border at 12% white
 *   1px top inset highlight
 *
 * Optional `accent` adds a colored top border + soft glow shadow.
 */
interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  accent?: string;          // hex color for accent border + glow
  padded?: boolean;         // adds default 16px padding
  elevated?: boolean;       // adds drop shadow
  variant?: 'default' | 'flat' | 'inset';
}

export function Card({
  children,
  style,
  accent,
  padded = true,
  elevated = false,
  variant = 'default',
}: CardProps) {
  const containerStyle: ViewStyle[] = [
    styles.container,
    padded && styles.padded,
    elevated && styles.elevated,
    accent ? {
      borderColor: `${accent}55`,
      shadowColor: accent,
      ...(Platform.OS === 'web' ? {
        boxShadow: `0 4px 16px ${accent}33`,
      } as any : {}),
    } : null,
    style,
  ].filter(Boolean) as ViewStyle[];

  if (variant === 'flat') {
    return <View style={containerStyle}>{children}</View>;
  }

  return (
    <View style={containerStyle}>
      {/* Gradient surface */}
      <LinearGradient
        colors={
          accent
            ? [`${accent}1f`, `${accent}0a`, 'rgba(255,255,255,0.02)']
            : ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.04)', 'rgba(255,255,255,0.02)']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Top inset highlight */}
      <View style={[styles.topHighlight, accent ? { backgroundColor: `${accent}66` } : null]} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: colors.surfaceRaisedBorder,
    overflow: 'hidden',
    position: 'relative',
  },
  padded: {
    padding: spacing.lg,
  },
  elevated: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  topHighlight: {
    position: 'absolute',
    top: 0,
    left: 12,
    right: 12,
    height: 1,
    backgroundColor: colors.surfaceInsetHighlight,
    borderRadius: 1,
  },
});
