/**
 * Character3DPortrait — the standard player portrait component.
 *
 * Reads the current player's customization from characterStore and renders
 * a Character3D at the given size.
 *
 * Usage:
 *   <Character3DPortrait width={120} height={160} />
 *
 * For NPC opponents (not the local player), pass an explicit
 * customization object via the `customization` prop.
 */

import React from 'react';
import { Character3D } from './Character3D';
import { useCharacterStore, type CharacterCustomization } from '../../stores/characterStore';
import { OUTFITS } from '../../data/outfitRegistry';
import { DEFAULT_HUMAN_IDLE, HUMAN_IDLES, findAnimation } from '../../data/animationRegistry';

/**
 * Pick a stable idle for a given character. Rather than everyone doing the
 * same "base" idle, we hash the outfit + body type to a looping idle so each
 * NPC has a distinctive default pose (arms folded, hands on hips, etc).
 * The player still gets the base idle for legibility on their own character.
 */
function pickDefaultIdle(outfitId: string, bodyType: number) {
  const loopingIdles = HUMAN_IDLES.filter((i) => i.loop);
  if (loopingIdles.length === 0) return DEFAULT_HUMAN_IDLE;
  // Simple sum hash — stable per customization, spreads across all idles
  let h = bodyType | 0;
  for (let i = 0; i < outfitId.length; i++) h = (h + outfitId.charCodeAt(i)) & 0xffff;
  return loopingIdles[h % loopingIdles.length];
}

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

  // Pick animation: explicit id → registry lookup → hashed default idle →
  // registry fallback. NPCs get varied idles (arms-folded, hands-on-hips,
  // grumpy, base) based on their customization hash so the world feels alive.
  const animMeta = animationId
    ? findAnimation(animationId)
    : pickDefaultIdle(c.outfitId, c.bodyType);
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
