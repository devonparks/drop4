import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { TopBar } from '../components/ui/TopBar';
import { useShopStore } from '../stores/shopStore';
import { useGameStore } from '../stores/gameStore';
import { useRankedStore } from '../stores/rankedStore';
import { RankBadge } from '../components/ui/RankBadge';
import { haptics } from '../services/haptics';
import { playSound } from '../services/audio';
import { WAGER_COURTS, WagerCourt, canEnterCourt } from '../data/wagerTables';
import { colors } from '../theme/colors';
import { fonts, weight } from '../theme/typography';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Stage'>;
};

function CourtCard({ court, coins, playerLevel, playerTier, onPress }: {
  court: WagerCourt; coins: number; playerLevel: number; playerTier: string; onPress: () => void;
}) {
  const check = canEnterCourt(court, coins, playerLevel, playerTier as any);
  const canPlay = check.allowed;

  return (
    <Pressable
      onPress={() => { if (canPlay) { haptics.tap(); onPress(); } }}
      style={[styles.courtCard, !canPlay && { opacity: 0.4 }]}
    >
      <LinearGradient
        colors={[court.bgColor, 'rgba(0,0,0,0)']}
        style={styles.courtGradient}
      >
        <View style={styles.courtLeft}>
          <Text style={styles.courtIcon}>{court.icon}</Text>
          {court.id === 'rookie_park' && (
            <View style={styles.hotBadge}>
              <Text style={styles.hotText}>{'\uD83D\uDD25'} HOT</Text>
            </View>
          )}
          {court.isVIP && (
            <View style={styles.vipBadge}>
              <Text style={styles.vipText}>{'\uD83D\uDC51'} VIP</Text>
            </View>
          )}
        </View>

        <View style={{ flex: 1 }}>
          <Text style={[styles.courtName, { color: court.color }]}>{court.name}</Text>
          <Text style={styles.courtDesc}>{court.description}</Text>
          {!check.allowed && check.reason && (
            <Text style={styles.lockReq}>{'🔒'} {check.reason}</Text>
          )}
        </View>

        <View style={styles.courtStakes}>
          {court.entryFee > 0 ? (
            <>
              <Text style={styles.entryLabel}>ENTRY</Text>
              <Text style={styles.entryAmount}>
                {'\u{1FA99}'} {court.entryFee.toLocaleString()}
              </Text>
              <View style={styles.winBadge}>
                <Text style={styles.winText}>
                  WIN: {'\u{1FA99}'} {court.winnerGets.toLocaleString()}
                </Text>
              </View>
              <Text style={styles.rakeText}>{court.rake}% rake</Text>
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
  const tier = useRankedStore(s => s.tier);
  const newGame = useGameStore(s => s.newGame);

  const handleSelectCourt = (court: WagerCourt) => {
    if (court.entryFee > 0) {
      // Confirm before spending coins
      Alert.alert(
        `Enter ${court.name}?`,
        `Entry fee: \u{1FA99}${court.entryFee.toLocaleString()}. Winner gets \u{1FA99}${court.winnerGets.toLocaleString()}.`,
        [
          { text: 'CANCEL', style: 'cancel' },
          {
            text: "LET'S GO",
            onPress: () => {
              const success = spendCoins(court.entryFee);
              if (!success) { haptics.error(); return; }
              playSound('coin');
              newGame('hard', true);
              navigation.navigate('Game', { wagerCourt: court });
            },
          },
        ],
      );
    } else {
      // Free court — enter directly
      playSound('coin');
      newGame('hard', true);
      navigation.navigate('Game', { wagerCourt: court });
    }
  };

  return (
    <ScreenBackground>
      <View style={styles.container}>
        <TopBar coins={coins} gems={gems} level={level} showBack onBackPress={() => navigation.goBack()} />

        <View style={styles.header}>
          <Text style={styles.title}>GOLD COURT</Text>
          <Text style={styles.subtitle}>Wager coins. Winner takes all minus rake.</Text>

          {/* Ranked badge */}
          <RankBadge size="medium" showElo style={{ marginTop: 8 }} />

          {/* Balance */}
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Balance</Text>
            <Text style={styles.balanceAmount}>{'\u{1FA99}'} {coins.toLocaleString()}</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.courtList} showsVerticalScrollIndicator={false}>
          {WAGER_COURTS.map(court => (
            <CourtCard
              key={court.id}
              court={court}
              coins={coins}
              playerLevel={level}
              playerTier={tier}
              onPress={() => handleSelectCourt(court)}
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
  balanceCard: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 6, marginTop: 6,
    borderWidth: 1, borderColor: 'rgba(255,209,102,0.15)',
  },
  balanceLabel: { fontFamily: fonts.body, fontWeight: weight.regular, fontSize: 12, color: colors.textSecondary },
  balanceAmount: { fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 18, color: colors.coinGold },

  // Court list
  courtList: { paddingHorizontal: 14, gap: 6, paddingBottom: 100 },
  courtCard: { borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  courtGradient: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', padding: 14, borderRadius: 14,
  },
  courtLeft: { alignItems: 'center', marginRight: 10, gap: 4 },
  courtIcon: { fontSize: 28 },
  hotBadge: {
    backgroundColor: 'rgba(255,140,0,0.2)', borderRadius: 4,
    paddingHorizontal: 6, paddingVertical: 1,
  },
  hotText: { fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 8, color: '#ff8c00', letterSpacing: 1 },
  vipBadge: {
    backgroundColor: 'rgba(233,69,96,0.2)', borderRadius: 4,
    paddingHorizontal: 6, paddingVertical: 1,
  },
  vipText: { fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 8, color: '#e94560', letterSpacing: 1 },
  courtName: { fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 14 },
  courtDesc: { fontFamily: fonts.body, fontWeight: weight.regular, fontSize: 10, color: colors.textSecondary, marginTop: 1 },
  lockReq: { fontFamily: fonts.body, fontWeight: weight.semibold, fontSize: 9, color: colors.red, marginTop: 2 },

  // Stakes column
  courtStakes: { alignItems: 'flex-end', gap: 2 },
  entryLabel: { fontFamily: fonts.body, fontWeight: weight.regular, fontSize: 9, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  entryAmount: { fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 14, color: '#ffffff' },
  winBadge: { backgroundColor: 'rgba(39,174,61,0.15)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, marginTop: 2 },
  winText: { fontFamily: fonts.body, fontWeight: weight.semibold, fontSize: 10, color: colors.green },
  rakeText: { fontFamily: fonts.body, fontWeight: weight.regular, fontSize: 8, color: colors.textMuted, marginTop: 1 },
  freeBadge: { backgroundColor: 'rgba(39,174,61,0.2)', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 6 },
  freeText: { fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 14, color: colors.green },

  // Spectator
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
