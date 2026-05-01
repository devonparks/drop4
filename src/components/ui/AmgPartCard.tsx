// ═══════════════════════════════════════════════════════════════════════
// AmgPartCard — shop thumbnail for a single Sidekick part
//
// Purely presentational + a single onBuy callback. Keeps the part
// lookup (ownership, coin balance, confirm dialog) in whatever screen
// mounts the card — typically ShopScreen or CollectionScreen — so this
// stays reusable.
//
// Visual: pack-colored square with the pack emoji + rarity badge + part
// variant number. Owned parts show a green OWNED chip; unowned show the
// price. Pressing a locked card fires onBuy(partName); pressing an
// owned card fires onEquip(partName). Parent decides what to do.
// ═══════════════════════════════════════════════════════════════════════

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Platform, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { PressScale } from '../animations';
import {
  getPartPrice,
  RARITY_COLORS,
  RARITY_LABELS,
} from '../../data/amgPartPricing';
import { packMeta } from '../../data/amgPackMeta';
import { getPackIcon } from '../../data/cosmeticIcons';
import { getPartThumb } from '../../data/partThumbs';
import { playSound } from '../../services/audio';
import { colors } from '../../theme/colors';
import { fonts, weight } from '../../theme/typography';

/** Translate a Sidekick slot code → human-readable label that sells what
 *  the player is actually equipping. The previous card relied on a tiny
 *  emoji for slot identity — Devon called this out as unreadable. The
 *  short label fits in 6-7 chars and reads at a glance even at 96px. */
const SLOT_LABEL: Record<string, string> = {
  '01HEAD': 'HEAD',
  '02HAIR': 'HAIR',
  '03EBRL': 'BROW L', '04EBRR': 'BROW R',
  '05EYEL': 'EYE L',  '06EYER': 'EYE R',
  '07EARL': 'EAR L',  '08EARR': 'EAR R',
  '09FCHR': 'BEARD',
  '10TORS': 'TORSO',
  '11AUPL': 'ARM UL', '12AUPR': 'ARM UR',
  '13ALWL': 'ARM LL', '14ALWR': 'ARM LR',
  '15HNDL': 'HAND L', '16HNDR': 'HAND R',
  '17HIPS': 'HIPS',
  '18LEGL': 'LEG L',  '19LEGR': 'LEG R',
  '20FOTL': 'FOOT L', '21FOTR': 'FOOT R',
  '22AHED': 'HELM',   '23AFAC': 'MASK',
  '24ABAC': 'BACK',
  '25AHPF': 'HIP F',  '26AHPB': 'HIP B',
  '27AHPL': 'HIP SL', '28AHPR': 'HIP SR',
  '29ASHL': 'PAULDRN', '30ASHR': 'PAULDRN',
  '31ELOL': 'ELBOW',  '32ELOR': 'ELBOW',
  '33AKNL': 'KNEE',
  '35NOSE': 'NOSE',
  '36TETH': 'TEETH',
  '37TONG': 'TONGUE',
};
function slotLabel(partName: string): string {
  const m = partName.match(/_(\d{2}[A-Z]+)_/);
  const code = m?.[1];
  return (code && SLOT_LABEL[code]) || 'PART';
}

interface AmgPartCardProps {
  /** Full Sidekick part name, e.g. 'SK_MDRN_CIVL_01_10TORS_HU01'. */
  partName: string;
  /** True when the player has unlocked this part (or it's a starter). */
  owned: boolean;
  /** Called when the player taps an unowned card. Parent shows the
   *  Alert / coin-spend confirm and calls unlockAmgPart on approval. */
  onBuy?: (partName: string) => void;
  /** Called when the player taps an owned card. Parent typically
   *  navigates to the creator with that part preselected. */
  onEquip?: (partName: string) => void;
  /** Compact size for dense grids (3 cols) vs comfortable (2 cols).
   *  Defaults to comfortable. */
  size?: 'compact' | 'comfortable';
  /** Show a red NEW ribbon in the top-right corner. Parent sets this
   *  when the part was unlocked within the last N days — the card
   *  itself is time-agnostic. */
  isNew?: boolean;
}

/** Extract the variant number from a part name — 'SK_MDRN_CIVL_01_10TORS_HU01' → '01' */
function variantFromPartName(name: string): string {
  const m = name.match(/^SK_[A-Z]{4}_[A-Z]{4}_(\d{2})_/);
  return m ? m[1] : '??';
}

export function AmgPartCard({ partName, owned, onBuy, onEquip, size = 'comfortable', isNew = false }: AmgPartCardProps) {
  const { price, rarity, pack } = getPartPrice(partName);
  const meta = packMeta(pack);
  const rarityColor = RARITY_COLORS[rarity];
  const rarityLabel = RARITY_LABELS[rarity];
  const variant = variantFromPartName(partName);

  const dim = size === 'compact' ? 96 : 120;

  // Rarity glow pulse — only runs for epic+ items so common cards
  // stay quiet. Drives the card's outer shadow opacity in a slow
  // breath so a Samurai/Apocalypse part visibly sells its tier
  // across the grid. Not a distraction since it's soft + slow.
  const glow = useRef(new Animated.Value(0)).current;
  const shouldGlow = rarity === 'epic' || rarity === 'rare';
  useEffect(() => {
    if (!shouldGlow) return;
    const period = rarity === 'epic' ? 2400 : 3600;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: period / 2, useNativeDriver: false, easing: Easing.inOut(Easing.sin) }),
        Animated.timing(glow, { toValue: 0, duration: period / 2, useNativeDriver: false, easing: Easing.inOut(Easing.sin) }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [shouldGlow, rarity, glow]);

  // NEW ribbon shake — tiny rotate wobble so the player's eye catches
  // recently-purchased parts in the Collection grid. 2s cycle.
  const wobble = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!isNew) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(wobble, { toValue: 1, duration: 1000, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
        Animated.timing(wobble, { toValue: -1, duration: 1000, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [isNew, wobble]);

  const glowStyle = shouldGlow ? {
    shadowColor: rarityColor,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: glow.interpolate({ inputRange: [0, 1], outputRange: [3, 14] }),
    shadowOpacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.95] }),
    ...(Platform.OS === 'web' ? ({
      // Web shadow driver — boxShadow animation can't interpolate, so
      // use a filter drop-shadow that grows via the same glow value.
      // @ts-expect-error CSS-only on web
      boxShadow: glow.interpolate ? undefined : undefined,
    } as any) : {}),
  } : null;

  return (
    <PressScale
      onPress={() => {
        playSound('click');
        if (owned) onEquip?.(partName);
        else onBuy?.(partName);
      }}
      scaleTo={0.96}
      accessibilityRole="button"
      accessibilityLabel={owned ? `Equip ${meta.displayName} ${variant}` : `Buy ${meta.displayName} ${variant} for ${price} coins`}
    >
      <Animated.View style={[styles.card, { borderColor: rarityColor, width: dim, height: dim + 50 }, glowStyle]}>
        {/* Hero swatch — pack-themed gradient with the slot emoji as the
            visual anchor. Devon's audit said "can't tell what you're
            buying" with the prior layout (small emoji on a flat tinted
            box). New treatment: bigger emoji + a clear SLOT label
            below it (TORSO / HAIR / etc.) so the player gets
            "this is a torso" at a glance, even before they read the
            pack name. */}
        <LinearGradient
          colors={[rarityColor + '40', rarityColor + '12']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.swatch}
        >
          {/* Hero image cascade — three tiers, picked in order:
              1. Per-part Unity render (the WYSIWYG ideal — the EXACT part
                 you'd be buying, framed by slot category). 2886 of these
                 from the Synty Character Creator headless export.
              2. Pack-cover icon (chunky 3D AI-generated mascot). Used
                 when the part isn't in partThumbs.ts (e.g. brand-new
                 pack added since the last Unity batch).
              3. Default human civvie pack icon — last-resort fallback so
                 nothing renders blank.
              The slot label underneath the image differentiates parts
              within the same pack regardless of which tier hits. */}
          <Image
            source={
              getPartThumb(partName) ??
              getPackIcon(pack) ??
              require('../../assets/images/ui/pack-humn-base.png')
            }
            style={[styles.heroImage, { width: dim - 24, height: dim - 30 }]}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
          <Text style={[styles.slotLabel, { color: rarityColor }]}>{slotLabel(partName)}</Text>
        </LinearGradient>

        {/* NEW ribbon — shows for parts unlocked in the last 7 days.
            Subtly wobbles so the player's eye catches fresh unlocks. */}
        {isNew ? (
          <Animated.View
            style={[
              styles.newRibbon,
              { transform: [{ rotate: wobble.interpolate({ inputRange: [-1, 1], outputRange: ['-6deg', '6deg'] }) }] },
            ]}
          >
            <Text style={styles.newText}>NEW</Text>
          </Animated.View>
        ) : null}

        {/* Pack identity strip — truncated display name + variant. The
            pack cover hero image already conveys pack identity, so the
            small emoji is gone — text-only here keeps the strip clean. */}
        <View style={styles.packStrip}>
          <Text style={styles.packName} numberOfLines={1}>{meta.displayName}</Text>
          <Text style={styles.packVariant}>·{variant}</Text>
        </View>

        {/* Footer: rarity/price or OWNED chip */}
        <View style={styles.footer}>
          {owned ? (
            <View style={[styles.ownedChip, { backgroundColor: colors.green + '44' }]}>
              <Text style={[styles.ownedText, { color: colors.green }]}>OWNED</Text>
            </View>
          ) : (
            <>
              <Text style={[styles.rarity, { color: rarityColor }]}>{rarityLabel}</Text>
              <Text style={styles.price}>{price} 🪙</Text>
            </>
          )}
        </View>
      </Animated.View>
    </PressScale>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 2,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.bgDark,
    margin: 4,
  },
  swatch: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 4,
    paddingBottom: 2,
  },
  heroImage: {
    // Sized inline by `dim` so the cover scales with compact / comfortable.
  },
  // Big slot type label sitting under the slot emoji. Tells the player
  // exactly which body part they're buying without needing to decode
  // the emoji. Color matches the rarity for visual cohesion.
  slotLabel: {
    marginTop: 2,
    fontSize: 11,
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    letterSpacing: 1.4,
  },
  // Pack-identity strip between the swatch and the footer. Pack emoji
  // + display name + variant — the "from where" line.
  packStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingHorizontal: 4,
    paddingVertical: 3,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceBorder,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  packName: {
    flexShrink: 1,
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 9,
    color: 'rgba(255,255,255,0.78)',
    letterSpacing: 0.3,
  },
  packVariant: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 9,
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 0.5,
  },
  footer: {
    height: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceBorder,
  },
  rarity: {
    fontSize: 8,
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    letterSpacing: 1,
  },
  price: {
    fontSize: 10,
    color: colors.textPrimary,
    fontFamily: fonts.body,
    fontWeight: weight.bold,
  },
  ownedChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 3,
    borderRadius: 4,
  },
  ownedText: {
    fontSize: 9,
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    letterSpacing: 1.5,
  },
  newRibbon: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: colors.red,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  newText: {
    fontSize: 8,
    color: '#ffffff',
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    letterSpacing: 1,
  },
});
