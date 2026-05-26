/**
 * Pet3D — lightweight 3D pet renderer (dogs).
 *
 * Mirrors Character3D but specialised for quadrupeds:
 *  - No blendshapes / no color swaps (Polygon Dogs use baked textures)
 *  - Uses a different camera framing (lower, wider)
 *  - Optional AnimationClip retargeted onto the dog skeleton
 *
 * Usage:
 *   <Pet3D width={140} height={140}
 *          petGlb={PETS.dog_labrador.glb!}
 *          animationGlb={DOG_IDLES[0]?.glb} />
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, ViewStyle, ActivityIndicator, Animated } from 'react-native';
import { Canvas, useFrame } from '@react-three/fiber/native';
import * as THREE from 'three';
import { useGLB } from '../../utils/glbLoader';
import { colors as themeColors } from '../../theme/colors';
import { DOG_IDLES, DOG_IDLE_POOL } from '../../data/animationRegistry';

interface Pet3DProps {
  width: number;
  height: number;
  petGlb: number | string;
  animationGlb?: number | string;
  animationLoop?: boolean;
  cameraDistance?: number;
  cameraHeight?: number;
  autoRotate?: boolean;
  style?: ViewStyle;
  /** When true (and no explicit animationGlb is set), cycle through
   *  DOG_IDLE_POOL every 6-12 s so the dog feels alive — sniffs floor,
   *  shakes fur, scratches, yawns, wags tail. Mirrors the human
   *  character's idle cycling. Default: true. Set false on static
   *  surfaces (shop preview thumbnails) where you want one pose. */
  cycleIdles?: boolean;
}

function TurntableRig({ children, enabled }: { children: React.ReactNode; enabled: boolean }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (ref.current && enabled) ref.current.rotation.y += delta * 0.25;
  });
  return <group ref={ref}>{children}</group>;
}

function PetModel({
  petGlb, animationGlb, animationLoop, onLoad,
}: {
  petGlb: number | string;
  animationGlb?: number | string;
  animationLoop?: boolean;
  onLoad?: () => void;
}) {
  const { gltf } = useGLB(petGlb);
  const { gltf: animGltf } = useGLB((animationGlb ?? null) as any);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const onLoadCalled = useRef(false);

  const prepared = useMemo(() => {
    if (!gltf) return null;
    const clone = gltf.scene.clone(true);
    clone.traverse((child: any) => {
      if (child.isMesh || child.isSkinnedMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        child.frustumCulled = false;
      }
    });

    // Normalise scale (dogs export at 1 Unity unit ≈ 1m already)
    const box = new THREE.Box3();
    clone.traverse((c: any) => {
      if (c.geometry) {
        if (!c.geometry.boundingBox) c.geometry.computeBoundingBox();
        if (c.geometry.boundingBox) box.union(c.geometry.boundingBox);
      }
    });
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    // Hard-normalise the dog to ~0.4 m tall regardless of source GLB
    // size. Smaller than 0.5 to leave headroom in the canvas frame
    // (Devon 2026-05-05: "the top of the head is cut off"). At 0.4 m
    // a sitting dog with ears tops out at ~0.45 m; standing dog at
    // ~0.5 m. Camera FOV at distance 1.5 sees ~0.75 m vertical → dog
    // fits comfortably with ~0.15 m of breathing room above.
    if (isFinite(size.y) && size.y > 0) {
      const targetHeight = 0.4;
      const s = targetHeight / size.y;
      clone.scale.setScalar(s);
      clone.position.set(-center.x * s, -box.min.y * s, -center.z * s);
    }
    // Rotate dog 3/4 view (~30°) so we see the FACE + side profile.
    clone.rotation.y = Math.PI * 0.85; // ~153°, face + slight side
    return clone;
  }, [gltf]);

  useEffect(() => {
    if (prepared && !onLoadCalled.current) {
      onLoadCalled.current = true;
      onLoad?.();
    }
  }, [prepared, onLoad]);

  useEffect(() => {
    if (mixerRef.current) {
      mixerRef.current.stopAllAction();
      mixerRef.current = null;
    }
    if (!prepared || !animGltf) return;
    const rawClip = animGltf.animations?.[0];
    if (!rawClip) return;
    // Strip path prefixes so track names match bone names in the pet model
    const clip = rawClip.clone();
    for (const track of clip.tracks) {
      const dotIdx = track.name.lastIndexOf('.');
      if (dotIdx === -1) continue;
      const pathPart = track.name.substring(0, dotIdx);
      const propPart = track.name.substring(dotIdx);
      const slashIdx = pathPart.lastIndexOf('/');
      if (slashIdx !== -1) {
        track.name = pathPart.substring(slashIdx + 1) + propPart;
      }
    }
    try {
      const mixer = new THREE.AnimationMixer(prepared);
      const action = mixer.clipAction(clip);
      action.setLoop(
        animationLoop === false ? THREE.LoopOnce : THREE.LoopRepeat,
        animationLoop === false ? 1 : Infinity,
      );
      action.clampWhenFinished = animationLoop === false;
      action.play();
      mixerRef.current = mixer;
    } catch (e) {
      if (__DEV__) console.warn('[Pet3D] animation retarget failed:', e);
    }
  }, [prepared, animGltf, animationLoop]);

  useFrame((_, delta) => { mixerRef.current?.update(delta); });

  if (!prepared) return null;
  return <primitive object={prepared} />;
}

export function Pet3D({
  width, height, petGlb, animationGlb, animationLoop = true,
  cameraDistance = 1.5, cameraHeight = 0.4, autoRotate = false, style,
  cycleIdles = true,
}: Pet3DProps) {
  const [loaded, setLoaded] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!loaded) return;
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [loaded, fadeAnim]);

  // ── "Alive" idle cycling — Devon 2026-05-05 ──
  //
  // Pick a starting idle deterministically per pet (hash of GLB id) so
  // the same dog opens with the same pose every render. Then advance
  // through DOG_IDLE_POOL on a 6-12 s timer, so the dog is sniffing /
  // shaking / digging / yawning instead of frozen in one frame. Same
  // pattern CompositeCharacter uses for the human idle cycle.
  // When cycleIdles=false (shop preview thumbnails, NPC roster cards)
  // the dog stays on its starting pose deterministically.
  const startingIdleIdx = useMemo(() => {
    const seed = typeof petGlb === 'number' ? petGlb : 0;
    return Math.abs(seed) % Math.max(1, DOG_IDLE_POOL.length);
  }, [petGlb]);
  const [idleIdx, setIdleIdx] = useState(startingIdleIdx);

  useEffect(() => {
    if (!cycleIdles || animationGlb != null) return;
    if (DOG_IDLE_POOL.length < 2) return;
    // Random dwell 4-8 s so the dog visibly cycles. Tighter than the
    // human's 8-15 s because the dog is the secondary character on
    // the stage — viewer expects more action from the pet companion.
    const ms = 4_000 + Math.random() * 4_000;
    const t = setTimeout(() => {
      setIdleIdx((prev) => {
        let next = prev;
        // Force a different pose each cycle so the dog visibly changes.
        while (next === prev) next = Math.floor(Math.random() * DOG_IDLE_POOL.length);
        return next;
      });
    }, ms);
    return () => clearTimeout(t);
  }, [cycleIdles, animationGlb, idleIdx]);

  // Resolve the active animation GLB. Priority:
  //   1. Explicit animationGlb prop (caller forces one pose / emote)
  //   2. Cycling idle from DOG_IDLE_POOL (when cycleIdles=true, default)
  //   3. Fallback: stable default per-pet pick from DOG_IDLES (3 entries)
  const effectiveAnimGlb = useMemo(() => {
    if (animationGlb != null) return animationGlb;
    if (cycleIdles && DOG_IDLE_POOL.length > 0) {
      return DOG_IDLE_POOL[idleIdx % DOG_IDLE_POOL.length]?.glb;
    }
    if (DOG_IDLES.length === 0) return undefined;
    const seed = typeof petGlb === 'number' ? petGlb : 0;
    return DOG_IDLES[Math.abs(seed) % DOG_IDLES.length]?.glb;
  }, [animationGlb, cycleIdles, idleIdx, petGlb]);

  return (
    <View style={[{ width, height }, style]}>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: fadeAnim }]}>
      <Canvas
        frameloop="always"
        gl={{ antialias: true, alpha: true } as any}
        shadows
        camera={{ position: [0, cameraHeight, cameraDistance], fov: 32, near: 0.01, far: 100 }}
        onCreated={(state: any) => state.camera.lookAt(0, 0.18, 0)}
        style={StyleSheet.absoluteFill as any}
      >
        <ambientLight intensity={0.5} color="#d0d8f0" />
        <directionalLight position={[2, 3, 2]} intensity={1.0} color="#fff4e0" castShadow />
        <directionalLight position={[-2, 2, 1]} intensity={0.4} color="#a8c8f0" />
        <hemisphereLight args={['#6080a0', '#1a1820', 0.3]} />
        <TurntableRig enabled={autoRotate}>
          <PetModel
            petGlb={petGlb}
            animationGlb={effectiveAnimGlb}
            animationLoop={animationLoop}
            onLoad={() => setLoaded(true)}
          />
        </TurntableRig>
      </Canvas>
      </Animated.View>
      {!loaded && (
        <View style={[styles.overlay, { pointerEvents: 'none' }]}>
          <ActivityIndicator color={themeColors.orange} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
});
