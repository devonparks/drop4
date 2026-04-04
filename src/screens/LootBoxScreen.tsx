import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { SlideInDown } from 'react-native-reanimated';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { GlossyButton } from '../components/ui/GlossyButton';
import { useLootBoxStore, LOOT_BOXES, LootBoxItem } from '../stores/lootBoxStore';
import { useShopStore } from '../stores/shopStore';
import { haptics } from '../services/haptics';
import { playSound } from '../services/audio';
import { colors } from '../theme/colors';
import { fonts, weight } from '../theme/typography';

const RARITY_COLORS: Record<string, string> = {
  common: '#8892b0',
  rare: '#3498db',
  epic: '#9b59b6',
  legendary: '#f1c40f',
};

export function LootBoxScreen() {
  const { openBox, getBoxCount } = useLootBoxStore();
  const { addCoins, purchaseItem } = useShopStore();
  const [revealedItem, setRevealedItem] = useState<LootBoxItem | null>(null);
  const [isOpening, setIsOpening] = useState(false);

  const handleOpenBox = (boxId: string) => {
    if (isOpening) return;
    setIsOpening(true);
    haptics.heavy();
    playSound('whoosh');

    // Simulate opening delay
    setTimeout(() => {
      const item = openBox(boxId);
      if (item) {
        setRevealedItem(item);
        haptics.win();
        playSound('win');

        // Grant the item
        if (item.type === 'coins' && item.value) addCoins(item.value);
        if (item.type === 'gems' && item.value) {
          // addGems doesn't exist yet but would add gems
        }
        if (item.type === 'board') purchaseItem('boards', item.id.replace('board_', ''), 0);
        if (item.type === 'pieces') purchaseItem('pieces', item.id.replace('pieces_', ''), 0);
      }
      setIsOpening(false);
    }, 1000);
  };

  // Reveal screen
  if (revealedItem) {
    const rarityColor = RARITY_COLORS[revealedItem.rarity];

    return (
      <ScreenBackground>
        <View style={styles.revealContainer}>
          <Animated.View entering={SlideInDown.springify().damping(10)} style={styles.revealCard}>
            <LinearGradient
              colors={[`${rarityColor}30`, `${rarityColor}10`, 'transparent']}
              style={styles.revealGlow}
            />
            <Text style={styles.revealRarity}>{revealedItem.rarity.toUpperCase()}</Text>
            <Text style={styles.revealIcon}>{revealedItem.icon}</Text>
            <Text style={[styles.revealName, { color: rarityColor }]}>{revealedItem.name}</Text>
            <Text style={styles.revealType}>{revealedItem.type}</Text>
          </Animated.View>

          <GlossyButton
            label="CONTINUE"
            variant="orange"
            onPress={() => setRevealedItem(null)}
            style={{ marginTop: 20 }}
          />
        </View>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground>
      <View style={styles.container}>
        <Text style={styles.title}>LOOT BOXES</Text>
        <Text style={styles.subtitle}>Open boxes to win cosmetics and coins</Text>

        <ScrollView contentContainerStyle={styles.boxList} showsVerticalScrollIndicator={false}>
          {LOOT_BOXES.map(box => {
            const count = getBoxCount(box.id);

            return (
              <View key={box.id} style={styles.boxCard}>
                <LinearGradient
                  colors={
                    box.tier === 'diamond' ? ['rgba(52,152,219,0.15)', 'rgba(52,152,219,0.05)'] :
                    box.tier === 'gold' ? ['rgba(241,196,15,0.15)', 'rgba(241,196,15,0.05)'] :
                    box.tier === 'silver' ? ['rgba(192,192,192,0.1)', 'rgba(192,192,192,0.03)'] :
                    ['rgba(205,127,50,0.1)', 'rgba(205,127,50,0.03)']
                  }
                  style={styles.boxGradient}
                >
                  <Text style={styles.boxIcon}>{box.icon}</Text>
                  <View style={styles.boxInfo}>
                    <Text style={styles.boxName}>{box.name}</Text>
                    <Text style={styles.boxCount}>×{count} owned</Text>
                  </View>
                  {count > 0 ? (
                    <GlossyButton
                      label="OPEN"
                      variant={box.tier === 'diamond' ? 'teal' : box.tier === 'gold' ? 'gold' : 'orange'}
                      small
                      onPress={() => handleOpenBox(box.id)}
                      disabled={isOpening}
                    />
                  ) : (
                    <Text style={styles.emptyText}>Empty</Text>
                  )}
                </LinearGradient>
              </View>
            );
          })}

          {/* Drop rates transparency */}
          <View style={styles.ratesSection}>
            <Text style={styles.ratesTitle}>DROP RATES</Text>
            <View style={styles.ratesGrid}>
              {['Common 60%', 'Rare 25%', 'Epic 10%', 'Legendary 5%'].map((rate, i) => (
                <View key={i} style={styles.rateRow}>
                  <View style={[styles.rateDot, { backgroundColor: Object.values(RARITY_COLORS)[i] }]} />
                  <Text style={styles.rateText}>{rate}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.ratesNote}>Better boxes have higher epic & legendary chances</Text>
          </View>
        </ScrollView>
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 16 },
  title: { fontFamily: fonts.heading, fontWeight: weight.bold, fontSize: 24, color: '#ffffff', letterSpacing: 2, textAlign: 'center' },
  subtitle: { fontFamily: fonts.body, fontWeight: weight.regular, fontSize: 12, color: colors.textSecondary, textAlign: 'center', marginBottom: 16 },
  boxList: { paddingHorizontal: 16, gap: 10, paddingBottom: 100 },
  boxCard: { borderRadius: 16, overflow: 'hidden' },
  boxGradient: {
    flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12,
    borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  boxIcon: { fontSize: 36 },
  boxInfo: { flex: 1 },
  boxName: { fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 16, color: '#ffffff' },
  boxCount: { fontFamily: fonts.body, fontWeight: weight.regular, fontSize: 12, color: colors.textSecondary },
  emptyText: { fontFamily: fonts.body, fontWeight: weight.medium, fontSize: 13, color: colors.textMuted },
  // Rates
  ratesSection: {
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', marginTop: 8,
  },
  ratesTitle: { fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 10, color: colors.textSecondary, letterSpacing: 1, marginBottom: 8 },
  ratesGrid: { gap: 4 },
  rateRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rateDot: { width: 10, height: 10, borderRadius: 5 },
  rateText: { fontFamily: fonts.body, fontWeight: weight.medium, fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  ratesNote: { fontFamily: fonts.body, fontWeight: weight.regular, fontSize: 10, color: colors.textMuted, marginTop: 6 },
  // Reveal
  revealContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  revealCard: {
    width: '80%', alignItems: 'center', backgroundColor: colors.surface,
    borderRadius: 24, padding: 32, borderWidth: 1, borderColor: colors.surfaceBorder,
    position: 'relative', overflow: 'hidden',
  },
  revealGlow: { ...StyleSheet.absoluteFillObject, borderRadius: 24 },
  revealRarity: {
    fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 11,
    letterSpacing: 2, marginBottom: 12,
  },
  revealIcon: { fontSize: 64, marginBottom: 12 },
  revealName: { fontFamily: fonts.heading, fontWeight: weight.bold, fontSize: 22 },
  revealType: { fontFamily: fonts.body, fontWeight: weight.regular, fontSize: 12, color: colors.textSecondary, marginTop: 4, textTransform: 'uppercase' },
});
