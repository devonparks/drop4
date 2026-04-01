import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withDelay,
  runOnJS,
} from 'react-native-reanimated';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { GlossyButton } from '../components/ui/GlossyButton';
import { useGameStore, ROWS, COLS } from '../stores/gameStore';
import { useShopStore } from '../stores/shopStore';
import { getAIMove } from '../engine/aiEngine';
import { AI_THINK_DELAY, COIN_REWARDS } from '../engine/constants';
import { haptics } from '../services/haptics';
import { colors } from '../theme/colors';
import { fonts, weight } from '../theme/typography';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Game'>;
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BOARD_PADDING = 16;
const BOARD_WIDTH = Math.min(SCREEN_WIDTH - BOARD_PADDING * 2, 400);
const CELL_SIZE = Math.floor((BOARD_WIDTH - 16) / COLS);
const PIECE_SIZE = CELL_SIZE - 8;

// Animated piece component
function AnimatedPiece({ col, row, player, isNew }: {
  col: number; row: number; player: 1 | 2; isNew: boolean;
}) {
  const translateY = useSharedValue(isNew ? -CELL_SIZE * (ROWS + 1) : 0);
  const scale = useSharedValue(isNew ? 0.8 : 1);

  useEffect(() => {
    if (isNew) {
      translateY.value = withSpring(0, { damping: 12, stiffness: 200, mass: 0.8 });
      scale.value = withSequence(
        withSpring(1.1, { damping: 15, stiffness: 300 }),
        withSpring(1, { damping: 12, stiffness: 200 })
      );
    }
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const pieceColor = player === 1 ? colors.pieceRed : colors.pieceYellow;
  const pieceGlow = player === 1 ? colors.pieceRedGlow : colors.pieceYellowGlow;
  const pieceDark = player === 1 ? colors.pieceRedDark : colors.pieceYellowDark;

  return (
    <Animated.View
      style={[
        styles.piece,
        {
          left: col * CELL_SIZE + (CELL_SIZE - PIECE_SIZE) / 2 + 8,
          top: row * CELL_SIZE + (CELL_SIZE - PIECE_SIZE) / 2 + 8,
          width: PIECE_SIZE,
          height: PIECE_SIZE,
          backgroundColor: pieceColor,
          borderColor: pieceDark,
          shadowColor: pieceGlow,
        },
        animatedStyle,
      ]}
    />
  );
}

export function GameScreen({ navigation }: Props) {
  const {
    board, currentPlayer, status, winner, winCells,
    moveCount, difficulty, isAiThinking, isVsAi,
    dropPiece, setAiThinking, newGame, scores,
  } = useGameStore();
  const { addCoins, addXp } = useShopStore();
  const insets = useSafeAreaInsets();
  const [lastDrop, setLastDrop] = useState<{ col: number; row: number } | null>(null);
  const hasAwardedRef = useRef(false);
  const aiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track the most recently dropped piece for animation
  const [animatedPieces, setAnimatedPieces] = useState<Set<string>>(new Set());

  // AI move logic
  useEffect(() => {
    if (!isVsAi || currentPlayer !== 2 || status !== 'playing') return;

    // Prevent double-firing
    if (aiTimerRef.current) return;

    setAiThinking(true);
    const thinkTime = AI_THINK_DELAY[difficulty];

    aiTimerRef.current = setTimeout(() => {
      aiTimerRef.current = null;
      const currentBoard = useGameStore.getState().board;
      const currentMoveCount = useGameStore.getState().moveCount;
      const aiCol = getAIMove(currentBoard, difficulty);
      const key = `${aiCol}-${currentMoveCount}`;
      setAnimatedPieces(prev => new Set(prev).add(key));
      dropPiece(aiCol);
      haptics.drop();
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
    }
    if (status === 'playing') {
      hasAwardedRef.current = false;
    }
  }, [status, winner]);

  const handleColumnPress = useCallback((col: number) => {
    if (status !== 'playing' || isAiThinking) return;
    if (isVsAi && currentPlayer !== 1) return;

    const key = `${col}-${moveCount}`;
    setAnimatedPieces(prev => new Set(prev).add(key));
    const success = dropPiece(col);
    if (success) {
      haptics.drop();
    }
  }, [status, isAiThinking, currentPlayer, isVsAi, moveCount]);

  const handleRematch = () => {
    setAnimatedPieces(new Set());
    newGame(difficulty, isVsAi);
  };

  const playerLabel = currentPlayer === 1 ? 'You' : (isVsAi ? 'Bot' : 'P2');
  const turnText = status === 'playing'
    ? (isAiThinking ? 'Thinking...' : `${playerLabel}'s Turn`)
    : status === 'won'
    ? (winner === 1 ? 'You Win!' : (isVsAi ? 'Bot Wins!' : 'Player 2 Wins!'))
    : 'Draw!';

  return (
    <ScreenBackground>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* HUD */}
        <View style={styles.hud}>
          {/* Player 1 (You) */}
          <View style={styles.hudPlayer}>
            <View style={[styles.hudAvatar, { borderColor: colors.pieceRed }]}>
              <Text style={styles.hudAvatarEmoji}>😎</Text>
            </View>
            <View>
              <Text style={styles.hudName}>You</Text>
              <Text style={[styles.hudPiece, { color: colors.pieceRed }]}>🔴 {scores.player1}</Text>
            </View>
          </View>

          {/* Turn indicator */}
          <View style={styles.hudCenter}>
            <Text style={styles.turnText}>{turnText}</Text>
            <Text style={styles.diffText}>vs {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} Bot</Text>
          </View>

          {/* Player 2 / Bot */}
          <View style={[styles.hudPlayer, { flexDirection: 'row-reverse' }]}>
            <View style={[styles.hudAvatar, { borderColor: colors.pieceYellow }]}>
              <Text style={styles.hudAvatarEmoji}>{isVsAi ? '🤖' : '😎'}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.hudName}>{isVsAi ? 'Bot' : 'P2'}</Text>
              <Text style={[styles.hudPiece, { color: colors.pieceYellow }]}>🟡 {scores.player2}</Text>
            </View>
          </View>
        </View>

        {/* Score dots */}
        <View style={styles.scoreDots}>
          {[...Array(5)].map((_, i) => (
            <View
              key={`p1-${i}`}
              style={[styles.dot, i < scores.player1 && { backgroundColor: colors.pieceRed }]}
            />
          ))}
          <View style={styles.dotSpacer} />
          {[...Array(5)].map((_, i) => (
            <View
              key={`p2-${i}`}
              style={[styles.dot, i < scores.player2 && { backgroundColor: colors.pieceYellow }]}
            />
          ))}
        </View>

        {/* Board */}
        <Animated.View entering={FadeIn.delay(200)} style={styles.boardContainer}>
          <View style={[styles.board, { width: CELL_SIZE * COLS + 16 }]}>
            {/* Grid holes */}
            {Array.from({ length: COLS }).map((_, col) =>
              Array.from({ length: ROWS }).map((_, row) => (
                <View
                  key={`hole-${col}-${row}`}
                  style={[
                    styles.hole,
                    {
                      left: col * CELL_SIZE + (CELL_SIZE - PIECE_SIZE) / 2 + 8,
                      top: row * CELL_SIZE + (CELL_SIZE - PIECE_SIZE) / 2 + 8,
                      width: PIECE_SIZE,
                      height: PIECE_SIZE,
                    },
                  ]}
                />
              ))
            )}

            {/* Pieces */}
            {Array.from({ length: COLS }).map((_, col) =>
              Array.from({ length: ROWS }).map((_, row) => {
                const cell = board[col][row];
                if (cell === 0) return null;
                const key = `piece-${col}-${row}`;
                return (
                  <AnimatedPiece
                    key={key}
                    col={col}
                    row={row}
                    player={cell}
                    isNew={animatedPieces.has(`${col}-${moveCount - 1}`) || animatedPieces.size < 3}
                  />
                );
              })
            )}

            {/* Win highlight */}
            {winCells && winCells.map(([col, row], i) => (
              <Animated.View
                key={`win-${i}`}
                entering={FadeIn.delay(i * 100)}
                style={[
                  styles.winHighlight,
                  {
                    left: col * CELL_SIZE + (CELL_SIZE - PIECE_SIZE) / 2 + 8 - 4,
                    top: row * CELL_SIZE + (CELL_SIZE - PIECE_SIZE) / 2 + 8 - 4,
                    width: PIECE_SIZE + 8,
                    height: PIECE_SIZE + 8,
                  },
                ]}
              />
            ))}

            {/* Column touch targets */}
            {Array.from({ length: COLS }).map((_, col) => (
              <Pressable
                key={`col-${col}`}
                onPress={() => handleColumnPress(col)}
                style={[
                  styles.colTarget,
                  {
                    left: col * CELL_SIZE + 8,
                    width: CELL_SIZE,
                    height: CELL_SIZE * ROWS,
                  },
                ]}
              />
            ))}
          </View>
        </Animated.View>

        {/* Bottom controls */}
        <View style={styles.bottomBar}>
          <View style={styles.moveInfo}>
            <Text style={styles.moveLabel}>Move {Math.ceil(moveCount / 2) || 1}</Text>
          </View>
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

        {/* Game over overlay */}
        {(status === 'won' || status === 'draw') && (
          <Animated.View entering={FadeIn} style={styles.gameOverOverlay}>
            <View style={styles.gameOverCard}>
              <Text style={styles.gameOverTitle}>
                {status === 'won' ? (winner === 1 ? '🎉 Victory!' : '😞 Defeat') : '🤝 Draw'}
              </Text>
              {status === 'won' && winner === 1 && (
                <Text style={styles.coinReward}>
                  +{COIN_REWARDS[difficulty]} 🪙
                </Text>
              )}
              <View style={styles.gameOverButtons}>
                <GlossyButton
                  label="Rematch"
                  variant="orange"
                  onPress={handleRematch}
                />
                <GlossyButton
                  label="Back"
                  variant="navy"
                  onPress={() => navigation.goBack()}
                  style={{ marginTop: 10 }}
                />
              </View>
            </View>
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
  hud: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  hudPlayer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hudAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hudAvatarEmoji: {
    fontSize: 22,
  },
  hudName: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 13,
    color: '#ffffff',
  },
  hudPiece: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 12,
  },
  hudCenter: {
    alignItems: 'center',
  },
  turnText: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 18,
    color: '#ffffff',
  },
  diffText: {
    fontFamily: fonts.body,
    fontWeight: weight.regular,
    fontSize: 12,
    color: colors.textSecondary,
  },
  scoreDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  dotSpacer: {
    width: 20,
  },
  boardContainer: {
    alignItems: 'center',
  },
  board: {
    backgroundColor: colors.boardBlue,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: colors.boardFrame,
    position: 'relative',
    paddingBottom: 8,
    paddingTop: 8,
    height: CELL_SIZE * ROWS + 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  hole: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: colors.boardHole,
  },
  piece: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 3,
    shadowOpacity: 0.5,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 4,
  },
  winHighlight: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 3,
    borderColor: '#ffffff',
    shadowColor: '#ffffff',
    shadowOpacity: 0.8,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 12,
  },
  colTarget: {
    position: 'absolute',
    top: 0,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    gap: 12,
  },
  moveInfo: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  moveLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 14,
    color: '#ffffff',
  },
  emoteBar: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  emoteBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoteText: {
    fontSize: 24,
  },
  gameOverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  gameOverCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    width: '80%',
    maxWidth: 320,
  },
  gameOverTitle: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 32,
    color: '#ffffff',
    marginBottom: 8,
  },
  coinReward: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 20,
    color: colors.coinGold,
    marginBottom: 20,
  },
  gameOverButtons: {
    width: '100%',
  },
});
