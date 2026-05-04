/**
 * EquipPanel — slide-up modal for equipping cosmetics within the
 * Customize tab.
 *
 * Replaces the "tap card → jump to Shop tab" redirect that the dashboard
 * used to do for non-character categories. Players can now stay inside
 * Customize, browse owned items, equip, and dismiss without navigation
 * detours. Locked / unowned items show a "Get in Shop ›" CTA so the
 * Shop is reachable but not the default.
 *
 * Supports 5 categories from shopStore (board / pieces / dropEffect /
 * winAnimation) and 1 from petStore (pets). Frames category has no
 * canonical registry yet — the panel renders an empty state CTA pointing
 * to the Shop until the registry exists.
 *
 * Visual: dark navy backdrop scrim, panel slides from bottom, 80% screen
 * height, rounded top corners. Items render in a 3-col grid with rarity
 * border + EQUIPPED pill on the active item. Matches the locked-in
 * chunky 3D Drop4 visual direction at the chrome level (warm-amber
 * borders, calm dark surfaces).
 */
import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Image,
} from 'react-native';
import { PreviewSafeModal } from '../ui/PreviewSafeModal';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useShopStore } from '../../stores/shopStore';
import { usePetStore } from '../../stores/petStore';
import {
  BOARD_THEMES,
  PIECE_THEMES,
  DROP_EFFECTS,
  WIN_ANIMATIONS,
} from '../../data/shopCatalog';
import { PETS as PETS_3D } from '../../data/petRegistry';
import { PremiumBoardThumbnail } from '../ui/PremiumBoardThumbnail';
import {
  PremiumPiece,
  EffectPreviewCard,
  EFFECT_PREVIEW_CONFIGS,
} from './CosmeticPreviews';
import { colors } from '../../theme/colors';
import { fonts, weight } from '../../theme/typography';
import { haptics } from '../../services/haptics';
import { playSound } from '../../services/audio';

// Painted pet icons for the EquipPanel grid. Keyed by petRegistry PetId
// so the panel can render the actual breed photo instead of a 🐾 emoji.
// dog_coyote has no PNG yet — falls back to the emoji thumbnail.
const PET_ICONS: Record<string, ReturnType<typeof require>> = {
  dog_dalmatian:        require('../../assets/images/characters/pets/dog_dalmatian_idle.png'),
  dog_doberman:         require('../../assets/images/characters/pets/dog_doberman_idle.png'),
  dog_fox:              require('../../assets/images/characters/pets/dog_fox_idle.png'),
  dog_german_shepherd:  require('../../assets/images/characters/pets/dog_germanshepherd_idle.png'),
  dog_golden_retrieve:  require('../../assets/images/characters/pets/dog_goldenretrieve_idle.png'),
  dog_greyhound:        require('../../assets/images/characters/pets/dog_greyhound_idle.png'),
  dog_hellhound:        require('../../assets/images/characters/pets/dog_hellhound_idle.png'),
  dog_husky:            require('../../assets/images/characters/pets/dog_husky_idle.png'),
  dog_labrador:         require('../../assets/images/characters/pets/dog_labrador_idle.png'),
  dog_pointer:          require('../../assets/images/characters/pets/dog_pointer_idle.png'),
  dog_ridgeback:        require('../../assets/images/characters/pets/dog_ridgeback_idle.png'),
  dog_robot:            require('../../assets/images/characters/pets/dog_robot_idle.png'),
  dog_scifi:            require('../../assets/images/characters/pets/dog_scifi_idle.png'),
  dog_shiba:            require('../../assets/images/characters/pets/dog_shiba_idle.png'),
  dog_wolf:             require('../../assets/images/characters/pets/dog_wolf_idle.png'),
};

const RARITY_COLORS: Record<string, string> = {
  common: '#7f8c8d',
  uncommon: '#2ecc71',
  rare: '#3498db',
  epic: '#9b59b6',
  legendary: '#f39c12',
  mythic: '#e91e63',
  darkmatter: '#000000',
};

export type EquipCategory =
  | 'pets'
  | 'boards'
  | 'pieces'
  | 'effects'
  | 'wins'
  | 'frames';

interface Props {
  visible: boolean;
  category: EquipCategory | null;
  onClose: () => void;
}

interface ItemView {
  id: string;
  name: string;
  rarity?: string;
  preview?: { boardColor?: string; p1Color?: string; p2Color?: string };
  thumbnail?: string; // optional emoji/text fallback
  /** Painted PNG icon — when present, takes precedence over thumbnail. */
  iconImage?: ReturnType<typeof require>;
  /** Painted preview kind — drives which preview component renders.
   *  'board' → PremiumBoardThumbnail. 'pieces' → 2× PremiumPiece in
   *  the p1/p2 colors. 'effect' → EffectPreviewCard with the per-id
   *  config. 'pet' → painted PNG via iconImage. Falls back to a flat
   *  color swatch when undefined. */
  previewKind?: 'board' | 'pieces' | 'effect' | 'pet';
  isOwned: boolean;
  isEquipped: boolean;
}

const CATEGORY_LABELS: Record<EquipCategory, string> = {
  pets: 'Pets',
  boards: 'Boards',
  pieces: 'Pieces',
  effects: 'Drop Effects',
  wins: 'Win Animations',
  frames: 'Frames',
};

export function EquipPanel({ visible, category, onClose }: Props) {
  const navigation = useNavigation<any>();

  // Pull store data for ALL relevant categories — cheap selectors, only
  // recomputes when the slice changes.
  const equippedBoard = useShopStore((s) => s.equipped.board);
  const ownedBoards = useShopStore((s) => s.owned.boards);
  const equippedPieces = useShopStore((s) => s.equipped.pieces);
  const ownedPieces = useShopStore((s) => s.owned.pieces);
  const equippedDropEffect = useShopStore((s) => s.equipped.dropEffect);
  const ownedDropEffects = useShopStore((s) => s.owned.dropEffects);
  const equippedWinAnimation = useShopStore((s) => s.equipped.winAnimation);
  const ownedWinAnimations = useShopStore((s) => s.owned.winAnimations);
  const equipItem = useShopStore((s) => s.equipItem);

  const ownedPetsList = usePetStore((s) => s.ownedPets);
  const activePet = usePetStore((s) => s.activePetId);
  const setActivePet = usePetStore((s) => s.setActivePet);

  // Build the list of items for the selected category.
  const items: ItemView[] = useMemo(() => {
    if (!category) return [];

    if (category === 'boards') {
      return BOARD_THEMES.map((b) => ({
        id: b.id,
        name: b.name,
        rarity: b.rarity,
        preview: b.preview,
        previewKind: 'board' as const,
        isOwned: ownedBoards.includes(b.id),
        isEquipped: equippedBoard === b.id,
      }));
    }
    if (category === 'pieces') {
      return PIECE_THEMES.map((p) => ({
        id: p.id,
        name: p.name,
        rarity: p.rarity,
        preview: p.preview,
        previewKind: 'pieces' as const,
        isOwned: ownedPieces.includes(p.id),
        isEquipped: equippedPieces === p.id,
      }));
    }
    if (category === 'effects') {
      return DROP_EFFECTS.map((e) => ({
        id: e.id,
        name: e.name,
        rarity: e.rarity,
        preview: e.preview,
        previewKind: 'effect' as const,
        isOwned: ownedDropEffects.includes(e.id),
        isEquipped: equippedDropEffect === e.id,
      }));
    }
    if (category === 'wins') {
      return WIN_ANIMATIONS.map((w) => ({
        id: w.id,
        name: w.name,
        rarity: w.rarity,
        preview: w.preview,
        previewKind: 'effect' as const,
        isOwned: ownedWinAnimations.includes(w.id),
        isEquipped: equippedWinAnimation === w.id,
      }));
    }
    if (category === 'pets') {
      return Object.values(PETS_3D).map((p: { id: string; name: string }) => ({
        id: p.id,
        name: p.name,
        thumbnail: '🐾',
        iconImage: PET_ICONS[p.id],
        previewKind: 'pet' as const,
        isOwned: ownedPetsList.includes(p.id as any),
        isEquipped: activePet === p.id,
      }));
    }
    // frames: no registry yet → empty
    return [];
  }, [
    category,
    ownedBoards,
    equippedBoard,
    ownedPieces,
    equippedPieces,
    ownedDropEffects,
    equippedDropEffect,
    ownedWinAnimations,
    equippedWinAnimation,
    ownedPetsList,
    activePet,
  ]);

  function handleItemPress(item: ItemView) {
    if (!category) return;
    if (!item.isOwned) {
      // Not owned — route the player to the LootBox screen where they
      // can open bags. After the 2026-05-03 Shop pivot, bags are the
      // primary acquisition path for cosmetics. Tap a locked item →
      // open bags → maybe roll the item.
      haptics.tap();
      onClose();
      navigation.navigate('LootBox' as never);
      return;
    }
    if (item.isEquipped) {
      haptics.tap();
      return;
    }
    haptics.win();
    playSound('click');
    if (category === 'pets') {
      setActivePet(item.id as any);
      return;
    }
    const shopCategoryMap: Record<string, 'board' | 'pieces' | 'dropEffect' | 'winAnimation'> = {
      boards: 'board',
      pieces: 'pieces',
      effects: 'dropEffect',
      wins: 'winAnimation',
    };
    const equipKey = shopCategoryMap[category];
    if (equipKey) equipItem(equipKey, item.id);
  }

  if (!category) return null;

  const ownedCount = items.filter((i) => i.isOwned).length;
  const totalCount = items.length;
  const showEmpty = totalCount === 0;

  return (
    <PreviewSafeModal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <LinearGradient
            colors={['rgba(15,20,40,0.98)', 'rgba(8,10,24,0.98)']}
            style={styles.sheetGradient}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.titleWrap}>
                <Text style={styles.title} accessibilityRole="header">
                  {CATEGORY_LABELS[category].toUpperCase()}
                </Text>
                {!showEmpty && (
                  <Text style={styles.subtitle}>
                    {ownedCount} / {totalCount} owned
                  </Text>
                )}
              </View>
              <Pressable
                onPress={onClose}
                style={styles.closeBtn}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Text style={styles.closeBtnText}>×</Text>
              </Pressable>
            </View>

            {/* Item grid OR empty state */}
            {showEmpty ? (
              <View style={styles.emptyState}>
                {/* Frame mockup — a stylized rounded square with a
                 *  question-mark glyph inside hints at what's coming.
                 *  Dashed warm-amber outline reads as "placeholder /
                 *  coming soon" without any icon-pack dependency. */}
                <View style={styles.emptyFrameMock}>
                  <View style={styles.emptyFrameMockInner}>
                    <Text style={styles.emptyFrameMockGlyph}>?</Text>
                  </View>
                </View>
                <Text style={styles.emptyKicker}>COMING SOON</Text>
                <Text style={styles.emptyTitle}>
                  {category === 'frames' ? 'Profile Frames' : 'New cosmetics'}
                </Text>
                <Text style={styles.emptyBody}>
                  {category === 'frames'
                    ? 'Unlock profile frames through Season Pass tiers and tournament wins. New frames rotate in the Shop weekly.'
                    : 'No items in this category yet — check back after a content drop.'}
                </Text>
                <Pressable
                  style={styles.emptyShopBtn}
                  onPress={() => {
                    onClose();
                    navigation.navigate('LootBox' as never);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Open bags"
                  accessibilityHint="Closes this panel and opens the bags screen"
                >
                  <Text style={styles.emptyShopBtnText}>OPEN BAGS ›</Text>
                </Pressable>
              </View>
            ) : (
              <ScrollView
                contentContainerStyle={styles.gridWrap}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.grid}>
                  {items.map((item) => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      onPress={() => handleItemPress(item)}
                    />
                  ))}
                </View>
                {/* Footer hint — bags are the new primary acquisition
                 *  path for any locked items in this category. Tap to
                 *  open the LootBox screen and roll for new cosmetics. */}
                <Pressable
                  style={styles.footerShopLink}
                  onPress={() => {
                    onClose();
                    navigation.navigate('LootBox' as never);
                  }}
                  accessibilityRole="link"
                  accessibilityLabel="Open bags"
                  accessibilityHint="Closes this panel and opens the bags screen"
                >
                  <Text style={styles.footerShopText}>
                    Open bags to get more ›
                  </Text>
                </Pressable>
              </ScrollView>
            )}
          </LinearGradient>
        </Pressable>
      </Pressable>
    </PreviewSafeModal>
  );
}

// Card preview width target. EquipPanel cards are 31% wide, so on a
// 390px-wide phone with horizontal padding 14 + 10px gaps each card is
// roughly (390 - 28 - 20) / 3 ≈ 114px wide. The preview slot then sits
// at ~98px after card padding 8. We pass a width hint to the painted
// preview components so they render at the correct internal scale.
const PREVIEW_WIDTH = 100;
const PREVIEW_HEIGHT = 64;

function ItemCard({ item, onPress }: { item: ItemView; onPress: () => void }) {
  const rarityColor = item.rarity ? RARITY_COLORS[item.rarity] ?? '#7f8c8d' : '#7f8c8d';
  const fallbackColor =
    item.preview?.boardColor ?? item.preview?.p1Color ?? '#1a3a5c';

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.card,
        { borderColor: item.isEquipped ? colors.coinGold : `${rarityColor}66` },
        !item.isOwned && { opacity: 0.55 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${item.name}${item.isEquipped ? ', equipped' : item.isOwned ? '' : ', locked'}`}
    >
      <View style={styles.cardPreview}>
        {/* Painted previews per category. Mirrors the painted art the
            old Shop showed for each cosmetic kind. Boards: layered
            atmospheric scene + mini board. Pieces: 2× glossy plastic
            discs in p1/p2 colors over a dark backdrop. Effects/Wins:
            EffectPreviewCard with per-id config (gradient bg + accent
            glow + center icon + drifting particles + accent line).
            Pets: painted breed PNG over rarity-tinted backdrop. */}
        {item.previewKind === 'board' ? (
          <PremiumBoardThumbnail
            themeId={item.id}
            width={PREVIEW_WIDTH}
            height={PREVIEW_HEIGHT}
          />
        ) : item.previewKind === 'pieces' && item.preview?.p1Color && item.preview?.p2Color ? (
          <View style={styles.piecePreviewBackdrop}>
            <LinearGradient
              colors={['#1a1a2e', '#0e0e1a', '#060610']}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.piecePreviewRow}>
              <PremiumPiece color={item.preview.p1Color} size={26} />
              <PremiumPiece color={item.preview.p2Color} size={26} />
            </View>
          </View>
        ) : item.previewKind === 'effect' && EFFECT_PREVIEW_CONFIGS[item.id] ? (
          <EffectPreviewCard
            config={EFFECT_PREVIEW_CONFIGS[item.id]}
            width={PREVIEW_WIDTH}
            height={PREVIEW_HEIGHT}
          />
        ) : item.previewKind === 'pet' && item.iconImage ? (
          // Pet card: painted breed PNG over a soft rarity-tinted
          // backdrop so each card reads as "real pet" not text string.
          <View style={[styles.petPreviewBackdrop, { backgroundColor: `${rarityColor}22` }]}>
            <Image
              source={item.iconImage}
              style={styles.cardIconImg}
              resizeMode="contain"
              accessibilityIgnoresInvertColors
            />
          </View>
        ) : item.thumbnail ? (
          <View style={[styles.fallbackBackdrop, { backgroundColor: fallbackColor }]}>
            <Text style={styles.cardEmoji}>{item.thumbnail}</Text>
          </View>
        ) : (
          // Final fallback: flat color swatch with a small accent dot.
          <View style={[styles.fallbackBackdrop, { backgroundColor: fallbackColor }]}>
            <View style={[styles.previewDot, { backgroundColor: item.preview?.p1Color ?? '#e63946' }]} />
          </View>
        )}
      </View>
      <Text style={styles.cardName} numberOfLines={1}>
        {item.name}
      </Text>
      <View style={styles.cardFooter}>
        {item.isEquipped ? (
          <View style={[styles.equippedPill, { backgroundColor: colors.coinGold }]}>
            <Text style={styles.equippedText}>EQUIPPED</Text>
          </View>
        ) : item.isOwned ? (
          <Text style={[styles.equipText, { color: rarityColor }]}>EQUIP</Text>
        ) : (
          // Locked items point at the new acquisition source: BAGS.
          // Tap a locked item → handleItemPress routes to LootBox.
          <Text style={styles.lockedText}>🔒 IN BAGS</Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Backdrop fills the modal overlay (which absolute-fills to the
  // closest positioned ancestor — usually a deep React Navigation
  // screen-stack container with weird bounds). Using absolute positioning
  // on both backdrop and sheet, anchored to bottom, makes the sheet
  // dock to whatever container's bottom IS — and on web the closest
  // positioned ancestor's bottom edge generally aligns with the
  // PhoneFrame.screen bottom because the navigator screen height
  // matches the visible area. The previous flex:1 + justifyContent:
  // 'flex-end' approach inherited the parent's full height even when
  // the parent extended above the viewport (e.g. y=-66, h=689).
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    // Sheet height cap. Bumped 400→620 in the catalog pivot
    // (2026-05-03) — locked items now visible in the panel, so the
    // grid is much longer (up to 16 pets, 12 effects, etc) and the
    // 400px cap forced the player to scroll past the X to see most
    // of the catalog. 620px fits ~9 cards on screen at once across
    // 3 columns, still leaves the top edge inside the PhoneFrame's
    // visible screen on every Customize-tab context (header + chip +
    // hero + first row of cards remain visible behind the sheet's
    // dimmed scrim).
    height: 620,
    overflow: 'hidden',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1.5,
    borderColor: 'rgba(255,180,90,0.45)',
  },
  sheetGradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  titleWrap: {
    flex: 1,
  },
  title: {
    fontFamily: fonts.heading,
    fontWeight: weight.black,
    fontSize: 20,
    color: '#ffffff',
    letterSpacing: 1.5,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  closeBtnText: {
    fontSize: 22,
    color: '#ffffff',
    fontWeight: weight.bold,
    marginTop: -3,
  },
  gridWrap: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 24,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  card: {
    width: '31%',
    backgroundColor: 'rgba(10,14,32,0.65)',
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 8,
    alignItems: 'center',
  },
  cardPreview: {
    width: '100%',
    height: 64,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    overflow: 'hidden',
  },
  // Pieces: dark gradient backdrop with two glossy plastic discs side
  // by side. Mirrors what the old Shop's piece cards showed.
  piecePreviewBackdrop: {
    width: '100%',
    height: 64,
    borderRadius: 6,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  piecePreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  // Pet preview: rarity-tinted backdrop holds the painted breed PNG.
  petPreviewBackdrop: {
    width: '100%',
    height: 64,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  // Fallback: flat color swatch when no painted preview applies.
  fallbackBackdrop: {
    width: '100%',
    height: 64,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardEmoji: {
    fontSize: 28,
  },
  cardIconImg: {
    width: '100%',
    height: '100%',
  },
  previewDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  cardName: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 11,
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 4,
  },
  cardFooter: {
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  equippedPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  equippedText: {
    fontFamily: fonts.body,
    fontWeight: weight.black,
    fontSize: 9,
    color: '#0a0e27',
    letterSpacing: 0.8,
  },
  equipText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 10,
    letterSpacing: 0.8,
  },
  lockedText: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 10,
    color: colors.textMuted,
  },
  footerShopLink: {
    alignSelf: 'center',
    marginTop: 18,
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,180,90,0.4)',
    backgroundColor: 'rgba(255,180,90,0.06)',
  },
  footerShopText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 12,
    color: 'rgba(255,200,120,0.9)',
    letterSpacing: 0.5,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingVertical: 12,
  },
  // Frame mockup: stylized rounded square with a question mark inside.
  // Reads as "placeholder / coming soon" with zero asset dependency.
  // Warm-amber dashed outline so it doesn't compete with real items.
  emptyFrameMock: {
    width: 96,
    height: 96,
    borderRadius: 18,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,180,90,0.55)',
    backgroundColor: 'rgba(255,140,0,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyFrameMockInner: {
    width: 70,
    height: 70,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255,180,90,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyFrameMockGlyph: {
    fontFamily: fonts.heading,
    fontWeight: weight.black,
    fontSize: 36,
    color: 'rgba(255,180,90,0.7)',
    lineHeight: 40,
  },
  // Kicker — small caps label above the title for "COMING SOON" /
  // "NEW IN v1.1" framing.
  emptyKicker: {
    fontFamily: fonts.body,
    fontWeight: weight.black,
    fontSize: 10,
    letterSpacing: 1.6,
    color: 'rgba(255,180,90,0.85)',
    marginBottom: 4,
  },
  emptyTitle: {
    fontFamily: fonts.heading,
    fontWeight: weight.black,
    fontSize: 20,
    color: '#ffffff',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  emptyBody: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginBottom: 18,
    lineHeight: 17,
  },
  emptyShopBtn: {
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255,140,0,0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,140,0,0.45)',
  },
  emptyShopBtnText: {
    fontFamily: fonts.body,
    fontWeight: weight.black,
    fontSize: 13,
    color: colors.orange,
    letterSpacing: 1,
  },
});
