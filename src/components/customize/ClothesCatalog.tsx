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
import { FilterChip } from '../ui/FilterChip';
import { AmgPartPreviewModal } from '../ui/AmgPartPreviewModal';
import { PressScale } from '../animations';
// Engine-lifted UI primitives (2026-05-04 cross-game pivot).
// The Drop4-local copies of VariantGallery, AmgPartCard + the slot
// bucket array were removed; ClothesCatalog now consumes the engine
// versions through drop4CosmeticAdapter — same JSX every AMG game
// renders.
import {
  AmgPartCard,
  VariantGallery,
  DEFAULT_PALETTE,
  DEFAULT_SLOT_BUCKETS,
  type SlotBucket,
  type AmgManifestPart,
} from '@amg/cosmetic-ui';
import { drop4CosmeticAdapter } from '../../services/cosmeticAdapter';
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
import { packMeta, OUTFIT_PACK_TO_SIDEKICK } from '../../data/amgPackMeta';
import {
  subcategoryForPart,
  subcategoriesForBucket,
  type TopBucket,
} from '../../data/partSubcategories';
import { haptics } from '../../services/haptics';
import { playSound } from '../../services/audio';
import { colors } from '../../theme/colors';
import { fonts, weight } from '../../theme/typography';

// ─── Outfit-pack identity helpers ───────────────────────────────────

// OUTFIT_PACK_TO_SIDEKICK lives in amgPackMeta.ts — single source of
// truth shared with ShopScreen.

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

// Slot buckets now come from @amg/cosmetic-ui — see DEFAULT_SLOT_BUCKETS
// imported above. Kept the alias so the existing JSX references
// (SLOT_BUCKETS.find / SLOT_BUCKETS.map) don't have to be renamed
// every site. If a Drop4-specific override is needed later (e.g. an
// extra bucket not present in TTT), define a new array here that
// extends DEFAULT_SLOT_BUCKETS.
const SLOT_BUCKETS: SlotBucket[] = DEFAULT_SLOT_BUCKETS;

// ─── Manifest fetch (shared with ShopScreen) ────────────────────────
//
// `AmgManifestPart` shape now lives in @amg/cosmetic-ui (imported
// above). The R2 URL stays game-local for now since the manifest
// CDN is owned by Drop4's content bucket — when that becomes a
// shared AMG asset the URL moves to @amg/cosmetic-runtime.

const AMG_MANIFEST_URL = 'https://pub-8953453f2512408f9c58656d4ea4e681.r2.dev/manifest.json';

// ─── Catalog component ─────────────────────────────────────────────

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Lock the catalog to a specific slot bucket — used for the HAIR /
   *  FACE / ACCESSORIES destination mounts from the Customize grid.
   *  When set:
   *    · The bucket chip row is hidden (player can't switch buckets)
   *    · The PARTS/PACKS toggle is hidden (PACKS doesn't make sense
   *      for a single-bucket destination — packs are full outfits)
   *    · The header title swaps to the bucket label (HAIR / FACE / etc)
   *  Per AMG_WARDROBE_ARCHITECTURE Phase 1 — splitting hair from
   *  clothes mirrors NBA 2K's barbershop / closet split. */
  lockedBucket?: string;
  /** Optional override title — when lockedBucket is set, shows
   *  e.g. "HAIR" instead of "CLOTHES" in the modal header. Defaults
   *  to the bucket's UPPERCASE label. */
  title?: string;
  /** Optional override subtitle — defaults to the bucket's blurb. */
  subtitle?: string;
}

type Mode = 'parts' | 'packs';

export function ClothesCatalog({ visible, onClose, lockedBucket, title, subtitle }: Props) {
  const navigation = useNavigation<any>();
  const ownedOutfits = useCharacterStore((s) => s.ownedOutfits);
  const equippedOutfitId = useCharacterStore((s) => s.equippedOutfitId);
  const equipOutfitPack = useCharacterStore((s) => s.equipOutfitPack);
  const ownedAmgParts = useCharacterStore((s) => s.ownedAmgParts);
  const isAmgPartOwned = useCharacterStore((s) => s.isAmgPartOwned);
  const equipAmgPart = useCharacterStore((s) => s.equipAmgPart);
  const amgCharacter = useCharacterStore((s) => s.amgCharacter);
  // Per-part unlock timestamp map drives the red NEW ribbon on
  // recently-acquired part cards (queue item: "NEW badge on parts
  // unlocked this week"). 7-day window matches the polish-queue spec.
  const amgPartUnlockedAt = useCharacterStore((s) => s.amgPartUnlockedAt);

  // When lockedBucket is set, force PARTS mode + bucket. PACKS doesn't
  // make sense for hair-only / face-only destinations because packs
  // are full outfits.
  const [mode, setMode] = useState<Mode>('parts');
  const [bucket, setBucket] = useState<string>(lockedBucket ?? 'tops');
  // Sub-category chip — second-level filter inside the top bucket
  // (TOPS → All / Hoodies / Shirts / Jackets / etc.). Resets to 'All'
  // whenever the player switches buckets so they don't end up in
  // weird states (e.g. switch to PANTS while sub-cat says 'Hoodies').
  const [subcategory, setSubcategory] = useState<string>('All');
  // Sync bucket / mode whenever the lockedBucket prop changes — the
  // modal stays mounted between Customize cell taps (controlled via
  // visible), so without this effect a tap on HAIR after browsing
  // CLOTHES (TOPS) would still render TOPS parts. Resets sub-category
  // too since sub-cats are bucket-scoped.
  useEffect(() => {
    if (lockedBucket) {
      setBucket(lockedBucket);
      setMode('parts');
      setSubcategory('All');
    }
  }, [lockedBucket]);
  const [speciesFilter, setSpeciesFilter] = useState<'All' | Species>('All');
  const [manifest, setManifest] = useState<AmgManifestPart[] | null>(null);
  // Manifest fetch error — falls into a "Try Again" state in PartsGrid
  // so players never see infinite loading on a flaky network. Bumps a
  // refetch trigger to retry without re-mounting the modal.
  const [manifestError, setManifestError] = useState(false);
  const [manifestRetry, setManifestRetry] = useState(0);
  const [equipFlash, setEquipFlash] = useState<string | null>(null);

  // Variant Gallery state — opens when the player taps VARIANTS in
  // the dressing-room mirror modal. Shows all colorways for the part.
  const [galleryPart, setGalleryPart] = useState<{ name: string; slot: string } | null>(null);

  // Dressing-room mirror state — opens when the player taps any part
  // card (owned OR locked). Shows their character with the part
  // swapped in. Action row composes from owned/locked/equipped state.
  // First-tap UX, per AMG_WARDROBE_ARCHITECTURE.md Phase 1.
  const [previewPart, setPreviewPart] = useState<{ name: string; slot: string } | null>(null);

  // Fetch the AMG manifest once when the modal opens. Falls into the
  // PartsGrid error state on failure so players see "Try Again" instead
  // of an infinite loading spinner.
  useEffect(() => {
    if (!visible || manifest) return;
    let canceled = false;
    setManifestError(false);
    (async () => {
      try {
        const r = await fetch(AMG_MANIFEST_URL);
        if (!r.ok) {
          if (!canceled) setManifestError(true);
          return;
        }
        const data = await r.json();
        if (!canceled) setManifest(data.parts as AmgManifestPart[]);
      } catch {
        if (!canceled) setManifestError(true);
      }
    })();
    return () => { canceled = true; };
  }, [visible, manifest, manifestRetry]);

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
      // Paired-slot collapse for FACE bucket (audit Fix 5). Brows and
      // ears are mirror pairs — players always equip both at once. So
      // we hide the right-side mate (EyebrowRight, EarRight) and let
      // the left card represent the pair. The equip handler then
      // dual-equips the right side automatically. Drops face card
      // count from ~12 to ~6 — the bucket suddenly reads as "6 brow
      // styles" instead of "12 confusingly-similar brow halves."
      if (bucket === 'face' && (p.slot === 'EyebrowRight' || p.slot === 'EarRight')) {
        return false;
      }
      // Sub-category filter — when active sub-cat is anything other
      // than 'All', drop parts whose computed sub-category doesn't
      // match. The sub-cat is computed via partSubcategories.ts which
      // tags by pack (Modern Civilians = Hoodies, Fantasy Knights =
      // Armor, etc.).
      if (subcategory !== 'All') {
        const sub = subcategoryForPart(p.name, p.slot);
        if (sub !== subcategory) return false;
      }
      return true;
    });
  }, [manifest, activeBucket, bucket, speciesFilter, subcategory]);

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
  // Dressing-room mirror UX (AMG_WARDROBE_ARCHITECTURE.md Phase 1):
  // EVERY part tap — owned or locked — opens the on-character preview
  // modal first. Player sees their character wearing this part before
  // committing. Modal action row composes based on ownership:
  //   · Owned: VARIANTS + WEAR (or WEARING ✓ if already equipped)
  //   · Locked: GET FROM BAGS (routes to LootBox)
  // Replaces the previous "owned → variant gallery, locked → confirm
  // dialog" split which forced the player to commit before seeing.
  const handlePartTap = (part: AmgManifestPart) => {
    haptics.tap();
    playSound('click');
    setPreviewPart({ name: part.name, slot: part.slot });
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

        {/* Header — title + counts + close. When locked to a bucket
            (HAIR / FACE / ACCESSORIES from the Customize hub), the
            title swaps to the bucket label so the modal reads as a
            dedicated destination shop. */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title} accessibilityRole="header">
              {title ?? 'CLOTHES'}
            </Text>
            <Text style={styles.subtitle}>
              {subtitle ?? (
                mode === 'parts'
                  ? 'Shop pieces by slot — mix & match'
                  : 'Whole-outfit packs for fast equip'
              )}
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

        {/* Mode toggle — PARTS vs PACKS. Hidden when locked to a single
            bucket (HAIR / FACE) since PACKS is for full outfits and
            doesn't make sense for a single-slot destination. */}
        {!lockedBucket && (
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
        )}

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

        {/* Species filter chips — shared between PARTS and PACKS. Uses
            the cross-screen FilterChip primitive so the visual treatment
            matches the Shop, MatchHistory, and CategoryBrowser filter
            rows. (Cohesion pass 2026-05-04.) */}
        {/* Wrap each horizontal filter row with a right-edge fade so
            players see "more pills →" affordance — same pattern as
            the Shop's Daily Deals scroller. AAA polish 2026-05-05. */}
        <View style={styles.scrollFadeWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
          style={styles.filterScroll}
        >
          {SPECIES_FILTERS.map((f) => (
            <FilterChip
              key={f.id}
              label={f.label}
              active={speciesFilter === f.id}
              onPress={() => setSpeciesFilter(f.id)}
            />
          ))}
        </ScrollView>
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(10,14,32,0)', 'rgba(10,14,32,0.85)']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.scrollFade}
        />
        </View>

        {/* PARTS-mode bucket chip row. Hidden when the catalog is
            locked to a single bucket (HAIR / FACE / ACCESSORIES
            destinations from the Customize hub) — the modal is
            already scoped, no need to let the player jump out. */}
        {mode === 'parts' && !lockedBucket && (
          <View style={styles.scrollFadeWrap}>
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
                  onPress={() => {
                    haptics.tap();
                    setBucket(b.id);
                    // Reset sub-cat when bucket changes — sub-cats are
                    // bucket-scoped (PANTS doesn't have "Hoodies").
                    setSubcategory('All');
                  }}
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
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(10,14,32,0)', 'rgba(10,14,32,0.85)']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.scrollFade}
          />
          </View>
        )}

        {/* Sub-category chip row — only in PARTS mode, second-level
            drill-down (TOPS → All / Hoodies / Shirts / Jackets / …).
            Per Devon's GTA-style vision: shop by silhouette inside
            the bucket, not just by raw slot. */}
        {mode === 'parts' && (
          <View style={styles.scrollFadeWrap}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.subcatRow}
            style={styles.subcatScroll}
          >
            {subcategoriesForBucket(bucket as TopBucket).map((sub) => {
              const active = subcategory === sub;
              return (
                <Pressable
                  key={sub}
                  onPress={() => { haptics.tap(); setSubcategory(sub); }}
                  style={[styles.subcatChip, active && styles.subcatChipActive]}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`Sub-category: ${sub}`}
                >
                  <Text style={[styles.subcatChipText, active && styles.subcatChipTextActive]}>
                    {sub}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(10,14,32,0)', 'rgba(10,14,32,0.85)']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.scrollFade}
          />
          </View>
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
              loading={!manifest && !manifestError}
              error={manifestError}
              onRetry={() => {
                haptics.tap();
                playSound('click');
                setManifestError(false);
                setManifestRetry((n) => n + 1);
              }}
              unlockedAt={amgPartUnlockedAt}
              isFaceBucket={bucket === 'face'}
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
            {/* Solid amber gradient matches the OPEN BOXES hero CTA on
                the Customize tab — same warm-orange treatment so the
                player reads "this routes to the same place." Was a
                ghostly low-alpha tint that didn't read as a real CTA. */}
            <LinearGradient
              colors={['#ffce63', '#ff9a2c', '#e87617', '#b85c0e']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
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

        {/* Dressing-room mirror — first-tap modal showing the player
            wearing this part. Owned parts get [VARIANTS][WEAR];
            locked parts get [GET FROM BAGS]. Per AMG_WARDROBE_ARCHITECTURE
            Phase 1 — replaces the old "tap-to-instantly-equip-or-route"
            split that forced commitment before preview. */}
        {previewPart && (() => {
          const owned = isAmgPartOwned(previewPart.name);
          const equippedAtSlot = amgCharacter
            ? (amgCharacter as unknown as { parts?: Record<string, string> }).parts?.[previewPart.slot]
            : undefined;
          const isCurrentlyEquipped = equippedAtSlot === previewPart.name;
          // Pair-collapse label override for the modal header — same
          // logic as the card's slotLabelOverride. When the player
          // tapped a BROW L card representing the brow pair, the modal
          // should also read "BROWS" not "BROW L" so the header
          // matches the card.
          const slotLabelOverride = bucket === 'face'
            ? previewPart.slot === 'EyebrowLeft' ? 'BROWS'
            : previewPart.slot === 'EarLeft'    ? 'EARS'
            : undefined
            : undefined;
          return (
            <AmgPartPreviewModal
              visible={true}
              partName={previewPart.name}
              slot={previewPart.slot}
              canAfford={true}
              slotLabelOverride={slotLabelOverride}
              onClose={() => setPreviewPart(null)}
              onBuy={() => {
                setPreviewPart(null);
                onClose();
                navigation.navigate('LootBox');
              }}
              {...(owned
                ? {
                    onEquip: () => {
                      const partName = previewPart.name;
                      const slot = previewPart.slot;
                      // Equip with current variant (default if none chosen).
                      const variantId = useCharacterStore.getState()
                        .equippedPartVariant[partName] ?? '';
                      useCharacterStore.getState().equipPartVariant(slot, partName, variantId);
                      // Paired-slot dual-equip (audit Fix 5). When the
                      // tapped card represents a brow / ear pair, also
                      // equip the right-side mate so the character
                      // ends up with a matched pair instead of one
                      // brow + one stray. The right-side part name is
                      // a name-substitution of the left: 03EBRL→04EBRR
                      // and 07EARL→08EARR. Same variant id so the
                      // colorways stay in sync.
                      if (slot === 'EyebrowLeft') {
                        const rightName = partName.replace('_03EBRL_', '_04EBRR_');
                        if (rightName !== partName) {
                          useCharacterStore.getState()
                            .equipPartVariant('EyebrowRight', rightName, variantId);
                        }
                      } else if (slot === 'EarLeft') {
                        const rightName = partName.replace('_07EARL_', '_08EARR_');
                        if (rightName !== partName) {
                          useCharacterStore.getState()
                            .equipPartVariant('EarRight', rightName, variantId);
                        }
                      }
                      const packDisplay = packMeta(packPrefixFromPartName(partName)).displayName;
                      setEquipFlash(`Equipped ${packDisplay}`);
                      setPreviewPart(null);
                    },
                    onOpenVariants: () => {
                      const partRef = previewPart;
                      setPreviewPart(null);
                      // Defer to next tick so the close animation runs
                      // before the gallery slides up.
                      setTimeout(() => setGalleryPart(partRef), 80);
                    },
                    isCurrentlyEquipped,
                  }
                : { lockedActionLabel: 'GET FROM BAGS' })}
            />
          );
        })()}

        {/* Variant Gallery — Goku transformations modal, lifted to
            @amg/cosmetic-ui for cross-game reuse. Drop4 wires the
            adapter (drop4CosmeticAdapter) + game-specific equip/route
            callbacks; the engine package owns all the JSX. */}
        <VariantGallery
          visible={galleryPart !== null}
          partName={galleryPart?.name ?? ''}
          slot={galleryPart?.slot ?? ''}
          adapter={drop4CosmeticAdapter}
          palette={DEFAULT_PALETTE}
          onEquip={(name, slot, variantId) => {
            // Wire to Drop4's variant-aware equip action. The engine
            // already closes the modal in its own onEquip handler.
            useCharacterStore.getState().equipPartVariant(slot, name, variantId);
            setEquipFlash(`Equipped ${packMeta(packPrefixFromPartName(name)).displayName}`);
          }}
          onLockedTap={() => {
            // Locked colorway → route to LootBox (same flow as locked
            // base-part). Once the lootbox mints variant-id drops the
            // route can preload the destination box / shard cost.
            setGalleryPart(null);
            navigation.navigate('LootBox');
          }}
          onClose={() => setGalleryPart(null)}
          hooks={{
            onTap: haptics.tap,
            onSelect: haptics.select,
            onError: haptics.error,
            playClick: () => playSound('click'),
            playWhoosh: () => playSound('whoosh'),
          }}
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
  parts, isOwned, equippedBySlot, onTap, loading, error, onRetry, unlockedAt,
  isFaceBucket,
}: {
  parts: AmgManifestPart[];
  isOwned: (name: string) => boolean;
  equippedBySlot: Record<string, string>;
  onTap: (part: AmgManifestPart) => void;
  loading: boolean;
  /** True when the manifest fetch failed. Shows a Try Again CTA
   *  instead of an infinite loading spinner. */
  error: boolean;
  /** Called when the player taps Try Again on the error state. */
  onRetry: () => void;
  /** Map of partName → ms-since-epoch when the part was unlocked.
   *  Used to drive the red NEW ribbon on cards unlocked in the last
   *  7 days. */
  unlockedAt: Record<string, number>;
  /** When true, brow-left and ear-left cards are pair representatives
   *  (right-side mates filtered out upstream). Switches their
   *  displayed slot label from "BROW L" / "EAR L" to "BROWS" / "EARS"
   *  so the card reads as the pair the player is actually equipping.
   *  Per docs/CUSTOMIZE_VISUAL_AUDIT_2026-05-04.md Fix 5. */
  isFaceBucket: boolean;
}) {
  // 7-day "newness" window — matches the polish-queue spec. Computed
  // once per render of the grid, not per-card, so the cutoff doesn't
  // drift while the user scrolls.
  const NEW_CUTOFF_MS = 7 * 24 * 60 * 60 * 1000;
  const newCutoff = Date.now() - NEW_CUTOFF_MS;
  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator color="#ffb347" size="large" />
        <Text style={styles.loadingText}>Loading parts catalog…</Text>
      </View>
    );
  }
  if (error) {
    return (
      <View style={styles.loadingWrap}>
        <Text style={styles.errorIcon}>{'\u{26A0}\u{FE0F}'}</Text>
        <Text style={styles.loadingText}>
          Couldn't reach the parts catalog. Check your connection and try again.
        </Text>
        <Pressable
          onPress={onRetry}
          style={styles.retryBtn}
          accessibilityRole="button"
          accessibilityLabel="Try fetching the parts catalog again"
        >
          <LinearGradient
            colors={['#ffce63', '#ff9a2c', '#e87617', '#b85c0e']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.retryBtnGradient}
          >
            <Text style={styles.retryBtnText}>TRY AGAIN</Text>
          </LinearGradient>
        </Pressable>
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
        // Red NEW ribbon for parts unlocked within the 7-day window.
        // Locked parts never show NEW (no unlock timestamp).
        const ts = unlockedAt[part.name];
        const isNew = owned && typeof ts === 'number' && ts >= newCutoff;
        // Pair-collapse label override for FACE bucket. Brow L / Ear L
        // cards are now pair representatives — relabel as the pair so
        // the slot tag matches the equip semantics. Other slots fall
        // through to the engine default (slotLabel(partName)).
        const slotLabelOverride = isFaceBucket
          ? part.slot === 'EyebrowLeft' ? 'BROWS'
          : part.slot === 'EarLeft'    ? 'EARS'
          : undefined
          : undefined;
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
              adapter={drop4CosmeticAdapter}
              onEquip={() => onTap(part)}
              onBuy={() => onTap(part)}
              hooks={{ playClick: () => playSound('click') }}
              isNew={isNew}
              slotLabelOverride={slotLabelOverride}
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

  // Wrapper for any horizontal filter ScrollView so we can stack a
  // right-edge fade gradient on top — players see "more pills →"
  // without needing to swipe to discover. Same pattern Shop's
  // Daily Deals uses.
  scrollFadeWrap: { position: 'relative' },
  scrollFade: {
    position: 'absolute',
    top: 0, bottom: 0, right: 0,
    width: 28,
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
  // filterChip styles moved to FilterChip shared component (cohesion
  // pass 2026-05-04 — every filter row across Drop4 uses the same chip
  // visual now: Shop, MatchHistory, ClothesCatalog, CategoryBrowser).

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

  // Sub-category chip row — sits BETWEEN the top buckets (TOPS / PANTS)
  // and the grid. Smaller, lower-contrast than top buckets so the
  // visual hierarchy reads as bucket > sub-cat > grid.
  subcatScroll: {
    flexGrow: 0,
    flexShrink: 0,
    maxHeight: 36,
  },
  subcatRow: {
    paddingHorizontal: 12,
    paddingTop: 2,
    paddingBottom: 4,
    gap: 5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  subcatChip: {
    height: 26,
    paddingHorizontal: 11,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(10,14,32,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subcatChipActive: {
    borderColor: 'rgba(255,180,90,0.7)',
    backgroundColor: 'rgba(255,140,0,0.14)',
  },
  subcatChipText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 10,
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 0.6,
  },
  subcatChipTextActive: { color: '#ffffff' },

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

  // ── Loading / error / empty ─────────────────────────────────
  loadingWrap: {
    paddingTop: 60,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 12,
    color: 'rgba(255,180,90,0.7)',
    letterSpacing: 1.2,
    textAlign: 'center',
    lineHeight: 18,
  },
  errorIcon: {
    fontSize: 32,
    marginBottom: 4,
  },
  retryBtn: {
    marginTop: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  retryBtnGradient: {
    paddingHorizontal: 28,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255,210,120,0.85)',
  },
  retryBtnText: {
    fontFamily: fonts.heading,
    fontWeight: weight.black,
    fontSize: 13,
    color: '#ffffff',
    letterSpacing: 1.4,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
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
    borderWidth: 1.5,
    borderColor: 'rgba(255,210,120,0.85)',
    borderRadius: 14,
  },
  openBagsText: {
    fontFamily: fonts.heading,
    fontWeight: weight.black,
    fontSize: 13,
    color: '#ffffff',
    letterSpacing: 1.4,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  openBagsArrow: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
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
