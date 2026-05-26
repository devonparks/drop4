import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Animated as RNAnimated, ScrollView, Platform, Share, Image } from 'react-native';
import { PreviewSafeModal } from '../components/ui/PreviewSafeModal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, {
  FadeIn,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { PressScale, SlideReveal, Shimmer, CountUp } from '../components/animations';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp, useRoute } from '@react-navigation/native';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { LevelIntroCard, deriveIntroFromParams } from '../components/ui/LevelIntroCard';
import { GlossyButton } from '../components/ui/GlossyButton';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { GameBoard, CELL_SIZE, BOARD_WIDTH } from '../components/board/GameBoard';
import { AnimatedStarRating } from '../components/effects/AnimatedStarRating';
import { PlayerHUD } from '../components/ui/PlayerHUD';
import { Character3DPortrait } from '../components/3d/Character3DPortrait';
import { getNpcCustomization } from '../data/npcCustomizations';
import { PetDisplay } from '../components/ui/PetDisplay';
import { PETS_ENABLED } from '../data/featureFlags';
import { ExpressionPanel, TabKey } from '../components/ui/ExpressionPanel';
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
import { useCharacterStore, countUniqueCamos } from '../stores/characterStore';
import { useAchievementStore } from '../stores/achievementStore';
import { useLootBoxStore } from '../stores/lootBoxStore';
import { useReplayStore } from '../stores/replayStore';
import { colors } from '../theme/colors';
import { fonts, weight } from '../theme/typography';
import { getRandomGameOverQuote } from '../data/tips';
import { ConfettiOverlay } from '../components/effects/ConfettiOverlay';
import { AchievementToast } from '../components/effects/AchievementToast';
import { FloatingEmote } from '../components/effects/FloatingEmote';
import { CoinBurst } from '../components/effects/CoinBurst';
import { ChatBubble } from '../components/effects/ChatBubble';
import { ALL_CAREER_LEVELS, type CareerReward } from '../data/careerLevels';
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

  // Quit-match confirm dialog state. Replaces a blocking
  // Alert.alert that silently no-opped on RN-Web (multi-button
  // configs don't render). Now uses the same styled ConfirmDialog
  // as every other confirm in Drop4.
  const [quitConfirmVisible, setQuitConfirmVisible] = useState(false);

  const board = useGameStore(s => s.board);
  const currentPlayer = useGameStore(s => s.currentPlayer);
  const status = useGameStore(s => s.status);
  const winner = useGameStore(s => s.winner);
  const moveCount = useGameStore(s => s.moveCount);
  const gravityDown = useGameStore(s => s.gravityDown);
  const flipGravity = useGameStore(s => s.flipGravity);
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
  const resetScores = useGameStore(s => s.resetScores);
  const customSettings = useGameStore(s => s.customSettings);
  const hasAwardedRef = useRef(false);
  const aiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [hintCol, setHintCol] = useState<number | null>(null);
  const [freeHintsRemaining, setFreeHintsRemaining] = useState(3);
  // Career overhaul phase 1 — Skip booster. 1 free per match. When the
  // player taps it during the AI's turn, we cancel the pending AI move
  // and flip currentPlayer back to the player. The booster is consumed
  // even if the AI hasn't started thinking yet — encourages tactical
  // use when the player can already see they're in a tight spot.
  // Future: gem-purchasable second use + drops from boxes.
  const [skipsRemaining, setSkipsRemaining] = useState(1);
  // Phase A.2 — Per-level intro card. Derives icon/label/rule/tint
  // from the route params (boss script, obstacle cells, moves limit,
  // etc.). Standard career levels return null and skip the intro
  // entirely so we don't fire it for every match. Quick Play / Local
  // Play also skip — the intro is a career-mode device. Once
  // dismissed (auto after ~1.8s or on tap), introDone flips and the
  // player can interact.
  const introProps = useMemo(() => {
    if (params.careerLevelId == null) return null;
    return deriveIntroFromParams(params);
  }, [params.careerLevelId, params.bossScript, params.obstacleCells, params.movesLimit, params.rewardMultiplier, params.levelType, params.timerSeconds, params.connectCount]);
  const [introDone, setIntroDone] = useState(() => introProps == null);
  // GameScreen is a Stack route — React Navigation keeps it mounted
  // when you navigate away and reuses the instance on re-entry. So
  // introDone, set true on the FIRST visit, would stay true forever
  // and the next career level would skip its intro. Reset it whenever
  // the level ID (or its variant params) changes — that's the signal
  // a new match has started, regardless of mount status.
  useEffect(() => {
    setIntroDone(introProps == null);
  }, [params.careerLevelId, params.bossScript, params.obstacleCells, params.movesLimit, params.rewardMultiplier, params.levelType, params.timerSeconds, params.connectCount, introProps]);

  // Phase 2 power pieces: 1 use per career match each, unlocked by
  // chapter bosses. Bomb (Brooklyn L12), Rainbow (Venice L24), Heavy
  // (Harlem L36). Each piece has its own "armed" mode flag — only one
  // can be armed at a time (toggling one auto-disarms the others).
  const [bombsRemaining, setBombsRemaining] = useState(1);
  const [rainbowsRemaining, setRainbowsRemaining] = useState(1);
  const [heaviesRemaining, setHeaviesRemaining] = useState(1);
  const [armedPowerPiece, setArmedPowerPiece] = useState<'bomb' | 'rainbow' | 'heavy' | null>(null);
  // Back-compat alias for the existing handler. Will deprecate once
  // the rest of the file no longer references bombMode by name.
  const bombMode = armedPowerPiece === 'bomb';
  const setBombMode = (next: boolean | ((prev: boolean) => boolean)) => {
    setArmedPowerPiece((prev) => {
      const wasOn = prev === 'bomb';
      const wantOn = typeof next === 'function' ? next(wasOn) : next;
      return wantOn ? 'bomb' : (prev === 'bomb' ? null : prev);
    });
  };
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
  const [completedChallengeName, setCompletedChallengeName] = useState<string | null>(null);
  const [streakBrokenAt, setStreakBrokenAt] = useState<number | null>(null);
  const [dailyStreakMultiplier, setDailyStreakMultiplier] = useState(1);
  const [totalCoinsEarned, setTotalCoinsEarned] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);
  const [unlockedCareerRewards, setUnlockedCareerRewards] = useState<CareerReward[]>([]);
  const preLevelRef = useRef(useShopStore.getState().level);
  const preStreakRef = useRef(useGameStore.getState().winStreak);

  // Last move indicator
  const lastMoveFade = useRef(new RNAnimated.Value(0)).current;

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

  // Show tutorial on first game — defer if welcome was just dismissed (< 10 min ago)
  useEffect(() => {
    if (!hasSeenGameTip('game_hint')) {
      const timer = setTimeout(async () => {
        const dismissedAtStr = await AsyncStorage.getItem('drop4_welcome_dismissed_at');
        if (dismissedAtStr && Date.now() - Number(dismissedAtStr) < 10 * 60 * 1000) return;
        setShowGameTutorial(true);
      }, 2000);
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

  // Expression panel — null = closed, tab key = open to that tab
  const [expressionPanelTab, setExpressionPanelTab] = useState<TabKey | null>(null);
  const [myPlayingEmote, setMyPlayingEmote] = useState<string | null>(null);
  const [myGameIdle, setMyGameIdle] = useState<string | null>(null);
  const emoteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  // Quick Chat bubbles (shown above the board when player/opponent sends a chat message)
  const [myChatBubble, setMyChatBubble] = useState<{ text: string; key: number } | null>(null);
  const [opponentChatBubble, setOpponentChatBubble] = useState<{ text: string; senderName: string; key: number } | null>(null);

  // Screen shake on piece drop
  const shakeAnim = useRef(new RNAnimated.Value(0)).current;

  // Turn indicator pulse
  const turnPulseAnim = useRef(new RNAnimated.Value(1)).current;
  const [wasCareerLevel, setWasCareerLevel] = useState(false);
  const turnTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Emote display — player and opponent/AI
  const [myEmote, setMyEmote] = useState<{ emoteId: string; key: number } | null>(null);
  const [opponentEmote, setOpponentEmote] = useState<{ emoteId: string; key: number } | null>(null);
  const aiEmoteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Quick-reaction bubbles (emoji bar, not emote wheel)
  const [myReaction, setMyReaction] = useState<{ emoji: string; key: number } | null>(null);
  const [botReaction, setBotReaction] = useState<{ emoji: string; key: number } | null>(null);
  const botReactionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Start recording replay when game begins + apply preset board + obstacles
  useEffect(() => {
    if (status === 'playing' && moveCount === 0) {
      startRecording();
      // Apply preset board from Board Editor if available
      if (params.presetBoard) {
        useGameStore.setState({ board: params.presetBoard as (0 | 1 | 2)[][] });
      }
      // Career overhaul phase 1 — obstacle levels stamp WALL cells (3)
      // onto the initial board so they read as immovable concrete
      // blocks. dropPiece's getLowestEmptyRow naturally skips them
      // (looks for === 0); checkWin only matches === player so walls
      // can't accidentally form a connect-N. GameBoard renders the
      // ObstacleBlock visual when cell === 3.
      if (params.obstacleCells && params.obstacleCells.length > 0) {
        const cur = useGameStore.getState().board;
        const next = cur.map((col) => [...col]);
        for (const { row, col } of params.obstacleCells) {
          if (col >= 0 && col < next.length && row >= 0 && row < (next[col]?.length ?? 0)) {
            next[col][row] = 3 as any;
          }
        }
        useGameStore.setState({ board: next });
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
            if (board[c].some(cell => cell === 0)) validCols.push(c);
          }
          if (validCols.length > 0) {
            const randomCol = validCols[Math.floor(Math.random() * validCols.length)];
            dropPiece(randomCol);
            haptics.error(); playSound('error');
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

  // Moves-limit check (Phase 2 career "moves_limit" levels). The player has
  // at most N of their own moves to connect — if we hit that cap while still
  // playing, the match ends as a loss. Counting ceil(moveCount / 2) gives
  // "player's turn number" because player always goes first on these levels.
  useEffect(() => {
    const limit = params.movesLimit;
    if (!limit || status !== 'playing') return;
    const playerMoves = Math.ceil(moveCount / 2);
    if (playerMoves > limit) {
      useGameStore.setState({ status: 'won', winner: 2 });
    }
  }, [moveCount, status, params.movesLimit]);

  // Phase A.3 — Sal's gravity flip. Boss-script 'sal' (Venice L24)
  // toggles gravityDown every 4 moves. Pieces continue stacking but
  // in the opposite direction; getLandingRow respects the flag and
  // GameBoard mirrors the playfield via scaleY(-1). Both player +
  // AI play through the same flipped state — no asymmetric advantage.
  // Effect fires on the move 4 → 5 transition (and 8 → 9, etc.) by
  // gating on moveCount > 0 && moveCount % 4 === 0; depending on
  // moveCount means we only run on actual move changes, not every
  // render.
  useEffect(() => {
    if (params.bossScript !== 'sal') return;
    if (status !== 'playing') return;
    if (moveCount === 0) return;
    if (moveCount % 4 !== 0) return;
    flipGravity();
    haptics.heavy?.() ?? haptics.tap();
    playSound('whoosh');
  }, [moveCount, status, params.bossScript, flipGravity]);

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
  useEffect(() => {
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
      let aiCol = getAIMove(currentBoard, difficulty, connectCount);
      // Phase 2 boss script — Tommy parity gate also applies to the
      // AI. If the engine's chosen column violates the rule, scan for
      // a parity-legal alternative. Fall back to the engine's pick if
      // no legal cols exist (rare — would mean an entire parity is
      // full, which Tommy fights would resolve as a draw anyway).
      if (params.bossScript === 'tommy') {
        const turn = currentMoveCount + 1;
        if (aiCol % 2 !== turn % 2) {
          for (let c = 0; c < currentBoard.length; c++) {
            if (c % 2 === turn % 2 && currentBoard[c][0] === 0) {
              aiCol = c;
              break;
            }
          }
        }
      }
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
  }, [currentPlayer, status, isVsAi]);

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
      // Snapshot coin balance so we can show the TRUE delta on the win
      // screen — achievement unlocks, career rewards, and streak milestones
      // all silently grant extra coins via their own code paths, so summing
      // our locals (reward + streakBonus × multiplier) undercounts the
      // actual balance growth. Delta = coins_after - coins_before.
      const coinsAtWin = useShopStore.getState().coins;
      const reward = COIN_REWARDS[difficulty];
      const streakBonus = Math.min(useGameStore.getState().winStreak * 10, 50);
      const dailyMultiplier = getStreakMultiplier();
      // Jeopardy levels pay N× coins — this is the carrot for the higher
      // difficulty / connect count. The multiplier only applies to the BASE
      // win reward; streak bonuses and achievement drops stay at 1×.
      const jeopardyMultiplier = params.rewardMultiplier && params.rewardMultiplier >= 2
        ? params.rewardMultiplier
        : 1;
      const totalReward = Math.round((reward + streakBonus) * dailyMultiplier * jeopardyMultiplier);
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
      setXpEarned(xpAmount);
      if (isFirstToday) setIsFirstWinOfDay(true);
      // Detect level-up
      const newLevel = useShopStore.getState().level;
      if (newLevel > preLevelRef.current) {
        setDidLevelUp(true);
        playSound('level_up');
        haptics.levelUp();
      }
      setDailyStreakMultiplier(dailyMultiplier);
      const matchMode = params.careerLevelId ? 'career' : !isVsAi ? 'local' : 'ai';
      const matchOpponent = isVsAi ? `${difficulty} Bot` : localNames.player2;
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
        playSound('level_up');
        haptics.levelUp();
      }
      // Career level completion
      const careerLevelId = params.careerLevelId;
      if (careerLevelId) {
        setWasCareerLevel(true);
        const lvlData = ALL_CAREER_LEVELS.find(l => l.id === careerLevelId);
        const th = lvlData?.starThresholds ?? { three: 14, two: 24 };
        const starRating = moveCount <= th.three ? 3 : moveCount <= th.two ? 2 : 1;
        completeCareerLevel(careerLevelId, starRating, moveCount);
        // Award career reward(s)
        const careerReward = params.careerLevelReward;
        const grantReward = (r: CareerReward) => {
          if (r.type === 'coins' && r.amount) addCoins(r.amount);
          if (r.type === 'board' && r.id) useShopStore.getState().purchaseItem('boards', r.id, 0);
          if (r.type === 'pieces' && r.id) useShopStore.getState().purchaseItem('pieces', r.id, 0);
          if (r.type === 'pet' && r.id) useShopStore.getState().purchasePet(r.id, 0);
          if (r.type === 'title') useShopStore.getState().unlockCustomTitle(r.name);
          if (r.type === 'emote' && r.id) useShopStore.getState().purchaseEmote(r.id, 0);
        };
        const levelData = ALL_CAREER_LEVELS.find(l => l.id === careerLevelId);
        if (levelData?.reward) grantReward(levelData.reward);
        if (levelData?.bonusReward) grantReward(levelData.bonusReward);
        // Track non-coin rewards so the rewards block can celebrate the unlock.
        // Coins are already shown via the dedicated count-up.
        const collected: CareerReward[] = [];
        if (levelData?.reward && levelData.reward.type !== 'coins') {
          collected.push(levelData.reward);
        }
        if (levelData?.bonusReward && levelData.bonusReward.type !== 'coins') {
          collected.push(levelData.bonusReward);
        }
        if (collected.length > 0) setUnlockedCareerRewards(collected);
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
        ownedCamos: countUniqueCamos(useCharacterStore.getState().ownedPartVariants),
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
      // Real total coins earned = balance delta since the win handler fired.
      // This captures: base reward, streak bonus, first-win-of-day 2x,
      // career-level reward, streak-milestone bonus, AND achievement rewards
      // (which grant silently inside checkAchievements). Previously we only
      // summed our locals, so the win screen could say "+35" while the top
      // bar grew by +85 (First Win achievement + first-day double).
      const coinsAfter = useShopStore.getState().coins;
      const coinTotal = Math.max(0, coinsAfter - coinsAtWin);
      setTotalCoinsEarned(coinTotal);
      setShowConfetti(true);
      setShowCoinBurst(true);
      // Win celebration variety
      const playerMoveCount = Math.ceil(moveCount / 2);
      const careerStars = (() => {
        if (!params.careerLevelId) return 0;
        const cl = ALL_CAREER_LEVELS.find(l => l.id === params.careerLevelId);
        const t = cl?.starThresholds ?? { three: 14, two: 24 };
        return moveCount <= t.three ? 3 : moveCount <= t.two ? 2 : 1;
      })();
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
      if (params.careerLevelId) setWasCareerLevel(true);
      if (preStreakRef.current >= 3) {
        setStreakBrokenAt(preStreakRef.current);
      }
      const lossMode = params.careerLevelId ? 'career' : !isVsAi ? 'local' : 'ai';
      const lossOpponent = isVsAi ? `${difficulty} Bot` : localNames.player2;
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
        playSound('level_up');
        haptics.levelUp();
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
        ownedCamos: countUniqueCamos(useCharacterStore.getState().ownedPartVariants),
        ownedPets: lossShop.ownedPets,
      });
      if (lossNewAchs.length > 0) {
        const allAchs = useAchievementStore.getState().achievements;
        setAchievementQueue(q => [...q, ...lossNewAchs.map(name => ({
          name, icon: allAchs.find(a => a.name === name)?.icon ?? '🏆',
        }))]);
      }
      addXp(5); // Participation XP on loss
      setXpEarned(5);
      haptics.error(); playSound('error');
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
      if (params.careerLevelId) setWasCareerLevel(true);
      const drawMultiplier = getStreakMultiplier();
      const drawReward = Math.round(10 * drawMultiplier);
      addCoins(drawReward);
      const drawMode = params.careerLevelId ? 'career' : !isVsAi ? 'local' : 'ai';
      const drawOpponent = isVsAi ? `${difficulty} Bot` : localNames.player2;
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
        ownedCamos: countUniqueCamos(useCharacterStore.getState().ownedPartVariants),
        ownedPets: drawShop.ownedPets,
      });
      if (drawNewAchs.length > 0) {
        const allAchs = useAchievementStore.getState().achievements;
        setAchievementQueue(q => [...q, ...drawNewAchs.map(name => ({
          name, icon: allAchs.find(a => a.name === name)?.icon ?? '🏆',
        }))]);
      }
      addXp(10); // Participation XP on draw
      setXpEarned(10);
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
      // First-game loss: override with an encouraging message
      if (status === 'won' && winner === 2 && useMatchHistoryStore.getState().matches.length === 1) {
        setGameOverQuote("Great first try! Tap Rematch to even the score \uD83D\uDCAA");
      }
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

  const showLastMove = useCallback((_col: number) => {
    lastMoveFade.setValue(1);
    RNAnimated.timing(lastMoveFade, { toValue: 0, duration: 1000, useNativeDriver: true }).start();
  }, []);

  const handleColumnPress = useCallback((col: number) => {
    if (status !== 'playing' || isAiThinking) return;
    // Block taps while the intro card is still on-screen — feels weird
    // for a piece to drop while the "TARGET: 6 MOVES" reveal is still
    // animating in. Players can tap the intro to skip it.
    if (!introDone) return;

    if (isVsAi && currentPlayer !== 1) return;
    // Phase 2 boss script — Tommy Blacktop's column-parity rule. Turn
    // number = moveCount + 1 (1-indexed). Odd turns require odd cols,
    // even turns require even cols. Both player AND AI obey (the AI
    // gate is in the AI useEffect below). Reject + haptic-error
    // invalid taps so the player learns the rule fast.
    if (params.bossScript === 'tommy') {
      const turn = moveCount + 1;
      if (col % 2 !== turn % 2) {
        haptics.error();
        playSound('error');
        return;
      }
    }
    // Phase 2 power pieces — when the player armed Bomb / Rainbow /
    // Heavy, the next column tap fires the matching gameStore action
    // instead of dropPiece. Each piece consumes its own counter and
    // disarms after success; the move flips to the AI inside the
    // gameStore action so we don't need to manage it here.
    if (armedPowerPiece === 'bomb' && bombsRemaining > 0) {
      const result = useGameStore.getState().dropBomb(col);
      if (result) {
        setBombsRemaining(prev => prev - 1);
        setArmedPowerPiece(null);
        showLastMove(col);
        haptics.heavy();
        playSound('whoosh');
        return;
      }
      setArmedPowerPiece(null);
    } else if (armedPowerPiece === 'rainbow' && rainbowsRemaining > 0) {
      const result = useGameStore.getState().dropRainbow(col);
      if (result) {
        setRainbowsRemaining(prev => prev - 1);
        setArmedPowerPiece(null);
        showLastMove(col);
        haptics.win?.() ?? haptics.tap();
        playSound('drop');
        return;
      }
      setArmedPowerPiece(null);
    } else if (armedPowerPiece === 'heavy' && heaviesRemaining > 0) {
      const result = useGameStore.getState().dropHeavy(col);
      if (result) {
        setHeaviesRemaining(prev => prev - 1);
        setArmedPowerPiece(null);
        showLastMove(col);
        haptics.heavy();
        playSound('drop');
        return;
      }
      setArmedPowerPiece(null);
    }
    // Center-first challenge: first move in center column
    if (moveCount === 0 && col === Math.floor((customSettings?.cols ?? 7) / 2)) {
      updateChallenge('center_first', 1);
    }
    recordMove(col, currentPlayer, moveCount);
    dropPiece(col);
    showLastMove(col);
    haptics.drop();
    playSound('drop');
    // Bot reacts to player moves after a short delay
    if (currentPlayer === 1 && isVsAi) {
      const board = useGameStore.getState().board;
      const connectN = useGameStore.getState().customSettings.connectCount;
      setTimeout(() => {
        // Simple threat detection: does player have connectN-1 in a row?
        let maxRun = 0;
        for (let c = 0; c < board.length; c++) {
          for (let r = 0; r < board[c].length; r++) {
            if (board[c][r] !== 1) continue;
            for (const [dc, dr] of [[1, 0], [0, 1], [1, 1], [1, -1]] as const) {
              let run = 1;
              let nc = c + dc;
              let nr = r + dr;
              while (nc >= 0 && nc < board.length && nr >= 0 && nr < board[0].length && board[nc][nr] === 1) {
                run++; nc += dc; nr += dr;
              }
              if (run > maxRun) maxRun = run;
            }
          }
        }
        if (maxRun >= connectN - 1 && Math.random() < 0.55) {
          const threats = ['\u{1F624}', '\u{1F630}', '\u{1FAE3}', '\u{1F928}'];
          setBotReaction({ emoji: threats[Math.floor(Math.random() * threats.length)], key: Date.now() });
        }
      }, 500);
    }
  }, [status, isAiThinking, introDone, currentPlayer, isVsAi, moveCount, params.bossScript, armedPowerPiece, bombsRemaining, rainbowsRemaining, heaviesRemaining]);

  const handleShareScore = async () => {
    playSound('click');
    const isWin = status === 'won' && winner === 1;
    const isLoss = status === 'won' && winner === 2;
    const resultLine = isWin ? 'VICTORY' : isLoss ? 'DEFEAT' : 'DRAW';
    const opponentLabel = isVsAi
      ? `${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} Bot`
      : 'Local';
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
    setUnlockedCareerRewards([]);
    setFreeHintsRemaining(3);
    setSkipsRemaining(1);
    setBombsRemaining(1);
    setRainbowsRemaining(1);
    setHeaviesRemaining(1);
    setArmedPowerPiece(null);
    setDidLevelUp(false);
    setStreakReward(null);
    setCompletedChallengeName(null);
    setStreakBrokenAt(null);
    setDailyStreakMultiplier(1);
    setDoubleCoinsUsed(false);
    setIsFirstWinOfDay(false);
    setComebackCoins(null);
    setXpEarned(0);
    setTotalCoinsEarned(0);
    const careerLevel = params.careerLevelId != null
      ? ALL_CAREER_LEVELS.find(l => l.id === params.careerLevelId)
      : undefined;
    const settings = careerLevel ? {
      rows: careerLevel.settings.rows,
      cols: careerLevel.settings.cols,
      connectCount: careerLevel.settings.connectCount,
      timerSeconds: careerLevel.settings.timerSeconds || 0,
      startingPlayer: (careerLevel.settings.playerGoesFirst === false ? 2 : 1) as 1 | 2,
    } : undefined;
    newGame(settings ? careerLevel!.difficulty : difficulty, isVsAi, settings);
  };

  const handleBack = () => {
    haptics.tap();
    playSound('click');
    // Default mid-match confirm for Quick Play / Career / Local Play.
    // Without this, tapping the X button or Quit button silently abandons
    // the match with zero feedback, which players (and App Store reviewers)
    // universally hate. If the game is already over, skip the confirm.
    if (status === 'playing' && moveCount > 0) {
      setQuitConfirmVisible(true);
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
  const p1Name = isVsAi ? 'You' : localNames.player1;
  const p2Name = isVsAi ? `${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} Bot` : localNames.player2;

  // Turn / status text
  const turnText = status === 'playing'
    ? (isAiThinking ? 'Thinking...'
      : (currentPlayer === 1 ? (p1Name === 'You' ? 'Your Turn' : `${p1Name}'s Turn`) : `${p2Name}'s Turn`))
    : status === 'won'
    ? (winner === 1 ? (p1Name === 'You' ? (celebrationText || 'You Win!') : `${p1Name} Wins!`) : `${p2Name} Wins!`)
    : 'Draw!';

  const diffLabel = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);

  // Helper: compute hint arrow left offset for a given column
  const getHintArrowOffset = (col: number): number => {
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
    if (!isVsAi) return;

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

  // ── Quick reaction: player taps emoji bar ──
  const handleReaction = useCallback((emoji: string) => {
    setMyReaction({ emoji, key: Date.now() });
    // Bot responds to player reaction ~40% of the time
    if (isVsAi && Math.random() < 0.4) {
      const botResponses = ['\u{1F440}', '\u{1F60F}', '\u{1F624}', '\u{1F44F}', '\u{1F60E}', '\u{1F914}'];
      const pick = botResponses[Math.floor(Math.random() * botResponses.length)];
      if (botReactionTimerRef.current) clearTimeout(botReactionTimerRef.current);
      botReactionTimerRef.current = setTimeout(() => {
        setBotReaction({ emoji: pick, key: Date.now() });
      }, 800 + Math.random() * 1200);
    }
  }, [isVsAi]);

  // Cleanup AI emote timer + personality timer on unmount
  useEffect(() => {
    return () => {
      if (aiEmoteTimerRef.current) clearTimeout(aiEmoteTimerRef.current);
      if (aiPersonalityTimerRef.current) clearTimeout(aiPersonalityTimerRef.current);
      if (botReactionTimerRef.current) clearTimeout(botReactionTimerRef.current);
      if (emoteTimerRef.current) clearTimeout(emoteTimerRef.current);
    };
  }, []);

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
            {/* Moves-limit indicator (Phase 2 career levels). Turns red when
                the player is on their last 3 moves — gives them a panic cue. */}
            {params.movesLimit && status === 'playing' && (() => {
              const used = Math.ceil(moveCount / 2);
              const remaining = Math.max(0, params.movesLimit - used);
              return (
                <Text style={[
                  styles.movesLimitLabel,
                  remaining <= 3 && styles.movesLimitLabelWarn,
                ]}>
                  {remaining} move{remaining === 1 ? '' : 's'} left
                </Text>
              );
            })()}
            {/* Jeopardy reward multiplier indicator */}
            {params.rewardMultiplier && params.rewardMultiplier >= 2 && status === 'playing' && (
              <Text style={styles.jeopardyLabel}>💰 {params.rewardMultiplier}× JACKPOT</Text>
            )}
            {/* Timer bar (casual mode turn timer) */}
            {(customSettings?.timerSeconds || 0) > 0 && status === 'playing' && (
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

        {/* ── Flex spacer: pushes board cluster to vertical center ── */}
        <View style={styles.flexSpacerTop} />

        {/* First game encouragement */}
        {showFirstGameMsg && (
          <RNAnimated.View style={[styles.firstGameBanner, { opacity: firstGameFade, pointerEvents: 'none' }]}>
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
                { left: getHintArrowOffset(hintCol) - 22, opacity: hintPulseAnim },
              ]}
            >
              <Text style={styles.hintBestMoveText}>BEST MOVE</Text>
            </RNAnimated.View>
            <RNAnimated.Text style={[
              styles.hintArrow,
              {
                left: getHintArrowOffset(hintCol),
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
            disabled={status !== 'playing' || isAiThinking || (isVsAi && currentPlayer !== 1)}
            currentPlayerColor={currentPlayer === 1 ? 'red' : 'yellow'}
            gravityDown={gravityDown}
          />
        </RNAnimated.View>

        {/* Last move indicator — removed, piece drop is self-evident */}

        {/* ── Below-board 3-column layout: [Player] [Center UI] [Opponent] ── */}
        {status === 'playing' && (
          <View style={styles.belowBoard}>
            {/* Left: Player character */}
            <View style={styles.charColumn}>
              <Character3DPortrait width={140} height={300} showFloor={false} animationId={myPlayingEmote || myGameIdle} />
            </View>

            {/* Center: Expression + Surrender (+ power pieces in career) */}
            <View style={styles.centerColumn}>
              <Pressable
                onPress={() => { haptics.tap(); setExpressionPanelTab('emojis'); }}
                style={styles.categoryBtn}
                accessibilityRole="button"
                accessibilityLabel="Open emojis"
              >
                <Text style={styles.categoryIcon}>😊</Text>
                <Text style={styles.categoryLabel}>Emojis</Text>
              </Pressable>

              <Pressable
                onPress={() => { haptics.tap(); setExpressionPanelTab('phrases'); }}
                style={styles.categoryBtn}
                accessibilityRole="button"
                accessibilityLabel="Open phrases"
              >
                <Text style={styles.categoryIcon}>💬</Text>
                <Text style={styles.categoryLabel}>Phrases</Text>
              </Pressable>

              <Pressable
                onPress={() => { haptics.tap(); setExpressionPanelTab('emotes'); }}
                style={styles.categoryBtn}
                accessibilityRole="button"
                accessibilityLabel="Open emotes"
              >
                <Text style={styles.categoryIcon}>🕺</Text>
                <Text style={styles.categoryLabel}>Emotes</Text>
              </Pressable>

              {/* ── Power pieces (career only) ── */}
              {(() => {
                const isCareer = params.careerLevelId !== undefined;
                if (!isCareer || !isVsAi) return null;
                const isPlayerTurn = currentPlayer === 1 && status === 'playing' && !isAiThinking;
                const careerStore = useCareerStore.getState();
                const pieces: Array<{ id: 'bomb' | 'rainbow' | 'heavy'; icon: string; label: string; color: string; remaining: number; unlocked: boolean }> = [
                  { id: 'bomb', icon: '💣', label: 'Bomb', color: '#ff4081', remaining: bombsRemaining, unlocked: careerStore.isPowerPieceUnlocked('bomb') },
                  { id: 'rainbow', icon: '🌈', label: 'Rainbow', color: '#9b59b6', remaining: rainbowsRemaining, unlocked: careerStore.isPowerPieceUnlocked('rainbow') },
                  { id: 'heavy', icon: '🪨', label: 'Heavy', color: '#a8a8b8', remaining: heaviesRemaining, unlocked: careerStore.isPowerPieceUnlocked('heavy') },
                ];
                return pieces.filter(p => p.unlocked).map((p) => {
                  const isArmed = armedPowerPiece === p.id;
                  const enabled = p.remaining > 0 && isPlayerTurn;
                  const label = isArmed ? 'TAP COL' : `${p.label} (${p.remaining})`;
                  return (
                    <Pressable
                      key={p.id}
                      onPress={() => { if (!enabled) return; setArmedPowerPiece(prev => (prev === p.id ? null : p.id)); haptics.tap(); playSound('click'); }}
                      style={[styles.actionBtn, !enabled && styles.actionBtnDisabled, isArmed && { borderColor: p.color, borderWidth: 2 }]}
                      disabled={!enabled}
                      accessibilityRole="button"
                      accessibilityLabel={label}
                      accessibilityState={{ disabled: !enabled, selected: isArmed }}
                    >
                      <Text style={{ fontSize: 16 }}>{p.icon}</Text>
                      <Text style={[styles.actionBtnLabel, isArmed && { color: p.color }]}>{label}</Text>
                    </Pressable>
                  );
                });
              })()}

              {/* ── Surrender ── */}
              <Pressable
                onPress={() => { haptics.tap(); playSound('click'); setQuitConfirmVisible(true); }}
                style={styles.surrenderBtn}
                accessibilityRole="button"
                accessibilityLabel="Surrender"
              >
                <Text style={styles.surrenderIcon}>🏳️</Text>
                <Text style={styles.surrenderLabel}>Surrender</Text>
              </Pressable>
            </View>

            {/* Right: Opponent character */}
            <View style={styles.charColumn}>
              <Character3DPortrait
                width={140} height={300} showFloor={false}
                customization={isVsAi ? getNpcCustomization(params.opponentName || difficulty) : undefined}
              />
            </View>
          </View>
        )}

        {/* My Chat Bubble — shows above the board on my side */}
        {myChatBubble && (
          <ChatBubble
            key={myChatBubble.key}
            text={myChatBubble.text}
            senderName={p1Name}
            side="left"
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
            side="right"
            visible
            onDone={() => setOpponentChatBubble(null)}
          />
        )}

        {/* Floating emote from player (visible to both sides) */}
        {myEmote && (
          <FloatingEmote
            key={myEmote.key}
            emoteId={myEmote.emoteId}
            side="left"
            onDone={() => setMyEmote(null)}
          />
        )}

        {/* Floating emote from opponent / AI */}
        {opponentEmote && (
          <FloatingEmote
            key={opponentEmote.key}
            emoteId={opponentEmote.emoteId}
            side="right"
            onDone={() => setOpponentEmote(null)}
          />
        )}

        {/* Quick-reaction bubbles (from reaction bar) */}
        {myReaction && (
          <FloatingEmote
            key={myReaction.key}
            rawEmoji={myReaction.emoji}
            side="left"
            onDone={() => setMyReaction(null)}
          />
        )}
        {botReaction && (
          <FloatingEmote
            key={botReaction.key}
            rawEmoji={botReaction.emoji}
            side="right"
            onDone={() => setBotReaction(null)}
          />
        )}

        {/* ── Expression panel (3-tab: emojis/phrases/emotes) ── */}
        {expressionPanelTab != null && status === 'playing' && (
          <ExpressionPanel
            initialTab={expressionPanelTab}
            onEmoji={(emoji) => {
              setMyReaction({ emoji, key: Date.now() });
              if (isVsAi && Math.random() < 0.35) {
                const picks = ['😤', '👀', '😎', '🔥', '💀'];
                const p = picks[Math.floor(Math.random() * picks.length)];
                if (botReactionTimerRef.current) clearTimeout(botReactionTimerRef.current);
                botReactionTimerRef.current = setTimeout(() => {
                  setBotReaction({ emoji: p, key: Date.now() });
                }, 600 + Math.random() * 1400);
              }
            }}
            onPhrase={(phrase) => {
              setMyReaction({ emoji: phrase, key: Date.now() });
              if (isVsAi && Math.random() < 0.35) {
                const picks = ['GG', 'LOL', 'Nice!', 'Wow', '😤'];
                const p = picks[Math.floor(Math.random() * picks.length)];
                if (botReactionTimerRef.current) clearTimeout(botReactionTimerRef.current);
                botReactionTimerRef.current = setTimeout(() => {
                  setBotReaction({ emoji: p, key: Date.now() });
                }, 600 + Math.random() * 1400);
              }
            }}
            onEmote={(emoteId) => {
              setMyPlayingEmote(emoteId);
              if (emoteTimerRef.current) clearTimeout(emoteTimerRef.current);
              emoteTimerRef.current = setTimeout(() => setMyPlayingEmote(null), 3000);
              if (isVsAi && Math.random() < 0.4) {
                const botEmotes = ['emote_clap', 'emote_shake_fist', 'emote_thumbs_down', 'emote_dab'];
                const pick = botEmotes[Math.floor(Math.random() * botEmotes.length)];
                if (botReactionTimerRef.current) clearTimeout(botReactionTimerRef.current);
                botReactionTimerRef.current = setTimeout(() => {
                  setBotReaction({ emoji: '🕺', key: Date.now() });
                }, 800 + Math.random() * 1200);
              }
            }}
            onIdle={(idleId) => {
              setMyGameIdle(idleId);
              setMyPlayingEmote(null);
            }}
            onClose={() => setExpressionPanelTab(null)}
          />
        )}

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
        <PreviewSafeModal visible={status === 'won' || status === 'draw'} transparent animationType="none">
          <Animated.View entering={FadeIn.duration(300)} style={styles.overlay}>
            <SlideReveal from="bottom" delay={100}>
            <View style={styles.goFullScreen}>

              {/* ── Big result headline at the top ── */}
              <View style={styles.goHeadlineZone}>
                <Text style={[styles.goHeadline,
                  status === 'draw' ? { color: '#3498db' }
                    : winner === 1 ? { color: colors.coinGold }
                    : { color: '#e74c3c' },
                ]}>
                  {status === 'draw' ? 'DRAW' : winner === 1 ? 'VICTORY' : 'DEFEAT'}
                </Text>
                <Text style={[styles.goSubheadline,
                  wasCareerLevel ? { color: '#f1c40f' } : isVsAi ? { color: '#b06cc7' } : { color: colors.teal },
                ]}>
                  {wasCareerLevel
                    ? `LEVEL ${params.careerLevelId} — CAREER`
                    : isSeriesMode
                    ? `BEST OF ${totalGames} — GAME ${seriesGame}`
                    : isVsAi
                    ? `VS ${diffLabel.toUpperCase()} BOT`
                    : 'LOCAL MATCH'}
                </Text>
              </View>

              {/* ── Hero zone: characters side-by-side ── */}
              <View style={styles.goHeroZone}>
                <View style={styles.goCharRow}>
                  {/* Player 1 side */}
                  <View style={styles.goCharSide}>
                    {status === 'won' && winner === 1 && (
                      <LinearGradient colors={['rgba(255,215,0,0.3)', 'transparent']} style={styles.goWinnerGlow} />
                    )}
                    <Character3DPortrait
                      width={155} height={340} showFloor={false}
                      animationId={status === 'won' && winner === 1 ? 'emote_dab' : 'idle_base'}
                      animationLoop={status !== 'won' || winner !== 1}
                    />
                    <Text style={[styles.goCharName, status === 'won' && winner === 1 && styles.goCharNameWinner]} numberOfLines={1}>{p1Name}</Text>
                  </View>

                  {/* Center divider — series score or VS */}
                  <View style={styles.goCenterScore}>
                    {isSeriesMode ? (
                      <>
                        <Text style={styles.goScoreBig}>{scores.player1}</Text>
                        <View style={styles.goScoreDivider}>
                          <View style={styles.goScoreLine} />
                        </View>
                        <Text style={styles.goScoreBig}>{scores.player2}</Text>
                      </>
                    ) : (
                      <Text style={styles.goCenterVs}>VS</Text>
                    )}
                  </View>

                  {/* Player 2 / Opponent side */}
                  <View style={styles.goCharSide}>
                    {status === 'won' && winner === 2 && (
                      <LinearGradient colors={['rgba(255,215,0,0.3)', 'transparent']} style={styles.goWinnerGlow} />
                    )}
                    <Character3DPortrait
                      width={155} height={340} showFloor={false}
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
                    <Text style={[styles.goCharName, status === 'won' && winner === 2 && styles.goCharNameWinner]} numberOfLines={1}>{p2Name}</Text>
                  </View>
                </View>
              </View>{/* close goHeroZone */}

              {/* ── Bottom zone: rewards + buttons ── */}
              <View style={styles.goBottomZone}>

                {/* Rewards strip — clean pill row */}
                <View style={styles.goRewardsStrip}>
                  {status === 'won' && winner === 1 && totalCoinsEarned > 0 && (
                    <Shimmer color="rgba(255,215,0,0.25)" duration={2800}>
                      <View style={styles.goRewardPill}>
                        <Text style={styles.goRewardPillIcon}>{'🪙'}</Text>
                        <CountUp value={totalCoinsEarned} duration={900} prefix="+" style={styles.goRewardPillAmount} />
                      </View>
                    </Shimmer>
                  )}
                  {status === 'draw' && (
                    <Shimmer color="rgba(255,215,0,0.18)" duration={3200}>
                      <View style={styles.goRewardPill}>
                        <Text style={styles.goRewardPillIcon}>{'🪙'}</Text>
                        <CountUp value={Math.round(10 * getStreakMultiplier())} duration={700} prefix="+" style={styles.goRewardPillAmount} />
                      </View>
                    </Shimmer>
                  )}
                  {xpEarned > 0 && (
                    <View style={styles.goRewardPill}>
                      <Text style={styles.goRewardPillIcon}>{'⭐'}</Text>
                      <CountUp value={xpEarned} duration={900} prefix="+" suffix=" XP" style={[styles.goRewardPillAmount, { color: '#b06cc7' }]} />
                    </View>
                  )}
                  {winStreak > 0 && (
                    <View style={styles.goRewardPill}>
                      <Text style={styles.goRewardPillIcon}>{'🔥'}</Text>
                      <Text style={[styles.goRewardPillAmount, { color: colors.orange }]}>{winStreak}</Text>
                    </View>
                  )}
                </View>

                {/* Career star rating */}
                {wasCareerLevel && status === 'won' && winner === 1 && (() => {
                  const cl = ALL_CAREER_LEVELS.find(l => l.id === params.careerLevelId);
                  const t = cl?.starThresholds ?? { three: 14, two: 24 };
                  const earnedStars = moveCount <= t.three ? 3 : moveCount <= t.two ? 2 : 1;
                  const verdict = earnedStars === 3 ? 'PERFECT CLEAR' : earnedStars === 2 ? 'GREAT CLEAR' : 'LEVEL CLEARED';
                  return (
                    <View style={styles.goCareerStarCompact}>
                      <AnimatedStarRating earned={earnedStars} size={32} delay={200} />
                      <Text style={styles.goCareerStarVerdict}>{verdict}</Text>
                    </View>
                  );
                })()}

                {/* Notable events */}
                {didLevelUp && (
                  <View style={styles.goEventCompact}>
                    <Text style={{ fontSize: 14 }}>{'🎉'}</Text>
                    <Text style={[styles.goEventCompactText, { color: '#b06cc7' }]}>Level Up! Lv {level}</Text>
                  </View>
                )}
                {wasCareerLevel && unlockedCareerRewards.length > 0 && unlockedCareerRewards.map((r, i) => (
                  <View key={i} style={styles.goEventCompact}>
                    <Text style={{ fontSize: 14 }}>{r.icon || '🎁'}</Text>
                    <Text style={[styles.goEventCompactText, { color: '#4caf50' }]}>
                      NEW {r.type.toUpperCase()}: {r.name || r.id || 'Unlocked!'}
                    </Text>
                  </View>
                ))}
                {streakReward && (
                  <View style={styles.goEventCompact}>
                    <Text style={{ fontSize: 14 }}>{'🔥'}</Text>
                    <Text style={[styles.goEventCompactText, { color: colors.orange }]}>
                      {streakReward.milestone} Win Streak! +{streakReward.coins} 🪙{streakReward.lootBox ? ` + ${streakReward.lootBox} Box` : ''}
                    </Text>
                  </View>
                )}
                {streakBrokenAt && streakBrokenAt >= 3 && (
                  <View style={styles.goEventCompact}>
                    <Text style={{ fontSize: 14 }}>{'💔'}</Text>
                    <Text style={[styles.goEventCompactText, { color: '#e74c3c' }]}>
                      {streakBrokenAt} Win Streak Broken
                    </Text>
                  </View>
                )}
                {completedChallengeName && (
                  <View style={styles.goEventCompact}>
                    <Text style={{ fontSize: 14 }}>{'✅'}</Text>
                    <Text style={[styles.goEventCompactText, { color: colors.teal }]}>
                      Challenge Complete: {completedChallengeName}
                    </Text>
                  </View>
                )}
                {comebackCoins && comebackCoins > 0 && (
                  <View style={styles.goEventCompact}>
                    <Text style={{ fontSize: 14 }}>{'💪'}</Text>
                    <Text style={[styles.goEventCompactText, { color: colors.coinGold }]}>
                      Comeback Bonus: +{comebackCoins} 🪙
                    </Text>
                  </View>
                )}
                {milestoneCelebration && (
                  <View style={styles.goEventCompact}>
                    <Text style={{ fontSize: 14 }}>{'🏆'}</Text>
                    <Text style={[styles.goEventCompactText, { color: colors.goldLight }]}>
                      {milestoneCelebration}
                    </Text>
                  </View>
                )}
                {isFirstWinOfDay && (
                  <View style={styles.goEventCompact}>
                    <Text style={{ fontSize: 14 }}>{'☀️'}</Text>
                    <Text style={[styles.goEventCompactText, { color: '#ffd54f' }]}>
                      First Win of the Day — 2× XP!
                    </Text>
                  </View>
                )}

                {/* Series complete */}
                {isSeriesMode && seriesOver && (
                  <View style={styles.seriesCompleteCompact}>
                    <Text style={[styles.seriesCompleteResult, {
                      color: scores.player1 >= seriesWinsNeeded ? colors.coinGold
                        : scores.player2 >= seriesWinsNeeded ? '#e74c3c' : colors.teal,
                    }]}>
                      {scores.player1 >= seriesWinsNeeded ? '🏆 SERIES WIN!'
                        : scores.player2 >= seriesWinsNeeded ? '💀 SERIES LOSS'
                        : '🤝 SERIES TIED'}
                    </Text>
                    <Text style={styles.seriesScoreDisplay}>{scores.player1} — {scores.player2}</Text>
                  </View>
                )}

                {/* Primary CTA */}
                {isSeriesMode && seriesOver ? (
                  <GlossyButton label="NEW GAME" icon={'🎮'} variant="green"
                    onPress={() => navigation.navigate('Play')} />
                ) : wasCareerLevel && winner === 1 ? (
                  <GlossyButton
                    label="NEXT LEVEL"
                    icon={'▶'}
                    variant="green"
                    onPress={() => navigation.navigate('CareerMap' as any)}
                  />
                ) : (
                  <GlossyButton
                    label={wasCareerLevel ? 'RETRY LEVEL' : isSeriesMode ? `NEXT GAME (${seriesGame + 1}/${totalGames})` : 'REMATCH'}
                    icon={'🔄'} variant="orange" onPress={handleRematch}
                  />
                )}

                {/* Secondary buttons */}
                <View style={styles.goSecondaryRow}>
                  {isSeriesMode && seriesOver ? (
                    <GlossyButton label="HOME" icon={'🏠'} variant="navy"
                      onPress={handleGoHome} style={{ flex: 1 }} />
                  ) : wasCareerLevel ? (
                    <>
                      {winner === 1 ? (
                        <GlossyButton label="REPLAY" icon={'🔄'} variant="orange"
                          onPress={handleRematch} style={{ flex: 1 }} />
                      ) : (
                        <GlossyButton label="CAREER MAP" icon={'🗺️'} variant="green"
                          onPress={() => navigation.navigate('CareerMap' as any)} style={{ flex: 1 }} />
                      )}
                      <GlossyButton label="HOME" icon={'🏠'} variant="navy"
                        onPress={handleGoHome} style={{ flex: 1 }} />
                    </>
                  ) : (
                    <>
                      <GlossyButton label="NEW GAME" icon={'🎮'} variant="green"
                        onPress={() => navigation.navigate('Play')} style={{ flex: 1 }} />
                      <GlossyButton label="HOME" icon={'🏠'} variant="navy"
                        onPress={handleGoHome} style={{ flex: 1 }} />
                    </>
                  )}
                </View>

                {/* Difficulty quick-switch — AI only, non-career */}
                {isVsAi && !wasCareerLevel && !isSeriesMode && (
                  <View style={styles.goDiffSwitchRow}>
                    {(['easy', 'medium', 'hard'] as const).map((d) => {
                      const isActive = d === difficulty;
                      const diffColor = d === 'easy' ? colors.green : d === 'medium' ? colors.orange : colors.pieceRed;
                      return (
                        <PressScale key={d} scaleTo={0.92}
                          style={[styles.goDiffBtn, isActive && { borderColor: `${diffColor}60`, backgroundColor: `${diffColor}18` }]}
                          onPress={() => {
                            if (!isActive) {
                              playSound('click');
                              setSeriesGame(prev => prev < totalGames ? prev + 1 : 1);
                              setShowConfetti(false); setWasCareerLevel(false);
                              setFreeHintsRemaining(3); setSkipsRemaining(1);
                              setBombsRemaining(1); setRainbowsRemaining(1); setHeaviesRemaining(1);
                              setArmedPowerPiece(null); setDidLevelUp(false);
                              setStreakReward(null); setCompletedChallengeName(null);
                              setStreakBrokenAt(null); setDailyStreakMultiplier(1);
                              setDoubleCoinsUsed(false); setIsFirstWinOfDay(false);
                              setXpEarned(0); setTotalCoinsEarned(0);
                              newGame(d, isVsAi);
                            }
                          }}
                          accessibilityRole="button"
                          accessibilityLabel={`Switch to ${d} difficulty`}
                          accessibilityState={{ selected: isActive }}
                        >
                          <Text style={[styles.goDiffBtnText,
                            { color: isActive ? diffColor : 'rgba(255,255,255,0.4)' },
                            isActive && { fontWeight: '800' as any },
                          ]}>
                            {d.toUpperCase()}
                          </Text>
                        </PressScale>
                      );
                    })}
                  </View>
                )}

              </View>{/* close goBottomZone */}

            </View>{/* close goFullScreen */}
            </SlideReveal>
          </Animated.View>
        </PreviewSafeModal>

        {/* Tutorial tooltip */}
        <TutorialTooltip
          tip={gameTip}
          visible={showGameTutorial && !hasSeenGameTip('game_hint')}
          onDismiss={() => setShowGameTutorial(false)}
        />
      </View>
      {/* Quit confirm — replaces blocking Alert.alert that didn't render
          on RN-Web. Cancel keeps the player in the match; Confirm
          navigates back to the previous screen. */}
      <ConfirmDialog
        visible={quitConfirmVisible}
        title="Quit match?"
        message="Your progress in this match will be lost."
        cancelLabel="Keep playing"
        confirmLabel="Quit"
        primary={false}
        onConfirm={() => {
          setQuitConfirmVisible(false);
          navigation.goBack();
        }}
        onCancel={() => setQuitConfirmVisible(false)}
      />

      {/* Phase A.2 — Per-level intro card. Telegraphs the variant
          identity ("🧱 4 OBSTACLES" / "🎯 WIN IN 6 MOVES" / "TOMMY'S
          RULE") for ~1.8s before play opens. Standard career levels
          (and Quick Play / Local Play) skip the intro entirely —
          deriveIntroFromParams returns null and we never mount this.
          On dismiss (auto-after-1.8s or tap), introDone flips and
          handleColumnPress's intro gate releases. */}
      {introProps && !introDone && (
        <LevelIntroCard
          icon={introProps.icon}
          label={introProps.label}
          rule={introProps.rule}
          tint={introProps.tint}
          onComplete={() => setIntroDone(true)}
        />
      )}
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  flexSpacerTop: {
    flex: 0.15,
    minHeight: 2,
  },
  flexSpacerBottom: {
    flex: 0.15,
    minHeight: 2,
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
  hudRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 12,
    marginBottom: 0,
    marginTop: 40,
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
  movesLimitLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.black,
    fontSize: 11,
    color: '#81c784',
    marginTop: 2,
    letterSpacing: 0.8,
  },
  movesLimitLabelWarn: {
    color: '#ff4081',
  },
  jeopardyLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.black,
    fontSize: 11,
    color: '#ffd54f',
    marginTop: 2,
    letterSpacing: 1.2,
    textShadow: '0px 0px 4px rgba(255,213,79,0.6)',
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
    marginTop: 2,
    marginBottom: 0,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
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
    textShadow: '0px 0px 12px rgba(255,215,0,0.9)',
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
    boxShadow: '0px 0px 6px rgb(255,215,0)',
  },
  hintBestMoveText: {
    fontFamily: fonts.body,
    fontWeight: weight.black,
    fontSize: 8,
    color: '#1a1200',
    letterSpacing: 0.8,
  },
  // ======== Below-board 3-column layout ========
  belowBoard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    flex: 1,
    paddingHorizontal: 4,
    marginTop: 2,
  },
  charColumn: {
    alignItems: 'center',
    flex: 1,
  },
  centerColumn: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    width: 120,
  },
  // ── Expression category buttons (Emojis / Phrases / Emotes) ──
  categoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 6,
  },
  categoryIcon: {
    fontSize: 16,
  },
  categoryLabel: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    letterSpacing: 0.5,
  },
  // ── Power piece buttons (career only) ──
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 34,
    borderRadius: 11,
    backgroundColor: 'rgba(255,140,0,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,140,0,0.2)',
    gap: 5,
  },
  actionBtnDisabled: {
    opacity: 0.35,
  },
  actionBtnLabel: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 11,
    color: '#ff8c00',
    letterSpacing: 0.3,
  },
  // ── Surrender button ──
  surrenderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 34,
    borderRadius: 11,
    backgroundColor: 'rgba(255,60,60,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,60,60,0.2)',
    gap: 6,
  },
  surrenderIcon: {
    fontSize: 14,
  },
  surrenderLabel: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 11,
    color: 'rgba(255,100,100,0.7)',
    letterSpacing: 0.3,
  },
  // ======== Premium Game Over — clean hierarchy, big result ========
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5,5,15,0.98)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  goFullScreen: {
    flex: 1,
    width: '100%',
    paddingTop: 16,
    paddingBottom: 10,
  },
  goHeadlineZone: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 4,
    gap: 2,
  },
  goHeadline: {
    fontFamily: fonts.heading,
    fontWeight: weight.black as any,
    fontSize: 38,
    color: '#ffffff',
    letterSpacing: 6,
    textAlign: 'center',
    textShadow: '0px 0px 24px rgba(255,215,0,0.5)',
  },
  goSubheadline: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 11,
    letterSpacing: 2.5,
    textAlign: 'center',
    textTransform: 'uppercase',
    opacity: 0.8,
  },
  goModeLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 11,
    letterSpacing: 2.5,
    textAlign: 'center',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  goHeroZone: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  goNameBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
  },
  goBottomZone: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 8,
  },
  goRewardsStrip: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 6,
  },
  goRewardPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  goRewardPillIcon: {
    fontSize: 16,
  },
  goRewardPillAmount: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 16,
    color: colors.coinGold,
  },
  goCareerStarCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(241,196,15,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(241,196,15,0.3)',
  },
  goEventCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  goEventCompactText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 13,
    letterSpacing: 0.5,
  },
  seriesCompleteCompact: {
    alignItems: 'center',
    paddingVertical: 6,
    gap: 2,
  },
  goSecondaryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  goLinksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 4,
    paddingBottom: 4,
  },
  goLinkText: {
    fontFamily: fonts.body,
    fontWeight: weight.medium as any,
    fontSize: 12,
    color: 'rgba(255,255,255,0.35)',
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  goLinkDot: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: 'rgba(255,255,255,0.2)',
  },
  // winTrophyHero removed — characters are the hero elements now
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
    boxShadow: '0px 0px 20px rgba(46,204,113,0.8)',
    elevation: 30,
  },
  celebrationText: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 24,
    color: '#2ecc71',
    letterSpacing: 3,
    textShadow: '0px 0px 16px rgba(46,204,113,0.8)',
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
    boxShadow: '0px 0px 20px rgba(255,215,0,0.8)',
    elevation: 30,
  },
  firstWinText: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 28,
    color: '#FFD700',
    letterSpacing: 4,
    textShadow: '0px 0px 20px rgba(255,200,0,0.8)',
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
    boxShadow: '0px 16px 24px rgba(0,0,0,0.6)',
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
    paddingHorizontal: 2,
    paddingTop: 0,
    paddingBottom: 0,
  },
  goCharSide: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  goWinnerGlow: {
    position: 'absolute',
    top: -12,
    left: -8,
    right: -8,
    bottom: -8,
    borderRadius: 20,
    opacity: 0.7,
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
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    maxWidth: 120,
    textAlign: 'center',
    marginTop: 4,
  },
  goCharNameWinner: {
    color: colors.coinGold,
    textShadow: '0px 0px 8px rgba(255,215,0,0.5)',
  },
  goCenterVs: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 14,
    color: 'rgba(255,255,255,0.25)',
    letterSpacing: 2,
  },
  goWinnerBanner: {
    marginTop: 4,
    backgroundColor: 'rgba(255,215,0,0.2)',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 5,
    borderWidth: 1.5,
    borderColor: 'rgba(255,215,0,0.5)',
  },
  goWinnerText: {
    fontFamily: fonts.heading,
    fontWeight: weight.black as any,
    fontSize: 16,
    color: colors.coinGold,
    letterSpacing: 3,
    textShadow: '0px 0px 10px rgba(255,215,0,0.6)',
  },
  // Center score
  goCenterScore: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    minWidth: 50,
  },
  goScoreBig: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 28,
    color: '#ffffff',
    lineHeight: 32,
  },
  goResultLabel: {
    fontFamily: fonts.heading,
    fontWeight: weight.black as any,
    fontSize: 22,
    color: '#ffffff',
    letterSpacing: 4,
    textAlign: 'center',
    textShadow: '0px 0px 12px',
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
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
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
  // Double Coins button
  doubleCoinsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: 'rgba(241, 196, 15, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(241, 196, 15, 0.35)',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginVertical: 4,
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
    paddingBottom: 12,
    paddingTop: 2,
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
    gap: 6,
    paddingVertical: 6,
  },
  goTotalCoinsIcon: {
    fontSize: 20,
  },
  goTotalCoinsAmount: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 24,
    color: colors.coinGold,
    letterSpacing: 1,
    textShadow: '0px 0px 12px rgba(255,215,0,0.5)',
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
    textShadow: '0px 0px 8px rgba(255,215,0,0.6)',
  },
  // Hero career star block — shown above rewards, replaces buried row
  goCareerStarHero: {
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginHorizontal: 12,
    marginTop: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(241,196,15,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(241,196,15,0.3)',
  },
  goCareerStarVerdict: {
    fontFamily: fonts.heading,
    fontWeight: weight.black as any,
    fontSize: 15,
    color: '#ffd93d',
    letterSpacing: 2,
    marginTop: 10,
    textShadow: '0px 0px 10px rgba(255,215,0,0.5)',
  },
  goStreakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 5,
    paddingHorizontal: 14,
    marginTop: 2,
    marginHorizontal: 16,
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
    textShadow: '0px 0px 8px rgba(241,196,15,0.6)',
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
