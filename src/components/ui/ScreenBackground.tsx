import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, ViewStyle, Platform, Image, ImageSourcePropType, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// ═══════════════════════════════════════════════════════════════════════
// ScreenBackground — painted atmosphere + live-wallpaper motion
//
// Layer order (bottom → top):
//   1. LinearGradient (the 4-stop base color)
//   2. Painted scene PNG (40% opacity, static art)
//   3. Radial vignette (CSS, web only)
//   4. Drifting star fields (CSS backgroundPosition animated on web)
//   5. Breathing radial glow spots (cross-platform Animated.View pulses)
//   6. Content
//
// The breathing-glow layer gives EVERY screen a gentle pulse even on
// native. Pass `animated={false}` to opt out (for static legal/modal
// screens where motion would be distracting).
// ═══════════════════════════════════════════════════════════════════════

const SCENE_IMAGES: Record<string, ImageSourcePropType> = {
  home: require('../../assets/images/ui/bg-home.png'),
  shop: require('../../assets/images/ui/bg-shop.png'),
  career: require('../../assets/images/ui/bg-career.png'),
  profile: require('../../assets/images/ui/bg-profile.png'),
  challenges: require('../../assets/images/ui/bg-challenges.png'),
  play: require('../../assets/images/ui/bg-play.png'),
  matchup: require('../../assets/images/ui/bg-matchup.png'),
};

interface ScreenBackgroundProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'game' | 'gold';
  /** Optional painted scene. When set, renders the matching PNG at ~40%
   *  opacity behind the gradient so each screen has its own atmosphere.
   *  Accepted values: 'home', 'shop', 'career', 'profile',
   *  'challenges', 'play', 'matchup'. */
  scene?: keyof typeof SCENE_IMAGES;
  /** Live-wallpaper motion toggle. Defaults to true — every screen gets
   *  drifting stars (web) + breathing glow orbs (all platforms). Opt
   *  out with `animated={false}` for static contexts. */
  animated?: boolean;
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

export function ScreenBackground({
  children,
  style,
  variant = 'default',
  scene,
  animated = true,
}: ScreenBackgroundProps) {
  const { colors } = VARIANTS[variant];
  const sceneImage = scene ? SCENE_IMAGES[scene] : null;

  // Breathing-glow drivers. Two independent orbs pulsing on different
  // periods (11s + 17s) + phases, so the composite effect never loops
  // visibly — feels alive rather than mechanical. Runs on native driver
  // for free (no JS thread work per frame) when Reanimated isn't
  // available for this surface.
  const pulseA = useRef(new Animated.Value(0)).current;
  const pulseB = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated) return;
    const loopA = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseA, { toValue: 1, duration: 5500, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
        Animated.timing(pulseA, { toValue: 0, duration: 5500, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
      ]),
    );
    const loopB = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseB, { toValue: 1, duration: 8500, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
        Animated.timing(pulseB, { toValue: 0, duration: 8500, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
      ]),
    );
    loopA.start();
    loopB.start();
    return () => {
      loopA.stop();
      loopB.stop();
    };
  }, [animated, pulseA, pulseB]);

  const orbAStyle = {
    opacity: pulseA.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0.42] }),
    transform: [
      { scale: pulseA.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.08] }) },
    ],
  };
  const orbBStyle = {
    opacity: pulseB.interpolate({ inputRange: [0, 1], outputRange: [0.12, 0.32] }),
    transform: [
      { scale: pulseB.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1.12] }) },
    ],
  };

  return (
    <LinearGradient
      colors={[...colors]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={[styles.container, style]}
    >
      {/* Painted scene — primary atmosphere when a scene prop is set. */}
      {sceneImage && (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <Image
            source={sceneImage}
            style={styles.sceneImage}
            resizeMode="cover"
          />
        </View>
      )}

      {/* Subtle radial vignette overlay */}
      <View style={styles.vignette} />

      {/* Drifting star field (web only — the CSS backgroundPosition
          shift runs on the compositor so it's basically free). Three
          layers at different speeds + parallax directions give the
          illusion of depth without touching JS every frame. */}
      {Platform.OS === 'web' && !sceneImage && (
        <>
          <View style={[styles.starField, animated ? styles.starFieldAnim : null]} />
          <View style={[styles.starFieldSmall1, animated ? styles.starFieldSmall1Anim : null]} />
          <View style={[styles.starFieldSmall2, animated ? styles.starFieldSmall2Anim : null]} />
        </>
      )}

      {/* Breathing glow orbs — cross-platform. Positioned at roughly
          thirds so the composite vignette doesn't stack them. Colors
          differ so the overall hue shifts subtly over the full cycle. */}
      {animated && (
        <>
          <Animated.View pointerEvents="none" style={[styles.orbA, orbAStyle]} />
          <Animated.View pointerEvents="none" style={[styles.orbB, orbBStyle]} />
        </>
      )}

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
    overflow: 'hidden',
  },
  sceneImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.45,
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
  starFieldAnim: Platform.OS === 'web' ? ({
    // Diagonal down-right drift; 120s for a full 200px pass. Matches a
    // very slow parallax that the eye registers as "alive" rather than
    // "moving." All three layers drift in loosely different directions
    // to create depth.
    animation: 'drop4BgDriftA 120s linear infinite',
  } as any) : null,
  starFieldSmall1: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.15,
    ...(Platform.OS === 'web' ? {
      backgroundImage: 'radial-gradient(circle, rgba(200,220,255,0.7) 0.3px, transparent 0.3px)',
      backgroundSize: '25px',
    } as any : {}),
  },
  starFieldSmall1Anim: Platform.OS === 'web' ? ({
    animation: 'drop4BgDriftB 85s linear infinite',
  } as any) : null,
  starFieldSmall2: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.15,
    ...(Platform.OS === 'web' ? {
      backgroundImage: 'radial-gradient(circle, rgba(255,200,255,0.4) 0.2px, transparent 0.2px)',
      backgroundSize: '39px',
    } as any : {}),
  },
  starFieldSmall2Anim: Platform.OS === 'web' ? ({
    animation: 'drop4BgDriftC 160s linear infinite',
  } as any) : null,
  // Breathing glow orbs — large soft radial gradients sized to fill
  // ~60% of the viewport, positioned off-screen so only the glow edge
  // reaches the visible area. The scale/opacity animation makes them
  // look like they're slowly inhaling and exhaling.
  orbA: {
    position: 'absolute',
    top: '-20%',
    left: '-10%',
    width: '70%',
    height: '55%',
    borderRadius: 9999,
    backgroundColor: '#7a3aff',
    ...(Platform.OS === 'web' ? {
      filter: 'blur(60px)',
    } as any : {}),
  },
  orbB: {
    position: 'absolute',
    bottom: '-15%',
    right: '-10%',
    width: '65%',
    height: '50%',
    borderRadius: 9999,
    backgroundColor: '#ff7a3a',
    ...(Platform.OS === 'web' ? {
      filter: 'blur(80px)',
    } as any : {}),
  },
  content: {
    flex: 1,
    zIndex: 1,
  },
});

// Web-only keyframes. Injected once at module load so every mount of
// ScreenBackground inherits the animations without each screen needing
// its own <style> tag. Safe to call repeatedly — createElement replaces
// the existing <style> if it's already in the DOM. On native the block
// is skipped entirely.
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const STYLE_ID = 'drop4-bg-keyframes';
  if (!document.getElementById(STYLE_ID)) {
    const el = document.createElement('style');
    el.id = STYLE_ID;
    el.textContent = `
      @keyframes drop4BgDriftA { from { background-position: 0 0; } to { background-position: 200px 200px; } }
      @keyframes drop4BgDriftB { from { background-position: 0 0; } to { background-position: -150px 100px; } }
      @keyframes drop4BgDriftC { from { background-position: 0 0; } to { background-position: 100px -250px; } }
    `;
    document.head.appendChild(el);
  }
}
