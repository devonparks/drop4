/**
 * Character3DPortrait — the standard player/NPC portrait component.
 *
 * Renders an AMG CompositeCharacter at the given size. By default it
 * pulls the player's amgCharacter from characterStore; pass an explicit
 * `customization` (CharacterState) to render an NPC instead.
 *
 * Usage:
 *   <Character3DPortrait width={120} height={160} />
 *   <Character3DPortrait width={120} height={160} customization={getNpcCustomization('rookie ron')} />
 *   <Character3DPortrait width={120} height={160} animationId="emote_dab" />
 */

import React, { useMemo, useRef, useEffect, useState } from 'react';
import { View, ViewStyle, StyleSheet, ActivityIndicator, Text, Animated } from 'react-native';
import { Canvas, useFrame } from '@react-three/fiber/native';
import * as THREE from 'three';
import { CompositeCharacter, type CharacterState, type ContentSource } from '@amg/character-runtime';
import { useCharacterStore } from '../../stores/characterStore';
import { colors as themeColors } from '../../theme/colors';
import { fonts, weight } from '../../theme/typography';

// CDN base URL — same source as HomeScreen / CharacterCreatorScreen.
const CONTENT_SOURCE: ContentSource = {
  baseUrl: 'https://pub-8953453f2512408f9c58656d4ea4e681.r2.dev',
};

// Default idle pool: the runtime crossfades between these every 8–15s
// when state.animation is null, so the same NPC doesn't lock to a single
// pose. Three loops gives variety without overlapping the dance category.
const DEFAULT_IDLE_LIST: string[] = [
  'idles/idle_base.glb',
  'idles/idle_hands_on_hips.glb',
  'idles/idle_arms_folded.glb',
];

/** Translate the legacy animationId convention ('emote_dab', 'idle_base')
 *  into a CompositeCharacter-friendly relative path. Falls through to
 *  null (idle cycling) when the id is empty / unparseable. */
function animationPathFromId(id: string | null | undefined): string | null {
  if (!id) return null;
  if (id.startsWith('emote_')) return `emotes/${id}.glb`;
  if (id.startsWith('idle_'))  return `idles/${id}.glb`;
  // Unknown prefix — assume the caller passed a relative path already.
  return id.endsWith('.glb') ? id : null;
}

function TurntableGroup({ enabled, children }: { enabled: boolean; children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (!ref.current || !enabled) return;
    ref.current.rotation.y += delta * 0.2;
  });
  return <group ref={ref}>{children}</group>;
}

export interface Character3DPortraitProps {
  width: number;
  height: number;
  /** Override character — omit to use local player's amgCharacter. */
  customization?: CharacterState;
  /** Play a specific animation id (e.g. 'emote_dab', 'idle_base'). When
   *  null/undefined the runtime cycles through DEFAULT_IDLE_LIST. */
  animationId?: string | null;
  /** Reserved for legacy parity; currently a no-op (the runtime always
   *  loops). The animation finishes on its own and the runtime crossfades
   *  back to an idle when state.animation is cleared by the caller. */
  animationLoop?: boolean;
  mode?: 'display' | 'creator';
  autoRotate?: boolean;
  showFloor?: boolean;
  onTap?: () => void;
  style?: ViewStyle;
  /** Camera framing preset. Matches AmgCreator's per-tab camera poses
   *  so the dressing-room mirror can zoom to the head when previewing
   *  hair / face / brow / beard parts (otherwise the previewed detail
   *  is invisible at thumbnail-size in a full-body shot). Per
   *  docs/CUSTOMIZE_VISUAL_AUDIT_2026-05-04.md Fix 3. */
  cameraPreset?: 'body' | 'face';
}

// Per-preset camera framing. body = standard full-body shot
// (matches AmgCreator's BODY tab CAMERA_POSES.body). face = head
// zoom for hair / brow / beard / ear previews so the actual
// detail being equipped is visible.
const CAMERA_PRESETS = {
  body: { pos: [0, 1.1, 3.2] as [number, number, number], lookAt: [0, 0.95, 0] as [number, number, number] },
  face: { pos: [0, 1.65, 1.25] as [number, number, number], lookAt: [0, 1.65, 0] as [number, number, number] },
};

export function Character3DPortrait({
  width, height, customization,
  animationId,
  mode = 'display', autoRotate, showFloor = true, onTap, style,
  cameraPreset = 'body',
}: Character3DPortraitProps) {
  const playerCharacter = useCharacterStore((s) => s.amgCharacter) as unknown as CharacterState | null;
  const base = customization ?? playerCharacter;

  const [loaded, setLoaded] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!loaded) return;
    Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
  }, [loaded, fadeAnim]);

  const stateForRender = useMemo<CharacterState | null>(() => {
    if (!base) return null;
    return { ...base, animation: animationPathFromId(animationId) };
  }, [base, animationId]);

  const shouldRotate = autoRotate ?? (mode === 'creator');

  if (!stateForRender) {
    // Player save hasn't hydrated yet (App.tsx seeds amgCharacter on
    // boot, but the Portrait can mount during that gap). Show the same
    // loading affordance as before so layout doesn't shift.
    return (
      <View style={[{ width, height }, style, styles.loadingOverlay]}>
        <ActivityIndicator color={themeColors.orange} size="small" />
      </View>
    );
  }

  return (
    <View
      style={[{ width, height }, style]}
      onTouchEnd={onTap ? () => onTap() : undefined}
    >
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: fadeAnim }]}>
        <Canvas
          frameloop="always"
          gl={{ antialias: true, alpha: true } as any}
          shadows
          camera={{ position: CAMERA_PRESETS[cameraPreset].pos, fov: 42, near: 0.01, far: 1000 }}
          onCreated={(s: any) => {
            const { lookAt } = CAMERA_PRESETS[cameraPreset];
            s.camera.lookAt(lookAt[0], lookAt[1], lookAt[2]);
          }}
          style={StyleSheet.absoluteFill as any}
        >
          {/* Three-point lighting matches the AAA legacy look. */}
          <ambientLight intensity={0.55} color="#c0ccf0" />
          <directionalLight
            position={[2.5, 4, 3]}
            intensity={1.3}
            color="#fff4e0"
            castShadow
            shadow-mapSize-width={512}
            shadow-mapSize-height={512}
            shadow-camera-near={0.1}
            shadow-camera-far={20}
            shadow-camera-left={-2}
            shadow-camera-right={2}
            shadow-camera-top={2}
            shadow-camera-bottom={-1}
            shadow-bias={-0.0005}
          />
          <directionalLight position={[-2, 2, 1.5]} intensity={0.6} color="#a8c8f0" />
          <directionalLight position={[0, 3, -3]} intensity={1.4} color="#ff9a5a" />
          <hemisphereLight args={['#6080a0', '#1a1820', 0.5]} />

          <TurntableGroup enabled={shouldRotate}>
            <CompositeCharacter
              source={CONTENT_SOURCE}
              state={stateForRender}
              targetHeightMeters={1.8}
              idleList={DEFAULT_IDLE_LIST}
              onReady={() => setLoaded(true)}
            />
          </TurntableGroup>

          {showFloor && (
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.002, 0]} receiveShadow>
              <circleGeometry args={[1.5, 48]} />
              <shadowMaterial transparent opacity={0.4} />
            </mesh>
          )}
        </Canvas>
      </Animated.View>

      {!loaded && (
        <View style={styles.loadingOverlay} pointerEvents="none">
          {/* Adaptive loading state — Audit fix 2026-05-05 PM:
              "Loading character…" text was overlapping the small
              avatar circles in the GameScreen header (Player and
              Bot avatars at ~50 px). Show the spinner alone when
              the portrait is small (< 140 px); show spinner + text
              only on large hero contexts (Customize/Home/Matchup). */}
          <ActivityIndicator
            color={themeColors.orange}
            size={width < 140 ? 'small' : 'large'}
          />
          {width >= 140 && (
            <Text style={styles.loadingText}>Loading character…</Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 12,
    color: themeColors.textSecondary,
    letterSpacing: 1,
  },
});
