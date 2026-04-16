import React from 'react';
import { View, Text, Image, StyleSheet, ImageSourcePropType } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { fonts, weight } from '../../theme/typography';

type RenderContent = (innerSize: number) => React.ReactNode;

// ═══════════════════════════════════════════════════════════════════════
// PortraitFrame
//
// Premium portrait treatment used in the Profile header (and reusable in
// Stats, match avatars, etc). Fixes the "tiny character stuck in a circle"
// problem by:
//   1. Rendering the character image at ~1.8x size and tight-cropping to
//      the upper body via overflow:hidden + transform translateY.
//   2. Wrapping the crop in a layered frame (rarity gradient + inner ring
//      + outer halo glow).
//   3. Overlaying a rating badge and tier label like an NBA 2K MyPlayer card.
//
// No image assets needed for the frame — only the player portrait PNG.
// ═══════════════════════════════════════════════════════════════════════

export type PortraitTier = 'bronze' | 'silver' | 'gold' | 'ruby' | 'amethyst' | 'diamond' | 'darkmatter';

interface TierFrame {
  outer: [string, string, string];   // outer ring gradient
  inner: [string, string, string];   // inner bezel
  glow: string;
  ratingText: string;
  label: string;
  backgroundTint: [string, string, string];
}

const FRAMES: Record<PortraitTier, TierFrame> = {
  bronze:     { outer: ['#e09030', '#8a4a14', '#3a1f04'], inner: ['#4a2a0a', '#2a1806', '#0a0604'], glow: '#c07532', ratingText: '#e89545', label: 'BRONZE',     backgroundTint: ['#3a1f0a', '#1a0f04', '#08040a'] },
  silver:     { outer: ['#ffffff', '#9090a0', '#3a3e48'], inner: ['#3a3e48', '#1e222a', '#0a0c12'], glow: '#b0b0c0', ratingText: '#e8e8f8', label: 'SILVER',     backgroundTint: ['#1e2030', '#0e1018', '#040608'] },
  gold:       { outer: ['#ffee88', '#d4a020', '#6a4a08'], inner: ['#6a4a08', '#2a1e04', '#0a0802'], glow: '#ffcc30', ratingText: '#ffe066', label: 'GOLD',       backgroundTint: ['#3a2a08', '#1a1404', '#080602'] },
  ruby:       { outer: ['#ff6078', '#c02040', '#5a0818'], inner: ['#5a0818', '#2a0408', '#0a0204'], glow: '#ff2040', ratingText: '#ff6078', label: 'RUBY',       backgroundTint: ['#3a0810', '#1a0408', '#080206'] },
  amethyst:   { outer: ['#d08aff', '#7020c0', '#3a0860'], inner: ['#3a0860', '#180420', '#06020a'], glow: '#9040d0', ratingText: '#c074ff', label: 'AMETHYST',   backgroundTint: ['#220a38', '#100418', '#04020a'] },
  diamond:    { outer: ['#b8f0ff', '#4ac8e0', '#1a5090'], inner: ['#0a1a28', '#060e18', '#020408'], glow: '#6adcff', ratingText: '#c8f0ff', label: 'DIAMOND',    backgroundTint: ['#0a1828', '#040c18', '#020408'] },
  darkmatter: { outer: ['#ff2050', '#9020ff', '#2a0040'], inner: ['#100010', '#050008', '#000000'], glow: '#c01080', ratingText: '#ff4080', label: 'DARK MATTER',backgroundTint: ['#100010', '#060008', '#000004'] },
};

interface PortraitFrameProps {
  /** 2D portrait source. Required unless `renderContent` is provided. */
  image?: ImageSourcePropType;
  /**
   * Optional render prop for custom content inside the inner circle
   * (e.g. a 3D character portrait). Receives the innerSize so the
   * content can be sized to fill the crop exactly. Takes precedence
   * over `image` when provided.
   */
  renderContent?: RenderContent;
  rating: number;
  tier: PortraitTier;
  size?: number;
  label?: string;          // override default tier label
  imageScale?: number;     // how much to zoom the image (default 2.2)
  imageTranslateY?: number; // fraction of innerSize — POSITIVE pushes
                             // the image DOWN (exposing the top of the
                             // character, i.e. the head). Default 0.3 lands
                             // on the head/shoulders of a standing pose.
}

export function PortraitFrame({
  image,
  renderContent,
  rating,
  tier,
  size = 160,
  label,
  imageScale = 2.2,
  imageTranslateY = 0.3,
}: PortraitFrameProps) {
  const frame = FRAMES[tier];
  const innerSize = size * 0.86;
  const innerOffset = (size - innerSize) / 2;

  return (
    <View style={{ width: size, height: size, position: 'relative' }}>
      {/* Outer halo — soft colored glow behind everything */}
      <View
        pointerEvents="none"
        style={[
          styles.outerHalo,
          {
            width: size * 1.25,
            height: size * 1.25,
            left: -size * 0.125,
            top: -size * 0.125,
            backgroundColor: frame.glow + '33',
            borderRadius: size,
          },
        ]}
      />

      {/* Outer rarity ring — gradient border */}
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          overflow: 'hidden',
          shadowColor: frame.glow,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.9,
          shadowRadius: 14,
          elevation: 10,
        }}
      >
        <LinearGradient
          colors={frame.outer}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {/* Inner bezel — dark ring inside the outer frame */}
        <View
          style={{
            position: 'absolute',
            left: innerOffset,
            top: innerOffset,
            width: innerSize,
            height: innerSize,
            borderRadius: innerSize / 2,
            overflow: 'hidden',
            borderWidth: 2,
            borderColor: 'rgba(0,0,0,0.6)',
          }}
        >
          {/* Scene backdrop (gradient based on tier) */}
          <LinearGradient
            colors={frame.backgroundTint}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFill}
          />

          {/* Tight-cropped character portrait */}
          {/* Image is scaled up and translated so only the upper body shows */}
          <View
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            {renderContent ? (
              renderContent(innerSize)
            ) : image ? (
              <Image
                source={image}
                style={{
                  width: innerSize,
                  height: innerSize,
                  transform: [
                    { scale: imageScale },
                    { translateY: innerSize * imageTranslateY },
                  ],
                }}
                resizeMode="contain"
              />
            ) : null}
          </View>

          {/* Top light gradient — soft highlight for depth */}
          <LinearGradient
            colors={['rgba(255,255,255,0.16)', 'transparent']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 0.7 }}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
        </View>
      </View>

      {/* Rating badge overlay — top-left outside the circle */}
      <View
        style={[
          styles.ratingBadge,
          {
            borderColor: frame.ratingText,
            shadowColor: frame.glow,
            left: -size * 0.04,
            top: size * 0.08,
            width: size * 0.32,
            height: size * 0.32,
            borderRadius: size * 0.16,
          },
        ]}
      >
        <Text style={[styles.ratingText, { color: frame.ratingText, fontSize: size * 0.16 }]}>
          {rating}
        </Text>
        <Text style={[styles.ovrText, { fontSize: size * 0.06 }]}>OVR</Text>
      </View>

      {/* Tier label overlay — bottom center, on a pill */}
      <View
        style={[
          styles.tierPill,
          {
            borderColor: frame.ratingText,
            bottom: -size * 0.06,
          },
        ]}
      >
        <Text style={[styles.tierText, { color: frame.ratingText }]}>
          {label ?? frame.label}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerHalo: {
    position: 'absolute',
  },
  ratingBadge: {
    position: 'absolute',
    zIndex: 3,
    backgroundColor: 'rgba(0,0,0,0.85)',
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.95,
    shadowRadius: 8,
    elevation: 12,
  },
  ratingText: {
    fontFamily: fonts.heading,
    fontWeight: weight.black,
    lineHeight: undefined,
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  ovrText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 1,
    marginTop: -2,
  },
  tierPill: {
    position: 'absolute',
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.92)',
    borderWidth: 1.5,
    zIndex: 4,
  },
  tierText: {
    fontFamily: fonts.body,
    fontSize: 9,
    fontWeight: weight.black,
    letterSpacing: 1.2,
  },
});
