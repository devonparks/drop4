/**
 * CharacterSnapshot — one-time snapshot of an AMG character cached as a PNG.
 *
 * Why: Collection + Roster grids display 20-40 characters simultaneously. A
 * live <Canvas> per card is a memory + GPU disaster. We render each unique
 * character ONCE offscreen, capture it to PNG via react-native-view-shot,
 * stuff the base64 data URI into AsyncStorage, and serve <Image> from the
 * cache on every subsequent mount.
 *
 * Cache key = short hash of the CharacterState (parts + colors + blendshapes)
 * + size bucket. If the player swaps any slot, the key changes and a fresh
 * snapshot is taken.
 *
 * Fallbacks:
 *   - Web doesn't support view-shot reliably with GLContext canvases —
 *     we render Character3DPortrait live instead. Grids pay the perf cost;
 *     correctness wins over perf on web.
 *   - On capture failure (e.g. timing) we also fall through to live.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Image, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import ViewShot from 'react-native-view-shot';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Character3DPortrait } from './Character3DPortrait';
import type { CharacterState } from '@amg/character-runtime';
import { colors } from '../../theme/colors';

interface Props {
  width: number;
  height: number;
  customization: CharacterState;
  /** If true, re-snapshot on every mount (useful for debugging). */
  bypassCache?: boolean;
  style?: any;
}

// ── Fast stable hash for a CharacterState + size bucket ──
function cacheKey(c: CharacterState, size: number): string {
  const parts = Object.entries(c.parts as Record<string, string>)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([slot, name]) => `${slot}=${name}`)
    .join(',');
  const colors = Object.entries(c.colors as Record<string, string>)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([prop, hex]) => `${prop}=${hex}`)
    .join(',');
  const blend = `${(c.blendshapes.feminine ?? 0).toFixed(2)}|${(c.blendshapes.weight ?? 0).toFixed(2)}|${(c.blendshapes.muscle ?? 0).toFixed(2)}`;
  const payload = [c.species, parts, colors, blend, size].join('||');
  // FNV-1a 32-bit — short stable hex hash, good enough for collision-free keys
  let h = 0x811c9dc5;
  for (let i = 0; i < payload.length; i++) {
    h ^= payload.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return `char3d_snap_v2_${h.toString(16)}`;
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

  // Take the snapshot after the offscreen Composite character has had time
  // to fetch + graft its part GLBs. AMG composition is more network-heavy
  // than the legacy single-GLB path, so 1500 ms is a safer floor before
  // capture. On a warm cache (subsequent snapshots) the parts resolve
  // synchronously and the timer is just dead air — acceptable trade-off.
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
    }, 1500);
    return () => clearTimeout(t);
  }, [key, snapshotDone, fallbackToLive]);

  // Fallback live render — wraps Character3DPortrait at the requested size.
  if (fallbackToLive) {
    return (
      <View style={[{ width, height }, style]}>
        <Character3DPortrait
          width={width}
          height={height}
          customization={customization}
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

  // Still snapshotting: render the portrait inside ViewShot, plus a spinner
  // overlay so the grid doesn't pop.
  return (
    <View style={[{ width, height }, style]}>
      <ViewShot
        ref={viewShotRef}
        style={{ width, height }}
        options={{ format: 'png', quality: 0.92, result: 'data-uri' }}
      >
        <Character3DPortrait
          width={width}
          height={height}
          customization={customization}
          showFloor={false}
        />
      </ViewShot>
      <View style={[styles.spinnerOverlay, { pointerEvents: 'none' }]}>
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
