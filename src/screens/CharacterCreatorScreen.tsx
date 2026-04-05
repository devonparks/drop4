import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Dimensions } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { TopBar } from '../components/ui/TopBar';
import { CharacterAvatar } from '../components/ui/CharacterAvatar';
import { PoseDisplay, PoseId } from '../components/ui/AnimatedCharacter';
import { AnimatedCharacter } from '../components/ui/AnimatedCharacter';
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

type TabId = 'species' | 'outfit' | 'hair' | 'shoes' | 'colors';
const TABS: { id: TabId; icon: string; label: string }[] = [
  { id: 'species', icon: '\uD83E\uDDD1', label: 'Species' },
  { id: 'outfit', icon: '\uD83D\uDC55', label: 'Outfit' },
  { id: 'hair', icon: '\uD83D\uDC87', label: 'Hair' },
  { id: 'shoes', icon: '\uD83D\uDC5F', label: 'Shoes' },
  { id: 'colors', icon: '\uD83C\uDFA8', label: 'Colors' },
];

const TAB_TO_CATEGORIES: Record<TabId, string[]> = {
  species: [],
  outfit: ['top', 'bottom'],
  hair: ['hair'],
  shoes: ['shoes'],
  colors: [],
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

export function CharacterCreatorScreen({ navigation }: Props) {
  const coins = useShopStore(s => s.coins);
  const gems = useShopStore(s => s.gems);
  const level = useShopStore(s => s.level);
  const playerName = useShopStore(s => s.playerName);
  const bestStreak = useGameStore(s => s.bestStreak);
  const totalGamesPlayed = useGameStore(s => s.totalGamesPlayed);

  const [activeTab, setActiveTab] = useState<TabId>('outfit');
  const [selectedPose, setSelectedPose] = useState<PoseId>('default');

  // Get items for the active tab
  const activeCategories = TAB_TO_CATEGORIES[activeTab];
  const tabItems = CHARACTER_ITEMS.filter(i => activeCategories.includes(i.category));

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

          {/* ═══ CHARACTER DISPLAY ═══ */}
          <View style={styles.characterDisplayArea}>
            {/* Rotating spotlight glow */}
            <View style={styles.glowRingOuter} />
            <View style={styles.glowRingMiddle} />
            <LinearGradient
              colors={['rgba(100,80,200,0.15)', 'rgba(60,100,255,0.08)', 'transparent']}
              style={styles.spotlightGlow}
            />

            {/* Character */}
            <AnimatedCharacter
              size={300}
              pose={selectedPose}
            />

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

          {/* Equipped badge */}
          <View style={styles.equippedBadge}>
            <Text style={styles.equippedLabel}>EQUIPPED</Text>
            <Text style={styles.equippedName}>Default Outfit</Text>
          </View>

          {/* ═══ SECTION DIVIDER ═══ */}
          <View style={styles.sectionDivider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>CUSTOMIZE</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* ═══ OUTFIT TABS ═══ */}
          <View style={styles.tabBar}>
            {TABS.map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <Pressable
                  key={tab.id}
                  onPress={() => { haptics.tap(); setActiveTab(tab.id); }}
                  style={[styles.tab, isActive && styles.tabActive]}
                >
                  <Text style={styles.tabIcon}>{tab.icon}</Text>
                  <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{tab.label}</Text>
                  {isActive && <View style={styles.tabIndicator} />}
                </Pressable>
              );
            })}
          </View>

          {/* ═══ ITEMS SCROLL ═══ */}
          {tabItems.length > 0 ? (
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

                return (
                  <Pressable
                    key={item.id}
                    onPress={() => { haptics.tap(); }}
                    style={[
                      styles.itemCard,
                      isDefault && styles.itemCardOwned,
                    ]}
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
            <View style={styles.emptyTab}>
              <Text style={styles.emptyTabIcon}>
                {activeTab === 'species' ? '\uD83E\uDDD1' : '\uD83C\uDFA8'}
              </Text>
              <Text style={styles.emptyTabTitle}>
                {activeTab === 'species' ? 'Species' : 'Color Palettes'}
              </Text>
              <Text style={styles.emptyTabSub}>Coming soon in a future update</Text>
            </View>
          )}

          {/* ═══ SECTION DIVIDER ═══ */}
          <View style={styles.sectionDivider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>POSES</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* ═══ POSES SECTION ═══ */}
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

          {/* Bottom spacer */}
          <View style={{ height: 80 }} />
        </ScrollView>

        {/* ═══ SAVE BUTTON (pinned bottom) ═══ */}
        <View style={styles.bottomBar}>
          <GlossyButton
            label="SAVE & EXIT"
            variant="orange"
            onPress={() => navigation.goBack()}
          />
        </View>
      </View>
    </ScreenBackground>
  );
}

// ═══════════════════════════════════
// STYLES
// ═══════════════════════════════════

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    paddingBottom: 20,
  },

  // ─── Character Display ───
  characterDisplayArea: {
    height: 340,
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  glowRingOuter: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    borderWidth: 1,
    borderColor: 'rgba(100,80,200,0.1)',
    top: 10,
  },
  glowRingMiddle: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    borderWidth: 1.5,
    borderColor: 'rgba(80,120,255,0.15)',
    backgroundColor: 'rgba(80,100,255,0.03)',
    top: 50,
  },
  spotlightGlow: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    top: 20,
  },
  displayPlatform: {
    width: 200,
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
    width: 240,
    height: 6,
    borderRadius: 120,
    backgroundColor: 'rgba(100,180,255,0.08)',
    marginTop: 2,
  },

  // ─── Player Info ───
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

  // ─── Equipped Badge ───
  equippedBadge: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  equippedLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 9,
    color: colors.green,
    letterSpacing: 1.5,
  },
  equippedName: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 12,
    color: colors.textSecondary,
  },

  // ─── Section Divider ───
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

  // ─── Tabs ───
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    position: 'relative',
  },
  tabActive: {
    backgroundColor: 'rgba(255,140,0,0.12)',
  },
  tabIcon: {
    fontSize: 18,
    marginBottom: 2,
  },
  tabLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 9,
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  tabLabelActive: {
    color: colors.orange,
    fontWeight: weight.bold,
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 2,
    width: 16,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.orange,
  },

  // ─── Item Cards ───
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

  // ─── Empty Tab Placeholder ───
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

  // ─── Poses ───
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

  // ─── Bottom Bar ───
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
