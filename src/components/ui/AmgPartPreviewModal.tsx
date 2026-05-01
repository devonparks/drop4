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
import { View, Text, StyleSheet, Pressable } from 'react-native';
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
}

export function AmgPartPreviewModal({
  visible, partName, slot, canAfford, onClose, onBuy,
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

          {/* Action row */}
          <View style={styles.actionRow}>
            <Pressable
              onPress={() => { haptics.tap(); onClose(); }}
              style={styles.cancelBtn}
              accessibilityRole="button"
              accessibilityLabel="Cancel preview"
            >
              <Text style={styles.cancelText}>CANCEL</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                if (!canAfford) { haptics.error(); playSound('error'); return; }
                onBuy(partName);
              }}
              accessibilityRole="button"
              accessibilityLabel={canAfford ? `Buy for ${price} coins` : 'Not enough coins'}
              accessibilityState={{ disabled: !canAfford }}
            >
              <LinearGradient
                colors={canAfford ? ['#ff8c00', '#cc5500'] : ['#555', '#333']}
                style={styles.buyBtn}
              >
                <Text style={styles.buyText}>
                  {canAfford ? `BUY · ${price}🪙` : 'NOT ENOUGH COINS'}
                </Text>
              </LinearGradient>
            </Pressable>
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
  buyBtn: {
    flex: 2, borderRadius: 14, paddingVertical: 12, alignItems: 'center',
    shadowColor: '#ff8c00', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5, shadowRadius: 8, elevation: 6,
  },
  buyText: {
    fontFamily: fonts.heading, fontWeight: weight.bold, fontSize: 14,
    color: '#fff', letterSpacing: 1.2,
  },
});
