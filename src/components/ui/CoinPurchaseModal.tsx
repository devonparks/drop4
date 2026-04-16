import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable, ScrollView } from 'react-native';
import { GlossyButton } from './GlossyButton';
import { haptics } from '../../services/haptics';
import { colors } from '../../theme/colors';
import { fonts, weight } from '../../theme/typography';

interface CoinBundle {
  id: string;
  coins: number;
  bonus: number;
  price: string;
  popular?: boolean;
  bestValue?: boolean;
}

const COIN_BUNDLES: CoinBundle[] = [
  { id: 'small', coins: 500, bonus: 0, price: '$0.99' },
  { id: 'medium', coins: 1200, bonus: 200, price: '$1.99', popular: true },
  { id: 'large', coins: 3000, bonus: 500, price: '$4.99' },
  { id: 'huge', coins: 7500, bonus: 2500, price: '$9.99', bestValue: true },
  { id: 'mega', coins: 20000, bonus: 5000, price: '$19.99' },
];

interface CoinPurchaseModalProps {
  visible: boolean;
  onClose: () => void;
}

export function CoinPurchaseModal({ visible, onClose }: CoinPurchaseModalProps) {
  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={styles.overlay}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close coin purchase"
        accessibilityHint="Dismisses the coin bundle list"
      >
        <View style={styles.card}>
          <Text style={styles.title}>GET COINS</Text>
          <Text style={styles.subtitle}>Power up your game</Text>

          <ScrollView style={styles.bundleList} showsVerticalScrollIndicator={false}>
            {COIN_BUNDLES.map(bundle => (
              <Pressable
                key={bundle.id}
                onPress={() => { haptics.tap(); /* In-app purchase would go here */ }}
                style={[styles.bundleRow, bundle.popular && styles.popularRow, bundle.bestValue && styles.bestRow]}
                accessibilityRole="button"
                accessibilityLabel={`Buy ${bundle.coins.toLocaleString()} coins${bundle.bonus > 0 ? ` plus ${bundle.bonus} bonus` : ''} for ${bundle.price}${bundle.popular ? ', popular' : ''}${bundle.bestValue ? ', best value' : ''}`}
              >
                {bundle.popular && <View style={styles.popularBadge}><Text style={styles.popularText}>POPULAR</Text></View>}
                {bundle.bestValue && <View style={styles.bestBadge}><Text style={styles.bestText}>BEST VALUE</Text></View>}
                <Text style={styles.bundleIcon}>🪙</Text>
                <View style={styles.bundleInfo}>
                  <Text style={styles.bundleCoins}>{bundle.coins.toLocaleString()} Coins</Text>
                  {bundle.bonus > 0 && <Text style={styles.bundleBonus}>+{bundle.bonus} bonus</Text>}
                </View>
                <View style={styles.priceBtn}>
                  <Text style={styles.priceText}>{bundle.price}</Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>

          <GlossyButton label="CLOSE" variant="navy" small onPress={onClose} style={{ marginTop: 10 }} />
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center' },
  card: {
    width: '85%', maxWidth: 340, maxHeight: '80%',
    backgroundColor: colors.surface, borderRadius: 20, padding: 20,
    borderWidth: 1, borderColor: colors.surfaceBorder,
  },
  title: { fontFamily: fonts.heading, fontWeight: weight.bold, fontSize: 22, color: colors.coinGold, textAlign: 'center', letterSpacing: 2 },
  subtitle: { fontFamily: fonts.body, fontWeight: weight.regular, fontSize: 12, color: colors.textSecondary, textAlign: 'center', marginTop: 2, marginBottom: 12 },
  bundleList: { maxHeight: 300 },
  bundleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 12,
    marginBottom: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    position: 'relative',
  },
  popularRow: { borderColor: 'rgba(255,140,0,0.3)', backgroundColor: 'rgba(255,140,0,0.06)' },
  bestRow: { borderColor: 'rgba(39,174,61,0.3)', backgroundColor: 'rgba(39,174,61,0.06)' },
  popularBadge: { position: 'absolute', top: -8, right: 10, backgroundColor: colors.orange, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  popularText: { fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 8, color: '#fff', letterSpacing: 0.5 },
  bestBadge: { position: 'absolute', top: -8, right: 10, backgroundColor: colors.green, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  bestText: { fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 8, color: '#fff', letterSpacing: 0.5 },
  bundleIcon: { fontSize: 28 },
  bundleInfo: { flex: 1 },
  bundleCoins: { fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 15, color: '#ffffff' },
  bundleBonus: { fontFamily: fonts.body, fontWeight: weight.semibold, fontSize: 11, color: colors.green, marginTop: 1 },
  priceBtn: { backgroundColor: colors.orange, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 6 },
  priceText: { fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 13, color: '#ffffff' },
});
