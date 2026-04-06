import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, Modal, Animated as RNAnimated, ScrollView } from 'react-native';
import Animated, {
  FadeIn,
  SlideInDown,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp, useRoute } from '@react-navigation/native';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { GlossyButton } from '../components/ui/GlossyButton';
import { GameBoard, CELL_SIZE, BOARD_WIDTH } from '../components/board/GameBoard';
import { PlayerHUD } from '../components/ui/PlayerHUD';
import { CharacterAvatar } from '../components/ui/CharacterAvatar';
import { EmotePickerModal } from '../components/ui/EmotePickerModal';
import { FortniteEmoteWheel } from '../components/ui/FortniteEmoteWheel';
import { useGameStore } from '../stores/gameStore';
import { useShopStore } from '../stores/shopStore';
import { getAIMove } from '../engine/aiEngine';
import { AI_THINK_DELAY, COIN_REWARDS } from '../engine/constants';
import { haptics } from '../services/haptics';
import { playSound } from '../services/audio';
import { useMatchHistoryStore } from '../stores/matchHistoryStore';
import { useChallengeStore } from '../stores/challengeStore';
import { useSeasonStore } from '../stores/seasonStore';
import { useCareerStore } from '../stores/careerStore';
import { useAchievementStore } from '../stores/achievementStore';
import { useLootBoxStore } from '../stores/lootBoxStore';
import { useReplayStore } from '../stores/replayStore';
import { useRankedStore } from '../stores/rankedStore';
import { listenToMatch, makeMove, resignMatch, requestRematch, listenForRematch, acceptRematch } from '../services/matchmaking';
import type { RematchRequest } from '../services/matchmaking';
import { colors } from '../theme/colors';
import { fonts, weight } from '../theme/typography';
import { getRandomTip } from '../data/tips';
import { ConfettiOverlay } from '../components/effects/ConfettiOverlay';
import { FloatingEmote } from '../components/effects/FloatingEmote';
import { MatchmakingOverlay } from '../components/ui/MatchmakingOverlay';
import { EloChangeAnimation } from '../components/effects/EloChangeAnimation';
import { CoinBurst } from '../components/effects/CoinBurst';
import { sendEmote, listenForEmotes } from '../services/emotes';
// QuickChatBar replaced by EmotePickerModal
import { ChatBubble } from '../components/effects/ChatBubble';
import type { QuickChatMessage } from '../data/quickChat';
import { useTutorialStore } from '../stores/tutorialStore';
import { TutorialTooltip } from '../components/ui/TutorialTooltip';
import { getTipById } from '../data/tutorials';
import type { RootStackParamList, GameParams } from '../navigation/RootNavigator';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Game'>;
};

export function GameScreen({ navigation }: Props) {
  const route = useRoute<RouteProp<RootStackParamList, 'Game'>>();
  const params = (route.params || {}) as GameParams;

  const board = useGameStore(s => s.board);
  const currentPlayer = useGameStore(s => s.currentPlayer);
  const status = useGameStore(s => s.status);
  const winner = useGameStore(s => s.winner);
  const moveCount = useGameStore(s => s.moveCount);
  const difficulty = useGameStore(s => s.difficulty);
  const isAiThinking = useGameStore(s => s.isAiThinking);
  const isVsAi = useGameStore(s => s.isVsAi);
  const dropPiece = useGameStore(s => s.dropPiece);
  const undoMove = useGameStore(s => s.undoMove);
  const setAiThinking = useGameStore(s => s.setAiThinking);
  const newGame = useGameStore(s => s.newGame);
  const scores = useGameStore(s => s.scores);
  const addCoins = useShopStore(s => s.addCoins);
  const addXp = useShopStore(s => s.addXp);
  const addMatch = useMatchHistoryStore(s => s.addMatch);
  const updateChallenge = useChallengeStore(s => s.updateProgress);
  const addSeasonXp = useSeasonStore(s => s.addSeasonXp);
  const completeCareerLevel = useCareerStore(s => s.completeLevel);
  const checkAchievements = useAchievementStore(s => s.checkAndUnlock);
  const addLootBox = useLootBoxStore(s => s.addBox);
  const startRecording = useReplayStore(s => s.startRecording);
  const recordMove = useReplayStore(s => s.recordMove);
  const saveReplay = useReplayStore(s => s.saveReplay);
  const recordRanked = useRankedStore(s => s.recordRankedResult);
  const customSettings = useGameStore(s => s.customSettings);
  const hasAwardedRef = useRef(false);
  const preGameEloRef = useRef(useRankedStore.getState().elo);
  const aiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [hintCol, setHintCol] = useState<number | null>(null);
  const [freeHintsRemaining, setFreeHintsRemaining] = useState(3);
  const hintPulseAnim = useRef(new RNAnimated.Value(0)).current;
  const [thinkingDots, setThinkingDots] = useState(0);
  const [turnTimer, setTurnTimer] = useState(customSettings?.timerSeconds || 0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showCoinBurst, setShowCoinBurst] = useState(false);
  const [showFirstWin, setShowFirstWin] = useState(false);
  const firstWinOpacity = useRef(new RNAnimated.Value(0)).current;

  // Last move indicator
  const [lastMoveCol, setLastMoveCol] = useState<number | null>(null);
  const lastMoveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastMoveFade = useRef(new RNAnimated.Value(0)).current;

  // Emote Picker Modal
  const [emotePickerOpen, setEmotePickerOpen] = useState(false);
  const [emotePickerTab, setEmotePickerTab] = useState<'emotes' | 'chat'>('emotes');

  // Tutorial
  const hasSeenGameTip = useTutorialStore(s => s.hasSeenTip);
  const gameTip = getTipById('game_hint')!;
  const [showGameTutorial, setShowGameTutorial] = useState(false);
  const [coinTooltipVisible, setCoinTooltipVisible] = useState(false);

  // Show tutorial on first game
  useEffect(() => {
    if (!hasSeenGameTip('game_hint')) {
      const timer = setTimeout(() => setShowGameTutorial(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  // Fortnite-style emote wheel
  const [emoteWheelOpen, setEmoteWheelOpen] = useState(false);
  const equippedEmotes = useShopStore(s => s.equippedEmotes);

  // Quick Chat (Tier 3) — now handled by EmotePickerModal
  const [myChatBubble, setMyChatBubble] = useState<{ text: string; key: number } | null>(null);
  const [opponentChatBubble, setOpponentChatBubble] = useState<{ text: string; senderName: string; key: number } | null>(null);

  // Screen shake on piece drop
  const shakeAnim = useRef(new RNAnimated.Value(0)).current;

  // Turn indicator pulse
  const turnPulseAnim = useRef(new RNAnimated.Value(1)).current;
  const [wasCareerLevel, setWasCareerLevel] = useState(false);
  const turnTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Online multiplayer
  const isOnlineMatch = !!params.onlineMatchId;
  const onlineMatchId = params.onlineMatchId;
  const myPlayerNum = params.onlinePlayerNum;

  // Matchmaking overlay for wager/stage games
  const [showMatchmaking, setShowMatchmaking] = useState(() => !!params.wagerCourt);
  const wagerCourt = params.wagerCourt;

  // Emote display — player and opponent/AI
  const [myEmote, setMyEmote] = useState<{ emoteId: string; key: number } | null>(null);
  const [opponentEmote, setOpponentEmote] = useState<{ emoteId: string; key: number } | null>(null);
  const aiEmoteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Rematch state (online matches)
  const [rematchState, setRematchState] = useState<'idle' | 'requested' | 'opponent-requested'>('idle');
  const [rematchNewMatchId, setRematchNewMatchId] = useState<string | null>(null);

  // Chess clock for ranked mode
  const isRankedMode = !!params.rankedMode;
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
      const clockTime = params.rankedClockSeconds || 180;
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

  // Online match: listen to Firestore for board updates from opponent
  useEffect(() => {
    if (!isOnlineMatch || !onlineMatchId) return;

    const unsubscribe = listenToMatch(onlineMatchId, (matchData) => {
      // Sync board and current player from Firestore
      // Cast number[][] from Firestore to Cell[][] (0 | 1 | 2)
      useGameStore.setState({
        board: matchData.board as (0 | 1 | 2)[][],
        currentPlayer: matchData.currentPlayer,
      });

      // Handle game end states from the server
      if (matchData.status === 'won' && matchData.winner) {
        useGameStore.setState({
          status: 'won',
          winner: matchData.winner,
        });
      } else if (matchData.status === 'draw') {
        useGameStore.setState({ status: 'draw' });
      } else if (matchData.status === 'resigned' && matchData.winner) {
        useGameStore.setState({
          status: 'won',
          winner: matchData.winner,
        });
      }
    });

    return () => unsubscribe();
  }, [isOnlineMatch, onlineMatchId]);

  // Online match: listen for opponent emotes via Firestore subcollection
  useEffect(() => {
    if (!isOnlineMatch || !onlineMatchId || !myPlayerNum) return;

    const unsubscribe = listenForEmotes(onlineMatchId, (emote) => {
      // Only show emotes from the opponent, not our own
      if (emote.playerNum === myPlayerNum) return;

      // Handle quick chat messages (prefixed with "chat:")
      if (emote.emoteId.startsWith('chat:')) {
        const chatId = emote.emoteId.replace('chat:', '');
        // Look up message text from quickChat data
        const CHAT_LOOKUP: Record<string, string> = {
          gl: 'Good luck!', hf: 'Have fun!', nm: 'Nice move!', wp: 'Well played!',
          ez: 'Too easy!', bm: 'Bring it on!', uh: 'Uh oh...', wow: 'Wow!',
          oops: 'Oops!', close: 'That was close!', think: 'Hmm...', what: 'Wait what?!',
          gg: 'Good game!', rematch: 'Rematch?', thanks: 'Thanks!', bye: 'See ya!',
        };
        const chatText = CHAT_LOOKUP[chatId];
        if (chatText) {
          setOpponentChatBubble({ text: chatText, senderName: p2Name, key: emote.timestamp });
        }
        return;
      }

      setOpponentEmote({ emoteId: emote.emoteId, key: emote.timestamp });
    });

    return () => unsubscribe();
  }, [isOnlineMatch, onlineMatchId, myPlayerNum]);

  // Online match: listen for rematch requests
  useEffect(() => {
    if (!isOnlineMatch || !onlineMatchId || !myPlayerNum) return;
    if (status === 'playing') return; // Only listen when game is over

    const unsubscribe = listenForRematch(onlineMatchId, (rematch) => {
      if (!rematch) {
        setRematchState('idle');
        return;
      }

      // If a new match was created, navigate to it
      if (rematch.newMatchId) {
        setRematchNewMatchId(rematch.newMatchId);
        return;
      }

      // Determine if we requested or the opponent did
      if (rematch.acceptedBy.includes(myPlayerNum)) {
        setRematchState('requested');
      } else {
        setRematchState('opponent-requested');
      }
    });

    return () => unsubscribe();
  }, [isOnlineMatch, onlineMatchId, myPlayerNum, status]);

  // Navigate to new rematch game when both accept
  useEffect(() => {
    if (!rematchNewMatchId || !myPlayerNum) return;

    // In the new match, colors are swapped: old player1 becomes player2 and vice versa
    const newPlayerNum: 1 | 2 = myPlayerNum === 1 ? 2 : 1;
    newGame('medium', false);
    navigation.replace('Game', {
      onlineMatchId: rematchNewMatchId,
      onlinePlayerNum: newPlayerNum,
      onlineOpponentName: p2Name,
    } as any);
  }, [rematchNewMatchId]);

  // Start recording replay when game begins + apply preset board
  useEffect(() => {
    if (status === 'playing' && moveCount === 0) {
      startRecording();
      // Apply preset board from Board Editor if available
      if (params.presetBoard) {
        useGameStore.setState({ board: params.presetBoard as (0 | 1 | 2)[][] });
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

  // Hint pulse animation — pulsing opacity when hint is shown
  useEffect(() => {
    if (hintCol !== null) {
      hintPulseAnim.setValue(0);
      const loop = RNAnimated.loop(
        RNAnimated.sequence([
          RNAnimated.timing(hintPulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
          RNAnimated.timing(hintPulseAnim, { toValue: 0.2, duration: 600, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
  }, [hintCol]);

  // Screen shake when a piece drops (moveCount changes)
  useEffect(() => {
    if (moveCount === 0) return;
    shakeAnim.setValue(0);
    RNAnimated.sequence([
      RNAnimated.timing(shakeAnim, { toValue: 3, duration: 40, useNativeDriver: true }),
      RNAnimated.timing(shakeAnim, { toValue: -3, duration: 40, useNativeDriver: true }),
      RNAnimated.timing(shakeAnim, { toValue: 2, duration: 35, useNativeDriver: true }),
      RNAnimated.timing(shakeAnim, { toValue: -2, duration: 35, useNativeDriver: true }),
      RNAnimated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  }, [moveCount]);

  // Turn indicator pulse when current player changes
  useEffect(() => {
    turnPulseAnim.setValue(1);
    RNAnimated.sequence([
      RNAnimated.spring(turnPulseAnim, { toValue: 1.15, useNativeDriver: true, speed: 50, bounciness: 12 }),
      RNAnimated.spring(turnPulseAnim, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 8 }),
    ]).start();
  }, [currentPlayer]);

  // AI thinking dots animation (cycles 0→1→2→3 every 300ms)
  useEffect(() => {
    if (!isAiThinking) { setThinkingDots(0); return; }
    const interval = setInterval(() => {
      setThinkingDots(prev => (prev + 1) % 4);
    }, 300);
    return () => clearInterval(interval);
  }, [isAiThinking]);

  // Best of 3 series tracking
  const [, setSeriesGame] = useState(1);
  const totalGames = 3;

  // AI move logic — fixed: no dependency on isAiThinking
  // Skip AI entirely for online matches (opponent is a real player)
  useEffect(() => {
    if (isOnlineMatch) return;
    if (!isVsAi || currentPlayer !== 2 || status !== 'playing') return;
    if (aiTimerRef.current) return;

    setAiThinking(true);
    const thinkTime = AI_THINK_DELAY[difficulty];
    // Play thinking voice after a short delay so it feels natural


    aiTimerRef.current = setTimeout(() => {
      aiTimerRef.current = null;
      const currentBoard = useGameStore.getState().board;
      const currentMoveCount = useGameStore.getState().moveCount;
      const { connectCount } = useGameStore.getState().customSettings;
      const aiCol = getAIMove(currentBoard, difficulty, connectCount);
      recordMove(aiCol, 2, currentMoveCount);
      dropPiece(aiCol);
      showLastMove(aiCol);
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
  }, [currentPlayer, status, isVsAi, isOnlineMatch]);

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
      if (moveCount < 10) updateChallenge('fast_win', 1);
      // Win streak challenge — track each win, completes at 2
      updateChallenge('win_streak_2', 1);
      // Season XP
      addSeasonXp(reward);
      // Career level completion
      const careerLevelId = params.careerLevelId;
      if (careerLevelId) {
        setWasCareerLevel(true);
        // Star rating: 3 stars if < 15 moves, 2 if < 25, 1 otherwise
        const starRating = moveCount < 15 ? 3 : moveCount < 25 ? 2 : 1;
        completeCareerLevel(careerLevelId, starRating, moveCount);
        // Award career reward
        const careerReward = params.careerLevelReward;
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
      }
      // Wager court winnings + ranked ELO update
      if (wagerCourt) {
        if (wagerCourt.winnerGets > 0) addCoins(wagerCourt.winnerGets);
        recordRanked(true); // Won wager match — ELO goes up
      }
      // Check achievements
      const matchHistory = useMatchHistoryStore.getState();
      const allMatches = matchHistory.matches;
      const totalWins = allMatches.filter(m => m.result === 'win').length;
      const totalGames = allMatches.length;
      // Award loot box on win (every 3rd win gets a box)
      if (totalWins % 3 === 0) {
        const boxTier = difficulty === 'easy' ? 'bronze_box' : difficulty === 'medium' ? 'silver_box' : 'gold_box';
        addLootBox(boxTier);
      }
      const shopState = useShopStore.getState();
      const careerState = useCareerStore.getState();
      const newAchievements = checkAchievements({
        totalWins,
        currentStreak: useGameStore.getState().winStreak,
        bestStreak: useGameStore.getState().bestStreak,
        totalGames,
        level: shopState.level,
        careerStars: careerState.getTotalStars(),
        lastGameMoves: moveCount,
        hardWins: matchHistory.matches.filter(m => m.result === 'win' && m.difficulty === 'hard').length,
        ownedCosmetics: shopState.owned.boards.length + shopState.owned.pieces.length + shopState.owned.dropEffects.length,
      });
      // First Win special celebration
      if (newAchievements.includes('First Win')) {
        setShowFirstWin(true);
        playSound('level_up');
        firstWinOpacity.setValue(1);
        RNAnimated.sequence([
          RNAnimated.delay(3000),
          RNAnimated.timing(firstWinOpacity, { toValue: 0, duration: 600, useNativeDriver: true }),
        ]).start(() => setShowFirstWin(false));
      }
      setShowConfetti(true);
      setShowCoinBurst(true);
      haptics.win();
      playSound('win');
      playSound('coin');
    }
    if (status === 'won' && winner === 2 && !hasAwardedRef.current) {
      hasAwardedRef.current = true;
      addMatch({ result: 'loss', opponent: `${difficulty} Bot`, difficulty, moves: moveCount, coinsEarned: 0, mode: 'ai' });
      updateChallenge('play_5', 1);
      addSeasonXp(10);
      // Wager lost — coins already deducted, ranked ELO down
      if (wagerCourt) {
        recordRanked(false); // Lost wager match
      }
      haptics.error();
      playSound('lose');
    }
    if (status === 'draw' && !hasAwardedRef.current) {
      hasAwardedRef.current = true;
      addCoins(10);
      addMatch({ result: 'draw', opponent: `${difficulty} Bot`, difficulty, moves: moveCount, coinsEarned: 10, mode: 'ai' });
      updateChallenge('play_5', 1);
      addSeasonXp(15);
      playSound('coin');
    }
    // Local multiplayer challenge
    if ((status === 'won' || status === 'draw') && hasAwardedRef.current && params.localPlayerNames) {
      updateChallenge('play_local', 1);
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

  const showLastMove = useCallback((col: number) => {
    if (lastMoveTimerRef.current) clearTimeout(lastMoveTimerRef.current);
    setLastMoveCol(col);
    lastMoveFade.setValue(1);
    RNAnimated.timing(lastMoveFade, { toValue: 0, duration: 1000, useNativeDriver: true }).start();
    lastMoveTimerRef.current = setTimeout(() => setLastMoveCol(null), 1000);
  }, []);

  const handleColumnPress = useCallback((col: number) => {
    if (status !== 'playing' || isAiThinking) return;

    // Online match: only allow moves on our turn, send to Firestore
    if (isOnlineMatch && onlineMatchId && myPlayerNum) {
      if (currentPlayer !== myPlayerNum) return;
      haptics.drop();
      playSound('drop');
      showLastMove(col);
      makeMove(onlineMatchId, col, myPlayerNum);
      return;
    }

    if (isVsAi && currentPlayer !== 1) return;
    // Center-first challenge: first move in center column
    if (moveCount === 0 && col === Math.floor((customSettings?.cols ?? 7) / 2)) {
      updateChallenge('center_first', 1);
    }
    recordMove(col, currentPlayer, moveCount);
    dropPiece(col);
    showLastMove(col);
    haptics.drop();
    playSound('drop');
  }, [status, isAiThinking, currentPlayer, isVsAi, moveCount, isOnlineMatch, onlineMatchId, myPlayerNum]);

  const handleRematch = () => {
    setSeriesGame(prev => prev < totalGames ? prev + 1 : 1);
    setShowConfetti(false);
    setWasCareerLevel(false);
    setFreeHintsRemaining(3);
    newGame(difficulty, isVsAi);
  };

  const handleBack = () => {
    if (isOnlineMatch && onlineMatchId && myPlayerNum && status === 'playing') {
      Alert.alert(
        'Resign Match?',
        'Leaving will count as a loss.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Resign',
            style: 'destructive',
            onPress: () => {
              resignMatch(onlineMatchId, myPlayerNum);
              navigation.goBack();
            },
          },
        ]
      );
      return;
    }
    navigation.goBack();
  };

  /** Navigate all the way back to the Home tab (used by HOME / LEAVE buttons after game over) */
  const handleGoHome = () => {
    navigation.popToTop();
  };

  // Local player names
  const localNames = params.localPlayerNames || { player1: 'Player 1', player2: 'Player 2' };
  const p1Name = isOnlineMatch ? 'You' : isVsAi ? 'You' : localNames.player1;
  const p2Name = isOnlineMatch
    ? (params.onlineOpponentName || 'Opponent')
    : isVsAi ? `${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} Bot` : localNames.player2;

  // Turn / status text
  const isMyTurn = isOnlineMatch ? currentPlayer === myPlayerNum : currentPlayer === 1;
  const turnText = status === 'playing'
    ? (isAiThinking ? 'Thinking...'
      : isOnlineMatch ? (isMyTurn ? 'Your Turn' : 'Waiting...')
      : (currentPlayer === 1 ? (p1Name === 'You' ? 'Your Turn' : `${p1Name}'s Turn`) : `${p2Name}'s Turn`))
    : status === 'won'
    ? (isOnlineMatch
      ? (winner === myPlayerNum ? 'You Win!' : `${p2Name} Wins!`)
      : (winner === 1 ? (p1Name === 'You' ? 'You Win!' : `${p1Name} Wins!`) : `${p2Name} Wins!`))
    : 'Draw!';

  const diffLabel = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);

  // Helper: compute hint arrow left offset for a given column
  const _getHintArrowOffset = (col: number): number => {
    const BOARD_PAD = 10;
    const GAP = 4;
    return BOARD_PAD + col * (CELL_SIZE + GAP) + CELL_SIZE / 2 - 10;
  };

  // AI reaction mapping: player emote -> possible AI responses
  // Returns null ~50% of the time to feel natural
  const getAiReaction = (playerEmoteId: string): string | null => {
    if (Math.random() < 0.5) return null; // 50% chance of no reaction

    const reactions: Record<string, string[]> = {
      // Taunts → AI gets annoyed or shrugs
      laughpoint: ['angry', 'shrug'],
      slowclap: ['angry', 'shrug', 'laughpoint'],
      angry: ['shrug', 'laughpoint', 'calmdown'],
      tantrum: ['calmdown', 'shrug'],
      // Positive → AI is friendly back
      thumbsup: ['thumbsup', 'clapping', 'wave'],
      clapping: ['thumbsup', 'fistpump', 'wave'],
      fistpump: ['thumbsup', 'clapping', 'wave'],
      armsraised: ['clapping', 'thumbsup'],
      wave: ['wave', 'thumbsup', 'salute'],
      bow: ['wave', 'salute'],
      salute: ['salute', 'wave', 'thumbsup'],
      // Celebrations → AI is annoyed or congratulates
      dab: ['angry', 'laughpoint', 'shrug'],
      airguitar: ['clapping', 'angry', 'shrug'],
      dustshoulder: ['angry', 'laughpoint'],
      fingerguns: ['fingerguns', 'thumbsup'],
      beatchest: ['flexbiceps', 'angry'],
      // Dance → AI reacts
      dancechestpump: ['clapping', 'angry', 'shrug'],
      dancetwist: ['clapping', 'dancechestpump'],
      dancerunstep: ['clapping', 'shrug'],
      // Sad → AI shows sympathy or taunts
      facepalm: ['wave', 'thumbsup', 'laughpoint'],
      crying: ['wave', 'thumbsup', 'calmdown'],
      thumbsdown: ['shrug', 'laughpoint', 'thumbsup'],
      // Affection
      blowkiss: ['wave', 'fingerheart', 'shrug'],
      fingerheart: ['fingerheart', 'thumbsup', 'wave'],
      hearthands: ['hearthands', 'wave', 'thumbsup'],
      callme: ['wave', 'shrug', 'laughpoint'],
      // Reproach
      shrug: ['shrug', 'laughpoint'],
      calmdown: ['shrug', 'thumbsup'],
      // Sporty
      flexbiceps: ['flexbiceps', 'laughpoint', 'boxing'],
      boxing: ['boxing', 'flexbiceps', 'angry'],
    };

    const options = reactions[playerEmoteId] || ['thumbsup', 'wave', 'shrug'];
    return options[Math.floor(Math.random() * options.length)];
  };

  // Trigger AI emote reaction for local vs AI games
  const triggerAiEmoteReaction = (playerEmoteId: string) => {
    if (!isVsAi || isOnlineMatch) return;

    // Clear any pending AI reaction
    if (aiEmoteTimerRef.current) {
      clearTimeout(aiEmoteTimerRef.current);
      aiEmoteTimerRef.current = null;
    }

    const reaction = getAiReaction(playerEmoteId);
    if (!reaction) return;

    // AI reacts after 1-2 second delay
    const delay = 1000 + Math.random() * 1000;
    aiEmoteTimerRef.current = setTimeout(() => {
      aiEmoteTimerRef.current = null;
      setOpponentEmote({ emoteId: reaction, key: Date.now() });
    }, delay);
  };

  // Cleanup AI emote timer on unmount
  useEffect(() => {
    return () => {
      if (aiEmoteTimerRef.current) clearTimeout(aiEmoteTimerRef.current);
    };
  }, []);

  // Format time for chess clock display
  const formatClockTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <ScreenBackground>
      <View style={styles.container}>

        {/* Back/Exit button — top left */}
        <Pressable
          onPress={handleBack}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>✕</Text>
        </Pressable>

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
            <RNAnimated.Text style={[
              styles.turnText,
              status === 'won' && winner === 1 && { color: colors.green },
              status === 'won' && winner === 2 && { color: colors.pieceRed },
              { transform: [{ scale: turnPulseAnim }] },
            ]}>
              {turnText}
            </RNAnimated.Text>
            <Text style={styles.vsText}>{isVsAi ? `vs ${diffLabel} Bot` : `${p1Name} vs ${p2Name}`}</Text>
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

          <View style={styles.hudRightWrap}>
            <PlayerHUD
              name={p2Name}
              avatar={isVsAi
                ? <CharacterAvatar size="medium" variant={`bot_${difficulty}` as any} />
                : <CharacterAvatar size="medium" variant="player" />
              }
              level={isVsAi ? (difficulty === 'easy' ? 5 : difficulty === 'medium' ? 16 : 30) : useShopStore.getState().level}
              pieceColor="yellow"
              score={scores.player2}
              isActive={currentPlayer === 2 && status === 'playing'}
              side="right"
            />
            {isAiThinking && isVsAi && (
              <Text style={styles.thinkingDots}>
                {'.'.repeat(thinkingDots)}
              </Text>
            )}
          </View>
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

        {/* Hint indicator — pulsing arrow above the board */}
        {hintCol !== null && (
          <Animated.View entering={FadeIn.duration(200)} style={[styles.hintArrowRow, { width: BOARD_WIDTH }]}>
            <RNAnimated.Text style={[
              styles.hintArrow,
              { left: _getHintArrowOffset(hintCol), opacity: hintPulseAnim },
            ]}>
              ▼
            </RNAnimated.Text>
          </Animated.View>
        )}

        {/* Game Board — wrapped with screen shake */}
        <RNAnimated.View style={{ transform: [{ translateX: shakeAnim }] }}>
          <GameBoard
            onColumnPress={handleColumnPress}
            disabled={status !== 'playing' || isAiThinking || (isVsAi && currentPlayer !== 1) || (isOnlineMatch && currentPlayer !== myPlayerNum)}
            currentPlayerColor={currentPlayer === 1 ? 'red' : 'yellow'}
          />
        </RNAnimated.View>

        {/* Last move indicator */}
        {lastMoveCol !== null && (
          <RNAnimated.View style={[styles.lastMoveIndicator, { opacity: lastMoveFade }]}>
            <Text style={styles.lastMoveText}>Col {lastMoveCol + 1}</Text>
          </RNAnimated.View>
        )}

        {/* Bottom controls */}
        <View style={styles.controls}>
          {/* Hint button — hidden in online matches; 3 free per game, then 10 coins each */}
          {!isOnlineMatch && (() => {
            const coins = useShopStore.getState().coins;
            const canAffordHint = freeHintsRemaining > 0 || coins >= 10;
            const hintLabel = freeHintsRemaining > 0
              ? `Hint (${freeHintsRemaining})`
              : coins >= 10
                ? 'Hint 🪙10'
                : 'No coins';
            return (
              <Pressable
                onPress={() => {
                  if (status === 'playing' && !isAiThinking && currentPlayer === 1 && canAffordHint) {
                    if (freeHintsRemaining > 0) {
                      setFreeHintsRemaining(prev => prev - 1);
                    } else {
                      const spent = useShopStore.getState().spendCoins(10);
                      if (!spent) return;
                    }
                    haptics.tap();
                    const bestCol = getAIMove(board, 'hard', customSettings.connectCount);
                    setHintCol(bestCol);
                    setTimeout(() => setHintCol(null), 2000);
                  }
                }}
                style={[styles.controlBtn, !canAffordHint && { opacity: 0.4 }]}
                disabled={!canAffordHint}
              >
                <Text style={styles.controlIcon}>💡</Text>
                <Text style={styles.controlLabel}>{hintLabel}</Text>
              </Pressable>
            );
          })()}

          {/* Move counter */}
          <View style={styles.moveCounter}>
            <Text style={styles.moveText}>Move {Math.ceil((moveCount + 1) / 2)}</Text>
          </View>

          {/* Undo button — only available on Easy difficulty, hidden in online/ranked matches */}
          {!isOnlineMatch && !isRankedMode && difficulty === 'easy' && (
            <Pressable onPress={() => {
              if (undoMove()) {
                haptics.tap();
                playSound('swoosh');
              }
            }} style={styles.controlBtn}>
              <Text style={styles.controlIcon}>↩️</Text>
              <Text style={styles.controlLabel}>Undo</Text>
            </Pressable>
          )}

          {/* Resign button */}
          <Pressable onPress={handleBack} style={styles.controlBtn}>
            <Text style={styles.controlIcon}>🏳️</Text>
            <Text style={styles.resignLabel}>{isOnlineMatch ? 'Resign' : 'Quit'}</Text>
          </Pressable>
        </View>

        {/* Compact emote pills + MORE button */}
        <View style={styles.emoteRow}>
          {/* 4 recently-used emote pills */}
          {([
            { id: 'thumbsup' as const, emoji: '👍', label: 'Nice', color: '#2ecc71' },
            { id: 'clapping' as const, emoji: '👏', label: 'GG', color: '#f1c40f' },
            { id: 'laughpoint' as const, emoji: '😂', label: 'Lol', color: '#e67e22' },
            { id: 'angry' as const, emoji: '😤', label: 'Grr', color: '#e74c3c' },
          ]).map(emote => (
            <Pressable
              key={emote.id}
              onPress={() => {
                haptics.tap();
                playSound('click');
                // Show player's emote locally
                setMyEmote({ emoteId: emote.id, key: Date.now() });
                if (isOnlineMatch && onlineMatchId && myPlayerNum) {
                  sendEmote(onlineMatchId, emote.id, myPlayerNum);
                } else {
                  // Local game: trigger AI reaction
                  triggerAiEmoteReaction(emote.id);
                }
              }}
              style={[styles.quickEmotePill, { borderColor: emote.color + '30' }]}
            >
              <Text style={styles.quickEmoteEmoji}>{emote.emoji}</Text>
              <Text style={[styles.quickEmoteLabel, { color: emote.color + 'bb' }]}>{emote.label}</Text>
            </Pressable>
          ))}

          {/* MORE button — opens full picker */}
          <Pressable
            onPress={() => {
              haptics.tap();
              playSound('click');
              setEmotePickerTab('emotes');
              setEmotePickerOpen(true);
            }}
            style={styles.moreBtn}
          >
            <Text style={styles.moreBtnText}>MORE</Text>
            <Text style={styles.moreBtnArrow}>{'▲'}</Text>
          </Pressable>

          {/* Chat button — opens picker on chat tab */}
          <Pressable
            onPress={() => {
              haptics.tap();
              playSound('click');
              setEmotePickerTab('chat');
              setEmotePickerOpen(true);
            }}
            style={styles.chatToggleBtn}
          >
            <Text style={styles.chatToggleIcon}>{'💬'}</Text>
          </Pressable>
        </View>

        {/* Full-screen emote/chat picker modal */}
        <EmotePickerModal
          visible={emotePickerOpen}
          onClose={() => setEmotePickerOpen(false)}
          initialTab={emotePickerTab}
          onEmotePress={(id) => {
            // Show player's emote locally
            setMyEmote({ emoteId: id, key: Date.now() });
            if (isOnlineMatch && onlineMatchId && myPlayerNum) {
              sendEmote(onlineMatchId, id, myPlayerNum);
            } else {
              // Local game: trigger AI reaction
              triggerAiEmoteReaction(id);
            }
          }}
          onChatSend={(msg: QuickChatMessage) => {
            setMyChatBubble({ text: msg.text, key: Date.now() });
            if (isOnlineMatch && onlineMatchId && myPlayerNum) {
              sendEmote(onlineMatchId, `chat:${msg.id}`, myPlayerNum);
            } else if (isVsAi) {
              // AI chat reaction for local games — respond with a contextual chat bubble
              const aiChatDelay = 1000 + Math.random() * 1000;
              setTimeout(() => {
                if (Math.random() < 0.5) return; // 50% chance of no reaction
                const AI_CHAT_RESPONSES: Record<string, string[]> = {
                  gl: ['Good luck!', 'Have fun!'],
                  hf: ['Have fun!', 'Good luck!'],
                  nm: ['Thanks!', 'Well played!'],
                  wp: ['Thanks!', 'Good game!'],
                  ez: ['Bring it on!', 'Hmm...'],
                  bm: ['Bring it on!', 'Good luck!'],
                  uh: ['Hmm...', 'Oops!'],
                  wow: ['Thanks!', 'Wow!'],
                  oops: ['That was close!', 'Hmm...'],
                  close: ['That was close!', 'Wow!'],
                  think: ['Hmm...', 'Wait what?!'],
                  what: ['Hmm...', 'Oops!'],
                  gg: ['Good game!', 'Thanks!'],
                  rematch: ['Bring it on!', 'Good luck!'],
                  thanks: ['Good luck!', 'Have fun!'],
                  bye: ['See ya!', 'Good game!'],
                };
                const options = AI_CHAT_RESPONSES[msg.id] || ['Good game!', 'Hmm...'];
                const aiText = options[Math.floor(Math.random() * options.length)];
                setOpponentChatBubble({ text: aiText, senderName: p2Name, key: Date.now() });
              }, aiChatDelay);
            }
          }}
        />

        {/* Round EMOTE button — opens Fortnite-style wheel */}
        <Pressable
          onPress={() => {
            haptics.tap();
            playSound('click');
            setEmoteWheelOpen(true);
          }}
          style={styles.emoteWheelTrigger}
        >
          <LinearGradient
            colors={['rgba(255,140,0,0.3)', 'rgba(255,100,0,0.12)']}
            style={styles.emoteWheelTriggerGradient}
          >
            <Text style={styles.emoteWheelTriggerIcon}>{'😀'}</Text>
          </LinearGradient>
        </Pressable>

        {/* Fortnite-style radial emote wheel */}
        <FortniteEmoteWheel
          visible={emoteWheelOpen}
          equippedEmotes={equippedEmotes as any}
          onSelect={(emoteId) => {
            setMyEmote({ emoteId, key: Date.now() });
            if (isOnlineMatch && onlineMatchId && myPlayerNum) {
              sendEmote(onlineMatchId, emoteId, myPlayerNum);
            } else {
              triggerAiEmoteReaction(emoteId);
            }
          }}
          onClose={() => setEmoteWheelOpen(false)}
        />

        {/* My Chat Bubble — shows above the board on my side */}
        {myChatBubble && (
          <ChatBubble
            key={myChatBubble.key}
            text={myChatBubble.text}
            senderName={p1Name}
            side={isOnlineMatch && myPlayerNum === 2 ? 'right' : 'left'}
            visible
            onDone={() => setMyChatBubble(null)}
          />
        )}

        {/* Opponent Chat Bubble — shows on opponent's side */}
        {opponentChatBubble && (
          <ChatBubble
            key={opponentChatBubble.key}
            text={opponentChatBubble.text}
            senderName={opponentChatBubble.senderName}
            side={isOnlineMatch && myPlayerNum === 2 ? 'left' : 'right'}
            visible
            onDone={() => setOpponentChatBubble(null)}
          />
        )}

        {/* Floating emote from player (visible to both sides) */}
        {myEmote && (
          <FloatingEmote
            key={myEmote.key}
            emoteId={myEmote.emoteId}
            side={isOnlineMatch && myPlayerNum === 2 ? 'right' : 'left'}
            onDone={() => setMyEmote(null)}
          />
        )}

        {/* Floating emote from opponent / AI */}
        {opponentEmote && (
          <FloatingEmote
            key={opponentEmote.key}
            emoteId={opponentEmote.emoteId}
            side={isOnlineMatch && myPlayerNum === 2 ? 'left' : 'right'}
            onDone={() => setOpponentEmote(null)}
          />
        )}

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

        {/* Coin burst on win */}
        <CoinBurst
          visible={showCoinBurst}
          amount={COIN_REWARDS[difficulty]}
          onDone={() => setShowCoinBurst(false)}
        />

        {/* ========== GAME OVER OVERLAY — Basketball Stars style ========== */}
        <Modal visible={status === 'won' || status === 'draw'} transparent animationType="none">
          <Animated.View entering={FadeIn.duration(300)} style={styles.overlay}>
            {/* First Win golden banner */}
            {showFirstWin && (
              <RNAnimated.View style={[styles.firstWinBanner, { opacity: firstWinOpacity }]} pointerEvents="none">
                <Text style={styles.firstWinText}>FIRST WIN!</Text>
              </RNAnimated.View>
            )}
            <Animated.View entering={SlideInDown.springify().damping(14)} style={styles.goCard}>
             <ScrollView bounces={false} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 8 }}>

              {/* Top: Mode label */}
              <View style={styles.goModeRow}>
                <Text style={styles.goModeText}>
                  {isRankedMode ? 'RANKED' : wagerCourt ? wagerCourt.name?.toUpperCase() : isVsAi ? `VS ${diffLabel.toUpperCase()} BOT` : 'LOCAL MATCH'}
                </Text>
              </View>

              {/* ---- Characters side by side with WINNER banner ---- */}
              <View style={styles.goCharRow}>
                {/* Player 1 side */}
                <View style={styles.goCharSide}>
                  {status === 'won' && winner === 1 && (
                    <LinearGradient colors={['rgba(255,215,0,0.25)', 'rgba(255,170,0,0.05)']} style={styles.goWinnerGlow} />
                  )}
                  <View style={styles.goAvatarWrap}>
                    <CharacterAvatar size="large" variant="player" />
                    {/* Level badge */}
                    <View style={styles.goLevelBadge}>
                      <Text style={styles.goLevelText}>{useShopStore.getState().level}</Text>
                    </View>
                  </View>
                  <Text style={styles.goCharName} numberOfLines={1}>{p1Name}</Text>
                  {status === 'won' && winner === 1 && (
                    <View style={styles.goWinnerBanner}>
                      <Text style={styles.goWinnerText}>WINNER</Text>
                    </View>
                  )}
                </View>

                {/* Center score */}
                <View style={styles.goCenterScore}>
                  <Text style={styles.goScoreBig}>{scores.player1}</Text>
                  <View style={styles.goScoreDivider}>
                    <View style={styles.goScoreLine} />
                    <Text style={styles.goScoreVs}>VS</Text>
                    <View style={styles.goScoreLine} />
                  </View>
                  <Text style={styles.goScoreBig}>{scores.player2}</Text>
                  {status === 'draw' && (
                    <View style={styles.goDrawBadge}>
                      <Text style={styles.goDrawText}>DRAW</Text>
                    </View>
                  )}
                </View>

                {/* Player 2 / Opponent side */}
                <View style={styles.goCharSide}>
                  {status === 'won' && winner === 2 && (
                    <LinearGradient colors={['rgba(255,215,0,0.25)', 'rgba(255,170,0,0.05)']} style={styles.goWinnerGlow} />
                  )}
                  <View style={styles.goAvatarWrap}>
                    <CharacterAvatar
                      size="large"
                      variant={isVsAi ? `bot_${difficulty}` as any : 'player'}
                    />
                    <View style={[styles.goLevelBadge, { backgroundColor: colors.surfaceLight }]}>
                      <Text style={styles.goLevelText}>
                        {isVsAi ? (difficulty === 'easy' ? 5 : difficulty === 'medium' ? 16 : 30) : useShopStore.getState().level}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.goCharName} numberOfLines={1}>{p2Name}</Text>
                  {status === 'won' && winner === 2 && (
                    <View style={styles.goWinnerBanner}>
                      <Text style={styles.goWinnerText}>WINNER</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* ---- Stats comparison bars ---- */}
              <View style={styles.goStatsBlock}>
                {/* Moves Used */}
                <View style={styles.goStatItem}>
                  <View style={styles.goStatHeader}>
                    <Text style={styles.goStatVal}>{Math.ceil(moveCount / 2)}</Text>
                    <Text style={styles.goStatLabel}>MOVES</Text>
                    <Text style={styles.goStatVal}>{Math.floor(moveCount / 2)}</Text>
                  </View>
                  <View style={styles.goBarRow}>
                    <View style={styles.goBarTrack}>
                      <View style={[styles.goBarFillLeft, { width: `${Math.min((Math.ceil(moveCount / 2) / Math.max(moveCount, 1)) * 100, 100)}%` }]} />
                    </View>
                    <View style={styles.goBarTrack}>
                      <View style={[styles.goBarFillRight, { width: `${Math.min((Math.floor(moveCount / 2) / Math.max(moveCount, 1)) * 100, 100)}%` }]} />
                    </View>
                  </View>
                </View>

                {/* Win Streak */}
                <View style={styles.goStatItem}>
                  <View style={styles.goStatHeader}>
                    <Text style={[styles.goStatVal, useGameStore.getState().winStreak > 0 && { color: colors.orange }]}>
                      {useGameStore.getState().winStreak > 0 ? `${useGameStore.getState().winStreak}` : '0'}
                    </Text>
                    <Text style={styles.goStatLabel}>WIN STREAK</Text>
                    <Text style={styles.goStatVal}>-</Text>
                  </View>
                  <View style={styles.goBarRow}>
                    <View style={styles.goBarTrack}>
                      <View style={[styles.goBarFillLeft, { width: `${Math.min(useGameStore.getState().winStreak * 20, 100)}%`, backgroundColor: colors.orange }]} />
                    </View>
                    <View style={styles.goBarTrack}>
                      <View style={[styles.goBarFillRight, { width: '0%' }]} />
                    </View>
                  </View>
                </View>

                {/* Best Streak */}
                <View style={styles.goStatItem}>
                  <View style={styles.goStatHeader}>
                    <Text style={styles.goStatVal}>{useGameStore.getState().bestStreak}</Text>
                    <Text style={styles.goStatLabel}>BEST STREAK</Text>
                    <Text style={styles.goStatVal}>-</Text>
                  </View>
                </View>
              </View>

              {/* ---- Rewards section ---- */}
              <View style={styles.goRewardsBlock}>
                {/* Coin tooltip */}
                {coinTooltipVisible && (
                  <View style={styles.coinTooltip}>
                    <Text style={styles.coinTooltipText}>Visit the Shop to spend your coins!</Text>
                    <View style={styles.coinTooltipArrow} />
                  </View>
                )}
                {/* Coins earned */}
                {status === 'won' && winner === 1 && (
                  <Pressable
                    style={styles.goRewardChip}
                    onPress={() => {
                      haptics.tap();
                      setCoinTooltipVisible(true);
                      setTimeout(() => setCoinTooltipVisible(false), 2500);
                    }}
                  >
                    <Text style={styles.goRewardIcon}>🪙</Text>
                    <Text style={styles.goRewardAmount}>+{COIN_REWARDS[difficulty]}</Text>
                    <Text style={styles.goRewardDesc}>Coins</Text>
                  </Pressable>
                )}
                {status === 'draw' && (
                  <Pressable
                    style={styles.goRewardChip}
                    onPress={() => {
                      haptics.tap();
                      setCoinTooltipVisible(true);
                      setTimeout(() => setCoinTooltipVisible(false), 2500);
                    }}
                  >
                    <Text style={styles.goRewardIcon}>🪙</Text>
                    <Text style={styles.goRewardAmount}>+10</Text>
                    <Text style={styles.goRewardDesc}>Draw Bonus</Text>
                  </Pressable>
                )}
                {/* Streak bonus */}
                {status === 'won' && winner === 1 && useGameStore.getState().winStreak > 1 && (
                  <View style={[styles.goRewardChip, { borderColor: 'rgba(255,140,0,0.3)' }]}>
                    <Text style={styles.goRewardIcon}>🔥</Text>
                    <Text style={[styles.goRewardAmount, { color: colors.orange }]}>+{Math.min(useGameStore.getState().winStreak * 10, 50)}</Text>
                    <Text style={styles.goRewardDesc}>Streak</Text>
                  </View>
                )}
                {/* XP earned */}
                {status === 'won' && winner === 1 && (
                  <View style={[styles.goRewardChip, { borderColor: 'rgba(155,89,182,0.3)' }]}>
                    <Text style={styles.goRewardIcon}>⭐</Text>
                    <Text style={[styles.goRewardAmount, { color: colors.purple }]}>+{COIN_REWARDS[difficulty]}</Text>
                    <Text style={styles.goRewardDesc}>XP</Text>
                  </View>
                )}
                {/* Season XP */}
                {status === 'won' && winner === 1 && (
                  <View style={[styles.goRewardChip, { borderColor: 'rgba(26,188,156,0.3)' }]}>
                    <Text style={styles.goRewardIcon}>🏆</Text>
                    <Text style={[styles.goRewardAmount, { color: colors.teal }]}>+{COIN_REWARDS[difficulty]}</Text>
                    <Text style={styles.goRewardDesc}>Season</Text>
                  </View>
                )}
                {/* Career stars */}
                {status === 'won' && winner === 1 && wasCareerLevel && (
                  <View style={[styles.goRewardChip, { borderColor: 'rgba(241,196,15,0.3)' }]}>
                    <Text style={styles.goRewardIcon}>⭐</Text>
                    <Text style={[styles.goRewardAmount, { color: colors.gold }]}>
                      {moveCount < 15 ? '3' : moveCount < 25 ? '2' : '1'}
                    </Text>
                    <Text style={styles.goRewardDesc}>Stars</Text>
                  </View>
                )}
              </View>

              {/* Wager display */}
              {wagerCourt && wagerCourt.winnerGets > 0 && status === 'won' && winner === 1 && (
                <View style={styles.goWagerRow}>
                  <Text style={styles.goWagerIcon}>🪙🪙🪙</Text>
                  <Text style={styles.goWagerText}>+{wagerCourt.winnerGets} Wager Won!</Text>
                </View>
              )}

              {/* ELO change for ranked/wager matches */}
              {(isRankedMode || wagerCourt) && (
                <View style={styles.goEloWrap}>
                  <EloChangeAnimation
                    eloBefore={preGameEloRef.current}
                    eloAfter={useRankedStore.getState().elo}
                  />
                </View>
              )}

              {/* Chat bubble — "Good game!" feel */}
              <View style={styles.goChatBubble}>
                <Text style={styles.goChatText}>
                  {status === 'won' && winner === 1 ? 'Good game!' : status === 'won' && winner === 2 ? 'Better luck next time!' : 'Well played!'}
                </Text>
              </View>

              {/* ---- Action Buttons ---- */}
              <View style={styles.goButtons}>
                {isOnlineMatch ? (
                  <>
                    {rematchState === 'opponent-requested' && (
                      <View style={styles.goRematchBanner}>
                        <Text style={styles.goRematchBannerText}>Opponent wants a rematch!</Text>
                      </View>
                    )}
                    {rematchState === 'opponent-requested' ? (
                      <>
                        <GlossyButton
                          label="ACCEPT REMATCH"
                          icon="🤝"
                          variant="green"
                          onPress={() => {
                            if (onlineMatchId && myPlayerNum) {
                              acceptRematch(onlineMatchId, myPlayerNum);
                              setRematchState('requested');
                            }
                          }}
                        />
                        <GlossyButton
                          label="DECLINE"
                          variant="red"
                          onPress={handleGoHome}
                          style={{ marginTop: 8 }}
                        />
                      </>
                    ) : rematchState === 'requested' ? (
                      <GlossyButton
                        label="WAITING FOR OPPONENT..."
                        variant="navy"
                        onPress={() => {}}
                        disabled
                      />
                    ) : (
                      <>
                        <GlossyButton
                          label="REMATCH"
                          icon="🔄"
                          variant="orange"
                          onPress={() => {
                            if (onlineMatchId && myPlayerNum) {
                              requestRematch(onlineMatchId, myPlayerNum);
                              setRematchState('requested');
                            }
                          }}
                        />
                        <GlossyButton
                          label="LEAVE"
                          icon="🚪"
                          variant="navy"
                          onPress={handleGoHome}
                          style={{ marginTop: 8 }}
                        />
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <GlossyButton
                      label="REMATCH"
                      icon="🔄"
                      variant="orange"
                      onPress={handleRematch}
                    />
                    <GlossyButton
                      label="HOME"
                      icon="🏠"
                      variant="navy"
                      onPress={handleGoHome}
                      style={{ marginTop: 8 }}
                    />
                  </>
                )}
              </View>
             </ScrollView>
            </Animated.View>
          </Animated.View>
        </Modal>

        {/* Tutorial tooltip */}
        <TutorialTooltip
          tip={gameTip}
          visible={showGameTutorial && !hasSeenGameTip('game_hint')}
          onDismiss={() => setShowGameTutorial(false)}
        />
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 4,
    left: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600' as const,
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
    marginTop: 28,
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
    gap: 6,
    marginTop: 6,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  controlBtn: {
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  controlIcon: {
    fontSize: 15,
  },
  controlLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 9,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 1,
  },
  resignLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 9,
    color: 'rgba(230,57,70,0.5)',
    marginTop: 1,
  },
  hudRightWrap: {
    alignItems: 'flex-end',
  },
  thinkingDots: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 14,
    color: colors.pieceYellow,
    letterSpacing: 2,
    minWidth: 24,
    textAlign: 'center',
    marginTop: 2,
  },
  hintArrowRow: {
    alignSelf: 'center',
    height: 22,
    marginBottom: 2,
    position: 'relative',
  },
  hintArrow: {
    position: 'absolute',
    top: 0,
    fontSize: 20,
    color: colors.coinGold,
    textShadowColor: 'rgba(255,215,0,0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  lastMoveIndicator: {
    alignSelf: 'center',
    backgroundColor: 'rgba(255,140,0,0.15)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 2,
    marginBottom: 2,
  },
  lastMoveText: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 10,
    color: 'rgba(255,180,80,0.8)',
    letterSpacing: 0.3,
  },
  moveCounter: {
    backgroundColor: 'rgba(255,140,0,0.10)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,140,0,0.15)',
  },
  moveText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.3,
  },
  // Emote row — compact pills + MORE + chat
  emoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 4,
  },
  quickEmotePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 18,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1.5,
  },
  quickEmoteEmoji: {
    fontSize: 16,
  },
  quickEmoteLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 10,
    letterSpacing: 0.3,
  },
  moreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255,140,0,0.12)',
    borderRadius: 18,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(255,140,0,0.25)',
  },
  moreBtnText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 9,
    color: colors.orange,
    letterSpacing: 1,
  },
  moreBtnArrow: {
    fontSize: 8,
    color: colors.orange,
  },
  chatToggleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatToggleIcon: {
    fontSize: 16,
  },
  // Round EMOTE wheel trigger button
  emoteWheelTrigger: {
    position: 'absolute',
    bottom: 120,
    right: 12,
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: colors.orange,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 20,
  },
  emoteWheelTriggerGradient: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,140,0,0.4)',
  },
  emoteWheelTriggerIcon: {
    fontSize: 26,
  },
  // ======== Basketball Stars-style Game Over ========
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  firstWinBanner: {
    position: 'absolute',
    top: '8%',
    alignSelf: 'center',
    backgroundColor: 'rgba(255,215,0,0.2)',
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderWidth: 2,
    borderColor: 'rgba(255,215,0,0.5)',
    zIndex: 200,
    shadowColor: 'rgba(255,215,0,0.8)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 30,
  },
  firstWinText: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 28,
    color: '#FFD700',
    letterSpacing: 4,
    textShadowColor: 'rgba(255,200,0,0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  goCard: {
    width: '92%',
    maxWidth: 380,
    maxHeight: '88%',
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: colors.bgDark,
    borderWidth: 1.5,
    borderColor: 'rgba(255,215,0,0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 24,
  },
  goModeRow: {
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  goModeText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 10,
    color: colors.textMuted,
    letterSpacing: 2,
  },
  // Character row
  goCharRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 16,
    paddingBottom: 8,
  },
  goCharSide: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  goWinnerGlow: {
    position: 'absolute',
    top: -8,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 16,
  },
  goAvatarWrap: {
    position: 'relative',
    marginBottom: 4,
  },
  goLevelBadge: {
    position: 'absolute',
    bottom: -4,
    right: -6,
    backgroundColor: colors.orange,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.bgDark,
  },
  goLevelText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 10,
    color: '#ffffff',
  },
  goCharName: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 12,
    color: '#ffffff',
    marginTop: 4,
    maxWidth: 90,
    textAlign: 'center',
  },
  goWinnerBanner: {
    marginTop: 6,
    backgroundColor: 'rgba(255,215,0,0.15)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.35)',
  },
  goWinnerText: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 14,
    color: colors.coinGold,
    letterSpacing: 2,
    textShadowColor: 'rgba(255,215,0,0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  // Center score
  goCenterScore: {
    alignItems: 'center',
    paddingHorizontal: 8,
    minWidth: 80,
  },
  goScoreBig: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 36,
    color: '#ffffff',
    lineHeight: 40,
  },
  goScoreDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginVertical: 2,
  },
  goScoreLine: {
    width: 14,
    height: 1.5,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  goScoreVs: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 9,
    color: colors.textMuted,
    letterSpacing: 1,
  },
  goDrawBadge: {
    marginTop: 4,
    backgroundColor: 'rgba(52,152,219,0.2)',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(52,152,219,0.4)',
  },
  goDrawText: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 11,
    color: '#3498db',
    letterSpacing: 1.5,
  },
  // Stats comparison
  goStatsBlock: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  goStatItem: {
    marginBottom: 8,
  },
  goStatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  goStatLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 9,
    color: colors.textMuted,
    letterSpacing: 1.5,
    textAlign: 'center',
    flex: 1,
  },
  goStatVal: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 13,
    color: '#ffffff',
    width: 36,
    textAlign: 'center',
  },
  goBarRow: {
    flexDirection: 'row',
    gap: 4,
  },
  goBarTrack: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  goBarFillLeft: {
    height: '100%',
    backgroundColor: colors.green,
    borderRadius: 3,
    alignSelf: 'flex-end',
  },
  goBarFillRight: {
    height: '100%',
    backgroundColor: '#3498db',
    borderRadius: 3,
  },
  // Rewards chips
  goRewardsBlock: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  goRewardChip: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,215,0,0.06)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.15)',
    minWidth: 64,
  },
  coinTooltip: {
    position: 'absolute',
    top: -32,
    alignSelf: 'center',
    backgroundColor: 'rgba(10,14,39,0.95)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,140,0,0.3)',
    zIndex: 10,
  },
  coinTooltipText: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 11,
    color: colors.orange,
  },
  coinTooltipArrow: {
    position: 'absolute',
    bottom: -5,
    alignSelf: 'center',
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 5,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: 'rgba(255,140,0,0.3)',
  },
  goRewardIcon: {
    fontSize: 16,
    marginBottom: 2,
  },
  goRewardAmount: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 15,
    color: colors.coinGold,
  },
  goRewardDesc: {
    fontFamily: fonts.body,
    fontWeight: weight.medium,
    fontSize: 9,
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginTop: 1,
  },
  // Wager display
  goWagerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
    marginHorizontal: 16,
    backgroundColor: 'rgba(255,215,0,0.08)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.2)',
  },
  goWagerIcon: {
    fontSize: 14,
  },
  goWagerText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 14,
    color: colors.coinGold,
  },
  goEloWrap: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  // Chat bubble
  goChatBubble: {
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  goChatText: {
    fontFamily: fonts.body,
    fontWeight: weight.medium,
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  // Buttons
  goButtons: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 4,
  },
  goRematchBanner: {
    backgroundColor: 'rgba(255,140,0,0.12)',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,140,0,0.25)',
    alignItems: 'center',
  },
  goRematchBannerText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 13,
    color: colors.orange,
    textAlign: 'center',
  },
});
