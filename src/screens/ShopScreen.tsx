import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { useShopStore } from '../stores/shopStore';
import { haptics } from '../services/haptics';
import { BOARD_THEMES, PIECE_THEMES, DROP_EFFECTS, WIN_ANIMATIONS, BOARD_ACCESSORIES, EMOTES, RARITY_COLORS, RARITY_LABELS, ShopItem } from '../data/shopCatalog';
import { useLootBoxStore, LOOT_BOXES } from '../stores/lootBoxStore';
import { colors } from '../theme/colors';
import { fonts, weight } from '../theme/typography';

type ShopTab = 'boards' | 'pieces' | 'effects' | 'wins' | 'accessories' | 'emotes' | 'boxes';

function ShopItemCard({ item, isOwned, isEquipped, onPress, index }: {
  item: ShopItem;
  isOwned: boolean;
  isEquipped: boolean;
  onPress: () => void;
  index: number;
}) {
  const rarityColor = RARITY_COLORS[item.rarity];
  const isDarkMatter = item.rarity === 'darkmatter';

  return (
    <Animated.View entering={FadeInDown.delay(index * 60).springify()}>
      <Pressable
        onPress={onPress}
        style={[
          styles.itemCard,
          isEquipped && { borderColor: colors.green, borderWidth: 2 },
        ]}
      >
        {/* Rarity strip at top */}
        <View style={[styles.rarityStrip, { backgroundColor: rarityColor }]} />

        {/* Preview */}
        <View style={[styles.itemPreview, {
          backgroundColor: item.preview.boardColor || colors.surface,
        }]}>
          {item.preview.p1Color && item.preview.p2Color ? (
            <View style={styles.piecePreviewRow}>
              <View style={[styles.miniPiece, { backgroundColor: item.preview.p1Color }]} />
              <View style={[styles.miniPiece, { backgroundColor: item.preview.p2Color }]} />
            </View>
          ) : (
            <View style={styles.boardPreviewGrid}>
              {[0, 1, 2, 3, 4, 5].map(i => (
                <View key={i} style={styles.miniHole} />
              ))}
            </View>
          )}
        </View>

        {/* Name */}
        <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>

        {/* Rarity label */}
        <Text style={[styles.rarityLabel, { color: rarityColor }]}>
          {RARITY_LABELS[item.rarity]}
        </Text>

        {/* Price / status */}
        {isEquipped ? (
          <View style={styles.equippedBadge}>
            <Text style={styles.equippedText}>EQUIPPED</Text>
          </View>
        ) : isOwned ? (
          <Text style={styles.ownedText}>Tap to Equip</Text>
        ) : isDarkMatter || (item.price === 0 && item.rarity === 'mythic') ? (
          <Text style={[styles.lockedText, { color: rarityColor }]}>Earn Only</Text>
        ) : (
          <View style={styles.priceRow}>
            <Text style={styles.priceEmoji}>🪙</Text>
            <Text style={styles.priceText}>{item.price.toLocaleString()}</Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

export function ShopScreen() {
  const coins = useShopStore(s => s.coins);
  const owned = useShopStore(s => s.owned);
  const equipped = useShopStore(s => s.equipped);
  const purchaseItem = useShopStore(s => s.purchaseItem);
  const equipItem = useShopStore(s => s.equipItem);
  const [activeTab, setActiveTab] = useState<ShopTab>('boards');
  const insets = useSafeAreaInsets();

  // Look up equipped skin names from catalogs
  const equippedBoardName = BOARD_THEMES.find(b => b.id === equipped.board)?.name || 'Classic Blue';
  const equippedPieceName = PIECE_THEMES.find(p => p.id === equipped.pieces)?.name || 'Classic';

  const handleItemPress = (category: 'boards' | 'pieces' | 'dropEffects' | 'winAnimations' | 'boardAccessories', item: ShopItem) => {
    const equipKey = category === 'boards' ? 'board'
      : category === 'pieces' ? 'pieces'
      : category === 'dropEffects' ? 'dropEffect'
      : category === 'boardAccessories' ? 'boardAccessory'
      : 'winAnimation';
    if (equipped[equipKey] === item.id) return; // Already equipped
    if (owned[category].includes(item.id)) {
      equipItem(equipKey, item.id);
      haptics.select();
    } else if (item.rarity !== 'darkmatter' && !(item.price === 0 && item.rarity === 'mythic')) {
      const success = purchaseItem(category, item.id, item.price);
      if (success) {
        haptics.win();
        equipItem(equipKey, item.id);
      } else {
        haptics.error();
      }
    }
  };

  const tabs: { key: ShopTab; label: string; icon: string }[] = [
    { key: 'boards', label: 'Boards', icon: '🎯' },
    { key: 'pieces', label: 'Pieces', icon: '🔴' },
    { key: 'effects', label: 'Effects', icon: '✨' },
    { key: 'wins', label: 'Wins', icon: '🏆' },
    { key: 'accessories', label: 'Frames', icon: '🖼' },
    { key: 'emotes', label: 'Emotes', icon: '😎' },
    { key: 'boxes', label: 'Boxes', icon: '🎁' },
  ];

  const items = activeTab === 'boards' ? BOARD_THEMES :
                activeTab === 'pieces' ? PIECE_THEMES :
                activeTab === 'effects' ? DROP_EFFECTS :
                activeTab === 'wins' ? WIN_ANIMATIONS :
                activeTab === 'accessories' ? BOARD_ACCESSORIES :
                activeTab === 'emotes' ? EMOTES : [];

  const category = activeTab === 'boards' ? 'boards' :
                   activeTab === 'effects' ? 'dropEffects' :
                   activeTab === 'wins' ? 'winAnimations' :
                   activeTab === 'accessories' ? 'boardAccessories' :
                   activeTab === 'emotes' ? 'winAnimations' : 'pieces';

  return (
    <ScreenBackground>
      <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>SHOP</Text>
            <View style={styles.equippedRow}>
              <Text style={styles.equippedLabel}>🎯 {equippedBoardName}</Text>
              <Text style={styles.equippedDot}>•</Text>
              <Text style={styles.equippedLabel}>🔴 {equippedPieceName}</Text>
            </View>
          </View>
          <View style={styles.coinDisplay}>
            <Text style={styles.coinEmoji}>🪙</Text>
            <Text style={styles.coinValue}>{coins.toLocaleString()}</Text>
          </View>
        </View>

        {/* Category tabs */}
        <View style={styles.tabRow}>
          {tabs.map(tab => (
            <Pressable
              key={tab.key}
              onPress={() => { setActiveTab(tab.key); haptics.tap(); }}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            >
              <Text style={styles.tabIcon}>{tab.icon}</Text>
              <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Items grid */}
        <ScrollView
          contentContainerStyle={styles.gridContent}
          showsVerticalScrollIndicator={false}
        >
          {activeTab === 'boxes' ? (
            <View style={styles.boxList}>
              {LOOT_BOXES.map(box => {
                const count = useLootBoxStore.getState().getBoxCount(box.id);
                return (
                  <View key={box.id} style={styles.boxItem}>
                    <Text style={styles.boxIcon}>{box.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.boxName}>{box.name}</Text>
                      <Text style={styles.boxCount}>×{count} owned</Text>
                    </View>
                    {box.cost > 0 && (
                      <Text style={styles.boxPrice}>🪙 {box.cost}</Text>
                    )}
                  </View>
                );
              })}
            </View>
          ) : items.length > 0 ? (
            <View style={styles.grid}>
              {items.map((item, i) => (
                <ShopItemCard
                  key={item.id}
                  item={item}
                  isOwned={owned[category]?.includes(item.id) ?? false}
                  isEquipped={equipped[
                    category === 'boards' ? 'board'
                    : category === 'pieces' ? 'pieces'
                    : category === 'dropEffects' ? 'dropEffect'
                    : category === 'boardAccessories' ? 'boardAccessory'
                    : 'winAnimation'
                  ] === item.id}
                  onPress={() => handleItemPress(category as 'boards' | 'pieces' | 'dropEffects' | 'winAnimations' | 'boardAccessories', item)}
                  index={i}
                />
              ))}
            </View>
          ) : (
            <View style={styles.comingSoon}>
              <Text style={styles.comingSoonIcon}>🚧</Text>
              <Text style={styles.comingSoonText}>Coming Soon</Text>
            </View>
          )}
        </ScrollView>
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  title: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 28,
    color: '#ffffff',
    letterSpacing: 2,
  },
  equippedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  equippedLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.medium,
    fontSize: 11,
    color: colors.textSecondary,
  },
  equippedDot: {
    fontFamily: fonts.body,
    fontSize: 8,
    color: colors.textMuted,
  },
  coinDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,209,102,0.2)',
  },
  coinEmoji: {
    fontSize: 18,
  },
  coinValue: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 16,
    color: colors.coinGold,
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 6,
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tabActive: {
    backgroundColor: 'rgba(255,140,0,0.15)',
    borderColor: 'rgba(255,140,0,0.4)',
  },
  tabIcon: {
    fontSize: 14,
  },
  tabLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 12,
    color: colors.textSecondary,
  },
  tabLabelActive: {
    color: colors.orange,
  },
  gridContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  itemCard: {
    width: 108,
    backgroundColor: colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    paddingBottom: 10,
  },
  rarityStrip: {
    height: 3,
    width: '100%',
  },
  itemPreview: {
    width: '100%',
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  piecePreviewRow: {
    flexDirection: 'row',
    gap: 10,
  },
  miniPiece: {
    width: 30,
    height: 30,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  boardPreviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    width: 60,
    justifyContent: 'center',
  },
  miniHole: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  itemName: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 12,
    color: '#ffffff',
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 6,
  },
  rarityLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.medium,
    fontSize: 9,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    marginTop: 4,
  },
  priceEmoji: {
    fontSize: 12,
  },
  priceText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 13,
    color: colors.coinGold,
  },
  equippedBadge: {
    marginTop: 4,
    alignSelf: 'center',
    backgroundColor: 'rgba(39,174,61,0.2)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  equippedText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 9,
    color: colors.green,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  ownedText: {
    fontFamily: fonts.body,
    fontWeight: weight.medium,
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  lockedText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 10,
    color: RARITY_COLORS.darkmatter, // default; overridden inline for mythic
    textAlign: 'center',
    marginTop: 4,
    textTransform: 'uppercase',
  },
  boxList: { gap: 8 },
  boxItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  boxIcon: { fontSize: 32 },
  boxName: { fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 14, color: '#ffffff' },
  boxCount: { fontFamily: fonts.body, fontWeight: weight.regular, fontSize: 11, color: colors.textSecondary },
  boxPrice: { fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 13, color: colors.coinGold },
  comingSoon: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  comingSoonIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  comingSoonText: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 22,
    color: colors.textSecondary,
  },
});
