import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { GlossyButton } from './GlossyButton';
import { ConfettiOverlay } from '../effects/ConfettiOverlay';
import { useShopStore } from '../../stores/shopStore';
import { useDailyRewardStore } from '../../stores/dailyRewardStore';
import { haptics } from '../../services/haptics';
import { playSound } from '../../services/audio';
import { colors } from '../../theme/colors';
import { fonts, weight } from '../../theme/typography';

// ═══════════════════════════════════════════════════════════════════════
// WelcomeBackPopup
//
// Shown when the player returns after 3+ days away. Candy-Crush-style
// "we missed you" reward drop — 500 coins + 1 gem, plus a "Come back
// tomorrow to keep your streak rolling" nudge.
//
// Gating:
//   - Only fires if lastClaimDate was ≥ 3 calendar days ago.
//   - Only once per return — tracked via `drop4_welcome_back_claimed_at`
//     so the player doesn't see it every time they background/foreground.
//   - Waits for the first-launch welcome to dismiss before showing
//     (same pattern as DailyRewardPopup).
//
// Must be mounted BEFORE DailyRewardPopup in the render tree so the
// player sees "welcome back" first, then the daily reward.
// ═══════════════════════════════════════════════════════════════════════

const WELCOME_BACK_COINS = 500;
const WELCOME_BACK_GEMS = 1;
const STORAGE_KEY = 'drop4_welcome_back_claimed_at';

function getTodayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function daysSince(iso: string | null): number {
  if (!iso) return Infinity;
  const today = new Date(getTodayString() + 'T00:00:00');
  const then = new Date(iso + 'T00:00:00');
  return Math.floor((today.getTime() - then.getTime()) / (1000 * 60 * 60 * 24));
}

export function WelcomeBackPopup() {
  const [visible, setVisible] = useState(false);
  const [daysAway, setDaysAway] = useState(0);
  const addCoins = useShopStore(s => s.addCoins);
  const addGems = useShopStore(s => s.addGems);
  const lastClaimDate = useDailyRewardStore(s => s.lastClaimDate);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      // Gate on Welcome overlay
      const welcomeDismissed = await AsyncStorage.getItem('drop4_welcome_dismissed');
      if (welcomeDismissed !== 'true') return false;

      // Only fire for 3+ day gaps
      const gap = daysSince(lastClaimDate);
      if (gap < 3 || gap === Infinity) return true; // nothing to do, let caller stop

      // Don't re-show same day if already claimed this return
      const claimedAt = await AsyncStorage.getItem(STORAGE_KEY);
      if (claimedAt === getTodayString()) return true;

      if (cancelled) return true;
      setDaysAway(gap);
      setVisible(true);
      playSound('modal_in');
      return true;
    };

    let poll: ReturnType<typeof setInterval> | null = null;
    check().then((done) => {
      if (done || cancelled) return;
      poll = setInterval(async () => {
        const d = await check();
        if (d && poll) { clearInterval(poll); poll = null; }
      }, 600);
    });

    return () => {
      cancelled = true;
      if (poll) clearInterval(poll);
    };
  }, [lastClaimDate]);

  const handleClaim = async () => {
    haptics.win();
    playSound('coin');
    addCoins(WELCOME_BACK_COINS);
    addGems(WELCOME_BACK_GEMS);
    await AsyncStorage.setItem(STORAGE_KEY, getTodayString());
    setVisible(false);
  };

  if (!visible) return null;

  const daysAwayLabel = daysAway > 30 ? `${Math.floor(daysAway / 7)} weeks` : `${daysAway} days`;

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.overlay}>
        <LinearGradient
          colors={['rgba(40,28,80,0.92)', 'rgba(20,14,45,0.96)']}
          style={StyleSheet.absoluteFill}
        />
        <ConfettiOverlay visible />

        <Animated.View
          entering={ZoomIn.duration(500).springify().damping(10)}
          style={styles.card}
        >
          <LinearGradient
            colors={['rgba(80,55,140,0.95)', 'rgba(40,25,90,0.98)']}
            style={styles.cardBg}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
          />

          <Text style={styles.kicker}>WE MISSED YOU</Text>
          <Text style={styles.title} accessibilityRole="header">Welcome Back!</Text>
          <Text style={styles.subtitle}>You were away for {daysAwayLabel}.</Text>

          <Animated.View entering={FadeInDown.delay(300).duration(400)} style={styles.rewardBlock}>
            <View style={styles.rewardRow}>
              <Text style={styles.rewardEmoji}>🪙</Text>
              <Text style={styles.rewardAmount}>+{WELCOME_BACK_COINS.toLocaleString()}</Text>
              <Text style={styles.rewardLabel}>coins</Text>
            </View>
            <View style={styles.rewardRow}>
              <Text style={styles.rewardEmoji}>💎</Text>
              <Text style={styles.rewardAmount}>+{WELCOME_BACK_GEMS}</Text>
              <Text style={styles.rewardLabel}>gem</Text>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(500).duration(400)}>
            <Text style={styles.pitch}>Come back tomorrow to start a new streak.</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(700).duration(400)} style={styles.buttonWrap}>
            <GlossyButton
              label="CLAIM"
              variant="orange"
              icon="🎁"
              iconRight=""
              onPress={handleClaim}
            />
          </Animated.View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 24,
    padding: 28,
    overflow: 'hidden',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,200,80,0.5)',
    shadowColor: '#ffcc50',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 20,
    elevation: 10,
  },
  cardBg: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
  },
  kicker: {
    fontFamily: fonts.body,
    fontWeight: weight.black,
    fontSize: 11,
    color: '#ffcc50',
    letterSpacing: 3,
    marginBottom: 6,
  },
  title: {
    fontFamily: fonts.heading,
    fontWeight: weight.black,
    fontSize: 28,
    color: '#ffffff',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(255,200,80,0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 13,
    color: 'rgba(255,255,255,0.78)',
    marginTop: 6,
    marginBottom: 20,
    textAlign: 'center',
  },
  rewardBlock: {
    width: '100%',
    gap: 10,
    marginBottom: 18,
  },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  rewardEmoji: {
    fontSize: 26,
  },
  rewardAmount: {
    fontFamily: fonts.heading,
    fontWeight: weight.black,
    fontSize: 20,
    color: colors.coinGold,
    letterSpacing: 0.5,
  },
  rewardLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 13,
    color: 'rgba(255,255,255,0.68)',
  },
  pitch: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginBottom: 18,
    fontStyle: 'italic',
  },
  buttonWrap: {
    minWidth: 180,
  },
});
