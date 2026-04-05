import React, { useState } from 'react';
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

export function FortniteEmoteWheel({ visible, equippedEmotes, onSelect, onClose }: FortniteEmoteWheelProps) {
  const [hoveredSlot, setHoveredSlot] = useState<number | null>(null);

  if (!visible) return null;

  const handleSlotPress = (index: number) => {
    const emoteId = equippedEmotes[index];
    if (!emoteId) return;
    haptics.tap();
    playSound('click');
    onSelect(emoteId);
    onClose();
  };

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      {/* Dark overlay — tap to close */}
      <Pressable style={styles.overlay} onPress={onClose}>
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
            const emoteId = equippedEmotes[index] as EmoteId | undefined;
            const emoji = emoteId ? (EMOTE_EMOJI[emoteId] || '?') : '?';
            const name = emoteId ? (EMOTE_NAME[emoteId] || 'Empty') : 'Empty';
            const isEmpty = !emoteId;
            const isHovered = hoveredSlot === index;

            return (
              <Pressable
                key={index}
                onPressIn={() => setHoveredSlot(index)}
                onPressOut={() => setHoveredSlot(null)}
                onPress={() => handleSlotPress(index)}
                style={[
                  styles.slot,
                  {
                    left: SCREEN_WIDTH / 2 + x - SLOT_SIZE / 2,
                    top: SCREEN_HEIGHT / 2 + y - SLOT_SIZE / 2 - 20,
                  },
                  isHovered && !isEmpty && styles.slotHovered,
                  isEmpty && styles.slotEmpty,
                ]}
              >
                <LinearGradient
                  colors={
                    isHovered && !isEmpty
                      ? ['rgba(255,140,0,0.35)', 'rgba(255,100,0,0.15)']
                      : isEmpty
                        ? ['rgba(255,255,255,0.03)', 'rgba(255,255,255,0.01)']
                        : ['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.04)']
                  }
                  style={styles.slotGradient}
                >
                  <Text style={[styles.slotEmoji, isEmpty && styles.slotEmojiEmpty]}>
                    {emoji}
                  </Text>
                  <Text
                    style={[styles.slotName, isEmpty && styles.slotNameEmpty]}
                    numberOfLines={1}
                  >
                    {name}
                  </Text>
                </LinearGradient>
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
