import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { useShopStore } from '../stores/shopStore';
import { useAchievementStore } from '../stores/achievementStore';
import { BOARD_THEMES, PIECE_THEMES, DROP_EFFECTS, WIN_ANIMATIONS, EMOTES, RARITY_COLORS, RARITY_LABELS } from '../data/shopCatalog';
import { PETS, PET_RARITY_COLORS } from '../data/pets';
import { colors } from '../theme/colors';
import { fonts, weight } from '../theme/typography';
import { haptics } from '../services/haptics';

// ═══════════════════════════════════════════════════════════
// COLLECTION SCREEN — trophy case / completion tracker
// ═══════════════════════════════════════════════════════════

interface CategoryData {
  key: string;
  label: string;
  icon: string;
  items: { id: string; name: string; rarity: string; owned: boolean }[];
}

export function CollectionScreen() {
  const navigation = useNavigation<any>();
  const owned = useShopStore(s => s.owned);
  const ownedPets = useShopStore(s => s.ownedPets);
  const achievements = useAchievementStore(s => s.achievements);

  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const categories: CategoryData[] = useMemo(() => [
    {
      key: 'boards',
      label: 'Boards',
      icon: '🎨',
      items: BOARD_THEMES.map(b => ({
        id: b.id,
        name: b.name,
        rarity: b.rarity,
        owned: owned.boards.includes(b.id),
      })),
    },
    {
      key: 'pieces',
      label: 'Pieces',
      icon: '🔴',
      items: PIECE_THEMES.map(p => ({
        id: p.id,
        name: p.name,
        rarity: p.rarity,
        owned: owned.pieces.includes(p.id),
      })),
    },
    {
      key: 'dropEffects',
      label: 'Drop Effects',
      icon: '✨',
      items: DROP_EFFECTS.map(d => ({
        id: d.id,
        name: d.name,
        rarity: d.rarity,
        owned: owned.dropEffects.includes(d.id),
      })),
    },
    {
      key: 'winAnimations',
      label: 'Win Animations',
      icon: '🎆',
      items: WIN_ANIMATIONS.map(w => ({
        id: w.id,
        name: w.name,
        rarity: w.rarity,
        owned: owned.winAnimations.includes(w.id),
      })),
    },
    {
      key: 'emotes',
      label: 'Emotes',
      icon: '😎',
      items: EMOTES.map(e => ({
        id: e.id,
        name: e.name,
        rarity: e.rarity,
        owned: true, // emotes are available to all, tracked differently
      })),
    },
    {
      key: 'pets',
      label: 'Pets',
      icon: '🐕',
      items: PETS.map(p => ({
        id: p.id,
        name: p.name,
        rarity: p.rarity,
        owned: ownedPets.includes(p.id),
      })),
    },
    {
      key: 'achievements',
      label: 'Achievements',
      icon: '🏆',
      items: achievements.map(a => ({
        id: a.id,
        name: a.name,
        rarity: 'legendary', // all achievements are gold-themed
        owned: a.unlocked,
      })),
    },
  ], [owned, ownedPets, achievements]);

  // Totals
  const totalOwned = categories.reduce((sum, cat) => sum + cat.items.filter(i => i.owned).length, 0);
  const totalAvailable = categories.reduce((sum, cat) => sum + cat.items.length, 0);
  const overallPct = totalAvailable > 0 ? Math.round((totalOwned / totalAvailable) * 100) : 0;

  // Rarity distribution — count owned vs total per rarity tier across all categories
  const rarityDistribution = useMemo(() => {
    const allItems = categories.flatMap(cat => cat.items);
    const rarities = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic', 'darkmatter'];
    return rarities
      .map(rarity => {
        const total = allItems.filter(i => i.rarity === rarity).length;
        const ownedCount = allItems.filter(i => i.rarity === rarity && i.owned).length;
        return { rarity, owned: ownedCount, total };
      })
      .filter(r => r.total > 0); // only show tiers that have items
  }, [categories]);

  const toggleSection = (key: string) => {
    haptics.tap();
    setExpandedSection(prev => (prev === key ? null : key));
  };

  return (
    <ScreenBackground>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Back button */}
        <Pressable style={styles.backButton} onPress={() => { haptics.tap(); navigation.goBack(); }}>
          <Text style={styles.backButtonText}>{'<'}</Text>
        </Pressable>

        {/* Header */}
        <Text style={styles.screenTitle}>MY COLLECTION</Text>
        <Text style={styles.totalCount}>{totalOwned} / {totalAvailable} items</Text>

        {/* Overall progress bar */}
        <View style={styles.progressOuter}>
          <LinearGradient
            colors={[colors.orange, colors.coinGold]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.progressFill, { width: `${Math.max(overallPct, 3)}%` }]}
          />
        </View>
        <Text style={styles.progressPct}>{overallPct}% Complete</Text>

        {/* Rarity Distribution */}
        <View style={styles.rarityCard}>
          <Text style={styles.raritySectionTitle}>RARITY BREAKDOWN</Text>
          {rarityDistribution.map(r => {
            const rarityColor = RARITY_COLORS[r.rarity] || '#8892b0';
            const label = RARITY_LABELS[r.rarity] || r.rarity;
            const pct = r.total > 0 ? Math.round((r.owned / r.total) * 100) : 0;
            return (
              <View key={r.rarity} style={styles.rarityRow}>
                <View style={[styles.rarityDot, { backgroundColor: rarityColor }]} />
                <Text style={[styles.rarityLabel, { color: rarityColor }]}>{label}</Text>
                <View style={styles.rarityBarOuter}>
                  <View
                    style={[
                      styles.rarityBarFill,
                      { width: `${Math.max(pct, 4)}%`, backgroundColor: rarityColor },
                    ]}
                  />
                </View>
                <Text style={[styles.rarityCount, { color: rarityColor }]}>{r.owned}/{r.total}</Text>
              </View>
            );
          })}
        </View>

        {/* Category sections */}
        {categories.map(cat => {
          const catOwned = cat.items.filter(i => i.owned).length;
          const catTotal = cat.items.length;
          const catPct = catTotal > 0 ? Math.round((catOwned / catTotal) * 100) : 0;
          const isExpanded = expandedSection === cat.key;

          return (
            <View key={cat.key} style={styles.categoryCard}>
              {/* Category header — tap to expand */}
              <Pressable style={styles.categoryHeader} onPress={() => toggleSection(cat.key)}>
                <Text style={styles.categoryIcon}>{cat.icon}</Text>
                <View style={styles.categoryInfo}>
                  <Text style={styles.categoryLabel}>{cat.label}</Text>
                  <Text style={styles.categoryCount}>{catOwned}/{catTotal} owned</Text>
                </View>
                {/* Mini progress bar */}
                <View style={styles.miniBarOuter}>
                  <View
                    style={[
                      styles.miniBarFill,
                      {
                        width: `${Math.max(catPct, 4)}%`,
                        backgroundColor: catPct >= 100 ? colors.coinGold : colors.orange,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.chevron}>{isExpanded ? '▲' : '▼'}</Text>
              </Pressable>

              {/* Expanded items — horizontal scroll */}
              {isExpanded && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.itemsRow}
                >
                  {cat.items.map(item => {
                    const rarityColor = cat.key === 'pets'
                      ? (PET_RARITY_COLORS[item.rarity] || '#8892b0')
                      : (RARITY_COLORS[item.rarity] || '#8892b0');

                    return (
                      <View
                        key={item.id}
                        style={[
                          styles.itemTile,
                          {
                            borderColor: item.owned ? rarityColor : 'rgba(255,255,255,0.06)',
                            opacity: item.owned ? 1 : 0.5,
                          },
                        ]}
                      >
                        {item.owned ? (
                          <>
                            <View style={[styles.itemDot, { backgroundColor: rarityColor }]} />
                            <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
                            <Text style={[styles.itemRarity, { color: rarityColor }]}>
                              {item.rarity.charAt(0).toUpperCase() + item.rarity.slice(1)}
                            </Text>
                          </>
                        ) : (
                          <>
                            <Text style={styles.lockedIcon}>?</Text>
                            <Text style={styles.lockedLabel}>Locked</Text>
                          </>
                        )}
                      </View>
                    );
                  })}
                </ScrollView>
              )}
            </View>
          );
        })}

        {/* Motivational footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {overallPct >= 100
              ? 'You collected everything! True completionist.'
              : overallPct >= 75
              ? 'Almost there! Keep grinding.'
              : overallPct >= 50
              ? 'Halfway to full collection!'
              : 'Play games and visit the shop to grow your collection!'}
          </Text>
        </View>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: 16,
    paddingBottom: 100,
  },
  backButton: {
    position: 'absolute',
    top: 4,
    left: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600' as const,
  },
  screenTitle: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 28,
    color: '#ffffff',
    textAlign: 'center',
    letterSpacing: 2,
    marginTop: 8,
  },
  totalCount: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 12,
  },
  progressOuter: {
    marginHorizontal: 24,
    height: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 7,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 7,
  },
  progressPct: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 12,
    color: colors.coinGold,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 20,
  },
  categoryCard: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
  },
  categoryIcon: {
    fontSize: 22,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 15,
    color: '#ffffff',
  },
  categoryCount: {
    fontFamily: fonts.body,
    fontWeight: weight.regular,
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  miniBarOuter: {
    width: 60,
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  miniBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  chevron: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  itemsRow: {
    paddingHorizontal: 12,
    paddingBottom: 14,
    gap: 8,
  },
  itemTile: {
    width: 90,
    height: 90,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
  },
  itemDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginBottom: 6,
  },
  itemName: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 11,
    color: '#ffffff',
    textAlign: 'center',
    lineHeight: 14,
  },
  itemRarity: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 9,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  lockedIcon: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 28,
    color: 'rgba(255,255,255,0.15)',
    marginBottom: 4,
  },
  lockedLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.medium,
    fontSize: 10,
    color: 'rgba(255,255,255,0.2)',
  },
  // Rarity Distribution
  rarityCard: {
    marginHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  raritySectionTitle: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 11,
    color: colors.textSecondary,
    letterSpacing: 2,
    marginBottom: 10,
  },
  rarityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  rarityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  rarityLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 12,
    width: 80,
  },
  rarityBarOuter: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  rarityBarFill: {
    height: '100%',
    borderRadius: 4,
    opacity: 0.8,
  },
  rarityCount: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 12,
    width: 40,
    textAlign: 'right',
  },

  footer: {
    marginHorizontal: 24,
    marginTop: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  footerText: {
    fontFamily: fonts.body,
    fontWeight: weight.medium,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
