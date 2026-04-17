import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Dimensions } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { TopBar } from '../components/ui/TopBar';
import { PoseDisplay, PoseId, EMOTE_CATEGORIES, EmoteId } from '../components/ui/AnimatedCharacter';
import { AnimatedCharacter, useEmoteTrigger } from '../components/ui/AnimatedCharacter';
import { EMOTE_EMOJI, EMOTE_NAME, EMOTE_UNLOCKS, CATEGORY_EMOJI } from '../components/ui/EmoteShowcase';
import { GlossyButton } from '../components/ui/GlossyButton';
import { useShopStore } from '../stores/shopStore';
import { useGameStore } from '../stores/gameStore';
import { haptics } from '../services/haptics';
import { playSound } from '../services/audio';
import { colors } from '../theme/colors';
import { fonts, weight } from '../theme/typography';
import { CHARACTER_ITEMS, CharacterItem, getUnlockDescription } from '../data/characterCatalog';
import { PETS, PET_RARITY_COLORS, PET_RARITY_LABELS } from '../data/pets';
import { PetDisplay } from '../components/ui/PetDisplay';
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

// ── Category Grid Config ─────────────────────────────────────────────
type TabId = 'species' | 'outfit' | 'hair' | 'shoes' | 'colors' | 'emotes' | 'pets';

const CATEGORY_CARDS: { id: TabId; icon: string; label: string; color: [string, string]; }[] = [
  { id: 'outfit', icon: '\uD83D\uDC55', label: 'OUTFITS', color: ['#3498db', '#2176ae'] },
  { id: 'hair', icon: '\uD83D\uDC87', label: 'HAIR', color: ['#9b59b6', '#7d4192'] },
  { id: 'shoes', icon: '\uD83D\uDC5F', label: 'SHOES', color: ['#27ae60', '#1e8a4e'] },
  { id: 'colors', icon: '\uD83C\uDFA8', label: 'COLORS', color: [colors.orange, colors.orangeDark] },
  { id: 'emotes', icon: '\uD83D\uDD7A', label: 'EMOTES', color: ['#e74c3c', '#c0392b'] },
  { id: 'species', icon: '\uD83E\uDDD1', label: 'SPECIES', color: ['#1abc9c', '#15967d'] },
  { id: 'pets', icon: '\uD83D\uDC36', label: 'PETS', color: ['#e67e22', '#cf6d17'] },
];

const TAB_TO_CATEGORIES: Record<TabId, string[]> = {
  species: [],
  outfit: ['top', 'bottom'],
  hair: ['hair'],
  shoes: ['shoes'],
  colors: [],
  emotes: [],
  pets: [],
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
    <Pressable
      onPress={onPress}
      style={styles.equipPill}
      accessibilityRole="button"
      accessibilityLabel={`Equipped: ${label}`}
      accessibilityHint="Opens the category to change this item"
    >
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
  const equippedEmotes = useShopStore(s => s.equippedEmotes);
  const setEquippedEmote = useShopStore(s => s.setEquippedEmote);
  const equippedPet = useShopStore(s => s.equippedPet);
  const ownedPets = useShopStore(s => s.ownedPets);
  const equipPet = useShopStore(s => s.equipPet);
  const purchasePet = useShopStore(s => s.purchasePet);

  // 'grid' = category grid view, TabId = browsing a specific category
  const [viewMode, setViewMode] = useState<'grid' | TabId>('grid');
  const [selectedPose, setSelectedPose] = useState<PoseId>('default');
  const [selectedItem, setSelectedItem] = useState<CharacterItem | null>(null);
  const [previewingItem, setPreviewingItem] = useState<CharacterItem | null>(null);
  const { emote: previewEmote, triggerEmote: triggerPreviewEmote, clearEmote: clearPreviewEmote } = useEmoteTrigger();
  const [playingEmoteId, setPlayingEmoteId] = useState<EmoteId | null>(null);

  // Emote wheel assignment: which wheel slot is selected for assignment
  const [selectedWheelSlot, setSelectedWheelSlot] = useState<number | null>(null);
  // Pet preview state
  const [previewPetId, setPreviewPetId] = useState<string | null>(null);

  // Get items for the active tab
  const activeCategories = viewMode !== 'grid' ? TAB_TO_CATEGORIES[viewMode] : [];
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
      pets: { owned: ownedPets.length, total: PETS.length },
    };
    for (const card of CATEGORY_CARDS) {
      if (card.id === 'emotes') {
        const allEmotes = EMOTE_CATEGORIES.flatMap(c => c.emotes);
        const unlocked = allEmotes.filter(e => EMOTE_UNLOCKS[e]?.unlocked);
        counts.emotes = { total: allEmotes.length, owned: unlocked.length };
        continue;
      }
      const cats = TAB_TO_CATEGORIES[card.id];
      const items = CHARACTER_ITEMS.filter(i => cats.includes(i.category));
      counts[card.id] = {
        total: items.length,
        owned: items.filter(i => i.unlock.type === 'default').length,
      };
    }
    return counts;
  }, []);

  // Rarity breakdown
  const rarityBreakdown = useMemo(() => {
    const breakdown: Record<string, { owned: number; total: number }> = {
      common: { owned: 0, total: 0 },
      rare: { owned: 0, total: 0 },
      epic: { owned: 0, total: 0 },
      legendary: { owned: 0, total: 0 },
    };
    for (const item of CHARACTER_ITEMS) {
      if (breakdown[item.rarity]) {
        breakdown[item.rarity].total++;
        if (item.unlock.type === 'default') breakdown[item.rarity].owned++;
      }
    }
    return breakdown;
  }, []);

  // ── Randomize ─────────────────────────────────────────────────────────
  const handleRandomize = useCallback(() => {
    haptics.tap();
    const categories = ['hair', 'top', 'bottom', 'shoes'] as const;
    let lastPicked: CharacterItem | null = null;
    for (const cat of categories) {
      const items = CHARACTER_ITEMS.filter(i => i.category === cat && i.unlock.type === 'default');
      if (items.length > 0) {
        lastPicked = items[Math.floor(Math.random() * items.length)];
      }
    }
    const randomPose = POSE_LIST[Math.floor(Math.random() * POSE_LIST.length)];
    setSelectedPose(randomPose.id);
    if (lastPicked) {
      setPreviewingItem(lastPicked);
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

  // ── Navigate to a category ────────────────────────────────────────────
  const openCategory = useCallback((id: TabId) => {
    haptics.tap();
    setViewMode(id);
  }, []);

  const backToGrid = useCallback(() => {
    haptics.tap();
    setViewMode('grid');
    setSelectedWheelSlot(null);
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

          {/* ══ CHARACTER DISPLAY (bigger — 350px) ══ */}
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
              size={340}
              emote={previewEmote}
              onEmoteComplete={() => { clearPreviewEmote(); setPlayingEmoteId(null); }}
            />

            {/* PREVIEWING banner */}
            {previewingItem && (
              <View style={[styles.previewBanner, { backgroundColor: RARITY_COLORS[previewingItem.rarity] + 'DD' }]}>
                <Text style={styles.previewBannerText}>PREVIEWING: {previewingItem.name.toUpperCase()}</Text>
              </View>
            )}

            {/* Pet preview next to character */}
            {(previewPetId || equippedPet) && (
              <View style={styles.petPreviewWrap}>
                <PetDisplay petId={previewPetId || equippedPet} size={70} />
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

          {/* ══ COLLECTION STATS BAR ══ */}
          <View style={styles.statsSection}>
            {/* Collection progress */}
            <View style={styles.collectionRow}>
              <Text style={styles.collectionLabel}>
                COLLECTION: {collectionStats.owned}/{collectionStats.total} items ({collectionStats.pct}%)
              </Text>
              <View style={styles.collectionTrack}>
                <LinearGradient
                  colors={[colors.orange, '#ff6600']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.collectionFill, { width: `${collectionStats.pct}%` }]}
                />
              </View>
            </View>

            {/* Rarity breakdown */}
            <View style={styles.rarityRow}>
              {Object.entries(rarityBreakdown).map(([rarity, data]) => (
                <View key={rarity} style={styles.rarityChip}>
                  <View style={[styles.rarityDot, { backgroundColor: RARITY_COLORS[rarity] }]} />
                  <Text style={[styles.rarityChipText, { color: RARITY_COLORS[rarity] }]}>
                    {data.owned}/{data.total}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* ══ VIEW-DEPENDENT CONTENT ══ */}
          {viewMode === 'grid' ? (
            <>
              {/* ── SECTION DIVIDER ── */}
              <View style={styles.sectionDivider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>CUSTOMIZE</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* ── CATEGORY GRID (2x3) ── */}
              <View style={styles.categoryGrid}>
                {CATEGORY_CARDS.map(card => {
                  const counts = tabCounts[card.id];
                  const hasItems = counts.total > 0;
                  return (
                    <Pressable
                      key={card.id}
                      onPress={() => openCategory(card.id)}
                      style={styles.categoryCardWrap}
                      accessibilityRole="button"
                      accessibilityLabel={
                        hasItems
                          ? `${card.label} category, ${counts.owned} of ${counts.total} owned`
                          : `${card.label} category, coming soon`
                      }
                      accessibilityHint={hasItems ? 'Opens this category' : undefined}
                    >
                      <LinearGradient
                        colors={[card.color[0] + '25', card.color[0] + '08']}
                        style={styles.categoryCard}
                      >
                        {/* Colored left accent */}
                        <View style={[styles.categoryAccent, { backgroundColor: card.color[0] }]} />

                        {/* Icon */}
                        <Text style={styles.categoryIcon}>{card.icon}</Text>

                        {/* Label */}
                        <Text style={[styles.categoryLabel, { color: card.color[0] }]}>
                          {card.label}
                        </Text>

                        {/* Count badge — or Coming Soon for empty categories */}
                        {hasItems ? (
                          <View style={[styles.categoryCountBadge, { backgroundColor: card.color[0] + '20', borderColor: card.color[0] + '40' }]}>
                            <Text style={[styles.categoryCountText, { color: card.color[0] }]}>
                              {counts.owned}/{counts.total}
                            </Text>
                          </View>
                        ) : (
                          <View style={[styles.categoryCountBadge, { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }]}>
                            <Text style={[styles.categoryCountText, { color: 'rgba(255,255,255,0.4)', fontSize: 8 }]}>
                              SOON
                            </Text>
                          </View>
                        )}

                        {/* Arrow */}
                        <Text style={[styles.categoryArrow, { color: card.color[0] }]}>›</Text>
                      </LinearGradient>
                    </Pressable>
                  );
                })}
              </View>

              {/* ── RANDOMIZE BUTTON ── */}
              <View style={styles.randomRow}>
                <Pressable
                  onPress={handleRandomize}
                  style={styles.randomButton}
                  accessibilityRole="button"
                  accessibilityLabel="Random look"
                  accessibilityHint="Randomizes the character's cosmetics"
                >
                  <Text style={styles.randomIcon}>{'\uD83C\uDFB2'}</Text>
                  <Text style={styles.randomLabel}>Random Look</Text>
                </Pressable>
              </View>

              {/* ── POSES SECTION ── */}
              <View style={styles.sectionDivider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>POSES</Text>
                <View style={styles.dividerLine} />
              </View>

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
                      accessibilityRole="button"
                      accessibilityLabel={`${pose.label} pose`}
                      accessibilityState={{ selected: isSelected }}
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
            </>
          ) : (
            <>
              {/* ── BACK TO CATEGORIES button ── */}
              <Pressable
                onPress={backToGrid}
                style={styles.backBtn}
                accessibilityRole="button"
                accessibilityLabel="Back to categories"
                accessibilityHint="Returns to the category grid"
              >
                <LinearGradient
                  colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)']}
                  style={styles.backBtnGradient}
                >
                  <Text style={styles.backArrow}>‹</Text>
                  <Text style={styles.backLabel}>BACK TO CATEGORIES</Text>
                </LinearGradient>
              </Pressable>

              {/* ── ACTIVE TAB HEADER ── */}
              {(() => {
                const activeCard = CATEGORY_CARDS.find(c => c.id === viewMode);
                if (!activeCard) return null;
                const counts = tabCounts[viewMode];
                return (
                  <View style={styles.activeTabHeader}>
                    <LinearGradient
                      colors={[activeCard.color[0] + '18', 'transparent']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.activeTabHeaderGrad}
                    >
                      <Text style={styles.activeTabIcon}>{activeCard.icon}</Text>
                      <Text style={[styles.activeTabTitle, { color: activeCard.color[0] }]}>
                        {activeCard.label}
                      </Text>
                      {counts.total > 0 && (
                        <Text style={styles.activeTabCount}>
                          {counts.owned}/{counts.total} owned
                        </Text>
                      )}
                    </LinearGradient>
                  </View>
                );
              })()}

              {/* ── EMOTES VIEW ── */}
              {viewMode === 'emotes' ? (
                <View style={styles.emotesTabContent}>
                  {/* YOUR WHEEL */}
                  <View style={styles.yourWheelSection}>
                    <View style={styles.yourWheelHeader}>
                      <Text style={styles.yourWheelTitle}>YOUR WHEEL</Text>
                      <Text style={styles.yourWheelSub}>
                        {selectedWheelSlot !== null
                          ? `Tap an emote below to assign to Slot ${selectedWheelSlot + 1}`
                          : 'Tap a slot, then pick an emote to assign'}
                      </Text>
                    </View>
                    <View style={styles.yourWheelSlots}>
                      {equippedEmotes.map((emoteId, index) => {
                        const eid = emoteId as EmoteId;
                        const isSelected = selectedWheelSlot === index;
                        return (
                          <Pressable
                            key={index}
                            onPress={() => {
                              haptics.tap();
                              setSelectedWheelSlot(isSelected ? null : index);
                            }}
                            style={[
                              styles.wheelSlot,
                              isSelected && styles.wheelSlotSelected,
                            ]}
                            accessibilityRole="button"
                            accessibilityLabel={`Wheel slot ${index + 1}: ${EMOTE_NAME[eid] || 'Empty'}`}
                            accessibilityHint="Tap to select this slot, then tap an emote to assign it"
                            accessibilityState={{ selected: isSelected }}
                          >
                            <Text style={styles.wheelSlotEmoji}>
                              {EMOTE_EMOJI[eid] || '?'}
                            </Text>
                            <Text style={styles.wheelSlotName} numberOfLines={1}>
                              {EMOTE_NAME[eid] || 'Empty'}
                            </Text>
                            <View style={styles.wheelSlotNum}>
                              <Text style={styles.wheelSlotNumText}>{index + 1}</Text>
                            </View>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>

                  {/* EMOTE GRID */}
                  {EMOTE_CATEGORIES.map(category => (
                    <View key={category.name} style={styles.emoteCategorySection}>
                      <View style={styles.emoteCategoryHeader}>
                        <Text style={styles.emoteCategoryEmoji}>{CATEGORY_EMOJI[category.name] || '\uD83C\uDFAD'}</Text>
                        <Text style={styles.emoteCategoryName}>{category.name.toUpperCase()}</Text>
                        <View style={styles.emoteCategoryLine} />
                      </View>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.emoteHScroll}>
                        {category.emotes.map(emoteId => {
                          const unlock = EMOTE_UNLOCKS[emoteId];
                          const isLocked = !unlock?.unlocked;
                          const isPlaying = playingEmoteId === emoteId;
                          const isInWheel = equippedEmotes.includes(emoteId);

                          return (
                            <Pressable
                              key={emoteId}
                              onPress={() => {
                                if (isLocked) { haptics.error(); playSound('error'); return; }
                                haptics.tap();
                                if (selectedWheelSlot !== null) {
                                  setEquippedEmote(selectedWheelSlot, emoteId);
                                  setSelectedWheelSlot(null);
                                  return;
                                }
                                setPlayingEmoteId(emoteId);
                                triggerPreviewEmote(emoteId);
                              }}
                              style={[
                                styles.emoteTabCard,
                                isPlaying && styles.emoteTabCardPlaying,
                                isLocked && styles.emoteTabCardLocked,
                                isInWheel && styles.emoteTabCardInWheel,
                              ]}
                              accessibilityRole="button"
                              accessibilityLabel={
                                isLocked
                                  ? `${EMOTE_NAME[emoteId]} emote, locked: ${unlock?.requirement || 'requirement not met'}`
                                  : selectedWheelSlot !== null
                                    ? `Assign ${EMOTE_NAME[emoteId]} to wheel slot ${selectedWheelSlot + 1}`
                                    : `Preview ${EMOTE_NAME[emoteId]} emote`
                              }
                              accessibilityState={{ disabled: isLocked, selected: isInWheel }}
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
                              {isInWheel && (
                                <View style={styles.emoteTabWheelBadge}>
                                  <Text style={styles.emoteTabWheelBadgeText}>{'W'}</Text>
                                </View>
                              )}
                            </Pressable>
                          );
                        })}
                      </ScrollView>
                    </View>
                  ))}
                </View>
              ) : viewMode === 'pets' ? (
                /* ── PETS GRID ── */
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.itemsScroll}
                >
                  {PETS.map(pet => {
                    const isOwned = ownedPets.includes(pet.id);
                    const isEquipped = equippedPet === pet.id;
                    const rarityColor = PET_RARITY_COLORS[pet.rarity];

                    return (
                      <Pressable
                        key={pet.id}
                        onPress={() => {
                          haptics.tap();
                          setPreviewPetId(pet.id);
                          if (isEquipped) {
                            equipPet(null);
                            setPreviewPetId(null);
                          } else if (isOwned) {
                            equipPet(pet.id);
                          } else if (pet.price > 0) {
                            const success = purchasePet(pet.id, pet.price);
                            if (success) { haptics.win(); equipPet(pet.id); }
                            else { haptics.error(); playSound('error'); }
                          }
                        }}
                        style={[
                          styles.itemCard,
                          isOwned && styles.itemCardOwned,
                          isEquipped && styles.itemCardSelected,
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={
                          isEquipped
                            ? `${pet.name}, ${PET_RARITY_LABELS[pet.rarity]} pet, equipped`
                            : isOwned
                              ? `${pet.name}, ${PET_RARITY_LABELS[pet.rarity]} pet, owned`
                              : pet.price > 0
                                ? `${pet.name}, ${PET_RARITY_LABELS[pet.rarity]} pet, costs ${pet.price} coins`
                                : `${pet.name}, ${PET_RARITY_LABELS[pet.rarity]} pet, locked`
                        }
                        accessibilityState={{ selected: isEquipped }}
                      >
                        {/* Rarity strip at top */}
                        <View style={[styles.rarityStrip, { backgroundColor: rarityColor }]} />

                        {/* Pet image */}
                        <View style={styles.itemPreview}>
                          <PetDisplay petId={pet.id} size={64} />
                        </View>

                        {/* Info */}
                        <Text style={styles.itemName} numberOfLines={1}>{pet.name}</Text>
                        <Text style={[styles.itemRarity, { color: rarityColor }]}>
                          {PET_RARITY_LABELS[pet.rarity]}
                        </Text>

                        {/* Status */}
                        {isEquipped ? (
                          <View style={[styles.ownedTag, { backgroundColor: 'rgba(255,140,0,0.15)', borderColor: 'rgba(255,140,0,0.4)' }]}>
                            <Text style={[styles.ownedTagText, { color: colors.orange }]}>EQUIPPED</Text>
                          </View>
                        ) : isOwned ? (
                          <View style={styles.ownedTag}>
                            <Text style={styles.ownedTagText}>OWNED</Text>
                          </View>
                        ) : pet.price > 0 ? (
                          <Text style={styles.unlockReq} numberOfLines={1}>{pet.price} coins</Text>
                        ) : (
                          <Text style={styles.unlockReq} numberOfLines={1}>{pet.description || 'Earn only'}</Text>
                        )}

                        {isEquipped && (
                          <View style={styles.checkmark}>
                            <Text style={styles.checkmarkText}>{'\u2713'}</Text>
                          </View>
                        )}
                      </Pressable>
                    );
                  })}
                </ScrollView>
              ) : tabItems.length > 0 ? (
                /* ── ITEM SCROLL ── */
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
                        accessibilityRole="button"
                        accessibilityLabel={
                          isDefault
                            ? `${item.name}, ${RARITY_LABELS[item.rarity]}, owned`
                            : `${item.name}, ${RARITY_LABELS[item.rarity]}, locked: ${unlockDesc}`
                        }
                        accessibilityHint="Opens item details"
                        accessibilityState={{ selected: isSelected, disabled: isLocked }}
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
                <Animated.View entering={FadeIn.duration(280)} style={styles.emptyTab}>
                  <Text style={styles.emptyTabIcon}>
                    {viewMode === 'species' ? '\uD83E\uDDD1' : '\uD83C\uDFA8'}
                  </Text>
                  <Text style={styles.emptyTabTitle}>
                    {viewMode === 'species' ? 'Species' : 'Color Palettes'}
                  </Text>
                  <Text style={styles.emptyTabSub}>Coming soon in a future update</Text>
                </Animated.View>
              )}
            </>
          )}

          {/* Bottom spacer */}
          <View style={{ height: 80 }} />
        </ScrollView>

        {/* ══ ITEM DETAIL PANEL (B) — bottom sheet ══ */}
        {selectedItem && (
          <View style={styles.detailOverlay}>
            <Pressable
              style={styles.detailDismiss}
              onPress={closeDetailPanel}
              accessibilityRole="button"
              accessibilityLabel="Dismiss item details"
            />
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
                    accessibilityRole="button"
                    accessibilityLabel={`Equip ${selectedItem.name}`}
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
                    accessibilityRole="button"
                    accessibilityLabel={`Buy ${selectedItem.name} for ${selectedItem.unlock.price} coins`}
                  >
                    <Text style={styles.detailBuyIcon}>{'\uD83E\uDE99'}</Text>
                    <Text style={styles.detailBuyText}>{selectedItem.unlock.price} COINS</Text>
                  </Pressable>
                )}
              </View>
            </View>
          </View>
        )}

        {/* ══ SAVE BUTTON (pinned bottom) ══ */}
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

const CARD_GAP = 10;
// Use min(screen, 386) — phone frame inner content area is 386px on web
const CONTENT_WIDTH = Math.min(SCREEN_WIDTH, 386);
const CARD_WIDTH = Math.floor((CONTENT_WIDTH - 32 - CARD_GAP) / 2); // 2 columns, integer for safety

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    paddingBottom: 20,
  },

  // --- Character Display (bigger: 380px) ---
  characterDisplayArea: {
    height: 380,
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  glowRingOuter: {
    position: 'absolute',
    width: 340,
    height: 340,
    borderRadius: 170,
    borderWidth: 1,
    borderColor: 'rgba(100,80,200,0.1)',
    top: 10,
  },
  glowRingMiddle: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    borderWidth: 1.5,
    borderColor: 'rgba(80,120,255,0.15)',
    backgroundColor: 'rgba(80,100,255,0.03)',
    top: 50,
  },
  spotlightGlow: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
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
    width: 220,
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
    width: 260,
    height: 6,
    borderRadius: 130,
    backgroundColor: 'rgba(100,180,255,0.08)',
    marginTop: 2,
  },
  petPreviewWrap: {
    position: 'absolute',
    right: 40,
    bottom: 30,
    zIndex: 3,
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

  // --- Collection Stats Section ---
  statsSection: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  collectionRow: {
    marginBottom: 8,
  },
  collectionLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 10,
    color: colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  collectionTrack: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  collectionFill: {
    height: '100%',
    borderRadius: 4,
  },
  rarityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rarityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  rarityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  rarityChipText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 10,
    letterSpacing: 0.5,
  },

  // --- Equipped Summary Row ---
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

  // --- Category Grid (2x3) ---
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: CARD_GAP,
  },
  categoryCardWrap: {
    width: CARD_WIDTH,
    borderRadius: 16,
    overflow: 'hidden',
  },
  categoryCard: {
    height: 100,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  categoryAccent: {
    position: 'absolute',
    left: 0,
    top: 12,
    bottom: 12,
    width: 4,
    borderRadius: 2,
  },
  categoryIcon: {
    fontSize: 30,
    marginBottom: 4,
  },
  categoryLabel: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 13,
    letterSpacing: 1.5,
  },
  categoryCountBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
  },
  categoryCountText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 9,
    letterSpacing: 0.5,
  },
  categoryArrow: {
    position: 'absolute',
    bottom: 6,
    right: 10,
    fontSize: 22,
    fontWeight: '300',
    opacity: 0.5,
  },

  // --- Randomize ---
  randomRow: {
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 2,
  },
  randomButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(155,89,182,0.18)',
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(155,89,182,0.25)',
  },
  randomIcon: {
    fontSize: 16,
  },
  randomLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 13,
    color: '#bf5fff',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  // --- Back to Categories ---
  backBtn: {
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  backBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    gap: 6,
  },
  backArrow: {
    fontSize: 22,
    color: colors.textSecondary,
    fontWeight: '300',
    marginTop: -2,
  },
  backLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 12,
    color: colors.textSecondary,
    letterSpacing: 1.5,
  },

  // --- Active Tab Header ---
  activeTabHeader: {
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 8,
    borderRadius: 14,
    overflow: 'hidden',
  },
  activeTabHeaderGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  activeTabIcon: {
    fontSize: 24,
  },
  activeTabTitle: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 18,
    letterSpacing: 1.5,
  },
  activeTabCount: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 11,
    color: colors.textSecondary,
    marginLeft: 'auto',
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
    paddingBottom: 90,
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
  emoteTabCardInWheel: {
    borderColor: 'rgba(255,140,0,0.25)',
  },
  emoteTabWheelBadge: {
    position: 'absolute',
    top: 3,
    left: 3,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(255,140,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoteTabWheelBadgeText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 8,
    color: colors.orange,
  },

  // --- YOUR WHEEL section ---
  yourWheelSection: {
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  yourWheelHeader: {
    marginBottom: 8,
  },
  yourWheelTitle: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 14,
    color: colors.orange,
    letterSpacing: 3,
  },
  yourWheelSub: {
    fontFamily: fonts.body,
    fontWeight: weight.medium,
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  yourWheelSlots: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  wheelSlot: {
    width: (SCREEN_WIDTH - 24 - 40) / 6,
    aspectRatio: 0.85,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    position: 'relative',
  },
  wheelSlotSelected: {
    borderColor: colors.orange,
    backgroundColor: 'rgba(255,140,0,0.1)',
    shadowColor: colors.orange,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
  },
  wheelSlotEmoji: {
    fontSize: 22,
  },
  wheelSlotName: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 7,
    color: '#ffffff',
    letterSpacing: 0.3,
    textAlign: 'center',
    paddingHorizontal: 2,
  },
  wheelSlotNum: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wheelSlotNumText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 8,
    color: 'rgba(255,255,255,0.3)',
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
