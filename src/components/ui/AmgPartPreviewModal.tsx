// ═══════════════════════════════════════════════════════════════════════
// AmgPartPreviewModal (Drop4 wrapper)
//
// The dressing-room mirror modal lives in @amg/cosmetic-ui as a headless
// component. Drop4's wrapper injects:
//   · drop4CosmeticAdapter — rarity / pack / ownership lookups
//   · the player's current amgCharacter from useCharacterStore
//   · a renderCharacterPreview function that mounts Character3DPortrait
//     with the swapped character
//   · Drop4's haptics + sound services
//
// Tic Tac Toe / RPS+ / Chess will write their own equivalents — same
// engine modal, different adapter + renderer wiring. See
// amg-engine/docs/AMG_WARDROBE_ARCHITECTURE.md.
// ═══════════════════════════════════════════════════════════════════════

import React from 'react';
import { PreviewSafeModal } from './PreviewSafeModal';
import { Character3DPortrait } from '../3d/Character3DPortrait';
import { useCharacterStore } from '../../stores/characterStore';
import type { CharacterState } from '@amg/character-runtime/types';
import { haptics } from '../../services/haptics';
import { playSound } from '../../services/audio';
import { drop4CosmeticAdapter } from '../../services/cosmeticAdapter';
import {
  AmgPartPreviewModal as EngineAmgPartPreviewModal,
} from '@amg/cosmetic-ui';

interface Props {
  visible: boolean;
  partName: string | null;
  slot: string | null;
  canAfford: boolean;
  onClose: () => void;
  onBuy: (partName: string) => void;
  /** Locked-state primary CTA label (e.g. "GET FROM BAGS"). */
  lockedActionLabel?: string;
  /** Wardrobe-mode WEAR action — when set, replaces the buy primary. */
  onEquip?: () => void;
  /** Wardrobe-mode VARIANTS secondary action — when set, renders the
   *  purple VARIANTS button next to WEAR. */
  onOpenVariants?: () => void;
  /** True when the player is currently wearing this exact part. */
  isCurrentlyEquipped?: boolean;
  /** Override the modal header slot label (e.g. "BROWS" / "EARS" for
   *  Drop4 FACE-bucket pair-collapsed cards). Falls through to the
   *  engine default (slotLabel(partName)) when unset. */
  slotLabelOverride?: string;
}

export function AmgPartPreviewModal(props: Props) {
  const playerCharacter = useCharacterStore((s) => s.amgCharacter) as unknown as CharacterState | null;

  // Mount inside PreviewSafeModal — the engine modal renders an
  // overlay-positioned card; the host modal wrapper handles iOS
  // safe-area + animation contract.
  return (
    <PreviewSafeModal
      visible={props.visible}
      transparent
      animationType="slide"
      onRequestClose={props.onClose}
    >
      <EngineAmgPartPreviewModal
        visible={props.visible}
        partName={props.partName}
        slot={props.slot}
        adapter={drop4CosmeticAdapter}
        currentCharacter={playerCharacter}
        renderCharacterPreview={(swapped, opts) => {
          // Per-slot camera framing. Face / brow / beard / ear /
          // hair details are invisible in the default full-body
          // shot — use the head-zoomed face preset instead. Per
          // docs/CUSTOMIZE_VISUAL_AUDIT_2026-05-04.md Fix 3.
          const FACE_OR_HAIR_SLOTS = new Set([
            'Hair',
            'EyebrowLeft', 'EyebrowRight',
            'EarLeft', 'EarRight',
            'FacialHair',
            'Nose',
          ]);
          const cameraPreset: 'body' | 'face' = FACE_OR_HAIR_SLOTS.has(opts.slot) ? 'face' : 'body';
          return (
            <Character3DPortrait
              width={opts.width}
              height={opts.height}
              customization={swapped as CharacterState}
              showFloor={false}
              autoRotate
              cameraPreset={cameraPreset}
            />
          );
        }}
        onClose={props.onClose}
        onEquip={props.onEquip}
        onOpenVariants={props.onOpenVariants}
        isCurrentlyEquipped={props.isCurrentlyEquipped}
        lockedActionLabel={props.lockedActionLabel}
        onBuy={props.onBuy}
        canAfford={props.canAfford}
        slotLabelOverride={props.slotLabelOverride}
        hooks={{
          onTap: haptics.tap,
          onSelect: haptics.select,
          onError: haptics.error,
          playClick: () => playSound('click'),
          playWhoosh: () => playSound('whoosh'),
          playError: () => playSound('error'),
        }}
      />
    </PreviewSafeModal>
  );
}
