/**
 * OutfitPreviewModal — 3D preview + buy/equip for a single outfit.
 *
 * Shows the player's current customization (skin/hair/body sliders/colors)
 * but swaps in the outfit being previewed. Tap Apply to equip (if owned),
 * or Buy to purchase with coins.
 */
import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { Character3DPortrait } from '../3d/Character3DPortrait';
import { PressScale } from '../animations';
import { useCharacterStore } from '../../stores/characterStore';
import { OUTFITS } from '../../data/outfitRegistry';
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
}

export function OutfitPreviewModal({
  visible, outfitId, price, isOwned, isEquipped, canAfford,
  onClose, onBuy, onEquip,
}: Props) {
  const playerCust = useCharacterStore((s) => s.customization);
  const outfit = outfitId ? OUTFITS[outfitId] : null;

  if (!outfit) return null;

  // Inject the preview outfit into a cloned customization so the 3D portrait
  // shows THIS outfit, not whatever the player is currently wearing.
  const previewCustomization = {
    ...playerCust,
    outfitId: outfit.id,
  };

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
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View entering={FadeIn.duration(180)} style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View entering={SlideInDown.springify().damping(14)} style={styles.card}>
          <Text style={styles.title}>{outfit.packLabel}</Text>
          <Text style={styles.subtitle}>#{String(outfit.index).padStart(2, '0')} · {outfit.species.toUpperCase()}</Text>

          {/* 3D preview */}
          <View style={styles.previewWrap}>
            <Character3DPortrait
              width={220} height={300}
              customization={previewCustomization}
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
                <Text style={[styles.statusText, { color: colors.orange }]}>🪙 {price}</Text>
              </View>
            )}
          </View>

          {/* Action buttons */}
          <View style={styles.actionRow}>
            <PressScale onPress={() => { haptics.tap(); onClose(); }}>
              <View style={styles.cancelBtn}>
                <Text style={styles.cancelText}>CLOSE</Text>
              </View>
            </PressScale>
            {isEquipped ? null : isOwned ? (
              <PressScale onPress={handleEquip}>
                <LinearGradient colors={['#ff8c00', '#cc5500']} style={styles.primaryBtn}>
                  <Text style={styles.primaryText}>EQUIP</Text>
                </LinearGradient>
              </PressScale>
            ) : (
              <PressScale onPress={canAfford ? handleBuy : () => haptics.error()}>
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
    </Modal>
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
  cancelBtn: {
    flex: 1, borderRadius: 14, paddingVertical: 13, alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  cancelText: {
    fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 12,
    color: colors.textSecondary, letterSpacing: 1,
  },
  primaryBtn: {
    flex: 2, borderRadius: 14, paddingVertical: 13, alignItems: 'center',
    shadowColor: '#ff8c00', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5, shadowRadius: 8, elevation: 6,
  },
  primaryText: {
    fontFamily: fonts.heading, fontWeight: weight.bold, fontSize: 13,
    color: '#fff', letterSpacing: 1.2,
  },
});
