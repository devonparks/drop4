import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { CharacterAvatar } from '../components/ui/CharacterAvatar';
import { PoseDisplay, PoseId } from '../components/ui/AnimatedCharacter';
import { GlossyButton } from '../components/ui/GlossyButton';
import { useShopStore } from '../stores/shopStore';
import { useGameStore } from '../stores/gameStore';
import { haptics } from '../services/haptics';
import { colors } from '../theme/colors';
import { fonts, weight } from '../theme/typography';
import { CHARACTER_ITEMS, getUnlockDescription } from '../data/characterCatalog';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'CharacterCreator'>;
};

const RARITY_COLORS: Record<string, string> = {
  common: '#8892b0',
  rare: '#3498db',
  epic: '#9b59b6',
  legendary: '#f1c40f',
};

export function CharacterCreatorScreen({ navigation }: Props) {
  const level = useShopStore(s => s.level);
  const bestStreak = useGameStore(s => s.bestStreak);
  const totalGamesPlayed = useGameStore(s => s.totalGamesPlayed);

  // Group items by category
  const categories = ['hair', 'top', 'bottom', 'shoes'] as const;
  const categoryLabels: Record<string, string> = {
    hair: 'Hair Styles',
    top: 'Tops',
    bottom: 'Bottoms',
    shoes: 'Shoes',
  };

  return (
    <ScreenBackground>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>{'<'}</Text>
          </Pressable>
          <Text style={styles.title}>MY CHARACTER</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Character display */}
          <View style={styles.characterSection}>
            <LinearGradient
              colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)', 'transparent']}
              style={styles.characterGlow}
            >
              <CharacterAvatar size="xlarge" variant="player" />
            </LinearGradient>
            <Text style={styles.playerName}>{useShopStore.getState().playerName}</Text>
            <Text style={styles.playerLevel}>Level {level}</Text>
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{totalGamesPlayed}</Text>
              <Text style={styles.statLabel}>Games</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: colors.orange }]}>
                {bestStreak > 0 ? `🔥 ${bestStreak}` : '0'}
              </Text>
              <Text style={styles.statLabel}>Best Streak</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: colors.coinGold }]}>{level}</Text>
              <Text style={styles.statLabel}>Level</Text>
            </View>
          </View>

          {/* Poses */}
          <Text style={styles.sectionTitle}>POSES</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.poseScroll}>
            {(['default', 'arms_crossed', 'hands_on_hips', 'lean', 'flex', 'point', 'peace', 'salute'] as PoseId[]).map(poseId => {
              const poseNames: Record<string, string> = {
                default: 'Default', arms_crossed: 'Arms Crossed', hands_on_hips: 'Power Stance',
                lean: 'Lean', flex: 'Flex', point: 'Point', peace: 'Peace', salute: 'Salute',
              };
              return (
                <Pressable key={poseId} onPress={() => haptics.tap()} style={styles.poseCard}>
                  <PoseDisplay pose={poseId} size={80} />
                  <Text style={styles.poseName}>{poseNames[poseId]}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Unlockable cosmetics */}
          <Text style={styles.sectionTitle}>UNLOCKABLE COSMETICS</Text>
          <Text style={styles.sectionSubtitle}>
            Win games, level up, and complete challenges to unlock new looks
          </Text>

          {categories.map(cat => {
            const items = CHARACTER_ITEMS.filter(i => i.category === cat);
            if (items.length === 0) return null;

            return (
              <View key={cat} style={styles.categorySection}>
                <Text style={styles.categoryLabel}>{categoryLabels[cat]}</Text>
                <View style={styles.itemGrid}>
                  {items.map(item => {
                    const isDefault = item.unlock.type === 'default';
                    const unlockDesc = getUnlockDescription(item.unlock);

                    return (
                      <View key={item.id} style={[styles.itemCard, isDefault && styles.itemUnlocked]}>
                        <View style={[styles.rarityDot, { backgroundColor: RARITY_COLORS[item.rarity] }]} />
                        <Text style={styles.itemIcon}>{item.icon}</Text>
                        <Text style={styles.itemName}>{item.name}</Text>
                        {isDefault ? (
                          <Text style={styles.ownedText}>OWNED</Text>
                        ) : (
                          <Text style={styles.unlockText}>{unlockDesc}</Text>
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>
            );
          })}

          {/* Info about character creator */}
          <View style={styles.infoCard}>
            <Text style={styles.infoIcon}>🎨</Text>
            <Text style={styles.infoTitle}>Full Character Creator</Text>
            <Text style={styles.infoText}>
              Customize your 3D character with hundreds of options in the AMG Studios Character Creator.
              Your character syncs across all AMG games.
            </Text>
          </View>
        </ScrollView>

        <View style={styles.doneWrap}>
          <GlossyButton label="DONE" variant="orange" onPress={() => navigation.goBack()} />
        </View>
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  backText: { fontSize: 18, color: '#fff', fontWeight: '700' },
  title: {
    fontFamily: fonts.heading, fontWeight: weight.bold,
    fontSize: 20, color: '#ffffff', letterSpacing: 2,
  },
  content: { paddingHorizontal: 16, paddingBottom: 80 },
  characterSection: { alignItems: 'center', marginBottom: 16 },
  characterGlow: {
    width: 200, height: 260, borderRadius: 100,
    alignItems: 'center', justifyContent: 'center',
  },
  playerName: {
    fontFamily: fonts.heading, fontWeight: weight.bold,
    fontSize: 22, color: '#ffffff', marginTop: 8,
  },
  playerLevel: {
    fontFamily: fonts.body, fontWeight: weight.medium,
    fontSize: 13, color: colors.textSecondary,
  },
  statsRow: {
    flexDirection: 'row', gap: 8, marginBottom: 20,
  },
  statBox: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12, padding: 12, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  statValue: {
    fontFamily: fonts.heading, fontWeight: weight.bold,
    fontSize: 20, color: '#ffffff',
  },
  statLabel: {
    fontFamily: fonts.body, fontWeight: weight.regular,
    fontSize: 10, color: colors.textSecondary,
    textTransform: 'uppercase', marginTop: 2,
  },
  sectionTitle: {
    fontFamily: fonts.body, fontWeight: weight.bold,
    fontSize: 12, color: colors.textSecondary,
    letterSpacing: 2, marginBottom: 4,
  },
  sectionSubtitle: {
    fontFamily: fonts.body, fontWeight: weight.regular,
    fontSize: 12, color: colors.textMuted, marginBottom: 12,
  },
  categorySection: { marginBottom: 14 },
  categoryLabel: {
    fontFamily: fonts.body, fontWeight: weight.semibold,
    fontSize: 14, color: '#ffffff', marginBottom: 6,
  },
  itemGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  itemCard: {
    width: '31%', backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12, padding: 10, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    opacity: 0.5,
  },
  itemUnlocked: { opacity: 1, borderColor: 'rgba(39,174,61,0.3)', backgroundColor: 'rgba(39,174,61,0.05)' },
  rarityDot: {
    width: 8, height: 8, borderRadius: 4,
    position: 'absolute', top: 6, right: 6,
  },
  itemIcon: { fontSize: 22, marginBottom: 4 },
  itemName: {
    fontFamily: fonts.body, fontWeight: weight.semibold,
    fontSize: 11, color: '#ffffff', textAlign: 'center',
  },
  ownedText: {
    fontFamily: fonts.body, fontWeight: weight.bold,
    fontSize: 8, color: colors.green,
    textTransform: 'uppercase', marginTop: 2,
  },
  unlockText: {
    fontFamily: fonts.body, fontWeight: weight.regular,
    fontSize: 9, color: colors.textSecondary,
    textAlign: 'center', marginTop: 2,
  },
  infoCard: {
    backgroundColor: 'rgba(255,140,0,0.06)', borderRadius: 16,
    padding: 16, alignItems: 'center', marginTop: 8,
    borderWidth: 1, borderColor: 'rgba(255,140,0,0.2)',
  },
  infoIcon: { fontSize: 32, marginBottom: 8 },
  infoTitle: {
    fontFamily: fonts.body, fontWeight: weight.bold,
    fontSize: 16, color: colors.orange, marginBottom: 4,
  },
  infoText: {
    fontFamily: fonts.body, fontWeight: weight.regular,
    fontSize: 12, color: colors.textSecondary,
    textAlign: 'center', lineHeight: 18,
  },
  poseScroll: {
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 16,
  },
  poseCard: {
    width: 90,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  poseName: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 9,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  doneWrap: { paddingHorizontal: 24, paddingBottom: 12 },
});
