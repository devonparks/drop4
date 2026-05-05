/**
 * CategoryBrowserScreen — browse + equip a single cosmetic category.
 *
 * Pivot 2026-05-03: replaces the slide-up EquipPanel for the 6 simpler
 * cosmetic categories (boards / pieces / drop FX / win FX / frames /
 * pets). Outfits keep their dedicated OutfitsCatalog (painted pack
 * covers + species filter). Emotes keep the AnimationPicker (slot
 * wheel mechanics).
 *
 * Polish pass 2026-05-03 round 2:
 *   - Real preview swatches per category (mini board, pieces discs,
 *     atmospheric FX orb, frame ring, pet paw) replace the generic
 *     rarity disc placeholder
 *   - Equipped state gets a gold halo + "EQUIPPED" gold pill
 *   - Locked state shows a clean tinted lock icon (not a raw emoji)
 *     and surfaces shard-unlock affordance when applicable
 *   - Replaced FlatList with ScrollView grid — for the largest
 *     category (16 pets) virtualization is overkill and FlatList was
 *     paginating in a way that hid items off-screen on first paint
 *
 * Route params: { category }
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Animated } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { TopBar } from '../components/ui/TopBar';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { FilterChip } from '../components/ui/FilterChip';
import { PressScale, StaggeredEntry } from '../components/animations';
import {
  BOARD_THEMES,
  PIECE_THEMES,
  DROP_EFFECTS,
  WIN_ANIMATIONS,
  BOARD_ACCESSORIES,
  RARITY_COLORS,
  RARITY_LABELS,
  type ShopItem,
} from '../data/shopCatalog';
import { PETS, type PetMeta, type PetId } from '../data/petRegistry';
import { useShopStore } from '../stores/shopStore';
import { usePetStore } from '../stores/petStore';
import {
  useLootBoxStore,
  SHARD_UNLOCK_COST,
  type LootBoxRarity,
} from '../stores/lootBoxStore';
import { haptics } from '../services/haptics';
import { playSound } from '../services/audio';
import { fonts, weight } from '../theme/typography';

// ─── Category definitions ──────────────────────────────────────────

export type BrowsableCategory =
  | 'boards' | 'pieces' | 'dropEffects' | 'winAnimations' | 'boardAccessories' | 'pets';

interface BrowsableItem {
  id: string;
  name: string;
  rarity: ShopItem['rarity'] | 'common';
  description?: string;
  /** Source-specific preview hints used by the swatch components.
   *  Boards/pieces/FX/frames have their preview data on the registry
   *  ShopItem.preview; pets carry their breed metadata directly. */
  preview?: ShopItem['preview'];
  petMeta?: PetMeta;
}

interface CategoryConfig {
  title: string;
  /** Short subtitle shown below the title (one-liner explanation). */
  blurb: string;
  /** Painted big icon shown in the header (top-right of title row) when
   *  available. Falls back to no-icon for now — assets pipeline can
   *  generate a per-category hero icon later. */
  items: BrowsableItem[];
  isOwned: (id: string) => boolean;
  isEquipped: (id: string) => boolean;
  equip: (id: string) => void;
  /** Specifies which swatch component to render in the cell. */
  swatchKind: 'board' | 'pieces' | 'fx' | 'win' | 'frame' | 'pet';
}

function petToBrowsable(p: PetMeta): BrowsableItem {
  return { id: p.id, name: p.name, rarity: p.rarity, petMeta: p };
}

function shopItemToBrowsable(item: ShopItem): BrowsableItem {
  return {
    id: item.id,
    name: item.name,
    rarity: item.rarity,
    description: item.description,
    preview: item.preview,
  };
}

function mapToLootRarity(rarity: BrowsableItem['rarity']): LootBoxRarity {
  switch (rarity) {
    case 'rare': return 'rare';
    case 'epic': return 'epic';
    case 'legendary':
    case 'mythic': return 'legendary';
    default: return 'common';
  }
}

// ─── Filter chips ──────────────────────────────────────────────────

type RarityFilter = 'all' | 'common' | 'rare' | 'epic' | 'legendary';

const RARITY_FILTERS: Array<{ id: RarityFilter; label: string }> = [
  { id: 'all',       label: 'All' },
  { id: 'common',    label: 'Common' },
  { id: 'rare',      label: 'Rare' },
  { id: 'epic',      label: 'Epic' },
  { id: 'legendary', label: 'Legendary+' },
];

// ─── Preview swatches ──────────────────────────────────────────────
//
// Each category gets a tiny representative graphic in its grid cell.
// Boards = mini Connect 4 frame with sample holes + pieces. Pieces =
// two side-by-side colored discs. FX/Wins = atmospheric gradient orb
// suggesting motion. Frames = a tinted ring. Pets = paw glyph on a
// rarity-tinted disc (until painted pet thumbnails ship).

function BoardSwatch({ preview, dimmed }: { preview?: ShopItem['preview']; dimmed?: boolean }) {
  const frameColor = preview?.boardColor ?? '#1a3060';
  const p1 = '#e63946';
  const p2 = '#f4c435';
  return (
    <View style={[swatchStyles.boardWrap, dimmed && swatchStyles.dimmed]}>
      <LinearGradient
        colors={[frameColor, shade(frameColor, 0.6)]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={swatchStyles.boardFrame}
      >
        {/* 2x3 grid of holes — minimal Connect 4 hint */}
        {Array.from({ length: 2 }).map((_, row) => (
          <View key={row} style={swatchStyles.boardRow}>
            {Array.from({ length: 3 }).map((_, col) => {
              const filled = (row === 1 && col === 1) || (row === 0 && col === 2);
              const color = row === 1 && col === 1 ? p1 : row === 0 && col === 2 ? p2 : null;
              return (
                <View key={col} style={swatchStyles.boardCell}>
                  <View style={[swatchStyles.boardHole, filled && color ? { backgroundColor: color } : null]} />
                </View>
              );
            })}
          </View>
        ))}
      </LinearGradient>
    </View>
  );
}

function PieceSwatch({ preview, dimmed }: { preview?: ShopItem['preview']; dimmed?: boolean }) {
  const p1 = preview?.p1Color ?? '#e63946';
  const p2 = preview?.p2Color ?? '#f4c435';
  return (
    <View style={[swatchStyles.piecesWrap, dimmed && swatchStyles.dimmed]}>
      <LinearGradient
        colors={[shade(p1, 1.3), p1]}
        start={{ x: 0.3, y: 0 }}
        end={{ x: 0.7, y: 1 }}
        style={swatchStyles.pieceDisc}
      />
      <LinearGradient
        colors={[shade(p2, 1.3), p2]}
        start={{ x: 0.3, y: 0 }}
        end={{ x: 0.7, y: 1 }}
        style={[swatchStyles.pieceDisc, { marginLeft: -8 }]}
      />
    </View>
  );
}

function FxSwatch({ rarityColor, kind, dimmed }: { rarityColor: string; kind: 'fx' | 'win'; dimmed?: boolean }) {
  // Two halos: outer soft glow + inner core. Suggests "energy" without
  // a real animation. Win uses a brighter inner core; drop FX is more
  // diffuse/soft.
  return (
    <View style={[swatchStyles.fxWrap, dimmed && swatchStyles.dimmed]}>
      <View style={[swatchStyles.fxOuter, { backgroundColor: `${rarityColor}22`, borderColor: `${rarityColor}55` }]} />
      <View
        style={[
          swatchStyles.fxInner,
          {
            backgroundColor: kind === 'win' ? `${rarityColor}cc` : `${rarityColor}88`,
            shadowColor: rarityColor,
          },
        ]}
      />
    </View>
  );
}

function FrameSwatch({ rarityColor, dimmed }: { rarityColor: string; dimmed?: boolean }) {
  return (
    <View style={[swatchStyles.frameWrap, dimmed && swatchStyles.dimmed]}>
      <View style={[swatchStyles.frameRing, { borderColor: rarityColor, shadowColor: rarityColor }]} />
    </View>
  );
}

function PetSwatch({ pet, dimmed }: { pet?: PetMeta; dimmed?: boolean }) {
  const rarityColor = pet ? PET_RARITY_COLOR[pet.rarity] : '#7f8c8d';
  return (
    <View style={[swatchStyles.petWrap, dimmed && swatchStyles.dimmed]}>
      <LinearGradient
        colors={[`${rarityColor}55`, `${rarityColor}11`]}
        start={{ x: 0.3, y: 0 }}
        end={{ x: 0.7, y: 1 }}
        style={swatchStyles.petDisc}
      />
      <Text style={swatchStyles.petGlyph}>{'\u{1F43E}'}</Text>
    </View>
  );
}

const PET_RARITY_COLOR: Record<PetMeta['rarity'], string> = {
  common: '#3eb489',
  rare: '#3a78d4',
  epic: '#9b59b6',
  legendary: '#f1c40f',
};

/** Lighten/darken a hex color by a multiplier. Used to give swatches
 *  subtle tonal variation without designing per-asset gradients. */
function shade(hex: string, mult: number): string {
  const m = hex.match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) return hex;
  const adj = (h: string) => {
    const v = Math.min(255, Math.max(0, Math.round(parseInt(h, 16) * mult)));
    return v.toString(16).padStart(2, '0');
  };
  return `#${adj(m[1])}${adj(m[2])}${adj(m[3])}`;
}

// ─── Screen ────────────────────────────────────────────────────────

export function CategoryBrowserScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const category = (route.params?.category ?? 'boards') as BrowsableCategory;

  const coins = useShopStore((s) => s.coins);
  const gems = useShopStore((s) => s.gems);
  const level = useShopStore((s) => s.level);
  const owned = useShopStore((s) => s.owned);
  const equipped = useShopStore((s) => s.equipped);
  const equipItem = useShopStore((s) => s.equipItem);
  const ownedPets = usePetStore((s) => s.ownedPets);
  const activePetId = usePetStore((s) => s.activePetId);
  const setActivePet = usePetStore((s) => s.setActivePet);

  const shards = useLootBoxStore((s) => s.shards);
  const spendShardsForItem = useLootBoxStore((s) => s.spendShardsForItem);

  const [rarityFilter, setRarityFilter] = useState<RarityFilter>('all');
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    cancelLabel?: string;
    onConfirm: () => void;
  } | null>(null);

  const config: CategoryConfig = useMemo(() => {
    switch (category) {
      case 'boards':
        return {
          title: 'BOARDS',
          blurb: 'Frame the playfield. Tap to equip.',
          items: BOARD_THEMES.map(shopItemToBrowsable),
          isOwned: (id) => owned.boards.includes(id),
          isEquipped: (id) => equipped.board === id,
          equip: (id) => equipItem('board', id),
          swatchKind: 'board',
        };
      case 'pieces':
        return {
          title: 'PIECES',
          blurb: 'Your discs. Tap to equip.',
          items: PIECE_THEMES.map(shopItemToBrowsable),
          isOwned: (id) => owned.pieces.includes(id),
          isEquipped: (id) => equipped.pieces === id,
          equip: (id) => equipItem('pieces', id),
          swatchKind: 'pieces',
        };
      case 'dropEffects':
        return {
          title: 'DROP EFFECTS',
          blurb: 'Trail when a piece falls.',
          items: DROP_EFFECTS.map(shopItemToBrowsable),
          isOwned: (id) => owned.dropEffects.includes(id),
          isEquipped: (id) => equipped.dropEffect === id,
          equip: (id) => equipItem('dropEffect', id),
          swatchKind: 'fx',
        };
      case 'winAnimations':
        return {
          title: 'WIN ANIMATIONS',
          blurb: 'Celebrate a victory in style.',
          items: WIN_ANIMATIONS.map(shopItemToBrowsable),
          isOwned: (id) => owned.winAnimations.includes(id),
          isEquipped: (id) => equipped.winAnimation === id,
          equip: (id) => equipItem('winAnimation', id),
          swatchKind: 'win',
        };
      case 'boardAccessories':
        return {
          title: 'BOARD FRAMES',
          blurb: 'Decorate the board edge.',
          items: BOARD_ACCESSORIES.map(shopItemToBrowsable),
          isOwned: (id) => owned.boardAccessories.includes(id),
          isEquipped: (id) => equipped.boardAccessory === id,
          equip: (id) => equipItem('boardAccessory', id),
          swatchKind: 'frame',
        };
      case 'pets':
        return {
          title: 'PETS',
          blurb: 'Companions you bring along.',
          items: Object.values(PETS).map(petToBrowsable),
          isOwned: (id) => ownedPets.includes(id as PetId),
          isEquipped: (id) => activePetId === id,
          equip: (id) => setActivePet(id as PetId),
          swatchKind: 'pet',
        };
    }
  }, [category, owned, equipped, ownedPets, activePetId, equipItem, setActivePet]);

  const filteredItems = useMemo(() => {
    if (rarityFilter === 'all') return config.items;
    return config.items.filter((it) => mapToLootRarity(it.rarity) === rarityFilter);
  }, [config.items, rarityFilter]);

  const ownedCount = useMemo(
    () => config.items.filter((it) => config.isOwned(it.id)).length,
    [config],
  );

  const handleItemTap = (item: BrowsableItem) => {
    const isOwned = config.isOwned(item.id);
    if (isOwned) {
      haptics.select();
      playSound('whoosh');
      config.equip(item.id);
      navigation.goBack();
      return;
    }
    if (item.rarity === 'darkmatter') {
      haptics.error();
      setConfirmDialog({
        title: 'Earn-only item',
        message:
          `${item.name} is earn-only — it can't drop from loot boxes ` +
          `or be unlocked with shards. Complete its associated achievement to claim it.`,
        confirmLabel: 'Got it',
        onConfirm: () => {},
      });
      return;
    }

    const lootRarity = mapToLootRarity(item.rarity);
    const cost = SHARD_UNLOCK_COST[lootRarity];
    const have = shards[lootRarity];

    if (have >= cost) {
      haptics.tap();
      setConfirmDialog({
        title: `Unlock ${item.name}?`,
        message:
          `Spend ${cost} ${lootRarity.toUpperCase()} shards to unlock ` +
          `now (you have ${have}). Or open boxes to find it the lucky way.`,
        confirmLabel: `USE ${cost} SHARDS`,
        cancelLabel: 'OPEN BOXES',
        onConfirm: () => {
          const ok = spendShardsForItem(item.id);
          if (!ok) { haptics.error(); return; }
          haptics.win();
          playSound('coin');
          config.equip(item.id);
          navigation.goBack();
        },
      });
      return;
    }

    haptics.tap();
    playSound('click');
    navigation.navigate('LootBox' as never);
  };

  function renderSwatch(item: BrowsableItem, isOwned: boolean) {
    const dimmed = !isOwned;
    const rarityColor = (RARITY_COLORS as Record<string, string>)[item.rarity] ?? '#7f8c8d';
    switch (config.swatchKind) {
      case 'board':  return <BoardSwatch preview={item.preview} dimmed={dimmed} />;
      case 'pieces': return <PieceSwatch preview={item.preview} dimmed={dimmed} />;
      case 'fx':     return <FxSwatch rarityColor={rarityColor} kind="fx" dimmed={dimmed} />;
      case 'win':    return <FxSwatch rarityColor={rarityColor} kind="win" dimmed={dimmed} />;
      case 'frame':  return <FrameSwatch rarityColor={rarityColor} dimmed={dimmed} />;
      case 'pet':    return <PetSwatch pet={item.petMeta} dimmed={dimmed} />;
    }
  }

  const progressPct = config.items.length > 0 ? (ownedCount / config.items.length) * 100 : 0;
  // Animate the progress fill on mount + when ownedCount changes — same
  // reward-signal pattern as LoadoutCell's progress bar (engine 36bfb65).
  // Bar grows from 0 to target over 600ms with an 80ms delay.
  const progressAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progressPct,
      duration: 600,
      delay: 80,
      useNativeDriver: false,
    }).start();
  }, [progressPct, progressAnim]);
  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

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
          {/* Header — title + blurb + SHARDS shortcut + slim progress bar
              that mirrors the Customize "you've collected X%" affordance. */}
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title} accessibilityRole="header">{config.title}</Text>
              <Text style={styles.blurb}>{config.blurb}</Text>
            </View>
            <PressScale
              onPress={() => navigation.navigate('ShardShop' as never)}
              accessibilityRole="button"
              accessibilityLabel="Open Shard Shop"
            >
              <View style={styles.shardLink}>
                <Text style={styles.shardLinkText}>SHARDS</Text>
              </View>
            </PressScale>
          </View>

          {/* Progress strip + count — single line below the header so the
              player sees "you have 3/15, here's the progress" at a glance. */}
          <View style={styles.progressWrap}>
            <View style={styles.progressTrack}>
              <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
            </View>
            <Text style={styles.progressLabel}>
              {`${ownedCount} / ${config.items.length}  ·  ${Math.round(progressPct)}%`}
            </Text>
          </View>

          {/* NOW EQUIPPED banner removed 2026-05-05 per Devon
              (catalog precedent 6d2d945): "i dont like the now wearing
              tab on the top it just takes up space." Equipped item is
              already signaled by the gold border + EQUIPPED chip on
              the matching card, so the banner was eating ~70 px of
              vertical real estate without adding new info. Applies
              consistently across Pets/Pieces/Boards/Effects/Wins/Frames. */}

          {/* Rarity filter chips — uses the cross-screen FilterChip
              primitive so the visual treatment matches the other
              filter rows across Drop4. (Cohesion pass 2026-05-04.) */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {RARITY_FILTERS.map((f) => (
              <FilterChip
                key={f.id}
                label={f.label}
                active={rarityFilter === f.id}
                onPress={() => setRarityFilter(f.id)}
              />
            ))}
          </ScrollView>

          {/* Items grid — 3-col View+map (not FlatList; small list, no
              virtualization needed and FlatList lazy-load was hiding
              items off-screen on first paint). */}
          <View style={styles.grid}>
            {filteredItems.map((item, index) => {
              const isOwned = config.isOwned(item.id);
              const isEquipped = config.isEquipped(item.id);
              const rarityColor = (RARITY_COLORS as Record<string, string>)[item.rarity] ?? '#7f8c8d';
              const rarityLabel = (RARITY_LABELS as Record<string, string>)[item.rarity] ?? String(item.rarity).toUpperCase();
              const isEarnOnly = item.rarity === 'darkmatter';
              return (
                <StaggeredEntry
                  key={item.id}
                  index={index}
                  delay={20}
                  style={styles.cellOuter}
                >
                  <PressScale
                    onPress={() => handleItemTap(item)}
                    scaleTo={0.95}
                    accessibilityRole="button"
                    accessibilityLabel={`${item.name}, ${rarityLabel}, ${isEquipped ? 'equipped' : isOwned ? 'tap to equip' : 'locked'}`}
                  >
                    <View
                      style={[
                        styles.card,
                        {
                          borderColor: isEquipped
                            ? '#f1c40f'
                            : isOwned
                              ? `${rarityColor}66`
                              : `${rarityColor}33`,
                        },
                        isEquipped && styles.cardEquipped,
                      ]}
                    >
                      {/* Rarity strip (top edge) */}
                      <View style={[styles.rarityStrip, { backgroundColor: rarityColor }]} />

                      {/* Per-category swatch */}
                      <View style={styles.swatchSlot}>
                        {renderSwatch(item, isOwned)}
                        {!isOwned && !isEarnOnly && (
                          <View style={styles.lockOverlay}>
                            <View style={[styles.lockChip, { borderColor: rarityColor }]}>
                              <Text style={[styles.lockChipText, { color: rarityColor }]}>
                                {'\u{1F512}'}
                              </Text>
                            </View>
                          </View>
                        )}
                      </View>

                      {/* Name */}
                      <Text style={styles.cardName} numberOfLines={2}>
                        {item.name}
                      </Text>

                      {/* Rarity chip */}
                      <View style={[styles.rarityChip, { borderColor: rarityColor }]}>
                        <Text style={[styles.rarityChipText, { color: rarityColor }]}>
                          {isEarnOnly ? 'EARN' : rarityLabel}
                        </Text>
                      </View>

                      {/* Status footer */}
                      {isEquipped ? (
                        <View style={styles.equippedPill}>
                          <Text style={styles.equippedPillText}>EQUIPPED</Text>
                        </View>
                      ) : isOwned ? (
                        <Text style={[styles.equipText, { color: rarityColor }]}>TAP TO EQUIP</Text>
                      ) : (
                        <Text style={styles.lockText}>IN BAGS</Text>
                      )}
                    </View>
                  </PressScale>
                </StaggeredEntry>
              );
            })}
          </View>

          {/* Empty state — only triggers when filter narrows to nothing. */}
          {filteredItems.length === 0 && (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>
                Nothing at this rarity yet. Try All or open more boxes.
              </Text>
            </View>
          )}
        </ScrollView>
      </View>

      <ConfirmDialog
        visible={confirmDialog !== null}
        title={confirmDialog?.title ?? ''}
        message={confirmDialog?.message}
        confirmLabel={confirmDialog?.confirmLabel ?? 'OK'}
        cancelLabel={confirmDialog?.cancelLabel}
        confirmOnly={confirmDialog?.cancelLabel === undefined}
        onConfirm={() => {
          confirmDialog?.onConfirm();
          setConfirmDialog(null);
        }}
        onCancel={() => {
          const wasShardOption = confirmDialog?.cancelLabel === 'OPEN BOXES';
          setConfirmDialog(null);
          if (wasShardOption) {
            haptics.tap();
            playSound('click');
            navigation.navigate('LootBox' as never);
          }
        }}
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

  // Header
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingTop: 6,
    gap: 8,
  },
  title: {
    fontFamily: fonts.heading,
    fontWeight: weight.black,
    fontSize: 22,
    color: '#ffffff',
    letterSpacing: 2,
  },
  blurb: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 11,
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 0.4,
    marginTop: 2,
  },
  shardLink: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(155,89,182,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(155,89,182,0.55)',
  },
  shardLinkText: {
    fontFamily: fonts.heading,
    fontWeight: weight.black,
    fontSize: 11,
    color: '#c997e7',
    letterSpacing: 1.2,
  },

  // Progress
  progressWrap: {
    paddingHorizontal: 4,
    paddingTop: 8,
    paddingBottom: 4,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#ffb347',
    borderRadius: 2,
  },
  progressLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 9,
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 1.0,
    marginTop: 4,
  },

  // Filter chips
  filterRow: {
    paddingVertical: 10,
    gap: 6,
  },
  // filterChip styles moved to FilterChip shared component (cohesion
  // pass 2026-05-04 — every filter row across Drop4 uses the same chip
  // visual now: Shop, MatchHistory, ClothesCatalog, CategoryBrowser).

  // Grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 8,
    paddingTop: 4,
  },
  cellOuter: {
    width: '32%',
  },
  card: {
    width: '100%',
    borderRadius: 14,
    backgroundColor: 'rgba(10,14,32,0.7)',
    borderWidth: 1.5,
    paddingVertical: 8,
    paddingHorizontal: 6,
    overflow: 'hidden',
    alignItems: 'center',
  },
  cardEquipped: {
    backgroundColor: 'rgba(241,196,15,0.08)',
    shadowColor: '#f1c40f',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  rarityStrip: {
    height: 3,
    width: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },

  // Swatch slot — fixed-size container so each card has a consistent
  // visual rhythm regardless of which preview component renders.
  swatchSlot: {
    width: '100%',
    height: 70,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  lockChip: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockChipText: {
    fontSize: 12,
  },

  cardName: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 10,
    color: '#ffffff',
    textAlign: 'center',
    marginTop: 6,
    minHeight: 24,
    lineHeight: 12,
    paddingHorizontal: 2,
  },
  rarityChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    marginTop: 4,
  },
  rarityChipText: {
    fontFamily: fonts.body,
    fontWeight: weight.black,
    fontSize: 8,
    letterSpacing: 0.6,
  },
  equippedPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: '#f1c40f',
    marginTop: 6,
  },
  equippedPillText: {
    fontFamily: fonts.body,
    fontWeight: weight.black,
    fontSize: 8,
    color: '#0a0e27',
    letterSpacing: 0.8,
  },
  equipText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 9,
    textAlign: 'center',
    marginTop: 6,
    letterSpacing: 0.4,
  },
  lockText: {
    fontFamily: fonts.body,
    fontWeight: weight.black,
    fontSize: 8,
    color: 'rgba(255,180,90,0.75)',
    textAlign: 'center',
    marginTop: 6,
    letterSpacing: 1.0,
  },

  // Empty state
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

// Swatch-specific styles isolated from the main grid styles for clarity.
const swatchStyles = StyleSheet.create({
  dimmed: { opacity: 0.45 },

  // Board: small Connect-4-shaped frame with two rows × three holes.
  boardWrap: {
    width: 60,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boardFrame: {
    width: 60,
    height: 44,
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 4,
    justifyContent: 'space-between',
  },
  boardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  boardCell: {
    width: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boardHole: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },

  // Pieces: two overlapping rounded discs in p1+p2 colors.
  piecesWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pieceDisc: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },

  // FX/Win: stacked halos suggesting energy radiance.
  fxWrap: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fxOuter: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
  },
  fxInner: {
    width: 24,
    height: 24,
    borderRadius: 12,
    shadowOpacity: 0.7,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },

  // Frame: ring outline only.
  frameWrap: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frameRing: {
    width: 50,
    height: 50,
    borderRadius: 12,
    borderWidth: 3,
    backgroundColor: 'transparent',
    shadowOpacity: 0.5,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },

  // Pet: paw glyph on rarity-tinted disc.
  petWrap: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  petDisc: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  petGlyph: {
    fontSize: 26,
  },
});
