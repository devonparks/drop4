import React, { useRef, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Animated } from 'react-native';
import { haptics } from '../../services/haptics';
import { playSound } from '../../services/audio';
import { colors } from '../../theme/colors';
import { fonts, weight } from '../../theme/typography';
import type { EmoteId } from './AnimatedCharacter';

// ═══════════════════════════════════════════
// QUICK EMOTE WHEEL — emoji-based reactions
// Used in-game for fast communication
// ═══════════════════════════════════════════

interface QuickEmote {
  id: EmoteId;
  emoji: string;
  label: string;
  color: string;
}

// 8 quick emotes for in-game use (best ones from each category)
const GAME_QUICK_EMOTES: QuickEmote[] = [
  { id: 'thumbsup', emoji: '👍', label: 'Nice', color: '#2ecc71' },
  { id: 'clapping', emoji: '👏', label: 'GG', color: '#f1c40f' },
  { id: 'laughpoint', emoji: '😂', label: 'Lol', color: '#e67e22' },
  { id: 'angry', emoji: '😤', label: 'Grr', color: '#e74c3c' },
  { id: 'facepalm', emoji: '🤦', label: 'Ugh', color: '#9b59b6' },
  { id: 'flexbiceps', emoji: '💪', label: 'Flex', color: '#3498db' },
  { id: 'dab', emoji: '🕺', label: 'Dab', color: '#e94560' },
  { id: 'wave', emoji: '👋', label: 'Hi', color: '#1abc9c' },
];

// Full emote list for lobby picker
const ALL_EMOTES: QuickEmote[] = [
  // Affection
  { id: 'blowkiss', emoji: '😘', label: 'Kiss', color: '#ff69b4' },
  { id: 'callme', emoji: '🤙', label: 'Call Me', color: '#e67e22' },
  { id: 'fingerheart', emoji: '🫰', label: 'Heart', color: '#e74c3c' },
  { id: 'hearthands', emoji: '🫶', label: 'Love', color: '#ff69b4' },
  // Angry
  { id: 'angry', emoji: '😤', label: 'Angry', color: '#e74c3c' },
  { id: 'tantrum', emoji: '🤬', label: 'Rage', color: '#c0392b' },
  // Celebrate
  { id: 'airguitar', emoji: '🎸', label: 'Guitar', color: '#e67e22' },
  { id: 'beatchest', emoji: '🦍', label: 'Beast', color: '#8B5E3C' },
  { id: 'clapping', emoji: '👏', label: 'Clap', color: '#f1c40f' },
  { id: 'dab', emoji: '🕺', label: 'Dab', color: '#9b59b6' },
  { id: 'dustshoulder', emoji: '💅', label: 'Clean', color: '#1abc9c' },
  { id: 'fingerguns', emoji: '👉', label: 'Pew', color: '#e94560' },
  // Dance
  { id: 'dancechestpump', emoji: '🪩', label: 'Pump', color: '#3498db' },
  { id: 'dancetwist', emoji: '💃', label: 'Twist', color: '#9b59b6' },
  { id: 'dancerunstep', emoji: '🏃', label: 'Run', color: '#2ecc71' },
  // Greet
  { id: 'wave', emoji: '👋', label: 'Wave', color: '#f1c40f' },
  { id: 'bow', emoji: '🙇', label: 'Bow', color: '#8892b0' },
  { id: 'salute', emoji: '🫡', label: 'Salute', color: '#3498db' },
  // Happy
  { id: 'thumbsup', emoji: '👍', label: 'Nice', color: '#2ecc71' },
  { id: 'fistpump', emoji: '✊', label: 'Yes!', color: '#e67e22' },
  { id: 'armsraised', emoji: '🙌', label: 'Hype', color: '#f1c40f' },
  // Reproach
  { id: 'calmdown', emoji: '🤚', label: 'Chill', color: '#3498db' },
  { id: 'shrug', emoji: '🤷', label: 'Shrug', color: '#8892b0' },
  // Sad
  { id: 'facepalm', emoji: '🤦', label: 'Ugh', color: '#9b59b6' },
  { id: 'crying', emoji: '😭', label: 'Cry', color: '#3498db' },
  { id: 'thumbsdown', emoji: '👎', label: 'Boo', color: '#e74c3c' },
  // Sporty
  { id: 'flexbiceps', emoji: '💪', label: 'Flex', color: '#e67e22' },
  { id: 'boxing', emoji: '🥊', label: 'Fight', color: '#e74c3c' },
  // Taunt
  { id: 'laughpoint', emoji: '😂', label: 'Lol', color: '#f1c40f' },
  { id: 'slowclap', emoji: '😏', label: 'Slow', color: '#9b59b6' },
];

// Animated game emote button with tap scale feedback
function GameEmoteButton({ emote, isActive, onPress }: {
  emote: QuickEmote;
  isActive: boolean;
  onPress: (id: EmoteId) => void;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = useCallback(() => {
    haptics.tap();
    playSound('click');
    onPress(emote.id);
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 1.25, useNativeDriver: true, speed: 50, bounciness: 12 }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 8 }),
    ]).start();
  }, [emote.id, onPress, scaleAnim]);

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`${emote.label} emote`}
      accessibilityHint="Send this emote to your opponent"
      accessibilityState={{ selected: isActive }}
    >
      <Animated.View style={[
        styles.gameFaceBtn,
        { borderColor: emote.color + '40', backgroundColor: emote.color + '15' },
        isActive && { borderColor: emote.color, backgroundColor: emote.color + '30' },
        { transform: [{ scale: scaleAnim }] },
      ]}>
        <Text style={styles.gameFaceEmoji}>{emote.emoji}</Text>
      </Animated.View>
      <Text style={[styles.gameFaceLabel, { color: emote.color + 'aa' }]}>{emote.label}</Text>
    </Pressable>
  );
}

interface EmoteBarProps {
  onEmotePress: (emoteId: EmoteId) => void;
  activeEmote?: EmoteId | null;
  variant?: 'lobby' | 'game';
}

export function EmoteBar({ onEmotePress, activeEmote, variant = 'lobby' }: EmoteBarProps) {
  const isGame = variant === 'game';

  // Game variant: show 8 quick emotes as emoji circles
  if (isGame) {
    return (
      <View style={styles.gameContainerOuter}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.gameContainer}
        >
          {GAME_QUICK_EMOTES.map(emote => (
            <GameEmoteButton
              key={emote.id}
              emote={emote}
              isActive={activeEmote === emote.id}
              onPress={onEmotePress}
            />
          ))}
        </ScrollView>
      </View>
    );
  }

  // Lobby variant: full emote grid
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.lobbyContainer}
    >
      {ALL_EMOTES.map(emote => {
        const isActive = activeEmote === emote.id;

        return (
          <Pressable
            key={emote.id}
            onPress={() => {
              haptics.tap();
              playSound('click');
              onEmotePress(emote.id);
            }}
            accessibilityRole="button"
            accessibilityLabel={`${emote.label} emote`}
            accessibilityHint="Preview this emote"
            accessibilityState={{ selected: isActive }}
            style={[
              styles.lobbyBtn,
              { borderColor: emote.color + '30' },
              isActive && { borderColor: emote.color, backgroundColor: emote.color + '20' },
            ]}
          >
            <Text style={styles.lobbyIcon}>{emote.emoji}</Text>
            <Text style={[styles.emoteName, isActive && { color: emote.color }]}>
              {emote.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // Game variant — emoji circles in dark pill
  gameContainerOuter: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  gameContainer: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 28,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  gameFaceBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  gameFaceEmoji: {
    fontSize: 24,
  },
  gameFaceLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 8,
    textAlign: 'center',
    marginTop: 2,
    letterSpacing: 0.3,
  },
  // Lobby variant
  lobbyContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  lobbyBtn: {
    width: 64,
    height: 72,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  lobbyIcon: {
    fontSize: 28,
  },
  emoteName: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 8,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
