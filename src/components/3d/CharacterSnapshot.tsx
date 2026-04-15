/**
 * CharacterSnapshot — one-time snapshot of Character3D cached as a PNG.
 *
 * Why: Collection + Roster grids display 20-40 characters simultaneously. A
 * live <Canvas> per card is a memory + GPU disaster. We render each unique
 * customization ONCE offscreen, capture it to PNG via react-native-view-shot,
 * stuff the base64 data URI into AsyncStorage, and serve <Image> from the
 * cache on every subsequent mount.
 *
 * Cache key = short hash of customization + outfit ID + size bucket. If the
 * player recolors their hair, the key changes and a fresh snapshot is taken.
 *
 * Fallbacks:
 *   - On the first render we show a small ActivityIndicator + a transparent
 *     box at the requested size
 *   - If view-shot fails (e.g. web), we render a full live Character3D
 *     instead. Grids pay the perf cost; correctness wins over perf on web.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Image, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import ViewShot from 'react-native-view-shot';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Character3D } from './Character3D';
import type { CharacterCustomization } from '../../stores/characterStore';
import { OUTFITS } from '../../data/outfitRegistry';
import { colors } from '../../theme/colors';

interface Props {
  width: number;
  height: number;
  customization: CharacterCustomization;
  /** If true, re-snapshot on every mount (useful for debugging). */
  bypassCache?: boolean;
  style?: any;
}

// ── Fast stable hash for a customization + size bucket ──
function cacheKey(c: CharacterCustomization, size: number): string {
  const color = (c.outfitColors && Object.keys(c.outfitColors).sort()
    .map((k) => `${k}:${c.outfitColors[k]}`).join(',')) || '';
  const payload = [
    c.outfitId,
    Math.round(c.bodyType),
    Math.round(c.bodySize),
    Math.round(c.muscle),
    c.skinColor,
    c.hairColor,
    color,
    size,
  ].join('|');
  // FNV-1a 32-bit — short stable hex hash, good enough for collision-free cache keys
  let h = 0x811c9dc5;
  for (let i = 0; i < payload.length; i++) {
    h ^= payload.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return `char3d_snap_v1_${h.toString(16)}`;
}

export function CharacterSnapshot({ width, height, customization, bypassCache, style }: Props) {
  const [pngUri, setPngUri] = useState<string | null>(null);
  const [snapshotDone, setSnapshotDone] = useState(false);
  const [fallbackToLive, setFallbackToLive] = useState(false);
  const viewShotRef = useRef<ViewShot>(null);
  const key = cacheKey(customization, width);

  // Web doesn't support view-shot reliably with GLContext canvases — go live.
  useEffect(() => {
    if (Platform.OS === 'web') setFallbackToLive(true);
  }, []);

  // Cache lookup on mount
  useEffect(() => {
    if (bypassCache || fallbackToLive) return;
    let cancelled = false;
    AsyncStorage.getItem(key).then((saved) => {
      if (cancelled) return;
      if (saved) {
        setPngUri(saved);
        setSnapshotDone(true);
      }
    }).catch(() => {/* fall through to snapshot */});
    return () => { cancelled = true; };
  }, [key, bypassCache, fallbackToLive]);

  // Take the snapshot after the offscreen 3D canvas has had a moment to render.
  // 600 ms is empirically long enough for GLTF parse + three-point lighting.
  useEffect(() => {
    if (snapshotDone || fallbackToLive) return;
    const t = setTimeout(async () => {
      if (!viewShotRef.current) return;
      try {
        const uri = await (viewShotRef.current.capture as any)?.({
          format: 'png',
          quality: 0.92,
          result: 'data-uri',
        });
        if (uri) {
          setPngUri(uri);
          AsyncStorage.setItem(key, uri).catch(() => {/* best-effort */});
        }
      } catch (e) {
        if (__DEV__) console.warn('[CharacterSnapshot] capture failed:', e);
        setFallbackToLive(true);
      } finally {
        setSnapshotDone(true);
      }
    }, 600);
    return () => clearTimeout(t);
  }, [key, snapshotDone, fallbackToLive]);

  const outfit = OUTFITS[customization.outfitId] ?? OUTFITS[Object.keys(OUTFITS)[0]];
  if (!outfit) return <View style={[{ width, height }, style]} />;

  // If snapshotting failed (web or capture error), just render live. Worse
  // perf but correct output.
  if (fallbackToLive) {
    return (
      <View style={[{ width, height }, style]}>
        <Character3D
          width={width}
          height={height}
          bodyGlb={outfit.glb}
          skinColor={customization.skinColor}
          hairColor={customization.hairColor}
          outfitColors={customization.outfitColors}
          bodyType={customization.bodyType}
          bodySize={customization.bodySize}
          muscle={customization.muscle}
          showFloor={false}
        />
      </View>
    );
  }

  // Cached PNG ready → cheap <Image>
  if (pngUri) {
    return (
      <Image
        source={{ uri: pngUri }}
        style={[{ width, height }, style]}
        resizeMode="contain"
      />
    );
  }

  // Still snapshotting: render Character3D inside ViewShot, plus a spinner
  // overlay so the grid doesn't pop.
  return (
    <View style={[{ width, height }, style]}>
      <ViewShot
        ref={viewShotRef}
        style={{ width, height }}
        options={{ format: 'png', quality: 0.92, result: 'data-uri' }}
      >
        <Character3D
          width={width}
          height={height}
          bodyGlb={outfit.glb}
          skinColor={customization.skinColor}
          hairColor={customization.hairColor}
          outfitColors={customization.outfitColors}
          bodyType={customization.bodyType}
          bodySize={customization.bodySize}
          muscle={customization.muscle}
          showFloor={false}
        />
      </ViewShot>
      <View style={styles.spinnerOverlay} pointerEvents="none">
        <ActivityIndicator color={colors.orange} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  spinnerOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.35,
  },
});
