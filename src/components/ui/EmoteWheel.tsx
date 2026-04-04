import React from 'react';
import { View, Text, Pressable, StyleSheet, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { haptics } from '../../services/haptics';
import { playSound } from '../../services/audio';
import { colors } from '../../theme/colors';
import { fonts, weight } from '../../theme/typography';
import type { EmoteId } from './AnimatedCharacter';

const WHEEL_SIZE = 280;
const CENTER_SIZE = 60;

interface EmoteConfig {
  id: EmoteId;
  name: string;
  icon: string;
  unlocked: boolean;
  type: 'emote' | 'pose';
}

const WHEEL_ITEMS: EmoteConfig[] = [
  // Top row (emotes)
  { id: 'thumbsup', name: 'Thumbs Up', icon: '👍', unlocked: true, type: 'emote' },
  { id: 'wave', name: 'Wave', icon: '👋', unlocked: true, type: 'emote' },
  { id: 'happy', name: 'Happy', icon: '😄', unlocked: true, type: 'emote' },
  { id: 'dab', name: 'Dab', icon: '🕺', unlocked: true, type: 'emote' },
  // Bottom row (more emotes + poses)
  { id: 'dance', name: 'Dance', icon: '💃', unlocked: false, type: 'emote' },
  { id: 'celebrate', name: 'Celebrate', icon: '🎉', unlocked: false, type: 'emote' },
  { id: 'sad', name: 'Sad', icon: '😢', unlocked: false, type: 'emote' },
  { id: 'angry', name: 'Angry', icon: '😤', unlocked: false, type: 'emote' },
];

interface EmoteWheelProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (emoteId: EmoteId) => void;
}

export function EmoteWheel({ visible, onClose, onSelect }: EmoteWheelProps) {
  if (!visible) return null;

  const handleSelect = (item: EmoteConfig) => {
    if (!item.unlocked) {
      haptics.error();
      return;
    }
    haptics.tap();
    playSound('click');
    onSelect(item.id);
    onClose();
  };

  // Position items in a circle
  const radius = WHEEL_SIZE / 2 - 35;

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={styles.wheelContainer}>
          {/* Center button (close) */}
          <View style={styles.centerBtn}>
            <Text style={styles.centerIcon}>✕</Text>
          </View>

          {/* Emote slots arranged in circle */}
          {WHEEL_ITEMS.map((item, i) => {
            const angle = (i / WHEEL_ITEMS.length) * Math.PI * 2 - Math.PI / 2;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;

            return (
              <Pressable
                key={item.id}
                onPress={() => handleSelect(item)}
                style={[
                  styles.wheelSlot,
                  {
                    left: WHEEL_SIZE / 2 + x - 32,
                    top: WHEEL_SIZE / 2 + y - 32,
                  },
                  !item.unlocked && styles.lockedSlot,
                ]}
              >
                <LinearGradient
                  colors={item.unlocked
                    ? ['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.04)']
                    : ['rgba(255,255,255,0.04)', 'rgba(255,255,255,0.02)']
                  }
                  style={styles.slotGradient}
                >
                  <Text style={[styles.slotIcon, !item.unlocked && { opacity: 0.3 }]}>
                    {item.icon}
                  </Text>
                  <Text style={[styles.slotName, !item.unlocked && { opacity: 0.3 }]}>
                    {item.name}
                  </Text>
                  {!item.unlocked && (
                    <Text style={styles.lockBadge}>🔒</Text>
                  )}
                </LinearGradient>
              </Pressable>
            );
          })}

          {/* Type labels */}
          <Text style={[styles.typeLabel, { top: -20 }]}>EMOTES</Text>
        </View>
      </Pressable>
    </Modal>
  );
}

// Trigger button that opens the wheel
interface EmoteWheelTriggerProps {
  onPress: () => void;
}

export function EmoteWheelTrigger({ onPress }: EmoteWheelTriggerProps) {
  return (
    <Pressable onPress={() => { haptics.tap(); onPress(); }} style={styles.triggerBtn}>
      <LinearGradient
        colors={['rgba(255,140,0,0.2)', 'rgba(255,140,0,0.08)']}
        style={styles.triggerGradient}
      >
        <Text style={styles.triggerIcon}>😀</Text>
        <Text style={styles.triggerLabel}>EMOTES</Text>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wheelContainer: {
    width: WHEEL_SIZE,
    height: WHEEL_SIZE,
    position: 'relative',
  },
  centerBtn: {
    position: 'absolute',
    left: WHEEL_SIZE / 2 - CENTER_SIZE / 2,
    top: WHEEL_SIZE / 2 - CENTER_SIZE / 2,
    width: CENTER_SIZE,
    height: CENTER_SIZE,
    borderRadius: CENTER_SIZE / 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  centerIcon: {
    fontSize: 20,
    color: 'rgba(255,255,255,0.6)',
  },
  wheelSlot: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 16,
    overflow: 'hidden',
  },
  lockedSlot: {
    opacity: 0.5,
  },
  slotGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    gap: 2,
  },
  slotIcon: {
    fontSize: 24,
  },
  slotName: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 8,
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  lockBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    fontSize: 10,
  },
  typeLabel: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 10,
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: 2,
  },
  // Trigger button
  triggerBtn: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  triggerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,140,0,0.3)',
  },
  triggerIcon: {
    fontSize: 20,
  },
  triggerLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 12,
    color: colors.orange,
    letterSpacing: 1,
  },
});
