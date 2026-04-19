import React, { useCallback } from 'react';
import { Pressable, Text, View, StyleSheet, ViewStyle, Platform, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { haptics } from '../../services/haptics';
import { playSound } from '../../services/audio';
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
  /** Optional painted background (e.g. Flux-generated mode-card art). When
   *  provided, renders as the base layer with the variant gradient overlaid
   *  at reduced opacity for text legibility. */
  bgImage?: any;
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
  bgImage,
}: GlossyButtonProps) {
  // Press-scale feedback — shared across all ~40 GlossyButton sites in the
  // app. Scales to 0.96 on press-in (snappy timing), springs back to 1 on
  // release. Plays a click sound on release for tactile audio feedback.
  const scale = useSharedValue(1);
  const pressAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const onPressIn = useCallback(() => {
    if (disabled) return;
    scale.value = withTiming(0.96, { duration: 80 });
  }, [disabled, scale]);
  const onPressOut = useCallback(() => {
    if (disabled) return;
    scale.value = withSpring(1, { damping: 14, stiffness: 280 });
  }, [disabled, scale]);

  const handlePress = useCallback(() => {
    if (disabled) return;
    haptics.tap();
    playSound('click');
    onPress();
  }, [disabled, onPress]);

  const colors = GRADIENT_MAP[variant];
  const minH = small ? 40 : 50;

  const buttonContent = (
    <View style={[styles.outerGlow, {
      shadowColor: colors.glow,
      ...(Platform.OS === 'web' ? {
        boxShadow: `0 4px 20px ${colors.glow}, 0 2px 8px rgba(0,0,0,0.3)`,
      } as any : {}),
    }]}>
      <View style={[styles.gradient, { minHeight: minH, overflow: 'hidden' }]}>
        {/* Painted background (Flux-generated). When present, the gradient
            above drops to a thin vignette overlay for text legibility. */}
        {bgImage && (
          <Image
            source={bgImage}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
        )}
        <LinearGradient
          colors={
            bgImage
              ? [colors.top + 'cc', colors.main + '88', colors.dark + 'cc']
              : [colors.top, colors.main, colors.dark]
          }
          locations={[0, 0.5, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[StyleSheet.absoluteFill]}
        />
        <View style={styles.content}>
          {icon && <Text style={[styles.icon, small && { fontSize: 20 }]}>{icon}</Text>}
          <View style={styles.textWrap}>
            <Text style={[styles.label, small && styles.labelSmall]}>{label}</Text>
            {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          </View>
          {iconRight && <Text style={[styles.iconRight, small && { fontSize: 18 }]}>{iconRight}</Text>}
        </View>
      </View>
    </View>
  );

  // On native, use Pressable which handles touch events properly.
  // On web, Pressable's responder system fails with deeply nested children
  // (LinearGradient), so we use both a transparent Pressable overlay AND
  // an onClick on the wrapper View (for Modals where the overlay can fail).
  const webClickProps = Platform.OS === 'web' && !disabled
    ? { onClick: handlePress, style: { cursor: 'pointer' } as any }
    : {};

  return (
    <Animated.View {...webClickProps} style={[disabled && { opacity: 0.5 }, style, pressAnimStyle]}>
      {buttonContent}
      <Pressable
        onPress={handlePress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={disabled}
        style={[StyleSheet.absoluteFill, { zIndex: 10 }]}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={subtitle}
        accessibilityState={{ disabled: !!disabled }}
      />
    </Animated.View>
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
  gradient: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    justifyContent: 'center',
    position: 'relative',
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
