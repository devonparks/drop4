import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { TopBar } from '../components/ui/TopBar';
import { GlossyButton } from '../components/ui/GlossyButton';
import { useShopStore } from '../stores/shopStore';
import { useGameStore } from '../stores/gameStore';
import { colors } from '../theme/colors';
import { fonts, weight } from '../theme/typography';
import { haptics } from '../services/haptics';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'LocalPlay'>;
};

export function LocalPlayScreen({ navigation }: Props) {
  const coins = useShopStore(s => s.coins);
  const gems = useShopStore(s => s.gems);
  const level = useShopStore(s => s.level);
  const newGame = useGameStore(s => s.newGame);
  const resetScores = useGameStore(s => s.resetScores);

  const [player1Name, setPlayer1Name] = useState('Player 1');
  const [player2Name, setPlayer2Name] = useState('Player 2');

  const startLocalGame = () => {
    haptics.tap();
    resetScores();
    newGame('medium', false);
    navigation.navigate('Matchup', {
      mode: 'local',
      courtName: 'LOCAL MATCH',
      opponentName: player2Name || 'Player 2',
      opponentLevel: level,
      opponentTitle: 'Local Player',
      localPlayerNames: { player1: player1Name || 'Player 1', player2: player2Name || 'Player 2' },
    });
  };

  return (
    <ScreenBackground>
      <View style={styles.container}>
        <TopBar
          coins={coins} gems={gems} level={level}
          showBack onBackPress={() => navigation.goBack()}
        />

        <View style={styles.mainContent}>
          <Text style={styles.title}>LOCAL PLAY</Text>
          <Text style={styles.subtitle}>Pass & Play on one device</Text>

          {/* Player 1 */}
          <View style={styles.playerCard}>
            <LinearGradient
              colors={['rgba(230,57,70,0.12)', 'rgba(230,57,70,0.04)']}
              style={styles.playerGradient}
            >
              <View style={[styles.playerDot, { backgroundColor: colors.pieceRed }]}>
                <Text style={styles.dotLabel}>P1</Text>
              </View>
              <TextInput
                style={styles.nameInput}
                value={player1Name}
                onChangeText={setPlayer1Name}
                placeholder="Player 1"
                placeholderTextColor={colors.textMuted}
                maxLength={12}
              />
              <Text style={styles.pieceIcon}>🔴</Text>
            </LinearGradient>
          </View>

          <View style={styles.vsWrap}>
            <View style={styles.vsLine} />
            <Text style={styles.vsText}>VS</Text>
            <View style={styles.vsLine} />
          </View>

          {/* Player 2 */}
          <View style={styles.playerCard}>
            <LinearGradient
              colors={['rgba(244,166,35,0.12)', 'rgba(244,166,35,0.04)']}
              style={styles.playerGradient}
            >
              <View style={[styles.playerDot, { backgroundColor: colors.pieceYellow }]}>
                <Text style={styles.dotLabel}>P2</Text>
              </View>
              <TextInput
                style={styles.nameInput}
                value={player2Name}
                onChangeText={setPlayer2Name}
                placeholder="Player 2"
                placeholderTextColor={colors.textMuted}
                maxLength={12}
              />
              <Text style={styles.pieceIcon}>🟡</Text>
            </LinearGradient>
          </View>

          <GlossyButton
            label="START GAME"
            variant="orange"
            iconRight="▶"
            onPress={startLocalGame}
            style={{ marginTop: 16 }}
          />
        </View>
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  mainContent: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 16,
  },
  title: {
    fontFamily: fonts.heading, fontWeight: weight.bold,
    fontSize: 28, color: '#ffffff', letterSpacing: 2,
  },
  subtitle: {
    fontFamily: fonts.body, fontWeight: weight.regular,
    fontSize: 13, color: colors.textSecondary,
    marginTop: 4, marginBottom: 24,
  },
  playerCard: {
    width: '100%', maxWidth: 340, borderRadius: 16, overflow: 'hidden',
    alignSelf: 'center',
  },
  playerGradient: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 12, paddingHorizontal: 12, borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  playerDot: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  dotLabel: {
    fontFamily: fonts.body, fontWeight: weight.bold,
    fontSize: 12, color: '#ffffff',
  },
  nameInput: {
    flex: 1, fontFamily: fonts.body, fontWeight: weight.medium,
    fontSize: 16, color: '#ffffff',
    backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  pieceIcon: { fontSize: 22, marginRight: 4 },
  vsWrap: {
    flexDirection: 'row', alignItems: 'center',
    gap: 12, marginVertical: 14,
  },
  vsLine: {
    flex: 1, height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  vsText: {
    fontFamily: fonts.heading, fontWeight: weight.bold,
    fontSize: 20, color: colors.textSecondary,
  },
});
