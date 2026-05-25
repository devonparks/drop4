// ═══════════════════════════════════════════════════════════════════════
// CustomizeScreen — Basketball-Stars-style hub.
//
// Old IA had 3 competing browse surfaces (ClothesCatalog modal /
// CategoryBrowserScreen / AnimationPicker modal) and a flat 9-cell
// loadout grid that buried the affordance "I just want to change my
// shirt." Replaced 2026-05-23 with the shared @amg/cosmetic-ui
// CustomizeHub + KitsSubscreen — 4 category cards (KITS / EMOTES /
// PIECES / BOARDS) on the right, big character preview on the left,
// Shop + Bags CTAs at the bottom. KITS opens a 3-tier nav subscreen
// (STYLE / OUTFITS / ADDONS / COLLECTION → hair / tops / etc.).
//
// Other category cards still route to the legacy screens for v1
// (AnimationPicker for Emotes; CategoryBrowser for Pieces / Boards) —
// they're queued to migrate into the same CategorySubscreen pattern
// in v1.1 once the KITS flow is validated.
// ═══════════════════════════════════════════════════════════════════════

import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { CustomizeHub } from '@amg/cosmetic-ui';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { TopBar } from '../components/ui/TopBar';
import { Character3DPortrait } from '../components/3d/Character3DPortrait';
import { AnimationPicker } from '../components/ui/AnimationPicker';
import { KitsSubscreen } from '../components/customize/KitsSubscreen';
import { useShopStore } from '../stores/shopStore';
import { useCharacterStore } from '../stores/characterStore';
import {
  useLootBoxStore,
  selectWaitingBoxCount,
  selectShardUnlockableItems,
  getAllLootableItems,
  isLootItemOwned,
} from '../stores/lootBoxStore';
import { HUMAN_EMOTES } from '../data/animationRegistry';
import { DROP4_HUB_CATEGORIES } from '../data/drop4Categories';
import type { BrowsableCategory } from './CategoryBrowserScreen';
import { haptics } from '../services/haptics';
import { playSound } from '../services/audio';
import { fonts, weight } from '../theme/typography';

export function CustomizeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const coins = useShopStore((s) => s.coins);
  const gems = useShopStore((s) => s.gems);
  const level = useShopStore((s) => s.level);
  const ownedEmotes = useShopStore((s) => s.ownedEmotes);
  const ownedOutfits = useCharacterStore((s) => s.ownedOutfits);
  const owned = useShopStore((s) => s.owned);
  const ownedBoxes = useLootBoxStore((s) => s.ownedBoxes);
  const lootShards = useLootBoxStore((s) => s.shards);

  // Aggregate collection % + waiting boxes + shard-ready items — drives
  // the small stat block under the character + the BAGS CTA badge.
  const lockerStats = useMemo(() => {
    const allLootable = getAllLootableItems();
    const ownedCount = allLootable.reduce(
      (acc, item) => (isLootItemOwned(item) ? acc + 1 : acc),
      0,
    );
    const totalCount = allLootable.length;
    const waitingBoxes = selectWaitingBoxCount({ ownedBoxes } as any);
    const shardReady = selectShardUnlockableItems({ shards: lootShards } as any).length;
    const collectionPct = totalCount > 0 ? (ownedCount / totalCount) * 100 : 0;
    return { ownedCount, totalCount, waitingBoxes, shardReady, collectionPct };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownedEmotes, ownedOutfits, owned, ownedBoxes, lootShards]);

  // Active category — when 'kits', the KitsSubscreen replaces the hub
  // entirely (Basketball Stars navigation pattern). Other categories
  // open their legacy screens / modals and hub stays mounted.
  const [activeCategory, setActiveCategory] = useState<'kits' | null>(null);

  const [animPickerOpen, setAnimPickerOpen] = useState(false);

  // Tap-to-preview emote on the hub character — plays a random owned
  // emote for 5s then crossfades back to idle.
  const [activeEmote, setActiveEmote] = useState<string | null>(null);
  useEffect(() => {
    if (!activeEmote) return;
    const t = setTimeout(() => setActiveEmote(null), 5000);
    return () => clearTimeout(t);
  }, [activeEmote]);
  const handleCharacterTap = () => {
    const pool = HUMAN_EMOTES.filter(
      (e) => ownedEmotes.includes(e.id) || (e.price ?? 0) === 0,
    );
    if (pool.length === 0) return;
    const pick = pool[Math.floor(Math.random() * pool.length)].id;
    haptics.win();
    playSound('click');
    setActiveEmote(pick);
  };

  const handleCategoryPress = (id: string) => {
    haptics.tap();
    playSound('click');
    if (id === 'kits') {
      setActiveCategory('kits');
      return;
    }
    if (id === 'emotes') {
      setAnimPickerOpen(true);
      return;
    }
    const browserMap: Record<string, BrowsableCategory> = {
      pieces: 'pieces',
      boards: 'boards',
    };
    const browserCategory = browserMap[id];
    if (browserCategory) {
      navigation.navigate('CategoryBrowser', { category: browserCategory });
    }
  };

  const navigateTo = (screen: string) =>
    navigation.dispatch(CommonActions.navigate({ name: screen }));

  const kitsActive = activeCategory === 'kits';

  return (
    <ScreenBackground scene="profile">
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <TopBar
          coins={coins}
          gems={gems}
          level={level}
          onProfilePress={() => navigateTo('Profile')}
          onSettingsPress={() => navigateTo('Settings')}
          onCoinPress={() => navigation.navigate('MainTabs', { screen: 'Shop' } as never)}
          onGemPress={() => navigation.navigate('MainTabs', { screen: 'Shop' } as never)}
        />

        {/* Keep-alive: KitsSubscreen stays mounted so the R3F Canvas
            isn't destroyed on every hub↔kits transition. Hidden via
            display:'none' when the hub is showing. */}
        <View style={{ display: kitsActive ? 'flex' : 'none', flex: 1 }}>
          <KitsSubscreen onClose={() => setActiveCategory(null)} />
        </View>

        {!kitsActive && <CustomizeHub
          categories={DROP4_HUB_CATEGORIES}
          onCategoryPress={handleCategoryPress}
          renderCharacterPreview={(opts) => (
            <Character3DPortrait
              width={opts.width}
              height={opts.height}
              animationId={activeEmote}
              showFloor={false}
            />
          )}
          onCharacterTap={handleCharacterTap}
          statsBlock={
            <View style={styles.statsBlock}>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>COLLECTION</Text>
                <Text style={styles.statValue}>
                  {lockerStats.collectionPct.toFixed(1)}%
                </Text>
              </View>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.min(100, Math.max(0, lockerStats.collectionPct))}%`,
                    },
                  ]}
                />
              </View>
              {lockerStats.shardReady > 0 && (
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>SHARDS READY</Text>
                  <Text style={[styles.statValue, { color: '#c997e7' }]}>
                    {lockerStats.shardReady}
                  </Text>
                </View>
              )}
            </View>
          }
          onShopPress={() => {
            haptics.tap();
            playSound('click');
            navigation.navigate('MainTabs', { screen: 'Shop' } as never);
          }}
          onBagsPress={() => {
            haptics.tap();
            playSound('click');
            navigation.navigate('LootBox' as never);
          }}
          bagsBadgeCount={lockerStats.waitingBoxes}
        />}
      </View>

      <AnimationPicker
        visible={animPickerOpen}
        onClose={() => setAnimPickerOpen(false)}
        initialTab="emotes"
      />
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' as const },
  statsBlock: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    gap: 4,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  statLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.black,
    fontSize: 9,
    color: 'rgba(255,255,255,0.65)',
    letterSpacing: 1.1,
  },
  statValue: {
    fontFamily: fonts.heading,
    fontWeight: weight.black,
    fontSize: 13,
    color: '#ffb347',
    letterSpacing: 0.4,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.10)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#ffb347',
    borderRadius: 2,
  },
});
