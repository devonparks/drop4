import React, { useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { haptics } from '../../services/haptics';
import { fonts, weight } from '../../theme/typography';

// Quick-react emojis — punchy, universal
const EMOJIS = [
  { id: '😂', label: 'Haha' },
  { id: '🔥', label: 'Fire' },
  { id: '😤', label: 'Angry' },
  { id: '👏', label: 'Clap' },
  { id: '😎', label: 'Cool' },
  { id: '💀', label: 'Dead' },
  { id: '🤯', label: 'Mind' },
  { id: '👀', label: 'Look' },
];

// Quick-chat phrases — the trash talk / hype layer
const PHRASES = [
  { text: 'GG', color: '#4caf50' },
  { text: 'Nice!', color: '#2196f3' },
  { text: 'LOL', color: '#ff9800' },
  { text: 'Wow', color: '#9c27b0' },
  { text: 'Oops', color: '#f44336' },
  { text: 'Bruh', color: '#607d8b' },
  { text: 'EZ', color: '#ffc107' },
  { text: 'No way', color: '#e91e63' },
];

interface ReactionBarProps {
  /** Fires with emoji string for emoji taps */
  onReact: (emoji: string) => void;
  /** Fires with phrase text for chat phrase taps */
  onPhrase?: (phrase: string) => void;
  disabled?: boolean;
}

/**
 * Social bar — emojis on top, quick-chat phrases below.
 * 2-second cooldown between any reaction to prevent spam.
 */
export function ReactionBar({ onReact, onPhrase, disabled }: ReactionBarProps) {
  const [cooldown, setCooldown] = useState(false);
  const [lastPressed, setLastPressed] = useState<string | null>(null);
  const cooldownRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fire = useCallback((id: string, type: 'emoji' | 'phrase') => {
    if (cooldown || disabled) return;
    haptics.tap();
    setLastPressed(id);
    setCooldown(true);

    if (type === 'emoji') {
      onReact(id);
    } else {
      onPhrase?.(id) ?? onReact(id);
    }

    if (cooldownRef.current) clearTimeout(cooldownRef.current);
    cooldownRef.current = setTimeout(() => {
      setCooldown(false);
      setLastPressed(null);
    }, 2000);
  }, [cooldown, disabled, onReact, onPhrase]);

  return (
    <View style={styles.bar}>
      {/* Emoji row */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {EMOJIS.map(({ id, label }) => {
          const isActive = lastPressed === id;
          return (
            <Pressable
              key={id}
              onPress={() => fire(id, 'emoji')}
              style={[
                styles.emojiBtn,
                isActive && styles.btnActive,
                (cooldown && !isActive) && styles.btnMuted,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`React with ${label}`}
            >
              <Text style={[styles.emojiText, (cooldown && !isActive) && styles.muted]}>
                {id}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Phrase row */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {PHRASES.map(({ text, color }) => {
          const isActive = lastPressed === text;
          return (
            <Pressable
              key={text}
              onPress={() => fire(text, 'phrase')}
              style={[
                styles.phraseBtn,
                isActive && [styles.btnActive, { borderColor: `${color}66` }],
                (cooldown && !isActive) && styles.btnMuted,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Say ${text}`}
            >
              <Text style={[
                styles.phraseText,
                { color: isActive ? color : 'rgba(255,255,255,0.7)' },
                (cooldown && !isActive) && styles.muted,
              ]}>
                {text}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    marginTop: 4,
    paddingVertical: 3,
    paddingHorizontal: 4,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    gap: 2,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 2,
  },
  emojiBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  phraseBtn: {
    paddingHorizontal: 8,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  btnActive: {
    backgroundColor: 'rgba(255,140,0,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,140,0,0.4)',
  },
  btnMuted: {
    opacity: 0.3,
  },
  emojiText: {
    fontSize: 16,
  },
  phraseText: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  muted: {
    opacity: 0.5,
  },
});
