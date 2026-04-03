import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { TopBar } from '../components/ui/TopBar';
import { useShopStore } from '../stores/shopStore';
import { useGameStore } from '../stores/gameStore';
import { haptics } from '../services/haptics';
import { COURTS, Court } from '../data/courts';
import { colors } from '../theme/colors';
import { fonts, weight } from '../theme/typography';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Stage'>;
};

function CourtCard({ court, coins, onPress }: { court: Court; coins: number; onPress: () => void }) {
  const canAfford = coins >= court.buyIn;
  const isLocked = !!court.unlockRequirement;

  return (
    <Pressable
      onPress={() => { if (canAfford && !isLocked) { haptics.tap(); onPress(); } }}
      style={[styles.courtCard, {
        backgroundColor: court.bgColor,
        borderColor: court.borderColor,
        opacity: (canAfford && !isLocked) ? 1 : 0.5,
      }]}
    >
      <View style={styles.courtLeft}>
        <Text style={styles.courtIcon}>{court.icon}</Text>
        <View>
          <Text style={styles.courtName}>{court.name}</Text>
          <Text style={styles.courtDesc}>{court.description}</Text>
        </View>
      </View>
      <View style={styles.courtRight}>
        {court.buyIn > 0 ? (
          <>
            <Text style={styles.buyInLabel}>Buy-in</Text>
            <Text style={styles.buyInAmount}>🪙 {court.buyIn.toLocaleString()}</Text>
            <Text style={styles.winLabel}>Win: 🪙 {court.winnerGets.toLocaleString()}</Text>
          </>
        ) : (
          <Text style={styles.freeLabel}>FREE</Text>
        )}
      </View>
    </Pressable>
  );
}

export function StageScreen({ navigation }: Props) {
  const { coins, gems, level, spendCoins } = useShopStore();
  const newGame = useGameStore(s => s.newGame);

  const handleSelectCourt = (court: Court) => {
    if (court.buyIn > 0) {
      const success = spendCoins(court.buyIn);
      if (!success) return;
    }
    // Start a hard AI game for wager matches
    newGame('hard', true);
    navigation.navigate('Game');
  };

  return (
    <ScreenBackground>
      <View style={styles.container}>
        <TopBar
          coins={coins}
          gems={gems}
          level={level}
          showBack
          onBackPress={() => navigation.goBack()}
        />

        <View style={styles.header}>
          <Text style={styles.title}>STAGE</Text>
          <Text style={styles.subtitle}>Risk coins. Win big.</Text>
          <View style={styles.balanceRow}>
            <Text style={styles.balanceLabel}>Your Balance:</Text>
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
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 4,
    marginBottom: 12,
  },
  title: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 28,
    color: '#ffffff',
    letterSpacing: 2,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontWeight: weight.regular,
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  balanceRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  balanceLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.regular,
    fontSize: 13,
    color: colors.textSecondary,
  },
  balanceAmount: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 16,
    color: colors.coinGold,
  },
  courtList: {
    paddingHorizontal: 16,
    gap: 10,
    paddingBottom: 100,
  },
  courtCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  courtLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  courtIcon: {
    fontSize: 28,
  },
  courtName: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 15,
    color: '#ffffff',
  },
  courtDesc: {
    fontFamily: fonts.body,
    fontWeight: weight.regular,
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
    maxWidth: 160,
  },
  courtRight: {
    alignItems: 'flex-end',
  },
  buyInLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.regular,
    fontSize: 10,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  buyInAmount: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 14,
    color: '#ffffff',
  },
  winLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 11,
    color: colors.green,
    marginTop: 2,
  },
  freeLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 16,
    color: colors.green,
  },
});
