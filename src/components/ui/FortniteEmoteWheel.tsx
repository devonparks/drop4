import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Modal, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { haptics } from '../../services/haptics';
import { playSound } from '../../services/audio';
import { colors } from '../../theme/colors';
import { fonts, weight } from '../../theme/typography';
import type { EmoteId } from './AnimatedCharacter';
import { EMOTE_EMOJI, EMOTE_NAME } from './EmoteShowcase';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const WHEEL_RADIUS = 110;
const SLOT_SIZE = 70;

// Slot angles in degrees: top, top-right, bottom-right, bottom, bottom-left, top-left
const SLOT_ANGLES_DEG = [90, 30, -30, -90, -150, 150];

interface FortniteEmoteWheelProps {
  visible: boolean;
  equippedEmotes: EmoteId[];
  onSelect: (emoteId: EmoteId) => void;
  onClose: () => void;
}

// A slot can be either a universal equipped emote or a character-locked signature.
// Signatures come from the roster store's equipped character; they displace
// universal slots at the front of the wheel so players ALWAYS see their
// character's signatures first without having to equip them manually.
interface WheelSlot {
  id: string;              // emote id (universal) or signature id (string)
  emoji: string;
  name: string;
  isSignature: boolean;
  isEmpty: boolean;
}

const EMPTY_SLOT: WheelSlot = { id: '', emoji: '?', name: 'Empty', isSignature: false, isEmpty: true };

export function FortniteEmoteWheel({ visible, equippedEmotes, onSelect, onClose }: FortniteEmoteWheelProps) {
  const [hoveredSlot, setHoveredSlot] = useState<number | null>(null);

  // v1: all characters share the same emote pool. Signature emotes are
  // disabled until character art ships in v1.1.
  const slots: WheelSlot[] = useMemo(() => {
    const universals: WheelSlot[] = equippedEmotes.map((id) =>
      id
        ? {
            id,
            emoji: EMOTE_EMOJI[id] || '?',
            name: EMOTE_NAME[id] || 'Empty',
            isSignature: false,
            isEmpty: false,
          }
        : EMPTY_SLOT,
    );

    while (universals.length < 6) universals.push(EMPTY_SLOT);
    return universals.slice(0, 6);
  }, [equippedEmotes]);

  if (!visible) return null;

  const handleSlotPress = (index: number) => {
    const slot = slots[index];
    if (!slot || slot.isEmpty) return;
    haptics.tap();
    playSound('click');
    // Signature ids are strings outside the EmoteId union. Cast at the boundary —
    // AnimatedCharacter's emote prop already accepts strings for signature paths.
    onSelect(slot.id as EmoteId);
    onClose();
  };

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      {/* Dark overlay — tap to close */}
      <Pressable
        style={styles.overlay}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close emote wheel"
        accessibilityHint="Tap outside the wheel to dismiss"
      >
        <View style={styles.wheelArea}>
          {/* Center glow + label */}
          <View style={styles.centerGlow}>
            <Text style={styles.centerText}>EMOTES</Text>
          </View>

          {/* 6 emote slots arranged in hexagonal ring */}
          {SLOT_ANGLES_DEG.map((angleDeg, index) => {
            const angleRad = (angleDeg * Math.PI) / 180;
            const x = Math.cos(angleRad) * WHEEL_RADIUS;
            const y = -Math.sin(angleRad) * WHEEL_RADIUS; // negative because screen Y is inverted
            const slot = slots[index];
            const { emoji, name, isEmpty, isSignature } = slot;
            const isHovered = hoveredSlot === index;

            // Signature slots get a gold ring + gradient so players can tell
            // "this emote is mine, character-locked" at a glance.
            const hoverGradient: [string, string] = isSignature
              ? ['rgba(255,215,0,0.45)', 'rgba(255,170,0,0.18)']
              : ['rgba(255,140,0,0.35)', 'rgba(255,100,0,0.15)'];
            const idleGradient: [string, string] = isSignature
              ? ['rgba(255,215,0,0.22)', 'rgba(255,170,0,0.06)']
              : ['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.04)'];

            return (
              <Pressable
                key={index}
                onPressIn={() => setHoveredSlot(index)}
                onPressOut={() => setHoveredSlot(null)}
                onPress={() => handleSlotPress(index)}
                accessibilityRole="button"
                accessibilityLabel={
                  isEmpty
                    ? `Empty emote slot ${index + 1}`
                    : `Play ${name} emote${isSignature ? ', signature' : ''}, slot ${index + 1}`
                }
                accessibilityHint={isEmpty ? 'Equip an emote to this slot in the shop' : 'Triggers this emote and closes the wheel'}
                accessibilityState={{ disabled: isEmpty }}
                style={[
                  styles.slot,
                  {
                    left: SCREEN_WIDTH / 2 + x - SLOT_SIZE / 2,
                    top: SCREEN_HEIGHT / 2 + y - SLOT_SIZE / 2 - 20,
                  },
                  isHovered && !isEmpty && styles.slotHovered,
                  isEmpty && styles.slotEmpty,
                  isSignature && styles.slotSignature,
                ]}
              >
                <LinearGradient
                  colors={
                    isHovered && !isEmpty
                      ? hoverGradient
                      : isEmpty
                        ? ['rgba(255,255,255,0.03)', 'rgba(255,255,255,0.01)']
                        : idleGradient
                  }
                  style={styles.slotGradient}
                >
                  <Text style={[styles.slotEmoji, isEmpty && styles.slotEmojiEmpty]}>
                    {emoji}
                  </Text>
                  <Text
                    style={[
                      styles.slotName,
                      isEmpty && styles.slotNameEmpty,
                      isSignature && styles.slotNameSignature,
                    ]}
                    numberOfLines={1}
                  >
                    {name}
                  </Text>
                </LinearGradient>
                {isSignature && <Text style={styles.signatureBadge}>✦</Text>}
              </Pressable>
            );
          })}

          {/* Slot index labels (subtle, around outside) */}
          {SLOT_ANGLES_DEG.map((angleDeg, index) => {
            const angleRad = (angleDeg * Math.PI) / 180;
            const labelRadius = WHEEL_RADIUS + SLOT_SIZE / 2 + 12;
            const x = Math.cos(angleRad) * labelRadius;
            const y = -Math.sin(angleRad) * labelRadius;
            return (
              <Text
                key={`label-${index}`}
                style={[
                  styles.slotIndex,
                  {
                    left: SCREEN_WIDTH / 2 + x - 8,
                    top: SCREEN_HEIGHT / 2 + y - 8 - 20,
                  },
                ]}
              >
                {index + 1}
              </Text>
            );
          })}
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.80)',
  },
  wheelArea: {
    flex: 1,
    position: 'relative',
  },

  // Center
  centerGlow: {
    position: 'absolute',
    left: SCREEN_WIDTH / 2 - 40,
    top: SCREEN_HEIGHT / 2 - 40 - 20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,140,0,0.08)',
    borderWidth: 2,
    borderColor: 'rgba(255,140,0,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ff8c00',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  centerText: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 11,
    color: colors.orange,
    letterSpacing: 2,
    textShadowColor: 'rgba(255,140,0,0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },

  // Slots
  slot: {
    position: 'absolute',
    width: SLOT_SIZE,
    height: SLOT_SIZE,
    borderRadius: SLOT_SIZE / 2,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  slotHovered: {
    borderColor: colors.orange,
    shadowColor: colors.orange,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 14,
    elevation: 8,
  },
  slotEmpty: {
    borderColor: 'rgba(255,255,255,0.06)',
    opacity: 0.4,
  },
  slotSignature: {
    borderColor: 'rgba(255,215,0,0.85)',
    borderWidth: 2.5,
    shadowColor: '#ffd700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 7,
  },
  slotNameSignature: {
    color: '#ffd700',
  },
  signatureBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(255,215,0,0.95)',
    color: '#1a1200',
    fontSize: 11,
    fontWeight: '900',
    textAlign: 'center',
    lineHeight: 18,
    shadowColor: '#ffd700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  slotGradient: {
    width: '100%',
    height: '100%',
    borderRadius: SLOT_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  slotEmoji: {
    fontSize: 32,
  },
  slotEmojiEmpty: {
    opacity: 0.3,
    fontSize: 20,
  },
  slotName: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 8,
    color: '#ffffff',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  slotNameEmpty: {
    opacity: 0.3,
  },
  slotIndex: {
    position: 'absolute',
    width: 16,
    height: 16,
    textAlign: 'center',
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 9,
    color: 'rgba(255,255,255,0.15)',
  },
});
