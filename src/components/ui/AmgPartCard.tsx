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

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PressScale } from '../animations';
import {
  getPartPrice,
  RARITY_COLORS,
  RARITY_LABELS,
} from '../../data/amgPartPricing';
import { packMeta } from '../../data/amgPackMeta';
import { playSound } from '../../services/audio';
import { colors } from '../../theme/colors';
import { fonts, weight } from '../../theme/typography';

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
      <View style={[styles.card, { borderColor: rarityColor, width: dim, height: dim + 32 }]}>
        {/* Pack emoji block */}
        <View style={[styles.swatch, { backgroundColor: rarityColor + '22' }]}>
          <Text style={styles.emoji}>{meta.emoji}</Text>
          <Text style={styles.variant}>#{variant}</Text>
        </View>

        {/* NEW ribbon — only shows for parts unlocked in the last 7 days.
            Absolute-positioned over the top-right corner of the card. */}
        {isNew ? (
          <View style={styles.newRibbon}>
            <Text style={styles.newText}>NEW</Text>
          </View>
        ) : null}

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
      </View>
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
  },
  emoji: {
    fontSize: 36,
  },
  variant: {
    marginTop: 2,
    fontSize: 9,
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontWeight: weight.medium,
    letterSpacing: 1,
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
