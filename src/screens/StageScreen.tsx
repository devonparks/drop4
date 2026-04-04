import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { TopBar } from '../components/ui/TopBar';
import { useShopStore } from '../stores/shopStore';
import { useGameStore } from '../stores/gameStore';
import { haptics } from '../services/haptics';
import { playSound } from '../services/audio';
import { COURTS, Court } from '../data/courts';
import { colors } from '../theme/colors';
import { fonts, weight } from '../theme/typography';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Stage'>;
};

const COURT_ICONS: Record<string, string> = {
  playground: '🏀', bronze: '🥉', silver: '🥈',
  gold: '🥇', diamond: '💎', darkmatter: '🌌',
};

function CourtCard({ court, coins, onPress }: { court: Court; coins: number; onPress: () => void }) {
  const canAfford = coins >= court.buyIn;
  const isLocked = !!court.unlockRequirement;

  return (
    <Pressable
      onPress={() => { if (canAfford && !isLocked) { haptics.tap(); onPress(); } }}
      style={[styles.courtCard, (!canAfford || isLocked) && { opacity: 0.4 }]}
    >
      <LinearGradient
        colors={[court.bgColor, 'rgba(0,0,0,0)']}
        style={styles.courtGradient}
      >
        <View style={styles.courtLeft}>
          <Text style={styles.courtIcon}>{COURT_ICONS[court.id] || '🏟'}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.courtName}>{court.name}</Text>
            <Text style={styles.courtDesc}>{court.description}</Text>
          </View>
        </View>

        <View style={styles.courtRight}>
          {court.buyIn > 0 ? (
            <>
              <Text style={styles.buyInLabel}>BUY-IN</Text>
              <Text style={styles.buyInAmount}>🪙 {court.buyIn.toLocaleString()}</Text>
              <View style={styles.winBadge}>
                <Text style={styles.winText}>WIN: 🪙 {court.winnerGets.toLocaleString()}</Text>
              </View>
            </>
          ) : (
            <View style={styles.freeBadge}>
              <Text style={styles.freeText}>FREE</Text>
            </View>
          )}
        </View>
      </LinearGradient>
    </Pressable>
  );
}

export function StageScreen({ navigation }: Props) {
  const { coins, gems, level, spendCoins } = useShopStore();
  const newGame = useGameStore(s => s.newGame);

  const handleSelectCourt = (court: Court) => {
    if (court.buyIn > 0) {
      const success = spendCoins(court.buyIn);
      if (!success) {
        haptics.error();
        return;
      }
    }
    (global as any).__wagerCourt = court;
    playSound('coin');
    newGame('hard', true);
    navigation.navigate('Game');
  };

  return (
    <ScreenBackground>
      <View style={styles.container}>
        <TopBar
          coins={coins} gems={gems} level={level}
          showBack onBackPress={() => navigation.goBack()}
        />

        <View style={styles.header}>
          <Text style={styles.title}>STAGE</Text>
          <Text style={styles.subtitle}>Risk coins. Win big.</Text>
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Your Balance</Text>
            <Text style={styles.balanceAmount}>🪙 {coins.toLocaleString()}</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.courtList} showsVerticalScrollIndicator={false}>
          {COURTS.map(court => (
            <CourtCard
              key={court.id}
              court={court}
              coins={coins}
              onPress={() => handleSelectCourt(court)}
            />
          ))}
        </ScrollView>
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    alignItems: 'center', paddingHorizontal: 20,
    marginTop: 4, marginBottom: 10,
  },
  title: {
    fontFamily: fonts.heading, fontWeight: weight.bold,
    fontSize: 28, color: '#ffffff', letterSpacing: 2,
  },
  subtitle: {
    fontFamily: fonts.body, fontWeight: weight.regular,
    fontSize: 13, color: colors.textSecondary, marginTop: 2,
  },
  balanceCard: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 8, marginTop: 8,
    borderWidth: 1, borderColor: 'rgba(255,209,102,0.15)',
  },
  balanceLabel: {
    fontFamily: fonts.body, fontWeight: weight.regular,
    fontSize: 12, color: colors.textSecondary,
  },
  balanceAmount: {
    fontFamily: fonts.body, fontWeight: weight.bold,
    fontSize: 18, color: colors.coinGold,
  },
  courtList: {
    paddingHorizontal: 14, gap: 8, paddingBottom: 100,
  },
  courtCard: {
    borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  courtGradient: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', padding: 14, borderRadius: 16,
  },
  courtLeft: {
    flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1,
  },
  courtIcon: { fontSize: 30 },
  courtName: {
    fontFamily: fonts.body, fontWeight: weight.bold,
    fontSize: 15, color: '#ffffff',
  },
  courtDesc: {
    fontFamily: fonts.body, fontWeight: weight.regular,
    fontSize: 10, color: colors.textSecondary, marginTop: 1,
    maxWidth: 140,
  },
  courtRight: { alignItems: 'flex-end', gap: 2 },
  buyInLabel: {
    fontFamily: fonts.body, fontWeight: weight.regular,
    fontSize: 9, color: colors.textSecondary, textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  buyInAmount: {
    fontFamily: fonts.body, fontWeight: weight.bold,
    fontSize: 14, color: '#ffffff',
  },
  winBadge: {
    backgroundColor: 'rgba(39,174,61,0.15)', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 2, marginTop: 2,
  },
  winText: {
    fontFamily: fonts.body, fontWeight: weight.semibold,
    fontSize: 10, color: colors.green,
  },
  freeBadge: {
    backgroundColor: 'rgba(39,174,61,0.2)', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 6,
  },
  freeText: {
    fontFamily: fonts.body, fontWeight: weight.bold,
    fontSize: 14, color: colors.green,
  },
});
