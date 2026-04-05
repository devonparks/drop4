import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Dimensions, Modal } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { TopBar } from '../components/ui/TopBar';
import { CharacterAvatar } from '../components/ui/CharacterAvatar';
import { PoseDisplay, PoseId, EMOTE_CATEGORIES, EmoteId } from '../components/ui/AnimatedCharacter';
import { AnimatedCharacter, useEmoteTrigger } from '../components/ui/AnimatedCharacter';
import { EMOTE_EMOJI, EMOTE_NAME, EMOTE_UNLOCKS, CATEGORY_EMOJI } from '../components/ui/EmoteShowcase';
import { GlossyButton } from '../components/ui/GlossyButton';
import { useShopStore } from '../stores/shopStore';
import { useGameStore } from '../stores/gameStore';
import { haptics } from '../services/haptics';
import { colors } from '../theme/colors';
import { fonts, weight } from '../theme/typography';
import { CHARACTER_ITEMS, CharacterItem, getUnlockDescription } from '../data/characterCatalog';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'CharacterCreator'>;
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const RARITY_COLORS: Record<string, string> = {
  common: '#8892b0',
  rare: '#3498db',
  epic: '#9b59b6',
  legendary: '#f1c40f',
};

const RARITY_LABELS: Record<string, string> = {
  common: 'COMMON',
  rare: 'RARE',
  epic: 'EPIC',
  legendary: 'LEGENDARY',
};

const RARITY_DESCRIPTIONS: Record<string, string> = {
  common: 'A staple piece for any wardrobe.',
  rare: 'A cut above the rest. Stand out from the crowd.',
  epic: 'Exceptionally crafted. Only the dedicated earn this.',
  legendary: 'The pinnacle of style. A true collector\'s piece.',
};

type TabId = 'species' | 'outfit' | 'hair' | 'shoes' | 'colors' | 'emotes';
const TABS: { id: TabId; icon: string; label: string }[] = [
  { id: 'species', icon: '\uD83E\uDDD1', label: 'Species' },
  { id: 'outfit', icon: '\uD83D\uDC55', label: 'Outfit' },
  { id: 'hair', icon: '\uD83D\uDC87', label: 'Hair' },
  { id: 'shoes', icon: '\uD83D\uDC5F', label: 'Shoes' },
  { id: 'colors', icon: '\uD83C\uDFA8', label: 'Colors' },
  { id: 'emotes', icon: '\uD83D\uDE00', label: 'Emotes' },
];

const TAB_TO_CATEGORIES: Record<TabId, string[]> = {
  species: [],
  outfit: ['top', 'bottom'],
  hair: ['hair'],
  shoes: ['shoes'],
  colors: [],
  emotes: [],
};

const POSE_LIST: { id: PoseId; label: string }[] = [
  { id: 'default', label: 'Default' },
  { id: 'arms_crossed', label: 'Arms Crossed' },
  { id: 'hands_on_hips', label: 'Power Stance' },
  { id: 'lean', label: 'Lean' },
  { id: 'flex', label: 'Flex' },
  { id: 'point', label: 'Point' },
  { id: 'peace', label: 'Peace' },
  { id: 'salute', label: 'Salute' },
];

// ── Equipped Summary Pill ──────────────────────────────────────────────
function EquipPill({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.equipPill}>
      <Text style={styles.equipPillIcon}>{icon}</Text>
      <Text style={styles.equipPillLabel} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

export function CharacterCreatorScreen({ navigation }: Props) {
  const coins = useShopStore(s => s.coins);
  const gems = useShopStore(s => s.gems);
  const level = useShopStore(s => s.level);
  const playerName = useShopStore(s => s.playerName);
  const bestStreak = useGameStore(s => s.bestStreak);
  const totalGamesPlayed = useGameStore(s => s.totalGamesPlayed);

  const [activeTab, setActiveTab] = useState<TabId>('outfit');
  const [selectedPose, setSelectedPose] = useState<PoseId>('default');
  const [selectedItem, setSelectedItem] = useState<CharacterItem | null>(null);
  const [previewingItem, setPreviewingItem] = useState<CharacterItem | null>(null);
  const { emote: previewEmote, triggerEmote: triggerPreviewEmote, clearEmote: clearPreviewEmote } = useEmoteTrigger();
  const [playingEmoteId, setPlayingEmoteId] = useState<EmoteId | null>(null);

  // Get items for the active tab
  const activeCategories = TAB_TO_CATEGORIES[activeTab];
  const tabItems = CHARACTER_ITEMS.filter(i => activeCategories.includes(i.category));

  // ── Collection stats ──────────────────────────────────────────────────
  const collectionStats = useMemo(() => {
    const totalItems = CHARACTER_ITEMS.length;
    const ownedItems = CHARACTER_ITEMS.filter(i => i.unlock.type === 'default').length;
    const pct = totalItems > 0 ? Math.round((ownedItems / totalItems) * 100) : 0;
    return { total: totalItems, owned: ownedItems, pct };
  }, []);

  // Per-tab item counts (owned / total)
  const tabCounts = useMemo(() => {
    const counts: Record<TabId, { owned: number; total: number }> = {
      species: { owned: 0, total: 0 },
      outfit: { owned: 0, total: 0 },
      hair: { owned: 0, total: 0 },
      shoes: { owned: 0, total: 0 },
      colors: { owned: 0, total: 0 },
      emotes: { owned: 0, total: 0 },
    };
    for (const tab of TABS) {
      if (tab.id === 'emotes') {
        const allEmotes = EMOTE_CATEGORIES.flatMap(c => c.emotes);
        const unlocked = allEmotes.filter(e => EMOTE_UNLOCKS[e]?.unlocked);
        counts.emotes = { total: allEmotes.length, owned: unlocked.length };
        continue;
      }
      const cats = TAB_TO_CATEGORIES[tab.id];
      const items = CHARACTER_ITEMS.filter(i => cats.includes(i.category));
      counts[tab.id] = {
        total: items.length,
        owned: items.filter(i => i.unlock.type === 'default').length,
      };
    }
    return counts;
  }, []);

  // ── Randomize ─────────────────────────────────────────────────────────
  const handleRandomize = useCallback(() => {
    haptics.tap();
    // Pick random owned items from each category and "preview" the last one
    const categories = ['hair', 'top', 'bottom', 'shoes'] as const;
    let lastPicked: CharacterItem | null = null;
    for (const cat of categories) {
      const items = CHARACTER_ITEMS.filter(i => i.category === cat && i.unlock.type === 'default');
      if (items.length > 0) {
        lastPicked = items[Math.floor(Math.random() * items.length)];
      }
    }
    // Also randomize pose
    const randomPose = POSE_LIST[Math.floor(Math.random() * POSE_LIST.length)];
    setSelectedPose(randomPose.id);
    if (lastPicked) {
      setPreviewingItem(lastPicked);
      // Clear preview after 2s
      setTimeout(() => setPreviewingItem(null), 2000);
    }
  }, []);

  // ── Item tap handler ──────────────────────────────────────────────────
  const handleItemTap = useCallback((item: CharacterItem) => {
    haptics.tap();
    setSelectedItem(item);
    setPreviewingItem(item);
  }, []);

  // ── Close detail panel ────────────────────────────────────────────────
  const closeDetailPanel = useCallback(() => {
    setSelectedItem(null);
    setPreviewingItem(null);
  }, []);

  return (
    <ScreenBackground>
      <View style={styles.container}>
        {/* Top Bar */}
        <TopBar
          coins={coins}
          gems={gems}
          level={level}
          showBack
          onBackPress={() => navigation.goBack()}
        />

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* ══ CHARACTER DISPLAY ══ */}
          <View style={styles.characterDisplayArea}>
            {/* Rotating spotlight glow */}
            <View style={styles.glowRingOuter} />
            <View style={styles.glowRingMiddle} />
            <LinearGradient
              colors={['rgba(100,80,200,0.15)', 'rgba(60,100,255,0.08)', 'transparent']}
              style={styles.spotlightGlow}
            />

            {/* Preview tint overlay when previewing an item */}
            {previewingItem && (
              <View style={[
                styles.previewTintOverlay,
                { borderColor: RARITY_COLORS[previewingItem.rarity] + '55' },
              ]}>
                <LinearGradient
                  colors={[RARITY_COLORS[previewingItem.rarity] + '18', 'transparent', RARITY_COLORS[previewingItem.rarity] + '10']}
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
              </View>
            )}

            {/* Character */}
            <AnimatedCharacter
              size={300}
              pose={selectedPose}
              emote={previewEmote}
              onEmoteComplete={() => { clearPreviewEmote(); setPlayingEmoteId(null); }}
            />

            {/* PREVIEWING banner */}
            {previewingItem && (
              <View style={[styles.previewBanner, { backgroundColor: RARITY_COLORS[previewingItem.rarity] + 'DD' }]}>
                <Text style={styles.previewBannerText}>PREVIEWING: {previewingItem.name.toUpperCase()}</Text>
              </View>
            )}

            {/* Stage platform under character */}
            <LinearGradient
              colors={['rgba(100,180,255,0.3)', 'rgba(80,140,255,0.12)', 'transparent']}
              style={styles.displayPlatform}
            />
            <View style={styles.displayRing} />
          </View>

          {/* Player info */}
          <View style={styles.playerInfo}>
            <Text style={styles.playerName}>{playerName}</Text>
            <View style={styles.levelBadge}>
              <Text style={styles.levelText}>LVL {level}</Text>
            </View>
          </View>

          {/* ══ EQUIPPED SUMMARY ROW (A) ══ */}
          <View style={styles.equipRow}>
            <EquipPill icon={'\uD83D\uDC55'} label="Default Outfit" onPress={() => { haptics.tap(); setActiveTab('outfit'); }} />
            <EquipPill icon={'\uD83D\uDC87'} label="Short" onPress={() => { haptics.tap(); setActiveTab('hair'); }} />
            <EquipPill icon={'\uD83D\uDC5F'} label="Sneakers" onPress={() => { haptics.tap(); setActiveTab('shoes'); }} />
            <EquipPill icon={'\uD83C\uDFA8'} label="Default" onPress={() => { haptics.tap(); setActiveTab('colors'); }} />
          </View>

          {/* ══ COLLECTION PROGRESS (E) ══ */}
          <View style={styles.collectionBar}>
            <Text style={styles.collectionLabel}>Collection: {collectionStats.pct}% complete</Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${collectionStats.pct}%` }]} />
            </View>
            <Text style={styles.collectionCount}>{collectionStats.owned}/{collectionStats.total} items</Text>
          </View>

          {/* ══ SECTION DIVIDER ══ */}
          <View style={styles.sectionDivider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>CUSTOMIZE</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* ══ OUTFIT TABS with counts (E) ══ */}
          <View style={styles.tabBar}>
            {TABS.map(tab => {
              const isActive = activeTab === tab.id;
              const counts = tabCounts[tab.id];
              const hasItems = counts.total > 0;
              return (
                <Pressable
                  key={tab.id}
                  onPress={() => { haptics.tap(); setActiveTab(tab.id); }}
                  style={[styles.tab, isActive && styles.tabActive]}
                >
                  <Text style={styles.tabIcon}>{tab.icon}</Text>
                  <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                    {tab.label}
                  </Text>
                  {hasItems && (
                    <Text style={[styles.tabCount, isActive && styles.tabCountActive]}>
                      {counts.owned}/{counts.total}
                    </Text>
                  )}
                  {isActive && <View style={styles.tabIndicator} />}
                </Pressable>
              );
            })}
          </View>

          {/* ══ RANDOMIZE BUTTON (D) ══ */}
          <View style={styles.randomRow}>
            <Pressable onPress={handleRandomize} style={styles.randomButton}>
              <Text style={styles.randomIcon}>{'\uD83C\uDFB2'}</Text>
              <Text style={styles.randomLabel}>Random Look</Text>
            </Pressable>
          </View>

          {/* ══ ITEMS SCROLL / EMOTES GRID ══ */}
          {activeTab === 'emotes' ? (
            <View style={styles.emotesTabContent}>
              {EMOTE_CATEGORIES.map(category => (
                <View key={category.name} style={styles.emoteCategorySection}>
                  <View style={styles.emoteCategoryHeader}>
                    <Text style={styles.emoteCategoryEmoji}>{CATEGORY_EMOJI[category.name] || '🎭'}</Text>
                    <Text style={styles.emoteCategoryName}>{category.name.toUpperCase()}</Text>
                    <View style={styles.emoteCategoryLine} />
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.emoteHScroll}>
                    {category.emotes.map(emoteId => {
                      const unlock = EMOTE_UNLOCKS[emoteId];
                      const isLocked = !unlock?.unlocked;
                      const isPlaying = playingEmoteId === emoteId;

                      return (
                        <Pressable
                          key={emoteId}
                          onPress={() => {
                            if (isLocked) { haptics.error(); return; }
                            haptics.tap();
                            setPlayingEmoteId(emoteId);
                            triggerPreviewEmote(emoteId);
                          }}
                          style={[
                            styles.emoteTabCard,
                            isPlaying && styles.emoteTabCardPlaying,
                            isLocked && styles.emoteTabCardLocked,
                          ]}
                        >
                          <Text style={[styles.emoteTabCardEmoji, isLocked && { opacity: 0.3 }]}>
                            {EMOTE_EMOJI[emoteId]}
                          </Text>
                          <Text style={[styles.emoteTabCardName, isLocked && { opacity: 0.4 }]} numberOfLines={1}>
                            {EMOTE_NAME[emoteId]}
                          </Text>
                          {isLocked && (
                            <View style={styles.emoteTabLockBadge}>
                              <Text style={styles.emoteTabLockIcon}>{'\uD83D\uDD12'}</Text>
                              <Text style={styles.emoteTabLockReq} numberOfLines={1}>{unlock?.requirement}</Text>
                            </View>
                          )}
                          {isPlaying && (
                            <View style={styles.emoteTabPlayingDot}>
                              <Text style={{ fontSize: 8, color: colors.orange }}>{'▶'}</Text>
                            </View>
                          )}
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>
              ))}
            </View>
          ) : tabItems.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.itemsScroll}
            >
              {tabItems.map(item => {
                const isDefault = item.unlock.type === 'default';
                const isLocked = !isDefault;
                const unlockDesc = getUnlockDescription(item.unlock);
                const rarityColor = RARITY_COLORS[item.rarity];
                const isSelected = selectedItem?.id === item.id;

                return (
                  <Pressable
                    key={item.id}
                    onPress={() => handleItemTap(item)}
                    style={[
                      styles.itemCard,
                      isDefault && styles.itemCardOwned,
                      isSelected && styles.itemCardSelected,
                    ]}
                  >
                    {/* Rarity strip at top */}
                    <View style={[styles.rarityStrip, { backgroundColor: rarityColor }]} />

                    {/* Icon / preview */}
                    <View style={styles.itemPreview}>
                      {isLocked && (
                        <View style={styles.lockOverlay}>
                          <Text style={styles.lockIcon}>&#x1F512;</Text>
                        </View>
                      )}
                      <Text style={styles.itemEmoji}>{item.icon}</Text>
                    </View>

                    {/* Info */}
                    <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                    <Text style={[styles.itemRarity, { color: rarityColor }]}>
                      {RARITY_LABELS[item.rarity]}
                    </Text>

                    {/* Status */}
                    {isDefault ? (
                      <View style={styles.ownedTag}>
                        <Text style={styles.ownedTagText}>OWNED</Text>
                      </View>
                    ) : (
                      <Text style={styles.unlockReq} numberOfLines={1}>{unlockDesc}</Text>
                    )}

                    {/* Selected checkmark for owned items */}
                    {isDefault && (
                      <View style={styles.checkmark}>
                        <Text style={styles.checkmarkText}>&#x2713;</Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : (
            <View style={styles.emptyTab}>
              <Text style={styles.emptyTabIcon}>
                {activeTab === 'species' ? '\uD83E\uDDD1' : '\uD83C\uDFA8'}
              </Text>
              <Text style={styles.emptyTabTitle}>
                {activeTab === 'species' ? 'Species' : 'Color Palettes'}
              </Text>
              <Text style={styles.emptyTabSub}>Coming soon in a future update</Text>
            </View>
          )}

          {/* ══ SECTION DIVIDER ══ */}
          <View style={styles.sectionDivider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>POSES</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* ══ POSES SECTION ══ */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.posesScroll}
          >
            {POSE_LIST.map(pose => {
              const isSelected = selectedPose === pose.id;
              return (
                <Pressable
                  key={pose.id}
                  onPress={() => { haptics.tap(); setSelectedPose(pose.id); }}
                  style={[styles.poseCard, isSelected && styles.poseCardSelected]}
                >
                  <View style={styles.posePreview}>
                    <PoseDisplay pose={pose.id} size={80} />
                  </View>
                  <Text style={[styles.poseLabel, isSelected && styles.poseLabelSelected]}>
                    {pose.label}
                  </Text>
                  {isSelected && <View style={styles.poseSelectedDot} />}
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Bottom spacer */}
          <View style={{ height: 80 }} />
        </ScrollView>

        {/* ══ ITEM DETAIL PANEL (B) — bottom sheet ══ */}
        {selectedItem && (
          <View style={styles.detailOverlay}>
            <Pressable style={styles.detailDismiss} onPress={closeDetailPanel} />
            <View style={styles.detailPanel}>
              {/* Grab handle */}
              <View style={styles.detailHandle} />

              {/* Rarity accent line */}
              <View style={[styles.detailRarityLine, { backgroundColor: RARITY_COLORS[selectedItem.rarity] }]} />

              <View style={styles.detailContent}>
                {/* Icon + name row */}
                <View style={styles.detailHeader}>
                  <Text style={styles.detailEmoji}>{selectedItem.icon}</Text>
                  <View style={styles.detailHeaderText}>
                    <Text style={styles.detailName}>{selectedItem.name}</Text>
                    <View style={[styles.detailRarityBadge, { backgroundColor: RARITY_COLORS[selectedItem.rarity] + '22', borderColor: RARITY_COLORS[selectedItem.rarity] + '55' }]}>
                      <Text style={[styles.detailRarityLabel, { color: RARITY_COLORS[selectedItem.rarity] }]}>
                        {RARITY_LABELS[selectedItem.rarity]}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Description / flavor text */}
                <Text style={styles.detailDesc}>
                  {RARITY_DESCRIPTIONS[selectedItem.rarity]}
                </Text>

                {/* Category */}
                <Text style={styles.detailCategory}>
                  Category: {selectedItem.category.charAt(0).toUpperCase() + selectedItem.category.slice(1)}
                </Text>

                {/* Action button */}
                {selectedItem.unlock.type === 'default' ? (
                  <Pressable
                    onPress={() => { haptics.tap(); closeDetailPanel(); }}
                    style={styles.detailEquipButton}
                  >
                    <LinearGradient
                      colors={['#ff8c00', '#e07800']}
                      style={styles.detailEquipGradient}
                    >
                      <Text style={styles.detailEquipText}>EQUIP</Text>
                    </LinearGradient>
                  </Pressable>
                ) : (
                  <View style={styles.detailLockedRow}>
                    <Text style={styles.detailLockedIcon}>{'\uD83D\uDD12'}</Text>
                    <View>
                      <Text style={styles.detailLockedTitle}>UNLOCK REQUIREMENT</Text>
                      <Text style={styles.detailLockedReq}>{getUnlockDescription(selectedItem.unlock)}</Text>
                    </View>
                  </View>
                )}

                {/* Price if coins-based */}
                {selectedItem.unlock.type === 'coins' && (
                  <Pressable
                    onPress={() => { haptics.tap(); }}
                    style={styles.detailBuyButton}
                  >
                    <Text style={styles.detailBuyIcon}>{'\uD83E\uDE99'}</Text>
                    <Text style={styles.detailBuyText}>{selectedItem.unlock.price} COINS</Text>
                  </Pressable>
                )}
              </View>
            </View>
          </View>
        )}

        {/* ══ SAVE BUTTON (pinned bottom) — with checkmark icon (E) ══ */}
        <View style={styles.bottomBar}>
          <GlossyButton
            label="SAVE"
            icon={'\u2713'}
            variant="orange"
            onPress={() => navigation.goBack()}
          />
        </View>
      </View>
    </ScreenBackground>
  );
}

// ====================================
// STYLES
// ====================================

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    paddingBottom: 20,
  },

  // --- Character Display ---
  characterDisplayArea: {
    height: 340,
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  glowRingOuter: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    borderWidth: 1,
    borderColor: 'rgba(100,80,200,0.1)',
    top: 10,
  },
  glowRingMiddle: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    borderWidth: 1.5,
    borderColor: 'rgba(80,120,255,0.15)',
    backgroundColor: 'rgba(80,100,255,0.03)',
    top: 50,
  },
  spotlightGlow: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    top: 20,
  },
  previewTintOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
    borderWidth: 2,
    overflow: 'hidden',
    zIndex: 1,
    pointerEvents: 'none',
  },
  previewBanner: {
    position: 'absolute',
    top: 12,
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 8,
    zIndex: 5,
  },
  previewBannerText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 10,
    color: '#ffffff',
    letterSpacing: 1.5,
  },
  displayPlatform: {
    width: 200,
    height: 16,
    borderRadius: 100,
    marginTop: -6,
    shadowColor: 'rgba(80,140,255,0.6)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 8,
  },
  displayRing: {
    width: 240,
    height: 6,
    borderRadius: 120,
    backgroundColor: 'rgba(100,180,255,0.08)',
    marginTop: 2,
  },

  // --- Player Info ---
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 10,
  },
  playerName: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 24,
    color: '#ffffff',
    letterSpacing: 1,
  },
  levelBadge: {
    backgroundColor: 'rgba(255,140,0,0.2)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,140,0,0.4)',
  },
  levelText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 11,
    color: colors.orange,
    letterSpacing: 1,
  },

  // --- Equipped Summary Row (A) ---
  equipRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
    paddingHorizontal: 14,
  },
  equipPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  equipPillIcon: {
    fontSize: 13,
  },
  equipPillLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 10,
    color: colors.textSecondary,
    maxWidth: 60,
  },

  // --- Collection Progress (E) ---
  collectionBar: {
    marginHorizontal: 20,
    marginTop: 12,
    alignItems: 'center',
  },
  collectionLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 10,
    color: colors.textMuted,
    letterSpacing: 1,
    marginBottom: 4,
  },
  progressTrack: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: colors.orange,
  },
  collectionCount: {
    fontFamily: fonts.body,
    fontWeight: weight.medium,
    fontSize: 9,
    color: colors.textMuted,
    marginTop: 3,
  },

  // --- Section Divider ---
  sectionDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 18,
    marginBottom: 10,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  dividerText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 11,
    color: colors.textMuted,
    letterSpacing: 3,
  },

  // --- Tabs ---
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    position: 'relative',
  },
  tabActive: {
    backgroundColor: 'rgba(255,140,0,0.12)',
  },
  tabIcon: {
    fontSize: 18,
    marginBottom: 2,
  },
  tabLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 9,
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  tabLabelActive: {
    color: colors.orange,
    fontWeight: weight.bold,
  },
  tabCount: {
    fontFamily: fonts.body,
    fontWeight: weight.medium,
    fontSize: 7,
    color: colors.textMuted,
    marginTop: 1,
    opacity: 0.6,
  },
  tabCountActive: {
    color: colors.orange,
    opacity: 0.8,
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 2,
    width: 16,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.orange,
  },

  // --- Randomize (D) ---
  randomRow: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 2,
  },
  randomButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(155,89,182,0.12)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(155,89,182,0.25)',
  },
  randomIcon: {
    fontSize: 16,
  },
  randomLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 11,
    color: '#bf5fff',
    letterSpacing: 0.5,
  },

  // --- Item Cards ---
  itemsScroll: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  itemCard: {
    width: 120,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
    opacity: 0.55,
    position: 'relative',
  },
  itemCardOwned: {
    opacity: 1,
    borderColor: colors.orange,
    borderWidth: 2,
    shadowColor: colors.orange,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  itemCardSelected: {
    borderColor: '#ffffff',
    borderWidth: 2,
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
    opacity: 1,
  },
  rarityStrip: {
    height: 4,
    width: '100%',
  },
  itemPreview: {
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  lockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  lockIcon: {
    fontSize: 20,
    opacity: 0.6,
  },
  itemEmoji: {
    fontSize: 32,
  },
  itemName: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 11,
    color: '#ffffff',
    textAlign: 'center',
    paddingHorizontal: 6,
  },
  itemRarity: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 8,
    textAlign: 'center',
    letterSpacing: 1.5,
    marginTop: 1,
  },
  ownedTag: {
    alignSelf: 'center',
    backgroundColor: 'rgba(39,174,61,0.15)',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 4,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(39,174,61,0.3)',
  },
  ownedTagText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 8,
    color: colors.green,
    letterSpacing: 1,
  },
  unlockReq: {
    fontFamily: fonts.body,
    fontWeight: weight.medium,
    fontSize: 9,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: 6,
    marginTop: 4,
    marginBottom: 8,
  },
  checkmark: {
    position: 'absolute',
    top: 10,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkText: {
    fontSize: 11,
    color: '#ffffff',
    fontWeight: '800',
  },

  // --- Empty Tab Placeholder ---
  emptyTab: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyTabIcon: {
    fontSize: 40,
    marginBottom: 8,
    opacity: 0.4,
  },
  emptyTabTitle: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 16,
    color: colors.textSecondary,
  },
  emptyTabSub: {
    fontFamily: fonts.body,
    fontWeight: weight.regular,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },

  // --- Poses ---
  posesScroll: {
    paddingHorizontal: 14,
    gap: 10,
  },
  poseCard: {
    width: 100,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.06)',
    position: 'relative',
  },
  poseCardSelected: {
    borderColor: colors.orange,
    borderWidth: 2,
    backgroundColor: 'rgba(255,140,0,0.06)',
    shadowColor: colors.orange,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  posePreview: {
    height: 80,
    width: 80,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  poseLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  poseLabelSelected: {
    color: colors.orange,
    fontWeight: weight.bold,
  },
  poseSelectedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.orange,
    marginTop: 4,
  },

  // --- Item Detail Panel (B) ---
  detailOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    justifyContent: 'flex-end',
  },
  detailDismiss: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  detailPanel: {
    backgroundColor: '#0e1230',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 90, // room above save button
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderBottomWidth: 0,
  },
  detailHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  detailRarityLine: {
    height: 3,
    width: '100%',
    marginBottom: 12,
  },
  detailContent: {
    paddingHorizontal: 20,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 10,
  },
  detailEmoji: {
    fontSize: 44,
  },
  detailHeaderText: {
    flex: 1,
  },
  detailName: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 22,
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  detailRarityBadge: {
    alignSelf: 'flex-start',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    marginTop: 4,
  },
  detailRarityLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 9,
    letterSpacing: 1.5,
  },
  detailDesc: {
    fontFamily: fonts.body,
    fontWeight: weight.regular,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 8,
  },
  detailCategory: {
    fontFamily: fonts.body,
    fontWeight: weight.medium,
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 16,
  },
  detailEquipButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
  },
  detailEquipGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 12,
  },
  detailEquipText: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 16,
    color: '#ffffff',
    letterSpacing: 2,
  },
  detailLockedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginBottom: 8,
  },
  detailLockedIcon: {
    fontSize: 24,
  },
  detailLockedTitle: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 9,
    color: colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  detailLockedReq: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 13,
    color: '#ffffff',
  },
  detailBuyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(241,196,15,0.12)',
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(241,196,15,0.3)',
  },
  detailBuyIcon: {
    fontSize: 16,
  },
  detailBuyText: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 14,
    color: '#f1c40f',
    letterSpacing: 1,
  },

  // --- Emotes Tab ---
  emotesTabContent: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  emoteCategorySection: {
    marginBottom: 12,
  },
  emoteCategoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  emoteCategoryEmoji: {
    fontSize: 13,
  },
  emoteCategoryName: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 10,
    color: colors.textMuted,
    letterSpacing: 2,
  },
  emoteCategoryLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginLeft: 6,
  },
  emoteHScroll: {
    gap: 8,
    paddingHorizontal: 2,
    paddingVertical: 4,
  },
  emoteTabCard: {
    width: 90,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.06)',
    position: 'relative',
  },
  emoteTabCardPlaying: {
    borderColor: colors.orange,
    borderWidth: 2,
    backgroundColor: 'rgba(255,140,0,0.08)',
    shadowColor: colors.orange,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  emoteTabCardLocked: {
    opacity: 0.45,
  },
  emoteTabCardEmoji: {
    fontSize: 26,
    marginBottom: 4,
  },
  emoteTabCardName: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 9,
    color: '#ffffff',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  emoteTabLockBadge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 12,
  },
  emoteTabLockIcon: {
    fontSize: 16,
    marginBottom: 2,
  },
  emoteTabLockReq: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 7,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    paddingHorizontal: 3,
  },
  emoteTabPlayingDot: {
    position: 'absolute',
    top: 3,
    right: 3,
  },

  // --- Bottom Bar ---
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingBottom: 14,
    paddingTop: 8,
    backgroundColor: 'rgba(10,14,39,0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
});
