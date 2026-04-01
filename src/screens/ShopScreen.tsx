import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { useShopStore } from '../stores/shopStore';
import { haptics } from '../services/haptics';
import { colors } from '../theme/colors';
import { fonts, weight } from '../theme/typography';

const BOARD_THEMES = [
  { id: 'default', name: 'Classic Blue', price: 0, color: colors.boardBlue, owned: true },
  { id: 'wood', name: 'Wooden', price: 500, color: '#8B4513' },
  { id: 'neon', name: 'Neon Glow', price: 1000, color: '#00ff88' },
  { id: 'galaxy', name: 'Galaxy', price: 2000, color: '#6b2fa0' },
  { id: 'gold', name: 'Gold Court', price: 5000, color: '#d4ac0d' },
];

const PIECE_THEMES = [
  { id: 'classic', name: 'Classic', price: 0, p1: colors.pieceRed, p2: colors.pieceYellow, owned: true },
  { id: 'chrome', name: 'Chrome', price: 750, p1: '#c0c0c0', p2: '#808080' },
  { id: 'fire', name: 'Fire & Ice', price: 1500, p1: '#ff4500', p2: '#00bfff' },
  { id: 'holo', name: 'Holographic', price: 3000, p1: '#ff69b4', p2: '#7b68ee' },
  { id: 'darkmatter', name: 'Dark Matter', price: 10000, p1: '#1a1a2e', p2: '#e94560' },
];

export function ShopScreen() {
  const { coins, owned, equipped, purchaseItem, equipItem } = useShopStore();

  const handleBuy = (category: 'boards' | 'pieces', id: string, price: number) => {
    const success = purchaseItem(category, id, price);
    if (success) haptics.win();
    else haptics.error();
  };

  const handleEquip = (category: 'board' | 'pieces', id: string) => {
    equipItem(category, id);
    haptics.select();
  };

  return (
    <ScreenBackground>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>SHOP</Text>
        <Text style={styles.coinBalance}>🪙 {coins.toLocaleString()}</Text>

        {/* Board Themes */}
        <Text style={styles.sectionTitle}>Board Themes</Text>
        <View style={styles.grid}>
          {BOARD_THEMES.map((theme, i) => {
            const isOwned = owned.boards.includes(theme.id);
            const isEquipped = equipped.board === theme.id;
            return (
              <Animated.View key={theme.id} entering={FadeInDown.delay(i * 80).springify()}>
                <Pressable
                  onPress={() => {
                    if (isEquipped) return;
                    if (isOwned) handleEquip('board', theme.id);
                    else handleBuy('boards', theme.id, theme.price);
                  }}
                  style={[styles.shopCard, isEquipped && styles.equippedCard]}
                >
                  <View style={[styles.preview, { backgroundColor: theme.color }]}>
                    <View style={styles.miniBoard}>
                      {[0, 1, 2, 3].map(j => (
                        <View key={j} style={styles.miniHole} />
                      ))}
                    </View>
                  </View>
                  <Text style={styles.itemName}>{theme.name}</Text>
                  {isEquipped ? (
                    <Text style={styles.equippedLabel}>Equipped</Text>
                  ) : isOwned ? (
                    <Text style={styles.ownedLabel}>Tap to Equip</Text>
                  ) : (
                    <Text style={styles.priceLabel}>🪙 {theme.price}</Text>
                  )}
                </Pressable>
              </Animated.View>
            );
          })}
        </View>

        {/* Piece Themes */}
        <Text style={styles.sectionTitle}>Piece Skins</Text>
        <View style={styles.grid}>
          {PIECE_THEMES.map((theme, i) => {
            const isOwned = owned.pieces.includes(theme.id);
            const isEquipped = equipped.pieces === theme.id;
            return (
              <Animated.View key={theme.id} entering={FadeInDown.delay(i * 80 + 300).springify()}>
                <Pressable
                  onPress={() => {
                    if (isEquipped) return;
                    if (isOwned) handleEquip('pieces', theme.id);
                    else handleBuy('pieces', theme.id, theme.price);
                  }}
                  style={[styles.shopCard, isEquipped && styles.equippedCard]}
                >
                  <View style={styles.piecePreview}>
                    <View style={[styles.miniPiece, { backgroundColor: theme.p1 }]} />
                    <View style={[styles.miniPiece, { backgroundColor: theme.p2 }]} />
                  </View>
                  <Text style={styles.itemName}>{theme.name}</Text>
                  {isEquipped ? (
                    <Text style={styles.equippedLabel}>Equipped</Text>
                  ) : isOwned ? (
                    <Text style={styles.ownedLabel}>Tap to Equip</Text>
                  ) : (
                    <Text style={styles.priceLabel}>🪙 {theme.price}</Text>
                  )}
                </Pressable>
              </Animated.View>
            );
          })}
        </View>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  title: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 32,
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 4,
  },
  coinBalance: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 18,
    color: colors.coinGold,
    textAlign: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 20,
    color: '#ffffff',
    marginBottom: 12,
    marginTop: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  shopCard: {
    width: 100,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  equippedCard: {
    borderColor: colors.green,
    backgroundColor: 'rgba(39,174,61,0.1)',
  },
  preview: {
    width: 70,
    height: 50,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  miniBoard: {
    flexDirection: 'row',
    gap: 4,
  },
  miniHole: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  piecePreview: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
    marginTop: 4,
  },
  miniPiece: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  itemName: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 11,
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 4,
  },
  priceLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 12,
    color: colors.coinGold,
  },
  equippedLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 10,
    color: colors.green,
    textTransform: 'uppercase',
  },
  ownedLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.regular,
    fontSize: 10,
    color: colors.textSecondary,
  },
});
