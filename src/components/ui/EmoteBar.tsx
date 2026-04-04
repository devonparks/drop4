import React from 'react';
import { View, Text, Image, ScrollView, Pressable, StyleSheet } from 'react-native';
import { haptics } from '../../services/haptics';
import { playSound } from '../../services/audio';
import { colors } from '../../theme/colors';
import { fonts, weight } from '../../theme/typography';
import type { EmoteId } from './AnimatedCharacter';

// Character face images for game emote buttons (Clash Royale style)
const FACE_IMAGES = {
  happy: require('../../assets/images/characters/player_avatar.png'),
  surprised: require('../../assets/images/characters/player_emote_idle.png'),
  thumbsup: require('../../assets/images/characters/player_avatar.png'),
  angry: require('../../assets/images/characters/player_emote_idle.png'),
};

interface EmoteConfig {
  id: EmoteId;
  name: string;
  icon: string;
  faceKey?: keyof typeof FACE_IMAGES;
  unlocked: boolean;
}

const EMOTES: EmoteConfig[] = [
  { id: 'happy', name: 'Happy', icon: '😄', faceKey: 'happy', unlocked: true },
  { id: 'thumbsup', name: 'Nice!', icon: '👍', faceKey: 'surprised', unlocked: true },
  { id: 'wave', name: 'GG', icon: '👋', faceKey: 'thumbsup', unlocked: true },
  { id: 'angry', name: 'Angry', icon: '😤', faceKey: 'angry', unlocked: true },
  { id: 'dab', name: 'Dab', icon: '🕺', unlocked: true },
  { id: 'dance', name: 'Dance', icon: '💃', unlocked: false },
  { id: 'celebrate', name: 'Celebrate', icon: '🎉', unlocked: false },
  { id: 'sad', name: 'Sad', icon: '😢', unlocked: false },
];

interface EmoteBarProps {
  onEmotePress: (emoteId: EmoteId) => void;
  activeEmote?: EmoteId | null;
  variant?: 'lobby' | 'game';
}

export function EmoteBar({ onEmotePress, activeEmote, variant = 'lobby' }: EmoteBarProps) {
  const isGame = variant === 'game';

  // Game variant: show first 4 emotes as character face circles (Clash Royale style)
  if (isGame) {
    const gameEmotes = EMOTES.slice(0, 4);

    return (
      <View style={styles.gameContainer}>
        {gameEmotes.map(emote => {
          const isActive = activeEmote === emote.id;

          return (
            <Pressable
              key={emote.id}
              onPress={() => {
                haptics.tap();
                playSound('click');
                onEmotePress(emote.id);
              }}
              style={[styles.gameFaceBtn, isActive && styles.gameFaceBtnActive]}
            >
              {emote.faceKey && FACE_IMAGES[emote.faceKey] ? (
                <Image
                  source={FACE_IMAGES[emote.faceKey]}
                  style={styles.faceImage}
                  resizeMode="cover"
                />
              ) : (
                <Text style={styles.gameFaceEmoji}>{emote.icon}</Text>
              )}
            </Pressable>
          );
        })}
      </View>
    );
  }

  // Lobby variant: large buttons with labels
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.lobbyContainer}
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
              styles.lobbyBtn,
              isActive && styles.activeBtn,
              isLocked && styles.lockedBtn,
            ]}
          >
            <Text style={[styles.lobbyIcon, isLocked && { opacity: 0.3 }]}>
              {emote.icon}
            </Text>
            <Text style={[styles.emoteName, isActive && styles.activeText]}>
              {emote.name}
            </Text>
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
  // Game variant — Clash Royale style face circles
  gameContainer: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    paddingVertical: 8,
  },
  gameFaceBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    overflow: 'hidden',
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  gameFaceBtnActive: {
    borderColor: colors.orange,
    shadowColor: colors.orange,
    shadowOpacity: 0.5,
  },
  faceImage: {
    width: '100%',
    height: '100%',
  },
  gameFaceEmoji: {
    fontSize: 26,
  },
  // Lobby variant
  lobbyContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
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
