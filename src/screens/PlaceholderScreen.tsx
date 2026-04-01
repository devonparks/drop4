import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { fonts, weight } from '../theme/typography';
import { colors } from '../theme/colors';

interface Props {
  title: string;
  icon: string;
  subtitle: string;
}

export function PlaceholderScreen({ title, icon, subtitle }: Props) {
  return (
    <ScreenBackground>
      <View style={styles.container}>
        <Text style={styles.icon}>{icon}</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  icon: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 28,
    color: '#ffffff',
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontWeight: weight.regular,
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
