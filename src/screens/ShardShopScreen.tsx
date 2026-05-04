/**
 * ShardShopScreen — spend dupe-earned shards to unlock specific items.
 *
 * Pivot 2026-05-03 introduced shards as the deterministic unlock path
 * alongside random loot boxes. Every dupe drop awards shards in the
 * matching rarity tier. Shards spend here to unlock any item the
 * player wants directly — no more praying to the RNG gods.
 *
 * Polish pass 2026-05-03 round 2:
 *   - "How shards work" educational panel surfaces only when the
 *     player has zero shards — first-time onboarding
 *   - Per-row category icon swatch (small board / pieces / orb / paw
 *     glyph) so rows have visual identity, not just text
 *   - "Spend earned from dupes" subtitle moved into the empty-state
 *     so the screen stops shouting "this is empty" at new players
 *   - Tab cells now scale up when active for tactile clarity
 */
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { TopBar } from '../components/ui/TopBar';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { PressScale, StaggeredEntry } from '../components/animations';
import { useShopStore } from '../stores/shopStore';
import {
  useLootBoxStore,
  SHARD_UNLOCK_COST,
  getAllLootableItems,
  isLootItemOwned,
  type LootBoxItem,
  type LootBoxRarity,
} from '../stores/lootBoxStore';
import { haptics } from '../services/haptics';
import { playSound } from '../services/audio';
import { fonts, weight } from '../theme/typography';

const RARITY_PALETTE: Record<LootBoxRarity, { color: string; label: string }> = {
  common:    { color: '#8892b0', label: 'COMMON' },
  rare:      { color: '#3498db', label: 'RARE' },
  epic:      { color: '#9b59b6', label: 'EPIC' },
  legendary: { color: '#f1c40f', label: 'LEGENDARY' },
};

const RARITY_TABS: LootBoxRarity[] = ['common', 'rare', 'epic', 'legendary'];

const CATEGORY_LABELS: Record<LootBoxItem['category'], string> = {
  boards: 'Board',
  pieces: 'Pieces',
  effects: 'Drop Effect',
  wins: 'Win Animation',
  frames: 'Frame',
  outfits: 'Outfit Pack',
  pets: 'Pet',
  emotes: 'Emote',
  currency: 'Currency',
};

// Per-category accent for the row swatch — same color language as
// CategoryBrowser so the player builds one mental map across screens.
const CATEGORY_COLOR: Record<LootBoxItem['category'], string> = {
  boards: '#3a78d4',
  pieces: '#e63946',
  effects: '#f1c40f',
  wins: '#9b59b6',
  frames: '#1abc9c',
  outfits: '#ffb347',
  pets: '#3eb489',
  emotes: '#c997e7',
  currency: '#ffd700',
};

// Single-glyph icon per category. Matches the visual hint in the
// Customize loadout cells and the lock chip in CategoryBrowser.
const CATEGORY_GLYPH: Record<LootBoxItem['category'], string> = {
  boards:  '■', // ■
  pieces:  '●', // ●
  effects: '✨', // ✨
  wins:    '\u{1F3C6}', // 🏆
  frames:  '□', // □
  outfits: '\u{1F455}', // 👕
  pets:    '\u{1F43E}', // 🐾
  emotes:  '\u{1F483}', // 💃
  currency: '\u{1FA99}', // 🪙
};

export function ShardShopScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const coins = useShopStore((s) => s.coins);
  const gems = useShopStore((s) => s.gems);
  const level = useShopStore((s) => s.level);
  const shards = useLootBoxStore((s) => s.shards);
  const spendShardsForItem = useLootBoxStore((s) => s.spendShardsForItem);

  const [activeRarity, setActiveRarity] = useState<LootBoxRarity>('common');
  const [confirmDialog, setConfirmDialog] = useState<{
    item: LootBoxItem;
    cost: number;
  } | null>(null);

  const items = useMemo(() => {
    const all = getAllLootableItems();
    const filtered = all.filter(
      (it) => it.rarity === activeRarity && !isLootItemOwned(it),
    );
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRarity, shards]);

  const totalShards = shards.common + shards.rare + shards.epic + shards.legendary;
  const hasAnyShards = totalShards > 0;

  const handleUnlock = (item: LootBoxItem) => {
    const cost = SHARD_UNLOCK_COST[item.rarity];
    if (shards[item.rarity] < cost) {
      haptics.error();
      return;
    }
    setConfirmDialog({ item, cost });
  };

  return (
    <ScreenBackground scene="profile">
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <TopBar
          coins={coins}
          gems={gems}
          level={level}
          showBack
          onBackPress={() => navigation.goBack()}
        />

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Header — title + 1-liner */}
          <View style={styles.headerRow}>
            <Text style={styles.title} accessibilityRole="header">SHARD SHOP</Text>
            <Text style={styles.subtitle}>
              {hasAnyShards
                ? 'Spend shards to unlock anything you want.'
                : 'Earn shards from duplicates, then spend them here.'}
            </Text>
          </View>

          {/* Educational hero — only when player has 0 shards. Teaches
              the core loop in 3 beats so first-timers aren't staring at
              an unlock list with all dimmed buttons. */}
          {!hasAnyShards && (
            <StaggeredEntry index={0} delay={30}>
              <View style={styles.eduCard}>
                <LinearGradient
                  pointerEvents="none"
                  colors={['rgba(155,89,182,0.15)', 'rgba(155,89,182,0.04)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <Text style={styles.eduTitle}>HOW SHARDS WORK</Text>
                <View style={styles.eduStep}>
                  <View style={styles.eduStepNum}><Text style={styles.eduStepNumText}>1</Text></View>
                  <Text style={styles.eduStepText}>
                    Open boxes — sometimes you'll get an item you already own.
                  </Text>
                </View>
                <View style={styles.eduStep}>
                  <View style={styles.eduStepNum}><Text style={styles.eduStepNumText}>2</Text></View>
                  <Text style={styles.eduStepText}>
                    Duplicates auto-convert into shards in the matching rarity tier.
                  </Text>
                </View>
                <View style={styles.eduStep}>
                  <View style={styles.eduStepNum}><Text style={styles.eduStepNumText}>3</Text></View>
                  <Text style={styles.eduStepText}>
                    Come back here and spend shards to directly unlock anything.
                  </Text>
                </View>
                <PressScale
                  onPress={() => {
                    haptics.tap();
                    playSound('click');
                    navigation.navigate('LootBox' as never);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Open boxes to start earning shards"
                >
                  <LinearGradient
                    colors={['#9b59b6', '#7d3c98']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.eduCta}
                  >
                    <Text style={styles.eduCtaText}>OPEN BOXES TO START</Text>
                  </LinearGradient>
                </PressScale>
              </View>
            </StaggeredEntry>
          )}

          {/* Shard balance row — 4 chips, one per rarity. Doubles as
              the rarity tab switcher. Active chip scales up for
              emphasis. */}
          <View style={styles.balanceRow}>
            {RARITY_TABS.map((r) => {
              const palette = RARITY_PALETTE[r];
              const have = shards[r];
              const active = activeRarity === r;
              return (
                <PressScale
                  key={r}
                  onPress={() => { haptics.tap(); setActiveRarity(r); }}
                  containerStyle={{ flex: 1 }}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`${palette.label} shards: ${have}`}
                >
                  <View
                    style={[
                      styles.balanceChip,
                      { borderColor: active ? palette.color : `${palette.color}55` },
                      active && { backgroundColor: `${palette.color}22` },
                      active && {
                        shadowColor: palette.color,
                        shadowOpacity: 0.5,
                        shadowRadius: 8,
                        shadowOffset: { width: 0, height: 0 },
                        elevation: 4,
                      },
                    ]}
                  >
                    <Text style={[styles.balanceValue, { color: palette.color, fontSize: active ? 22 : 18 }]}>
                      {have}
                    </Text>
                    <Text style={[styles.balanceLabel, { color: active ? '#ffffff' : 'rgba(255,255,255,0.55)' }]}>
                      {palette.label}
                    </Text>
                    {active && (
                      <View style={[styles.balanceUnderline, { backgroundColor: palette.color }]} />
                    )}
                  </View>
                </PressScale>
              );
            })}
          </View>

          {/* Active rarity unlock cost banner — clearly tells the player
              "every item in this tab costs N shards." */}
          <View style={[styles.costBanner, {
            borderColor: `${RARITY_PALETTE[activeRarity].color}55`,
            backgroundColor: `${RARITY_PALETTE[activeRarity].color}10`,
          }]}>
            <Text style={[styles.costBannerLabel, { color: RARITY_PALETTE[activeRarity].color }]}>
              {`${RARITY_PALETTE[activeRarity].label}  ·  ${SHARD_UNLOCK_COST[activeRarity]} SHARDS EACH`}
            </Text>
            <Text style={[styles.costBannerBalance, { color: RARITY_PALETTE[activeRarity].color }]}>
              {`Have ${shards[activeRarity]}`}
            </Text>
          </View>

          {/* Item list */}
          {items.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>
                {hasAnyShards
                  ? 'Nothing left to unlock at this rarity.'
                  : 'Once you collect at this rarity, items show up here.'}
              </Text>
            </View>
          ) : (
            <View style={styles.list}>
              {items.map((item, index) => {
                const palette = RARITY_PALETTE[item.rarity];
                const cost = SHARD_UNLOCK_COST[item.rarity];
                const canAfford = shards[item.rarity] >= cost;
                const catColor = CATEGORY_COLOR[item.category];
                return (
                  <StaggeredEntry key={item.id} index={index} delay={15}>
                    <View style={[styles.itemRow, { borderColor: `${palette.color}44` }]}>
                      {/* Category icon swatch — matches the cell visual
                          language in CategoryBrowser. */}
                      <View style={[styles.itemSwatch, { backgroundColor: `${catColor}22`, borderColor: `${catColor}88` }]}>
                        <Text style={[styles.itemGlyph, { color: catColor }]}>
                          {CATEGORY_GLYPH[item.category]}
                        </Text>
                      </View>

                      <View style={styles.itemBody}>
                        <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                        <View style={styles.itemMetaRow}>
                          <View style={[styles.itemCategoryChip, { borderColor: `${catColor}88` }]}>
                            <Text style={[styles.itemCategoryChipText, { color: catColor }]}>
                              {CATEGORY_LABELS[item.category].toUpperCase()}
                            </Text>
                          </View>
                          <Text style={[styles.itemRarityText, { color: palette.color }]}>
                            {palette.label}
                          </Text>
                        </View>
                      </View>

                      <PressScale
                        onPress={() => handleUnlock(item)}
                        disabled={!canAfford}
                        containerStyle={!canAfford ? { opacity: 0.45 } : undefined}
                        accessibilityRole="button"
                        accessibilityLabel={canAfford
                          ? `Unlock ${item.name} for ${cost} ${palette.label} shards`
                          : `Need ${cost} ${palette.label} shards`}
                        accessibilityState={{ disabled: !canAfford }}
                      >
                        <View style={canAfford ? styles.unlockBtnShell : styles.unlockBtnLockedShell}>
                          <LinearGradient
                            colors={canAfford
                              ? [palette.color, `${palette.color}99`]
                              : ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.02)']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.unlockBtn}
                          >
                            <Text style={[
                              styles.unlockBtnGlyph,
                              { color: canAfford ? '#0a0e27' : 'rgba(255,255,255,0.45)' },
                            ]}>
                              {'✧'}
                            </Text>
                            <Text style={[
                              styles.unlockBtnText,
                              { color: canAfford ? '#0a0e27' : 'rgba(255,255,255,0.55)' },
                            ]}>
                              {canAfford ? `${cost}` : `NEED ${cost}`}
                            </Text>
                          </LinearGradient>
                        </View>
                      </PressScale>
                    </View>
                  </StaggeredEntry>
                );
              })}
            </View>
          )}
        </ScrollView>
      </View>

      <ConfirmDialog
        visible={confirmDialog !== null}
        title={`Unlock ${confirmDialog?.item.name ?? ''}?`}
        message={
          confirmDialog
            ? `Spend ${confirmDialog.cost} ${RARITY_PALETTE[confirmDialog.item.rarity].label} ` +
              `shards (you have ${shards[confirmDialog.item.rarity]}). This action ` +
              `can't be undone.`
            : ''
        }
        confirmLabel="UNLOCK"
        cancelLabel="Cancel"
        onConfirm={() => {
          if (!confirmDialog) return;
          const ok = spendShardsForItem(confirmDialog.item.id);
          setConfirmDialog(null);
          if (ok) { haptics.win(); playSound('coin'); }
          else { haptics.error(); }
        }}
        onCancel={() => setConfirmDialog(null)}
      />
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: {
    paddingHorizontal: 12,
    paddingBottom: 24,
  },

  headerRow: {
    paddingHorizontal: 4,
    paddingTop: 4,
    paddingBottom: 8,
  },
  title: {
    fontFamily: fonts.heading,
    fontWeight: weight.black,
    fontSize: 22,
    color: '#ffffff',
    letterSpacing: 2,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 11,
    color: 'rgba(155,89,182,0.85)',
    letterSpacing: 0.4,
    marginTop: 3,
  },

  // ── Educational onboarding card ────────────────────────────────
  eduCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(155,89,182,0.45)',
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginVertical: 8,
    overflow: 'hidden',
  },
  eduTitle: {
    fontFamily: fonts.heading,
    fontWeight: weight.black,
    fontSize: 11,
    color: '#c997e7',
    letterSpacing: 1.6,
    marginBottom: 10,
  },
  eduStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 8,
  },
  eduStepNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: 'rgba(155,89,182,0.7)',
    backgroundColor: 'rgba(155,89,182,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eduStepNumText: {
    fontFamily: fonts.heading,
    fontWeight: weight.black,
    fontSize: 11,
    color: '#c997e7',
    lineHeight: 12,
  },
  eduStepText: {
    flex: 1,
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 12,
    color: 'rgba(255,255,255,0.78)',
    lineHeight: 16,
    paddingTop: 2,
  },
  eduCta: {
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#9b59b6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  eduCtaText: {
    fontFamily: fonts.heading,
    fontWeight: weight.black,
    fontSize: 12,
    color: '#ffffff',
    letterSpacing: 1.4,
  },

  // ── Balance / tab row ──────────────────────────────────────────
  balanceRow: {
    flexDirection: 'row',
    paddingHorizontal: 0,
    gap: 6,
    marginTop: 8,
    marginBottom: 8,
  },
  balanceChip: {
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    backgroundColor: 'rgba(10,14,32,0.55)',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  balanceValue: {
    fontFamily: fonts.heading,
    fontWeight: weight.black,
  },
  balanceLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 8,
    letterSpacing: 1.0,
    marginTop: 2,
  },
  balanceUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 12,
    right: 12,
    height: 2,
    borderRadius: 2,
  },

  // ── Cost banner ────────────────────────────────────────────────
  costBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1.5,
    marginBottom: 10,
  },
  costBannerLabel: {
    fontFamily: fonts.heading,
    fontWeight: weight.black,
    fontSize: 11,
    letterSpacing: 1.0,
  },
  costBannerBalance: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 11,
    letterSpacing: 0.4,
  },

  // ── Item list ──────────────────────────────────────────────────
  list: {
    gap: 6,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(10,14,32,0.65)',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 9,
    gap: 10,
  },
  itemSwatch: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemGlyph: {
    fontSize: 18,
  },
  itemBody: {
    flex: 1,
    minWidth: 0,
  },
  itemName: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 13,
    color: '#ffffff',
    letterSpacing: 0.4,
  },
  itemMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  itemCategoryChip: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    borderWidth: 1,
  },
  itemCategoryChipText: {
    fontFamily: fonts.body,
    fontWeight: weight.black,
    fontSize: 8,
    letterSpacing: 0.8,
  },
  itemRarityText: {
    fontFamily: fonts.body,
    fontWeight: weight.black,
    fontSize: 8,
    letterSpacing: 0.8,
  },

  // ── Unlock button ──────────────────────────────────────────────
  unlockBtnShell: {
    borderRadius: 10,
    overflow: 'hidden',
    shadowOpacity: 0.5,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  unlockBtnLockedShell: {
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  unlockBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: 76,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  unlockBtnGlyph: {
    fontSize: 13,
  },
  unlockBtnText: {
    fontFamily: fonts.heading,
    fontWeight: weight.black,
    fontSize: 12,
    letterSpacing: 0.6,
  },

  // ── Empty state ────────────────────────────────────────────────
  emptyWrap: {
    paddingTop: 40,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: fonts.body,
    fontWeight: weight.regular,
    fontSize: 12,
    textAlign: 'center',
    color: 'rgba(255,255,255,0.5)',
    lineHeight: 18,
  },
});
