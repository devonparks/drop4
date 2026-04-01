import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { fonts, weight } from '../../theme/typography';

export function Drop4Logo({ size = 'large' }: { size?: 'large' | 'small' }) {
  const fontSize = size === 'large' ? 52 : 32;
  const numSize = size === 'large' ? 56 : 36;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={[styles.drop, { fontSize }]}>DROP</Text>
        <Text style={[styles.four, { fontSize: numSize }]}>4</Text>
      </View>
      {size === 'large' && (
        <Text style={styles.tagline}>Stack. Connect. Dominate.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  drop: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    color: '#ffffff',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 6,
    letterSpacing: 2,
  },
  four: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    color: '#ff8c00',
    textShadowColor: 'rgba(255,140,0,0.4)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 8,
    marginLeft: 2,
  },
  tagline: {
    fontFamily: fonts.body,
    fontWeight: weight.medium,
    fontSize: 15,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 3,
    marginTop: 2,
    textTransform: 'uppercase',
  },
});
