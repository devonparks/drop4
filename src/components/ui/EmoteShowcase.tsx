import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Modal, ScrollView, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AnimatedCharacter, useEmoteTrigger, EMOTE_CATEGORIES, EmoteId } from './AnimatedCharacter';
import { haptics } from '../../services/haptics';
import { playSound } from '../../services/audio';
import { colors } from '../../theme/colors';
import { fonts, weight } from '../../theme/typography';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ── Emoji map for each emote ──
const EMOTE_EMOJI: Record<EmoteId, string> = {
  idle: '😐',
  blowkiss: '😘', callme: '🤙', fingerheart: '🫰', hearthands: '🫶',
  angry: '😡', tantrum: '🤬',
  airguitar: '🎸', beatchest: '🦍', clapping: '👏', dab: '🕺', dustshoulder: '💅', fingerguns: '👈',
  dancechestpump: '💃', dancetwist: '🪩', dancerunstep: '🏃',
  wave: '👋', bow: '🙇', salute: '🫡',
  thumbsup: '👍', fistpump: '✊', armsraised: '🙌',
  calmdown: '🤚', shrug: '🤷',
  facepalm: '🤦', crying: '😭', thumbsdown: '👎',
  flexbiceps: '💪', boxing: '🥊',
  laughpoint: '🤣', slowclap: '👏',
};

// ── Display names ──
const EMOTE_NAME: Record<EmoteId, string> = {
  idle: 'Idle',
  blowkiss: 'Blow Kiss', callme: 'Call Me', fingerheart: 'Finger Heart', hearthands: 'Heart Hands',
  angry: 'Angry', tantrum: 'Tantrum',
  airguitar: 'Air Guitar', beatchest: 'Beat Chest', clapping: 'Clapping', dab: 'Dab', dustshoulder: 'Dust Off', fingerguns: 'Finger Guns',
  dancechestpump: 'Chest Pump', dancetwist: 'Twist', dancerunstep: 'Running Man',
  wave: 'Wave', bow: 'Bow', salute: 'Salute',
  thumbsup: 'Thumbs Up', fistpump: 'Fist Pump', armsraised: 'Arms Raised',
  calmdown: 'Calm Down', shrug: 'Shrug',
  facepalm: 'Facepalm', crying: 'Crying', thumbsdown: 'Thumbs Down',
  flexbiceps: 'Flex', boxing: 'Boxing',
  laughpoint: 'Point & Laugh', slowclap: 'Slow Clap',
};

// ── Unlock requirements per emote ──
interface EmoteUnlock {
  unlocked: boolean;
  requirement?: string;
}

const EMOTE_UNLOCKS: Record<EmoteId, EmoteUnlock> = {
  idle: { unlocked: true },
  // Affection — mostly locked
  blowkiss: { unlocked: false, requirement: 'Reach Level 8' },
  callme: { unlocked: true },
  fingerheart: { unlocked: true },
  hearthands: { unlocked: false, requirement: 'Win 25 games' },
  // Angry
  angry: { unlocked: true },
  tantrum: { unlocked: false, requirement: 'Lose 10 games in a row' },
  // Celebrate
  airguitar: { unlocked: false, requirement: 'Reach Level 15' },
  beatchest: { unlocked: false, requirement: 'Win 50 games' },
  clapping: { unlocked: true },
  dab: { unlocked: true },
  dustshoulder: { unlocked: false, requirement: 'Win 10 games' },
  fingerguns: { unlocked: true },
  // Dance
  dancechestpump: { unlocked: true },
  dancetwist: { unlocked: false, requirement: 'Reach Level 12' },
  dancerunstep: { unlocked: false, requirement: 'Win a tournament' },
  // Greet
  wave: { unlocked: true },
  bow: { unlocked: true },
  salute: { unlocked: false, requirement: 'Reach Level 20' },
  // Happy
  thumbsup: { unlocked: true },
  fistpump: { unlocked: true },
  armsraised: { unlocked: false, requirement: 'Win 5 games' },
  // Reproach
  calmdown: { unlocked: true },
  shrug: { unlocked: true },
  // Sad
  facepalm: { unlocked: true },
  crying: { unlocked: false, requirement: 'Reach Level 10' },
  thumbsdown: { unlocked: true },
  // Sporty
  flexbiceps: { unlocked: true },
  boxing: { unlocked: false, requirement: 'Win 30 games' },
  // Taunt
  laughpoint: { unlocked: true },
  slowclap: { unlocked: false, requirement: 'Reach Level 5' },
};

// ── Category emoji ──
const CATEGORY_EMOJI: Record<string, string> = {
  Affection: '💕',
  Angry: '😤',
  Celebrate: '🎉',
  Dance: '💃',
  Greet: '👋',
  Happy: '😊',
  Reproach: '😒',
  Sad: '😢',
  Sporty: '🏋️',
  Taunt: '😈',
};

interface EmoteShowcaseProps {
  visible: boolean;
  onClose: () => void;
}

export function EmoteShowcase({ visible, onClose }: EmoteShowcaseProps) {
  const { emote, triggerEmote, clearEmote } = useEmoteTrigger();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [nowPlaying, setNowPlaying] = useState<EmoteId | null>(null);

  if (!visible) return null;

  const handleEmoteTap = (id: EmoteId) => {
    const unlock = EMOTE_UNLOCKS[id];
    if (!unlock.unlocked) {
      haptics.error();
      return;
    }
    haptics.tap();
    playSound('click');
    setNowPlaying(id);
    triggerEmote(id);
  };

  const handleEmoteComplete = () => {
    clearEmote();
    setNowPlaying(null);
  };

  // Filter categories or show all
  const displayCategories = activeCategory
    ? EMOTE_CATEGORIES.filter(c => c.name === activeCategory)
    : EMOTE_CATEGORIES;

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.fullOverlay}>
        <LinearGradient
          colors={['#0a0e27', '#111b47', '#0a0e27']}
          style={StyleSheet.absoluteFill}
        />

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>EMOTE SHOWCASE</Text>
          <Text style={styles.headerSub}>Preview your moves</Text>
        </View>

        {/* Character preview area */}
        <View style={styles.characterArea}>
          <View style={styles.characterGlow} />
          <AnimatedCharacter
            size={300}
            emote={emote}
            onEmoteComplete={handleEmoteComplete}
          />
          <LinearGradient
            colors={['rgba(100,180,255,0.3)', 'rgba(80,140,255,0.12)', 'transparent']}
            style={styles.characterPlatform}
          />
          {nowPlaying && (
            <View style={styles.nowPlayingBadge}>
              <Text style={styles.nowPlayingText}>
                {EMOTE_EMOJI[nowPlaying]} {EMOTE_NAME[nowPlaying]}
              </Text>
            </View>
          )}
        </View>

        {/* Category filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryChips}
        >
          <Pressable
            onPress={() => { haptics.tap(); setActiveCategory(null); }}
            style={[styles.categoryChip, !activeCategory && styles.categoryChipActive]}
          >
            <Text style={[styles.categoryChipText, !activeCategory && styles.categoryChipTextActive]}>
              All
            </Text>
          </Pressable>
          {EMOTE_CATEGORIES.map(cat => {
            const isActive = activeCategory === cat.name;
            return (
              <Pressable
                key={cat.name}
                onPress={() => { haptics.tap(); setActiveCategory(isActive ? null : cat.name); }}
                style={[styles.categoryChip, isActive && styles.categoryChipActive]}
              >
                <Text style={styles.categoryChipEmoji}>{CATEGORY_EMOJI[cat.name] || '🎭'}</Text>
                <Text style={[styles.categoryChipText, isActive && styles.categoryChipTextActive]}>
                  {cat.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Emote grid */}
        <ScrollView
          style={styles.gridScroll}
          contentContainerStyle={styles.gridContent}
          showsVerticalScrollIndicator={false}
        >
          {displayCategories.map(category => (
            <View key={category.name} style={styles.categorySection}>
              <View style={styles.categorySectionHeader}>
                <Text style={styles.categorySectionEmoji}>{CATEGORY_EMOJI[category.name] || '🎭'}</Text>
                <Text style={styles.categorySectionName}>{category.name.toUpperCase()}</Text>
                <View style={styles.categorySectionLine} />
              </View>
              <View style={styles.emoteGrid}>
                {category.emotes.map(emoteId => {
                  const unlock = EMOTE_UNLOCKS[emoteId];
                  const isLocked = !unlock.unlocked;
                  const isPlaying = nowPlaying === emoteId;

                  return (
                    <Pressable
                      key={emoteId}
                      onPress={() => handleEmoteTap(emoteId)}
                      style={[
                        styles.emoteCard,
                        isPlaying && styles.emoteCardPlaying,
                        isLocked && styles.emoteCardLocked,
                      ]}
                    >
                      <LinearGradient
                        colors={isPlaying
                          ? ['rgba(255,140,0,0.2)', 'rgba(255,140,0,0.08)']
                          : isLocked
                            ? ['rgba(255,255,255,0.02)', 'rgba(255,255,255,0.01)']
                            : ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)']
                        }
                        style={styles.emoteCardInner}
                      >
                        <Text style={[styles.emoteCardEmoji, isLocked && styles.emoteCardEmojiLocked]}>
                          {EMOTE_EMOJI[emoteId]}
                        </Text>
                        <Text style={[styles.emoteCardName, isLocked && styles.emoteCardNameLocked]} numberOfLines={1}>
                          {EMOTE_NAME[emoteId]}
                        </Text>
                        {isLocked && (
                          <View style={styles.lockOverlay}>
                            <Text style={styles.lockIcon}>🔒</Text>
                            <Text style={styles.lockReq} numberOfLines={2}>{unlock.requirement}</Text>
                          </View>
                        )}
                        {isPlaying && (
                          <View style={styles.playingIndicator}>
                            <Text style={styles.playingDot}>▶</Text>
                          </View>
                        )}
                      </LinearGradient>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Close button */}
        <View style={styles.closeArea}>
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <LinearGradient
              colors={['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.05)']}
              style={styles.closeBtnGradient}
            >
              <Text style={styles.closeBtnText}>CLOSE</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// ── Also export data for use by CharacterCreator ──
export { EMOTE_EMOJI, EMOTE_NAME, EMOTE_UNLOCKS, CATEGORY_EMOJI };

const styles = StyleSheet.create({
  fullOverlay: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingTop: 56,
    paddingBottom: 4,
  },
  headerTitle: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 24,
    color: '#ffffff',
    letterSpacing: 3,
  },
  headerSub: {
    fontFamily: fonts.body,
    fontWeight: weight.medium,
    fontSize: 12,
    color: 'rgba(200,220,255,0.5)',
    letterSpacing: 1,
    marginTop: 2,
  },

  // Character area
  characterArea: {
    height: 260,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  characterGlow: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    borderWidth: 1,
    borderColor: 'rgba(100,180,255,0.1)',
    backgroundColor: 'rgba(80,140,255,0.03)',
  },
  characterPlatform: {
    width: 180,
    height: 14,
    borderRadius: 90,
    marginTop: -10,
  },
  nowPlayingBadge: {
    position: 'absolute',
    bottom: 8,
    alignSelf: 'center',
    backgroundColor: 'rgba(255,140,0,0.2)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,140,0,0.4)',
  },
  nowPlayingText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 12,
    color: colors.orange,
    letterSpacing: 0.5,
  },

  // Category chips
  categoryChips: {
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 6,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  categoryChipActive: {
    backgroundColor: 'rgba(255,140,0,0.15)',
    borderColor: colors.orange,
  },
  categoryChipEmoji: {
    fontSize: 13,
  },
  categoryChipText: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 11,
    color: colors.textSecondary,
  },
  categoryChipTextActive: {
    color: colors.orange,
  },

  // Grid
  gridScroll: {
    flex: 1,
  },
  gridContent: {
    paddingHorizontal: 12,
  },
  categorySection: {
    marginBottom: 16,
  },
  categorySectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  categorySectionEmoji: {
    fontSize: 14,
  },
  categorySectionName: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 11,
    color: colors.textMuted,
    letterSpacing: 2,
  },
  categorySectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginLeft: 6,
  },
  emoteGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  emoteCard: {
    width: (SCREEN_WIDTH - 24 - 24) / 3,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  emoteCardPlaying: {
    borderColor: colors.orange,
    borderWidth: 2,
    shadowColor: colors.orange,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  emoteCardLocked: {
    opacity: 0.5,
  },
  emoteCardInner: {
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    borderRadius: 14,
    position: 'relative',
  },
  emoteCardEmoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  emoteCardEmojiLocked: {
    opacity: 0.3,
  },
  emoteCardName: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 10,
    color: '#ffffff',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  emoteCardNameLocked: {
    opacity: 0.4,
  },
  lockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 14,
  },
  lockIcon: {
    fontSize: 18,
    marginBottom: 2,
  },
  lockReq: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 8,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  playingIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  playingDot: {
    fontSize: 10,
    color: colors.orange,
  },

  // Close
  closeArea: {
    paddingHorizontal: 40,
    paddingBottom: 36,
    paddingTop: 8,
  },
  closeBtn: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  closeBtnGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  closeBtnText: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 16,
    color: '#ffffff',
    letterSpacing: 3,
  },
});
