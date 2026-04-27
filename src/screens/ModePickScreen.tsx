/**
 * ModePickScreen — the layer between Home's PLAY button and the actual
 * game-mode flows.
 *
 * Devon's radical-simplification pass: Home now has a single PLAY button.
 * Tapping PLAY opens this screen with three options:
 *   1. VS AI       → existing PlayScreen (Easy / Medium / Hard picker)
 *   2. CAREER      → existing CareerMap (Brooklyn / Venice / Harlem cities)
 *   3. LOCAL PLAY  → existing LocalPlayScreen (pass and play)
 *
 * Layout: full-screen, calm bg-home, 3 stacked chunky pill buttons matching
 * the locked-in DROP4 visual direction (per docs/VISUAL_DIRECTION_LOCKIN.md).
 * The buttons share visual weight — every mode is a peer, no "secondary" feel.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { TopBar } from '../components/ui/TopBar';
import { GlossyButton } from '../components/ui/GlossyButton';
import { SlideReveal } from '../components/animations';
import { useShopStore } from '../stores/shopStore';
import { useCareerStore } from '../stores/careerStore';
import { ALL_CAREER_LEVELS } from '../data/careerLevels';
import { fonts, weight } from '../theme/typography';
import { colors } from '../theme/colors';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ModePick'>;
};

export function ModePickScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const coins = useShopStore((s) => s.coins);
  const gems = useShopStore((s) => s.gems);
  const level = useShopStore((s) => s.level);
  const careerProgress = useCareerStore((s) => s.progress);

  const completedCareerLevels = Object.values(careerProgress).filter((p) => p?.completed).length;
  const totalCareerLevels = ALL_CAREER_LEVELS.length;

  return (
    <ScreenBackground scene="home">
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <TopBar
          coins={coins}
          gems={gems}
          level={level}
          showBack
          onBackPress={() => navigation.goBack()}
          onProfilePress={() => navigation.navigate('Profile' as any)}
          onSettingsPress={() => navigation.navigate('Settings' as any)}
          onCoinPress={() => navigation.navigate('MainTabs', { screen: 'Shop' } as any)}
          onGemPress={() => navigation.navigate('MainTabs', { screen: 'Shop' } as any)}
        />

        <View style={styles.titleWrap}>
          <Text style={styles.title} accessibilityRole="header">CHOOSE A MODE</Text>
          <Text style={styles.subtitle}>How do you want to play?</Text>
        </View>

        <View style={styles.buttonsWrap}>
          <SlideReveal from="bottom" delay={0}>
            <GlossyButton
              label="VS AI"
              subtitle="Quick match · Easy, Medium, Hard"
              variant="orange"
              iconRight="›"
              onPress={() => navigation.navigate('Play' as any)}
            />
          </SlideReveal>

          <SlideReveal from="bottom" delay={80}>
            <GlossyButton
              label="CAREER"
              subtitle={
                completedCareerLevels > 0
                  ? `${completedCareerLevels}/${totalCareerLevels} levels · 3 cities`
                  : 'Take the city · 3 cities · 36 levels'
              }
              variant="purple"
              iconRight="›"
              onPress={() => navigation.navigate('CareerMap' as any)}
            />
          </SlideReveal>

          <SlideReveal from="bottom" delay={160}>
            <GlossyButton
              label="LOCAL PLAY"
              subtitle="Pass and play on one device"
              variant="teal"
              iconRight="›"
              onPress={() => navigation.navigate('LocalPlay' as any)}
            />
          </SlideReveal>
        </View>
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  titleWrap: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 32,
  },
  title: {
    fontFamily: fonts.heading,
    fontWeight: weight.black,
    fontSize: 28,
    color: '#ffffff',
    letterSpacing: 2,
    textShadowColor: 'rgba(255,140,0,0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontWeight: weight.regular,
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 6,
    letterSpacing: 0.5,
  },
  buttonsWrap: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
    gap: 14,
    paddingBottom: 80,
  },
});
