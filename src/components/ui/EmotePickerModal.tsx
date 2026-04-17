import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Modal,
  Dimensions,
  Animated,
} from 'react-native';
import { haptics } from '../../services/haptics';
import { playSound } from '../../services/audio';
import { StaggeredEntry } from '../animations';
import { colors } from '../../theme/colors';
import { fonts, weight } from '../../theme/typography';
import type { EmoteId } from './AnimatedCharacter';
import { QUICK_CHAT_MESSAGES, type QuickChatMessage } from '../../data/quickChat';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ═══════════════════════════════════════════
// EMOTE DATA — emoji reactions with descriptions
// ═══════════════════════════════════════════

interface EmoteItem {
  id: EmoteId;
  emoji: string;
  label: string;
  description: string;
  color: string;
}

const ALL_EMOTES: EmoteItem[] = [
  // Positive
  { id: 'thumbsup', emoji: '👍', label: 'Nice!', description: 'Show appreciation', color: '#2ecc71' },
  { id: 'clapping', emoji: '👏', label: 'GG', description: 'Good game', color: '#f1c40f' },
  { id: 'armsraised', emoji: '🙌', label: 'Hype', description: 'Get hyped up', color: '#f1c40f' },
  { id: 'fistpump', emoji: '✊', label: 'Yes!', description: 'Celebrate a win', color: '#e67e22' },
  { id: 'wave', emoji: '👋', label: 'Hi!', description: 'Say hello', color: '#1abc9c' },
  { id: 'bow', emoji: '🙇', label: 'Bow', description: 'Show respect', color: '#8892b0' },
  // Funny
  { id: 'laughpoint', emoji: '😂', label: 'Lol', description: 'Laugh at a play', color: '#e67e22' },
  { id: 'facepalm', emoji: '🤦', label: 'Ugh', description: 'That was bad', color: '#9b59b6' },
  { id: 'shrug', emoji: '🤷', label: 'Shrug', description: 'Who knows?', color: '#8892b0' },
  { id: 'crying', emoji: '😭', label: 'Cry', description: 'So sad', color: '#3498db' },
  // Competitive
  { id: 'angry', emoji: '😤', label: 'Grr', description: 'Express frustration', color: '#e74c3c' },
  { id: 'flexbiceps', emoji: '💪', label: 'Flex', description: 'Show strength', color: '#e67e22' },
  { id: 'dab', emoji: '🕺', label: 'Dab', description: 'Hit the dab', color: '#e94560' },
  { id: 'slowclap', emoji: '😏', label: 'Slow clap', description: 'Really now?', color: '#9b59b6' },
  { id: 'tantrum', emoji: '🤬', label: 'Rage', description: 'Pure rage', color: '#c0392b' },
  { id: 'boxing', emoji: '🥊', label: 'Fight', description: 'Bring it on', color: '#e74c3c' },
  // Style
  { id: 'fingerguns', emoji: '👉', label: 'Pew', description: 'Finger guns', color: '#e94560' },
  { id: 'dustshoulder', emoji: '💅', label: 'Clean', description: 'Too easy', color: '#1abc9c' },
  { id: 'salute', emoji: '🫡', label: 'Salute', description: 'Respect', color: '#3498db' },
  { id: 'blowkiss', emoji: '😘', label: 'Kiss', description: 'Blow a kiss', color: '#ff69b4' },
  { id: 'callme', emoji: '🤙', label: 'Call Me', description: 'Hit me up', color: '#e67e22' },
  { id: 'beatchest', emoji: '🦍', label: 'Beast', description: 'Go beast mode', color: '#8B5E3C' },
  // Dance
  { id: 'airguitar', emoji: '🎸', label: 'Guitar', description: 'Rock out', color: '#e67e22' },
  { id: 'dancechestpump', emoji: '🪩', label: 'Pump', description: 'Chest pump', color: '#3498db' },
];

// Chat messages grouped by category
const CHAT_CATEGORIES: { key: string; label: string; color: string; messages: QuickChatMessage[] }[] = [
  { key: 'friendly', label: 'Friendly', color: colors.green, messages: QUICK_CHAT_MESSAGES.filter(m => m.category === 'friendly') },
  { key: 'competitive', label: 'Competitive', color: colors.orange, messages: QUICK_CHAT_MESSAGES.filter(m => m.category === 'competitive') },
  { key: 'reaction', label: 'Reaction', color: colors.purple, messages: QUICK_CHAT_MESSAGES.filter(m => m.category === 'reaction') },
  { key: 'gg', label: 'GG', color: colors.teal, messages: QUICK_CHAT_MESSAGES.filter(m => m.category === 'gg') },
];

// ═══════════════════════════════════════════
// Emote Card — grid item with emoji + label + description
// ═══════════════════════════════════════════

function EmoteCard({ emote, onPress }: { emote: EmoteItem; onPress: (id: EmoteId) => void }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = useCallback(() => {
    haptics.tap();
    playSound('click');
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 0.9, useNativeDriver: true, speed: 60, bounciness: 10 }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 8 }),
    ]).start();
    onPress(emote.id);
  }, [emote.id, onPress, scaleAnim]);

  return (
    <Pressable
      onPress={handlePress}
      style={{ width: (SCREEN_WIDTH - 64) / 3 }}
      accessibilityRole="button"
      accessibilityLabel={`${emote.label} emote`}
      accessibilityHint={emote.description}
    >
      <Animated.View style={[
        styles.emoteCard,
        { borderColor: emote.color + '35', transform: [{ scale: scaleAnim }] },
      ]}>
        <Text style={styles.emoteCardEmoji}>{emote.emoji}</Text>
        <Text style={[styles.emoteCardLabel, { color: emote.color }]}>{emote.label}</Text>
        <Text style={styles.emoteCardDesc}>{emote.description}</Text>
      </Animated.View>
    </Pressable>
  );
}

// ═══════════════════════════════════════════
// Signature Card — exclusive emote tied to a specific character
// Same shape as EmoteCard but with a gold border and ✦ badge.
// ═══════════════════════════════════════════

interface SignatureItem {
  id: string;       // signature emote id (also the sprite sheet basename)
  emoji: string;
  label: string;
}

function SignatureCard({ item, onPress }: { item: SignatureItem; onPress: (id: string) => void }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = useCallback(() => {
    haptics.tap();
    playSound('click');
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 0.9, useNativeDriver: true, speed: 60, bounciness: 10 }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 8 }),
    ]).start();
    onPress(item.id);
  }, [item.id, onPress, scaleAnim]);

  return (
    <Pressable
      onPress={handlePress}
      style={{ width: (SCREEN_WIDTH - 64) / 3 }}
      accessibilityRole="button"
      accessibilityLabel={`${item.label} signature emote`}
      accessibilityHint="Exclusive emote for this character"
    >
      <Animated.View style={[
        styles.emoteCard,
        styles.signatureCard,
        { transform: [{ scale: scaleAnim }] },
      ]}>
        <Text style={styles.signatureBadge}>✦</Text>
        <Text style={styles.emoteCardEmoji}>{item.emoji}</Text>
        <Text style={[styles.emoteCardLabel, { color: colors.coinGold }]}>{item.label}</Text>
        <Text style={styles.emoteCardDesc}>Signature</Text>
      </Animated.View>
    </Pressable>
  );
}

// ═══════════════════════════════════════════
// Chat Pill — tappable message button
// ═══════════════════════════════════════════

function ChatPillItem({ message, onPress }: { message: QuickChatMessage; onPress: (msg: QuickChatMessage) => void }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const categoryColor = {
    friendly: colors.green,
    competitive: colors.orange,
    reaction: colors.purple,
    gg: colors.teal,
  }[message.category];

  const handlePress = useCallback(() => {
    haptics.tap();
    playSound('click');
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 0.92, useNativeDriver: true, speed: 60, bounciness: 10 }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 8 }),
    ]).start();
    onPress(message);
  }, [message, onPress, scaleAnim]);

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`Send chat: ${message.text}`}
    >
      <Animated.View style={[
        styles.chatPill,
        { borderColor: categoryColor + '40', transform: [{ scale: scaleAnim }] },
      ]}>
        <Text style={styles.chatPillText}>{message.text}</Text>
      </Animated.View>
    </Pressable>
  );
}

// ═══════════════════════════════════════════
// EmotePickerModal — full-screen picker with tabs
// ═══════════════════════════════════════════

interface EmotePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onEmotePress: (emoteId: EmoteId) => void;
  onChatSend: (msg: QuickChatMessage) => void;
  initialTab?: 'emotes' | 'chat';
}

export function EmotePickerModal({ visible, onClose, onEmotePress, onChatSend, initialTab = 'emotes' }: EmotePickerModalProps) {
  const [activeTab, setActiveTab] = useState<'emotes' | 'chat'>(initialTab);

  // v1: signature emotes disabled — all characters share the universal pool.
  const signatureItems: SignatureItem[] = [];

  // Reset tab when modal opens
  React.useEffect(() => {
    if (visible) setActiveTab(initialTab);
  }, [visible, initialTab]);

  const handleEmote = useCallback((id: EmoteId) => {
    onEmotePress(id);
    onClose();
  }, [onEmotePress, onClose]);

  const handleSignatureEmote = useCallback((id: string) => {
    onEmotePress(id as EmoteId);
    onClose();
  }, [onEmotePress, onClose]);

  const handleChat = useCallback((msg: QuickChatMessage) => {
    onChatSend(msg);
    onClose();
  }, [onChatSend, onClose]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {/* Tap backdrop to close */}
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close emote picker"
        />

        {/* Bottom sheet */}
        <View style={styles.sheet}>
          {/* Handle bar */}
          <View style={styles.handleBar} />

          {/* Tab bar */}
          <View style={styles.tabRow}>
            <Pressable
              onPress={() => { setActiveTab('emotes'); haptics.tap(); }}
              style={[styles.tab, activeTab === 'emotes' && styles.tabActive]}
              accessibilityRole="tab"
              accessibilityLabel="Emotes tab"
              accessibilityState={{ selected: activeTab === 'emotes' }}
            >
              <Text style={[styles.tabText, activeTab === 'emotes' && styles.tabTextActive]}>EMOTES</Text>
            </Pressable>
            <Pressable
              onPress={() => { setActiveTab('chat'); haptics.tap(); }}
              style={[styles.tab, activeTab === 'chat' && styles.tabActive]}
              accessibilityRole="tab"
              accessibilityLabel="Chat tab"
              accessibilityState={{ selected: activeTab === 'chat' }}
            >
              <Text style={[styles.tabText, activeTab === 'chat' && styles.tabTextActive]}>CHAT</Text>
            </Pressable>
          </View>

          {/* Content */}
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {activeTab === 'emotes' ? (
              <>
                {/* Signature emotes — only shown for characters that have any */}
                {signatureItems.length > 0 && (
                  <View style={styles.signatureSection}>
                    <Text style={styles.signatureSectionLabel}>
                      ✦ SIGNATURE EMOTES
                    </Text>
                    <View style={styles.emoteGrid}>
                      {signatureItems.map((item) => (
                        <SignatureCard
                          key={item.id}
                          item={item}
                          onPress={handleSignatureEmote}
                        />
                      ))}
                    </View>
                  </View>
                )}
                {/* Universal emotes — available to every character */}
                <View style={styles.emoteGrid}>
                  {ALL_EMOTES.map((emote, idx) => (
                    <StaggeredEntry key={emote.id} index={idx} delay={28}>
                      <EmoteCard emote={emote} onPress={handleEmote} />
                    </StaggeredEntry>
                  ))}
                </View>
              </>
            ) : (
              <View style={styles.chatSection}>
                {CHAT_CATEGORIES.map(cat => (
                  <View key={cat.key} style={styles.chatCategory}>
                    <View style={styles.chatCatHeader}>
                      <View style={[styles.chatCatDot, { backgroundColor: cat.color }]} />
                      <Text style={[styles.chatCatLabel, { color: cat.color }]}>{cat.label}</Text>
                    </View>
                    <View style={styles.chatPillRow}>
                      {cat.messages.map(msg => (
                        <ChatPillItem key={msg.id} message={msg} onPress={handleChat} />
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ═══════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    backgroundColor: '#0d1b3e',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderBottomWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  // Tabs
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 4,
    marginBottom: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.orange,
  },
  tabText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 2,
  },
  tabTextActive: {
    color: '#ffffff',
  },
  // Scroll area
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    paddingTop: 8,
  },
  // Signature emote section
  signatureSection: {
    marginBottom: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,215,0,0.18)',
  },
  signatureSectionLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 11,
    color: colors.coinGold,
    letterSpacing: 1.6,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  signatureCard: {
    borderColor: 'rgba(255,215,0,0.55)',
    borderWidth: 2,
    backgroundColor: 'rgba(255,215,0,0.08)',
  },
  signatureBadge: {
    position: 'absolute',
    top: 4,
    right: 6,
    color: colors.coinGold,
    fontSize: 12,
    fontWeight: '900',
  },
  // Emote grid — 3 columns
  emoteGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  emoteCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 6,
    gap: 2,
  },
  emoteCardEmoji: {
    fontSize: 32,
  },
  emoteCardLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 12,
    marginTop: 4,
  },
  emoteCardDesc: {
    fontFamily: fonts.body,
    fontWeight: weight.medium,
    fontSize: 9,
    color: 'rgba(255,255,255,0.35)',
    textAlign: 'center',
  },
  // Chat section
  chatSection: {
    gap: 16,
  },
  chatCategory: {
    gap: 8,
  },
  chatCatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chatCatDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  chatCatLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  chatPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chatPill: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1.5,
  },
  chatPillText: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 14,
    color: '#ffffff',
    letterSpacing: 0.3,
  },
});
