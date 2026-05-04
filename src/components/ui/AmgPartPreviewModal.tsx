/**
 * AmgPartPreviewModal — try-on preview before buying an AMG part.
 *
 * The shop's old buy flow went straight from a card tap to an OS
 * confirm dialog. Devon's audit said "for the clothes i need to be
 * able to see it on the player before i buy it, everything needs a
 * preview." This modal shows the player's current amgCharacter with
 * the previewed part swapped into the matching slot via Character3DPortrait,
 * a clear price + rarity readout, and BUY / CANCEL.
 *
 * The slot the part goes into is read from the manifest entry the
 * caller passes in, so attachments / face / armor previews route to
 * the right slot just like the equip flow.
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { PreviewSafeModal } from './PreviewSafeModal';
import { Character3DPortrait } from '../3d/Character3DPortrait';
import { useCharacterStore } from '../../stores/characterStore';
import {
  getPartPrice,
  RARITY_COLORS,
  RARITY_LABELS,
} from '../../data/amgPartPricing';
import { packMeta, slotEmoji } from '../../data/amgPackMeta';
import type { CharacterState } from '@amg/character-runtime/types';
import { haptics } from '../../services/haptics';
import { playSound } from '../../services/audio';
import { colors } from '../../theme/colors';
import { fonts, weight } from '../../theme/typography';

const SLOT_LABEL: Record<string, string> = {
  '01HEAD': 'HEAD', '02HAIR': 'HAIR',
  '03EBRL': 'BROW L', '04EBRR': 'BROW R',
  '05EYEL': 'EYE L', '06EYER': 'EYE R',
  '07EARL': 'EAR L', '08EARR': 'EAR R',
  '09FCHR': 'BEARD',
  '10TORS': 'TORSO',
  '11AUPL': 'ARM UL', '12AUPR': 'ARM UR',
  '13ALWL': 'ARM LL', '14ALWR': 'ARM LR',
  '15HNDL': 'HAND L', '16HNDR': 'HAND R',
  '17HIPS': 'HIPS',
  '18LEGL': 'LEG L', '19LEGR': 'LEG R',
  '20FOTL': 'FOOT L', '21FOTR': 'FOOT R',
  '22AHED': 'HELM', '23AFAC': 'MASK',
  '24ABAC': 'BACK',
  '25AHPF': 'HIP F', '26AHPB': 'HIP B',
  '27AHPL': 'HIP SL', '28AHPR': 'HIP SR',
  '29ASHL': 'PAULDRN', '30ASHR': 'PAULDRN',
  '35NOSE': 'NOSE',
};
function slotLabel(partName: string): string {
  const m = partName.match(/_(\d{2}[A-Z]+)_/);
  const code = m?.[1];
  return (code && SLOT_LABEL[code]) || 'PART';
}

interface Props {
  visible: boolean;
  partName: string | null;
  /** Slot the manifest reports for this part — used to graft the
   *  preview into the right CharacterState slot. */
  slot: string | null;
  canAfford: boolean;
  onClose: () => void;
  onBuy: (partName: string) => void;
  /** Post-pivot 2026-05-03 override: locked-state CTA label. When set,
   *  the button always renders enabled with this label and the coin
   *  affordability check is bypassed. The shop wires onBuy to box-
   *  routing or shard-spend instead of a coin debit. */
  lockedActionLabel?: string;

  // ── Wardrobe mode (Phase 1 of AMG_WARDROBE_ARCHITECTURE) ─────────
  // When the modal is opened from the Customize → CLOTHES wardrobe
  // flow (owned part, dressing-room mirror), wire these instead of
  // / alongside the shop's onBuy. Action row composes from whichever
  // handlers are set.

  /** Tap WEAR → equip the part on the player's character. Visible
   *  when set + the part is owned. Disabled visual when the part
   *  is currently equipped (becomes a passive WEARING badge). */
  onEquip?: () => void;
  /** Tap VARIANTS → open the colorway gallery. Visible when set. */
  onOpenVariants?: () => void;
  /** True when the player is currently wearing this exact part.
   *  Switches the WEAR button into a passive "WEARING ✓" state. */
  isCurrentlyEquipped?: boolean;
}

export function AmgPartPreviewModal({
  visible, partName, slot, canAfford, onClose, onBuy,
  lockedActionLabel,
  onEquip, onOpenVariants, isCurrentlyEquipped,
}: Props) {
  const playerCharacter = useCharacterStore((s) => s.amgCharacter) as unknown as CharacterState | null;

  if (!partName || !slot) return null;

  const { price, rarity, pack } = getPartPrice(partName);
  const meta = packMeta(pack);
  const rarityColor = RARITY_COLORS[rarity];
  const rarityLabel = RARITY_LABELS[rarity];
  const variantMatch = partName.match(/^SK_[A-Z]{4}_[A-Z]{4}_(\d{2})_/);
  const variant = variantMatch ? variantMatch[1] : '??';

  // Build a try-on character: player's current state with the
  // previewed part swapped into its slot. CompositeCharacter's
  // incremental swap logic handles the visual transition cleanly.
  const previewCharacter: CharacterState | null = playerCharacter
    ? {
        ...playerCharacter,
        parts: { ...playerCharacter.parts, [slot]: partName },
      }
    : null;

  return (
    <PreviewSafeModal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Animated.View entering={FadeIn.duration(180)} style={styles.overlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close part preview"
        />
        <Animated.View entering={SlideInDown.springify().damping(14)} style={[styles.card, { borderColor: rarityColor }]}>
          <LinearGradient
            colors={[rarityColor + '30', 'rgba(10,14,32,0.95)']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
          />

          {/* Header — slot + pack identity */}
          <View style={styles.header}>
            <Text style={styles.slotEmoji}>{slotEmoji(partName, meta.emoji)}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.slotLabel, { color: rarityColor }]}>{slotLabel(partName)}</Text>
              <Text style={styles.packLine}>
                {meta.emoji}  {meta.displayName} ·{variant}
              </Text>
            </View>
            <Text style={[styles.rarityChip, { color: rarityColor, borderColor: rarityColor }]}>
              {rarityLabel}
            </Text>
          </View>

          {/* Live preview — player's character with this part on */}
          <View style={styles.previewWrap}>
            {previewCharacter && (
              <Character3DPortrait
                width={240}
                height={300}
                customization={previewCharacter}
                showFloor={false}
                autoRotate
              />
            )}
          </View>

          {/* Action row — composes from which handlers the caller
              wires. Three modes:
                · Wardrobe (owned): VARIANTS + WEAR/WEARING✓
                · Locked (shop or wardrobe): GET FROM BAGS / lockedActionLabel
                · Legacy direct-buy (kept for shop backward compat): BUY · 500 */}
          <View style={styles.actionRow}>
            <Pressable
              onPress={() => { haptics.tap(); onClose(); }}
              style={styles.cancelBtn}
              accessibilityRole="button"
              accessibilityLabel="Cancel preview"
            >
              <Text style={styles.cancelText}>CANCEL</Text>
            </Pressable>

            {onOpenVariants && (
              <Pressable
                onPress={() => { haptics.tap(); playSound('click'); onOpenVariants(); }}
                {...(Platform.OS === 'web'
                  ? ({ onClick: () => { haptics.tap(); playSound('click'); onOpenVariants(); } } as any)
                  : {})}
                style={styles.variantsBtnWrap}
                accessibilityRole="button"
                accessibilityLabel="Open colorway variants"
              >
                <View style={styles.variantsBtn}>
                  <Text style={styles.variantsText}>VARIANTS</Text>
                </View>
              </Pressable>
            )}

            {onEquip ? (
              <Pressable
                onPress={() => {
                  if (isCurrentlyEquipped) return;
                  haptics.win();
                  playSound('whoosh');
                  onEquip();
                }}
                {...(Platform.OS === 'web'
                  ? ({ onClick: () => {
                      if (isCurrentlyEquipped) return;
                      haptics.win();
                      playSound('whoosh');
                      onEquip();
                    } } as any)
                  : {})}
                style={styles.buyBtnWrap}
                accessibilityRole="button"
                accessibilityLabel={isCurrentlyEquipped ? 'Currently wearing' : 'Wear this part'}
                accessibilityState={{ disabled: !!isCurrentlyEquipped }}
              >
                <LinearGradient
                  colors={isCurrentlyEquipped ? ['#3eb489', '#2a8b66'] : ['#ffce63', '#ff9a2c', '#e87617', '#b85c0e']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={styles.buyBtn}
                >
                  <Text style={styles.buyText}>
                    {isCurrentlyEquipped ? 'WEARING ✓' : 'WEAR'}
                  </Text>
                </LinearGradient>
              </Pressable>
            ) : lockedActionLabel ? (
              // Locked state: single primary CTA the catalog routes to
              // box-pickup or shard-spend. Always enabled.
              <Pressable
                onPress={() => onBuy(partName)}
                {...(Platform.OS === 'web'
                  ? ({ onClick: () => onBuy(partName) } as any)
                  : {})}
                style={styles.buyBtnWrap}
                accessibilityRole="button"
                accessibilityLabel={lockedActionLabel}
              >
                <LinearGradient
                  colors={['#ffce63', '#ff9a2c', '#e87617', '#b85c0e']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={styles.buyBtn}
                >
                  <Text style={styles.buyText}>{lockedActionLabel}</Text>
                </LinearGradient>
              </Pressable>
            ) : (
              // Legacy direct-buy path (kept for shop backward compat).
              <Pressable
                onPress={() => {
                  if (!canAfford) { haptics.error(); playSound('error'); return; }
                  onBuy(partName);
                }}
                {...(Platform.OS === 'web'
                  ? ({ onClick: () => {
                      if (!canAfford) { haptics.error(); playSound('error'); return; }
                      onBuy(partName);
                    } } as any)
                  : {})}
                style={styles.buyBtnWrap}
                accessibilityRole="button"
                accessibilityLabel={canAfford ? `Buy for ${price} coins` : 'Not enough coins'}
                accessibilityState={{ disabled: !canAfford }}
              >
                <LinearGradient
                  colors={canAfford ? ['#ff8c00', '#cc5500'] : ['#555', '#333']}
                  style={styles.buyBtn}
                >
                  <Text style={styles.buyText}>
                    {canAfford ? `BUY · ${price}\u{1FA99}` : 'NOT ENOUGH COINS'}
                  </Text>
                </LinearGradient>
              </Pressable>
            )}
          </View>
        </Animated.View>
      </Animated.View>
    </PreviewSafeModal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center', justifyContent: 'center', padding: 18,
  },
  card: {
    width: '100%', maxWidth: 360,
    borderRadius: 22, padding: 16, gap: 12,
    borderWidth: 2,
    overflow: 'hidden',
    backgroundColor: '#0a0e27',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  slotEmoji: {
    fontSize: 36,
  },
  slotLabel: {
    fontFamily: fonts.heading,
    fontWeight: weight.black,
    fontSize: 18,
    letterSpacing: 1.6,
  },
  packLine: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  rarityChip: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 9,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1.5,
    letterSpacing: 1.2,
  },
  previewWrap: {
    width: 240, height: 300,
    alignSelf: 'center',
    borderRadius: 14, overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  actionRow: {
    flexDirection: 'row', gap: 10,
  },
  cancelBtn: {
    flex: 1, borderRadius: 14, paddingVertical: 12, alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  cancelText: {
    fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 12,
    color: colors.textSecondary, letterSpacing: 1,
  },
  buyBtnWrap: {
    flex: 2,
    shadowColor: '#ff8c00', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5, shadowRadius: 8, elevation: 6,
  },
  buyBtn: {
    borderRadius: 14, paddingVertical: 12, alignItems: 'center',
    borderWidth: 1.5, borderColor: 'rgba(255,210,120,0.85)',
  },
  buyText: {
    fontFamily: fonts.heading, fontWeight: weight.black, fontSize: 14,
    color: '#fff', letterSpacing: 1.4,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  // Secondary "VARIANTS" button — opens the colorway gallery from
  // the wardrobe path. Quieter visual than WEAR so the primary
  // action stays clear.
  variantsBtnWrap: {
    flex: 1.4,
  },
  variantsBtn: {
    borderRadius: 14, paddingVertical: 12, alignItems: 'center',
    backgroundColor: 'rgba(155,89,182,0.18)',
    borderWidth: 1.5, borderColor: 'rgba(155,89,182,0.7)',
  },
  variantsText: {
    fontFamily: fonts.heading, fontWeight: weight.black, fontSize: 12,
    color: '#c997e7', letterSpacing: 1.4,
  },
});
