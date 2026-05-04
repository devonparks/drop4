/**
 * VariantGallery — "Goku transformations" page for a single AMG part.
 *
 * Pivot 2026-05-04 (Path A from the variant economy decision):
 * each clothing part can have N color variants. Tap a part card in
 * ClothesCatalog and this modal opens — same base part, all known
 * colorways laid out in a grid. Owned variants are lit up + tappable
 * to equip. Locked variants are silhouetted + tap → LootBox.
 *
 * Reference: GTA Online's clothing screen (variant carousel under the
 * preview), Marvel Snap's "card variants" page (grid of art treatments
 * for the same card), NBA 2K's shoe colorways.
 *
 * Data state (tonight):
 *   - Unity hasn't rendered per-variant thumbnails yet — that's a
 *     background batch waiting on the Drop4Exporter colorway loop.
 *   - For each part the gallery shows a small synthetic palette (8
 *     swatches) so the UI is shippable today even with placeholder
 *     visuals. Once Unity renders, this grid swaps to painted PNGs
 *     keyed by `${partName}__${variantId}.png`.
 *
 * Variant id scheme:
 *   '' (DEFAULT_VARIANT_ID) — the as-rendered Synty default colorway.
 *                              Always owned when the base part is owned.
 *   'red' / 'cyan' / 'gold' / 'camo' / etc. — color-slug variants.
 *                              Lootbox drops these as unique items.
 */
import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { PreviewSafeModal } from '../ui/PreviewSafeModal';
import { PressScale } from '../animations';
import { DEFAULT_VARIANT_ID, useCharacterStore } from '../../stores/characterStore';
import { getPartThumb } from '../../data/partThumbs';
import { packMeta } from '../../data/amgPackMeta';
import {
  RARITY_COLORS,
  RARITY_LABELS,
  packPrefixFromPartName,
  getPartPrice,
} from '../../data/amgPartPricing';
import { haptics } from '../../services/haptics';
import { playSound } from '../../services/audio';
import { fonts, weight } from '../../theme/typography';

// ─── Variant palette ────────────────────────────────────────────────
//
// Devon's vision is "every clothing has variants like Goku's
// transformations." Until Unity finishes the per-variant render
// batch, we ship a synthetic palette of 8 colorways per part. The
// palette is identical for every part so players can tell at a
// glance "I own the Red one" across their wardrobe.
//
// The variant ids are stable strings the lootbox uses as drop ids;
// adding more here is the first step in expanding the economy.

export interface VariantDef {
  id: string;
  label: string;
  color: string;
  /** When true, this variant is reserved for legendary drops only.
   *  Drives the small chip + the lootbox drop tables once wired. */
  premium?: boolean;
}

export const DEFAULT_PALETTE: VariantDef[] = [
  { id: '',       label: 'Default', color: '#7f8c8d' },          // always owned with base part
  { id: 'red',    label: 'Crimson', color: '#e63946' },
  { id: 'cyan',   label: 'Cyan',    color: '#2ec4b6' },
  { id: 'amber',  label: 'Amber',   color: '#ffb347' },
  { id: 'navy',   label: 'Navy',    color: '#1a3060' },
  { id: 'lime',   label: 'Lime',    color: '#9acb3c' },
  { id: 'rose',   label: 'Rose',    color: '#e07a5f' },
  { id: 'gold',   label: 'Gold',    color: '#f1c40f', premium: true },
  { id: 'camo',   label: 'Camo',    color: '#3d4a26', premium: true },
  { id: 'neon',   label: 'Neon',    color: '#ff00ff', premium: true },
];

interface Props {
  /** True to show the modal. */
  visible: boolean;
  /** The part being inspected. Empty string = no part = modal hidden. */
  partName: string;
  /** Slot the part lives in — needed for equip calls. */
  slot: string;
  onClose: () => void;
  /** Optional callback fired after the player equips a variant. The
   *  catalog can use this to flash a toast or refresh its grid. */
  onEquipped?: (partName: string, variantId: string) => void;
  /** Optional callback fired when the player taps a locked variant.
   *  The catalog can route to LootBox or surface a confirm dialog
   *  with shard-unlock options. */
  onLockedVariantTap?: (partName: string, variantId: string) => void;
}

export function VariantGallery({
  visible, partName, slot, onClose, onEquipped, onLockedVariantTap,
}: Props) {
  const isPartVariantOwned = useCharacterStore((s) => s.isPartVariantOwned);
  const equipPartVariant = useCharacterStore((s) => s.equipPartVariant);
  const equippedPartVariant = useCharacterStore((s) => s.equippedPartVariant);
  const isAmgPartOwned = useCharacterStore((s) => s.isAmgPartOwned);

  // Resolve metadata for the part — pack, rarity, painted thumb.
  const metadata = useMemo(() => {
    if (!partName) return null;
    const pack = packPrefixFromPartName(partName);
    const meta = packMeta(pack);
    const { rarity } = getPartPrice(partName);
    return {
      pack,
      meta,
      rarity,
      rarityColor: (RARITY_COLORS as Record<string, string>)[rarity] ?? '#7f8c8d',
      rarityLabel: (RARITY_LABELS as Record<string, string>)[rarity] ?? rarity.toUpperCase(),
      thumb: getPartThumb(partName),
    };
  }, [partName]);

  if (!visible || !partName || !metadata) return null;

  const partOwned = isAmgPartOwned(partName);
  const currentlyEquippedVariant = equippedPartVariant[partName] ?? DEFAULT_VARIANT_ID;
  const ownedCount = DEFAULT_PALETTE.filter((v) => isPartVariantOwned(partName, v.id)).length;

  const handleVariantTap = (variant: VariantDef) => {
    const owned = isPartVariantOwned(partName, variant.id);
    if (owned) {
      haptics.select();
      playSound('whoosh');
      equipPartVariant(slot, partName, variant.id);
      onEquipped?.(partName, variant.id);
      onClose();
      return;
    }
    haptics.tap();
    onLockedVariantTap?.(partName, variant.id);
  };

  return (
    <PreviewSafeModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Animated.View entering={FadeIn.duration(180)} style={styles.overlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Close variant gallery"
        />
        <Animated.View
          entering={ZoomIn.springify().damping(14)}
          style={[styles.card, { borderColor: metadata.rarityColor }]}
        >
          {/* Painted top-edge accent — rarity color */}
          <View style={[styles.rarityStrip, { backgroundColor: metadata.rarityColor }]} />

          {/* Hero row — large painted Unity thumb + identity */}
          <View style={styles.heroRow}>
            <View style={styles.thumbWrap}>
              {metadata.thumb ? (
                <Image source={metadata.thumb} style={styles.thumb} resizeMode="contain" />
              ) : (
                <Text style={styles.thumbFallback}>{'\u{1F455}'}</Text>
              )}
              {/* Currently-equipped variant tint disc behind the thumb. */}
              <View
                pointerEvents="none"
                style={[styles.equippedTint, {
                  backgroundColor: DEFAULT_PALETTE.find((v) => v.id === currentlyEquippedVariant)?.color ?? 'transparent',
                }]}
              />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[styles.identityRarity, { color: metadata.rarityColor }]}>
                {metadata.rarityLabel}
              </Text>
              <Text style={styles.identityName} numberOfLines={2}>
                {metadata.meta.displayName}
              </Text>
              <Text style={styles.identityCount}>
                {`${ownedCount} / ${DEFAULT_PALETTE.length} colors owned`}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Close variant gallery"
            >
              <Text style={styles.closeBtnText}>×</Text>
            </Pressable>
          </View>

          {/* Variant gallery grid — Goku transformations style */}
          <Text style={styles.galleryTitle}>COLORWAYS</Text>
          <ScrollView
            contentContainerStyle={styles.galleryGrid}
            showsVerticalScrollIndicator={false}
            style={{ maxHeight: 380 }}
          >
            {DEFAULT_PALETTE.map((variant, i) => {
              const owned = isPartVariantOwned(partName, variant.id);
              const isCurrent = currentlyEquippedVariant === variant.id;
              const isDefault = variant.id === DEFAULT_VARIANT_ID;
              return (
                <PressScale
                  key={variant.id || 'default'}
                  onPress={() => handleVariantTap(variant)}
                  scaleTo={0.94}
                  containerStyle={styles.variantCellOuter}
                  accessibilityRole="button"
                  accessibilityLabel={`${variant.label} colorway, ${owned ? (isCurrent ? 'equipped' : 'owned, tap to equip') : 'locked'}`}
                  accessibilityState={{ selected: isCurrent }}
                >
                  <Animated.View
                    entering={FadeIn.delay(40 + i * 30).duration(180)}
                    style={[
                      styles.variantCell,
                      isCurrent && styles.variantCellEquipped,
                      !owned && styles.variantCellLocked,
                    ]}
                  >
                    {/* Color disc — for now a flat tinted circle. Once
                        Unity ships per-variant thumbs this becomes the
                        painted PNG render of the part in this color. */}
                    <View style={styles.variantDiscWrap}>
                      <LinearGradient
                        colors={[shade(variant.color, 1.4), variant.color, shade(variant.color, 0.7)]}
                        start={{ x: 0.3, y: 0 }}
                        end={{ x: 0.7, y: 1 }}
                        style={[
                          styles.variantDisc,
                          !owned && { opacity: 0.4 },
                        ]}
                      />
                      {!owned && (
                        <Text style={styles.variantLockGlyph}>{'\u{1F512}'}</Text>
                      )}
                      {variant.premium && (
                        <View style={styles.premiumBadge}>
                          <Text style={styles.premiumBadgeText}>{'★'}</Text>
                        </View>
                      )}
                    </View>
                    <Text
                      style={[
                        styles.variantLabel,
                        !owned && styles.variantLabelLocked,
                        isCurrent && { color: '#f1c40f' },
                      ]}
                      numberOfLines={1}
                    >
                      {isDefault ? 'Default' : variant.label}
                    </Text>
                    {isCurrent ? (
                      <Text style={styles.variantStatusEquipped}>EQUIPPED</Text>
                    ) : owned ? (
                      <Text style={styles.variantStatusOwned}>TAP TO WEAR</Text>
                    ) : (
                      <Text style={styles.variantStatusLocked}>IN BAGS</Text>
                    )}
                  </Animated.View>
                </PressScale>
              );
            })}
          </ScrollView>

          {/* Footer — owned/total + helper hint about variant origin */}
          <View style={styles.footer}>
            <Text style={styles.footerHint}>
              {partOwned
                ? 'Tap a colorway to wear it. Locked colors drop from boxes.'
                : 'Unlock the base part first. Colors drop alongside it.'}
            </Text>
          </View>
        </Animated.View>
      </Animated.View>
    </PreviewSafeModal>
  );
}

/** Lighten/darken a hex color by a multiplier. Inline so the gallery
 *  doesn't reach into the catalog's swatch helpers. */
function shade(hex: string, mult: number): string {
  const m = hex.match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) return hex;
  const adj = (h: string) => {
    const v = Math.min(255, Math.max(0, Math.round(parseInt(h, 16) * mult)));
    return v.toString(16).padStart(2, '0');
  };
  return `#${adj(m[1])}${adj(m[2])}${adj(m[3])}`;
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.78)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#0d1030',
    borderRadius: 18,
    borderWidth: 1.5,
    overflow: 'hidden',
    paddingBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 18,
  },
  rarityStrip: {
    height: 4,
    width: '100%',
  },

  // Hero
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 10,
  },
  thumbWrap: {
    width: 88,
    height: 88,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumb: {
    width: 80,
    height: 80,
  },
  thumbFallback: {
    fontSize: 36,
    color: 'rgba(255,255,255,0.5)',
  },
  equippedTint: {
    position: 'absolute',
    width: 88,
    height: 88,
    borderRadius: 14,
    opacity: 0.18,
  },
  identityRarity: {
    fontFamily: fonts.body,
    fontWeight: weight.black,
    fontSize: 10,
    letterSpacing: 1.6,
  },
  identityName: {
    fontFamily: fonts.heading,
    fontWeight: weight.black,
    fontSize: 18,
    color: '#ffffff',
    letterSpacing: 0.6,
  },
  identityCount: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 11,
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 0.4,
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

  // Gallery
  galleryTitle: {
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 6,
    fontFamily: fonts.heading,
    fontWeight: weight.black,
    fontSize: 11,
    color: 'rgba(255,180,90,0.85)',
    letterSpacing: 1.6,
  },
  galleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    paddingHorizontal: 8,
    paddingBottom: 6,
    gap: 4,
  },
  variantCellOuter: {
    width: '24%',
  },
  variantCell: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    gap: 4,
  },
  variantCellEquipped: {
    borderColor: '#f1c40f',
    borderWidth: 1.5,
    backgroundColor: 'rgba(241,196,15,0.10)',
    shadowColor: '#f1c40f',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 6,
  },
  variantCellLocked: {
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  variantDiscWrap: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  variantDisc: {
    width: 46,
    height: 46,
    borderRadius: 23,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  variantLockGlyph: {
    position: 'absolute',
    fontSize: 16,
    color: 'rgba(255,255,255,0.85)',
  },
  premiumBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#f1c40f',
    borderWidth: 1.5,
    borderColor: '#0d1030',
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumBadgeText: {
    fontFamily: fonts.body,
    fontWeight: weight.black,
    fontSize: 10,
    color: '#0d1030',
    lineHeight: 12,
  },
  variantLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 10,
    color: '#ffffff',
    letterSpacing: 0.3,
  },
  variantLabelLocked: {
    color: 'rgba(255,255,255,0.4)',
  },
  variantStatusEquipped: {
    fontFamily: fonts.body,
    fontWeight: weight.black,
    fontSize: 7,
    color: '#f1c40f',
    letterSpacing: 0.8,
  },
  variantStatusOwned: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 7,
    color: '#ffb347',
    letterSpacing: 0.8,
  },
  variantStatusLocked: {
    fontFamily: fonts.body,
    fontWeight: weight.black,
    fontSize: 7,
    color: 'rgba(255,180,90,0.6)',
    letterSpacing: 0.8,
  },

  // Footer
  footer: {
    paddingHorizontal: 14,
    paddingTop: 8,
  },
  footerHint: {
    fontFamily: fonts.body,
    fontWeight: weight.regular,
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 0.3,
    textAlign: 'center',
    lineHeight: 14,
  },
});
