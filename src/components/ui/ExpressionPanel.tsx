import React, { useState, useRef, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useShopStore } from '../../stores/shopStore';
import { ALL_EMOJIS, ALL_PHRASES, EmojiItem, PhraseItem } from '../../data/expressionCatalog';
import { HUMAN_EMOTES, HUMAN_IDLES } from '../../data/animationRegistry';
import { haptics } from '../../services/haptics';
import { fonts, weight } from '../../theme/typography';

export type TabKey = 'emojis' | 'phrases' | 'emotes' | 'idles';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'emojis',  label: 'Emojis' },
  { key: 'phrases', label: 'Phrases' },
  { key: 'emotes',  label: 'Emotes' },
  { key: 'idles',   label: 'Idles' },
];

// Category labels for emotes
const CATEGORY_LABELS: Record<string, string> = {
  dance: 'Dance',
  greet: 'Greet',
  taunt: 'Taunt',
  emote: 'General',
};

interface ExpressionPanelProps {
  /** Fires with emoji char for emoji taps */
  onEmoji: (emoji: string) => void;
  /** Fires with phrase text for phrase taps */
  onPhrase: (phrase: string) => void;
  /** Fires with emote animation ID for character emote taps */
  onEmote: (emoteId: string) => void;
  /** Fires with idle animation ID to set character idle pose */
  onIdle: (idleId: string) => void;
  /** Close the panel */
  onClose: () => void;
  /** Which tab to open on (default: 'emojis') */
  initialTab?: TabKey;
}

/**
 * 3-tab expression panel: Emojis | Phrases | Emotes
 * Shows below the board, slides up on open. Owned items are tappable,
 * locked items show price.
 */
export function ExpressionPanel({
  onEmoji, onPhrase, onEmote, onIdle, onClose, initialTab,
}: ExpressionPanelProps) {
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab ?? 'emojis');
  const [cooldown, setCooldown] = useState(false);
  const cooldownRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Store state
  const ownedEmojis = useShopStore(s => s.ownedEmojis);
  const ownedPhrases = useShopStore(s => s.ownedPhrases);
  const ownedEmotes = useShopStore(s => s.ownedEmotes);
  const coins = useShopStore(s => s.coins);
  const purchaseEmoji = useShopStore(s => s.purchaseEmoji);
  const purchasePhrase = useShopStore(s => s.purchasePhrase);
  const purchaseEmote = useShopStore(s => s.purchaseEmote);

  const isEmojiOwned = useCallback((e: EmojiItem) =>
    e.starter || ownedEmojis.includes(e.id), [ownedEmojis]);

  const isPhraseOwned = useCallback((p: PhraseItem) =>
    p.starter || ownedPhrases.includes(p.id), [ownedPhrases]);

  const isEmoteOwned = useCallback((id: string, price: number | undefined) =>
    (price ?? 0) === 0 || ownedEmotes.includes(id), [ownedEmotes]);

  // 2-sec cooldown shared across all channels
  const fireCooldown = useCallback(() => {
    setCooldown(true);
    if (cooldownRef.current) clearTimeout(cooldownRef.current);
    cooldownRef.current = setTimeout(() => setCooldown(false), 2000);
  }, []);

  const handleEmojiTap = useCallback((item: EmojiItem) => {
    if (cooldown) return;
    if (!isEmojiOwned(item)) {
      // Try to purchase
      if (coins < item.price) return;
      purchaseEmoji(item.id, item.price);
      haptics.tap();
      return; // Just buy, don't fire
    }
    haptics.tap();
    onEmoji(item.id);
    fireCooldown();
  }, [cooldown, isEmojiOwned, coins, purchaseEmoji, onEmoji, fireCooldown]);

  const handlePhraseTap = useCallback((item: PhraseItem) => {
    if (cooldown) return;
    if (!isPhraseOwned(item)) {
      if (coins < item.price) return;
      purchasePhrase(item.id, item.price);
      haptics.tap();
      return;
    }
    haptics.tap();
    onPhrase(item.id);
    fireCooldown();
  }, [cooldown, isPhraseOwned, coins, purchasePhrase, onPhrase, fireCooldown]);

  const handleEmoteTap = useCallback((emoteId: string, price: number | undefined) => {
    if (cooldown) return;
    if (!isEmoteOwned(emoteId, price)) {
      if (coins < (price ?? 0)) return;
      purchaseEmote(emoteId, price ?? 0);
      haptics.tap();
      return;
    }
    haptics.tap();
    onEmote(emoteId);
    fireCooldown();
  }, [cooldown, isEmoteOwned, coins, purchaseEmote, onEmote, fireCooldown]);

  // Emotes grouped by category
  const emotesByCategory = useMemo(() => {
    const map: Record<string, typeof HUMAN_EMOTES> = {};
    for (const e of HUMAN_EMOTES) {
      if (!map[e.category]) map[e.category] = [];
      map[e.category].push(e);
    }
    return map;
  }, []);

  return (
    <View style={styles.panel}>
      {/* Header: tabs + close */}
      <View style={styles.header}>
        <View style={styles.tabRow}>
          {TABS.map(t => (
            <Pressable
              key={t.key}
              onPress={() => { haptics.tap(); setActiveTab(t.key); }}
              style={[styles.tab, activeTab === t.key && styles.tabActive]}
              accessibilityRole="tab"
              accessibilityLabel={t.label}
            >
              <Text style={[styles.tabText, activeTab === t.key && styles.tabTextActive]}>
                {t.label}
              </Text>
            </Pressable>
          ))}
        </View>
        <Pressable onPress={onClose} style={styles.closeBtn} accessibilityRole="button" accessibilityLabel="Close panel">
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner} showsVerticalScrollIndicator={false}>
        {activeTab === 'emojis' && (
          <View style={styles.grid}>
            {ALL_EMOJIS.map(item => {
              const owned = isEmojiOwned(item);
              return (
                <Pressable
                  key={item.id}
                  onPress={() => handleEmojiTap(item)}
                  style={[styles.emojiCell, !owned && styles.lockedCell]}
                  accessibilityRole="button"
                  accessibilityLabel={owned ? `Send ${item.label}` : `Buy ${item.label} for ${item.price} coins`}
                >
                  <Text style={[styles.emojiCellText, !owned && { opacity: 0.35 }]}>{item.id}</Text>
                  {!owned && <Text style={styles.emojiPriceTag}>{item.price}</Text>}
                </Pressable>
              );
            })}
          </View>
        )}

        {activeTab === 'phrases' && (
          <View style={styles.grid}>
            {ALL_PHRASES.map(item => {
              const owned = isPhraseOwned(item);
              return (
                <Pressable
                  key={item.id}
                  onPress={() => handlePhraseTap(item)}
                  style={[styles.phraseCell, !owned && styles.lockedCell, owned && { borderColor: `${item.color}44` }]}
                  accessibilityRole="button"
                  accessibilityLabel={owned ? `Say ${item.id}` : `Buy ${item.id} for ${item.price} coins`}
                >
                  <Text style={[styles.phraseCellText, { color: owned ? item.color : 'rgba(255,255,255,0.3)' }]}>
                    {item.id}
                  </Text>
                  {!owned && <Text style={styles.phrasePriceTag}>{item.price}</Text>}
                </Pressable>
              );
            })}
          </View>
        )}

        {activeTab === 'emotes' && (
          <View>
            {Object.entries(emotesByCategory).map(([cat, emotes]) => (
              <View key={cat} style={styles.emoteCategory}>
                <Text style={styles.categoryLabel}>{CATEGORY_LABELS[cat] || cat}</Text>
                <View style={styles.grid}>
                  {emotes.map(e => {
                    const owned = isEmoteOwned(e.id, e.price);
                    return (
                      <Pressable
                        key={e.id}
                        onPress={() => handleEmoteTap(e.id, e.price)}
                        style={[styles.emoteCell, !owned && styles.lockedCell]}
                        accessibilityRole="button"
                        accessibilityLabel={owned ? `Do ${e.name}` : `Buy ${e.name} for ${e.price} coins`}
                      >
                        <Text style={[styles.emoteName, !owned && { color: 'rgba(255,255,255,0.35)' }]}>
                          {owned ? e.name : `🔒 ${e.name}`}
                        </Text>
                        {!owned && <Text style={styles.emotePriceTag}>{e.price}</Text>}
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
        )}

        {activeTab === 'idles' && (
          <View style={styles.grid}>
            {HUMAN_IDLES.map(idle => (
              <Pressable
                key={idle.id}
                onPress={() => {
                  haptics.tap();
                  onIdle(idle.id);
                }}
                style={styles.emoteCell}
                accessibilityRole="button"
                accessibilityLabel={`Set idle to ${idle.name}`}
              >
                <Text style={styles.emoteName}>{idle.name}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 220,
    backgroundColor: 'rgba(10,10,25,0.95)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    zIndex: 200,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  tabRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 4,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  tabActive: {
    backgroundColor: 'rgba(255,140,0,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,140,0,0.4)',
  },
  tabText: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 0.5,
  },
  tabTextActive: {
    color: '#ff8c00',
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  contentInner: {
    padding: 10,
    paddingBottom: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  // ── Emoji cells ──
  emojiCell: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiCellText: {
    fontSize: 24,
  },
  // ── Phrase cells ──
  phraseCell: {
    paddingHorizontal: 12,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  phraseCellText: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 13,
    letterSpacing: 0.5,
  },
  // ── Emote cells ──
  emoteCategory: {
    marginBottom: 12,
  },
  categoryLabel: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  emoteCell: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoteName: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 0.3,
  },
  // ── Locked state ──
  lockedCell: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  emojiPriceTag: {
    fontSize: 9,
    fontWeight: '800',
    color: '#ff8c00',
    letterSpacing: 0.3,
  },
  phrasePriceTag: {
    fontSize: 9,
    fontWeight: '800',
    color: '#ff8c00',
    marginLeft: 4,
  },
  emotePriceTag: {
    fontSize: 9,
    fontWeight: '800',
    color: '#ff8c00',
    marginTop: 1,
  },
});
