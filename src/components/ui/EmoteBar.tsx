import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { haptics } from '../../services/haptics';
import { playSound } from '../../services/audio';
import { colors } from '../../theme/colors';
import { fonts, weight } from '../../theme/typography';
import type { EmoteId } from './AnimatedCharacter';

interface EmoteConfig {
  id: EmoteId;
  name: string;
  icon: string;
  unlocked: boolean;
}

const EMOTES: EmoteConfig[] = [
  { id: 'thumbsup', name: 'Thumbs Up', icon: '👍', unlocked: true },
  { id: 'wave', name: 'Wave', icon: '👋', unlocked: true },
  { id: 'happy', name: 'Happy', icon: '😄', unlocked: true },
  { id: 'dab', name: 'Dab', icon: '🕺', unlocked: true },
  { id: 'dance', name: 'Dance', icon: '💃', unlocked: false },
  { id: 'celebrate', name: 'Celebrate', icon: '🎉', unlocked: false },
  { id: 'sad', name: 'Sad', icon: '😢', unlocked: false },
  { id: 'angry', name: 'Angry', icon: '😤', unlocked: false },
];

interface EmoteBarProps {
  onEmotePress: (emoteId: EmoteId) => void;
  activeEmote?: EmoteId | null;
  variant?: 'lobby' | 'game'; // lobby = large buttons, game = compact
}

export function EmoteBar({ onEmotePress, activeEmote, variant = 'lobby' }: EmoteBarProps) {
  const isLobby = variant === 'lobby';

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.container, isLobby ? styles.lobbyContainer : styles.gameContainer]}
    >
      {EMOTES.map(emote => {
        const isActive = activeEmote === emote.id;
        const isLocked = !emote.unlocked;

        return (
          <Pressable
            key={emote.id}
            onPress={() => {
              if (isLocked) return;
              haptics.tap();
              playSound('click');
              onEmotePress(emote.id);
            }}
            style={[
              isLobby ? styles.lobbyBtn : styles.gameBtn,
              isActive && styles.activeBtn,
              isLocked && styles.lockedBtn,
            ]}
          >
            <Text style={[
              isLobby ? styles.lobbyIcon : styles.gameIcon,
              isLocked && { opacity: 0.3 },
            ]}>
              {emote.icon}
            </Text>
            {isLobby && (
              <Text style={[styles.emoteName, isActive && styles.activeText]}>
                {emote.name}
              </Text>
            )}
            {isLocked && (
              <View style={styles.lockOverlay}>
                <Text style={styles.lockIcon}>🔒</Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  lobbyContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  gameContainer: {
    paddingHorizontal: 8,
    gap: 6,
  },
  // Lobby style (large buttons with labels)
  lobbyBtn: {
    width: 72,
    height: 80,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    position: 'relative',
  },
  lobbyIcon: {
    fontSize: 28,
  },
  emoteName: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 9,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Game style (compact circles)
  gameBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(26,37,86,0.8)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  gameIcon: {
    fontSize: 22,
  },
  // States
  activeBtn: {
    borderColor: colors.orange,
    backgroundColor: 'rgba(255,140,0,0.15)',
  },
  activeText: {
    color: colors.orange,
  },
  lockedBtn: {
    opacity: 0.5,
  },
  lockOverlay: {
    position: 'absolute',
    bottom: 2,
    right: 2,
  },
  lockIcon: {
    fontSize: 10,
  },
});
