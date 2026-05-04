/**
 * OutfitsCatalog — full-screen modal showing all 152 outfits with
 * painted pack icons, variant indices, rarity chips, and IN BAGS
 * badges on locked items.
 *
 * Resurrects the old Shop > Outfits browse view inside Customize per
 * Devon's 2026-05-03 pivot ("merge the old shop with the customize
 * tab"). Owned outfits tap to equip (calls equipOutfitPack which
 * swaps the body slots into amgCharacter, preserving Head + Eyebrows).
 * Locked outfits tap-route to LootBoxScreen (the new acquisition).
 *
 * Same painted art the Shop's outfit cards used — variant-hue
 * gradient backdrops, chunky 3D pack covers per Sidekick prefix,
 * variant index in the corner, rarity strip up top.
 */
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn } from 'react-native-reanimated';
import { PreviewSafeModal } from '../ui/PreviewSafeModal';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { PressScale } from '../animations';
import { useCharacterStore } from '../../stores/characterStore';
import { useLootBoxStore, SHARD_UNLOCK_COST } from '../../stores/lootBoxStore';
import { OUTFITS, type Species } from '../../data/outfitRegistry';
import { OUTFIT_SHOP_ITEMS } from '../../data/cosmeticsShopCatalog';
import { getPackIcon } from '../../data/cosmeticIcons';
import { RARITY_COLORS, RARITY_LABELS } from '../../data/amgPartPricing';
import { haptics } from '../../services/haptics';
import { playSound } from '../../services/audio';
import { colors } from '../../theme/colors';
import { fonts, weight } from '../../theme/typography';

// Outfit rarity strings come from cosmeticsShopCatalog (ShopItem.rarity)
// — 'common'/'uncommon'/'rare'/'epic'/'legendary'/'mythic'/'darkmatter'.
// The lootbox SHARD_UNLOCK_COST table only knows the 4-tier loot rarity
// system. Map source → loot tier so we can quote the right shard cost.
function shardRarityForOutfit(rarity: string): 'common' | 'rare' | 'epic' | 'legendary' {
  switch (rarity) {
    case 'rare': return 'rare';
    case 'epic': return 'epic';
    case 'legendary':
    case 'mythic': return 'legendary';
    case 'darkmatter': return 'legendary'; // shouldn't happen for outfits, but safe
    default: return 'common';
  }
}

// Pack-slug → Sidekick prefix translator (mirrors the lookup that
// lived in ShopScreen). Sidekick prefix feeds getPackIcon → painted
// chunky 3D pack cover (e.g. 'elven_warriors' → 'ELVN_WARR' →
// pack-elvn-warr.png).
const OUTFIT_PACK_TO_SIDEKICK: Record<string, string> = {
  modern_civilians:    'MDRN_CIVL',
  modern_police:       'MDRN_POLC',
  apocalypse_outlaws:  'APOC_OUTL',
  apocalypse_survivor: 'APOC_SURV',
  apocalypse_zombies:  'APOC_ZOMB',
  fantasy_villagers:   'FANT_VILL',
  fantasy_knights:     'FANT_KNGT',
  fantasy_skeletons:   'FANT_SKTN',
  elven_warriors:      'ELVN_WARR',
  goblin_fighters:     'GOBL_FIGT',
  pirate_captains:     'PIRT_CAPT',
  samurai_warriors:    'SAMR_WARR',
  viking_warriors:     'VIKG_WARR',
  sci_fi_civilians:    'SCFI_CIVL',
  sci_fi_soldiers:     'SCFI_SOLD',
};

// Deterministic hue from an outfit pack so each pack reads with its
// own warm/cool palette across variants. Mirrors the Shop variant
// tint logic so card art looks identical to what the old Shop showed.
function packHue(pack: string): number {
  let hash = 0;
  for (let i = 0; i < pack.length; i++) hash = ((hash << 5) - hash + pack.charCodeAt(i)) | 0;
  return Math.abs(hash) % 360;
}

const SPECIES_FILTERS: Array<{ id: 'All' | Species; label: string }> = [
  { id: 'All',      label: 'All' },
  { id: 'human',    label: 'Human' },
  { id: 'elves',    label: 'Elf' },
  { id: 'goblin',   label: 'Goblin' },
  { id: 'skeleton', label: 'Skeleton' },
  { id: 'zombie',   label: 'Zombie' },
];

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function OutfitsCatalog({ visible, onClose }: Props) {
  const navigation = useNavigation<any>();
  const ownedOutfits = useCharacterStore((s) => s.ownedOutfits);
  const equippedOutfitId = useCharacterStore((s) => s.equippedOutfitId);
  const equipOutfitPack = useCharacterStore((s) => s.equipOutfitPack);
  // Shard balance + spend are exposed by the loot-box store post-pivot.
  // Tapping a locked outfit the player can shard-unlock pops a small
  // confirm so they get a deliberate "spend X shards?" beat instead of
  // an instant deduction.
  const shards = useLootBoxStore((s) => s.shards);
  const spendShardsForItem = useLootBoxStore((s) => s.spendShardsForItem);

  const [speciesFilter, setSpeciesFilter] = useState<'All' | Species>('All');
  // Locked-tap dialog. Single source of truth so the same pattern works
  // for "shard-unlock affordable" (2-button) and "go to boxes" (1-button)
  // paths without duplicating the modal markup.
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    cancelLabel?: string;
    confirmOnly?: boolean;
    onConfirm: () => void;
  } | null>(null);

  const filtered = useMemo(() => {
    if (speciesFilter === 'All') return OUTFIT_SHOP_ITEMS;
    return OUTFIT_SHOP_ITEMS.filter((item) => {
      const meta = OUTFITS[item.id];
      return meta?.species === speciesFilter;
    });
  }, [speciesFilter]);

  const ownedCount = useMemo(
    () => OUTFIT_SHOP_ITEMS.filter((item) => ownedOutfits.includes(item.id)).length,
    [ownedOutfits],
  );

  if (!visible) return null;

  const handleTap = (itemId: string) => {
    const isOwned = ownedOutfits.includes(itemId);
    if (isOwned) {
      haptics.win();
      playSound('click');
      equipOutfitPack(itemId);
      onClose();
      return;
    }
    // Locked. Two paths post-pivot:
    //   • Player has enough shards of this rarity → offer shard unlock
    //     OR open boxes (a real choice, not a forced detour).
    //   • Player can't afford shards → straight to LootBox screen.
    const item = OUTFIT_SHOP_ITEMS.find((it) => it.id === itemId);
    const meta = OUTFITS[itemId];
    const rarity = item ? shardRarityForOutfit(item.rarity) : 'common';
    const cost = SHARD_UNLOCK_COST[rarity];
    const have = shards[rarity];
    const packLabel = meta?.packLabel ?? 'Outfit';

    if (have >= cost) {
      haptics.tap();
      playSound('click');
      setConfirmDialog({
        title: `Unlock ${packLabel}?`,
        message:
          `Spend ${cost} ${rarity.toUpperCase()} shards to unlock this ` +
          `outfit pack now (you have ${have}). Or open boxes to find it ` +
          `the lucky way.`,
        confirmLabel: `USE ${cost} SHARDS`,
        cancelLabel: 'OPEN BOXES',
        onConfirm: () => {
          const ok = spendShardsForItem(itemId);
          if (!ok) { haptics.error(); return; }
          haptics.win();
          playSound('coin');
          // Auto-equip the pack after a shard unlock so the action
          // feels complete in one beat — same as a fresh box drop.
          equipOutfitPack(itemId);
          onClose();
        },
      });
      return;
    }

    haptics.tap();
    playSound('click');
    onClose();
    navigation.navigate('LootBox' as never);
  };

  return (
    <PreviewSafeModal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <LinearGradient
          colors={['#0a0e27', '#111b47', '#0a0e27']}
          style={StyleSheet.absoluteFill}
        />

        {/* Header — title reads "CLOTHES" to match the Customize card
            label (renamed 2026-05-03 when the redundant Clothes-vs-
            Outfits split was consolidated into a single wardrobe). */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title} accessibilityRole="header">CLOTHES</Text>
            <Text style={styles.subtitle}>Outfit packs you can wear</Text>
          </View>
          <Pressable
            onPress={onClose}
            style={styles.closeBtn}
            accessibilityRole="button"
            accessibilityLabel="Close clothes catalog"
          >
            <Text style={styles.closeBtnText}>×</Text>
          </Pressable>
        </View>

        {/* Progress strip — single line under the header showing
            collection completion. Mirrors the CategoryBrowser pattern. */}
        <View style={styles.progressWrap}>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${(ownedCount / OUTFIT_SHOP_ITEMS.length) * 100}%`,
                },
              ]}
            />
          </View>
          <Text style={styles.progressLabel}>
            {`${ownedCount} / ${OUTFIT_SHOP_ITEMS.length}  ·  ${Math.round((ownedCount / OUTFIT_SHOP_ITEMS.length) * 100)}%`}
          </Text>
        </View>

        {/* NOW EQUIPPED banner — shows the player's currently-equipped
            outfit pack at the top so they know what they're replacing. */}
        {(() => {
          const equippedItem = OUTFIT_SHOP_ITEMS.find((it) => it.id === equippedOutfitId);
          const equippedMeta = equippedItem ? OUTFITS[equippedItem.id] : null;
          if (!equippedItem || !equippedMeta) return null;
          const sidekickKey = OUTFIT_PACK_TO_SIDEKICK[equippedMeta.pack];
          const cover = sidekickKey ? getPackIcon(sidekickKey) : undefined;
          const rarityColor = RARITY_COLORS[equippedItem.rarity as keyof typeof RARITY_COLORS] || '#7f8c8d';
          const rarityLabel = RARITY_LABELS[equippedItem.rarity as keyof typeof RARITY_LABELS] || String(equippedItem.rarity).toUpperCase();
          return (
            <View style={styles.equippedBanner}>
              <View style={styles.equippedBannerSwatch}>
                {cover ? (
                  <Image source={cover} style={styles.equippedBannerCover} resizeMode="contain" />
                ) : (
                  <Text style={styles.equippedBannerGlyph}>{'\u{1F455}'}</Text>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.equippedBannerLabel}>NOW EQUIPPED</Text>
                <Text style={styles.equippedBannerName} numberOfLines={1}>
                  {`${equippedMeta.packLabel} ${String(equippedMeta.index).padStart(2, '0')}`}
                </Text>
              </View>
              <View style={[styles.equippedBannerChip, { borderColor: rarityColor }]}>
                <Text style={[styles.equippedBannerChipText, { color: rarityColor }]}>
                  {rarityLabel}
                </Text>
              </View>
            </View>
          );
        })()}

        {/* Species filter chips. The wrapping ScrollView gets an
            explicit height so RN-Web doesn't stretch it vertically
            into the available flex space (which made the chips render
            as tall narrow columns instead of horizontal pills). */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
          style={styles.filterScroll}
        >
          {SPECIES_FILTERS.map((f) => {
            const active = speciesFilter === f.id;
            return (
              <Pressable
                key={f.id}
                onPress={() => { haptics.tap(); setSpeciesFilter(f.id); }}
                style={[styles.filterChip, active && styles.filterChipActive]}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`Filter by ${f.label}`}
              >
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Catalog grid */}
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.gridWrap}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.grid}>
            {filtered.map((item) => {
              const meta = OUTFITS[item.id];
              if (!meta) return null;
              const isOwned = ownedOutfits.includes(item.id);
              const isEquipped = equippedOutfitId === item.id;
              const rarityColor = RARITY_COLORS[item.rarity as keyof typeof RARITY_COLORS] || '#7f8c8d';
              const rarityLabel = RARITY_LABELS[item.rarity as keyof typeof RARITY_LABELS] || String(item.rarity).toUpperCase();
              const sidekickKey = OUTFIT_PACK_TO_SIDEKICK[meta.pack];
              const cover = sidekickKey ? getPackIcon(sidekickKey) : undefined;
              // Variant tint: each variant in a pack gets a distinct
              // hue spread around the wheel, mirroring the Shop logic.
              const baseHue = packHue(meta.pack);
              const variantHue = (baseHue + (meta.index - 1) * 45) % 360;
              const variantStrong = `hsl(${variantHue}, 70%, 42%)`;
              const variantSoft = `hsl(${variantHue}, 60%, 22%)`;
              return (
                <PressScale
                  key={item.id}
                  scaleTo={0.95}
                  onPress={() => handleTap(item.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`${meta.packLabel} variant ${meta.index}, ${rarityLabel}, ${isOwned ? (isEquipped ? 'equipped' : 'owned, tap to equip') : 'in bags'}`}
                  accessibilityState={{ selected: isEquipped }}
                >
                  <Animated.View
                    entering={FadeIn.duration(200)}
                    style={[
                      styles.card,
                      { borderColor: isEquipped ? colors.coinGold : `${rarityColor}66` },
                      !isOwned && styles.cardLocked,
                    ]}
                  >
                    {/* Rarity strip top */}
                    <View style={[styles.rarityStrip, { backgroundColor: rarityColor }]} />
                    {/* Variant-tint backdrop + painted pack cover */}
                    <View style={styles.cardPreview}>
                      <LinearGradient
                        colors={[variantStrong, variantSoft, '#060914']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFill}
                      />
                      {cover ? (
                        <Image
                          source={cover}
                          style={[styles.cardCover, !isOwned && styles.cardCoverLocked]}
                          resizeMode="contain"
                          accessibilityIgnoresInvertColors
                        />
                      ) : (
                        <Text style={[styles.cardCoverEmoji, !isOwned && { opacity: 0.45 }]}>
                          {'\u{1F455}'}
                        </Text>
                      )}
                      {/* Variant index — top right */}
                      <Text style={styles.cardVariantIndex}>
                        {String(meta.index).padStart(2, '0')}
                      </Text>
                    </View>
                    {/* Pack name (uppercase, wraps to 2 lines if needed) */}
                    <Text style={styles.cardName} numberOfLines={2}>
                      {meta.packLabel.toUpperCase()}
                    </Text>
                    {/* Rarity chip */}
                    <View style={[styles.rarityChip, { borderColor: rarityColor }]}>
                      <Text style={[styles.rarityChipText, { color: rarityColor }]}>
                        {rarityLabel}
                      </Text>
                    </View>
                    {/* Status footer */}
                    {isEquipped ? (
                      <View style={[styles.statusPill, { backgroundColor: colors.coinGold }]}>
                        <Text style={styles.equippedPillText}>EQUIPPED</Text>
                      </View>
                    ) : isOwned ? (
                      <Text style={[styles.equipText, { color: rarityColor }]}>TAP TO EQUIP</Text>
                    ) : (
                      <View style={styles.lockBadge}>
                        <Text style={styles.lockBadgeText}>🔒 IN BAGS</Text>
                      </View>
                    )}
                  </Animated.View>
                </PressScale>
              );
            })}
          </View>

          {/* Footer CTA */}
          <Pressable
            onPress={() => {
              haptics.tap();
              playSound('click');
              onClose();
              navigation.navigate('LootBox' as never);
            }}
            style={styles.openBagsCta}
            accessibilityRole="button"
            accessibilityLabel="Open bags to find more outfits"
          >
            <LinearGradient
              colors={['rgba(255,140,0,0.25)', 'rgba(255,80,0,0.18)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.openBagsGradient}
            >
              <Text style={styles.openBagsText}>OPEN BAGS FOR MORE CLOTHES</Text>
              <Text style={styles.openBagsArrow}>→</Text>
            </LinearGradient>
          </Pressable>
        </ScrollView>

        {/* Locked-tap confirm. Two-button mode when affordable (USE
            SHARDS / OPEN BOXES), single-button mode is unused here.
            cancelLabel="OPEN BOXES" actually navigates to LootBox so the
            player gets the same destination they would have if they
            tapped a non-affordable locked card. */}
        <ConfirmDialog
          visible={confirmDialog !== null}
          title={confirmDialog?.title ?? ''}
          message={confirmDialog?.message}
          confirmLabel={confirmDialog?.confirmLabel ?? 'OK'}
          cancelLabel={confirmDialog?.cancelLabel}
          confirmOnly={confirmDialog?.confirmOnly}
          onConfirm={() => {
            confirmDialog?.onConfirm();
            setConfirmDialog(null);
          }}
          onCancel={() => {
            // If the dialog was the shard-affordable one, the cancel
            // label reads OPEN BOXES — route accordingly. Otherwise
            // (any future single-button info dialog) just dismiss.
            const wasShardAffordable = confirmDialog?.cancelLabel === 'OPEN BOXES';
            setConfirmDialog(null);
            if (wasShardAffordable) {
              haptics.tap();
              playSound('click');
              onClose();
              navigation.navigate('LootBox' as never);
            }
          }}
        />

        {/* DONE button at footer (matches AnimationPicker chrome) */}
        <View style={styles.doneArea}>
          <Pressable
            onPress={() => { haptics.tap(); playSound('click'); onClose(); }}
            style={styles.doneBtn}
            accessibilityRole="button"
            accessibilityLabel="Close outfits catalog"
          >
            <LinearGradient
              colors={['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.05)']}
              style={styles.doneBtnGradient}
            >
              <Text style={styles.doneBtnText}>DONE</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </PreviewSafeModal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  title: {
    fontFamily: fonts.heading,
    fontWeight: weight.black,
    fontSize: 26,
    color: '#ffffff',
    letterSpacing: 2,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 11,
    color: 'rgba(255,180,90,0.85)',
    letterSpacing: 0.6,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 20,
    color: '#ffffff',
    lineHeight: 22,
  },

  // ── Progress strip ───────────────────────────────────────────
  progressWrap: {
    paddingHorizontal: 16,
    paddingTop: 4,
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

  // ── NOW EQUIPPED banner ──────────────────────────────────────
  equippedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 12,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(241,196,15,0.5)',
    backgroundColor: 'rgba(241,196,15,0.08)',
  },
  equippedBannerSwatch: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  equippedBannerCover: {
    width: 48,
    height: 48,
  },
  equippedBannerGlyph: {
    fontSize: 26,
  },
  equippedBannerLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.black,
    fontSize: 9,
    color: '#f1c40f',
    letterSpacing: 1.6,
  },
  equippedBannerName: {
    fontFamily: fonts.heading,
    fontWeight: weight.black,
    fontSize: 15,
    color: '#ffffff',
    letterSpacing: 0.6,
    marginTop: 2,
  },
  equippedBannerChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  equippedBannerChipText: {
    fontFamily: fonts.body,
    fontWeight: weight.black,
    fontSize: 9,
    letterSpacing: 0.8,
  },

  // Species filter row. `filterScroll` is the outer ScrollView style —
  // height is bounded so RN-Web doesn't fill vertical flex space. The
  // contentContainerStyle (`filterRow`) controls inner padding/gap.
  filterScroll: {
    flexGrow: 0,
    flexShrink: 0,
    maxHeight: 44,
  },
  filterRow: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterChip: {
    height: 30,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(10,14,32,0.55)',
  },
  filterChipActive: {
    borderColor: 'rgba(255,180,90,0.85)',
    backgroundColor: 'rgba(255,140,0,0.18)',
    shadowColor: '#ff8c00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  filterChipText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 0.6,
  },
  filterChipTextActive: {
    color: '#ffffff',
  },

  scrollArea: {
    flex: 1,
  },
  gridWrap: {
    paddingHorizontal: 8,
    paddingTop: 6,
    paddingBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 8,
  },

  // Card — three columns at 390px phone width: (390 - 16 padding -
  // 16 gap) / 3 ≈ 119. Each card ~118px wide.
  card: {
    width: 118,
    borderRadius: 12,
    backgroundColor: 'rgba(10,14,32,0.65)',
    borderWidth: 1.5,
    overflow: 'hidden',
    paddingBottom: 8,
  },
  cardLocked: {
    backgroundColor: 'rgba(10,14,32,0.4)',
  },
  rarityStrip: {
    height: 3,
    width: '100%',
  },
  cardPreview: {
    width: '100%',
    height: 70,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  cardCover: {
    width: 60,
    height: 60,
    zIndex: 1,
  },
  cardCoverLocked: {
    opacity: 0.45,
  },
  cardCoverEmoji: {
    fontSize: 32,
    zIndex: 1,
  },
  cardVariantIndex: {
    position: 'absolute',
    top: 4,
    right: 6,
    zIndex: 2,
    fontFamily: fonts.heading,
    fontWeight: weight.black,
    fontSize: 11,
    color: '#ffffff',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  cardName: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 9,
    color: '#ffffff',
    letterSpacing: 0,
    lineHeight: 11.5,
    textAlign: 'center',
    paddingHorizontal: 4,
    marginTop: 6,
    minHeight: 23, // 2 lines so cards stay aligned
  },
  rarityChip: {
    alignSelf: 'center',
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
  statusPill: {
    alignSelf: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
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
  lockBadge: {
    alignSelf: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255,180,90,0.4)',
    marginTop: 6,
  },
  lockBadgeText: {
    fontFamily: fonts.body,
    fontWeight: weight.black,
    fontSize: 8,
    color: 'rgba(255,180,90,0.95)',
    letterSpacing: 0.5,
  },

  // Footer CTAs
  openBagsCta: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 14,
    overflow: 'hidden',
  },
  openBagsGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,140,0,0.4)',
    borderRadius: 14,
  },
  openBagsText: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 13,
    color: '#ffffff',
    letterSpacing: 1.2,
  },
  openBagsArrow: {
    fontSize: 16,
    color: '#ffffff',
  },

  doneArea: {
    paddingHorizontal: 40,
    paddingTop: 6,
    paddingBottom: 14,
  },
  doneBtn: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  doneBtnGradient: {
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  doneBtnText: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 14,
    color: '#ffffff',
    letterSpacing: 2.5,
  },
});
