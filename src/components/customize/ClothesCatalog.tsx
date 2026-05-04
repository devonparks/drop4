/**
 * ClothesCatalog — GTA / Skyrim-style clothes shopping experience.
 *
 * Replaces the prior OutfitsCatalog modal with a two-mode catalog:
 *
 *   PARTS — per-slot grid of every Sidekick part the player can wear.
 *           Slot buckets group the 17+ raw slot codes into shopping-
 *           friendly categories (TOPS / PANTS / SHOES / HAIR / FACE /
 *           HATS / ACCESSORIES). Each card is a Unity-rendered preview
 *           PNG (2870 of these in src/assets/images/parts/) so the
 *           player sees EXACTLY what they're equipping. Tap an owned
 *           part to swap that single slot — mix-and-match like GTA's
 *           Suburban or Skyrim's inventory. Locked parts show a
 *           padlock and route to the LootBox screen.
 *
 *   PACKS — the original 152 outfit-pack bundle browser. Tap a pack
 *           cover to equip its full body slots in one beat (the
 *           "I want a whole look fast" path). Kept as a sibling tab
 *           so the player can choose ergonomics: full outfits or
 *           per-slot mix.
 *
 * Both modes share a SPECIES filter chip row (All / Human / Elf /
 * Goblin / Skeleton / Zombie) and a NOW EQUIPPED banner showing the
 * currently-equipped outfit pack at the top.
 *
 * Why this lives in Drop4 (not @amg/character-creator):
 *   - The shared package's OutfitTab already does GTA-style per-slot
 *     browsing inside the creator. But the creator is a heavy modal
 *     that lives behind 4 other tabs, and Devon wants this experience
 *     directly off Customize > CLOTHES without a creator detour.
 *   - Per CLAUDE.md "Don't over-engineer shared systems before the
 *     second game needs them" — keep the shared package stable, build
 *     game-specific surface in Drop4.
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn } from 'react-native-reanimated';
import { PreviewSafeModal } from '../ui/PreviewSafeModal';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { PressScale, StaggeredEntry } from '../animations';
import { AmgPartCard } from '../ui/AmgPartCard';
import { useCharacterStore } from '../../stores/characterStore';
import { OUTFITS, type Species } from '../../data/outfitRegistry';
import { OUTFIT_SHOP_ITEMS } from '../../data/cosmeticsShopCatalog';
import { getPackIcon } from '../../data/cosmeticIcons';
import {
  RARITY_COLORS,
  RARITY_LABELS,
  packPrefixFromPartName,
  isStarterPack,
  getPartPrice,
} from '../../data/amgPartPricing';
import { packMeta } from '../../data/amgPackMeta';
import { haptics } from '../../services/haptics';
import { playSound } from '../../services/audio';
import { colors } from '../../theme/colors';
import { fonts, weight } from '../../theme/typography';

// ─── Outfit-pack identity helpers (shared with OutfitsCatalog) ──────

// Pack-slug → Sidekick prefix translator. Maps registry pack slugs
// ('elven_warriors') to their AMG content prefix ('ELVN_WARR') which
// is what `getPackIcon()` uses to resolve the painted pack cover.
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

function packHue(pack: string): number {
  let hash = 0;
  for (let i = 0; i < pack.length; i++) hash = ((hash << 5) - hash + pack.charCodeAt(i)) | 0;
  return Math.abs(hash) % 360;
}

const SPECIES_FILTERS: Array<{ id: 'All' | Species; label: string; manifestKey: string }> = [
  { id: 'All',      label: 'All',      manifestKey: 'All' },
  { id: 'human',    label: 'Human',    manifestKey: 'Human' },
  { id: 'elves',    label: 'Elf',      manifestKey: 'Elves' },
  { id: 'goblin',   label: 'Goblin',   manifestKey: 'Goblin' },
  { id: 'skeleton', label: 'Skeleton', manifestKey: 'Skeleton' },
  { id: 'zombie',   label: 'Zombie',   manifestKey: 'Zombie' },
];

// ─── Slot buckets (GTA-style category grouping) ─────────────────────
//
// Raw Sidekick slots are noisy (LegLeft + LegRight + Hips for "pants",
// 13 different attachment slots for armor pieces, etc.). Bucketing
// turns them into shopping categories the player can navigate without
// a manual.

interface SlotBucket {
  id: string;
  label: string;
  /** Glyph or short emoji for the chip — placeholder until painted
   *  per-bucket icons get generated. */
  glyph: string;
  /** Manifest slot keys that belong in this bucket. Order roughly
   *  determines the order parts appear inside the bucket grid. */
  slots: string[];
  /** Marketing blurb for the bucket header — one-liner shown above
   *  the grid so the player knows what they're shopping. */
  blurb: string;
}

const SLOT_BUCKETS: SlotBucket[] = [
  {
    id: 'tops',
    label: 'TOPS',
    glyph: '\u{1F455}',
    slots: ['Torso', 'ArmUpperLeft', 'ArmUpperRight', 'ArmLowerLeft', 'ArmLowerRight', 'HandLeft', 'HandRight'],
    blurb: 'Shirts, jackets, sleeves, gloves.',
  },
  {
    id: 'pants',
    label: 'PANTS',
    glyph: '\u{1F456}',
    slots: ['Hips', 'LegLeft', 'LegRight'],
    blurb: 'Belts, pants, shorts, skirts.',
  },
  {
    id: 'shoes',
    label: 'SHOES',
    glyph: '\u{1F45F}',
    slots: ['FootLeft', 'FootRight'],
    blurb: 'Boots, sneakers, sandals.',
  },
  {
    id: 'hair',
    label: 'HAIR',
    glyph: '\u{1F488}',
    slots: ['Hair'],
    blurb: 'Cuts, styles, and color volume.',
  },
  {
    id: 'face',
    label: 'FACE',
    glyph: '\u{1F913}',
    slots: ['EyebrowLeft', 'EyebrowRight', 'EarLeft', 'EarRight', 'FacialHair'],
    blurb: 'Brows, ears, beards, sideburns.',
  },
  {
    id: 'hats',
    label: 'HATS',
    glyph: '\u{1F3A9}',
    slots: ['AttachmentHead'],
    blurb: 'Helmets, caps, crowns, masks worn up top.',
  },
  {
    id: 'accessories',
    label: 'ACCESSORIES',
    glyph: '\u{1F392}',
    slots: [
      'AttachmentFace',
      'AttachmentBack',
      'AttachmentHipsFront',
      'AttachmentHipsBack',
      'AttachmentHipsLeft',
      'AttachmentHipsRight',
      'AttachmentShoulderLeft',
      'AttachmentShoulderRight',
      'AttachmentElbowLeft',
      'AttachmentElbowRight',
      'AttachmentKneeLeft',
      'AttachmentKneeRight',
    ],
    blurb: 'Backpacks, belts, pauldrons, knee pads.',
  },
];

// ─── Manifest fetch (shared with ShopScreen) ────────────────────────

const AMG_MANIFEST_URL = 'https://pub-8953453f2512408f9c58656d4ea4e681.r2.dev/manifest.json';

interface AmgManifestPart {
  name: string;
  species: string;
  slot: string;
  file: string;
}

// ─── Catalog component ─────────────────────────────────────────────

interface Props {
  visible: boolean;
  onClose: () => void;
}

type Mode = 'parts' | 'packs';

export function ClothesCatalog({ visible, onClose }: Props) {
  const navigation = useNavigation<any>();
  const ownedOutfits = useCharacterStore((s) => s.ownedOutfits);
  const equippedOutfitId = useCharacterStore((s) => s.equippedOutfitId);
  const equipOutfitPack = useCharacterStore((s) => s.equipOutfitPack);
  const ownedAmgParts = useCharacterStore((s) => s.ownedAmgParts);
  const isAmgPartOwned = useCharacterStore((s) => s.isAmgPartOwned);
  const equipAmgPart = useCharacterStore((s) => s.equipAmgPart);
  const amgCharacter = useCharacterStore((s) => s.amgCharacter);

  const [mode, setMode] = useState<Mode>('parts');
  const [bucket, setBucket] = useState<string>('tops');
  const [speciesFilter, setSpeciesFilter] = useState<'All' | Species>('All');
  const [manifest, setManifest] = useState<AmgManifestPart[] | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    cancelLabel?: string;
    onConfirm: () => void;
  } | null>(null);
  const [equipFlash, setEquipFlash] = useState<string | null>(null);

  // Fetch the AMG manifest once when the modal opens. Same pattern
  // ShopScreen.tsx uses for its (now-removed) Clothes tab.
  useEffect(() => {
    if (!visible || manifest) return;
    let canceled = false;
    (async () => {
      try {
        const r = await fetch(AMG_MANIFEST_URL);
        if (!r.ok) return;
        const data = await r.json();
        if (!canceled) setManifest(data.parts as AmgManifestPart[]);
      } catch {
        // Best-effort — leave manifest null and let the empty state render.
      }
    })();
    return () => { canceled = true; };
  }, [visible, manifest]);

  // Auto-fade equip-flash toast.
  useEffect(() => {
    if (!equipFlash) return;
    const t = setTimeout(() => setEquipFlash(null), 1200);
    return () => clearTimeout(t);
  }, [equipFlash]);

  // ── PARTS view filtering ────────────────────────────────────────
  const activeBucket = SLOT_BUCKETS.find((b) => b.id === bucket) ?? SLOT_BUCKETS[0];

  const partsInBucket = useMemo(() => {
    if (!manifest) return [];
    const allowedSlots = new Set(activeBucket.slots);
    const speciesKey = SPECIES_FILTERS.find((f) => f.id === speciesFilter)?.manifestKey ?? 'All';
    return manifest.filter((p) => {
      if (!allowedSlots.has(p.slot)) return false;
      if (speciesKey !== 'All' && p.species !== speciesKey) return false;
      // Hide starter parts from the catalog — they're already owned by
      // every player, no shopping value to surface them as "FREE."
      if (isStarterPack(packPrefixFromPartName(p.name))) return false;
      return true;
    });
  }, [manifest, activeBucket, speciesFilter]);

  // Sorted: owned-first, then by pack name + variant. Owned-first
  // means the player can immediately confirm "yep that's mine" before
  // browsing locked items.
  const partsSorted = useMemo(() => {
    const arr = [...partsInBucket];
    arr.sort((a, b) => {
      const ao = isAmgPartOwned(a.name) ? 0 : 1;
      const bo = isAmgPartOwned(b.name) ? 0 : 1;
      if (ao !== bo) return ao - bo;
      return a.name.localeCompare(b.name);
    });
    return arr;
  }, [partsInBucket, isAmgPartOwned, ownedAmgParts]);

  // Currently-equipped part in this bucket (if any) — drives the
  // gold-bordered cell highlight in the PARTS grid.
  const equippedSlotsInBucket = useMemo(() => {
    const map: Record<string, string> = {};
    if (!amgCharacter) return map;
    const parts = (amgCharacter as Record<string, unknown>).parts as Record<string, string> | undefined;
    if (!parts) return map;
    for (const slot of activeBucket.slots) {
      if (parts[slot]) map[slot] = parts[slot];
    }
    return map;
  }, [amgCharacter, activeBucket]);

  // ── PARTS view actions ─────────────────────────────────────────
  const handlePartTap = (part: AmgManifestPart) => {
    const owned = isAmgPartOwned(part.name);
    if (owned) {
      haptics.select();
      playSound('whoosh');
      equipAmgPart(part.slot, part.name);
      setEquipFlash(`Equipped ${packMeta(packPrefixFromPartName(part.name)).displayName}`);
      return;
    }
    // Locked AMG part — info modal explaining it's part of an outfit
    // pack found in boxes. (Individual parts are not shard-unlockable
    // in v1; only outfit packs are. The pack containing the part is.)
    const { rarity } = getPartPrice(part.name);
    const pack = packPrefixFromPartName(part.name);
    const meta = packMeta(pack);
    haptics.tap();
    setConfirmDialog({
      title: `${RARITY_LABELS[rarity]} part — locked`,
      message:
        `This part comes from ${meta.displayName ?? 'an outfit pack'}. ` +
        `Open Loot Boxes to find packs — every pack you unlock auto-equips ` +
        `its parts so you can mix and match.`,
      confirmLabel: 'OPEN BOXES',
      cancelLabel: 'Maybe later',
      onConfirm: () => {
        haptics.tap();
        playSound('click');
        onClose();
        navigation.navigate('LootBox');
      },
    });
  };

  // ── PACKS view filtering ───────────────────────────────────────
  const filteredPacks = useMemo(() => {
    if (speciesFilter === 'All') return OUTFIT_SHOP_ITEMS;
    return OUTFIT_SHOP_ITEMS.filter((item) => {
      const meta = OUTFITS[item.id];
      return meta?.species === speciesFilter;
    });
  }, [speciesFilter]);

  const ownedPackCount = useMemo(
    () => OUTFIT_SHOP_ITEMS.filter((item) => ownedOutfits.includes(item.id)).length,
    [ownedOutfits],
  );
  const ownedPartCount = ownedAmgParts.length;

  const handlePackTap = (itemId: string) => {
    const isOwned = ownedOutfits.includes(itemId);
    if (isOwned) {
      haptics.win();
      playSound('click');
      equipOutfitPack(itemId);
      onClose();
      return;
    }
    // Locked pack — same info-or-route flow OutfitsCatalog had before.
    haptics.tap();
    playSound('click');
    onClose();
    navigation.navigate('LootBox');
  };

  // ── Render helpers ──────────────────────────────────────────────
  if (!visible) return null;

  const equippedPackItem = OUTFIT_SHOP_ITEMS.find((it) => it.id === equippedOutfitId);
  const equippedPackMeta = equippedPackItem ? OUTFITS[equippedPackItem.id] : null;
  const equippedPackCover = equippedPackMeta
    ? getPackIcon(OUTFIT_PACK_TO_SIDEKICK[equippedPackMeta.pack])
    : undefined;

  return (
    <PreviewSafeModal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <LinearGradient
          colors={['#0a0e27', '#111b47', '#0a0e27']}
          style={StyleSheet.absoluteFill}
        />

        {/* Header — title + counts + close */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title} accessibilityRole="header">CLOTHES</Text>
            <Text style={styles.subtitle}>
              {mode === 'parts'
                ? 'Shop pieces by slot — mix & match'
                : 'Whole-outfit packs for fast equip'}
            </Text>
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

        {/* Mode toggle — PARTS vs PACKS */}
        <View style={styles.modeRow}>
          <PressScale
            onPress={() => { haptics.tap(); setMode('parts'); }}
            containerStyle={{ flex: 1 }}
            accessibilityRole="tab"
            accessibilityState={{ selected: mode === 'parts' }}
          >
            <View style={[styles.modeChip, mode === 'parts' && styles.modeChipActive]}>
              <Text style={[styles.modeChipText, mode === 'parts' && styles.modeChipTextActive]}>
                {`PARTS  ·  ${ownedPartCount}`}
              </Text>
            </View>
          </PressScale>
          <PressScale
            onPress={() => { haptics.tap(); setMode('packs'); }}
            containerStyle={{ flex: 1 }}
            accessibilityRole="tab"
            accessibilityState={{ selected: mode === 'packs' }}
          >
            <View style={[styles.modeChip, mode === 'packs' && styles.modeChipActive]}>
              <Text style={[styles.modeChipText, mode === 'packs' && styles.modeChipTextActive]}>
                {`PACKS  ·  ${ownedPackCount}/${OUTFIT_SHOP_ITEMS.length}`}
              </Text>
            </View>
          </PressScale>
        </View>

        {/* NOW EQUIPPED banner (always shown — outfit pack is the
            anchor for both modes; PARTS view lets you swap individual
            slots within the equipped pack's body). */}
        {equippedPackItem && equippedPackMeta && (
          <View style={styles.equippedBanner}>
            <View style={styles.equippedBannerSwatch}>
              {equippedPackCover ? (
                <Image source={equippedPackCover} style={styles.equippedBannerCover} resizeMode="contain" />
              ) : (
                <Text style={styles.equippedBannerGlyph}>{'\u{1F455}'}</Text>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.equippedBannerLabel}>NOW WEARING</Text>
              <Text style={styles.equippedBannerName} numberOfLines={1}>
                {`${equippedPackMeta.packLabel} ${String(equippedPackMeta.index).padStart(2, '0')}`}
              </Text>
            </View>
            <View style={[styles.equippedBannerChip, {
              borderColor: RARITY_COLORS[equippedPackItem.rarity as keyof typeof RARITY_COLORS] || '#7f8c8d',
            }]}>
              <Text style={[styles.equippedBannerChipText, {
                color: RARITY_COLORS[equippedPackItem.rarity as keyof typeof RARITY_COLORS] || '#7f8c8d',
              }]}>
                {RARITY_LABELS[equippedPackItem.rarity as keyof typeof RARITY_LABELS] || String(equippedPackItem.rarity).toUpperCase()}
              </Text>
            </View>
          </View>
        )}

        {/* Species filter chips — shared between PARTS and PACKS. */}
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
                accessibilityLabel={`Filter species: ${f.label}`}
              >
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* PARTS-mode bucket chip row */}
        {mode === 'parts' && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.bucketRow}
            style={styles.bucketScroll}
          >
            {SLOT_BUCKETS.map((b) => {
              const active = bucket === b.id;
              return (
                <Pressable
                  key={b.id}
                  onPress={() => { haptics.tap(); setBucket(b.id); }}
                  style={[styles.bucketChip, active && styles.bucketChipActive]}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`Bucket: ${b.label}`}
                >
                  <Text style={styles.bucketChipGlyph}>{b.glyph}</Text>
                  <Text style={[styles.bucketChipText, active && styles.bucketChipTextActive]}>
                    {b.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        {/* Bucket blurb — only in PARTS mode, sets context for the grid below. */}
        {mode === 'parts' && (
          <Text style={styles.bucketBlurb}>{activeBucket.blurb}</Text>
        )}

        {/* Catalog grid */}
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.gridWrap}
          showsVerticalScrollIndicator={false}
        >
          {mode === 'parts' ? (
            <PartsGrid
              parts={partsSorted}
              isOwned={(name: string) => isAmgPartOwned(name)}
              equippedBySlot={equippedSlotsInBucket}
              onTap={handlePartTap}
              loading={!manifest}
            />
          ) : (
            <PacksGrid
              filtered={filteredPacks}
              ownedOutfits={ownedOutfits}
              equippedOutfitId={equippedOutfitId}
              onTap={handlePackTap}
            />
          )}

          {/* Footer CTA — open boxes for more clothes (both modes). */}
          <Pressable
            onPress={() => {
              haptics.tap();
              playSound('click');
              onClose();
              navigation.navigate('LootBox');
            }}
            style={styles.openBagsCta}
            accessibilityRole="button"
            accessibilityLabel="Open boxes to find more clothes"
          >
            <LinearGradient
              colors={['rgba(255,140,0,0.28)', 'rgba(255,80,0,0.18)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.openBagsGradient}
            >
              <Text style={styles.openBagsText}>OPEN BOXES FOR MORE CLOTHES</Text>
              <Text style={styles.openBagsArrow}>{'›'}</Text>
            </LinearGradient>
          </Pressable>
        </ScrollView>

        {/* DONE button */}
        <View style={styles.doneArea}>
          <Pressable
            onPress={() => { haptics.tap(); playSound('click'); onClose(); }}
            style={styles.doneBtn}
            accessibilityRole="button"
            accessibilityLabel="Close clothes catalog"
          >
            <LinearGradient
              colors={['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.05)']}
              style={styles.doneBtnGradient}
            >
              <Text style={styles.doneBtnText}>DONE</Text>
            </LinearGradient>
          </Pressable>
        </View>

        {/* Equip-flash toast */}
        {equipFlash && (
          <View style={styles.equipFlash} pointerEvents="none">
            <Text style={styles.equipFlashText}>{equipFlash}</Text>
          </View>
        )}

        {/* Confirm dialog (locked-part route) */}
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
          onCancel={() => setConfirmDialog(null)}
        />
      </View>
    </PreviewSafeModal>
  );
}

// ─── PartsGrid ──────────────────────────────────────────────────────
//
// 3-col grid of AmgPartCard for the active bucket+species filter.
// Wraps the existing AmgPartCard so the cell visual (Unity thumbnail
// + pack identity + rarity strip) stays consistent with anywhere
// AmgPartCard is rendered.

function PartsGrid({
  parts, isOwned, equippedBySlot, onTap, loading,
}: {
  parts: AmgManifestPart[];
  isOwned: (name: string) => boolean;
  equippedBySlot: Record<string, string>;
  onTap: (part: AmgManifestPart) => void;
  loading: boolean;
}) {
  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator color="#ffb347" size="large" />
        <Text style={styles.loadingText}>Loading parts catalog…</Text>
      </View>
    );
  }
  if (parts.length === 0) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyText}>
          No parts in this slot for the selected species. Try All or another bucket.
        </Text>
      </View>
    );
  }
  return (
    <View style={styles.partsGrid}>
      {parts.map((part) => {
        const owned = isOwned(part.name);
        const isEquipped = equippedBySlot[part.slot] === part.name;
        return (
          <Animated.View
            key={part.name}
            entering={FadeIn.duration(180)}
            style={[styles.partsCellWrap, isEquipped && styles.partsCellEquipped]}
          >
            <AmgPartCard
              partName={part.name}
              owned={owned}
              size="compact"
              onEquip={() => onTap(part)}
              onBuy={() => onTap(part)}
            />
            {isEquipped && (
              <View style={styles.partsCellEquippedPill}>
                <Text style={styles.partsCellEquippedPillText}>EQUIPPED</Text>
              </View>
            )}
          </Animated.View>
        );
      })}
    </View>
  );
}

// ─── PacksGrid ──────────────────────────────────────────────────────
//
// Existing 152-bundle browse — painted Sidekick pack covers, rarity
// chip, IN BAGS pill on locked items. Lifted from OutfitsCatalog
// almost verbatim so behaviour stays the same in PACKS mode.

function PacksGrid({
  filtered, ownedOutfits, equippedOutfitId, onTap,
}: {
  filtered: typeof OUTFIT_SHOP_ITEMS;
  ownedOutfits: string[];
  equippedOutfitId: string;
  onTap: (id: string) => void;
}) {
  return (
    <View style={styles.packsGrid}>
      {filtered.map((item) => {
        const meta = OUTFITS[item.id];
        if (!meta) return null;
        const isOwned = ownedOutfits.includes(item.id);
        const isEquipped = equippedOutfitId === item.id;
        const rarityColor = RARITY_COLORS[item.rarity as keyof typeof RARITY_COLORS] || '#7f8c8d';
        const rarityLabel = RARITY_LABELS[item.rarity as keyof typeof RARITY_LABELS] || String(item.rarity).toUpperCase();
        const sidekickKey = OUTFIT_PACK_TO_SIDEKICK[meta.pack];
        const cover = sidekickKey ? getPackIcon(sidekickKey) : undefined;
        const baseHue = packHue(meta.pack);
        const variantHue = (baseHue + (meta.index - 1) * 45) % 360;
        const variantStrong = `hsl(${variantHue}, 70%, 42%)`;
        const variantSoft = `hsl(${variantHue}, 60%, 22%)`;
        return (
          <PressScale
            key={item.id}
            scaleTo={0.95}
            onPress={() => onTap(item.id)}
            accessibilityRole="button"
            accessibilityLabel={`${meta.packLabel} variant ${meta.index}, ${rarityLabel}, ${isOwned ? (isEquipped ? 'equipped' : 'owned, tap to equip') : 'in bags'}`}
            accessibilityState={{ selected: isEquipped }}
          >
            <Animated.View
              entering={FadeIn.duration(200)}
              style={[
                styles.packCard,
                { borderColor: isEquipped ? colors.coinGold : `${rarityColor}66` },
                !isOwned && styles.packCardLocked,
              ]}
            >
              <View style={[styles.rarityStrip, { backgroundColor: rarityColor }]} />
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
                <Text style={styles.cardVariantIndex}>
                  {String(meta.index).padStart(2, '0')}
                </Text>
              </View>
              <Text style={styles.cardName} numberOfLines={2}>
                {meta.packLabel.toUpperCase()}
              </Text>
              <View style={[styles.rarityChip, { borderColor: rarityColor }]}>
                <Text style={[styles.rarityChipText, { color: rarityColor }]}>
                  {rarityLabel}
                </Text>
              </View>
              {isEquipped ? (
                <View style={[styles.statusPill, { backgroundColor: colors.coinGold }]}>
                  <Text style={styles.equippedPillText}>EQUIPPED</Text>
                </View>
              ) : isOwned ? (
                <Text style={[styles.equipText, { color: rarityColor }]}>TAP TO EQUIP</Text>
              ) : (
                <View style={styles.lockBadge}>
                  <Text style={styles.lockBadgeText}>{'\u{1F512} IN BAGS'}</Text>
                </View>
              )}
            </Animated.View>
          </PressScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1 },

  // ── Header ───────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
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

  // ── Mode toggle ─────────────────────────────────────────────
  modeRow: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 6,
  },
  modeChip: {
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(10,14,32,0.55)',
    alignItems: 'center',
  },
  modeChipActive: {
    borderColor: 'rgba(255,180,90,0.85)',
    backgroundColor: 'rgba(255,140,0,0.20)',
    shadowColor: '#ff8c00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  modeChipText: {
    fontFamily: fonts.heading,
    fontWeight: weight.black,
    fontSize: 11,
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 1.2,
  },
  modeChipTextActive: { color: '#ffffff' },

  // ── NOW WEARING banner ──────────────────────────────────────
  equippedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 12,
    marginTop: 4,
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
  equippedBannerCover: { width: 48, height: 48 },
  equippedBannerGlyph: { fontSize: 26 },
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

  // ── Species filter ─────────────────────────────────────────
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
  },
  filterChipText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 0.6,
  },
  filterChipTextActive: { color: '#ffffff' },

  // ── PARTS bucket row ───────────────────────────────────────
  bucketScroll: {
    flexGrow: 0,
    flexShrink: 0,
    maxHeight: 56,
  },
  bucketRow: {
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 8,
    gap: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  bucketChip: {
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(10,14,32,0.55)',
  },
  bucketChipActive: {
    borderColor: 'rgba(255,180,90,0.85)',
    backgroundColor: 'rgba(255,140,0,0.20)',
    shadowColor: '#ff8c00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  bucketChipGlyph: { fontSize: 16 },
  bucketChipText: {
    fontFamily: fonts.heading,
    fontWeight: weight.black,
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 1.0,
  },
  bucketChipTextActive: { color: '#ffffff' },
  bucketBlurb: {
    paddingHorizontal: 16,
    paddingBottom: 6,
    fontFamily: fonts.body,
    fontWeight: weight.regular,
    fontSize: 11,
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 0.4,
  },

  // ── Scroll area ─────────────────────────────────────────────
  scrollArea: { flex: 1 },
  gridWrap: {
    paddingHorizontal: 8,
    paddingTop: 4,
    paddingBottom: 16,
  },

  // PARTS grid (3-col, AmgPartCard size='compact' which is 96×146)
  partsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    rowGap: 4,
  },
  partsCellWrap: {
    position: 'relative',
  },
  partsCellEquipped: {
    // Glow halo for the currently-equipped card. AmgPartCard already
    // has its own border per rarity; we add an outer halo by tinting
    // the wrapper shadow to gold.
    shadowColor: '#f1c40f',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 12,
    elevation: 8,
  },
  partsCellEquippedPill: {
    position: 'absolute',
    top: 6,
    left: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: '#f1c40f',
    zIndex: 4,
  },
  partsCellEquippedPillText: {
    fontFamily: fonts.body,
    fontWeight: weight.black,
    fontSize: 8,
    color: '#0a0e27',
    letterSpacing: 0.8,
  },

  // PACKS grid (3-col, painted pack covers — same as the prior OutfitsCatalog).
  packsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 8,
  },
  packCard: {
    width: 118,
    borderRadius: 12,
    backgroundColor: 'rgba(10,14,32,0.65)',
    borderWidth: 1.5,
    overflow: 'hidden',
    paddingBottom: 8,
  },
  packCardLocked: { backgroundColor: 'rgba(10,14,32,0.4)' },
  rarityStrip: { height: 3, width: '100%' },
  cardPreview: {
    width: '100%',
    height: 70,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  cardCover: { width: 60, height: 60, zIndex: 1 },
  cardCoverLocked: { opacity: 0.45 },
  cardCoverEmoji: { fontSize: 32, zIndex: 1 },
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
    minHeight: 23,
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

  // ── Loading / empty ─────────────────────────────────────────
  loadingWrap: {
    paddingTop: 60,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 12,
    color: 'rgba(255,180,90,0.7)',
    letterSpacing: 1.2,
  },
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

  // ── Footer CTAs ─────────────────────────────────────────────
  openBagsCta: {
    marginHorizontal: 8,
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
  openBagsArrow: { fontSize: 16, color: '#ffffff' },

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

  // ── Equip flash toast ──────────────────────────────────────
  equipFlash: {
    position: 'absolute',
    bottom: 90,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.78)',
    borderWidth: 1,
    borderColor: 'rgba(255,180,90,0.55)',
    shadowColor: '#ff8c00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  equipFlashText: {
    fontFamily: fonts.heading,
    fontWeight: weight.black,
    fontSize: 12,
    color: '#ffb347',
    letterSpacing: 1.0,
  },
});
