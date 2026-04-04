import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
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
  const { coins, gems, level } = useShopStore();
  const newGame = useGameStore(s => s.newGame);
  const resetScores = useGameStore(s => s.resetScores);
  const insets = useSafeAreaInsets();

  const [player1Name, setPlayer1Name] = useState('Player 1');
  const [player2Name, setPlayer2Name] = useState('Player 2');

  const startLocalGame = () => {
    haptics.tap();
    resetScores();
    // Store player names for GameScreen HUD
    (global as any).__localPlayerNames = { player1: player1Name, player2: player2Name };
    newGame('medium', false);
    navigation.navigate('Game');
  };

  return (
    <ScreenBackground>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <TopBar
          coins={coins}
          gems={gems}
          level={level}
          showBack
          onBackPress={() => navigation.goBack()}
        />

        <View style={styles.mainContent}>
          <Animated.Text entering={FadeInDown.delay(100).springify()} style={styles.title}>
            LOCAL PLAY
          </Animated.Text>
          <Animated.Text entering={FadeInDown.delay(150).springify()} style={styles.subtitle}>
            Pass & Play on one device
          </Animated.Text>

          {/* Player name inputs */}
          <Animated.View entering={FadeInDown.delay(250).springify()} style={styles.playerCard}>
            <View style={[styles.playerDot, { backgroundColor: colors.pieceRed }]} />
            <Text style={styles.playerLabel}>Player 1</Text>
            <TextInput
              style={styles.nameInput}
              value={player1Name}
              onChangeText={setPlayer1Name}
              placeholder="Name"
              placeholderTextColor={colors.textMuted}
              maxLength={12}
            />
          </Animated.View>

          <Animated.Text entering={FadeInDown.delay(300).springify()} style={styles.vsText}>VS</Animated.Text>

          <Animated.View entering={FadeInDown.delay(350).springify()} style={styles.playerCard}>
            <View style={[styles.playerDot, { backgroundColor: colors.pieceYellow }]} />
            <Text style={styles.playerLabel}>Player 2</Text>
            <TextInput
              style={styles.nameInput}
              value={player2Name}
              onChangeText={setPlayer2Name}
              placeholder="Name"
              placeholderTextColor={colors.textMuted}
              maxLength={12}
            />
          </Animated.View>

          {/* Start button */}
          <Animated.View entering={FadeInDown.delay(450).springify()} style={styles.startWrap}>
            <GlossyButton
              label="START GAME"
              variant="orange"
              iconRight="▶"
              onPress={startLocalGame}
            />
          </Animated.View>
        </View>
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mainContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 32,
    color: '#ffffff',
    letterSpacing: 2,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontWeight: weight.regular,
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: 24,
  },
  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  playerDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  playerLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 14,
    color: '#ffffff',
    width: 70,
  },
  nameInput: {
    flex: 1,
    fontFamily: fonts.body,
    fontWeight: weight.medium,
    fontSize: 16,
    color: '#ffffff',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  vsText: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 24,
    color: colors.textSecondary,
    marginVertical: 12,
  },
  startWrap: {
    width: '100%',
    maxWidth: 340,
    marginTop: 24,
  },
});
