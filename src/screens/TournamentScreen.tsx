import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Pressable } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { TopBar } from '../components/ui/TopBar';
import { GlossyButton } from '../components/ui/GlossyButton';
import { useShopStore } from '../stores/shopStore';
import { useGameStore } from '../stores/gameStore';
import { useTournamentStore } from '../stores/tournamentStore';
import { haptics } from '../services/haptics';
import { playSound } from '../services/audio';
import { colors } from '../theme/colors';
import { fonts, weight } from '../theme/typography';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Tournament'>;
};

export function TournamentScreen({ navigation }: Props) {
  const { coins, gems, level } = useShopStore();
  const newGame = useGameStore(s => s.newGame);
  const resetScores = useGameStore(s => s.resetScores);
  const tournament = useTournamentStore();

  const [playerCount, setPlayerCount] = useState(4);
  const [playerNames, setPlayerNames] = useState(['Player 1', 'Player 2', 'Player 3', 'Player 4']);

  // Check if returning from a game with a result
  useEffect(() => {
    if (!tournament.isActive) return;

    const match = tournament.getCurrentMatch();
    if (!match) return;

    // Check if a game was just completed
    const gameStatus = useGameStore.getState().status;
    const winner = useGameStore.getState().winner;

    if (gameStatus === 'won' && winner !== null) {
      // Record result
      const winnerIndex = winner === 1 ? match.player1Index : match.player2Index;
      tournament.recordResult(winnerIndex);
      playSound('coin');
    }
  }, []);

  const updatePlayerCount = (count: number) => {
    haptics.tap();
    setPlayerCount(count);
    const names = [...playerNames];
    while (names.length < count) names.push(`Player ${names.length + 1}`);
    setPlayerNames(names.slice(0, count));
  };

  const startTournament = () => {
    haptics.tap();
    tournament.startTournament(playerNames.slice(0, playerCount));
  };

  const playMatch = () => {
    const match = tournament.getCurrentMatch();
    if (!match) return;

    haptics.tap();
    resetScores();
    const p1 = tournament.players[match.player1Index];
    const p2 = tournament.players[match.player2Index];
    (global as any).__localPlayerNames = { player1: p1.name, player2: p2.name };
    (global as any).__tournamentMatch = true;
    newGame('medium', false);
    navigation.navigate('Game');
  };

  // ═══ SETUP PHASE ═══
  if (!tournament.isActive && !tournament.champion) {
    return (
      <ScreenBackground>
        <View style={styles.container}>
          <TopBar coins={coins} gems={gems} level={level} showBack onBackPress={() => navigation.goBack()} />

          <ScrollView contentContainerStyle={styles.setupContent}>
            <Text style={styles.title}>TOURNAMENT</Text>
            <Text style={styles.subtitle}>Local bracket — 4 to 8 players</Text>

            <View style={styles.countRow}>
              {[4, 6, 8].map(n => (
                <Pressable
                  key={n}
                  onPress={() => updatePlayerCount(n)}
                  style={[styles.countBtn, playerCount === n && styles.countBtnActive]}
                >
                  <Text style={[styles.countText, playerCount === n && styles.countTextActive]}>{n} Players</Text>
                </Pressable>
              ))}
            </View>

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

            <GlossyButton label="START TOURNAMENT" variant="orange" iconRight="🏆" onPress={startTournament} />
          </ScrollView>
        </View>
      </ScreenBackground>
    );
  }

  // ═══ CHAMPION SCREEN ═══
  if (tournament.champion) {
    return (
      <ScreenBackground>
        <View style={styles.container}>
          <TopBar coins={coins} gems={gems} level={level} showBack onBackPress={() => navigation.goBack()} />

          <View style={styles.championArea}>
            <Text style={styles.championEmoji}>🏆</Text>
            <Text style={styles.championTitle}>CHAMPION</Text>
            <Text style={styles.championName}>{tournament.champion}</Text>

            <View style={styles.bracketResults}>
              {tournament.players.map((p, i) => (
                <View key={i} style={[styles.resultRow, p.name === tournament.champion && styles.resultRowChamp]}>
                  <Text style={styles.resultSeed}>#{p.seed}</Text>
                  <Text style={[styles.resultName, p.eliminated && { color: colors.textMuted }]}>{p.name}</Text>
                  <Text style={styles.resultWins}>{p.wins}W</Text>
                </View>
              ))}
            </View>

            <View style={styles.championButtons}>
              <GlossyButton label="NEW TOURNAMENT" variant="orange" onPress={() => { tournament.reset(); }} />
              <GlossyButton label="HOME" variant="navy" onPress={() => { tournament.reset(); navigation.goBack(); }} style={{ marginTop: 8 }} />
            </View>
          </View>
        </View>
      </ScreenBackground>
    );
  }

  // ═══ BRACKET PHASE ═══
  const currentMatch = tournament.getCurrentMatch();

  return (
    <ScreenBackground>
      <View style={styles.container}>
        <TopBar coins={coins} gems={gems} level={level} showBack onBackPress={() => navigation.goBack()} />

        <View style={styles.bracketHeader}>
          <Text style={styles.title}>{tournament.getRoundName()}</Text>
          <Text style={styles.subtitle}>{tournament.getActivePlayers().length} players remaining</Text>
        </View>

        <ScrollView contentContainerStyle={styles.bracketContent}>
          {/* All matches */}
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
  setupContent: { alignItems: 'center', paddingHorizontal: 20, paddingBottom: 40, gap: 14 },
  title: { fontFamily: fonts.heading, fontWeight: weight.bold, fontSize: 26, color: '#ffffff', letterSpacing: 2, marginTop: 8 },
  subtitle: { fontFamily: fonts.body, fontWeight: weight.regular, fontSize: 13, color: colors.textSecondary, marginBottom: 8 },
  countRow: { flexDirection: 'row', gap: 8 },
  countBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'transparent' },
  countBtnActive: { backgroundColor: 'rgba(255,140,0,0.15)', borderColor: colors.orange },
  countText: { fontFamily: fonts.body, fontWeight: weight.semibold, fontSize: 14, color: colors.textSecondary },
  countTextActive: { color: colors.orange },
  nameList: { width: '100%', gap: 8 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  seedBadge: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  seedText: { fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 12, color: '#ffffff' },
  nameInput: { flex: 1, fontFamily: fonts.body, fontWeight: weight.medium, fontSize: 15, color: '#ffffff', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  // Bracket
  bracketHeader: { alignItems: 'center', marginTop: 4, marginBottom: 8 },
  bracketContent: { paddingHorizontal: 16, gap: 8, paddingBottom: 100 },
  matchCard: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 14, gap: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  matchCardCurrent: { borderColor: 'rgba(255,140,0,0.4)', backgroundColor: 'rgba(255,140,0,0.06)' },
  matchRound: { fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 10, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1, textAlign: 'center' },
  matchPlayers: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  matchName: { fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 15, color: '#ffffff', flex: 1, textAlign: 'center' },
  matchWinner: { color: colors.green },
  vsLabel: { fontFamily: fonts.heading, fontWeight: weight.bold, fontSize: 13, color: colors.textSecondary, marginHorizontal: 8 },
  matchResult: { fontFamily: fonts.body, fontWeight: weight.semibold, fontSize: 12, color: colors.green, textAlign: 'center' },
  // Champion
  championArea: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  championEmoji: { fontSize: 64, marginBottom: 12 },
  championTitle: { fontFamily: fonts.heading, fontWeight: weight.bold, fontSize: 32, color: colors.coinGold, letterSpacing: 3 },
  championName: { fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 24, color: '#ffffff', marginTop: 4, marginBottom: 20 },
  bracketResults: { width: '100%', gap: 4, marginBottom: 20 },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 10 },
  resultRowChamp: { borderWidth: 1, borderColor: 'rgba(255,209,102,0.3)', backgroundColor: 'rgba(255,209,102,0.08)' },
  resultSeed: { fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 12, color: colors.textSecondary, width: 24 },
  resultName: { fontFamily: fonts.body, fontWeight: weight.semibold, fontSize: 14, color: '#ffffff', flex: 1 },
  resultWins: { fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 12, color: colors.green },
  championButtons: { width: '100%' },
});
