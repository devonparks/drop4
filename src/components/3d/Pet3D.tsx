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
    if (isFinite(size.y) && size.y > 0) {
      clone.position.set(-center.x, -box.min.y, -center.z);
      if (size.y > 3 || size.y < 0.1) clone.scale.setScalar(0.7 / size.y);
    }

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
    const clip = animGltf.animations?.[0];
    if (!clip) return;
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
  cameraDistance = 1.6, cameraHeight = 0.5, autoRotate = false, style,
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

  return (
    <View style={[{ width, height }, style]}>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: fadeAnim }]}>
      <Canvas
        frameloop="always"
        gl={{ antialias: true, alpha: true } as any}
        shadows
        camera={{ position: [0, cameraHeight, cameraDistance], fov: 40, near: 0.01, far: 100 }}
        onCreated={(state: any) => state.camera.lookAt(0, 0.25, 0)}
        style={StyleSheet.absoluteFill as any}
      >
        <ambientLight intensity={0.5} color="#d0d8f0" />
        <directionalLight position={[2, 3, 2]} intensity={1.0} color="#fff4e0" castShadow />
        <directionalLight position={[-2, 2, 1]} intensity={0.4} color="#a8c8f0" />
        <hemisphereLight args={['#6080a0', '#1a1820', 0.3]} />
        <TurntableRig enabled={autoRotate}>
          <PetModel
            petGlb={petGlb}
            animationGlb={animationGlb}
            animationLoop={animationLoop}
            onLoad={() => setLoaded(true)}
          />
        </TurntableRig>
      </Canvas>
      </Animated.View>
      {!loaded && (
        <View style={styles.overlay} pointerEvents="none">
          <ActivityIndicator color={themeColors.orange} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
});
