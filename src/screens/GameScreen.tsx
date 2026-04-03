import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions, Platform } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  SlideInDown,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { GlossyButton } from '../components/ui/GlossyButton';
import { GameBoard } from '../components/board/GameBoard';
import { PlayerHUD } from '../components/ui/PlayerHUD';
import { CharacterAvatar } from '../components/ui/CharacterAvatar';
import { useGameStore, ROWS, COLS } from '../stores/gameStore';
import { useShopStore } from '../stores/shopStore';
import { getAIMove } from '../engine/aiEngine';
import { AI_THINK_DELAY, COIN_REWARDS } from '../engine/constants';
import { haptics } from '../services/haptics';
import { playSound, playRandomVoice } from '../services/audio';
import { colors } from '../theme/colors';
import { fonts, weight } from '../theme/typography';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Game'>;
};

export function GameScreen({ navigation }: Props) {
  const {
    board, currentPlayer, status, winner, winCells,
    moveCount, difficulty, isAiThinking, isVsAi,
    dropPiece, setAiThinking, newGame, scores,
  } = useGameStore();
  const { coins, addCoins, addXp } = useShopStore();
  const hasAwardedRef = useRef(false);
  const aiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Best of 3 series tracking
  const [seriesGame, setSeriesGame] = useState(1);
  const totalGames = 3;

  // AI move logic — fixed: no dependency on isAiThinking
  useEffect(() => {
    if (!isVsAi || currentPlayer !== 2 || status !== 'playing') return;
    if (aiTimerRef.current) return;

    setAiThinking(true);
    playRandomVoice('thinking');
    const thinkTime = AI_THINK_DELAY[difficulty];

    aiTimerRef.current = setTimeout(() => {
      aiTimerRef.current = null;
      const currentBoard = useGameStore.getState().board;
      const currentMoveCount = useGameStore.getState().moveCount;
      const aiCol = getAIMove(currentBoard, difficulty);
      dropPiece(aiCol);
      haptics.drop();
      playSound('drop');
      setAiThinking(false);
    }, thinkTime);

    return () => {
      if (aiTimerRef.current) {
        clearTimeout(aiTimerRef.current);
        aiTimerRef.current = null;
      }
    };
  }, [currentPlayer, status, isVsAi]);

  // Award coins on win
  useEffect(() => {
    if (status === 'won' && winner === 1 && !hasAwardedRef.current) {
      hasAwardedRef.current = true;
      const reward = COIN_REWARDS[difficulty];
      addCoins(reward);
      addXp(reward);
      haptics.win();
      playSound('win');
      playSound('coin');
      playRandomVoice('lose'); // AI says "you win / good game"
    }
    if (status === 'won' && winner === 2 && !hasAwardedRef.current) {
      hasAwardedRef.current = true;
      haptics.error();
      playSound('lose');
      playRandomVoice('win'); // AI says "I win!"
    }
    if (status === 'draw' && !hasAwardedRef.current) {
      hasAwardedRef.current = true;
      addCoins(10);
      playSound('coin');
    }
    if (status === 'playing') {
      hasAwardedRef.current = false;
    }
  }, [status, winner]);

  const handleColumnPress = useCallback((col: number) => {
    if (status !== 'playing' || isAiThinking) return;
    if (isVsAi && currentPlayer !== 1) return;
    dropPiece(col);
    haptics.drop();
    playSound('drop');
  }, [status, isAiThinking, currentPlayer, isVsAi]);

  const handleRematch = () => {
    setSeriesGame(prev => prev < totalGames ? prev + 1 : 1);
    newGame(difficulty, isVsAi);
  };

  const handleBack = () => {
    navigation.goBack();
  };

  // Turn / status text
  const turnText = status === 'playing'
    ? (isAiThinking ? 'Thinking...' : (currentPlayer === 1 ? 'Your Turn' : (isVsAi ? 'Bot Turn' : 'Player 2')))
    : status === 'won'
    ? (winner === 1 ? 'You Win!' : (isVsAi ? 'Bot Wins!' : 'P2 Wins!'))
    : 'Draw!';

  const diffLabel = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);

  return (
    <ScreenBackground>
      <View style={styles.container}>

        {/* HUD Row */}
        <View style={styles.hudRow}>
          <PlayerHUD
            name="You"
            avatar={<CharacterAvatar size="medium" variant="player" />}
            level={useShopStore.getState().level}
            pieceColor="red"
            score={scores.player1}
            isActive={currentPlayer === 1 && status === 'playing'}
            side="left"
          />

          {/* Center: Turn indicator */}
          <View style={styles.turnCenter}>
            <Text style={[
              styles.turnText,
              status === 'won' && winner === 1 && { color: colors.green },
              status === 'won' && winner === 2 && { color: colors.pieceRed },
            ]}>
              {turnText}
            </Text>
            <Text style={styles.vsText}>vs {diffLabel} Bot</Text>
          </View>

          <PlayerHUD
            name={isVsAi ? `${diffLabel} Bot` : 'Player 2'}
            avatar={isVsAi
              ? <CharacterAvatar size="medium" variant={`bot_${difficulty}` as any} />
              : <CharacterAvatar size="medium" variant="player" />
            }
            level={isVsAi ? 16 : useShopStore.getState().level}
            pieceColor="yellow"
            score={scores.player2}
            isActive={currentPlayer === 2 && status === 'playing'}
            side="right"
          />
        </View>

        {/* Score dots (best of 5) */}
        <View style={styles.scoreDots}>
          <View style={styles.dotsGroup}>
            {[0, 1, 2, 3, 4].map(i => (
              <View key={`p1-${i}`} style={[styles.dot,
                i < scores.player1 && { backgroundColor: colors.pieceRed }
              ]} />
            ))}
          </View>
          <View style={styles.dotSpacer}>
            <View style={styles.dotLine} />
          </View>
          <View style={styles.dotsGroup}>
            {[0, 1, 2, 3, 4].map(i => (
              <View key={`p2-${i}`} style={[styles.dot,
                i < scores.player2 && { backgroundColor: colors.pieceYellow }
              ]} />
            ))}
          </View>
        </View>

        {/* Game Board */}
        <GameBoard
          onColumnPress={handleColumnPress}
          disabled={status !== 'playing' || isAiThinking || (isVsAi && currentPlayer !== 1)}
          currentPlayerColor={currentPlayer === 1 ? 'red' : 'yellow'}
        />

        {/* Bottom controls */}
        <View style={styles.controls}>
          {/* Hint button */}
          <Pressable onPress={() => haptics.tap()} style={styles.controlBtn}>
            <Text style={styles.controlIcon}>💡</Text>
            <Text style={styles.controlLabel}>Hint</Text>
          </Pressable>

          {/* Move counter */}
          <View style={styles.moveCounter}>
            <Text style={styles.moveText}>Move {Math.ceil((moveCount + 1) / 2)}</Text>
          </View>

          {/* Undo button */}
          <Pressable onPress={() => haptics.tap()} style={styles.controlBtn}>
            <Text style={styles.controlIcon}>↩️</Text>
            <Text style={styles.controlLabel}>Undo</Text>
          </Pressable>

          {/* Menu button */}
          <Pressable onPress={handleBack} style={styles.controlBtn}>
            <Text style={styles.controlIcon}>☰</Text>
            <Text style={styles.controlLabel}>Menu</Text>
          </Pressable>
        </View>

        {/* Emote bar */}
        <View style={styles.emoteBar}>
          {['😄', '😮', '👍', '💪'].map((emoji, i) => (
            <Pressable
              key={i}
              onPress={() => haptics.tap()}
              style={styles.emoteBtn}
            >
              <Text style={styles.emoteText}>{emoji}</Text>
            </Pressable>
          ))}
        </View>

        {/* ========== GAME OVER OVERLAY ========== */}
        {(status === 'won' || status === 'draw') && (
          <Animated.View entering={FadeIn.duration(300)} style={styles.overlay}>
            <Animated.View entering={SlideInDown.springify().damping(12)} style={styles.gameOverCard}>
              {/* Result header */}
              <LinearGradient
                colors={
                  status === 'won' && winner === 1
                    ? ['#27ae3d', '#1e8a30']
                    : status === 'won' && winner === 2
                    ? ['#e74c3c', '#c0392b']
                    : ['#3498db', '#2980b9']
                }
                style={styles.resultHeader}
              >
                <Text style={styles.resultEmoji}>
                  {status === 'won' ? (winner === 1 ? '🎉' : '😞') : '🤝'}
                </Text>
                <Text style={styles.resultTitle}>
                  {status === 'won' ? (winner === 1 ? 'VICTORY!' : 'DEFEAT') : 'DRAW'}
                </Text>
              </LinearGradient>

              {/* Stats */}
              <View style={styles.resultBody}>
                {/* Coin reward */}
                {status === 'won' && winner === 1 && (
                  <Animated.View entering={FadeInDown.delay(400)} style={styles.rewardRow}>
                    <Text style={styles.rewardLabel}>Coins earned</Text>
                    <Text style={styles.rewardValue}>+{COIN_REWARDS[difficulty]} 🪙</Text>
                  </Animated.View>
                )}
                {status === 'draw' && (
                  <Animated.View entering={FadeInDown.delay(400)} style={styles.rewardRow}>
                    <Text style={styles.rewardLabel}>Draw bonus</Text>
                    <Text style={styles.rewardValue}>+10 🪙</Text>
                  </Animated.View>
                )}

                {/* Move count */}
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Moves</Text>
                  <Text style={styles.statValue}>{moveCount}</Text>
                </View>

                {/* Series score */}
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Series</Text>
                  <Text style={styles.statValue}>{scores.player1} - {scores.player2}</Text>
                </View>

                {/* Buttons */}
                <View style={styles.resultButtons}>
                  <GlossyButton
                    label="REMATCH"
                    variant="orange"
                    onPress={handleRematch}
                  />
                  <GlossyButton
                    label="HOME"
                    variant="navy"
                    onPress={handleBack}
                    style={{ marginTop: 10 }}
                  />
                </View>
              </View>
            </Animated.View>
          </Animated.View>
        )}
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  hudRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 12,
    marginBottom: 4,
  },
  turnCenter: {
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 8,
  },
  turnText: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 18,
    color: '#ffffff',
    textAlign: 'center',
  },
  vsText: {
    fontFamily: fonts.body,
    fontWeight: weight.regular,
    fontSize: 11,
    color: colors.textSecondary,
  },
  scoreDots: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  dotsGroup: {
    flexDirection: 'row',
    gap: 5,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  dotSpacer: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotLine: {
    width: 12,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 1,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  controlBtn: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  controlIcon: {
    fontSize: 18,
  },
  controlLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  moveCounter: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  moveText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 14,
    color: '#ffffff',
  },
  emoteBar: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  emoteBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(26,37,86,0.8)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoteText: {
    fontSize: 22,
  },
  // Game Over
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  gameOverCard: {
    width: '85%',
    maxWidth: 340,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
  },
  resultHeader: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  resultEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  resultTitle: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 28,
    color: '#ffffff',
    letterSpacing: 2,
  },
  resultBody: {
    padding: 20,
  },
  rewardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,209,102,0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,209,102,0.2)',
  },
  rewardLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.medium,
    fontSize: 14,
    color: colors.textSecondary,
  },
  rewardValue: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 18,
    color: colors.coinGold,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  statLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.regular,
    fontSize: 14,
    color: colors.textSecondary,
  },
  statValue: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 14,
    color: '#ffffff',
  },
  resultButtons: {
    marginTop: 16,
  },
});
