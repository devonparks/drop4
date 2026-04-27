/**
 * LiveBackground3D — slow-drifting Connect 4 discs in 3D space.
 *
 * Brand-tied live background for the home screen. 8 discs (mix of red
 * and yellow, the player-1 / player-2 colors) at varying depths and
 * positions, slowly rotating and drifting on independent sin waves so
 * the motion never visibly loops.
 *
 * Designed to RECEDE behind the foreground character + logo + buttons.
 * - Discs are placed mostly off-center / at depth so the central area
 *   stays calm where the character stands.
 * - Lighting is dim ambient + one soft directional so the discs glow
 *   without grabbing attention.
 * - Canvas is transparent — composites over whatever bg is below.
 *
 * Performance: this is a second R3F Canvas on the home screen (the
 * character has its own). Each disc is a single 16-sided cylinder
 * (~64 triangles), so total scene is ~512 triangles — trivial for
 * mobile GPUs. If frame budget gets tight on lower-end devices, the
 * `discCount` prop can be reduced.
 */
import React, { useRef, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Canvas, useFrame } from '@react-three/fiber/native';
import * as THREE from 'three';

const RED = '#E63946';     // player-1 hero red — matches the logo's "4"
const YELLOW = '#F4C435';  // player-2 yellow — matches the warm depth shadow

interface DiscSeed {
  x: number;
  y: number;
  z: number;
  scale: number;
  color: string;
  rotSpeed: number;       // radians per second
  driftAmp: number;       // amplitude of vertical drift
  driftSpeed: number;     // angular freq of drift
  driftPhase: number;     // initial phase offset
  tilt: number;           // initial x-axis tilt (so discs aren't all face-on)
}

// Stable seed values — calculated once, not on every render. The eye
// would notice discs jumping around if they re-randomized.
function buildSeeds(count: number): DiscSeed[] {
  const seeds: DiscSeed[] = [];
  // Pushed discs FAR BACK (z = -12 to -22) and shrunk scale so they
  // read as distant ambient elements, not foreground actors. With the
  // camera at z=0 and FOV 55, discs at z=-15 look ~15% the size they'd
  // appear at z=-3, so they fade into the bg as decoration.
  for (let i = 0; i < count; i++) {
    const t = i / count;
    const angle = t * Math.PI * 2 + (i % 2) * 0.7;
    // Wider radius spread — push discs further from screen center so
    // they cluster around the edges, leaving the middle clear for the
    // character.
    const radius = 4.5 + ((i * 1.7) % 3.5);
    seeds.push({
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * (radius * 0.55) - 0.3,
      z: -12 - ((i * 1.7) % 10),  // depth between -12 and -22 (very far back)
      scale: 0.5 + ((i * 0.27) % 0.5),
      color: i % 2 === 0 ? RED : YELLOW,
      rotSpeed: 0.15 + ((i * 0.07) % 0.2),
      driftAmp: 0.15 + ((i * 0.11) % 0.2),
      driftSpeed: 0.4 + ((i * 0.09) % 0.35),
      driftPhase: (i * 1.31) % (Math.PI * 2),
      tilt: ((i * 0.43) % 0.5) - 0.25,
    });
  }
  return seeds;
}

function Disc({ seed }: { seed: DiscSeed }) {
  const meshRef = useRef<THREE.Mesh>(null);
  // Y-position oscillates around the seed's base y on a slow sin wave.
  const baseY = seed.y;

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;
    meshRef.current.rotation.y = t * seed.rotSpeed;
    meshRef.current.rotation.x = seed.tilt + Math.sin(t * 0.3 + seed.driftPhase) * 0.05;
    meshRef.current.position.y =
      baseY + Math.sin(t * seed.driftSpeed + seed.driftPhase) * seed.driftAmp;
  });

  return (
    <mesh ref={meshRef} position={[seed.x, seed.y, seed.z]} scale={seed.scale}>
      {/* Connect 4 disc: short cylinder seen from various angles. */}
      <cylinderGeometry args={[1, 1, 0.18, 28]} />
      <meshStandardMaterial
        color={seed.color}
        roughness={0.35}
        metalness={0.15}
        // Soft self-emission so discs read as glowing rather than flat —
        // ties to the warm spotlight pool baked into bg-home.
        emissive={seed.color}
        emissiveIntensity={0.18}
      />
    </mesh>
  );
}

function Scene({ discCount }: { discCount: number }) {
  const seeds = useMemo(() => buildSeeds(discCount), [discCount]);
  return (
    <>
      {/* Ambient: dim. We want SHAPES, not detail. */}
      <ambientLight intensity={0.55} />
      {/* One warm directional from upper-right matches the home spotlight */}
      <directionalLight position={[4, 6, 3]} intensity={0.7} color="#ffd8a0" />
      {/* Cool fill from upper-left to keep cool palette in the brand */}
      <directionalLight position={[-3, 4, 2]} intensity={0.35} color="#88a8ff" />
      {seeds.map((seed, i) => (
        <Disc key={i} seed={seed} />
      ))}
    </>
  );
}

interface Props {
  /** How many discs to render. Default 8. Reduce on low-end devices. */
  discCount?: number;
  /** Opacity of the whole layer. Default 0.55 — enough presence, won't
   *  fight the foreground character + logo + PLAY button. */
  opacity?: number;
}

export function LiveBackground3D({ discCount = 8, opacity = 0.55 }: Props) {
  return (
    <View pointerEvents="none" style={[styles.container, { opacity }]}>
      <Canvas
        camera={{ position: [0, 0, 0], fov: 55 }}
        gl={{ antialias: true, alpha: true }}
        style={styles.canvas}
      >
        <Scene discCount={discCount} />
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
  canvas: {
    flex: 1,
  },
});
