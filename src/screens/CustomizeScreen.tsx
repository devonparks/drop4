import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { TopBar } from '../components/ui/TopBar';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { useShopStore } from '../stores/shopStore';
import { fonts, weight } from '../theme/typography';
import { colors } from '../theme/colors';

// ═══════════════════════════════════════════════════════════════════════
// CustomizeScreen — the locker room
//
// Replaces the old CollectionScreen as the "dress up my fighter" tab.
// Phase 1 (this file): scaffold only — 3D character + horizontal category
// strip + equipped summary. Category tap behavior is a follow-up commit.
//
// Layout:
//   [TopBar — currency + settings + top-right portrait]
//   [Title: CUSTOMIZE]
//   [Horizontal scrolling category strip (9 cards)]
//   [Big 3D character, full body, centered, auto-rotating idle]
//   [Bottom: equipped summary row — tap to jump to that category]
//
// The 9 categories mirror the Shop's sub-tabs so the mental model matches:
// Character, Emotes, Pets, Pieces, Boards, Effects, Wins, Frames. (Plus
// "Character" which covers outfit + hair + body via Character3DCreator.)
// ═══════════════════════════════════════════════════════════════════════

export function CustomizeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const coins = useShopStore(s => s.coins);
  const gems = useShopStore(s => s.gems);
  const level = useShopStore(s => s.level);
  const navigateTo = (screen: string) => navigation.dispatch(CommonActions.navigate({ name: screen }));

  return (
    <ScreenBackground scene="profile">
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <TopBar
          coins={coins}
          gems={gems}
          level={level}
          onProfilePress={() => navigateTo('Profile')}
          onSettingsPress={() => navigateTo('Settings')}
          onCoinPress={() => navigation.navigate('MainTabs', { screen: 'Shop' } as any)}
          onGemPress={() => navigation.navigate('MainTabs', { screen: 'Shop' } as any)}
        />
        <Text style={styles.title} accessibilityRole="header">CUSTOMIZE</Text>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.placeholder}>
            <Text style={styles.placeholderTitle}>Locker room — coming online</Text>
            <Text style={styles.placeholderDesc}>
              3D character + category strip lands in the next commit. Use the
              Shop tab to browse/equip cosmetics for now.
            </Text>
          </View>
        </ScrollView>
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: {
    fontFamily: fonts.heading,
    fontWeight: weight.black,
    fontSize: 22,
    color: '#ffffff',
    letterSpacing: 2,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 8,
  },
  scroll: { paddingHorizontal: 20, paddingBottom: 24 },
  placeholder: {
    marginTop: 80,
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  placeholderTitle: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 16,
    color: colors.orange,
    letterSpacing: 1,
  },
  placeholderDesc: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
  },
});
