/**
 * Character3DPortrait — drop-in replacement for legacy 2D
 * AnimatedCharacter/CharacterAvatar usage.
 *
 * Reads the current player's customization from characterStore and renders
 * a Character3D at the given size. Falls back silently to null if the
 * 3D feature flag is off — call sites should keep their 2D fallback and
 * swap in this portrait when FEATURES.character3D is true.
 *
 * Usage:
 *   {FEATURES.character3D
 *     ? <Character3DPortrait width={120} height={160} />
 *     : <AnimatedCharacter ... />}
 *
 * For NPC opponents (not the local player), pass an explicit
 * customization object via the `customization` prop.
 */

import React from 'react';
import { Character3D } from './Character3D';
import { useCharacterStore, type CharacterCustomization } from '../../stores/characterStore';
import { OUTFITS } from '../../data/outfitRegistry';
import { DEFAULT_HUMAN_IDLE, findAnimation } from '../../data/animationRegistry';

export interface Character3DPortraitProps {
  width: number;
  height: number;
  /** Override customization — omit to use local player's. */
  customization?: CharacterCustomization;
  /** Play a specific animation id (e.g. 'emote_dab'). Defaults to base idle. */
  animationId?: string | null;
  /** False = play once, true = loop (default true for idles, false for emotes). */
  animationLoop?: boolean;
  mode?: 'display' | 'creator';
  autoRotate?: boolean;
  showFloor?: boolean;
  onTap?: () => void;
}

export function Character3DPortrait({
  width, height, customization,
  animationId, animationLoop,
  mode = 'display', autoRotate, showFloor = true, onTap,
}: Character3DPortraitProps) {
  const playerCustom = useCharacterStore((s) => s.customization);
  const c = customization ?? playerCustom;

  const outfit = OUTFITS[c.outfitId];
  // Fallback: if the requested outfit id isn't in the registry (legacy save),
  // use the first available human outfit so we never crash on a missing GLB.
  const glb = outfit?.glb ?? OUTFITS['human_modern_civilians_01']?.glb ?? OUTFITS[Object.keys(OUTFITS)[0]]?.glb;
  if (glb == null) return null;

  // Pick animation: explicit id → registry lookup → default idle → none
  const animMeta = animationId ? findAnimation(animationId) : DEFAULT_HUMAN_IDLE;
  const animGlb = animMeta?.glb;
  const loop = animationLoop ?? animMeta?.loop ?? true;

  return (
    <Character3D
      width={width}
      height={height}
      bodyGlb={glb}
      skinColor={c.skinColor}
      hairColor={c.hairColor}
      outfitColors={c.outfitColors}
      bodyType={c.bodyType}
      bodySize={c.bodySize}
      muscle={c.muscle}
      mode={mode}
      autoRotate={autoRotate}
      showFloor={showFloor}
      animationGlb={animGlb}
      animationLoop={loop}
      onTap={onTap}
    />
  );
}
