import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, ViewStyle, Platform, Image, ImageSourcePropType, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// AnimatedSceneImage — painted scene with slow drift + scale pulse so
// the galaxy feels alive. On WEB we use CSS keyframes (compositor-driven,
// smooth, cheap) because react-native-web's Animated + native driver
// doesn't apply transforms on regular Images. On NATIVE we use the JS
// driver since native + transform still lands.
function AnimatedSceneImage({ sceneImage, animated }: { sceneImage: ImageSourcePropType; animated: boolean }) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated || Platform.OS === 'web') return;
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 14_000, useNativeDriver: false, easing: Easing.inOut(Easing.sin) }),
        Animated.timing(pulse, { toValue: 0, duration: 14_000, useNativeDriver: false, easing: Easing.inOut(Easing.sin) }),
      ]),
    );
    pulseLoop.start();
    return () => { pulseLoop.stop(); };
  }, [animated, pulse]);

  if (Platform.OS === 'web') {
    // CSS keyframes drive the drift + scale + brightness cycle. Defined
    // once at module load in the styles block below.
    return (
      <Image
        source={sceneImage}
        style={[styles.sceneImage, animated ? styles.sceneImageAnim : null]}
        resizeMode="cover"
      />
    );
  }

  const animStyle = animated
    ? {
        transform: [
          { scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1.0, 1.06] }) },
        ],
        opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.0] }),
      }
    : {};

  return (
    <Animated.Image
      source={sceneImage}
      style={[styles.sceneImage, animStyle]}
      resizeMode="cover"
    />
  );
}

// LiveNebulaWallpaper — true multi-layer parallax live wallpaper for
// the home screen. Three independently-animated nebula planes stacked
// via mixBlendMode: screen so the bright clouds + stars composite over
// the deep starfield base with no hard edges anywhere. Each layer
// rotates + drifts at a different speed/direction so the eye never
// sees a seam and the motion never visibly loops.
//
// Layer stack (bottom → top):
//   1. nebula-back.png — deep starfield + subtle blue/purple wisps,
//      rotates 180s CW + slow scale pulse
//   2. nebula-mid.png  — magenta + cyan smoke clouds (on pure black),
//      drifts + scales 70s opposite direction, blend=screen
//   3. nebula-near.png — bright gold sparkle dust + star flares,
//      drifts + twinkles 45s, blend=screen
const NEBULA_BACK = require('../../assets/images/ui/nebula-back.png');
const NEBULA_MID = require('../../assets/images/ui/nebula-mid.png');
const NEBULA_NEAR = require('../../assets/images/ui/nebula-near.png');

function LiveNebulaWallpaper({ animated, hue = 0 }: { animated: boolean; hue?: number }) {
  // Native uses Animated transforms on JS driver for the big layers.
  // Web uses CSS keyframes registered once at module load.
  const back = useRef(new Animated.Value(0)).current;
  const mid = useRef(new Animated.Value(0)).current;
  const near = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated || Platform.OS === 'web') return;
    const mkLoop = (val: Animated.Value, ms: number) => Animated.loop(
      Animated.sequence([
        Animated.timing(val, { toValue: 1, duration: ms / 2, useNativeDriver: false, easing: Easing.inOut(Easing.sin) }),
        Animated.timing(val, { toValue: 0, duration: ms / 2, useNativeDriver: false, easing: Easing.inOut(Easing.sin) }),
      ]),
    );
    const loops = [mkLoop(back, 180_000), mkLoop(mid, 70_000), mkLoop(near, 45_000)];
    loops.forEach((l) => l.start());
    return () => { loops.forEach((l) => l.stop()); };
  }, [animated, back, mid, near]);

  if (Platform.OS === 'web') {
    // Hue-rotate filter applied on the web parent gives every layer
    // the same color shift at zero asset cost. 0deg = the painted
    // magenta/cyan palette; any other value shifts the entire stack.
    const hueWrap = hue ? ({ filter: `hue-rotate(${hue}deg)` } as any) : null;
    return (
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, hueWrap]}>
        <Image source={NEBULA_BACK} resizeMode="cover" style={[styles.nebulaLayer, styles.nebulaBackStyle, animated ? styles.nebulaBackAnim : null]} />
        <Image source={NEBULA_MID} resizeMode="cover" style={[styles.nebulaLayer, styles.nebulaMidStyle, animated ? styles.nebulaMidAnim : null]} />
        <Image source={NEBULA_NEAR} resizeMode="cover" style={[styles.nebulaLayer, styles.nebulaNearStyle, animated ? styles.nebulaNearAnim : null]} />
      </View>
    );
  }

  // Native transforms — mixBlendMode unavailable, so we emulate with
  // opacity. Still reads as depth because each layer moves differently.
  const backStyle = animated ? {
    transform: [
      { scale: back.interpolate({ inputRange: [0, 1], outputRange: [1.02, 1.08] }) },
      { rotate: back.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '3deg'] }) },
    ],
  } : {};
  const midStyle = animated ? {
    opacity: mid.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0.75] }),
    transform: [
      { scale: mid.interpolate({ inputRange: [0, 1], outputRange: [1.0, 1.06] }) },
      { translateX: mid.interpolate({ inputRange: [0, 1], outputRange: [-8, 8] }) },
      { rotate: mid.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-2deg'] }) },
    ],
  } : { opacity: 0.65 };
  const nearStyle = animated ? {
    opacity: near.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0.95] }),
    transform: [
      { translateY: near.interpolate({ inputRange: [0, 1], outputRange: [-10, 10] }) },
    ],
  } : { opacity: 0.75 };

  return (
    <>
      <Animated.Image source={NEBULA_BACK} resizeMode="cover" style={[styles.nebulaLayer, styles.nebulaBackStyle, backStyle]} />
      <Animated.Image source={NEBULA_MID} resizeMode="cover" style={[styles.nebulaLayer, styles.nebulaMidStyle, midStyle]} />
      <Animated.Image source={NEBULA_NEAR} resizeMode="cover" style={[styles.nebulaLayer, styles.nebulaNearStyle, nearStyle]} />
    </>
  );
}

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
  /** Render the live nebula wallpaper on ANY screen, not just home.
   *  When true, the LiveNebulaWallpaper 3-layer parallax replaces the
   *  single painted scene PNG. Hue shift (web only) tints the whole
   *  stack so each tab gets a themed palette without regenerating art.
   *  Default hue is 0 = the magenta/cyan painted palette. */
  liveWallpaper?: boolean;
  /** CSS hue-rotate in degrees applied to the live wallpaper layers
   *  (web only). 0=magenta/cyan, 30=warm pink, 60=orange/gold,
   *  120=teal/green, 180=cyan/blue, 240=blue/purple, 300=pink/purple. */
  nebulaHue?: number;
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
  liveWallpaper,
  nebulaHue = 0,
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
      {/* Backdrop layer:
          - scene='home' or liveWallpaper=true → 3-layer animated
            LiveNebulaWallpaper (back sky + mid clouds + near sparkles)
            with optional hue shift for per-tab theming
          - Otherwise, the single painted scene image */}
      {(scene === 'home' || liveWallpaper) ? (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <LiveNebulaWallpaper animated={animated} hue={nebulaHue} />
          <View pointerEvents="none" style={styles.sceneEdgeFeather} />
        </View>
      ) : sceneImage && (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <AnimatedSceneImage
            sceneImage={sceneImage}
            animated={animated}
          />
          <View pointerEvents="none" style={styles.sceneEdgeFeather} />
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
    // Brightness bump — the painted galaxy IS the hero. Set to full
    // opacity so the art reads as painted intended.
    opacity: 1,
  },
  sceneImageAnim: Platform.OS === 'web' ? ({
    animationName: 'drop4SceneDrift',
    animationDuration: '28s',
    animationTimingFunction: 'ease-in-out',
    animationIterationCount: 'infinite',
    willChange: 'transform, opacity',
  } as any) : null,
  // ── Live nebula wallpaper layers ──────────────────────────────────
  // Each layer is a full-screen Image stacked in absoluteFill. The
  // _Anim variants attach a CSS keyframe animation on web. On native,
  // the component file applies Animated transforms directly.
  nebulaLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  nebulaBackStyle: {
    // Deep starfield — fully opaque, it's the base.
    opacity: 1,
  },
  nebulaBackAnim: Platform.OS === 'web' ? ({
    animationName: 'drop4NebulaBack',
    animationDuration: '180s',
    animationTimingFunction: 'linear',
    animationIterationCount: 'infinite',
    willChange: 'transform',
  } as any) : null,
  nebulaMidStyle: {
    // Magenta + cyan cloud wisps painted on black bg. `screen` blend
    // mode makes black pixels transparent at the compositor level, so
    // only the bright nebula wisps composite onto the layer below.
    opacity: 0.75,
    ...(Platform.OS === 'web' ? ({ mixBlendMode: 'screen' } as any) : {}),
  },
  nebulaMidAnim: Platform.OS === 'web' ? ({
    animationName: 'drop4NebulaMid',
    animationDuration: '70s',
    animationTimingFunction: 'ease-in-out',
    animationIterationCount: 'infinite',
    willChange: 'transform, opacity',
  } as any) : null,
  nebulaNearStyle: {
    // Sparkle dust — bright star flares on black bg. Same screen blend
    // trick so only the stars punch through the clouds below.
    opacity: 0.8,
    ...(Platform.OS === 'web' ? ({ mixBlendMode: 'screen' } as any) : {}),
  },
  nebulaNearAnim: Platform.OS === 'web' ? ({
    animationName: 'drop4NebulaNear',
    animationDuration: '45s',
    animationTimingFunction: 'ease-in-out',
    animationIterationCount: 'infinite',
    willChange: 'transform, opacity',
  } as any) : null,
  // Horizontal edge feather — dark bands fading in from each side so
  // painted scene PNGs that get cropped by `resizeMode: cover` don't
  // show hard horizontal cuts. Also gives every screen a subtle
  // letterbox feel that reads premium.
  sceneEdgeFeather: {
    ...StyleSheet.absoluteFillObject,
    ...(Platform.OS === 'web' ? ({
      backgroundImage: 'linear-gradient(to right, rgba(5,5,32,0.85) 0%, rgba(5,5,32,0) 12%, rgba(5,5,32,0) 88%, rgba(5,5,32,0.85) 100%)',
    } as any) : {}),
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
    animationName: 'drop4BgDriftA',
    animationDuration: '120s',
    animationTimingFunction: 'linear',
    animationIterationCount: 'infinite',
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
    animationName: 'drop4BgDriftB',
    animationDuration: '85s',
    animationTimingFunction: 'linear',
    animationIterationCount: 'infinite',
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
    animationName: 'drop4BgDriftC',
    animationDuration: '160s',
    animationTimingFunction: 'linear',
    animationIterationCount: 'infinite',
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
      @keyframes drop4SceneDrift {
        0%   { transform: scale(1.04) translateX(-12px); opacity: 0.92; }
        50%  { transform: scale(1.08) translateX(12px);  opacity: 1.00; }
        100% { transform: scale(1.04) translateX(-12px); opacity: 0.92; }
      }
      @keyframes drop4NebulaBack {
        0%   { transform: scale(1.04) rotate(0deg); }
        50%  { transform: scale(1.08) rotate(2deg); }
        100% { transform: scale(1.04) rotate(0deg); }
      }
      @keyframes drop4NebulaMid {
        0%   { transform: scale(1.05) translate(-10px, 0px) rotate(0deg); opacity: 0.55; }
        25%  { transform: scale(1.08) translate(5px, -8px) rotate(-1.5deg); opacity: 0.75; }
        50%  { transform: scale(1.10) translate(12px, 6px) rotate(1deg);  opacity: 0.85; }
        75%  { transform: scale(1.07) translate(-4px, 10px) rotate(0.5deg); opacity: 0.70; }
        100% { transform: scale(1.05) translate(-10px, 0px) rotate(0deg); opacity: 0.55; }
      }
      @keyframes drop4NebulaNear {
        0%   { transform: translate(0px, 0px); opacity: 0.65; }
        25%  { transform: translate(8px, -6px); opacity: 0.95; }
        50%  { transform: translate(-4px, 10px); opacity: 0.75; }
        75%  { transform: translate(-10px, -4px); opacity: 1.00; }
        100% { transform: translate(0px, 0px); opacity: 0.65; }
      }
    `;
    document.head.appendChild(el);
  }
}
