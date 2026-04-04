import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  FadeIn,
  SlideInDown,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { GlossyButton } from '../components/ui/GlossyButton';
import { GameBoard } from '../components/board/GameBoard';
import { PlayerHUD } from '../components/ui/PlayerHUD';
import { CharacterAvatar } from '../components/ui/CharacterAvatar';
import { EmoteBar as EmoteBarComponent } from '../components/ui/EmoteBar';
import { useGameStore } from '../stores/gameStore';
import { useShopStore } from '../stores/shopStore';
import { getAIMove } from '../engine/aiEngine';
import { AI_THINK_DELAY, COIN_REWARDS } from '../engine/constants';
import { haptics } from '../services/haptics';
import { playSound, playRandomVoice } from '../services/audio';
import { useMatchHistoryStore } from '../stores/matchHistoryStore';
import { useChallengeStore } from '../stores/challengeStore';
import { useSeasonStore } from '../stores/seasonStore';
import { useCareerStore } from '../stores/careerStore';
import { useAchievementStore } from '../stores/achievementStore';
import { useLootBoxStore } from '../stores/lootBoxStore';
import { useReplayStore } from '../stores/replayStore';
import { useRankedStore } from '../stores/rankedStore';
import { colors } from '../theme/colors';
import { fonts, weight } from '../theme/typography';
import { getRandomTip } from '../data/tips';
import { ConfettiOverlay } from '../components/effects/ConfettiOverlay';
import { MatchmakingOverlay } from '../components/ui/MatchmakingOverlay';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Game'>;
};

export function GameScreen({ navigation }: Props) {
  const {
    board, currentPlayer, status, winner,
    moveCount, difficulty, isAiThinking, isVsAi,
    dropPiece, undoMove, setAiThinking, newGame, scores,
  } = useGameStore();
  const { addCoins, addXp } = useShopStore();
  const addMatch = useMatchHistoryStore(s => s.addMatch);
  const updateChallenge = useChallengeStore(s => s.updateProgress);
  const addSeasonXp = useSeasonStore(s => s.addSeasonXp);
  const completeCareerLevel = useCareerStore(s => s.completeLevel);
  const checkAchievements = useAchievementStore(s => s.checkAndUnlock);
  const addLootBox = useLootBoxStore(s => s.addBox);
  const { startRecording, recordMove, saveReplay } = useReplayStore();
  const recordRanked = useRankedStore(s => s.recordRankedResult);
  const customSettings = useGameStore(s => s.customSettings);
  const hasAwardedRef = useRef(false);
  const aiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [, setHintCol] = useState<number | null>(null);
  const [turnTimer, setTurnTimer] = useState(customSettings?.timerSeconds || 0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [wasCareerLevel, setWasCareerLevel] = useState(false);
  const turnTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Matchmaking overlay for wager/stage games
  const [showMatchmaking, setShowMatchmaking] = useState(() => !!(global as any).__wagerCourt);
  const wagerCourt = (global as any).__wagerCourt;

  // Chess clock for ranked mode
  const isRankedMode = !!(global as any).__rankedMode;
  const p1TimeBank = useRankedStore(s => s.player1TimeBank);
  const p2TimeBank = useRankedStore(s => s.player2TimeBank);
  const activeClockPlayer = useRankedStore(s => s.activeClockPlayer);
  const startChessClock = useRankedStore(s => s.startChessClock);
  const switchClock = useRankedStore(s => s.switchClock);
  const tickClock = useRankedStore(s => s.tickClock);
  const chessClockRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Initialize chess clock for ranked games
  useEffect(() => {
    if (isRankedMode && status === 'playing' && moveCount === 0) {
      const clockTime = (global as any).__rankedClockSeconds || 180;
      startChessClock(clockTime);
    }
  }, [isRankedMode, status]);

  // Switch clock on player change
  useEffect(() => {
    if (isRankedMode && status === 'playing' && activeClockPlayer !== null) {
      switchClock(currentPlayer as 1 | 2);
    }
  }, [currentPlayer, isRankedMode, status]);

  // Tick chess clock every second
  useEffect(() => {
    if (chessClockRef.current) clearInterval(chessClockRef.current);
    if (!isRankedMode || status !== 'playing' || activeClockPlayer === null) return;

    chessClockRef.current = setInterval(() => {
      const result = tickClock();
      if (result.expired && result.player) {
        // Time expired — player loses
        if (chessClockRef.current) clearInterval(chessClockRef.current);
        haptics.error();
        playSound('lose');
        // Force game over — the player who ran out of time loses
        const loser = result.player;
        const winnerPlayer = loser === 1 ? 2 : 1;
        useGameStore.setState({ status: 'won', winner: winnerPlayer });
      }
    }, 1000);

    return () => {
      if (chessClockRef.current) clearInterval(chessClockRef.current);
    };
  }, [isRankedMode, status, activeClockPlayer]);

  // Start recording replay when game begins + apply preset board
  useEffect(() => {
    if (status === 'playing' && moveCount === 0) {
      startRecording();
      // Apply preset board from Board Editor if available
      const presetBoard = (global as any).__presetBoard;
      if (presetBoard) {
        useGameStore.setState({ board: presetBoard });
        (global as any).__presetBoard = null;
      }
    }
  }, [status, moveCount]);

  // Turn timer logic
  useEffect(() => {
    if (turnTimerRef.current) clearInterval(turnTimerRef.current);
    const timerSecs = customSettings?.timerSeconds || 0;
    if (timerSecs <= 0 || status !== 'playing') return;

    setTurnTimer(timerSecs);
    turnTimerRef.current = setInterval(() => {
      setTurnTimer(prev => {
        if (prev <= 1) {
          // Time's up — auto-drop in a random valid column
          if (turnTimerRef.current) clearInterval(turnTimerRef.current);
          const board = useGameStore.getState().board;
          const validCols: number[] = [];
          for (let c = 0; c < board.length; c++) {
            if (board[c][0] === 0) validCols.push(c);
          }
          if (validCols.length > 0) {
            const randomCol = validCols[Math.floor(Math.random() * validCols.length)];
            dropPiece(randomCol);
            haptics.error();
          }
          return timerSecs;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (turnTimerRef.current) clearInterval(turnTimerRef.current);
    };
  }, [currentPlayer, status, moveCount]);

  // Best of 3 series tracking
  const [, setSeriesGame] = useState(1);
  const totalGames = 3;

  // AI move logic — fixed: no dependency on isAiThinking
  useEffect(() => {
    if (!isVsAi || currentPlayer !== 2 || status !== 'playing') return;
    if (aiTimerRef.current) return;

    setAiThinking(true);
    const thinkTime = AI_THINK_DELAY[difficulty];
    // Play thinking voice after a short delay so it feels natural
    setTimeout(() => playRandomVoice('thinking'), 200);

    aiTimerRef.current = setTimeout(() => {
      aiTimerRef.current = null;
      const currentBoard = useGameStore.getState().board;
      const currentMoveCount = useGameStore.getState().moveCount;
      const aiCol = getAIMove(currentBoard, difficulty);
      recordMove(aiCol, 2, currentMoveCount);
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
      const streakBonus = Math.min(useGameStore.getState().winStreak * 10, 50);
      const totalReward = reward + streakBonus;
      addCoins(totalReward);
      addXp(reward);
      addMatch({ result: 'win', opponent: `${difficulty} Bot`, difficulty, moves: moveCount, coinsEarned: totalReward, mode: 'ai' });
      // Update challenges
      updateChallenge('win_3', 1);
      updateChallenge('play_5', 1);
      if (difficulty === 'easy') updateChallenge('win_easy', 1);
      if (difficulty === 'medium') updateChallenge('win_medium', 1);
      if (difficulty === 'hard') updateChallenge('win_hard', 1);
      if (moveCount < 20) updateChallenge('fast_win', 1);
      // Season XP
      addSeasonXp(reward);
      // Career level completion
      const careerLevelId = (global as any).__careerLevelId;
      if (careerLevelId) {
        setWasCareerLevel(true);
        // Star rating: 3 stars if < 15 moves, 2 if < 25, 1 otherwise
        const starRating = moveCount < 15 ? 3 : moveCount < 25 ? 2 : 1;
        completeCareerLevel(careerLevelId, starRating, moveCount);
        // Award career reward
        const careerReward = (global as any).__careerLevelReward;
        if (careerReward) {
          if (careerReward.type === 'coins' && careerReward.amount) {
            addCoins(careerReward.amount);
          }
          // Board/piece unlocks handled by shopStore
          if (careerReward.type === 'board' && careerReward.id) {
            useShopStore.getState().purchaseItem('boards', careerReward.id, 0);
          }
          if (careerReward.type === 'pieces' && careerReward.id) {
            useShopStore.getState().purchaseItem('pieces', careerReward.id, 0);
          }
        }
        (global as any).__careerLevelId = null;
        (global as any).__careerLevelReward = null;
      }
      // Wager court winnings + ranked ELO update
      const wagerCourt = (global as any).__wagerCourt;
      if (wagerCourt) {
        if (wagerCourt.winnerGets > 0) addCoins(wagerCourt.winnerGets);
        recordRanked(true); // Won wager match — ELO goes up
        (global as any).__wagerCourt = null;
      }
      // Award loot box on win (every 3rd win gets a box)
      const totalWins = useMatchHistoryStore.getState().matches.filter(m => m.result === 'win').length;
      if (totalWins % 3 === 0) {
        const boxTier = difficulty === 'easy' ? 'bronze_box' : difficulty === 'medium' ? 'silver_box' : 'gold_box';
        addLootBox(boxTier);
      }
      // Check achievements
      const matchHistory = useMatchHistoryStore.getState();
      const shopState = useShopStore.getState();
      const careerState = useCareerStore.getState();
      checkAchievements({
        totalWins: matchHistory.getStats().wins,
        currentStreak: useGameStore.getState().winStreak,
        bestStreak: useGameStore.getState().bestStreak,
        totalGames: matchHistory.getStats().totalGames,
        level: shopState.level,
        careerStars: careerState.getTotalStars(),
        lastGameMoves: moveCount,
        hardWins: matchHistory.matches.filter(m => m.result === 'win' && m.difficulty === 'hard').length,
        ownedCosmetics: shopState.owned.boards.length + shopState.owned.pieces.length + shopState.owned.dropEffects.length,
      });
      setShowConfetti(true);
      haptics.win();
      playSound('win');
      playSound('coin');
      playRandomVoice('lose');
    }
    if (status === 'won' && winner === 2 && !hasAwardedRef.current) {
      hasAwardedRef.current = true;
      addMatch({ result: 'loss', opponent: `${difficulty} Bot`, difficulty, moves: moveCount, coinsEarned: 0, mode: 'ai' });
      updateChallenge('play_5', 1);
      addSeasonXp(10);
      // Clear wager — coins already deducted, lost + ranked ELO down
      if ((global as any).__wagerCourt) {
        recordRanked(false); // Lost wager match
        (global as any).__wagerCourt = null;
      }
      haptics.error();
      playSound('lose');
      playRandomVoice('win');
    }
    if (status === 'draw' && !hasAwardedRef.current) {
      hasAwardedRef.current = true;
      addCoins(10);
      addMatch({ result: 'draw', opponent: `${difficulty} Bot`, difficulty, moves: moveCount, coinsEarned: 10, mode: 'ai' });
      updateChallenge('play_5', 1);
      addSeasonXp(15);
      playSound('coin');
    }
    // Save replay on game end
    if ((status === 'won' || status === 'draw') && hasAwardedRef.current) {
      const cs = customSettings || { rows: 6, cols: 7, connectCount: 4 };
      const replayResult: 'win' | 'loss' | 'draw' = status === 'won' ? (winner === 1 ? 'win' : 'loss') : 'draw';
      saveReplay(replayResult, difficulty, p2Name, cs.rows, cs.cols, cs.connectCount);
    }
    if (status === 'playing') {
      hasAwardedRef.current = false;
    }
  }, [status, winner]);

  const handleColumnPress = useCallback((col: number) => {
    if (status !== 'playing' || isAiThinking) return;
    if (isVsAi && currentPlayer !== 1) return;
    recordMove(col, currentPlayer, moveCount);
    dropPiece(col);
    haptics.drop();
    playSound('drop');
  }, [status, isAiThinking, currentPlayer, isVsAi, moveCount]);

  const handleRematch = () => {
    setSeriesGame(prev => prev < totalGames ? prev + 1 : 1);
    setShowConfetti(false);
    setWasCareerLevel(false);
    newGame(difficulty, isVsAi);
  };

  const handleBack = () => {
    navigation.goBack();
  };

  // Local player names
  const localNames = (global as any).__localPlayerNames || { player1: 'Player 1', player2: 'Player 2' };
  const p1Name = isVsAi ? 'You' : localNames.player1;
  const p2Name = isVsAi ? `${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} Bot` : localNames.player2;

  // Turn / status text
  const turnText = status === 'playing'
    ? (isAiThinking ? 'Thinking...' : (currentPlayer === 1 ? `${p1Name}'s Turn` : `${p2Name}'s Turn`))
    : status === 'won'
    ? (winner === 1 ? `${p1Name} Wins!` : `${p2Name} Wins!`)
    : 'Draw!';

  const diffLabel = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);

  // Format time for chess clock display
  const formatClockTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <ScreenBackground>
      <View style={styles.container}>

        {/* Chess Clock (ranked mode only) */}
        {isRankedMode && status === 'playing' && (
          <View style={styles.chessClockRow}>
            <View style={[styles.clockBox, activeClockPlayer === 1 && styles.clockBoxActive, p1TimeBank <= 30 && styles.clockBoxDanger]}>
              <Text style={[styles.clockTime, activeClockPlayer === 1 && styles.clockTimeActive, p1TimeBank <= 10 && { color: colors.red }]}>
                {formatClockTime(p1TimeBank)}
              </Text>
              <Text style={styles.clockLabel}>YOU</Text>
            </View>
            <View style={styles.clockCenter}>
              <Text style={styles.clockVs}>⏱</Text>
              <Text style={styles.clockModeLabel}>RANKED</Text>
            </View>
            <View style={[styles.clockBox, activeClockPlayer === 2 && styles.clockBoxActive, p2TimeBank <= 30 && styles.clockBoxDanger]}>
              <Text style={[styles.clockTime, activeClockPlayer === 2 && styles.clockTimeActive, p2TimeBank <= 10 && { color: colors.red }]}>
                {formatClockTime(p2TimeBank)}
              </Text>
              <Text style={styles.clockLabel}>OPP</Text>
            </View>
          </View>
        )}

        {/* HUD Row */}
        <View style={styles.hudRow}>
          <PlayerHUD
            name={p1Name}
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
            {/* Timer bar (casual mode turn timer) */}
            {!isRankedMode && (customSettings?.timerSeconds || 0) > 0 && status === 'playing' && (
              <View style={styles.timerWrap}>
                <View style={styles.timerBar}>
                  <View style={[styles.timerFill, {
                    width: `${(turnTimer / (customSettings?.timerSeconds || 1)) * 100}%`,
                    backgroundColor: turnTimer <= 5 ? colors.red : currentPlayer === 1 ? colors.pieceRed : colors.pieceYellow,
                  }]} />
                </View>
                <Text style={[styles.timerText, turnTimer <= 5 && { color: colors.red }]}>{turnTimer}s</Text>
              </View>
            )}
          </View>

          <PlayerHUD
            name={p2Name}
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
          <Pressable onPress={() => {
            if (status === 'playing' && !isAiThinking && currentPlayer === 1) {
              haptics.tap();
              const bestCol = getAIMove(board, 'hard');
              setHintCol(bestCol);
              setTimeout(() => setHintCol(null), 2000);
            }
          }} style={styles.controlBtn}>
            <Text style={styles.controlIcon}>💡</Text>
            <Text style={styles.controlLabel}>Hint</Text>
          </Pressable>

          {/* Move counter */}
          <View style={styles.moveCounter}>
            <Text style={styles.moveText}>Move {Math.ceil((moveCount + 1) / 2)}</Text>
          </View>

          {/* Undo button */}
          <Pressable onPress={() => {
            if (undoMove()) {
              haptics.tap();
              playSound('whoosh');
            }
          }} style={styles.controlBtn}>
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
        <EmoteBarComponent
          onEmotePress={(id) => {
            haptics.tap();
            playSound('click');
          }}
          variant="game"
        />

        {/* Matchmaking overlay for wager / stage games */}
        <MatchmakingOverlay
          visible={showMatchmaking}
          onAccept={() => setShowMatchmaking(false)}
          onDecline={() => { setShowMatchmaking(false); navigation.goBack(); }}
          opponentName={wagerCourt?.name || undefined}
          opponentElo={wagerCourt ? undefined : undefined}
        />

        {/* Confetti on victory */}
        <ConfettiOverlay visible={showConfetti} onDone={() => setShowConfetti(false)} />

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
                  <View style={styles.rewardRow}>
                    <Text style={styles.rewardLabel}>Coins earned</Text>
                    <Text style={styles.rewardValue}>+{COIN_REWARDS[difficulty]} 🪙</Text>
                  </View>
                )}
                {status === 'won' && winner === 1 && useGameStore.getState().winStreak > 1 && (
                  <View style={[styles.rewardRow, { borderColor: 'rgba(255,140,0,0.3)', backgroundColor: 'rgba(255,140,0,0.08)' }]}>
                    <Text style={styles.rewardLabel}>🔥 Streak Bonus (x{useGameStore.getState().winStreak})</Text>
                    <Text style={[styles.rewardValue, { color: colors.orange }]}>
                      +{Math.min(useGameStore.getState().winStreak * 10, 50)} 🪙
                    </Text>
                  </View>
                )}
                {/* Wager note — shown if this was a wager match */}
                {/* Career stars */}
                {status === 'won' && winner === 1 && wasCareerLevel && (
                  <View style={[styles.rewardRow, { borderColor: 'rgba(155,89,182,0.3)', backgroundColor: 'rgba(155,89,182,0.08)' }]}>
                    <Text style={styles.rewardLabel}>⭐ Career Stars</Text>
                    <Text style={[styles.rewardValue, { color: '#9b59b6' }]}>
                      {moveCount < 15 ? '⭐⭐⭐' : moveCount < 25 ? '⭐⭐' : '⭐'}
                    </Text>
                  </View>
                )}
                {status === 'draw' && (
                  <View style={styles.rewardRow}>
                    <Text style={styles.rewardLabel}>Draw bonus</Text>
                    <Text style={styles.rewardValue}>+10 🪙</Text>
                  </View>
                )}

                {/* Detailed stats */}
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Moves</Text>
                  <Text style={styles.statValue}>{moveCount}</Text>
                </View>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Series</Text>
                  <Text style={styles.statValue}>{scores.player1} - {scores.player2}</Text>
                </View>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Win Streak</Text>
                  <Text style={[styles.statValue, useGameStore.getState().winStreak > 0 && { color: colors.orange }]}>
                    {useGameStore.getState().winStreak > 0 ? `🔥 ${useGameStore.getState().winStreak}` : '0'}
                  </Text>
                </View>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Best Streak</Text>
                  <Text style={styles.statValue}>{useGameStore.getState().bestStreak}</Text>
                </View>

                {/* Tip */}
                <Text style={styles.tipText}>💡 {getRandomTip()}</Text>

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
  // Chess clock styles
  chessClockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 16,
    marginBottom: 6,
    gap: 8,
  },
  clockBox: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  clockBoxActive: {
    backgroundColor: 'rgba(255,140,0,0.12)',
    borderColor: 'rgba(255,140,0,0.4)',
  },
  clockBoxDanger: {
    backgroundColor: 'rgba(231,76,60,0.12)',
    borderColor: 'rgba(231,76,60,0.4)',
  },
  clockTime: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 22,
    color: colors.textSecondary,
    letterSpacing: 1,
  },
  clockTimeActive: {
    color: '#ffffff',
  },
  clockLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 9,
    color: colors.textMuted,
    letterSpacing: 1,
    marginTop: 2,
  },
  clockCenter: {
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  clockVs: {
    fontSize: 18,
  },
  clockModeLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 8,
    color: colors.orange,
    letterSpacing: 1.5,
    marginTop: 2,
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
  timerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    width: 100,
  },
  timerBar: {
    flex: 1,
    height: 5,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  timerFill: {
    height: '100%',
    borderRadius: 3,
  },
  timerText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 11,
    color: '#ffffff',
    width: 22,
    textAlign: 'right',
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
  tipText: {
    fontFamily: fonts.body,
    fontWeight: weight.regular,
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 16,
    marginVertical: 8,
    paddingHorizontal: 8,
    fontStyle: 'italic',
  },
  resultButtons: {
    marginTop: 16,
  },
});
