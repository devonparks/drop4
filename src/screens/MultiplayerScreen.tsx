import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { TopBar } from '../components/ui/TopBar';
import { GlossyButton } from '../components/ui/GlossyButton';
import { useShopStore } from '../stores/shopStore';
import { useRankedStore } from '../stores/rankedStore';
import { colors } from '../theme/colors';
import { fonts, weight } from '../theme/typography';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Multiplayer'>;
};

export function MultiplayerScreen({ navigation }: Props) {
  const { coins, gems, level } = useShopStore();
  const ranked = useRankedStore();
  const tierInfo = ranked.getTier();

  return (
    <ScreenBackground>
      <View style={styles.container}>
        <TopBar
          coins={coins} gems={gems} level={level}
          showBack onBackPress={() => navigation.goBack()}
        />

        <View style={styles.mainContent}>
          <Text style={styles.title}>MULTIPLAYER</Text>

          {/* Ranked display */}
          <View style={styles.rankedCard}>
            <LinearGradient
              colors={[`${tierInfo.color}20`, `${tierInfo.color}08`]}
              style={styles.rankedGradient}
            >
              <Text style={styles.rankedIcon}>{tierInfo.icon}</Text>
              <View>
                <Text style={[styles.rankedTier, { color: tierInfo.color }]}>{tierInfo.name}</Text>
                <Text style={styles.rankedElo}>{ranked.elo} ELO • {ranked.rankedWins}W {ranked.rankedLosses}L</Text>
              </View>
              <View style={styles.rankedProgress}>
                <View style={styles.rankedBar}>
                  <View style={[styles.rankedFill, { width: `${ranked.getProgress()}%`, backgroundColor: tierInfo.color }]} />
                </View>
                <Text style={styles.rankedPercent}>{ranked.getProgress()}%</Text>
              </View>
            </LinearGradient>
          </View>

          {/* Mode buttons */}
          <View style={styles.buttonsWrap}>
            <GlossyButton
              label="LOCAL PLAY"
              subtitle="Pass & Play"
              variant="teal"
              icon="👥"
              onPress={() => navigation.navigate('LocalPlay')}
            />
            <GlossyButton
              label="STAGE MODE"
              subtitle="Wager Coins"
              variant="gold"
              icon="🏟"
              onPress={() => navigation.navigate('Stage')}
            />
            <GlossyButton
              label="TOURNAMENT"
              subtitle="4-8 Player Bracket"
              variant="red"
              icon="🏆"
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
  mainContent: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 20, gap: 12,
  },
  title: {
    fontFamily: fonts.heading, fontWeight: weight.bold,
    fontSize: 26, color: '#ffffff', letterSpacing: 2,
  },
  rankedCard: {
    width: '100%', maxWidth: 340, borderRadius: 16, overflow: 'hidden',
  },
  rankedGradient: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  rankedIcon: { fontSize: 32 },
  rankedTier: {
    fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 16,
  },
  rankedElo: {
    fontFamily: fonts.body, fontWeight: weight.regular,
    fontSize: 11, color: colors.textSecondary, marginTop: 1,
  },
  rankedProgress: {
    flex: 1, alignItems: 'flex-end', gap: 2,
  },
  rankedBar: {
    width: '100%', height: 6, backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3, overflow: 'hidden',
  },
  rankedFill: {
    height: '100%', borderRadius: 3,
  },
  rankedPercent: {
    fontFamily: fonts.body, fontWeight: weight.semibold,
    fontSize: 9, color: colors.textSecondary,
  },
  buttonsWrap: {
    width: '100%', maxWidth: 340, gap: 8,
  },
});
