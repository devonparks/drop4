/**
 * EmotePickerModal3D — compact modal for triggering 3D emotes.
 *
 * Pulls the player's equipped emote slot list from shopStore, cross-references
 * the Mixamo-style HUMAN_EMOTES registry, and shows a 2×3 grid. Tapping
 * dismisses the modal and calls `onPlay(animationId)` so the caller can feed
 * it to a Character3D's `animationGlb` prop.
 *
 * Unequipped slots / slots holding legacy 2D emote IDs are rendered disabled.
 */
import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable } from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { PressScale } from '../animations';
import { useShopStore } from '../../stores/shopStore';
import { HUMAN_EMOTES, findAnimation } from '../../data/animationRegistry';
import { haptics } from '../../services/haptics';
import { colors } from '../../theme/colors';
import { fonts, weight } from '../../theme/typography';

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Called with the animationId from animationRegistry when user taps an emote. */
  onPlay: (animationId: string) => void;
}

const CATEGORY_ICON: Record<string, string> = {
  dance: '\u{1F483}',
  taunt: '\u{1F624}',
  greet: '\u{1F44B}',
  emote: '\u2728',
};

export function EmotePickerModal3D({ visible, onClose, onPlay }: Props) {
  const equipped = useShopStore((s) => s.equippedEmotes);

  // Resolve each equipped slot to a HUMAN_EMOTES entry (or null if 2D/legacy)
  const slots = equipped.slice(0, 6).map((id) => ({
    id,
    meta: id ? HUMAN_EMOTES.find((e) => e.id === id) ?? null : null,
  }));

  // Pad to 6 slots
  while (slots.length < 6) slots.push({ id: '', meta: null });

  const handleTap = (slot: { id: string; meta: typeof HUMAN_EMOTES[number] | null }) => {
    if (!slot.meta) {
      haptics.error();
      return;
    }
    haptics.select();
    onPlay(slot.meta.id);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View entering={FadeIn.duration(160)} style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View entering={SlideInDown.springify().damping(14)} style={styles.card}>
          <Text style={styles.title}>EMOTES</Text>
          <Text style={styles.subtitle}>Tap to play</Text>

          <View style={styles.grid}>
            {slots.map((slot, i) => (
              <PressScale key={`${slot.id || 'empty'}-${i}`} onPress={() => handleTap(slot)}>
                <View style={[styles.slot, !slot.meta && styles.slotEmpty]}>
                  {slot.meta ? (
                    <>
                      <Text style={styles.slotIcon}>{CATEGORY_ICON[slot.meta.category] ?? '\u2728'}</Text>
                      <Text style={styles.slotName} numberOfLines={1}>{slot.meta.name}</Text>
                    </>
                  ) : (
                    <Text style={styles.slotEmptyIcon}>{'\u2795'}</Text>
                  )}
                </View>
              </PressScale>
            ))}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 40,
  },
  card: {
    width: '94%', maxWidth: 420, backgroundColor: '#0d1030',
    borderRadius: 24, padding: 18, gap: 12,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5, shadowRadius: 20, elevation: 20,
  },
  title: {
    fontFamily: fonts.heading, fontWeight: weight.bold, fontSize: 18,
    color: '#fff', letterSpacing: 2, textAlign: 'center',
  },
  subtitle: {
    fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary,
    letterSpacing: 0.5, textAlign: 'center',
  },
  grid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center',
  },
  slot: {
    width: 110, height: 90, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1.5, borderColor: 'rgba(255,140,0,0.3)',
    alignItems: 'center', justifyContent: 'center', padding: 6, gap: 4,
  },
  slotEmpty: {
    borderColor: 'rgba(255,255,255,0.08)',
    borderStyle: 'dashed',
  },
  slotIcon: { fontSize: 28 },
  slotName: {
    fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 10,
    color: '#fff', textAlign: 'center', letterSpacing: 0.3,
  },
  slotEmptyIcon: {
    fontSize: 20, color: colors.textSecondary, opacity: 0.4,
  },
});
