import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, ImageSourcePropType } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { TopBar } from '../components/ui/TopBar';
import { Character3D } from '../components/3d/Character3D';
import { PressScale, StaggeredEntry } from '../components/animations';
import { haptics } from '../services/haptics';
import { playSound } from '../services/audio';
import { useShopStore } from '../stores/shopStore';
import { useCharacterStore } from '../stores/characterStore';
import { usePetStore } from '../stores/petStore';
import { OUTFITS } from '../data/outfitRegistry';
import { HUMAN_EMOTES, DEFAULT_HUMAN_IDLE } from '../data/animationRegistry';
import { PETS as PETS_3D } from '../data/petRegistry';
import {
  BOARD_THEMES, PIECE_THEMES, DROP_EFFECTS, WIN_ANIMATIONS,
} from '../data/shopCatalog';
import { colors } from '../theme/colors';
import { fonts, weight } from '../theme/typography';

// ═══════════════════════════════════════════════════════════════════════
// CustomizeScreen — the locker room (4-tab redesign)
//
// Phase 1 structure:
//   [TopBar] [CUSTOMIZE title] [3D character] [3x3 category grid]
//
// The 9 category cards mirror the Shop's sub-tab structure so one mental
// model carries across. Tap a card to jump to that Shop sub-tab (where
// equip/buy lives today). Dedicated in-tab equip drawers are a follow-up.
//
// Counts shown per card are "owned / total". "Total" comes from the
// canonical data registries (OUTFITS / HUMAN_EMOTES / PETS / BOARD_THEMES
// / etc.) so the UI stays accurate as content grows.
// ═══════════════════════════════════════════════════════════════════════

type CategoryId =
  | 'character'
  | 'clothes'
  | 'outfits'
  | 'emotes'
  | 'pets'
  | 'pieces'
  | 'boards'
  | 'effects'
  | 'wins'
  | 'frames';

type CategoryMeta = {
  id: CategoryId;
  label: string;
  icon: ImageSourcePropType;
  /** Shop tab key to jump to when tapped; `character` opens the creator. */
  shopTab?: string;
};

// Painted icons reuse the batch-2 shop-tab art so the visual language
// stays consistent between the Customize dashboard and the Shop detail.
const CATEGORIES: CategoryMeta[] = [
  { id: 'character', label: 'Character', icon: require('../assets/images/ui/shop-outfits.png') },
  { id: 'clothes',   label: 'Clothes',   icon: require('../assets/images/ui/shop-outfits.png'), shopTab: 'clothes' },
  { id: 'emotes',    label: 'Emotes',    icon: require('../assets/images/ui/shop-emotes.png'),  shopTab: 'emotes' },
  { id: 'pets',      label: 'Pets',      icon: require('../assets/images/ui/shop-pets.png'),    shopTab: 'pets' },
  { id: 'pieces',    label: 'Pieces',    icon: require('../assets/images/ui/shop-pieces.png'),  shopTab: 'pieces' },
  { id: 'boards',    label: 'Boards',    icon: require('../assets/images/ui/shop-boards.png'),  shopTab: 'boards' },
  { id: 'effects',   label: 'Effects',   icon: require('../assets/images/ui/shop-effects.png'), shopTab: 'dropEffects' },
  { id: 'wins',      label: 'Wins',      icon: require('../assets/images/ui/shop-wins.png'),    shopTab: 'winAnimations' },
  { id: 'frames',    label: 'Frames',    icon: require('../assets/images/ui/shop-frames.png'),  shopTab: 'frames' },
  { id: 'outfits',   label: 'Outfits',   icon: require('../assets/images/ui/shop-outfits.png'), shopTab: 'outfits' },
];

// 3D character presenter — simpler variant of HomeScreen's Character3DWrapper.
// Always loops the default idle, no emote interaction (Customize is a stage,
// not a tap-to-react toy).
function CustomizeCharacter() {
  const cust = useCharacterStore((s) => s.customization);
  const outfit = OUTFITS[cust.outfitId] ?? OUTFITS['modern_civilians_01'];
  const idleGlb = DEFAULT_HUMAN_IDLE?.glb;
  return (
    <Character3D
      width={300}
      height={300}
      bodyGlb={outfit.glb}
      skinColor={cust.skinColor}
      hairColor={cust.hairColor}
      outfitColors={cust.outfitColors}
      bodyType={cust.bodyType}
      bodySize={cust.bodySize}
      muscle={cust.muscle}
      animationGlb={idleGlb}
      animationLoop
    />
  );
}

export function CustomizeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const coins = useShopStore((s) => s.coins);
  const gems = useShopStore((s) => s.gems);
  const level = useShopStore((s) => s.level);
  const owned = useShopStore((s) => s.owned);
  const ownedEmotes = useShopStore((s) => s.ownedEmotes);
  const ownedOutfits = useCharacterStore((s) => s.ownedOutfits);
  const ownedPets = usePetStore((s) => s.ownedPets);

  const navigateTo = (screen: string) => navigation.dispatch(CommonActions.navigate({ name: screen }));

  const handleCategoryTap = (cat: CategoryMeta) => {
    haptics.tap();
    playSound('click');
    if (cat.id === 'character') {
      // The Sims-tier AMG creator — @amg/character-creator wired via
      // Drop4's CharacterCreatorScreen. Replaces the legacy
      // Character3DCreator which only edited the single baked outfit.
      navigation.navigate('AmgCreator' as never);
      return;
    }
    // Jump to the Shop tab. Shop's activeTab state is internal so for now
    // we just land on Shop and let the user tap the sub-tab. A future
    // commit can wire up a nav param to preselect the tab.
    navigation.navigate('MainTabs', { screen: 'Shop' } as never);
  };

  // Clothes (AMG parts) owned count — no canonical total yet because the
  // manifest is fetched at shop mount, so we show just the owned count
  // for now. The `/M` slot renders blank when total===0 below.
  const ownedAmgParts = useCharacterStore((s) => s.ownedAmgParts);

  const counts: Record<CategoryId, { owned: number; total: number }> = {
    character: { owned: ownedOutfits.length, total: Object.keys(OUTFITS).length },
    clothes:   { owned: ownedAmgParts.length, total: 0 },
    outfits:   { owned: ownedOutfits.length, total: Object.keys(OUTFITS).length },
    emotes:    { owned: ownedEmotes.length,  total: HUMAN_EMOTES.length },
    pets:      { owned: ownedPets.length,    total: Object.keys(PETS_3D).length },
    pieces:    { owned: owned.pieces.length, total: PIECE_THEMES.length },
    boards:    { owned: owned.boards.length, total: BOARD_THEMES.length },
    effects:   { owned: owned.dropEffects.length, total: DROP_EFFECTS.length },
    wins:      { owned: owned.winAnimations.length, total: WIN_ANIMATIONS.length },
    // Frames don't have a canonical registry yet — show owned count only.
    frames:    { owned: 0, total: 0 },
  };

  return (
    <ScreenBackground scene="profile" liveWallpaper nebulaHue={20}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <TopBar
          coins={coins}
          gems={gems}
          level={level}
          onProfilePress={() => navigateTo('Profile')}
          onSettingsPress={() => navigateTo('Settings')}
          onCoinPress={() => navigation.navigate('MainTabs', { screen: 'Shop' } as never)}
          onGemPress={() => navigation.navigate('MainTabs', { screen: 'Shop' } as never)}
        />
        <Text style={styles.title} accessibilityRole="header">CUSTOMIZE</Text>

        {/* 3D character stage. Centered, no floor, shows whatever outfit
            the player has equipped. Will live-update when they change
            gear via the category cards below (once drawers are wired). */}
        <View style={styles.charStage}>
          <CustomizeCharacter />
        </View>

        {/* 3x3 grid of category cards. All 9 visible without scrolling on
            an iPhone-standard viewport. Taps jump to Shop (interim) or
            the Creator (Character card). */}
        <ScrollView
          contentContainerStyle={styles.gridWrap}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.grid}>
            {CATEGORIES.map((cat, i) => {
              const c = counts[cat.id];
              return (
                <StaggeredEntry key={cat.id} index={i} delay={35}>
                  <CategoryCard
                    cat={cat}
                    owned={c.owned}
                    total={c.total}
                    onPress={() => handleCategoryTap(cat)}
                  />
                </StaggeredEntry>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </ScreenBackground>
  );
}

function CategoryCard({
  cat, owned, total, onPress,
}: {
  cat: CategoryMeta; owned: number; total: number; onPress: () => void;
}) {
  // Highlight cards that have brand-new content the player hasn't tried
  // yet by showing total > owned (i.e. there's something to go equip or
  // buy in this category). Character card never shows a count — it's a
  // multi-attribute editor, not a count-based owned/total.
  const showCount = cat.id !== 'character' && total > 0;
  return (
    <PressScale
      onPress={onPress}
      scaleTo={0.95}
      accessibilityRole="button"
      accessibilityLabel={`${cat.label}${showCount ? `, ${owned} of ${total} owned` : ''}`}
    >
      <View style={styles.card}>
        <Image source={cat.icon} style={styles.cardIcon} resizeMode="contain" />
        <Text style={styles.cardLabel} numberOfLines={1}>{cat.label.toUpperCase()}</Text>
        {showCount && (
          <Text style={styles.cardCount}>{owned}/{total}</Text>
        )}
      </View>
    </PressScale>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: {
    fontFamily: fonts.heading,
    fontWeight: weight.black,
    fontSize: 22,
    color: '#ffffff',
    letterSpacing: 2,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 4,
  },

  // Stage for the 3D character. Centered, transparent bg so the painted
  // profile scene reads through. Height sized so the 3x3 grid below still
  // fits above the bottom tab bar without scrolling.
  charStage: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 280,
    marginBottom: 4,
  },

  gridWrap: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },

  card: {
    width: 108,
    height: 98,
    borderRadius: 14,
    backgroundColor: 'rgba(10,14,32,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    paddingVertical: 8,
    shadowColor: 'rgba(0,0,0,0.6)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 3,
  },
  cardIcon: {
    width: 42,
    height: 42,
    marginBottom: 2,
  },
  cardLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 10,
    color: '#ffffff',
    letterSpacing: 0.8,
    textAlign: 'center',
  },
  cardCount: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 10,
    color: colors.orange,
    marginTop: 2,
  },
});
