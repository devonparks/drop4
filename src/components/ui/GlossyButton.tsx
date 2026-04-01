import React, { useCallback, useState } from 'react';
import { TouchableOpacity, Text, View, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { haptics } from '../../services/haptics';
import { fonts, weight } from '../../theme/typography';
import { borderRadius } from '../../theme/spacing';

type ButtonVariant = 'orange' | 'green' | 'purple' | 'teal' | 'red' | 'gold' | 'navy';

const GRADIENT_MAP: Record<ButtonVariant, [string, string, string]> = {
  orange: ['#ffa733', '#ff8c00', '#cc7000'],
  green:  ['#34c94d', '#27ae3d', '#1e8a30'],
  purple: ['#b06cc7', '#9b59b6', '#7d4192'],
  teal:   ['#2dd4ad', '#1abc9c', '#15967d'],
  red:    ['#f06050', '#e74c3c', '#c0392b'],
  gold:   ['#f4d03f', '#f1c40f', '#d4ac0d'],
  navy:   ['#2a3d6b', '#1a2744', '#0f1a30'],
};

interface GlossyButtonProps {
  label: string;
  subtitle?: string;
  variant?: ButtonVariant;
  icon?: string;
  iconRight?: string;
  onPress: () => void;
  style?: ViewStyle;
  disabled?: boolean;
}

export function GlossyButton({
  label,
  subtitle,
  variant = 'orange',
  icon,
  iconRight,
  onPress,
  style,
  disabled = false,
}: GlossyButtonProps) {
  const handlePress = useCallback(() => {
    haptics.tap();
    onPress();
  }, [onPress]);

  const gradientColors = GRADIENT_MAP[variant];

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.85}
      disabled={disabled}
      style={disabled ? { opacity: 0.5 } : undefined}
    >
      {/* Outer shadow layer */}
      <View style={[styles.shadowWrap, style]}>
        {/* Main gradient body */}
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.gradient}
        >
          {/* Top glossy highlight */}
          <LinearGradient
            colors={['rgba(255,255,255,0.35)', 'rgba(255,255,255,0.05)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.gloss}
          />

          {/* Content row */}
          <View style={styles.content}>
            {icon && <Text style={styles.icon}>{icon}</Text>}
            <View style={styles.textWrap}>
              <Text style={styles.label}>{label}</Text>
              {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
            </View>
            {iconRight && <Text style={styles.iconRight}>{iconRight}</Text>}
          </View>
        </LinearGradient>

        {/* Bottom edge (3D depth) */}
        <View style={[styles.bottomEdge, { backgroundColor: gradientColors[2] }]} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  shadowWrap: {
    borderRadius: borderRadius.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  gradient: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    minHeight: 64,
    justifyContent: 'center',
  },
  gloss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 12,
  },
  textWrap: {
    alignItems: 'center',
  },
  label: {
    fontFamily: fonts.body,
    fontWeight: weight.extrabold,
    fontSize: 22,
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontWeight: weight.medium,
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  icon: {
    fontSize: 28,
  },
  iconRight: {
    fontSize: 24,
    marginLeft: 4,
  },
  bottomEdge: {
    height: 5,
    borderBottomLeftRadius: borderRadius.xl,
    borderBottomRightRadius: borderRadius.xl,
    marginTop: -5,
  },
});
