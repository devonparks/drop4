/**
 * FilterChip — shared pill-style filter button used across ShopScreen,
 * Character3DCreatorScreen, and any future screens that need horizontal
 * filter rows. Replaces the three near-identical style blocks we had.
 *
 * Usage:
 *   <FilterChip
 *     label="Human"
 *     icon="👤"
 *     active={selected === 'human'}
 *     locked={!unlockedSpecies.includes('human')}
 *     onPress={() => setSpecies('human')}
 *   />
 */
import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { PressScale } from '../animations';
import { haptics } from '../../services/haptics';
import { playSound } from '../../services/audio';
import { colors } from '../../theme/colors';
import { fonts, weight } from '../../theme/typography';

interface Props {
  label: string;
  icon?: string;
  active?: boolean;
  locked?: boolean;
  onPress: () => void;
  style?: ViewStyle;
}

export function FilterChip({ label, icon, active, locked, onPress, style }: Props) {
  return (
    <PressScale
      onPress={() => {
        if (locked) { haptics.error(); playSound('error'); return; }
        haptics.tap();
        onPress();
      }}
      accessibilityLabel={label}
      accessibilityHint={locked ? 'Locked' : active ? 'Selected filter' : 'Filter'}
      accessibilityState={{ selected: !!active, disabled: !!locked }}
    >
      <View style={[
        styles.chip,
        active && styles.chipActive,
        locked && styles.chipLocked,
        style,
      ]}>
        <Text style={[
          styles.chipText,
          active && styles.chipTextActive,
        ]}>
          {locked ? '\u{1F512} ' : icon ? icon + ' ' : ''}{label}
        </Text>
      </View>
    </PressScale>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  chipActive: {
    backgroundColor: 'rgba(255,140,0,0.25)',
    borderColor: colors.orange,
  },
  chipLocked: {
    opacity: 0.45,
  },
  chipText: {
    fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 11,
    color: colors.textSecondary, letterSpacing: 0.3,
  },
  chipTextActive: {
    color: '#fff',
  },
});
