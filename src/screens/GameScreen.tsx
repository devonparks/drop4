import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, Modal, Animated as RNAnimated, ScrollView, Platform, Share } from 'react-native';
import Animated, {
  FadeIn,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { PressScale, SlideReveal, Shimmer } from '../components/animations';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp, useRoute } from '@react-navigation/native';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { GlossyButton } from '../components/ui/GlossyButton';
import { GameBoard, CELL_SIZE, BOARD_WIDTH } from '../components/board/GameBoard';
import { AnimatedStarRating } from '../components/effects/AnimatedStarRating';
import { PlayerHUD } from '../components/ui/PlayerHUD';
import { Character3DPortrait } from '../components/3d/Character3DPortrait';
import { getNpcCustomization } from '../data/npcCustomizations';
import { PetDisplay } from '../components/ui/PetDisplay';
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
import { colors } from '../theme/colors';
import { fonts, weight } from '../theme/typography';
import { getRandomGameOverQuote } from '../data/tips';
import { ConfettiOverlay } from '../components/effects/ConfettiOverlay';
import { AchievementToast } from '../components/effects/AchievementToast';
import { FloatingEmote } from '../components/effects/FloatingEmote';
import { CoinBurst } from '../components/effects/CoinBurst';
import { ChatBubble } from '../components/effects/ChatBubble';
import { ALL_CAREER_LEVELS } from '../data/careerLevels';
import { useTutorialStore } from '../stores/tutorialStore';
import { getStreakMultiplier } from '../stores/dailyRewardStore';
import { TutorialTooltip } from '../components/ui/TutorialTooltip';
import { getTipById } from '../data/tutorials';
import { BOARD_THEMES } from '../data/shopCatalog';
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
  const winStreak = useGameStore(s => s.winStreak);
  const bestStreak = useGameStore(s => s.bestStreak);
  const addCoins = useShopStore(s => s.addCoins);
  const addXp = useShopStore(s => s.addXp);
  const level = useShopStore(s => s.level);
  const addMatch = useMatchHistoryStore(s => s.addMatch);
  const matches = useMatchHistoryStore(s => s.matches);
  const updateChallenge = useChallengeStore(s => s.updateProgress);
  const resetChallenge = useChallengeStore(s => s.resetProgress);
  const addSeasonXp = useSeasonStore(s => s.addSeasonXp);
  const completeCareerLevel = useCareerStore(s => s.completeLevel);
  const checkAchievements = useAchievementStore(s => s.checkAndUnlock);
  const addLootBox = useLootBoxStore(s => s.addBox);
  const startRecording = useReplayStore(s => s.startRecording);
  const recordMove = useReplayStore(s => s.recordMove);
  const saveReplay = useReplayStore(s => s.saveReplay);
  const recordRanked = useRankedStore(s => s.recordRankedResult);
  const resetScores = useGameStore(s => s.resetScores);
  const customSettings = useGameStore(s => s.customSettings);
  const hasAwardedRef = useRef(false);
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

  // Rewards summary tracking
  const [streakReward, setStreakReward] = useState<{ coins: number; lootBox?: string; milestone: number } | null>(null);
  const [didLevelUp, setDidLevelUp] = useState(false);
  const [seasonTierUp, setSeasonTierUp] = useState<number | null>(null);
  const [completedChallengeName, setCompletedChallengeName] = useState<string | null>(null);
  const [streakBrokenAt, setStreakBrokenAt] = useState<number | null>(null);
  const [dailyStreakMultiplier, setDailyStreakMultiplier] = useState(1);
  const [totalCoinsEarned, setTotalCoinsEarned] = useState(0);
  const preLevelRef = useRef(useShopStore.getState().level);
  const preStreakRef = useRef(useGameStore.getState().winStreak);

  // Last move indicator
  const [lastMoveCol, setLastMoveCol] = useState<number | null>(null);
  const lastMoveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastMoveFade = useRef(new RNAnimated.Value(0)).current;

  // Emote Picker Modal
  const [emotePickerOpen, setEmotePickerOpen] = useState(false);

  // Tutorial
  const hasSeenGameTip = useTutorialStore(s => s.hasSeenTip);
  const gameTip = getTipById('game_hint')!;
  const [showGameTutorial, setShowGameTutorial] = useState(false);

  const [shareCopied, setShareCopied] = useState(false);
  const [doubleCoinsUsed, setDoubleCoinsUsed] = useState(false);
  const [gameOverQuote, setGameOverQuote] = useState('');
  const [isFirstWinOfDay, setIsFirstWinOfDay] = useState(false);

  // Comeback mechanic — pity coins after losing streak
  const [comebackCoins, setComebackCoins] = useState<number | null>(null);

  // Win celebration variety
  const [celebrationText, setCelebrationText] = useState<string | null>(null);

  // AI personality hints
  const [aiPersonalityText, setAiPersonalityText] = useState<string | null>(null);
  const aiPersonalityFade = useRef(new RNAnimated.Value(0)).current;
  const aiPersonalityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // First-game encouragement
  const [showFirstGameMsg, setShowFirstGameMsg] = useState(false);
  const firstGameFade = useRef(new RNAnimated.Value(0)).current;

  // Post-game stats — memoized to avoid calling getState() in render path
  const personalBest = useMemo(() => {
    const pastWins = matches.filter(m => m.result === 'win' && m.mode === 'ai' && m.difficulty === difficulty);
    // pastWins[0] is the current game (just added); slice(1) = previous records
    if (pastWins.length > 1) {
      return Math.min(...pastWins.slice(1).map(m => m.moves));
    }
    return null;
  }, [matches, difficulty]);

  const totalWins = useMemo(() => matches.filter(m => m.result === 'win').length, [matches]);

  // Show tutorial on first game
  useEffect(() => {
    if (!hasSeenGameTip('game_hint')) {
      const timer = setTimeout(() => setShowGameTutorial(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  // First-game detection — show encouragement if no match history
  useEffect(() => {
    const initialMatches = useMatchHistoryStore.getState().matches;
    if (initialMatches.length === 0 && isVsAi) {
      setShowFirstGameMsg(true);
      RNAnimated.timing(firstGameFade, { toValue: 1, duration: 600, useNativeDriver: true }).start();
      const timer = setTimeout(() => {
        RNAnimated.timing(firstGameFade, { toValue: 0, duration: 800, useNativeDriver: true }).start(() => {
          setShowFirstGameMsg(false);
        });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, []);

  // Fortnite-style emote wheel
  const [emoteWheelOpen, setEmoteWheelOpen] = useState(false);
  const equippedEmotes = useShopStore(s => s.equippedEmotes);
  const equippedPet = useShopStore(s => s.equippedPet);
  const equippedBoard = useShopStore(s => s.equipped.board);
  const boardThemeName = BOARD_THEMES.find(b => b.id === equippedBoard)?.name || 'Classic Blue';

  // Achievement toast queue
  const [achievementQueue, setAchievementQueue] = useState<{ name: string; icon: string }[]>([]);
  const [currentAchievementToast, setCurrentAchievementToast] = useState<{ name: string; icon: string } | null>(null);
  // Dequeue achievements one at a time
  useEffect(() => {
    if (!currentAchievementToast && achievementQueue.length > 0) {
      const [next, ...rest] = achievementQueue;
      setCurrentAchievementToast(next);
      setAchievementQueue(rest);
    }
  }, [achievementQueue, currentAchievementToast]);

  // Game count milestone celebration
  const [milestoneCelebration, setMilestoneCelebration] = useState<string | null>(null);
  const [undoCount, setUndoCount] = useState(0);

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

  const wagerCourt = params.wagerCourt;

  // Emote display — player and opponent/AI
  const [myEmote, setMyEmote] = useState<{ emoteId: string; key: number } | null>(null);
  const [opponentEmote, setOpponentEmote] = useState<{ emoteId: string; key: number } | null>(null);
  const aiEmoteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Series mode tracking (bo3/bo5/bo7)
  const seriesWinsNeeded = params.seriesWinsNeeded ?? 1;
  const isSeriesMode = seriesWinsNeeded > 1;
  const [seriesGame, setSeriesGame] = useState(1);
  const totalGames = isSeriesMode ? seriesWinsNeeded * 2 - 1 : 3;
  const seriesOver = isSeriesMode && (scores.player1 >= seriesWinsNeeded || scores.player2 >= seriesWinsNeeded);

  // AI personality phrases by difficulty + situational
  const AI_PERSONALITY: Record<string, string[]> = {
    easy: ['Hmm, where should I go?', 'I like this column!', 'This looks fun!', 'Here I go!', 'Ooh, what about here?', 'Eenie meenie...', 'This one feels right!', 'Am I doing good?'],
    medium: ['Interesting move...', 'I see what you\'re doing...', 'Let me think...', 'Not bad!', 'Watch this!', 'Clever...', 'I see your plan.', 'This is getting good!', 'Okay okay...'],
    hard: ['Is that your best move?', 'You can\'t beat me.', 'Too predictable.', 'I\'m always one step ahead.', 'Nice try.', 'Pathetic.', 'I\'ve already won.', 'You call that strategy?', 'Check. Mate.'],
  };
  const AI_REACTIONS: Record<string, { blocking: string[]; winning: string[]; opening: string[] }> = {
    easy: {
      blocking: ['Oops, almost missed that!', 'Wait, I should block!'],
      winning: ['Yay, I did it!', 'Did I win?!'],
      opening: ['I\'ll start here!', 'Hmm, the middle looks nice!'],
    },
    medium: {
      blocking: ['Not so fast!', 'I see your trap.', 'Blocked!'],
      winning: ['Got you!', 'That\'s game!', 'Well played... but not enough.'],
      opening: ['Standard opening.', 'Let\'s see what you\'ve got.'],
    },
    hard: {
      blocking: ['Did you really think that would work?', 'Predictable.', 'Too slow.'],
      winning: ['GG. Easy.', 'Never had a chance.', 'As expected.'],
      opening: ['Your move.', 'I\'ll let you go first... this time.'],
    },
  };

  const showAiPersonality = useCallback((context?: 'blocking' | 'winning' | 'opening') => {
    if (Math.random() > 0.45) return; // ~45% chance to show
    let phrases: string[];
    if (context && AI_REACTIONS[difficulty]) {
      phrases = AI_REACTIONS[difficulty][context];
    } else {
      phrases = AI_PERSONALITY[difficulty] || AI_PERSONALITY.easy;
    }
    const phrase = phrases[Math.floor(Math.random() * phrases.length)];
    setAiPersonalityText(phrase);
    aiPersonalityFade.setValue(0);
    RNAnimated.timing(aiPersonalityFade, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    if (aiPersonalityTimerRef.current) clearTimeout(aiPersonalityTimerRef.current);
    aiPersonalityTimerRef.current = setTimeout(() => {
      RNAnimated.timing(aiPersonalityFade, { toValue: 0, duration: 400, useNativeDriver: true }).start(() => {
        setAiPersonalityText(null);
      });
    }, 1800);
  }, [difficulty]);

  // AI move logic — fixed: no dependency on isAiThinking
  // Skip AI entirely for online matches (opponent is a real player)
  useEffect(() => {
    if (isOnlineMatch) return;
    if (!isVsAi || currentPlayer !== 2 || status !== 'playing') return;
    if (aiTimerRef.current) return;

    setAiThinking(true);
    const baseThinkTime = AI_THINK_DELAY[difficulty];
    const speedParam = params.gameSpeed || 'normal';
    const thinkTime = speedParam === 'instant' ? 50 : speedParam === 'fast' ? Math.round(baseThinkTime * 0.3) : baseThinkTime;

    aiTimerRef.current = setTimeout(() => {
      aiTimerRef.current = null;
      const currentBoard = useGameStore.getState().board;
      const currentMoveCount = useGameStore.getState().moveCount;
      const { connectCount } = useGameStore.getState().customSettings;
      const aiCol = getAIMove(currentBoard, difficulty, connectCount);
      recordMove(aiCol, 2, currentMoveCount);
      dropPiece(aiCol);
      showLastMove(aiCol);
      haptics.tap(); // Lighter haptic for AI moves
      playSound('drop');
      setAiThinking(false);
      showAiPersonality();
    }, thinkTime);

    return () => {
      if (aiTimerRef.current) {
        clearTimeout(aiTimerRef.current);
        aiTimerRef.current = null;
      }
    };
  }, [currentPlayer, status, isVsAi, isOnlineMatch]);

  // Track streak before game ends (streak resets to 0 in gameStore on loss)
  useEffect(() => {
    if (status === 'playing') {
      preStreakRef.current = useGameStore.getState().winStreak;
      preLevelRef.current = useShopStore.getState().level;
    }
  }, [status, moveCount]);

  // Award coins on win
  useEffect(() => {
    if (status === 'won' && winner === 1 && !hasAwardedRef.current) {
      hasAwardedRef.current = true;
      const reward = COIN_REWARDS[difficulty];
      const streakBonus = Math.min(useGameStore.getState().winStreak * 10, 50);
      const dailyMultiplier = getStreakMultiplier();
      const totalReward = Math.round((reward + streakBonus) * dailyMultiplier);
      addCoins(totalReward);
      // First Win of the Day — 2x XP if no wins yet today
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const winsToday = useMatchHistoryStore.getState().matches.filter(
        m => m.result === 'win' && m.timestamp >= todayStart.getTime()
      );
      const isFirstToday = winsToday.length === 0;
      const xpAmount = isFirstToday ? reward * 2 : reward;
      addXp(xpAmount);
      if (isFirstToday) setIsFirstWinOfDay(true);
      // Detect level-up
      const newLevel = useShopStore.getState().level;
      if (newLevel > preLevelRef.current) {
        setDidLevelUp(true);
        playSound('level_up');
        haptics.levelUp();
      }
      setDailyStreakMultiplier(dailyMultiplier);
      const matchMode = params.careerLevelId ? 'career' : isRankedMode ? 'ranked' : wagerCourt ? 'wager' : isOnlineMatch ? 'online' : !isVsAi ? 'local' : 'ai';
      const matchOpponent = isOnlineMatch ? (params.onlineOpponentName || 'Online') : isVsAi ? `${difficulty} Bot` : localNames.player2;
      addMatch({ result: 'win', opponent: matchOpponent, difficulty, moves: moveCount, coinsEarned: totalReward, mode: matchMode });
      // Update challenges
      updateChallenge('win_3', 1);
      updateChallenge('win_5', 1);
      updateChallenge('play_5', 1);
      updateChallenge('play_10', 1);
      if (difficulty === 'easy') { updateChallenge('win_easy', 1); updateChallenge('win_3_easy', 1); }
      if (difficulty === 'medium') updateChallenge('win_medium', 1);
      if (difficulty === 'hard') { updateChallenge('win_hard', 1); updateChallenge('win_2_hard', 1); }
      if (moveCount < 10) updateChallenge('fast_win', 1);
      if (moveCount < 8) updateChallenge('blitz_win', 1);
      // Win streak challenges — track each win, reset on loss/draw
      updateChallenge('win_streak_2', 1);
      updateChallenge('win_streak_3', 1);
      // Career level completion
      if (params.careerLevelId) updateChallenge('career_level', 1);
      // Detect challenge completion
      const justCompleted = useChallengeStore.getState().challenges.find(
        c => !c.completed && c.progress >= c.target
      );
      if (justCompleted) setCompletedChallengeName(justCompleted.title);
      // Season XP — detect tier-up
      const preTier = useSeasonStore.getState().currentTier;
      addSeasonXp(reward);
      const postTier = useSeasonStore.getState().currentTier;
      if (postTier > preTier) {
        setSeasonTierUp(postTier);
        playSound('level_up');
        haptics.levelUp();
      }
      // Career level completion
      const careerLevelId = params.careerLevelId;
      if (careerLevelId) {
        setWasCareerLevel(true);
        // Star rating: 3 stars if < 15 moves, 2 if < 25, 1 otherwise
        const starRating = moveCount < 15 ? 3 : moveCount < 25 ? 2 : 1;
        completeCareerLevel(careerLevelId, starRating, moveCount);
        // Award career reward(s)
        const careerReward = params.careerLevelReward;
        const grantReward = (r: typeof careerReward) => {
          if (!r) return;
          if (r.type === 'coins' && r.amount) addCoins(r.amount);
          if (r.type === 'board' && r.id) useShopStore.getState().purchaseItem('boards', r.id, 0);
          if (r.type === 'pieces' && r.id) useShopStore.getState().purchaseItem('pieces', r.id, 0);
          if (r.type === 'pet' && r.id) useShopStore.getState().purchasePet(r.id, 0);
        };
        grantReward(careerReward);
        // Grant bonus reward (e.g. pet from boss levels)
        const levelData = ALL_CAREER_LEVELS.find(l => l.id === careerLevelId);
        if (levelData?.bonusReward) grantReward(levelData.bonusReward as any);
      }
      // Wager court winnings + ranked ELO update
      if (wagerCourt) {
        if (wagerCourt.winnerGets > 0) addCoins(wagerCourt.winnerGets);
        recordRanked(true);
      } else if (isRankedMode) {
        recordRanked(true); // Ranked mode win — ELO goes up
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
        ownedCosmetics: shopState.owned.boards.length + shopState.owned.pieces.length + shopState.owned.dropEffects.length + shopState.ownedEmotes.length,
        ownedPets: shopState.ownedPets,
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
      // Queue achievement toasts for other unlocked achievements
      const otherAchievements = newAchievements.filter(name => name !== 'First Win');
      if (otherAchievements.length > 0) {
        const allAchievements = useAchievementStore.getState().achievements;
        const toasts = otherAchievements.map(name => {
          const ach = allAchievements.find(a => a.name === name);
          return { name, icon: ach?.icon ?? '🏆' };
        });
        setAchievementQueue(q => [...q, ...toasts]);
      }
      // Streak Rewards — bonus coins + loot boxes at milestones
      const currentStreak = useGameStore.getState().winStreak;
      if (currentStreak === 3) {
        addCoins(50);
        setStreakReward({ coins: 50, milestone: 3 });
      } else if (currentStreak === 5) {
        addCoins(200);
        addLootBox('bronze_box');
        setStreakReward({ coins: 200, lootBox: 'Bronze', milestone: 5 });
      } else if (currentStreak === 10) {
        addCoins(1000);
        addLootBox('silver_box');
        setStreakReward({ coins: 1000, lootBox: 'Silver', milestone: 10 });
      } else if (currentStreak === 15) {
        addCoins(5000);
        addLootBox('gold_box');
        setStreakReward({ coins: 5000, lootBox: 'Gold', milestone: 15 });
      }
      // Compute total coins for CoinBurst intensity
      let coinTotal = totalReward;
      if (wagerCourt && wagerCourt.winnerGets > 0) coinTotal += wagerCourt.winnerGets;
      if (currentStreak === 3) coinTotal += 50;
      else if (currentStreak === 5) coinTotal += 200;
      else if (currentStreak === 10) coinTotal += 1000;
      else if (currentStreak === 15) coinTotal += 5000;
      setTotalCoinsEarned(coinTotal);
      setShowConfetti(true);
      setShowCoinBurst(true);
      // Win celebration variety
      const playerMoveCount = Math.ceil(moveCount / 2);
      const careerStars = params.careerLevelId ? (moveCount < 15 ? 3 : moveCount < 25 ? 2 : 1) : 0;
      const wasLosingInSeries = scores.player2 > scores.player1;
      if (playerMoveCount <= 8) {
        setCelebrationText('LIGHTNING WIN! \u26A1');
      } else if (wasLosingInSeries) {
        setCelebrationText('COMEBACK! \uD83D\uDD25');
      } else if (careerStars === 3) {
        setCelebrationText('PERFECT! \u2B50\u2B50\u2B50');
      } else {
        setCelebrationText('VICTORY! \uD83C\uDF89');
      }
      haptics.win();
      haptics.coinEarn();
      playSound('win');
      playSound('coin');
    }
    if (status === 'won' && winner === 2 && !hasAwardedRef.current) {
      hasAwardedRef.current = true;
      // Detect broken streak (preStreakRef captured while game was playing)
      if (preStreakRef.current >= 3) {
        setStreakBrokenAt(preStreakRef.current);
      }
      const lossMode = params.careerLevelId ? 'career' : isRankedMode ? 'ranked' : wagerCourt ? 'wager' : isOnlineMatch ? 'online' : !isVsAi ? 'local' : 'ai';
      const lossOpponent = isOnlineMatch ? (params.onlineOpponentName || 'Online') : isVsAi ? `${difficulty} Bot` : localNames.player2;
      addMatch({ result: 'loss', opponent: lossOpponent, difficulty, moves: moveCount, coinsEarned: 0, mode: lossMode });
      updateChallenge('play_5', 1);
      updateChallenge('play_10', 1);
      // Break win streak challenges on loss
      resetChallenge('win_streak_2');
      resetChallenge('win_streak_3');
      // Season XP on loss — detect tier-up
      const preTierLoss = useSeasonStore.getState().currentTier;
      addSeasonXp(10);
      const postTierLoss = useSeasonStore.getState().currentTier;
      if (postTierLoss > preTierLoss) {
        setSeasonTierUp(postTierLoss);
        playSound('level_up');
        haptics.levelUp();
      }
      // Wager lost — coins already deducted; ranked ELO down
      if (wagerCourt || isRankedMode) {
        recordRanked(false);
      }
      // Check achievements — game count / pets / cosmetics can unlock on any game
      const lossHistory = useMatchHistoryStore.getState();
      const lossShop = useShopStore.getState();
      const lossCareer = useCareerStore.getState();
      const lossNewAchs = checkAchievements({
        totalWins: lossHistory.matches.filter(m => m.result === 'win').length,
        currentStreak: useGameStore.getState().winStreak,
        bestStreak: useGameStore.getState().bestStreak,
        totalGames: lossHistory.matches.length,
        level: lossShop.level,
        careerStars: lossCareer.getTotalStars(),
        lastGameMoves: 0, // speed achievements only count on wins
        hardWins: lossHistory.matches.filter(m => m.result === 'win' && m.difficulty === 'hard').length,
        ownedCosmetics: lossShop.owned.boards.length + lossShop.owned.pieces.length + lossShop.owned.dropEffects.length + lossShop.ownedEmotes.length,
        ownedPets: lossShop.ownedPets,
      });
      if (lossNewAchs.length > 0) {
        const allAchs = useAchievementStore.getState().achievements;
        setAchievementQueue(q => [...q, ...lossNewAchs.map(name => ({
          name, icon: allAchs.find(a => a.name === name)?.icon ?? '🏆',
        }))]);
      }
      addXp(5); // Participation XP on loss
      haptics.error();
      playSound('lose');
      // Comeback mechanic — grant pity coins on losing streak to keep players engaged
      const recentMatches = useMatchHistoryStore.getState().matches.slice(0, 5);
      const consecutiveLosses = recentMatches.findIndex(m => m.result !== 'loss');
      const lossStreak = consecutiveLosses === -1 ? recentMatches.length : consecutiveLosses;
      if (lossStreak >= 3) {
        const pity = lossStreak >= 5 ? 50 : lossStreak >= 4 ? 30 : 15;
        addCoins(pity);
        setComebackCoins(pity);
      } else {
        setComebackCoins(null);
      }
    }
    if (status === 'draw' && !hasAwardedRef.current) {
      hasAwardedRef.current = true;
      const drawMultiplier = getStreakMultiplier();
      const drawReward = Math.round(10 * drawMultiplier);
      addCoins(drawReward);
      const drawMode = params.careerLevelId ? 'career' : isRankedMode ? 'ranked' : wagerCourt ? 'wager' : isOnlineMatch ? 'online' : !isVsAi ? 'local' : 'ai';
      const drawOpponent = isOnlineMatch ? (params.onlineOpponentName || 'Online') : isVsAi ? `${difficulty} Bot` : localNames.player2;
      addMatch({ result: 'draw', opponent: drawOpponent, difficulty, moves: moveCount, coinsEarned: drawReward, mode: drawMode });
      updateChallenge('play_5', 1);
      updateChallenge('play_10', 1);
      resetChallenge('win_streak_2'); // Draw also breaks the streak
      resetChallenge('win_streak_3');
      // Season XP on draw — detect tier-up
      const preTierDraw = useSeasonStore.getState().currentTier;
      addSeasonXp(15);
      const postTierDraw = useSeasonStore.getState().currentTier;
      if (postTierDraw > preTierDraw) {
        setSeasonTierUp(postTierDraw);
        playSound('level_up');
        haptics.levelUp();
      }
      // Check achievements — game count / pets / cosmetics can unlock on any game
      const drawHistory = useMatchHistoryStore.getState();
      const drawShop = useShopStore.getState();
      const drawCareer = useCareerStore.getState();
      const drawNewAchs = checkAchievements({
        totalWins: drawHistory.matches.filter(m => m.result === 'win').length,
        currentStreak: useGameStore.getState().winStreak,
        bestStreak: useGameStore.getState().bestStreak,
        totalGames: drawHistory.matches.length,
        level: drawShop.level,
        careerStars: drawCareer.getTotalStars(),
        lastGameMoves: 0,
        hardWins: drawHistory.matches.filter(m => m.result === 'win' && m.difficulty === 'hard').length,
        ownedCosmetics: drawShop.owned.boards.length + drawShop.owned.pieces.length + drawShop.owned.dropEffects.length + drawShop.ownedEmotes.length,
        ownedPets: drawShop.ownedPets,
      });
      if (drawNewAchs.length > 0) {
        const allAchs = useAchievementStore.getState().achievements;
        setAchievementQueue(q => [...q, ...drawNewAchs.map(name => ({
          name, icon: allAchs.find(a => a.name === name)?.icon ?? '🏆',
        }))]);
      }
      addXp(10); // Participation XP on draw
      haptics.coinEarn();
      playSound('coin');
    }
    // Local multiplayer challenge
    if ((status === 'won' || status === 'draw') && hasAwardedRef.current && params.localPlayerNames) {
      updateChallenge('play_local', 1);
    }
    // Game count milestone celebration
    if ((status === 'won' || status === 'draw') && hasAwardedRef.current) {
      const totalGamesPlayed = useMatchHistoryStore.getState().matches.length;
      if (totalGamesPlayed === 10) setMilestoneCelebration('Double digits! \uD83C\uDF89');
      else if (totalGamesPlayed === 50) setMilestoneCelebration('50 games! Dedicated player!');
      else if (totalGamesPlayed === 100) setMilestoneCelebration('Century! \uD83D\uDCAF');
      else if (totalGamesPlayed === 500) setMilestoneCelebration('500 games! True fan!');
    }
    // Set game-over motivational quote
    if ((status === 'won' || status === 'draw') && hasAwardedRef.current) {
      const quoteResult: 'win' | 'loss' | 'draw' = status === 'won' ? (winner === 1 ? 'win' : 'loss') : 'draw';
      setGameOverQuote(getRandomGameOverQuote(quoteResult));
    }
    // Save replay on game end
    if ((status === 'won' || status === 'draw') && hasAwardedRef.current) {
      const cs = customSettings || { rows: 6, cols: 7, connectCount: 4 };
      const replayResult: 'win' | 'loss' | 'draw' = status === 'won' ? (winner === 1 ? 'win' : 'loss') : 'draw';
      saveReplay(replayResult, difficulty, p2Name, cs.rows, cs.cols, cs.connectCount);
    }
    if (status === 'playing') {
      hasAwardedRef.current = false;
      setMilestoneCelebration(null);
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

  const handleShareScore = async () => {
    const isWin = status === 'won' && winner === 1;
    const isLoss = status === 'won' && winner === 2;
    const resultLine = isWin ? 'VICTORY' : isLoss ? 'DEFEAT' : 'DRAW';
    const opponentLabel = isVsAi
      ? `${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} Bot`
      : isOnlineMatch ? (params.onlineOpponentName || 'Online') : 'Local';
    const resultEmoji = isWin ? '\u{1F3C6}' : isLoss ? '\u{1F61E}' : '\u{1F91D}';
    const speedTag = moveCount <= 7 ? ' | \u26A1 Lightning Win' : moveCount <= 12 ? ' | \u{1F525} Quick Win' : '';
    const coinsLine = isWin ? `\n\u{1FA99} +${totalCoinsEarned || Math.round(COIN_REWARDS[difficulty] * dailyStreakMultiplier)} coins earned` : '';
    const streak = useGameStore.getState().winStreak;
    const streakLine = streak > 1 ? `\n\u{1F525} ${streak} Win Streak` : '';
    const stats = useMatchHistoryStore.getState().getStats();
    const rateLine = stats.totalGames > 2 ? `\n\u{1F4CA} Win Rate: ${stats.winRate}%` : '';
    const shareMessage = `\u{1F3AE} Drop4 \u2014 Game Result\n${resultEmoji} ${resultLine} vs ${opponentLabel}\n\u23F1 ${moveCount} moves${speedTag}${coinsLine}${streakLine}${rateLine}\nPlay Drop4: drop4.game`;

    if (Platform.OS === 'web') {
      try {
        if (navigator?.clipboard) {
          await navigator.clipboard.writeText(shareMessage);
        }
      } catch {}
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } else {
      try {
        await Share.share({ message: shareMessage });
      } catch {}
    }
  };

  const handleRematch = () => {
    setSeriesGame(prev => prev < totalGames ? prev + 1 : 1);
    setShowConfetti(false);
    setWasCareerLevel(false);
    setFreeHintsRemaining(3);
    setDidLevelUp(false);
    setSeasonTierUp(null);
    setStreakReward(null);
    setCompletedChallengeName(null);
    setStreakBrokenAt(null);
    setDailyStreakMultiplier(1);
    setDoubleCoinsUsed(false);
    setIsFirstWinOfDay(false);
    setComebackCoins(null);
    newGame(difficulty, isVsAi);
  };

  const handleBack = () => {
    // Quit penalty for ranked / wager games
    if ((isRankedMode || wagerCourt) && status === 'playing') {
      Alert.alert(
        'Quit Ranked Match?',
        'Quitting a ranked match counts as a loss! You\'ll lose ELO.',
        [
          { text: 'Keep Playing', style: 'cancel' },
          {
            text: 'Quit & Forfeit',
            style: 'destructive',
            onPress: () => {
              recordRanked(false);
              addMatch({
                result: 'loss',
                opponent: isVsAi ? `${difficulty} Bot` : (params.onlineOpponentName || 'Ranked Player'),
                difficulty,
                moves: moveCount,
                coinsEarned: 0,
                mode: wagerCourt ? 'wager' : 'ranked',
              });
              navigation.goBack();
            },
          },
        ]
      );
      return;
    }

    // Default mid-match confirm for Quick Play / Career / Local Play.
    // Without this, tapping the X button or Quit button silently abandons
    // the match with zero feedback, which players (and App Store reviewers)
    // universally hate. If the game is already over, skip the confirm.
    if (status === 'playing' && moveCount > 0) {
      Alert.alert(
        'Quit Match?',
        'Your progress in this match will be lost.',
        [
          { text: 'Keep Playing', style: 'cancel' },
          {
            text: 'Quit',
            style: 'destructive',
            onPress: () => navigation.goBack(),
          },
        ],
      );
      return;
    }
    navigation.goBack();
  };

  /** Navigate all the way back to the Home tab (used by HOME / LEAVE buttons after game over) */
  const handleGoHome = () => {
    resetScores();
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
      ? (winner === myPlayerNum ? (celebrationText || 'You Win!') : `${p2Name} Wins!`)
      : (winner === 1 ? (p1Name === 'You' ? (celebrationText || 'You Win!') : `${p1Name} Wins!`) : `${p2Name} Wins!`))
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

  // Cleanup AI emote timer + personality timer on unmount
  useEffect(() => {
    return () => {
      if (aiEmoteTimerRef.current) clearTimeout(aiEmoteTimerRef.current);
      if (aiPersonalityTimerRef.current) clearTimeout(aiPersonalityTimerRef.current);
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
          accessibilityRole="button"
          accessibilityLabel="Exit game"
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
            avatar={<Character3DPortrait width={40} height={40} showFloor={false} />}
            level={level}
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
            <Text style={styles.boardThemeLabel}>{boardThemeName}</Text>
            {/* Connect count indicator for non-standard (Connect 3, 5, 6, etc.) */}
            {customSettings && customSettings.connectCount !== 4 && (
              <Text style={styles.connectCountLabel}>Connect {customSettings.connectCount}</Text>
            )}
            {/* Board size indicator for non-standard boards */}
            {customSettings && (customSettings.rows !== 6 || customSettings.cols !== 7) && (
              <Text style={styles.boardSizeLabel}>{customSettings.cols}x{customSettings.rows} Board</Text>
            )}
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
                ? <Character3DPortrait width={40} height={40} showFloor={false} customization={getNpcCustomization(params.opponentName || difficulty)} />
                : <Character3DPortrait width={40} height={40} showFloor={false} />
              }
              level={isVsAi ? (difficulty === 'easy' ? 5 : difficulty === 'medium' ? 16 : 30) : level}
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
            {aiPersonalityText && isVsAi && !isAiThinking && (
              <RNAnimated.View style={[styles.aiPersonalityBubble, { opacity: aiPersonalityFade }]}>
                <Text style={styles.aiPersonalityText}>{aiPersonalityText}</Text>
              </RNAnimated.View>
            )}
          </View>
        </View>

        {/* Move counter moved to bottom controls (duplicate removed) */}

        {/* First game encouragement */}
        {showFirstGameMsg && (
          <RNAnimated.View style={[styles.firstGameBanner, { opacity: firstGameFade }]} pointerEvents="none">
            <Text style={styles.firstGameText}>Your first game! Don't worry {'\u2014'} Easy Bot will go easy on you {'\uD83D\uDE0A'}</Text>
          </RNAnimated.View>
        )}

        {/* Score dots — only shown in series/best-of mode */}
        {isSeriesMode && (
          <View style={styles.scoreDots}>
            <View style={styles.dotsGroup}>
              {Array.from({ length: seriesWinsNeeded }).map((_, i) => (
                <View key={`p1-${i}`} style={[styles.dot,
                  i < scores.player1 && { backgroundColor: colors.pieceRed }
                ]} />
              ))}
            </View>
            <View style={styles.dotSpacer}>
              <View style={styles.dotLine} />
            </View>
            <View style={styles.dotsGroup}>
              {Array.from({ length: seriesWinsNeeded }).map((_, i) => (
                <View key={`p2-${i}`} style={[styles.dot,
                  i < scores.player2 && { backgroundColor: colors.pieceYellow }
                ]} />
              ))}
            </View>
          </View>
        )}

        {/* Hint indicator — pulsing arrow + "BEST MOVE" banner above the board */}
        {hintCol !== null && (
          <Animated.View entering={FadeIn.duration(200)} style={[styles.hintArrowRow, { width: BOARD_WIDTH }]}>
            <RNAnimated.View
              style={[
                styles.hintBestMoveBanner,
                { left: _getHintArrowOffset(hintCol) - 22, opacity: hintPulseAnim },
              ]}
            >
              <Text style={styles.hintBestMoveText}>BEST MOVE</Text>
            </RNAnimated.View>
            <RNAnimated.Text style={[
              styles.hintArrow,
              {
                left: _getHintArrowOffset(hintCol),
                opacity: hintPulseAnim,
                transform: [{ scale: hintPulseAnim.interpolate({ inputRange: [0.2, 1], outputRange: [0.85, 1.2] }) }],
              },
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

        {/* Last move indicator — removed, piece drop is self-evident */}

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
                    haptics.achievement?.() ?? haptics.tap();
                    playSound('achievement');
                    const bestCol = getAIMove(board, 'hard', customSettings.connectCount);
                    setHintCol(bestCol);
                    // Longer visual dwell so players can see the cue.
                    setTimeout(() => setHintCol(null), 4500);
                  }
                }}
                style={[styles.controlBtn, !canAffordHint && { opacity: 0.4 }]}
                disabled={!canAffordHint}
                accessibilityRole="button"
                accessibilityLabel={hintLabel}
                accessibilityState={{ disabled: !canAffordHint }}
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
            <Pressable
              onPress={() => {
                if (undoMove()) {
                  setUndoCount(c => c + 1);
                  haptics.tap();
                  playSound('swoosh');
                }
              }}
              style={styles.controlBtn}
              accessibilityRole="button"
              accessibilityLabel="Undo last move"
            >
              <Text style={styles.controlIcon}>↩️</Text>
              <Text style={styles.controlLabel}>Undo</Text>
            </Pressable>
          )}

          {/* Resign button */}
          <Pressable
            onPress={handleBack}
            style={styles.controlBtn}
            accessibilityRole="button"
            accessibilityLabel={isOnlineMatch ? 'Resign match' : 'Quit game'}
          >
            <Text style={styles.controlIcon}>🏳️</Text>
            <Text style={styles.resignLabel}>{isOnlineMatch ? 'Resign' : 'Quit'}</Text>
          </Pressable>
        </View>

        {/* Emote/Chat pills removed — use the emote wheel button (bottom-right) or MORE for full picker */}

        {/* Full-screen emote/chat picker modal */}
        <EmotePickerModal
          visible={emotePickerOpen}
          onClose={() => setEmotePickerOpen(false)}
          initialTab="emotes"
          onEmotePress={(id) => {
            // Show player's emote locally
            setMyEmote({ emoteId: id, key: Date.now() });
            // Local/AI game: trigger AI reaction
            triggerAiEmoteReaction(id);
          }}
          onChatSend={(msg: any) => {
            setMyChatBubble({ text: msg.text, key: Date.now() });
            if (isVsAi) {
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
          accessibilityRole="button"
          accessibilityLabel="Open emote wheel"
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
            triggerAiEmoteReaction(emoteId);
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

        {/* Matchmaking overlay removed with multiplayer kill for v1 */}

        {/* Confetti on victory */}
        <ConfettiOverlay visible={showConfetti} onDone={() => setShowConfetti(false)} />

        {/* Coin burst on win */}
        <CoinBurst
          visible={showCoinBurst}
          amount={totalCoinsEarned || COIN_REWARDS[difficulty]}
          onDone={() => setShowCoinBurst(false)}
        />

        {/* Achievement toast — shown when a new achievement is unlocked */}
        {currentAchievementToast && (
          <AchievementToast
            name={currentAchievementToast.name}
            icon={currentAchievementToast.icon}
            visible={!!currentAchievementToast}
            onDone={() => setCurrentAchievementToast(null)}
          />
        )}

        {/* ========== GAME OVER OVERLAY — Basketball Stars style ========== */}
        <Modal visible={status === 'won' || status === 'draw'} transparent animationType="none">
          <Animated.View entering={FadeIn.duration(300)} style={styles.overlay}>
            {/* Win celebration variety banner */}
            {celebrationText && status === 'won' && winner === 1 && !showFirstWin && (
              <Animated.View entering={FadeIn.duration(400)} style={styles.celebrationBanner} pointerEvents="none">
                <Text style={styles.celebrationText}>{celebrationText}</Text>
              </Animated.View>
            )}
            {/* First Win golden banner */}
            {showFirstWin && (
              <RNAnimated.View style={[styles.firstWinBanner, { opacity: firstWinOpacity }]} pointerEvents="none">
                <Text style={styles.firstWinText}>FIRST WIN!</Text>
              </RNAnimated.View>
            )}
            <SlideReveal from="bottom" delay={100}>
            <Animated.View style={styles.goCard}>
             <ScrollView bounces={false} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 8 }}>

              {/* Top: Mode label */}
              <View style={styles.goModeRow}>
                <Text style={styles.goModeText} accessibilityRole="header">
                  {isRankedMode ? 'RANKED' : wagerCourt ? wagerCourt.name?.toUpperCase() : isSeriesMode ? `BEST OF ${totalGames} — GAME ${seriesGame}` : isVsAi ? `VS ${diffLabel.toUpperCase()} BOT` : 'LOCAL MATCH'}
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
                    <Character3DPortrait
                      width={140} height={180} showFloor={false}
                      animationId={status === 'won' && winner === 1 ? 'emote_dab' : 'idle_base'}
                      animationLoop={status !== 'won' || winner !== 1}
                    />
                    {/* Level badge */}
                    <View style={styles.goLevelBadge}>
                      <Text style={styles.goLevelText}>{level}</Text>
                    </View>
                  </View>
                  <Text style={styles.goCharName} numberOfLines={1}>{p1Name}</Text>
                  {equippedPet && (
                    <PetDisplay petId={equippedPet} size={40} style={{ marginTop: 2 }} />
                  )}
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
                    <Character3DPortrait
                      width={140} height={180} showFloor={false}
                      customization={isVsAi ? getNpcCustomization(params.opponentName || difficulty) : undefined}
                      animationId={
                        status === 'won' && winner === 2
                          ? 'emote_dab'
                          : status === 'won' && winner === 1
                          ? 'emote_tantrum'
                          : 'idle_base'
                      }
                      animationLoop={status !== 'won'}
                    />
                    <View style={[styles.goLevelBadge, { backgroundColor: colors.surfaceLight }]}>
                      <Text style={styles.goLevelText}>
                        {isVsAi ? (difficulty === 'easy' ? 5 : difficulty === 'medium' ? 16 : 30) : level}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.goCharName} numberOfLines={1}>{p2Name}</Text>
                  {isVsAi && (
                    <Text style={styles.goDiffStars}>
                      {difficulty === 'easy' ? '⭐' : difficulty === 'medium' ? '⭐⭐' : '⭐⭐⭐'}
                    </Text>
                  )}
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

                {/* Streak summary — single line: current + best */}
                <View style={styles.goStreakRow}>
                  <Text style={styles.goStreakLabel}>STREAK</Text>
                  <Text style={[styles.goStreakValue, winStreak > 0 && { color: colors.orange }]}>
                    {winStreak > 0 ? `🔥 ${winStreak}` : '0'}
                  </Text>
                  <Text style={styles.goStreakDivider}>·</Text>
                  <Text style={styles.goStreakLabel}>BEST</Text>
                  <Text style={styles.goStreakValue}>{bestStreak}</Text>
                </View>
              </View>

              {/* New Personal Best indicator */}
              {status === 'won' && winner === 1 && personalBest !== null && moveCount < personalBest && (
                <View style={styles.goPersonalBest}>
                  <Text style={styles.goPersonalBestText} accessibilityRole="header">NEW PERSONAL BEST!</Text>
                  <Text style={styles.goPersonalBestSub}>{moveCount} moves (prev: {personalBest})</Text>
                </View>
              )}

              {/* Game Speed Badge */}
              {(() => {
                const speed = moveCount <= 8 ? { label: 'BLITZ', color: '#e74c3c', emoji: '\u26A1' }
                  : moveCount <= 14 ? { label: 'FAST', color: colors.orange, emoji: '\uD83D\uDE80' }
                  : moveCount <= 24 ? { label: 'STANDARD', color: colors.teal, emoji: '\u23F1\uFE0F' }
                  : { label: 'MARATHON', color: '#9b59b6', emoji: '\uD83C\uDFC3' };
                return (
                  <View style={[styles.goSpeedBadge, { borderColor: `${speed.color}30` }]}>
                    <Text style={styles.goSpeedEmoji}>{speed.emoji}</Text>
                    <Text style={[styles.goSpeedLabel, { color: speed.color }]}>{speed.label}</Text>
                    <Text style={styles.goSpeedMoves}>{moveCount} moves</Text>
                  </View>
                );
              })()}

              {/* ---- Replay Highlight: Winning Move ---- */}
              {status === 'won' && (() => {
                const replayMoves = useReplayStore.getState().currentMoves;
                const lastMove = replayMoves.length > 0 ? replayMoves[replayMoves.length - 1] : null;
                if (!lastMove) return null;
                const winnerIsPlayer = winner === 1;
                const moveLabel = winnerIsPlayer ? 'Your winning move' : `${p2Name} won with`;
                const moveIcon = winnerIsPlayer ? '\uD83C\uDFAF' : '\uD83D\uDCA1';
                return (
                  <View style={styles.goReplayHighlight}>
                    <Text style={styles.goReplayIcon}>{moveIcon}</Text>
                    <View style={styles.goReplayTextWrap}>
                      <Text style={[styles.goReplayLabel, !winnerIsPlayer && { color: colors.textSecondary }]}>{moveLabel}</Text>
                      <Text style={[styles.goReplayValue, !winnerIsPlayer && { color: colors.textSecondary }]}>
                        Column {lastMove.col + 1}, Move {Math.ceil((lastMove.moveNumber + 1) / 2)}
                      </Text>
                    </View>
                  </View>
                );
              })()}

              {/* First Win of the Day banner */}
              {isFirstWinOfDay && status === 'won' && winner === 1 && (
                <View style={styles.goFirstWinDay}>
                  <Text style={styles.goFirstWinDayIcon}>{'\u2B50'}</Text>
                  <View style={styles.goFirstWinDayTextWrap}>
                    <Text style={styles.goFirstWinDayTitle} accessibilityRole="header">FIRST WIN OF THE DAY!</Text>
                    <Text style={styles.goFirstWinDaySub}>2x XP earned this game</Text>
                  </View>
                  <Text style={styles.goFirstWinDayIcon}>{'\u2B50'}</Text>
                </View>
              )}

              {/* ---- Rewards — clean consolidated view ---- */}
              <View style={styles.goRewardsBlock}>
                {/* Big total coins earned */}
                {status === 'won' && winner === 1 && totalCoinsEarned > 0 && (
                  <Shimmer color="rgba(255,215,0,0.25)" duration={2800}>
                    <View style={styles.goTotalCoins}>
                      <Text style={styles.goTotalCoinsIcon}>🪙</Text>
                      <Text style={styles.goTotalCoinsAmount}>+{totalCoinsEarned}</Text>
                    </View>
                  </Shimmer>
                )}
                {status === 'draw' && (
                  <Shimmer color="rgba(255,215,0,0.18)" duration={3200}>
                    <View style={styles.goTotalCoins}>
                      <Text style={styles.goTotalCoinsIcon}>🪙</Text>
                      <Text style={styles.goTotalCoinsAmount}>+{Math.round(10 * getStreakMultiplier())}</Text>
                    </View>
                  </Shimmer>
                )}
                {/* Notable events — max 3, only the most exciting */}
                {didLevelUp && (
                  <View style={[styles.goEventRow, { borderColor: 'rgba(155,89,182,0.3)' }]}>
                    <Text style={styles.goEventIcon}>🎉</Text>
                    <Text style={[styles.goEventText, { color: '#b06cc7' }]}>Level Up! Now Lv {level}</Text>
                  </View>
                )}
                {streakReward && (
                  <View style={[styles.goEventRow, { borderColor: 'rgba(255,140,0,0.3)' }]}>
                    <Text style={styles.goEventIcon}>🔥</Text>
                    <Text style={[styles.goEventText, { color: colors.orange }]}>{streakReward.milestone} Win Streak! +{streakReward.coins} bonus</Text>
                  </View>
                )}
                {completedChallengeName && (
                  <View style={[styles.goEventRow, { borderColor: 'rgba(26,188,156,0.3)' }]}>
                    <Text style={styles.goEventIcon}>🎯</Text>
                    <Text style={[styles.goEventText, { color: colors.teal }]}>Challenge: {completedChallengeName}</Text>
                  </View>
                )}
                {wasCareerLevel && status === 'won' && winner === 1 && (() => {
                  const earnedStars = moveCount < 15 ? 3 : moveCount < 25 ? 2 : 1;
                  const verdict = earnedStars === 3 ? 'PERFECT CLEAR' : earnedStars === 2 ? 'GREAT CLEAR' : 'LEVEL CLEARED';
                  return (
                    <View style={[styles.goEventRow, styles.goStarBlock, { borderColor: 'rgba(241,196,15,0.5)' }]}>
                      <AnimatedStarRating earned={earnedStars} size={32} delay={300} />
                      <Text style={[styles.goEventText, styles.goStarVerdict, { color: '#ffd93d' }]}>
                        {verdict}
                      </Text>
                    </View>
                  );
                })()}
                {status === 'won' && winner === 2 && streakBrokenAt !== null && (
                  <View style={[styles.goEventRow, { borderColor: 'rgba(231,76,60,0.3)' }]}>
                    <Text style={styles.goEventIcon}>💔</Text>
                    <Text style={[styles.goEventText, { color: colors.pieceRed }]}>{streakBrokenAt} win streak broken</Text>
                  </View>
                )}
                {/* Game count milestone celebration */}
                {milestoneCelebration && (
                  <View style={[styles.goRewardChip, { borderColor: 'rgba(241,196,15,0.5)', backgroundColor: 'rgba(241,196,15,0.1)' }]}>
                    <Text style={styles.goRewardIcon}>{'\uD83C\uDFC6'}</Text>
                    <Text style={[styles.goRewardAmount, { color: '#f1c40f', fontSize: 10 }]}>{milestoneCelebration}</Text>
                  </View>
                )}
                {/* Loot box progress — show how many wins until next box */}
                {status === 'won' && winner === 1 && (() => {
                  const winsUntilBox = 3 - (totalWins % 3);
                  if (winsUntilBox === 3) {
                    return (
                      <View style={[styles.goRewardChip, { borderColor: 'rgba(155,89,182,0.4)', backgroundColor: 'rgba(155,89,182,0.1)' }]}>
                        <Text style={styles.goRewardIcon}>{'\uD83D\uDCE6'}</Text>
                        <Text style={[styles.goRewardAmount, { color: colors.purple, fontSize: 10 }]}>LOOT BOX{'\n'}EARNED!</Text>
                      </View>
                    );
                  }
                  return (
                    <View style={[styles.goRewardChip, { borderColor: 'rgba(155,89,182,0.2)', backgroundColor: 'rgba(155,89,182,0.04)' }]}>
                      <Text style={styles.goRewardIcon}>{'\uD83D\uDCE6'}</Text>
                      <Text style={[styles.goRewardAmount, { color: 'rgba(155,89,182,0.7)', fontSize: 10 }]}>Win {winsUntilBox}{'\n'}more!</Text>
                      <Text style={[styles.goRewardDesc, { color: colors.textMuted }]}>Loot Box</Text>
                    </View>
                  );
                })()}
              </View>

              {/* Wager display */}
              {wagerCourt && wagerCourt.winnerGets > 0 && status === 'won' && winner === 1 && (
                <Shimmer color="rgba(255,215,0,0.3)" duration={2500}>
                  <View style={styles.goWagerRow}>
                    <Text style={styles.goWagerIcon}>🪙🪙🪙</Text>
                    <Text style={styles.goWagerText}>+{wagerCourt.winnerGets} Wager Won!</Text>
                  </View>
                </Shimmer>
              )}

              {/* [MP-KILL] EloChangeAnimation removed — ranked/wager killed for v1 */}

              {/* Double Coins — UI-only ad concept */}
              {status === 'won' && winner === 1 && !doubleCoinsUsed && (
                <PressScale scaleTo={0.96}>
                  <Pressable
                    style={styles.doubleCoinsBtn}
                    onPress={() => {
                      const reward = COIN_REWARDS[difficulty];
                      const streakBonus = Math.min(useGameStore.getState().winStreak * 10, 50);
                      const total = Math.round((reward + streakBonus) * dailyStreakMultiplier);
                      addCoins(total);
                      setDoubleCoinsUsed(true);
                      haptics.win();
                      playSound('coin');
                      setShowCoinBurst(true);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Watch ad to double coin reward"
                  >
                    <View style={styles.doubleCoinsAdBadge}>
                      <Text style={styles.doubleCoinsAdText}>AD</Text>
                    </View>
                    <Text style={styles.doubleCoinsBtnIcon}>🪙🪙</Text>
                    <View style={styles.doubleCoinsBtnTextWrap}>
                      <Text style={styles.doubleCoinsBtnTitle}>DOUBLE COINS</Text>
                      <Text style={styles.doubleCoinsBtnSub}>Watch ad to double your reward!</Text>
                    </View>
                  </Pressable>
                </PressScale>
              )}
              {doubleCoinsUsed && status === 'won' && winner === 1 && (
                <View style={[styles.doubleCoinsBtn, { opacity: 0.5, borderColor: 'rgba(46,204,113,0.4)' }]}>
                  <Text style={styles.doubleCoinsBtnIcon}>✅</Text>
                  <Text style={[styles.doubleCoinsBtnTitle, { color: colors.green }]}>COINS DOUBLED!</Text>
                </View>
              )}

              {/* Comeback coins for losing streaks */}
              {comebackCoins !== null && status === 'won' ? null : comebackCoins !== null && (
                <View style={styles.goComebackBanner}>
                  <Text style={styles.goComebackIcon}>💪</Text>
                  <View style={styles.goComebackTextWrap}>
                    <Text style={styles.goComebackTitle} accessibilityRole="header">COMEBACK BONUS</Text>
                    <Text style={styles.goComebackSub}>+{comebackCoins} coins — don't give up!</Text>
                  </View>
                </View>
              )}

              {/* Motivational quote */}
              <View style={styles.goChatBubble}>
                <Text style={styles.goChatText}>
                  {gameOverQuote || 'Good game!'}
                </Text>
              </View>

              {/* ---- Action Buttons ---- */}
              <View style={styles.goButtons}>
                {/* [MP-KILL] Online rematch UI removed — 57 lines of dead buttons */}
                {isSeriesMode && seriesOver ? (
                  <>
                    {/* Series complete banner */}
                    <View style={styles.seriesCompleteRow}>
                      <Text style={styles.seriesCompleteTitle} accessibilityRole="header">SERIES COMPLETE</Text>
                      <Text style={[
                        styles.seriesCompleteResult,
                        { color: scores.player1 >= seriesWinsNeeded ? colors.coinGold : scores.player2 >= seriesWinsNeeded ? '#e74c3c' : colors.teal },
                      ]}>
                        {scores.player1 >= seriesWinsNeeded ? '🏆 YOU WIN THE SERIES!' : scores.player2 >= seriesWinsNeeded ? '💀 YOU LOSE THE SERIES' : '🤝 SERIES TIED'}
                      </Text>
                      <Text style={styles.seriesScoreDisplay}>{scores.player1} — {scores.player2}</Text>
                    </View>
                    <GlossyButton
                      label="NEW GAME"
                      icon="🎮"
                      variant="green"
                      onPress={() => navigation.navigate('Play')}
                    />
                    <GlossyButton
                      label="HOME"
                      icon="🏠"
                      variant="navy"
                      onPress={handleGoHome}
                      style={{ marginTop: 8 }}
                    />
                  </>
                ) : (
                  <>
                    <GlossyButton
                      label={isSeriesMode ? `NEXT GAME (${seriesGame + 1}/${totalGames})` : 'REMATCH'}
                      icon="🔄"
                      variant="orange"
                      onPress={handleRematch}
                    />
                    {/* Quick difficulty switch for AI matches — hide in series mode */}
                    {isVsAi && !wasCareerLevel && !isSeriesMode && (
                      <View style={styles.goDiffSwitchRow}>
                        {(['easy', 'medium', 'hard'] as const).map((d) => {
                          const isActive = d === difficulty;
                          const diffColor = d === 'easy' ? colors.green : d === 'medium' ? colors.orange : (colors.pieceRed || '#e74c3c');
                          return (
                            <PressScale key={d} scaleTo={0.92}>
                              <Pressable
                                onPress={() => {
                                  if (!isActive) {
                                    haptics.tap();
                                    // Reset state and start new game with the selected difficulty
                                    setSeriesGame(prev => prev < totalGames ? prev + 1 : 1);
                                    setShowConfetti(false);
                                    setWasCareerLevel(false);
                                    setFreeHintsRemaining(3);
                                    setDidLevelUp(false);
                                    setSeasonTierUp(null);
                                    setStreakReward(null);
                                    setCompletedChallengeName(null);
                                    setStreakBrokenAt(null);
                                    setDailyStreakMultiplier(1);
                                    setDoubleCoinsUsed(false);
                                    setIsFirstWinOfDay(false);
                                    newGame(d, isVsAi);
                                  }
                                }}
                                style={[
                                  styles.goDiffBtn,
                                  isActive && { borderColor: `${diffColor}60`, backgroundColor: `${diffColor}18` },
                                ]}
                                accessibilityRole="button"
                                accessibilityLabel={`Switch to ${d} difficulty`}
                                accessibilityState={{ selected: isActive }}
                              >
                                <Text style={[
                                  styles.goDiffBtnText,
                                  { color: isActive ? diffColor : 'rgba(255,255,255,0.4)' },
                                  isActive && { fontWeight: '800' as any },
                                ]}>
                                  {d.toUpperCase()}
                                </Text>
                              </Pressable>
                            </PressScale>
                          );
                        })}
                      </View>
                    )}
                    <GlossyButton
                      label="NEW GAME"
                      icon="🎮"
                      variant="green"
                      onPress={() => navigation.navigate('Play')}
                      style={{ marginTop: 8 }}
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
                {/* Share Score */}
                <PressScale scaleTo={0.95}>
                  <Pressable
                    style={styles.shareButton}
                    onPress={handleShareScore}
                    accessibilityRole="button"
                    accessibilityLabel={shareCopied ? 'Score copied to clipboard' : 'Share score'}
                  >
                    <Text style={styles.shareButtonText}>
                      {shareCopied ? 'Copied!' : '\u{1F4E4} Share'}
                    </Text>
                  </Pressable>
                </PressScale>

                {/* Quick Actions */}
                <View style={styles.quickActionsRow}>
                  <PressScale scaleTo={0.93}>
                    <Pressable
                      style={styles.quickActionLink}
                      onPress={() => navigation.navigate('Stats' as any)}
                      accessibilityRole="link"
                      accessibilityLabel="View stats"
                    >
                      <Text style={styles.quickActionText}>View Stats</Text>
                    </Pressable>
                  </PressScale>
                  <Text style={styles.quickActionDot}>·</Text>
                  <PressScale scaleTo={0.93}>
                    <Pressable
                      style={styles.quickActionLink}
                      onPress={() => navigation.navigate('MainTabs', { screen: 'Shop' } as any)}
                      accessibilityRole="link"
                      accessibilityLabel="Open shop"
                    >
                      <Text style={styles.quickActionText}>Shop</Text>
                    </Pressable>
                  </PressScale>
                </View>
              </View>
             </ScrollView>
            </Animated.View>
            </SlideReveal>
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
  firstGameBanner: {
    alignSelf: 'center',
    backgroundColor: 'rgba(46,204,113,0.12)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: 'rgba(46,204,113,0.3)',
  },
  firstGameText: {
    fontFamily: fonts.body,
    fontWeight: weight.medium as any,
    fontSize: 12,
    color: '#2ecc71',
    textAlign: 'center' as const,
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
  boardThemeLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.regular,
    fontSize: 8,
    color: colors.textMuted,
    marginTop: 1,
  },
  connectCountLabel: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 11,
    color: colors.orange,
    marginTop: 2,
    letterSpacing: 1,
  },
  boardSizeLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 9,
    color: colors.orange,
    marginTop: 1,
    letterSpacing: 0.5,
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
  aiPersonalityBubble: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 4,
    maxWidth: 130,
    alignSelf: 'flex-end',
  },
  aiPersonalityText: {
    fontFamily: fonts.body,
    fontWeight: weight.medium,
    fontSize: 10,
    color: colors.pieceYellow,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  hintArrowRow: {
    alignSelf: 'center',
    height: 44,
    marginBottom: 2,
    position: 'relative',
  },
  hintArrow: {
    position: 'absolute',
    top: 22,
    fontSize: 26,
    color: colors.coinGold,
    textShadowColor: 'rgba(255,215,0,0.9)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  hintBestMoveBanner: {
    position: 'absolute',
    top: 0,
    width: 64,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: colors.coinGold,
    borderRadius: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ffffff',
    shadowColor: colors.coinGold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
  },
  hintBestMoveText: {
    fontFamily: fonts.body,
    fontWeight: weight.black,
    fontSize: 8,
    color: '#1a1200',
    letterSpacing: 0.8,
  },
  moveCounter: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  moveText: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 11,
    color: 'rgba(168,178,212,0.6)',
    letterSpacing: 1,
    textTransform: 'uppercase',
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
  celebrationBanner: {
    position: 'absolute',
    top: '8%',
    alignSelf: 'center',
    backgroundColor: 'rgba(46,204,113,0.15)',
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderWidth: 2,
    borderColor: 'rgba(46,204,113,0.5)',
    zIndex: 200,
    shadowColor: 'rgba(46,204,113,0.8)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 30,
  },
  celebrationText: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 24,
    color: '#2ecc71',
    letterSpacing: 3,
    textShadowColor: 'rgba(46,204,113,0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
    textAlign: 'center',
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
  // Double Coins button
  doubleCoinsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: 'rgba(241, 196, 15, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(241, 196, 15, 0.35)',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginVertical: 6,
    gap: 8,
  },
  doubleCoinsAdBadge: {
    position: 'absolute',
    top: -6,
    right: -4,
    backgroundColor: '#e74c3c',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
    zIndex: 10,
  },
  doubleCoinsAdText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 8,
    color: '#ffffff',
    letterSpacing: 1,
  },
  doubleCoinsBtnIcon: {
    fontSize: 20,
  },
  doubleCoinsBtnTextWrap: {
    alignItems: 'flex-start',
  },
  doubleCoinsBtnTitle: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 13,
    color: '#f1c40f',
    letterSpacing: 1,
  },
  doubleCoinsBtnSub: {
    fontFamily: fonts.body,
    fontWeight: weight.medium,
    fontSize: 9,
    color: 'rgba(241, 196, 15, 0.6)',
  },
  // Chat bubble
  // Replay Highlight
  goReplayHighlight: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: 4,
    marginBottom: 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  goReplayIcon: {
    fontSize: 18,
  },
  goReplayTextWrap: {
    alignItems: 'flex-start',
  },
  goReplayLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 10,
    color: colors.green,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  goReplayValue: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 14,
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  // First Win of the Day
  goFirstWinDay: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 8,
    backgroundColor: 'rgba(241,196,15,0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 4,
    marginBottom: 2,
    borderWidth: 1,
    borderColor: 'rgba(241,196,15,0.35)',
  },
  goFirstWinDayIcon: {
    fontSize: 16,
  },
  goFirstWinDayTextWrap: {
    alignItems: 'center',
  },
  goFirstWinDayTitle: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 13,
    color: '#f1c40f',
    letterSpacing: 1.5,
  },
  goFirstWinDaySub: {
    fontFamily: fonts.body,
    fontWeight: weight.medium,
    fontSize: 10,
    color: 'rgba(241,196,15,0.7)',
    marginTop: 1,
  },
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
  shareButton: {
    alignSelf: 'center',
    marginTop: 10,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  shareButtonText: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 13,
    color: colors.textMuted,
  },
  quickActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
    marginBottom: 4,
  },
  quickActionLink: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  quickActionText: {
    fontFamily: fonts.body,
    fontWeight: weight.medium as any,
    fontSize: 12,
    color: 'rgba(255,255,255,0.35)',
  },
  quickActionDot: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: 'rgba(255,255,255,0.2)',
  },
  goComebackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginHorizontal: 16,
    marginBottom: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(46,204,113,0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(46,204,113,0.3)',
  },
  goComebackIcon: {
    fontSize: 20,
  },
  goComebackTextWrap: {
    flex: 1,
  },
  goComebackTitle: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 12,
    color: colors.green,
    letterSpacing: 1.5,
  },
  goComebackSub: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 11,
    color: 'rgba(46,204,113,0.8)',
    marginTop: 1,
  },
  goDiffStars: {
    fontSize: 10,
    marginTop: 2,
    letterSpacing: -1,
  },
  goTotalCoins: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  goTotalCoinsIcon: {
    fontSize: 24,
  },
  goTotalCoinsAmount: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 28,
    color: colors.coinGold,
    letterSpacing: 1,
    textShadowColor: 'rgba(255,215,0,0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  goEventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginHorizontal: 16,
    marginBottom: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
  },
  goEventIcon: {
    fontSize: 16,
  },
  goEventText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 13,
    letterSpacing: 0.3,
  },
  // Prominent career-win star block (replaces the plain text star row)
  goStarBlock: {
    flexDirection: 'column',
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginHorizontal: 16,
    marginBottom: 4,
    backgroundColor: 'rgba(255,215,0,0.08)',
    gap: 4,
    alignItems: 'center',
  },
  goStarVerdict: {
    fontWeight: weight.black,
    fontSize: 14,
    letterSpacing: 1.5,
    textShadowColor: 'rgba(255,215,0,0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  goStreakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginTop: 4,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  goStreakLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 10,
    color: 'rgba(168,178,212,0.7)',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  goStreakValue: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 14,
    color: '#ffffff',
  },
  goStreakDivider: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: 'rgba(168,178,212,0.4)',
    marginHorizontal: 4,
  },
  goPersonalBest: {
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginBottom: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(241,196,15,0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(241,196,15,0.4)',
  },
  goPersonalBestText: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 13,
    color: '#f1c40f',
    letterSpacing: 2,
    textShadowColor: 'rgba(241,196,15,0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  goPersonalBestSub: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 10,
    color: 'rgba(241,196,15,0.7)',
    letterSpacing: 0.5,
    marginTop: 1,
  },
  goSpeedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginHorizontal: 16,
    marginBottom: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
  },
  goSpeedEmoji: {
    fontSize: 14,
  },
  goSpeedLabel: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 12,
    letterSpacing: 2,
  },
  goSpeedMoves: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 11,
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  goDiffSwitchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  goDiffBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  goDiffBtnText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 11,
    letterSpacing: 1,
  },
  // Series complete banner
  seriesCompleteRow: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  seriesCompleteTitle: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 10,
    color: colors.textMuted,
    letterSpacing: 3,
    marginBottom: 4,
  },
  seriesCompleteResult: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 16,
    letterSpacing: 1,
    marginBottom: 4,
  },
  seriesScoreDisplay: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 28,
    color: '#ffffff',
    letterSpacing: 4,
  },
});
