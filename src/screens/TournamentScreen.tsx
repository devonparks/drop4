import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Pressable } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { TopBar } from '../components/ui/TopBar';
import { GlossyButton } from '../components/ui/GlossyButton';
import { useShopStore } from '../stores/shopStore';
import { useGameStore } from '../stores/gameStore';
import { useTournamentStore, calculatePrizePool, FREE_TOURNAMENT_PRIZES, TournamentPayout } from '../stores/tournamentStore';
import { haptics } from '../services/haptics';
import { playSound } from '../services/audio';
import { colors } from '../theme/colors';
import { fonts, weight } from '../theme/typography';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Tournament'>;
};

const ENTRY_FEE_OPTIONS = [0, 50, 100, 500, 1000, 5000];

export function TournamentScreen({ navigation }: Props) {
  const coins = useShopStore(s => s.coins);
  const gems = useShopStore(s => s.gems);
  const level = useShopStore(s => s.level);
  const spendCoins = useShopStore(s => s.spendCoins);
  const newGame = useGameStore(s => s.newGame);
  const resetScores = useGameStore(s => s.resetScores);
  const tournament = useTournamentStore();

  const [playerCount, setPlayerCount] = useState<4 | 8 | 16>(4);
  const [playerNames, setPlayerNames] = useState(['Player 1', 'Player 2', 'Player 3', 'Player 4']);
  const [entryFee, setEntryFee] = useState(0);
  const [isRanked, setIsRanked] = useState(false);

  // Prize pool preview
  const prizePreview = useMemo(() => {
    return calculatePrizePool(playerCount, entryFee);
  }, [playerCount, entryFee]);

  // Check if returning from a game with a result.
  // useFocusEffect runs each time the screen comes into focus (including when
  // returning from GameScreen), so tournament results are properly recorded.
  useFocusEffect(
    useCallback(() => {
      if (!tournament.isActive) return;
      const match = tournament.getCurrentMatch();
      // Guard: skip if no match pending or it's already been recorded
      if (!match || match.winner !== null) return;
      const gameStatus = useGameStore.getState().status;
      const winner = useGameStore.getState().winner;
      if (gameStatus === 'won' && winner !== null) {
        const winnerIndex = winner === 1 ? match.player1Index : match.player2Index;
        tournament.recordResult(winnerIndex);
        playSound('win');
      }
    }, [tournament])
  );

  const updatePlayerCount = (count: 4 | 8 | 16) => {
    haptics.tap();
    setPlayerCount(count);
    const names = [...playerNames];
    while (names.length < count) names.push(`Player ${names.length + 1}`);
    setPlayerNames(names.slice(0, count));
  };

  const canAffordEntry = entryFee === 0 || coins >= entryFee * playerCount;

  const startTournament = () => {
    // Collect entry fees from all players (in local play, just deduct once as "the house")
    if (entryFee > 0) {
      const totalCost = entryFee; // Player pays their own entry
      const success = spendCoins(totalCost);
      if (!success) { haptics.error(); return; }
    }

    haptics.tap();
    tournament.startTournament(playerNames.slice(0, playerCount), {
      entryFee,
      isRanked,
      playerCount,
    });
  };

  const playMatch = () => {
    const match = tournament.getCurrentMatch();
    if (!match) return;

    haptics.tap();
    playSound('click');
    resetScores();
    const p1 = tournament.players[match.player1Index];
    const p2 = tournament.players[match.player2Index];
    newGame('medium', false);
    navigation.navigate('Game', {
      localPlayerNames: { player1: p1.name, player2: p2.name },
    });
  };

  // ═══════════════════════════════════════
  // SETUP PHASE
  // ═══════════════════════════════════════
  if (!tournament.isActive && !tournament.champion) {
    return (
      <ScreenBackground>
        <View style={styles.container}>
          <TopBar coins={coins} gems={gems} level={level} showBack onBackPress={() => navigation.goBack()} />

          <ScrollView contentContainerStyle={styles.setupContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>TOURNAMENT</Text>
            <Text style={styles.subtitle}>Local bracket with prize pools</Text>

            {/* Player Count */}
            <Text style={styles.sectionLabel}>PLAYERS</Text>
            <View style={styles.countRow}>
              {([4, 8, 16] as const).map(n => (
                <Pressable
                  key={n}
                  onPress={() => updatePlayerCount(n)}
                  style={[styles.countBtn, playerCount === n && styles.countBtnActive]}
                >
                  <Text style={[styles.countText, playerCount === n && styles.countTextActive]}>{n}</Text>
                </Pressable>
              ))}
            </View>

            {/* Entry Fee */}
            <Text style={styles.sectionLabel}>ENTRY FEE</Text>
            <View style={styles.feeRow}>
              {ENTRY_FEE_OPTIONS.map(fee => (
                <Pressable
                  key={fee}
                  onPress={() => { haptics.tap(); setEntryFee(fee); }}
                  style={[styles.feeBtn, entryFee === fee && styles.feeBtnActive]}
                >
                  <Text style={[styles.feeText, entryFee === fee && styles.feeTextActive]}>
                    {fee === 0 ? 'FREE' : `${fee.toLocaleString()}`}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Ranked Toggle */}
            <Pressable
              onPress={() => { haptics.tap(); setIsRanked(!isRanked); }}
              style={[styles.rankedToggle, isRanked && styles.rankedToggleActive]}
            >
              <Text style={styles.rankedToggleIcon}>{isRanked ? '⚔️' : '🎮'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rankedToggleLabel, isRanked && styles.rankedToggleLabelActive]}>
                  {isRanked ? 'RANKED' : 'CASUAL'}
                </Text>
                <Text style={styles.rankedToggleDesc}>
                  {isRanked ? 'Wins/losses affect MMR' : 'No MMR impact'}
                </Text>
              </View>
              <View style={[styles.toggleDot, isRanked && styles.toggleDotActive]} />
            </Pressable>

            {/* Prize Pool Display */}
            <View style={styles.prizePoolCard}>
              <Text style={styles.prizePoolTitle}>
                {entryFee > 0 ? 'PRIZE POOL' : 'PRIZES'}
              </Text>

              {entryFee > 0 ? (
                <>
                  <Text style={styles.prizePoolAmount}>
                    {'\u{1FA99}'} {prizePreview.prizePool.toLocaleString()}
                  </Text>
                  <View style={styles.payoutTable}>
                    {prizePreview.payouts.map(p => (
                      <View key={p.place} style={styles.payoutRow}>
                        <Text style={styles.payoutPlace}>
                          {p.place === 1 ? '🥇' : p.place === 2 ? '🥈' : p.place === 3 ? '🥉' : `${p.place}th`}
                        </Text>
                        <Text style={styles.payoutLabel}>
                          {p.place === 1 ? '1st' : p.place === 2 ? '2nd' : p.place === 3 ? '3rd' : `${p.place}th`}
                        </Text>
                        <Text style={styles.payoutPct}>{p.percentage}%</Text>
                        <Text style={[
                          styles.payoutAmount,
                          p.amount >= entryFee ? { color: colors.green } : { color: colors.textSecondary },
                        ]}>
                          {'\u{1FA99}'} {p.amount.toLocaleString()}
                        </Text>
                      </View>
                    ))}
                    <View style={styles.payoutRow}>
                      <Text style={styles.payoutPlace}>{'💀'}</Text>
                      <Text style={styles.payoutLabel}>Rest</Text>
                      <Text style={styles.payoutPct}>—</Text>
                      <Text style={[styles.payoutAmount, { color: colors.red }]}>
                        -{'\u{1FA99}'} {entryFee.toLocaleString()}
                      </Text>
                    </View>
                  </View>
                </>
              ) : (
                <View style={styles.payoutTable}>
                  {FREE_TOURNAMENT_PRIZES.map(p => (
                    <View key={p.place} style={styles.payoutRow}>
                      <Text style={styles.payoutPlace}>
                        {p.place === 1 ? '🥇' : p.place === 2 ? '🥈' : '🥉'}
                      </Text>
                      <Text style={styles.payoutLabel}>
                        {p.place === 1 ? '1st' : p.place === 2 ? '2nd' : '3rd'}
                      </Text>
                      <Text style={styles.payoutPct}>—</Text>
                      <Text style={[styles.payoutAmount, { color: colors.green }]}>
                        +{'\u{1FA99}'} {p.coins.toLocaleString()}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Player Names */}
            <Text style={styles.sectionLabel}>PLAYER NAMES</Text>
            <View style={styles.nameList}>
              {playerNames.slice(0, playerCount).map((name, i) => (
                <View key={i} style={styles.nameRow}>
                  <View style={[styles.seedBadge, i < 2 ? { backgroundColor: 'rgba(39,174,61,0.15)' } : {}]}>
                    <Text style={styles.seedText}>#{i + 1}</Text>
                  </View>
                  <TextInput
                    style={styles.nameInput}
                    value={name}
                    onChangeText={text => {
                      const names = [...playerNames];
                      names[i] = text;
                      setPlayerNames(names);
                    }}
                    placeholder={`Player ${i + 1}`}
                    placeholderTextColor={colors.textMuted}
                    maxLength={12}
                  />
                </View>
              ))}
            </View>

            <GlossyButton
              label={entryFee > 0 ? `START — ${'\u{1FA99}'} ${entryFee} ENTRY` : 'START TOURNAMENT'}
              variant="orange"
              iconRight="🏆"
              onPress={startTournament}
              disabled={entryFee > 0 && coins < entryFee}
            />

            {entryFee > 0 && coins < entryFee && (
              <Text style={styles.cantAfford}>Not enough coins for entry fee</Text>
            )}

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </ScreenBackground>
    );
  }

  // ═══════════════════════════════════════
  // CHAMPION SCREEN
  // ═══════════════════════════════════════
  if (tournament.champion) {
    const standings = tournament.getFinalStandings();
    const config = tournament.config;

    return (
      <ScreenBackground>
        <View style={styles.container}>
          <TopBar coins={coins} gems={gems} level={level} showBack onBackPress={() => navigation.goBack()} />

          <ScrollView contentContainerStyle={styles.championArea}>
            <Text style={styles.championEmoji}>🏆</Text>
            <Text style={styles.championTitle}>CHAMPION</Text>
            <Text style={styles.championName}>{tournament.champion}</Text>

            {config && config.isRanked && (
              <View style={styles.rankedBadge}>
                <Text style={styles.rankedBadgeText}>RANKED — MMR UPDATED</Text>
              </View>
            )}

            {/* Final Standings with Payouts */}
            <View style={styles.standingsCard}>
              <Text style={styles.standingsTitle}>FINAL STANDINGS</Text>
              {standings.map((s, i) => (
                <View key={i} style={[
                  styles.standingRow,
                  s.place === 1 && styles.standingRowChamp,
                  s.payout > 0 && s.place > 1 && styles.standingRowPaid,
                ]}>
                  <Text style={styles.standingPlace}>
                    {s.place === 1 ? '🥇' : s.place === 2 ? '🥈' : s.place === 3 ? '🥉' : `#${s.place}`}
                  </Text>
                  <Text style={[styles.standingName, s.place > 3 && { color: colors.textMuted }]}>
                    {s.name}
                  </Text>
                  {s.payout > 0 ? (
                    <Text style={styles.standingPayout}>
                      +{'\u{1FA99}'} {s.payout.toLocaleString()}
                    </Text>
                  ) : config && config.entryFee > 0 ? (
                    <Text style={styles.standingLost}>
                      -{'\u{1FA99}'} {config.entryFee.toLocaleString()}
                    </Text>
                  ) : null}
                </View>
              ))}
            </View>

            <View style={styles.championButtons}>
              <GlossyButton label="NEW TOURNAMENT" variant="orange" onPress={() => { tournament.reset(); }} />
              <GlossyButton label="HOME" variant="navy" onPress={() => { tournament.reset(); navigation.goBack(); }} style={{ marginTop: 8 }} />
            </View>
          </ScrollView>
        </View>
      </ScreenBackground>
    );
  }

  // ═══════════════════════════════════════
  // BRACKET PHASE
  // ═══════════════════════════════════════
  const config = tournament.config;

  return (
    <ScreenBackground>
      <View style={styles.container}>
        <TopBar coins={coins} gems={gems} level={level} showBack onBackPress={() => navigation.goBack()} />

        <View style={styles.bracketHeader}>
          <Text style={styles.title}>{tournament.getRoundName()}</Text>
          <Text style={styles.subtitle}>{tournament.getActivePlayers().length} players remaining</Text>

          {/* Tournament info pills */}
          <View style={styles.infoPills}>
            {config && config.entryFee > 0 && (
              <View style={styles.infoPill}>
                <Text style={styles.infoPillText}>
                  Pool: {'\u{1FA99}'} {config.prizePool.toLocaleString()}
                </Text>
              </View>
            )}
            {config && config.isRanked && (
              <View style={[styles.infoPill, { backgroundColor: 'rgba(233,69,96,0.15)', borderColor: 'rgba(233,69,96,0.3)' }]}>
                <Text style={[styles.infoPillText, { color: '#e94560' }]}>RANKED</Text>
              </View>
            )}
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.bracketContent} showsVerticalScrollIndicator={false}>
          {tournament.matches.map((match, i) => {
            const p1 = tournament.players[match.player1Index];
            const p2 = tournament.players[match.player2Index];
            const isCurrentMatch = i === tournament.currentMatchIndex;
            const isPlayed = match.winner !== null;

            return (
              <View key={i} style={[styles.matchCard, isCurrentMatch && styles.matchCardCurrent]}>
                <Text style={styles.matchRound}>Round {match.round} — Match {i + 1}</Text>
                <View style={styles.matchPlayers}>
                  <Text style={[styles.matchName, match.winner === match.player1Index && styles.matchWinner]}>
                    {p1.name}
                  </Text>
                  <Text style={styles.vsLabel}>{isPlayed ? (match.winner === match.player1Index ? '✓' : '✗') : 'VS'}</Text>
                  <Text style={[styles.matchName, match.winner === match.player2Index && styles.matchWinner]}>
                    {p2.name}
                  </Text>
                </View>
                {isCurrentMatch && !isPlayed && (
                  <GlossyButton label="PLAY THIS MATCH" variant="green" small onPress={playMatch} />
                )}
                {isPlayed && (
                  <Text style={styles.matchResult}>
                    Winner: {tournament.players[match.winner!].name}
                  </Text>
                )}
              </View>
            );
          })}
        </ScrollView>
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // ═══ Setup ═══
  setupContent: { alignItems: 'center', paddingHorizontal: 20, paddingBottom: 40, gap: 10 },
  title: { fontFamily: fonts.heading, fontWeight: weight.bold, fontSize: 26, color: '#ffffff', letterSpacing: 2, marginTop: 8 },
  subtitle: { fontFamily: fonts.body, fontWeight: weight.regular, fontSize: 13, color: colors.textSecondary, marginBottom: 4 },
  sectionLabel: {
    fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 10,
    color: colors.textMuted, letterSpacing: 1.5, textTransform: 'uppercase',
    alignSelf: 'flex-start', marginTop: 8, marginBottom: 2,
  },

  // Player count
  countRow: { flexDirection: 'row', gap: 8, width: '100%' },
  countBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'transparent',
    alignItems: 'center',
  },
  countBtnActive: { backgroundColor: 'rgba(255,140,0,0.15)', borderColor: colors.orange },
  countText: { fontFamily: fonts.heading, fontWeight: weight.bold, fontSize: 18, color: colors.textSecondary },
  countTextActive: { color: colors.orange },

  // Entry fee
  feeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, width: '100%' },
  feeBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'transparent',
  },
  feeBtnActive: { backgroundColor: 'rgba(241,196,15,0.15)', borderColor: colors.coinGold },
  feeText: { fontFamily: fonts.body, fontWeight: weight.semibold, fontSize: 12, color: colors.textSecondary },
  feeTextActive: { color: colors.coinGold },

  // Ranked toggle
  rankedToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    width: '100%', padding: 12, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  rankedToggleActive: {
    backgroundColor: 'rgba(233,69,96,0.08)', borderColor: 'rgba(233,69,96,0.3)',
  },
  rankedToggleIcon: { fontSize: 22 },
  rankedToggleLabel: { fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 13, color: colors.textSecondary, letterSpacing: 1 },
  rankedToggleLabelActive: { color: '#e94560' },
  rankedToggleDesc: { fontFamily: fonts.body, fontWeight: weight.regular, fontSize: 10, color: colors.textMuted, marginTop: 1 },
  toggleDot: {
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)',
  },
  toggleDotActive: { backgroundColor: '#e94560', borderColor: '#e94560' },

  // Prize pool card
  prizePoolCard: {
    width: '100%', padding: 14, borderRadius: 14,
    backgroundColor: 'rgba(241,196,15,0.06)', borderWidth: 1, borderColor: 'rgba(241,196,15,0.15)',
    alignItems: 'center', gap: 8,
  },
  prizePoolTitle: {
    fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 10,
    color: colors.coinGold, letterSpacing: 1.5,
  },
  prizePoolAmount: {
    fontFamily: fonts.heading, fontWeight: weight.bold, fontSize: 28, color: colors.coinGold,
  },
  payoutTable: { width: '100%', gap: 4 },
  payoutRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 4, paddingHorizontal: 8,
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 8,
  },
  payoutPlace: { fontSize: 16, width: 28, textAlign: 'center' },
  payoutLabel: { fontFamily: fonts.body, fontWeight: weight.semibold, fontSize: 12, color: colors.textSecondary, width: 32 },
  payoutPct: { fontFamily: fonts.body, fontWeight: weight.medium, fontSize: 11, color: colors.textMuted, width: 36, textAlign: 'center' },
  payoutAmount: { fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 13, color: '#ffffff', flex: 1, textAlign: 'right' },

  cantAfford: { fontFamily: fonts.body, fontWeight: weight.semibold, fontSize: 11, color: colors.red, marginTop: 4 },

  // Player names
  nameList: { width: '100%', gap: 6 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  seedBadge: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  seedText: { fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 11, color: '#ffffff' },
  nameInput: {
    flex: 1, fontFamily: fonts.body, fontWeight: weight.medium, fontSize: 14, color: '#ffffff',
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },

  // ═══ Bracket ═══
  bracketHeader: { alignItems: 'center', marginTop: 4, marginBottom: 8, gap: 4 },
  infoPills: { flexDirection: 'row', gap: 6, marginTop: 4 },
  infoPill: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
    backgroundColor: 'rgba(241,196,15,0.12)', borderWidth: 1, borderColor: 'rgba(241,196,15,0.25)',
  },
  infoPillText: { fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 10, color: colors.coinGold, letterSpacing: 0.5 },
  bracketContent: { paddingHorizontal: 16, gap: 8, paddingBottom: 100 },
  matchCard: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 14, gap: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  matchCardCurrent: { borderColor: 'rgba(255,140,0,0.4)', backgroundColor: 'rgba(255,140,0,0.06)' },
  matchRound: { fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 10, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1, textAlign: 'center' },
  matchPlayers: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  matchName: { fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 15, color: '#ffffff', flex: 1, textAlign: 'center' },
  matchWinner: { color: colors.green },
  vsLabel: { fontFamily: fonts.heading, fontWeight: weight.bold, fontSize: 13, color: colors.textSecondary, marginHorizontal: 8 },
  matchResult: { fontFamily: fonts.body, fontWeight: weight.semibold, fontSize: 12, color: colors.green, textAlign: 'center' },

  // ═══ Champion ═══
  championArea: { alignItems: 'center', paddingHorizontal: 24, paddingBottom: 40 },
  championEmoji: { fontSize: 64, marginBottom: 12, marginTop: 20 },
  championTitle: { fontFamily: fonts.heading, fontWeight: weight.bold, fontSize: 32, color: colors.coinGold, letterSpacing: 3 },
  championName: { fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 24, color: '#ffffff', marginTop: 4, marginBottom: 12 },
  rankedBadge: {
    backgroundColor: 'rgba(233,69,96,0.15)', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 4, marginBottom: 16,
  },
  rankedBadgeText: { fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 10, color: '#e94560', letterSpacing: 1 },

  // Final standings
  standingsCard: {
    width: '100%', padding: 14, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    gap: 6, marginBottom: 20,
  },
  standingsTitle: {
    fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 10,
    color: colors.textSecondary, letterSpacing: 1.5, textAlign: 'center', marginBottom: 4,
  },
  standingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 10,
  },
  standingRowChamp: {
    borderWidth: 1, borderColor: 'rgba(255,209,102,0.3)', backgroundColor: 'rgba(255,209,102,0.08)',
  },
  standingRowPaid: {
    borderWidth: 1, borderColor: 'rgba(39,174,61,0.2)', backgroundColor: 'rgba(39,174,61,0.05)',
  },
  standingPlace: { fontSize: 18, width: 30, textAlign: 'center' },
  standingName: { fontFamily: fonts.body, fontWeight: weight.semibold, fontSize: 14, color: '#ffffff', flex: 1 },
  standingPayout: { fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 13, color: colors.green },
  standingLost: { fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 13, color: colors.red },

  championButtons: { width: '100%' },
});
