/**
 * CosmeticPreviews — small painted preview primitives shared across
 * Shop and Customize-side surfaces (EquipPanel etc.).
 *
 * Extracted from ShopScreen on 2026-05-03 so the new Customize-tab
 * EquipPanel can render the same painted thumbnails the Shop used to
 * show for piece skins, drop effects, win animations, and board
 * accessories. The Shop has since been gutted of cosmetic tabs (deals +
 * bags only) so these primitives are now primarily used by the
 * Customize EquipPanel — but they also remain reusable from the deal
 * carousel if a featured deal lands on a piece/effect/win item.
 *
 * What's here:
 *   • PremiumPiece — glossy plastic disc, used for piece skins.
 *   • EFFECT_PREVIEW_CONFIGS — per-id config dict (bg gradient, icon,
 *     accent color, optional particles) covering all drop effects, win
 *     animations, and board accessories/frames.
 *   • EffectPreviewCard — render a config as a 2D painted card with
 *     accent halo + center icon + drifting particle glyphs + bottom
 *     accent line.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// ─── Premium piece disc ───────────────────────────────────────────
// Glossy plastic Connect-4 disc with a soft inner highlight so it
// reads as a real game piece, not a flat colored circle.
export function PremiumPiece({ color, size = 30 }: { color: string; size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.45)',
        shadowColor: color,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.9,
        shadowRadius: 8,
        elevation: 6,
        overflow: 'hidden',
      }}
    >
      {/* Inner gloss highlight */}
      <View
        style={{
          position: 'absolute',
          top: size * 0.13,
          left: size * 0.23,
          width: size * 0.4,
          height: size * 0.33,
          borderRadius: size * 0.33,
          backgroundColor: 'rgba(255,255,255,0.55)',
          transform: [{ rotate: '-20deg' }],
        }}
      />
    </View>
  );
}

// ─── Effect / Win / Frame preview config ──────────────────────────
export interface EffectPreviewConfig {
  bg: [string, string];
  icon: string;
  accentColor: string;
  particles?: string[];
}

export const EFFECT_PREVIEW_CONFIGS: Record<string, EffectPreviewConfig> = {
  // Drop effects
  none:             { bg: ['#1a1a2e', '#0e0e1a'], icon: '—', accentColor: '#555' },
  sparks:           { bg: ['#2a1800', '#1a0e00'], icon: '✨', accentColor: '#f4a623', particles: ['⚡', '✦'] },
  smoke:            { bg: ['#1a1a22', '#0e0e14'], icon: '\u{1F4A8}', accentColor: '#8892b0', particles: ['☁️'] },
  splash:           { bg: ['#001a2e', '#000e1a'], icon: '\u{1F4A7}', accentColor: '#3498db', particles: ['\u{1F4A6}'] },
  lightning:        { bg: ['#1a1a00', '#0e0e00'], icon: '⚡', accentColor: '#f1c40f', particles: ['⚡', '✦', '⚡'] },
  confetti:         { bg: ['#1a0022', '#0e0014'], icon: '\u{1F38A}', accentColor: '#e84393', particles: ['\u{1F389}', '\u{1F38A}'] },
  shockwave:        { bg: ['#001a1a', '#000e0e'], icon: '\u{1F4A5}', accentColor: '#1abc9c', particles: ['◎', '◉'] },
  fireball:         { bg: ['#2a0800', '#1a0400'], icon: '\u{1F525}', accentColor: '#e74c3c', particles: ['\u{1F525}', '\u{1F4A5}'] },
  portal:           { bg: ['#0a001a', '#06000e'], icon: '\u{1F300}', accentColor: '#9b59b6', particles: ['✦', '\u{1F300}'] },
  plasma:           { bg: ['#001a2a', '#000e1a'], icon: '⚡', accentColor: '#00d4ff', particles: ['⚡', '✦', '⚡'] },
  darkmatter_drop:  { bg: ['#1a0020', '#0e0014'], icon: '\u{1F573}️', accentColor: '#e94560', particles: ['✦', '✦'] },
  darkmatter_trail: { bg: ['#1a0020', '#0e0014'], icon: '\u{1F4AB}', accentColor: '#e94560', particles: ['✦', '✦', '✦'] },
  // Win animations
  basic:            { bg: ['#1a1a2e', '#0e0e1a'], icon: '✓', accentColor: '#27ae3d' },
  fireworks:        { bg: ['#0a0a1e', '#06061a'], icon: '\u{1F386}', accentColor: '#f39c12', particles: ['✦', '\u{1F387}', '✦'] },
  lightning_strike: { bg: ['#1a1a00', '#0e0e00'], icon: '⚡', accentColor: '#f1c40f', particles: ['⚡', '⚡'] },
  gold_rain:        { bg: ['#1a1400', '#0e0a00'], icon: '\u{1FA99}', accentColor: '#ffd700', particles: ['\u{1FA99}', '✦', '\u{1FA99}'] },
  nuke:             { bg: ['#1a0000', '#0e0000'], icon: '☢️', accentColor: '#e74c3c', particles: ['\u{1F4A5}', '\u{1F525}'] },
  meteor:           { bg: ['#1a0800', '#0e0400'], icon: '☄️', accentColor: '#ff6b35', particles: ['☄️', '✦'] },
  black_hole:       { bg: ['#0a001a', '#06000e'], icon: '\u{1F573}️', accentColor: '#9b59b6', particles: ['✦', '\u{1F300}', '✦'] },
  darkmatter_win:   { bg: ['#1a0020', '#0e0014'], icon: '\u{1F441}️', accentColor: '#e94560', particles: ['✦', '✦', '✦'] },
  // Board accessories / frames
  flames:           { bg: ['#2a0800', '#1a0400'], icon: '\u{1F525}', accentColor: '#e74c3c', particles: ['\u{1F525}'] },
  vines:            { bg: ['#001a0a', '#000e06'], icon: '\u{1F33F}', accentColor: '#2ecc71', particles: ['✦', '\u{1F33F}'] },
  chains:           { bg: ['#1a1400', '#0e0a00'], icon: '⛓️', accentColor: '#ffd700', particles: ['✦'] },
  circuit:          { bg: ['#001a2a', '#000e1a'], icon: '\u{1F50C}', accentColor: '#00d4ff', particles: ['◎', '◉'] },
  darkmatter_frame: { bg: ['#1a0020', '#0e0014'], icon: '\u{1F573}️', accentColor: '#e94560', particles: ['✦', '✦'] },
};

// ─── Painted preview card ─────────────────────────────────────────
// Background gradient + radial accent glow + center icon + floating
// particle glyphs + bottom accent line. Pure RN Views, no asset deps.
export function EffectPreviewCard({
  config,
  width,
  height,
}: {
  config: EffectPreviewConfig;
  width: number;
  height: number;
}) {
  return (
    <View style={{ width, height, overflow: 'hidden', borderRadius: 6 }}>
      <LinearGradient colors={config.bg} style={StyleSheet.absoluteFill} />
      {/* Accent glow */}
      <View
        style={{
          position: 'absolute',
          left: width * 0.2,
          top: height * 0.15,
          width: width * 0.6,
          height: height * 0.7,
          borderRadius: width * 0.3,
          backgroundColor: config.accentColor,
          opacity: 0.18,
        }}
      />
      {/* Center icon */}
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: Math.min(width, height) * 0.4 }}>{config.icon}</Text>
      </View>
      {/* Floating particles */}
      {config.particles &&
        config.particles.map((p, i) => (
          <Text
            key={i}
            style={{
              position: 'absolute',
              fontSize: Math.min(width, height) * 0.16,
              opacity: 0.55,
              left: width * 0.15 + i * width * 0.25,
              top: height * (0.15 + (i % 2) * 0.5),
            }}
          >
            {p}
          </Text>
        ))}
      {/* Bottom accent line */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: width * 0.1,
          right: width * 0.1,
          height: 2,
          borderRadius: 1,
          backgroundColor: config.accentColor,
          opacity: 0.55,
        }}
      />
    </View>
  );
}
