import React, { useRef, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Animated } from 'react-native';
import { haptics } from '../../services/haptics';
import { playSound } from '../../services/audio';
import { colors } from '../../theme/colors';
import { fonts, weight } from '../../theme/typography';
import { QUICK_CHAT_MESSAGES, type QuickChatMessage } from '../../data/quickChat';

// Pill button with tap feedback
function ChatPill({ message, onPress }: { message: QuickChatMessage; onPress: (msg: QuickChatMessage) => void }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = useCallback(() => {
    haptics.tap();
    playSound('click');
    onPress(message);
    // Brief pulse
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 0.9, useNativeDriver: true, speed: 60, bounciness: 10 }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 8 }),
    ]).start();
  }, [message, onPress, scaleAnim]);

  // Category colors for subtle tint
  const categoryColor = {
    friendly: colors.green,
    competitive: colors.orange,
    reaction: colors.purple,
    gg: colors.teal,
  }[message.category];

  return (
    <Pressable onPress={handlePress}>
      <Animated.View style={[
        styles.pill,
        { borderColor: `${categoryColor}44`, transform: [{ scale: scaleAnim }] },
      ]}>
        <Text style={styles.pillText}>{message.text}</Text>
      </Animated.View>
    </Pressable>
  );
}

interface QuickChatBarProps {
  onSend: (message: QuickChatMessage) => void;
  visible: boolean;
}

/**
 * Horizontal scrollable bar of quick chat pill buttons.
 * Appears when the chat button is tapped during gameplay.
 */
export function QuickChatBar({ onSend, visible }: QuickChatBarProps) {
  if (!visible) return null;

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {QUICK_CHAT_MESSAGES.map((msg) => (
          <ChatPill key={msg.id} message={msg} onPress={onSend} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 8,
    marginTop: 4,
    maxWidth: '100%',
  },
  scrollContent: {
    paddingHorizontal: 12,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pill: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  pillText: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 13,
    color: '#ffffff',
    letterSpacing: 0.3,
  },
});
