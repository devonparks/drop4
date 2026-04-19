import React from 'react';
import { View, Text, Image, StyleSheet, ImageSourcePropType } from 'react-native';
import { fonts, weight } from '../../theme/typography';
import { RARITY_LABELS } from '../../data/shopCatalog';

// ═══════════════════════════════════════════════════════════════════════
// RarityChip
//
// Premium painted pill-badge for showing an item's rarity. Replaces the
// flat LinearGradient + colored-text chip treatment with a hand-painted
// gradient backdrop generated via Flux and layered under the label.
//
// Six tiers: common, uncommon, rare, epic, legendary, mythic.
// Dark-matter falls back to the mythic painting (close visual match,
// not worth a 7th Flux generation).
//
// Sizes: sm (24h) / md (32h) / lg (40h). The backdrop PNG is
// ~2:1 aspect, so the chip width ~= 2x height by default; `width`
// prop can override.
// ═══════════════════════════════════════════════════════════════════════

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic' | 'darkmatter';

const BG: Record<Rarity, ImageSourcePropType> = {
  common:     require('../../assets/images/ui/rarity-common.png'),
  uncommon:   require('../../assets/images/ui/rarity-uncommon.png'),
  rare:       require('../../assets/images/ui/rarity-rare.png'),
  epic:       require('../../assets/images/ui/rarity-epic.png'),
  legendary:  require('../../assets/images/ui/rarity-legendary.png'),
  mythic:     require('../../assets/images/ui/rarity-mythic.png'),
  darkmatter: require('../../assets/images/ui/rarity-mythic.png'),
};

interface Props {
  rarity: Rarity;
  size?: 'sm' | 'md' | 'lg';
  width?: number;
  /** Override the label text (defaults to RARITY_LABELS[rarity]). */
  label?: string;
  style?: any;
}

const SIZES = {
  sm: { height: 22, fontSize: 10, defaultWidth: 72 },
  md: { height: 28, fontSize: 12, defaultWidth: 96 },
  lg: { height: 36, fontSize: 14, defaultWidth: 120 },
};

export function RarityChip({ rarity, size = 'md', width, label, style }: Props) {
  const sizeCfg = SIZES[size];
  const chipWidth = width ?? sizeCfg.defaultWidth;
  const text = label ?? RARITY_LABELS[rarity] ?? rarity;

  return (
    <View
      style={[
        styles.wrap,
        { width: chipWidth, height: sizeCfg.height },
        style,
      ]}
    >
      <Image
        source={BG[rarity]}
        style={StyleSheet.absoluteFill}
        resizeMode="stretch"
      />
      <Text
        style={[
          styles.label,
          { fontSize: sizeCfg.fontSize, lineHeight: sizeCfg.fontSize + 2 },
        ]}
        numberOfLines={1}
      >
        {text.toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    // The painted PNG already has a drop shadow, but adding a soft
    // platform shadow gives a tiny bit of lift on dark backdrops.
    shadowColor: 'rgba(0,0,0,0.6)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 3,
  },
  label: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    color: '#ffffff',
    letterSpacing: 0.8,
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    zIndex: 1,
  },
});
