/**
 * Character3D — AAA-quality real-time 3D character renderer.
 *
 * Features:
 *  - Three-point lighting (key + fill + rim) for premium depth
 *  - Subtle breathing idle animation (scale + bob)
 *  - Auto turntable rotation in creator mode
 *  - Smooth cross-fade when props change
 *  - Runtime customization: colors, blendshapes, outfit swaps
 *
 * Usage:
 *   <Character3D
 *     width={320} height={400}
 *     bodyGlb={require('.../modern_civilians_01.glb')}
 *     skinColor="#dcb088" hairColor="#3d2817"
 *     outfitColors={{ '10TORS': '#ff0000' }}
 *     bodyType={50} bodySize={50} muscle={50}
 *   />
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, ViewStyle, ActivityIndicator, Text, Animated } from 'react-native';
import { Canvas, useFrame } from '@react-three/fiber/native';
import * as THREE from 'three';
import { useGLB } from '../../utils/glbLoader';
import { colors as themeColors } from '../../theme/colors';
import { fonts, weight } from '../../theme/typography';

// ── Types ──

interface Character3DProps {
  width: number;
  height: number;
  bodyGlb: number | string;
  skinColor?: string;
  hairColor?: string;
  outfitColors?: Record<string, string>;
  bodyType?: number;
  bodySize?: number;
  muscle?: number;
  mode?: 'display' | 'creator';
  cameraDistance?: number;
  cameraHeight?: number;
  autoRotate?: boolean;
  showFloor?: boolean;
  onTap?: () => void;
  style?: ViewStyle;
  // Optional animation: a GLB containing a single AnimationClip retargets onto
  // the character's skeleton (Synty Sidekick skeleton). If set, it plays on
  // loop (or once, if `loop` is false). Silent-fallback: if retargeting
  // fails or the GLB is missing, the character stays in its bind pose.
  animationGlb?: number | string;
  animationLoop?: boolean;
}

// ── Part code mappings ──

const SKIN_PART_CODES = ['01HEAD', '15HNDL', '16HNDR', '34EARL', '33EARR'];
const HAIR_PART_CODES = ['02HAIR', '32FHAR'];
const NOSE_CODE = '35NOSE';

const FIXED_COLORS: Record<string, string> = {
  '05EYEL': '#ffffff',
  '06EYER': '#ffffff',
  '36TETH': '#f8f8f2',
  '37TONG': '#c45a5a',
  '03EBLL': '#3d2817',
  '04EBRL': '#3d2817',
};

const DEFAULT_OUTFIT_COLORS: Record<string, string> = {
  '10TORS': '#3a4a5e', '11AUPL': '#3a4a5e', '12AUPR': '#3a4a5e',
  '13ALWL': '#3a4a5e', '14ALWR': '#3a4a5e',
  '17HIPS': '#2d3546', '18LEGL': '#4a5a75', '19LEGR': '#4a5a75',
  '20FOTL': '#2a2a30', '21FOTR': '#2a2a30',
};

const BLENDSHAPE_KEYS = {
  feminine: ['Feminine', 'bs_Feminine', 'defaultFeminine', 'body_Feminine'],
  heavy:    ['Heavy', 'bs_Heavy', 'defaultHeavy', 'body_Heavy'],
  skinny:   ['Skinny', 'bs_Skinny', 'defaultSkinny', 'body_Skinny'],
  bulk:     ['Bulk', 'Buff', 'defaultBuff', 'body_Bulk', 'body_Buff'],
};

function matchPartCode(meshName: string, codes: string[]): boolean {
  return codes.some((c) => meshName.includes(c));
}

function findPartCode(meshName: string): string | null {
  const m = meshName.match(/_\d{2}[A-Z]{3,4}_/);
  return m ? m[0].slice(1, -1) : null;
}

function findBlendIdx(dict: Record<string, number>, keys: string[]): number {
  for (const k of keys) {
    if (dict[k] !== undefined) return dict[k];
    const lower = k.toLowerCase();
    for (const dictKey of Object.keys(dict)) {
      if (dictKey.toLowerCase() === lower || dictKey.toLowerCase().includes(lower)) {
        return dict[dictKey];
      }
    }
  }
  return -1;
}

// ── Breathing idle animation ──

function BreathingRig({ children }: { children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  const startTime = useRef(Date.now());

  useFrame(() => {
    if (!ref.current) return;
    const t = (Date.now() - startTime.current) / 1000;
    // Subtle: 2% scale pulse + tiny Y bob
    const breath = Math.sin(t * 1.4) * 0.5 + 0.5; // 0..1, 2.24s period
    ref.current.scale.y = 1 + breath * 0.005;
    ref.current.scale.x = 1 + breath * 0.003;
    ref.current.position.y = breath * 0.006;
  });

  return <group ref={ref}>{children}</group>;
}

// ── Turntable rotation ──

function TurntableRig({ children, enabled }: { children: React.ReactNode; enabled: boolean }) {
  const ref = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (ref.current && enabled) {
      ref.current.rotation.y += delta * 0.2;
    }
  });

  return <group ref={ref}>{children}</group>;
}

// ── Character Model ──

function CharacterModel({
  bodyGlb, skinColor, hairColor, outfitColors, bodyType, bodySize, muscle,
  animationGlb, animationLoop, onLoad,
}: {
  bodyGlb: number | string;
  skinColor: string;
  hairColor: string;
  outfitColors: Record<string, string>;
  bodyType: number;
  bodySize: number;
  muscle: number;
  animationGlb?: number | string;
  animationLoop?: boolean;
  onLoad?: () => void;
}) {
  const { gltf: bodyGltf } = useGLB(bodyGlb);
  const { gltf: animGltf } = useGLB(animationGlb ?? null as any);
  const onLoadCalled = useRef(false);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const actionRef = useRef<THREE.AnimationAction | null>(null);

  const prepared = useMemo(() => {
    if (!bodyGltf) return null;
    const clone = bodyGltf.scene.clone(true);

    // Fix skeleton binding: Object3D.clone(true) creates new bone objects
    // in the cloned hierarchy but SkinnedMesh.skeleton.bones still points
    // to the ORIGINAL bones. We rebind each SkinnedMesh to use the cloned
    // bones so AnimationMixer transforms are visible on the rendered mesh.
    const bonesByName = new Map<string, any>();
    clone.traverse((n: any) => { if (n.isBone) bonesByName.set(n.name, n); });
    clone.traverse((child: any) => {
      if (child.isSkinnedMesh && child.skeleton) {
        const newBones = child.skeleton.bones.map(
          (b: any) => bonesByName.get(b.name) || b
        );
        child.skeleton = new THREE.Skeleton(newBones);
        child.bind(child.skeleton);
      }
    });

    const meshes: any[] = [];
    clone.traverse((child: any) => {
      if (child.isMesh || child.isSkinnedMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        child.frustumCulled = false;
        if (child.material) {
          child.material = Array.isArray(child.material)
            ? child.material.map((m: any) => m.clone())
            : child.material.clone();
        }
        meshes.push(child);
      }
    });
    // (debug logs removed for production)

    // Normalize to ~1.8m tall, feet at origin
    const box = new THREE.Box3();
    for (const m of meshes) {
      if (m.geometry) {
        if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
        if (m.geometry.boundingBox) box.union(m.geometry.boundingBox);
      }
    }
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    if (isFinite(size.y) && size.y > 0) {
      clone.position.set(-center.x, -box.min.y, -center.z);
      if (size.y > 5 || size.y < 0.5) {
        clone.scale.setScalar(1.8 / size.y);
      }
    }

    return { clone, meshes };
  }, [bodyGltf]);

  // Notify parent once loaded
  useEffect(() => {
    if (prepared && !onLoadCalled.current) {
      onLoadCalled.current = true;
      onLoad?.();
    }
  }, [prepared, onLoad]);

  // Apply colors
  useEffect(() => {
    if (!prepared) return;
    for (const mesh of prepared.meshes) {
      const material: any = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
      if (!material?.color) continue;

      const name = mesh.name || '';
      const partCode = findPartCode(name);

      let targetColor: string | null = null;

      if (partCode && FIXED_COLORS[partCode]) {
        targetColor = FIXED_COLORS[partCode];
      } else if (matchPartCode(name, SKIN_PART_CODES) || name.includes(NOSE_CODE)) {
        targetColor = skinColor;
      } else if (matchPartCode(name, HAIR_PART_CODES)) {
        targetColor = hairColor;
      } else if (partCode && outfitColors[partCode]) {
        targetColor = outfitColors[partCode];
      } else if (partCode && DEFAULT_OUTFIT_COLORS[partCode]) {
        targetColor = DEFAULT_OUTFIT_COLORS[partCode];
      }

      if (targetColor) {
        material.color.set(targetColor);
        // Upgrade material to have some PBR character
        if ('roughness' in material) material.roughness = 0.7;
        if ('metalness' in material) material.metalness = 0.05;
      }
    }
  }, [prepared, skinColor, hairColor, outfitColors]);

  // Apply blendshapes
  useEffect(() => {
    if (!prepared) return;
    for (const mesh of prepared.meshes) {
      if (!mesh.morphTargetInfluences || !mesh.morphTargetDictionary) continue;
      const dict = mesh.morphTargetDictionary;
      const influences = mesh.morphTargetInfluences;

      const fem = findBlendIdx(dict, BLENDSHAPE_KEYS.feminine);
      if (fem !== -1) influences[fem] = bodyType / 100;
      const heavy = findBlendIdx(dict, BLENDSHAPE_KEYS.heavy);
      if (heavy !== -1) influences[heavy] = bodySize > 50 ? (bodySize - 50) / 50 : 0;
      const skinny = findBlendIdx(dict, BLENDSHAPE_KEYS.skinny);
      if (skinny !== -1) influences[skinny] = bodySize < 50 ? (50 - bodySize) / 50 : 0;
      const bulk = findBlendIdx(dict, BLENDSHAPE_KEYS.bulk);
      if (bulk !== -1) influences[bulk] = muscle / 100;
    }
  }, [prepared, bodyType, bodySize, muscle]);

  // Drive the AnimationMixer. When animGltf changes, crossfade from the
  // previous action to the new one over 280ms instead of hard-cutting.
  // Synty Sidekick bone names match across all packs so idle/emote clips
  // retarget 1:1 onto the character's skeleton.
  useEffect(() => {
    if (!prepared) return;
    if (!animGltf) {
      // No animation requested — tear down any previous one.
      if (mixerRef.current) {
        mixerRef.current.stopAllAction();
        mixerRef.current = null;
        actionRef.current = null;
      }
      return;
    }
    const rawClip = animGltf.animations?.[0];
    if (!rawClip) return;

    // Fix track binding: standalone animation GLBs store track paths as
    // "Root/Hips/Spine/Chest.quaternion" but the character model's scene
    // graph has a different hierarchy. Strip the directory prefix so THREE
    // matches by BONE NAME only (e.g. "Chest.quaternion"). This is the
    // standard retargeting approach for Synty Sidekick cross-GLB animations.
    const clip = rawClip.clone();
    for (const track of clip.tracks) {
      const dotIdx = track.name.lastIndexOf('.');
      if (dotIdx === -1) continue;
      const pathPart = track.name.substring(0, dotIdx); // "Root/Hips/Spine/Chest"
      const propPart = track.name.substring(dotIdx);     // ".quaternion"
      const slashIdx = pathPart.lastIndexOf('/');
      if (slashIdx !== -1) {
        // Strip path, keep only the leaf bone name + property
        track.name = pathPart.substring(slashIdx + 1) + propPart;
      }
    }

    try {
      // Reuse the same mixer if we already have one (keeps state consistent
      // for crossfade). Otherwise create a fresh one bound to the model.
      const mixer = mixerRef.current ?? new THREE.AnimationMixer(prepared.clone);
      // (debug logging removed for production)
      const newAction = mixer.clipAction(clip);
      newAction.setLoop(
        animationLoop === false ? THREE.LoopOnce : THREE.LoopRepeat,
        animationLoop === false ? 1 : Infinity,
      );
      newAction.clampWhenFinished = animationLoop === false;
      newAction.reset();

      const prev = actionRef.current;
      if (prev && prev !== newAction) {
        // Crossfade: ramp new action up while previous fades out.
        newAction.play();
        prev.crossFadeTo(newAction, 0.28, false);
      } else {
        newAction.play();
      }
      mixerRef.current = mixer;
      actionRef.current = newAction;
    } catch (e) {
      if (__DEV__) console.warn('[Character3D] animation retarget failed:', e);
    }
  }, [prepared, animGltf, animationLoop]);

  // Tick the mixer every frame
  useFrame((_, delta) => {
    mixerRef.current?.update(delta);
  });

  if (!prepared) return null;
  return <primitive object={prepared.clone} />;
}

// ── Floor plate (receives shadow for grounded look) ──

function Floor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.002, 0]} receiveShadow>
      <circleGeometry args={[1.5, 48]} />
      <meshStandardMaterial
        color="#0a0e27"
        roughness={0.9}
        metalness={0}
        transparent
        opacity={0.45}
      />
    </mesh>
  );
}

// ── Main Component ──

export function Character3D({
  width, height, bodyGlb,
  skinColor = '#dcb088',
  hairColor = '#3d2817',
  outfitColors = {},
  bodyType = 30, bodySize = 50, muscle = 50,
  mode = 'display',
  cameraDistance = 3.2,
  cameraHeight = 1.1,
  autoRotate,
  showFloor = true,
  animationGlb,
  animationLoop = true,
  onTap, style,
}: Character3DProps) {
  const [loaded, setLoaded] = useState(false);
  const shouldRotate = autoRotate ?? (mode === 'creator');

  // Smooth fade-in when the model finishes loading — prevents "pop".
  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!loaded) return;
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 350,
      useNativeDriver: true,
    }).start();
  }, [loaded, fadeAnim]);

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
        camera={{
          position: [0, cameraHeight, cameraDistance],
          fov: 42,
          near: 0.01,
          far: 1000,
        }}
        onCreated={(state: any) => {
          state.camera.lookAt(0, 0.95, 0);
        }}
        style={StyleSheet.absoluteFill as any}
      >
        {/* ── AAA three-point lighting ── */}

        {/* Ambient baseline (slight cool tint) */}
        <ambientLight intensity={0.35} color="#b8c4e0" />

        {/* Key light — warm, from upper-front-right */}
        <directionalLight
          position={[2.5, 4, 3]}
          intensity={1.2}
          color="#fff4e0"
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-camera-near={0.1}
          shadow-camera-far={20}
          shadow-camera-left={-2}
          shadow-camera-right={2}
          shadow-camera-top={2}
          shadow-camera-bottom={-1}
          shadow-bias={-0.0005}
        />

        {/* Fill light — cool, from opposite side, softer */}
        <directionalLight
          position={[-2, 2, 1.5]}
          intensity={0.5}
          color="#a8c8f0"
        />

        {/* Rim light — behind character, creates silhouette highlight */}
        <directionalLight
          position={[0, 3, -3]}
          intensity={0.9}
          color="#ff9a5a"
        />

        {/* Hemisphere for ambient gradient (sky → ground) */}
        <hemisphereLight
          args={['#6080a0', '#1a1820', 0.35]}
        />

        {/* Character + animation rigs */}
        <TurntableRig enabled={shouldRotate}>
          <BreathingRig>
            <CharacterModel
              bodyGlb={bodyGlb}
              skinColor={skinColor}
              hairColor={hairColor}
              outfitColors={outfitColors}
              bodyType={bodyType}
              bodySize={bodySize}
              muscle={muscle}
              animationGlb={animationGlb}
              animationLoop={animationLoop}
              onLoad={() => setLoaded(true)}
            />
          </BreathingRig>
        </TurntableRig>

        {/* Floor (receives shadow) */}
        {showFloor && <Floor />}
      </Canvas>
      </Animated.View>

      {/* Loading overlay */}
      {!loaded && (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <ActivityIndicator color={themeColors.orange} size="large" />
          <Text style={styles.loadingText}>Loading character…</Text>
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
