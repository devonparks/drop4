import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { TopBar } from '../components/ui/TopBar';
import { useShopStore } from '../stores/shopStore';
import { useGameStore } from '../stores/gameStore';
import { RankBadge } from '../components/ui/RankBadge';
import { haptics } from '../services/haptics';
import { playSound } from '../services/audio';
import { WAGER_TABLES, WagerTable } from '../data/wagerTables';
import { colors } from '../theme/colors';
import { fonts, weight } from '../theme/typography';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Stage'>;
};

function TableCard({ table, coins, playerLevel, onPress }: {
  table: WagerTable; coins: number; playerLevel: number; onPress: () => void;
}) {
  const canAfford = coins >= table.buyIn;
  const meetsLevel = !table.minLevel || playerLevel >= table.minLevel;
  const canPlay = canAfford && meetsLevel;

  return (
    <Pressable
      onPress={() => { if (canPlay) { haptics.tap(); onPress(); } }}
      style={[styles.tableCard, !canPlay && { opacity: 0.4 }]}
    >
      <LinearGradient
        colors={[table.bgColor, 'rgba(0,0,0,0)']}
        style={styles.tableGradient}
      >
        <Text style={styles.tableIcon}>{table.icon}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.tableName}>{table.name}</Text>
          <Text style={styles.tableDesc}>{table.description}</Text>
          {table.minLevel && playerLevel < table.minLevel && (
            <Text style={styles.levelReq}>🔒 Level {table.minLevel} required</Text>
          )}
        </View>
        <View style={styles.tableStakes}>
          {table.buyIn > 0 ? (
            <>
              <Text style={styles.buyInLabel}>BUY-IN</Text>
              <Text style={styles.buyInAmount}>🪙 {table.buyIn.toLocaleString()}</Text>
              <View style={styles.winBadge}>
                <Text style={styles.winText}>WIN: 🪙 {table.winnerGets.toLocaleString()}</Text>
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
  const coins = useShopStore(s => s.coins);
  const gems = useShopStore(s => s.gems);
  const level = useShopStore(s => s.level);
  const spendCoins = useShopStore(s => s.spendCoins);
  const newGame = useGameStore(s => s.newGame);

  const handleSelectTable = (table: WagerTable) => {
    if (table.buyIn > 0) {
      const success = spendCoins(table.buyIn);
      if (!success) { haptics.error(); return; }
    }
    playSound('coin');
    newGame('hard', true);
    navigation.navigate('Game', { wagerCourt: table });
  };

  return (
    <ScreenBackground>
      <View style={styles.container}>
        <TopBar coins={coins} gems={gems} level={level} showBack onBackPress={() => navigation.goBack()} />

        <View style={styles.header}>
          <Text style={styles.title}>GOLD COURT</Text>
          <Text style={styles.subtitle}>Wager coins. Win big. Spectators watching.</Text>

          {/* Ranked badge */}
          <RankBadge size="medium" showElo style={{ marginTop: 8 }} />

          {/* Balance */}
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Balance</Text>
            <Text style={styles.balanceAmount}>🪙 {coins.toLocaleString()}</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.tableList} showsVerticalScrollIndicator={false}>
          {WAGER_TABLES.map(table => (
            <TableCard
              key={table.id}
              table={table}
              coins={coins}
              playerLevel={level}
              onPress={() => handleSelectTable(table)}
            />
          ))}

          {/* Spectator section */}
          <Pressable
            onPress={() => {
              haptics.tap();
              navigation.navigate('Spectator');
            }}
            style={styles.spectatorSection}
          >
            <Text style={styles.spectatorTitle}>{'👁'} SPECTATE</Text>
            <Text style={styles.spectatorDesc}>Watch live Gold Court matches</Text>
            <View style={styles.spectatorLiveBadge}>
              <View style={styles.spectatorDot} />
              <Text style={styles.spectatorLiveText}>LIVE</Text>
            </View>
          </Pressable>
        </ScrollView>
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { alignItems: 'center', paddingHorizontal: 20, marginTop: 4, marginBottom: 8 },
  title: {
    fontFamily: fonts.heading, fontWeight: weight.bold,
    fontSize: 26, color: colors.coinGold, letterSpacing: 2,
  },
  subtitle: {
    fontFamily: fonts.body, fontWeight: weight.regular,
    fontSize: 12, color: colors.textSecondary, marginTop: 2,
  },
  rankDisplay: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 8, backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6,
  },
  rankIcon: { fontSize: 18 },
  rankName: { fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 14 },
  rankElo: { fontFamily: fonts.body, fontWeight: weight.regular, fontSize: 11, color: colors.textSecondary },
  balanceCard: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 6, marginTop: 6,
    borderWidth: 1, borderColor: 'rgba(255,209,102,0.15)',
  },
  balanceLabel: { fontFamily: fonts.body, fontWeight: weight.regular, fontSize: 12, color: colors.textSecondary },
  balanceAmount: { fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 18, color: colors.coinGold },
  tableList: { paddingHorizontal: 14, gap: 6, paddingBottom: 100 },
  tableCard: { borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  tableGradient: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', padding: 14, borderRadius: 14,
  },
  tableIcon: { fontSize: 28, marginRight: 10 },
  tableName: { fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 14, color: '#ffffff' },
  tableDesc: { fontFamily: fonts.body, fontWeight: weight.regular, fontSize: 10, color: colors.textSecondary, marginTop: 1 },
  levelReq: { fontFamily: fonts.body, fontWeight: weight.semibold, fontSize: 9, color: colors.red, marginTop: 2 },
  tableStakes: { alignItems: 'flex-end', gap: 2 },
  buyInLabel: { fontFamily: fonts.body, fontWeight: weight.regular, fontSize: 9, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  buyInAmount: { fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 14, color: '#ffffff' },
  winBadge: { backgroundColor: 'rgba(39,174,61,0.15)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, marginTop: 2 },
  winText: { fontFamily: fonts.body, fontWeight: weight.semibold, fontSize: 10, color: colors.green },
  freeBadge: { backgroundColor: 'rgba(39,174,61,0.2)', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 6 },
  freeText: { fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 14, color: colors.green },
  spectatorSection: {
    alignItems: 'center', padding: 16, marginTop: 8,
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  spectatorTitle: { fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 14, color: colors.textSecondary },
  spectatorDesc: { fontFamily: fonts.body, fontWeight: weight.regular, fontSize: 11, color: colors.textMuted, marginTop: 2 },
  spectatorLiveBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(231,76,60,0.15)', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 3, marginTop: 6,
  },
  spectatorDot: {
    width: 6, height: 6, borderRadius: 3, backgroundColor: colors.red,
  },
  spectatorLiveText: {
    fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 10,
    color: colors.red, letterSpacing: 1,
  },
});
