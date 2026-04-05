import React, { useCallback } from 'react';
import { Pressable, Text, View, StyleSheet, ViewStyle, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { haptics } from '../../services/haptics';
import { fonts, weight } from '../../theme/typography';
import { borderRadius } from '../../theme/spacing';

type ButtonVariant = 'orange' | 'green' | 'purple' | 'teal' | 'red' | 'gold' | 'navy';

const GRADIENT_MAP: Record<ButtonVariant, {
  top: string;
  main: string;
  dark: string;
  glow: string;
}> = {
  orange: { top: '#ffbe5c', main: '#ff8c00', dark: '#b86200', glow: 'rgba(255,140,0,0.4)' },
  green:  { top: '#5de675', main: '#27ae3d', dark: '#1a7a2a', glow: 'rgba(39,174,61,0.4)' },
  purple: { top: '#c98ade', main: '#9b59b6', dark: '#6d3d80', glow: 'rgba(155,89,182,0.4)' },
  teal:   { top: '#5ae8c8', main: '#1abc9c', dark: '#12876f', glow: 'rgba(26,188,156,0.4)' },
  red:    { top: '#ff8a7a', main: '#e74c3c', dark: '#a33529', glow: 'rgba(231,76,60,0.4)' },
  gold:   { top: '#ffe066', main: '#f1c40f', dark: '#b8960a', glow: 'rgba(241,196,15,0.4)' },
  navy:   { top: '#3a5080', main: '#1a2744', dark: '#0d1525', glow: 'rgba(26,39,68,0.3)' },
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
  small?: boolean;
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
  small = false,
}: GlossyButtonProps) {
  const handlePress = useCallback(() => {
    haptics.tap();
    onPress();
  }, [onPress]);

  const colors = GRADIENT_MAP[variant];
  const minH = small ? 40 : 50;

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      style={({ pressed }) => [
        disabled && { opacity: 0.5 },
        pressed && { opacity: 0.8 },
        style,
      ]}
    >
      <View style={[styles.outerGlow, {
        shadowColor: colors.glow,
        ...(Platform.OS === 'web' ? {
          boxShadow: `0 4px 20px ${colors.glow}, 0 2px 8px rgba(0,0,0,0.3)`,
        } as any : {}),
      }]}>
        {/* Main button body */}
        <LinearGradient
          colors={[colors.top, colors.main, colors.dark]}
          locations={[0, 0.5, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[styles.gradient, { minHeight: minH }]}
        >
          {/* Content */}
          <View style={styles.content}>
            {icon && <Text style={[styles.icon, small && { fontSize: 20 }]}>{icon}</Text>}
            <View style={styles.textWrap}>
              <Text style={[styles.label, small && styles.labelSmall]}>{label}</Text>
              {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
            </View>
            {iconRight && <Text style={[styles.iconRight, small && { fontSize: 18 }]}>{iconRight}</Text>}
          </View>
        </LinearGradient>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  outerGlow: {
    borderRadius: borderRadius.xl + 2,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 10,
    overflow: 'hidden',
  },
  bottomEdge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '100%',
    borderRadius: borderRadius.xl,
    transform: [{ translateY: 4 }],
  },
  gradient: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    justifyContent: 'center',
    position: 'relative',
  },
  gloss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '55%',
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
  },
  topHighlight: {
    position: 'absolute',
    top: 1,
    left: 12,
    right: 12,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 1,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  textWrap: {
    alignItems: 'center',
  },
  label: {
    fontFamily: fonts.body,
    fontWeight: weight.extrabold,
    fontSize: 18,
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: 2,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  labelSmall: {
    fontSize: 16,
    letterSpacing: 1,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontWeight: weight.medium,
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 1,
  },
  icon: {
    fontSize: 24,
  },
  iconRight: {
    fontSize: 22,
    marginLeft: 2,
  },
});
