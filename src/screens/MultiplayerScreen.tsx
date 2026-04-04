import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { TopBar } from '../components/ui/TopBar';
import { GlossyButton } from '../components/ui/GlossyButton';
import { useShopStore } from '../stores/shopStore';
import { useRankedStore } from '../stores/rankedStore';
import { RankBadge } from '../components/ui/RankBadge';
import { RankProgressCard } from '../components/ui/RankProgressCard';
import { colors } from '../theme/colors';
import { fonts, weight } from '../theme/typography';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Multiplayer'>;
};

export function MultiplayerScreen({ navigation }: Props) {
  const { coins, gems, level } = useShopStore();
  const ranked = useRankedStore();

  return (
    <ScreenBackground>
      <View style={styles.container}>
        <TopBar coins={coins} gems={gems} level={level} showBack onBackPress={() => navigation.goBack()} />

        <View style={styles.mainContent}>
          <Text style={styles.title}>MULTIPLAYER</Text>

          {/* Full rank progress card */}
          <RankProgressCard />

          {/* Three-tier structure */}
          <Text style={styles.sectionLabel}>COMPETITIVE TIERS</Text>

          <View style={styles.buttonsWrap}>
            {/* Tier 1: Casual */}
            <GlossyButton
              label="CASUAL"
              subtitle="No timer, no pressure"
              variant="green"
              icon="🎮"
              onPress={() => navigation.navigate('LocalPlay')}
            />

            {/* Tier 2: Ranked */}
            <GlossyButton
              label="RANKED"
              subtitle="Chess clock • MMR rating"
              variant="purple"
              icon="🏆"
              onPress={() => {
                // Set ranked mode flags for GameScreen chess clock
                (global as any).__rankedMode = true;
                (global as any).__rankedClockSeconds = 180; // 3 min per player
                navigation.navigate('Play');
              }}
            />

            {/* Tier 3: Gold Court (Wager) */}
            <GlossyButton
              label="GOLD COURT"
              subtitle="Wager coins • Spectators"
              variant="gold"
              icon="👑"
              onPress={() => navigation.navigate('Stage')}
            />
          </View>

          <Text style={styles.sectionLabel}>MORE</Text>

          <View style={styles.buttonsWrap}>
            <GlossyButton
              label="TOURNAMENT"
              subtitle="4-8 Player Bracket"
              variant="red"
              icon="🏟"
              onPress={() => navigation.navigate('Tournament')}
            />
            <GlossyButton
              label="ONLINE"
              subtitle="Coming Soon"
              variant="navy"
              icon="🌐"
              onPress={() => {}}
              disabled
            />
          </View>
        </View>
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  mainContent: { flex: 1, alignItems: 'center', paddingHorizontal: 20, gap: 8 },
  title: {
    fontFamily: fonts.heading, fontWeight: weight.bold,
    fontSize: 26, color: '#ffffff', letterSpacing: 2, marginTop: 4,
  },
  rankedCard: { width: '100%', maxWidth: 340, borderRadius: 14, overflow: 'hidden' },
  rankedGradient: {
    flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12,
    borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  rankedIcon: { fontSize: 28 },
  rankedTier: { fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 15 },
  rankedElo: { fontFamily: fonts.body, fontWeight: weight.regular, fontSize: 10, color: colors.textSecondary, marginTop: 1 },
  rankedStats: { alignItems: 'flex-end', gap: 3 },
  rankedWL: { fontFamily: fonts.body, fontWeight: weight.semibold, fontSize: 11, color: colors.textSecondary },
  rankedBar: { width: 60, height: 5, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' },
  rankedFill: { height: '100%', borderRadius: 3 },
  sectionLabel: {
    fontFamily: fonts.body, fontWeight: weight.bold,
    fontSize: 10, color: colors.textSecondary, letterSpacing: 2,
    alignSelf: 'flex-start', marginLeft: 10, marginTop: 4,
  },
  buttonsWrap: { width: '100%', maxWidth: 340, gap: 6 },
});
