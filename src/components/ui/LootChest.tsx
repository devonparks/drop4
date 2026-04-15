import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// ═══════════════════════════════════════════════════════════════════════
// LootChest — rendered treasure chest, no image assets required.
//
// Replaces the flat emoji icons (📦 🎁 ✨ 💎) that were standing in for
// loot box art. Each tier gets a layered composition with per-tier colors:
//   • Base (chest body) — gradient + shadow
//   • Lid — rounded top with highlight
//   • Horizontal strap bands — metal accents
//   • Central lock plate with a colored gem
//   • Corner rivets — small dots at the corners
//   • Inner glow — halo behind the chest matching tier
//
// Per-tier palettes:
//   bronze  — warm browns + copper straps
//   silver  — cool grays + polished steel
//   gold    — rich gold + ornate highlights
//   diamond — crystalline cyan + white prism
// ═══════════════════════════════════════════════════════════════════════

export type LootChestTier = 'bronze' | 'silver' | 'gold' | 'diamond';

interface LootChestProps {
  tier: LootChestTier;
  size?: number;  // width in px; height is auto (0.82 * width)
}

interface TierPalette {
  body: [string, string, string];        // chest body gradient top-bottom
  lid: [string, string, string];         // lid gradient
  strap: [string, string];               // strap metal gradient
  rivet: string;                         // rivet color
  gem: string;                           // central lock gem color
  gemGlow: string;                       // gem outer glow
  haloColor: string;                     // outer halo color
  edgeHighlight: string;                 // top edge highlight line
}

const PALETTES: Record<LootChestTier, TierPalette> = {
  bronze: {
    body: ['#a86a28', '#6a3d0f', '#3a1f04'],
    lid: ['#c88a40', '#8a4f18', '#5a2e08'],
    strap: ['#4a2a0a', '#2a1505'],
    rivet: '#f4c878',
    gem: '#ff8c42',
    gemGlow: '#ffb070',
    haloColor: 'rgba(255, 140, 60, 0.35)',
    edgeHighlight: 'rgba(255, 200, 120, 0.6)',
  },
  silver: {
    body: ['#c8cad4', '#7a7c88', '#3e4048'],
    lid: ['#e0e2ec', '#9a9ca8', '#525460'],
    strap: ['#2a2c36', '#14161e'],
    rivet: '#ffffff',
    gem: '#4ac8ff',
    gemGlow: '#8adcff',
    haloColor: 'rgba(180, 200, 230, 0.35)',
    edgeHighlight: 'rgba(255, 255, 255, 0.75)',
  },
  gold: {
    body: ['#ffd64a', '#c8960a', '#6a4a04'],
    lid: ['#ffe87a', '#e0b020', '#8a6010'],
    strap: ['#6a4a04', '#3a2a02'],
    rivet: '#ffffff',
    gem: '#ff2050',
    gemGlow: '#ff6080',
    haloColor: 'rgba(255, 220, 80, 0.5)',
    edgeHighlight: 'rgba(255, 255, 200, 0.8)',
  },
  diamond: {
    body: ['#a8e8ff', '#4a90c8', '#1a4878'],
    lid: ['#d0f0ff', '#6aa8d8', '#2a5888'],
    strap: ['#1a3048', '#0a1828'],
    rivet: '#ffffff',
    gem: '#ff4080',
    gemGlow: '#ff80b0',
    haloColor: 'rgba(150, 220, 255, 0.55)',
    edgeHighlight: 'rgba(255, 255, 255, 0.9)',
  },
};

export function LootChest({ tier, size = 80 }: LootChestProps) {
  const p = PALETTES[tier];
  const h = size * 0.82;

  // Dimension tokens — all scale off the `size` prop.
  const chestW = size * 0.88;
  const chestX = (size - chestW) / 2;
  const bodyH = h * 0.58;
  const bodyY = h * 0.35;
  const lidH = h * 0.36;
  const lidY = h * 0.08;
  const strapThickness = Math.max(2, h * 0.06);
  const rivet = Math.max(2, h * 0.04);
  const gemSize = h * 0.16;

  return (
    <View style={{ width: size, height: h, position: 'relative' }}>
      {/* Halo behind the chest */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: -size * 0.08,
          right: -size * 0.08,
          top: -h * 0.05,
          bottom: -h * 0.02,
          borderRadius: size,
          backgroundColor: p.haloColor,
          opacity: 0.7,
          transform: [{ scaleX: 1.15 }, { scaleY: 0.9 }],
        }}
      />

      {/* Chest body (rounded rectangle bottom half) */}
      <View
        style={{
          position: 'absolute',
          left: chestX,
          top: bodyY,
          width: chestW,
          height: bodyH,
          borderRadius: chestW * 0.08,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: 'rgba(0,0,0,0.55)',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.7,
          shadowRadius: 4,
        }}
      >
        <LinearGradient
          colors={p.body}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {/* Vertical grain / plank hint — two dark lines dividing the chest */}
        <View style={{ position: 'absolute', left: '33%', top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(0,0,0,0.35)' }} />
        <View style={{ position: 'absolute', left: '66%', top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(0,0,0,0.35)' }} />
      </View>

      {/* Horizontal strap band across the body */}
      <View
        style={{
          position: 'absolute',
          left: chestX,
          top: bodyY + bodyH * 0.32,
          width: chestW,
          height: strapThickness,
          overflow: 'hidden',
          borderTopWidth: 1,
          borderBottomWidth: 1,
          borderColor: 'rgba(0,0,0,0.6)',
        }}
      >
        <LinearGradient
          colors={p.strap}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </View>

      {/* Corner rivets on the body */}
      {[
        { l: '8%', t: '62%' }, { l: '89%', t: '62%' },
        { l: '8%', t: '88%' }, { l: '89%', t: '88%' },
      ].map((pos, i) => (
        <View
          key={`rivet-${i}`}
          style={{
            position: 'absolute',
            left: pos.l as any,
            top: pos.t as any,
            width: rivet,
            height: rivet,
            borderRadius: rivet / 2,
            backgroundColor: p.rivet,
            shadowColor: p.rivet,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.9,
            shadowRadius: 2,
          }}
        />
      ))}

      {/* Chest lid — sits above the body with a rounded top */}
      <View
        style={{
          position: 'absolute',
          left: chestX,
          top: lidY,
          width: chestW,
          height: lidH,
          borderTopLeftRadius: chestW * 0.25,
          borderTopRightRadius: chestW * 0.25,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: 'rgba(0,0,0,0.55)',
          borderBottomWidth: 0,
        }}
      >
        <LinearGradient
          colors={p.lid}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {/* Top rim highlight */}
        <View
          style={{
            position: 'absolute',
            top: 1,
            left: 2,
            right: 2,
            height: 2,
            borderRadius: 2,
            backgroundColor: p.edgeHighlight,
            opacity: 0.85,
          }}
        />
      </View>

      {/* Lock plate — a small circle at the center where lid meets body */}
      <View
        style={{
          position: 'absolute',
          left: size / 2 - gemSize * 0.8,
          top: bodyY - gemSize * 0.5,
          width: gemSize * 1.6,
          height: gemSize * 1.2,
          borderRadius: gemSize * 0.3,
          backgroundColor: 'rgba(0,0,0,0.85)',
          borderWidth: 1,
          borderColor: p.strap[0],
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Central glowing gem */}
        <View
          style={{
            width: gemSize,
            height: gemSize,
            borderRadius: gemSize / 2,
            backgroundColor: p.gem,
            shadowColor: p.gemGlow,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 1,
            shadowRadius: gemSize * 0.6,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.5)',
            overflow: 'hidden',
          }}
        >
          {/* Gem highlight */}
          <View
            style={{
              position: 'absolute',
              top: gemSize * 0.15,
              left: gemSize * 0.22,
              width: gemSize * 0.35,
              height: gemSize * 0.35,
              borderRadius: gemSize / 2,
              backgroundColor: 'rgba(255,255,255,0.65)',
            }}
          />
        </View>
      </View>

      {/* Top sparkle (diamond/gold tiers only) */}
      {(tier === 'diamond' || tier === 'gold') && (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: size * 0.5 - 3,
            top: h * 0.02,
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: p.edgeHighlight,
            shadowColor: p.edgeHighlight,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 1,
            shadowRadius: 6,
          }}
        />
      )}
    </View>
  );
}
