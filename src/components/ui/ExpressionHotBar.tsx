import React, { useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { haptics } from '../../services/haptics';
import { playSound } from '../../services/audio';
import { fonts, weight } from '../../theme/typography';

/** Detect if a string is a text phrase (not emoji) */
const isPhrase = (s: string) => /^[A-Za-z !?]+$/.test(s);

interface ExpressionHotBarProps {
  /** The 6 favorites from shopStore.hotBarFavorites */
  favorites: string[];
  /** Fires with the selected item (emoji char or phrase text) */
  onSelect: (item: string) => void;
  /** Fires when expand chevron is tapped */
  onExpand: () => void;
  disabled?: boolean;
}

/**
 * Compact expression hot bar — wrapping grid of favorites + expand button.
 * Fits inside a narrow center column between character portraits.
 * 2-second cooldown between fires to prevent spam.
 */
export function ExpressionHotBar({ favorites, onSelect, onExpand, disabled }: ExpressionHotBarProps) {
  const [cooldown, setCooldown] = useState(false);
  const [lastPressed, setLastPressed] = useState<string | null>(null);
  const cooldownRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fire = useCallback((item: string) => {
    if (cooldown || disabled) return;
    haptics.tap();
    playSound('click');
    setLastPressed(item);
    setCooldown(true);
    onSelect(item);

    if (cooldownRef.current) clearTimeout(cooldownRef.current);
    cooldownRef.current = setTimeout(() => {
      setCooldown(false);
      setLastPressed(null);
    }, 2000);
  }, [cooldown, disabled, onSelect]);

  return (
    <View style={styles.bar}>
      {/* 3-column wrapping grid of favorites */}
      <View style={styles.grid}>
        {favorites.map((item, idx) => {
          if (!item) return null;
          const isActive = lastPressed === item;
          const phrase = isPhrase(item);

          return (
            <Pressable
              key={`${item}-${idx}`}
              onPress={() => fire(item)}
              style={[
                styles.btn,
                isActive && styles.btnActive,
                (cooldown && !isActive) && styles.btnMuted,
              ]}
              accessibilityRole="button"
              accessibilityLabel={phrase ? `Say ${item}` : `React with ${item}`}
            >
              <Text style={[
                phrase ? styles.phraseText : styles.emojiText,
                isActive && phrase && styles.phraseTextActive,
                (cooldown && !isActive) && styles.muted,
              ]}>
                {item}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Expand button */}
      <Pressable
        onPress={() => { haptics.tap(); playSound('click'); onExpand(); }}
        style={styles.expandBtn}
        accessibilityRole="button"
        accessibilityLabel="Open expression panel"
      >
        <Text style={styles.expandIcon}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    padding: 4,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    gap: 3,
    width: '100%',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 4,
  },
  btn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  btnActive: {
    backgroundColor: 'rgba(255,140,0,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255,140,0,0.5)',
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
    fontSize: 8,
    letterSpacing: 0.3,
    color: 'rgba(255,255,255,0.7)',
  },
  phraseTextActive: {
    color: '#ff8c00',
  },
  muted: {
    opacity: 0.5,
  },
  expandBtn: {
    width: '100%',
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,140,0,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,140,0,0.3)',
  },
  expandIcon: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ff8c00',
  },
});
