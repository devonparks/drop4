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
  Modal,
  Pressable,
  ScrollView,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useShopStore } from '../../stores/shopStore';
import { usePetStore } from '../../stores/petStore';
import {
  BOARD_THEMES,
  PIECE_THEMES,
  DROP_EFFECTS,
  WIN_ANIMATIONS,
  type ShopItem,
} from '../../data/shopCatalog';
import { PETS as PETS_3D } from '../../data/petRegistry';
import { colors } from '../../theme/colors';
import { fonts, weight } from '../../theme/typography';
import { haptics } from '../../services/haptics';
import { playSound } from '../../services/audio';

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
        isOwned: ownedWinAnimations.includes(w.id),
        isEquipped: equippedWinAnimation === w.id,
      }));
    }
    if (category === 'pets') {
      return Object.values(PETS_3D).map((p: { id: string; name: string }) => ({
        id: p.id,
        name: p.name,
        thumbnail: '🐾',
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
      // Not owned — bounce to Shop with a haptic. Future: per-shop-tab
      // deep link so we land on the right sub-tab.
      haptics.error?.();
      onClose();
      navigation.navigate('MainTabs', { screen: 'Shop' } as never);
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
    <Modal
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
                <Text style={styles.emptyTitle}>Coming soon</Text>
                <Text style={styles.emptyBody}>
                  {category === 'frames'
                    ? 'Profile frames are unlocked in season passes and tournaments. Check the shop for current rotation.'
                    : 'No items in this category yet.'}
                </Text>
                <Pressable
                  style={styles.emptyShopBtn}
                  onPress={() => {
                    onClose();
                    navigation.navigate('MainTabs', { screen: 'Shop' } as never);
                  }}
                >
                  <Text style={styles.emptyShopBtnText}>VISIT SHOP ›</Text>
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
                {/* Footer hint pointing to Shop for unowned items */}
                <Pressable
                  style={styles.footerShopLink}
                  onPress={() => {
                    onClose();
                    navigation.navigate('MainTabs', { screen: 'Shop' } as never);
                  }}
                >
                  <Text style={styles.footerShopText}>
                    Get more in the Shop ›
                  </Text>
                </Pressable>
              </ScrollView>
            )}
          </LinearGradient>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function ItemCard({ item, onPress }: { item: ItemView; onPress: () => void }) {
  const rarityColor = item.rarity ? RARITY_COLORS[item.rarity] ?? '#7f8c8d' : '#7f8c8d';
  const previewColor =
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
      <View style={[styles.cardPreview, { backgroundColor: previewColor }]}>
        {item.thumbnail ? (
          <Text style={styles.cardEmoji}>{item.thumbnail}</Text>
        ) : (
          <View style={[styles.previewDot, { backgroundColor: item.preview?.p1Color ?? '#e63946' }]} />
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
          <Text style={styles.lockedText}>🔒 LOCKED</Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    height: '82%',
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
  },
  cardEmoji: {
    fontSize: 28,
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
  },
  emptyTitle: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 18,
    color: '#ffffff',
    marginBottom: 8,
  },
  emptyBody: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 19,
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
