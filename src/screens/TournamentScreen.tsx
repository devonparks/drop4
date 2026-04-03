import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Pressable } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { TopBar } from '../components/ui/TopBar';
import { GlossyButton } from '../components/ui/GlossyButton';
import { useShopStore } from '../stores/shopStore';
import { useGameStore } from '../stores/gameStore';
import { haptics } from '../services/haptics';
import { colors } from '../theme/colors';
import { fonts, weight } from '../theme/typography';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Tournament'>;
};

type TournamentPhase = 'setup' | 'bracket' | 'playing' | 'complete';

interface TournamentPlayer {
  name: string;
  eliminated: boolean;
}

export function TournamentScreen({ navigation }: Props) {
  const { coins, gems, level } = useShopStore();
  const newGame = useGameStore(s => s.newGame);

  const [phase, setPhase] = useState<TournamentPhase>('setup');
  const [playerCount, setPlayerCount] = useState(4);
  const [players, setPlayers] = useState<TournamentPlayer[]>([
    { name: 'Player 1', eliminated: false },
    { name: 'Player 2', eliminated: false },
    { name: 'Player 3', eliminated: false },
    { name: 'Player 4', eliminated: false },
  ]);
  const [currentMatch, setCurrentMatch] = useState(0);
  const [round, setRound] = useState(1);

  const updatePlayerCount = (count: number) => {
    haptics.tap();
    setPlayerCount(count);
    const newPlayers: TournamentPlayer[] = [];
    for (let i = 0; i < count; i++) {
      newPlayers.push({
        name: players[i]?.name || `Player ${i + 1}`,
        eliminated: false,
      });
    }
    setPlayers(newPlayers);
  };

  const updatePlayerName = (index: number, name: string) => {
    setPlayers(prev => prev.map((p, i) => i === index ? { ...p, name } : p));
  };

  const startTournament = () => {
    haptics.tap();
    setPhase('bracket');
  };

  const activePlayers = players.filter(p => !p.eliminated);
  const totalRounds = Math.ceil(Math.log2(playerCount));
  const roundNames: Record<number, string> = {
    1: playerCount === 8 ? 'Quarterfinals' : 'Semifinals',
    2: playerCount === 8 ? 'Semifinals' : 'Finals',
    3: 'Finals',
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

        {phase === 'setup' && (
          <ScrollView contentContainerStyle={styles.setupContent}>
            <Text style={styles.title}>TOURNAMENT</Text>
            <Text style={styles.subtitle}>Local bracket for 4-8 players</Text>

            {/* Player count selector */}
            <View style={styles.countRow}>
              {[4, 6, 8].map(n => (
                <Pressable
                  key={n}
                  onPress={() => updatePlayerCount(n)}
                  style={[styles.countBtn, playerCount === n && styles.countBtnActive]}
                >
                  <Text style={[styles.countText, playerCount === n && styles.countTextActive]}>
                    {n} Players
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Player name inputs */}
            <View style={styles.nameList}>
              {players.map((player, i) => (
                <View key={i} style={styles.nameRow}>
                  <View style={[styles.seedBadge, { backgroundColor: i < 2 ? 'rgba(39,174,61,0.2)' : 'rgba(255,255,255,0.06)' }]}>
                    <Text style={styles.seedText}>#{i + 1}</Text>
                  </View>
                  <TextInput
                    style={styles.nameInput}
                    value={player.name}
                    onChangeText={(text) => updatePlayerName(i, text)}
                    placeholder={`Player ${i + 1}`}
                    placeholderTextColor={colors.textMuted}
                    maxLength={12}
                  />
                </View>
              ))}
            </View>

            <GlossyButton
              label="START TOURNAMENT"
              variant="orange"
              iconRight="🏆"
              onPress={startTournament}
            />
          </ScrollView>
        )}

        {phase === 'bracket' && (
          <View style={styles.bracketContent}>
            <Text style={styles.title}>{roundNames[round] || `Round ${round}`}</Text>
            <Text style={styles.subtitle}>{activePlayers.length} players remaining</Text>

            <View style={styles.matchList}>
              {/* Generate matches from active players */}
              {Array.from({ length: Math.floor(activePlayers.length / 2) }).map((_, i) => {
                const p1 = activePlayers[i * 2];
                const p2 = activePlayers[i * 2 + 1];
                return (
                  <View key={i} style={styles.matchCard}>
                    <View style={styles.matchHeader}>
                      <Text style={styles.matchLabel}>Match {i + 1}</Text>
                    </View>
                    <View style={styles.matchPlayers}>
                      <Text style={styles.matchPlayerName}>{p1?.name}</Text>
                      <Text style={styles.vsLabel}>VS</Text>
                      <Text style={styles.matchPlayerName}>{p2?.name}</Text>
                    </View>
                    <GlossyButton
                      label="PLAY"
                      variant="green"
                      small
                      onPress={() => {
                        newGame('medium', false);
                        navigation.navigate('Game');
                      }}
                    />
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  setupContent: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 16,
  },
  bracketContent: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 28,
    color: '#ffffff',
    letterSpacing: 2,
    marginTop: 8,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontWeight: weight.regular,
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  countRow: {
    flexDirection: 'row',
    gap: 8,
  },
  countBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  countBtnActive: {
    backgroundColor: 'rgba(255,140,0,0.15)',
    borderColor: colors.orange,
  },
  countText: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 14,
    color: colors.textSecondary,
  },
  countTextActive: {
    color: colors.orange,
  },
  nameList: {
    width: '100%',
    gap: 8,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  seedBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seedText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 12,
    color: '#ffffff',
  },
  nameInput: {
    flex: 1,
    fontFamily: fonts.body,
    fontWeight: weight.medium,
    fontSize: 15,
    color: '#ffffff',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  matchList: {
    width: '100%',
    gap: 12,
    marginTop: 12,
  },
  matchCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 10,
  },
  matchHeader: {
    alignItems: 'center',
  },
  matchLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 12,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  matchPlayers: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  matchPlayerName: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 16,
    color: '#ffffff',
    flex: 1,
    textAlign: 'center',
  },
  vsLabel: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 14,
    color: colors.textSecondary,
    marginHorizontal: 12,
  },
});
