/**
 * OutfitPreviewModal — 3D preview + buy/equip for a single outfit.
 *
 * Shows the player's current customization (skin/hair/body sliders/colors)
 * but swaps in the outfit being previewed. Tap Apply to equip (if owned),
 * or Buy to purchase with coins.
 */
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { PreviewSafeModal } from './PreviewSafeModal';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { Character3DPortrait } from '../3d/Character3DPortrait';
import { PressScale } from '../animations';
import { useCharacterStore } from '../../stores/characterStore';
import { OUTFITS } from '../../data/outfitRegistry';
import { buildAmgCharacterForOutfit } from '../../data/npcCustomizations';
import type { CharacterState } from '@amg/character-runtime';
import { haptics } from '../../services/haptics';
import { playSound } from '../../services/audio';
import { colors } from '../../theme/colors';
import { fonts, weight } from '../../theme/typography';

interface Props {
  visible: boolean;
  outfitId: string | null;
  price: number;
  isOwned: boolean;
  isEquipped: boolean;
  canAfford: boolean;
  onClose: () => void;
  onBuy: () => void;
  onEquip: () => void;
  /** Optional override for the locked-state primary CTA. When set, the
   *  button always renders enabled with this label and `canAfford`/`price`
   *  are ignored for the button (they still drive the status pill copy).
   *  Used post-pivot 2026-05-03 so the BUY button can read "OPEN BOXES"
   *  or "USE N SHARDS" instead of a now-defunct coin price. */
  lockedActionLabel?: string;
  /** Optional copy to show in the status pill when not owned. Defaults
   *  to the coin price ("🪙 X") if absent. Set to e.g. "IN BAGS" so
   *  locked items don't advertise a price the player can't pay. */
  lockedStatusLabel?: string;
}

export function OutfitPreviewModal({
  visible, outfitId, price, isOwned, isEquipped, canAfford,
  onClose, onBuy, onEquip,
  lockedActionLabel, lockedStatusLabel,
}: Props) {
  const playerCharacter = useCharacterStore((s) => s.amgCharacter) as unknown as CharacterState | null;
  const outfit = outfitId ? OUTFITS[outfitId] : null;

  if (!outfit) return null;

  // Build the preview character: outfit-derived body parts (Torso, Hips,
  // arms, legs, feet, hair from the previewed pack), with the player's
  // colors and body sliders applied on top so it reads as "what would I
  // look like in this?" rather than a generic mannequin.
  const previewBase = buildAmgCharacterForOutfit(outfit.id);
  const previewCharacter: CharacterState = playerCharacter
    ? {
        ...previewBase,
        colors: { ...previewBase.colors, ...playerCharacter.colors },
        blendshapes: playerCharacter.blendshapes,
      }
    : previewBase;

  const handleBuy = () => {
    haptics.win();
    playSound('purchase');
    onBuy();
  };
  const handleEquip = () => {
    haptics.select();
    playSound('click');
    onEquip();
  };

  return (
    <PreviewSafeModal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Animated.View entering={FadeIn.duration(180)} style={styles.overlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close outfit preview"
        />
        <Animated.View entering={SlideInDown.springify().damping(14)} style={styles.card}>
          <Text style={styles.title}>{outfit.packLabel}</Text>
          <Text style={styles.subtitle}>#{String(outfit.index).padStart(2, '0')} · {outfit.species.toUpperCase()}</Text>

          {/* 3D preview */}
          <View style={styles.previewWrap}>
            <Character3DPortrait
              width={220} height={300}
              customization={previewCharacter}
              showFloor
              autoRotate
            />
          </View>

          {/* Status row */}
          <View style={styles.statusRow}>
            {isEquipped ? (
              <View style={[styles.statusPill, { backgroundColor: 'rgba(74,222,128,0.2)', borderColor: '#4ade80' }]}>
                <Text style={[styles.statusText, { color: '#4ade80' }]}>EQUIPPED</Text>
              </View>
            ) : isOwned ? (
              <View style={[styles.statusPill, { backgroundColor: 'rgba(255,255,255,0.08)', borderColor: colors.textSecondary }]}>
                <Text style={[styles.statusText, { color: colors.textSecondary }]}>OWNED</Text>
              </View>
            ) : (
              <View style={[styles.statusPill, { backgroundColor: 'rgba(255,140,0,0.2)', borderColor: colors.orange }]}>
                <Text style={[styles.statusText, { color: colors.orange }]}>
                  {lockedStatusLabel ?? `🪙 ${price}`}
                </Text>
              </View>
            )}
          </View>

          {/* Action buttons */}
          <View style={styles.actionRow}>
            {/* containerStyle puts flex on the outer Pressable so the
             *  row actually splits 1:2 (Close vs primary). Without
             *  containerStyle, PressScale's outer Pressable has no flex
             *  and both buttons collapse to their text width. */}
            <PressScale
              onPress={onClose}
              containerStyle={styles.cancelBtnWrap}
              accessibilityLabel="Close outfit preview"
              accessibilityHint="Dismisses this preview without making changes"
            >
              <View style={styles.cancelBtn}>
                <Text style={styles.cancelText}>CLOSE</Text>
              </View>
            </PressScale>
            {isEquipped ? null : isOwned ? (
              <PressScale
                onPress={handleEquip}
                containerStyle={styles.primaryBtnWrap}
                accessibilityLabel={`Equip ${outfit.packLabel}`}
                accessibilityHint="Equips this outfit on your character"
              >
                <LinearGradient colors={['#ff8c00', '#cc5500']} style={styles.primaryBtn}>
                  <Text style={styles.primaryText}>EQUIP</Text>
                </LinearGradient>
              </PressScale>
            ) : lockedActionLabel ? (
              // Post-pivot: locked items get a single primary CTA the
              // shop wires to box-routing or shard-spend logic. The
              // affordability check moved to the shop layer so this
              // button is always enabled when shown.
              <PressScale
                onPress={handleBuy}
                containerStyle={styles.primaryBtnWrap}
                accessibilityLabel={lockedActionLabel}
                accessibilityHint="Routes to loot boxes or spends shards to unlock"
              >
                <LinearGradient colors={['#ff8c00', '#cc5500']} style={styles.primaryBtn}>
                  <Text style={styles.primaryText}>{lockedActionLabel}</Text>
                </LinearGradient>
              </PressScale>
            ) : (
              <PressScale
                onPress={canAfford ? handleBuy : () => haptics.error()}
                containerStyle={styles.primaryBtnWrap}
                accessibilityLabel={canAfford ? `Buy ${outfit.packLabel} for ${price} coins` : 'Not enough coins'}
                accessibilityHint={canAfford ? 'Spends coins to unlock this outfit' : 'Earn more coins to purchase'}
              >
                <LinearGradient
                  colors={canAfford ? ['#ff8c00', '#cc5500'] : ['#555', '#333']}
                  style={styles.primaryBtn}
                >
                  <Text style={styles.primaryText}>{canAfford ? `BUY · ${price}🪙` : 'NOT ENOUGH COINS'}</Text>
                </LinearGradient>
              </PressScale>
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
    alignItems: 'center', justifyContent: 'center', padding: 20,
  },
  card: {
    width: '100%', maxWidth: 360, backgroundColor: '#0d1030',
    borderRadius: 24, padding: 18, gap: 10,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5, shadowRadius: 20, elevation: 20,
  },
  title: {
    fontFamily: fonts.heading, fontWeight: weight.bold, fontSize: 18,
    color: '#fff', letterSpacing: 1, textAlign: 'center',
  },
  subtitle: {
    fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary,
    letterSpacing: 1.2, textAlign: 'center',
  },
  previewWrap: {
    width: 220, height: 300, borderRadius: 18, overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  statusRow: { alignItems: 'center' },
  statusPill: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 12,
    borderWidth: 1.5,
  },
  statusText: {
    fontFamily: fonts.body, fontWeight: weight.black, fontSize: 12,
    letterSpacing: 1.2,
  },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 4, width: '100%' },
  // Wrappers carry the flex split — applied to PressScale's outer
  // Pressable via containerStyle. The cancelBtn / primaryBtn styles
  // below now just describe the visual fill (rounded rect + paint).
  cancelBtnWrap: { flex: 1 },
  primaryBtnWrap: {
    flex: 2,
    shadowColor: '#ff8c00', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5, shadowRadius: 8, elevation: 6,
  },
  cancelBtn: {
    width: '100%',
    borderRadius: 14, paddingVertical: 13, alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  cancelText: {
    fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 12,
    color: colors.textSecondary, letterSpacing: 1,
  },
  primaryBtn: {
    width: '100%',
    borderRadius: 14, paddingVertical: 13, alignItems: 'center',
  },
  primaryText: {
    fontFamily: fonts.heading, fontWeight: weight.bold, fontSize: 13,
    color: '#fff', letterSpacing: 1.2,
  },
});
