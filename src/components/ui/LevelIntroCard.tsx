// ═══════════════════════════════════════════════════════════════════════
// LevelIntroCard — pre-play "TARGET: 6 MOVES" / "🧱 4 OBSTACLES" reveal
//
// Phase A.2 of the career-mode-as-retention-engine push. Telegraphs
// the variant identity for ~1.8s before the player can interact, so
// each variant lands as a distinct experience instead of "another
// Connect 4 board appeared."
//
// Mounts at the top of GameScreen for career levels with a non-default
// variant (obstacle, moves_limit, timed/blitz/speed, jeopardy, boss
// scripts). Standard levels skip the intro — no point announcing
// "this is a Connect 4 game."
//
// Lifecycle:
//   t=0    fade-in + spring-up from 60px below
//   t=0.4  fully visible, holding
//   t=1.6  fade-out + slide down
//   t=2.0  unmounted via onComplete
// Tap anywhere on the overlay collapses to t=1.6 immediately so
// players who already know the rule don't have to wait.
// ═══════════════════════════════════════════════════════════════════════

import React, { useCallback, useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { boxShadow } from '../../utils/shadow';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  withSequence,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { fonts, weight } from '../../theme/typography';

export interface LevelIntroProps {
  /** Big emoji glyph on top of the card. Picked by the GameScreen
   *  caller per the level's variant (🧱 obstacle, 🎯 target, ⚡ speed
   *  etc.). */
  icon: string;
  /** Compact label below the icon (e.g. "OBSTACLE", "6 MOVES TO WIN",
   *  "TOMMY'S RULE"). Shown in CAPS. */
  label: string;
  /** Optional one-line explanation. ~6-10 words max — players are
   *  reading it while the card is animating. */
  rule?: string;
  /** Color tint for the card border + label glow. Match this to the
   *  variant's color in MatchupScreen for consistency. */
  tint: string;
  /** Called when the intro animation completes (visible → faded out).
   *  GameScreen uses this to flip a `introDone` flag so the player
   *  can interact. */
  onComplete: () => void;
}

export function LevelIntroCard({ icon, label, rule, tint, onComplete }: LevelIntroProps) {
  // Shared values: opacity + translateY + scale animate independently
  // so we can stagger them. translateY starts at +60 (off-screen
  // below) and springs to 0 on entry; reverses on exit.
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(60);
  const scale = useSharedValue(0.92);

  const finish = useCallback(() => {
    onComplete();
  }, [onComplete]);

  // Skip handler — same end-state as the natural exit, just instant.
  // Triggered by tapping the backdrop. Cancels the dwell + jumps
  // straight to the fade-out timeline.
  const handleSkip = useCallback(() => {
    opacity.value = withTiming(0, { duration: 200 }, (done) => {
      if (done) runOnJS(finish)();
    });
    translateY.value = withTiming(40, { duration: 200 });
  }, [finish, opacity, translateY]);

  useEffect(() => {
    // Entry: opacity + scale ramp ~400ms, translateY springs in
    // parallel. The slight overshoot from the spring sells the card
    // as a "presented" thing, not a static overlay.
    opacity.value = withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) });
    scale.value = withTiming(1, { duration: 360, easing: Easing.out(Easing.cubic) });
    translateY.value = withSpring(0, { damping: 14, stiffness: 180, mass: 0.8 });

    // Exit: hold for 1.2s after entry lands, then fade + slide
    // down. Total visible time ~1.8s — long enough to read, short
    // enough that returning players don't feel slowed down.
    opacity.value = withDelay(
      1600,
      withSequence(
        withTiming(0, { duration: 320, easing: Easing.in(Easing.cubic) }, (done) => {
          if (done) runOnJS(finish)();
        }),
      ),
    );
    translateY.value = withDelay(
      1600,
      withTiming(40, { duration: 320, easing: Easing.in(Easing.cubic) }),
    );
    // Note: we re-assign opacity twice (entry, then delayed exit).
    // Reanimated handles this fine — the second assignment supersedes.
  }, []);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.overlay, overlayStyle, { pointerEvents: 'auto' }]}>
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={handleSkip}
        accessibilityRole="button"
        accessibilityLabel="Skip intro"
      >
        {/* Dim the playfield behind the card so the variant text
            dominates. Light-touch backdrop — not a full blackout
            because players want to glance at the board too. */}
        <View style={styles.scrim} />
      </Pressable>

      <Animated.View
        style={[
          styles.card,
          cardStyle,
          {
            borderColor: tint,
            boxShadow: boxShadow(tint, 0.7, 0, 0, 24),
          } as any,
          { pointerEvents: 'none' },
        ]}
      >
        <LinearGradient
          colors={[`${tint}30`, `${tint}10`, 'transparent']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.cardGlow}
        />
        <Text style={styles.icon}>{icon}</Text>
        <Text
          style={[
            styles.label,
            { color: tint, textShadow: `0px 0px 14px ${tint}88` },
          ]}
        >
          {label}
        </Text>
        {rule && <Text style={styles.rule}>{rule}</Text>}
      </Animated.View>
    </Animated.View>
  );
}

// ─── Helpers for the GameScreen call-site ────────────────────────────
// Maps the level's variant (from route params) to the card's icon +
// label + rule + tint. Centralized here so the same identity language
// shows up across MatchupScreen badge → LevelIntroCard → in-game HUD.

export function deriveIntroFromParams(params: {
  bossScript?: 'tommy' | 'sal' | 'warden';
  obstacleCells?: Array<{ row: number; col: number }>;
  movesLimit?: number;
  rewardMultiplier?: number;
  levelType?: string;
  timerSeconds?: number;
  connectCount?: number;
}): LevelIntroProps | null {
  // Bosses take precedence — their scripted mechanic is the headline.
  if (params.bossScript === 'tommy') {
    return {
      icon: '\u{1F451}', // 👑
      label: "TOMMY'S RULE",
      rule: 'Even cols on even turns. Odd on odd.',
      tint: '#ff8c42',
      onComplete: () => {},
    };
  }
  if (params.bossScript === 'sal') {
    return {
      icon: '\u{1F305}', // 🌅
      label: "SAL'S GRAVITY",
      rule: 'Flips every 4 moves. Read the board twice.',
      tint: '#ff4081',
      onComplete: () => {},
    };
  }
  if (params.bossScript === 'warden') {
    return {
      icon: '\u{26EA}', // ⛪
      label: 'THE WARDEN',
      rule: '4-piece threat. Block fast. Survive.',
      tint: '#ba68c8',
      onComplete: () => {},
    };
  }
  // Variant levels — use the most-distinctive feature for the card.
  if (params.rewardMultiplier && params.rewardMultiplier >= 2) {
    return {
      icon: '\u{1F4B0}', // 💰
      label: `JEOPARDY · ${params.rewardMultiplier}× COINS`,
      rule: 'Triple the bag. Or nothing.',
      tint: '#ffd54f',
      onComplete: () => {},
    };
  }
  if (params.movesLimit) {
    return {
      icon: '\u{1F3AF}', // 🎯
      label: `WIN IN ${params.movesLimit} MOVES`,
      rule: 'Every drop counts.',
      tint: '#81c784',
      onComplete: () => {},
    };
  }
  if (params.obstacleCells && params.obstacleCells.length > 0) {
    return {
      icon: '\u{1F9F1}', // 🧱
      label: `${params.obstacleCells.length} OBSTACLES`,
      rule: 'Play around the walls.',
      tint: '#a8a8b8',
      onComplete: () => {},
    };
  }
  if (params.levelType === 'speed' && params.timerSeconds) {
    return {
      icon: '⚡', // ⚡
      label: `SPEED · ${params.timerSeconds}s PER MOVE`,
      rule: 'Drop fast or forfeit the turn.',
      tint: '#ff6b35',
      onComplete: () => {},
    };
  }
  if (params.levelType === 'timed' && params.timerSeconds) {
    return {
      icon: '⏱️', // ⏱️
      label: `TIMED · ${params.timerSeconds}s`,
      rule: 'Beat the clock.',
      tint: '#42a5f5',
      onComplete: () => {},
    };
  }
  if (params.levelType === 'connect3') {
    return {
      icon: '3️⃣', // 3️⃣
      label: 'CONNECT 3',
      rule: 'Small board. Sharp moves only.',
      tint: '#ce93d8',
      onComplete: () => {},
    };
  }
  if (params.levelType === 'connect5') {
    return {
      icon: '5️⃣', // 5️⃣
      label: 'CONNECT 5',
      rule: 'Five in a row on a big board. Stretch it.',
      tint: '#4dd0e1',
      onComplete: () => {},
    };
  }
  if (params.levelType === 'connect6') {
    return {
      icon: '6️⃣', // 6️⃣
      label: 'CONNECT 6',
      rule: 'Six in a row. The long game.',
      tint: '#7986cb',
      onComplete: () => {},
    };
  }
  if (params.levelType === 'go_second') {
    return {
      icon: '↩️', // ↩️
      label: 'GOING SECOND',
      rule: 'Opponent drops first. Play from behind.',
      tint: '#ffb74d',
      onComplete: () => {},
    };
  }
  if (params.levelType === 'puzzle') {
    return {
      icon: '\u{1F9E9}', // 🧩
      label: 'PUZZLE START',
      rule: 'Pre-set board. Read it, solve it.',
      tint: '#a5d6a7',
      onComplete: () => {},
    };
  }
  return null;
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  card: {
    width: '78%',
    maxWidth: 320,
    backgroundColor: 'rgba(10,14,32,0.92)',
    borderRadius: 22,
    borderWidth: 2,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
    elevation: 18,
    overflow: 'hidden',
  },
  cardGlow: {
    ...StyleSheet.absoluteFillObject,
  },
  icon: {
    fontSize: 56,
    marginBottom: 10,
  },
  label: {
    fontFamily: fonts.heading,
    fontWeight: weight.black,
    fontSize: 22,
    letterSpacing: 2,
    textAlign: 'center',
  },
  rule: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 13,
    color: 'rgba(255,255,255,0.82)',
    textAlign: 'center',
    marginTop: 10,
    letterSpacing: 0.6,
    lineHeight: 18,
  },
});
