import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BOARD_THEME_VISUALS } from '../../data/boardThemeColors';

// ═══════════════════════════════════════════════════════════════════════
// PremiumBoardThumbnail
//
// Replaces the old flat "colored square + 9 dots" shop preview with a
// layered scene per theme. Each thumbnail has:
//
//   1. Atmospheric sky backdrop (theme-specific gradient)
//   2. Atmosphere layer (stars, grid lines, particles, streaks)
//   3. Horizon glow
//   4. Mini Connect-4 board frame with bevel
//   5. A single row of 6 inset holes with depth (dark center + rim)
//   6. Two sample "dropped" pieces in the theme's p1/p2 colors
//   7. Optional foreground accent (glow flare)
//
// The component is pure RN Views + LinearGradients — portable across web
// and native, no image assets required. Fits the existing 108×64 card slot.
// ═══════════════════════════════════════════════════════════════════════

export interface PremiumBoardThumbnailProps {
  themeId: string;
  width?: number;
  height?: number;
}

// ─── Per-theme scene data ──────────────────────────────────────────────
// For each theme, describe the atmospheric scene:
//   • skyGradient: background gradient stops (top → bottom)
//   • atmosphereType: which decorative layer to render
//   • glowColor: radial halo behind the board
//   • p1Color / p2Color: sample piece colors
//   • frameGradient: reused from BOARD_THEME_VISUALS
//   • accent: optional highlight color
// ─────────────────────────────────────────────────────────────────────
type AtmosphereType =
  | 'stars'        // galaxy, midnight, void
  | 'stripes'      // neon, matrix
  | 'flames'       // lava
  | 'snow'         // ice, crystal
  | 'rays'         // gold, sunset, rainbow
  | 'dots'         // candy
  | 'swirl'        // darkmatter
  | 'glow'         // default, wood (subtle)
  | 'none';

interface ThemeScene {
  skyGradient: [string, string, string];
  atmosphereType: AtmosphereType;
  glowColor: string;
  p1Color: string;
  p2Color: string;
  accent: string;
}

const THEME_SCENES: Record<string, ThemeScene> = {
  default: {
    skyGradient: ['#1e3a8a', '#1a3a8a', '#0d2060'],
    atmosphereType: 'glow',
    glowColor: 'rgba(120, 180, 255, 0.35)',
    p1Color: '#e63946',
    p2Color: '#f4a623',
    accent: '#6aacda',
  },
  wood: {
    skyGradient: ['#c89060', '#8B5E3C', '#4a2d18'],
    atmosphereType: 'glow',
    glowColor: 'rgba(255, 180, 100, 0.4)',
    p1Color: '#e63946',
    p2Color: '#f4a623',
    accent: '#d4a373',
  },
  neon: {
    skyGradient: ['#000810', '#001a10', '#002008'],
    atmosphereType: 'stripes',
    glowColor: 'rgba(0, 255, 136, 0.45)',
    p1Color: '#ff00ff',
    p2Color: '#00ffff',
    accent: '#00ff88',
  },
  galaxy: {
    skyGradient: ['#0a0318', '#1a0540', '#3a1a6b'],
    atmosphereType: 'stars',
    glowColor: 'rgba(138, 43, 226, 0.5)',
    p1Color: '#ff00aa',
    p2Color: '#00e1ff',
    accent: '#9d4edd',
  },
  gold: {
    skyGradient: ['#3d2a00', '#786010', '#c89830'],
    atmosphereType: 'rays',
    glowColor: 'rgba(255, 215, 0, 0.55)',
    p1Color: '#ff4500',
    p2Color: '#ffffff',
    accent: '#ffd700',
  },
  ice: {
    skyGradient: ['#0a2040', '#1a4a78', '#4a8ab8'],
    atmosphereType: 'snow',
    glowColor: 'rgba(180, 220, 255, 0.5)',
    p1Color: '#ff6ec7',
    p2Color: '#6ec7ff',
    accent: '#a8d8ff',
  },
  lava: {
    skyGradient: ['#1a0000', '#4a0a00', '#c83a10'],
    atmosphereType: 'flames',
    glowColor: 'rgba(255, 90, 20, 0.6)',
    p1Color: '#ffcc00',
    p2Color: '#ff4500',
    accent: '#ff6b35',
  },
  darkmatter: {
    skyGradient: ['#000000', '#0a0015', '#1a0028'],
    atmosphereType: 'swirl',
    glowColor: 'rgba(233, 69, 96, 0.6)',
    p1Color: '#e94560',
    p2Color: '#7b2cbf',
    accent: '#e94560',
  },
  midnight: {
    skyGradient: ['#05050f', '#0e0e1a', '#1a1a2e'],
    atmosphereType: 'stars',
    glowColor: 'rgba(120, 140, 180, 0.35)',
    p1Color: '#c9d6ea',
    p2Color: '#6e7a92',
    accent: '#8892b0',
  },
  candy: {
    skyGradient: ['#ffb3e6', '#ff6ec7', '#e94560'],
    atmosphereType: 'dots',
    glowColor: 'rgba(255, 200, 240, 0.55)',
    p1Color: '#7cf4ff',
    p2Color: '#fff066',
    accent: '#ff8ad8',
  },
  matrix: {
    skyGradient: ['#000800', '#002010', '#003a18'],
    atmosphereType: 'stripes',
    glowColor: 'rgba(0, 255, 80, 0.5)',
    p1Color: '#00ff41',
    p2Color: '#88ffaa',
    accent: '#00ff41',
  },
  sunset: {
    skyGradient: ['#ff6b9d', '#ff8c42', '#ffd166'],
    atmosphereType: 'rays',
    glowColor: 'rgba(255, 180, 80, 0.6)',
    p1Color: '#7a1a5a',
    p2Color: '#ffffff',
    accent: '#ffd166',
  },
  crystal: {
    skyGradient: ['#081828', '#1a4058', '#3a7898'],
    atmosphereType: 'snow',
    glowColor: 'rgba(200, 240, 255, 0.55)',
    p1Color: '#ff7ac6',
    p2Color: '#7ae0ff',
    accent: '#c8f0ff',
  },
  void: {
    skyGradient: ['#000000', '#0c0020', '#200540'],
    atmosphereType: 'stars',
    glowColor: 'rgba(160, 60, 255, 0.6)',
    p1Color: '#cc00ff',
    p2Color: '#00ccff',
    accent: '#a03cff',
  },
  rainbow: {
    skyGradient: ['#ff006e', '#fb5607', '#ffbe0b'],
    atmosphereType: 'rays',
    glowColor: 'rgba(255, 255, 255, 0.6)',
    p1Color: '#3a86ff',
    p2Color: '#8338ec',
    accent: '#ffffff',
  },
};

// Default scene for unknown themes — prevents crashes if new IDs land.
const FALLBACK_SCENE = THEME_SCENES.default;

export function PremiumBoardThumbnail({
  themeId,
  width = 108,
  height = 64,
}: PremiumBoardThumbnailProps) {
  const scene = THEME_SCENES[themeId] ?? FALLBACK_SCENE;
  const visual = BOARD_THEME_VISUALS[themeId] ?? BOARD_THEME_VISUALS.default;

  // Size tokens relative to the card so the component scales cleanly.
  // Board takes ~78% of the card width and sits in the lower 2/3 so the top
  // portion can breathe with atmospheric backdrop.
  const boardW = width * 0.88;
  const boardH = height * 0.7;
  const boardX = (width - boardW) / 2;
  const boardY = height * 0.22;
  const holeR = boardH * 0.16;

  return (
    <View style={{ width, height, overflow: 'hidden' }}>
      {/* ─── 1. Sky gradient backdrop ─── */}
      <LinearGradient
        colors={scene.skyGradient}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* ─── 2. Atmosphere layer ─── */}
      <AtmosphereLayer scene={scene} width={width} height={height} />

      {/* ─── 3. Horizon glow (radial halo centered where the board sits) ─── */}
      <View
        style={{
          position: 'absolute',
          left: width * 0.15,
          top: height * 0.28,
          width: width * 0.7,
          height: height * 0.55,
          borderRadius: width * 0.4,
          backgroundColor: scene.glowColor,
          opacity: 0.55,
          transform: [{ scaleY: 0.6 }],
        }}
      />

      {/* ─── 4. Ground fade — adds dramatic grounding under the board ─── */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.35)', 'rgba(0,0,0,0.6)']}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: height * 0.4,
        }}
      />

      {/* ─── 5. Mini board frame ─── */}
      <View
        style={{
          position: 'absolute',
          left: boardX,
          top: boardY,
          width: boardW,
          height: boardH,
          borderRadius: 6,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: visual.frameBorder,
          shadowColor: scene.accent,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.6,
          shadowRadius: 6,
          elevation: 4,
        }}
      >
        <LinearGradient
          colors={visual.frameGradient}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {/* Top bevel highlight */}
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 2,
            backgroundColor: 'rgba(255,255,255,0.3)',
          }}
        />

        {/* Holes grid (2 rows × 5 cols to show the board pattern) */}
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: boardH * 0.12,
            bottom: boardH * 0.08,
            justifyContent: 'space-evenly',
            paddingHorizontal: 4,
          }}
        >
          {[0, 1].map((row) => (
            <View key={row} style={{ flexDirection: 'row', justifyContent: 'space-evenly' }}>
              {[0, 1, 2, 3, 4].map((col) => (
                <View
                  key={col}
                  style={{
                    width: holeR * 2,
                    height: holeR * 2,
                    borderRadius: holeR,
                    backgroundColor: visual.holeColor,
                    borderWidth: 0.8,
                    borderColor: visual.holeBorder,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <View
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: holeR * 0.7,
                      borderTopLeftRadius: holeR,
                      borderTopRightRadius: holeR,
                      backgroundColor: 'rgba(0,0,0,0.3)',
                    }}
                  />
                </View>
              ))}
            </View>
          ))}
        </View>
      </View>

      {/* ─── 6. Board base tray ─── */}
      <View
        style={{
          position: 'absolute',
          left: boardX - 2,
          top: boardY + boardH - 1,
          width: boardW + 4,
          height: 4,
          borderBottomLeftRadius: 4,
          borderBottomRightRadius: 4,
          backgroundColor: visual.frameBorder,
          opacity: 0.6,
        }}
      />

      {/* ─── 7. Vignette edge darkening ─── */}
      <View
        pointerEvents="none"
        style={{
          ...StyleSheet.absoluteFillObject,
          borderWidth: 8,
          borderColor: 'rgba(0,0,0,0.25)',
          borderRadius: 12,
        }}
      />
    </View>
  );
}

// ─── Atmosphere dispatcher ──────────────────────────────────────────────
function AtmosphereLayer({ scene, width, height }: { scene: ThemeScene; width: number; height: number }) {
  switch (scene.atmosphereType) {
    case 'stars':
      return <Stars width={width} height={height} />;
    case 'stripes':
      return <NeonStripes height={height} color={scene.accent} />;
    case 'flames':
      return <Flames width={width} height={height} color={scene.accent} />;
    case 'snow':
      return <Snow width={width} height={height} />;
    case 'rays':
      return <Rays width={width} height={height} color={scene.accent} />;
    case 'dots':
      return <Dots width={width} height={height} color="rgba(255,255,255,0.4)" />;
    case 'swirl':
      return <Swirl width={width} height={height} color={scene.accent} />;
    case 'glow':
    case 'none':
    default:
      return null;
  }
}

// ─── Atmosphere sub-components ──────────────────────────────────────────
// All of these use deterministic pseudo-random positions based on index so
// they don't flicker on re-render.

function Stars({ width, height }: { width: number; height: number }) {
  return (
    <>
      {[...Array(24)].map((_, i) => {
        const x = ((i * 37) % 100) / 100;
        const y = ((i * 61) % 60) / 100;  // concentrate in upper 60%
        const size = (i % 3) + 1;
        const opacity = 0.4 + ((i * 13) % 6) / 10;
        return (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: x * width,
              top: y * height,
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: '#ffffff',
              opacity,
            }}
          />
        );
      })}
    </>
  );
}

function NeonStripes({ height, color }: { height: number; color: string }) {
  return (
    <>
      {/* Horizontal scan lines */}
      {[0.15, 0.35, 0.55].map((y, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: y * height,
            height: 1,
            backgroundColor: color,
            opacity: 0.45,
            shadowColor: color,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.9,
            shadowRadius: 4,
          }}
        />
      ))}
      {/* Vertical glowing bar at edges */}
      <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 2, backgroundColor: color, opacity: 0.6 }} />
      <View style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 2, backgroundColor: color, opacity: 0.6 }} />
    </>
  );
}

function Flames({ width, height, color }: { width: number; height: number; color: string }) {
  // Stylized flame blobs — orange rounded blobs stacked along the bottom
  return (
    <>
      {[0.1, 0.28, 0.5, 0.72, 0.9].map((x, i) => {
        const h = height * (0.22 + ((i * 17) % 10) / 30);
        return (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: x * width - 6,
              bottom: height * 0.05,
              width: 12,
              height: h,
              backgroundColor: color,
              borderTopLeftRadius: 8,
              borderTopRightRadius: 8,
              opacity: 0.6,
              shadowColor: '#ffa500',
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 1,
              shadowRadius: 8,
            }}
          />
        );
      })}
      {/* Glowing ember dots */}
      {[...Array(6)].map((_, i) => {
        const x = ((i * 43) % 100) / 100;
        const y = 0.5 + ((i * 29) % 30) / 100;
        return (
          <View
            key={`e${i}`}
            style={{
              position: 'absolute',
              left: x * width,
              top: y * height,
              width: 2,
              height: 2,
              borderRadius: 1,
              backgroundColor: '#ffcc66',
              shadowColor: '#ffcc66',
              shadowOpacity: 1,
              shadowRadius: 3,
            }}
          />
        );
      })}
    </>
  );
}

function Snow({ width, height }: { width: number; height: number }) {
  return (
    <>
      {[...Array(18)].map((_, i) => {
        const x = ((i * 47) % 100) / 100;
        const y = ((i * 31) % 90) / 100;
        const size = (i % 2) + 1.5;
        return (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: x * width,
              top: y * height,
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: '#e8f6ff',
              opacity: 0.75,
              shadowColor: '#ffffff',
              shadowOpacity: 1,
              shadowRadius: 3,
            }}
          />
        );
      })}
    </>
  );
}

function Rays({ width, height, color }: { width: number; height: number; color: string }) {
  // Light rays emanating from the center-top
  return (
    <>
      {[-30, -10, 10, 30].map((angle, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            left: width * 0.5 - 1,
            top: height * 0.1,
            width: 2,
            height: height * 0.7,
            backgroundColor: color,
            opacity: 0.25,
            transform: [{ rotate: `${angle}deg` }],
            transformOrigin: 'top' as any,
          }}
        />
      ))}
      {/* Central sun disc */}
      <View
        style={{
          position: 'absolute',
          left: width * 0.5 - 8,
          top: height * 0.1,
          width: 16,
          height: 16,
          borderRadius: 8,
          backgroundColor: color,
          opacity: 0.85,
          shadowColor: color,
          shadowOpacity: 1,
          shadowRadius: 10,
        }}
      />
    </>
  );
}

function Dots({ width, height, color }: { width: number; height: number; color: string }) {
  return (
    <>
      {[...Array(12)].map((_, i) => {
        const x = ((i * 41) % 100) / 100;
        const y = ((i * 53) % 70) / 100;
        const size = 2 + (i % 3);
        return (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: x * width,
              top: y * height,
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: color,
              opacity: 0.7,
            }}
          />
        );
      })}
    </>
  );
}

function Swirl({ width, height, color }: { width: number; height: number; color: string }) {
  // Concentric rings suggesting a vortex
  return (
    <>
      {[0.2, 0.32, 0.45, 0.58].map((r, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            left: width * 0.5 - width * r,
            top: height * 0.5 - width * r,
            width: width * r * 2,
            height: width * r * 2,
            borderRadius: width * r,
            borderWidth: 1,
            borderColor: color,
            opacity: 0.25 + i * 0.08,
            transform: [{ scaleY: 0.6 }],
          }}
        />
      ))}
      {/* Central bright core */}
      <View
        style={{
          position: 'absolute',
          left: width * 0.5 - 4,
          top: height * 0.5 - 4,
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: color,
          shadowColor: color,
          shadowOpacity: 1,
          shadowRadius: 8,
        }}
      />
    </>
  );
}
