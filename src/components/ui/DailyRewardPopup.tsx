import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Modal, Animated as RNAnimated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { SlideInDown } from 'react-native-reanimated';
import { GlossyButton } from './GlossyButton';
import { useDailyRewardStore } from '../../stores/dailyRewardStore';
import { useShopStore } from '../../stores/shopStore';
import { useCharacterStore } from '../../stores/characterStore';
import { usePetStore } from '../../stores/petStore';
import { useLootBoxStore } from '../../stores/lootBoxStore';
import { haptics } from '../../services/haptics';
import { playSound } from '../../services/audio';
import { colors } from '../../theme/colors';
import { fonts, weight } from '../../theme/typography';

// Sparkle particle around the reward icon
function RewardSparkle({ angle, delay, radius }: { angle: number; delay: number; radius: number }) {
  const opacity = useRef(new RNAnimated.Value(0)).current;
  const scale = useRef(new RNAnimated.Value(0.3)).current;
  const rad = (angle * Math.PI) / 180;
  const x = Math.cos(rad) * radius;
  const y = Math.sin(rad) * radius;

  useEffect(() => {
    const loop = RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.delay(delay),
        RNAnimated.parallel([
          RNAnimated.timing(opacity, { toValue: 1, duration: 500, useNativeDriver: true }),
          RNAnimated.timing(scale, { toValue: 1, duration: 500, useNativeDriver: true }),
        ]),
        RNAnimated.parallel([
          RNAnimated.timing(opacity, { toValue: 0, duration: 600, useNativeDriver: true }),
          RNAnimated.timing(scale, { toValue: 0.3, duration: 600, useNativeDriver: true }),
        ]),
        RNAnimated.delay(400),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <RNAnimated.Text
      style={{
        position: 'absolute',
        fontSize: 12,
        left: '50%',
        top: '50%',
        marginLeft: x - 6,
        marginTop: y - 6,
        opacity,
        transform: [{ scale }],
      }}
    >
      ✦
    </RNAnimated.Text>
  );
}

export function DailyRewardPopup() {
  const [visible, setVisible] = useState(false);
  const [reward, setReward] = useState<any>(null);
  const { checkAndShowReward, claimReward, currentStreak } = useDailyRewardStore();
  const addCoins = useShopStore(s => s.addCoins);
  const addGems = useShopStore(s => s.addGems);
  const { addBox } = useLootBoxStore();

  useEffect(() => {
    const available = checkAndShowReward();
    if (available) {
      setReward(available);
      setVisible(true);
    }
  }, []);

  const handleClaim = () => {
    const claimed = claimReward();
    if (claimed) {
      if (claimed.type === 'coins') addCoins(claimed.amount);
      if (claimed.type === 'gems') addGems(claimed.amount);
      if (claimed.type === 'lootbox') addBox(claimed.day === 7 ? 'gold_box' : 'bronze_box');
      // New reward types from the escalating streak system
      if (claimed.type === 'outfit' && claimed.unlockId) {
        useCharacterStore.getState().unlockOutfit(claimed.unlockId);
      }
      if (claimed.type === 'pet' && claimed.unlockId) {
        usePetStore.getState().unlockPet(claimed.unlockId as any);
      }
      if (claimed.type === 'emote' && claimed.unlockId) {
        // Add to owned emotes without charging
        useShopStore.getState().purchaseEmote(claimed.unlockId, 0);
      }
      // title rewards handled by the PlayerTitle system later
      haptics.win();
      playSound('coin');
    }
    setVisible(false);
  };

  if (!visible || !reward) return null;

  return (
    <Modal transparent visible={visible} animationType="none">
      <View style={styles.overlay}>
        <Animated.View entering={SlideInDown.springify().damping(12)} style={styles.card}>
          <LinearGradient
            colors={['rgba(255,209,102,0.15)', 'rgba(255,140,0,0.05)', 'transparent']}
            style={styles.glow}
          />
          <Text style={styles.title}>DAILY REWARD</Text>
          <Text style={styles.streak}>Day {(currentStreak % 7) + 1} of 7</Text>

          {/* Golden glow + sparkles around reward icon */}
          <View style={styles.iconWrap}>
            <LinearGradient
              colors={['rgba(255,200,50,0.35)', 'rgba(255,160,0,0.12)', 'transparent']}
              style={styles.iconGlow}
            />
            <View style={styles.iconGlowRing} />
            <Text style={styles.icon}>{reward.icon}</Text>
            {/* Sparkle particles */}
            <RewardSparkle angle={0} delay={0} radius={48} />
            <RewardSparkle angle={60} delay={300} radius={52} />
            <RewardSparkle angle={120} delay={600} radius={46} />
            <RewardSparkle angle={180} delay={150} radius={50} />
            <RewardSparkle angle={240} delay={450} radius={48} />
            <RewardSparkle angle={300} delay={750} radius={52} />
          </View>

          <Text style={styles.rewardName}>{reward.name}</Text>
          <View style={styles.streakDots}>
            {[1,2,3,4,5,6,7].map(d => {
              const currentDay = (currentStreak % 7) + 1;
              const isActive = d <= currentDay;
              const isToday = d === currentDay;
              return (
                <View key={d} style={[
                  styles.dot,
                  isActive && styles.dotActive,
                  isToday && styles.dotToday,
                ]}>
                  {isToday && <View style={styles.dotPulseRing} />}
                  <Text style={[styles.dotText, isActive && styles.dotTextActive]}>{d}</Text>
                </View>
              );
            })}
          </View>
          <View style={styles.claimBtnWrap}>
            <GlossyButton label="CLAIM REWARD" variant="orange" onPress={handleClaim} />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', alignItems: 'center', justifyContent: 'center' },
  card: {
    width: '85%', maxWidth: 340, backgroundColor: colors.surface,
    borderRadius: 28, padding: 30, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,200,80,0.15)', overflow: 'hidden',
    shadowColor: 'rgba(255,180,0,0.3)', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1, shadowRadius: 30, elevation: 12,
  },
  glow: { ...StyleSheet.absoluteFillObject, borderRadius: 28 },
  title: {
    fontFamily: fonts.heading, fontWeight: weight.bold, fontSize: 24,
    color: colors.coinGold, letterSpacing: 3,
    textShadowColor: 'rgba(255,200,0,0.5)', textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
  streak: { fontFamily: fonts.body, fontWeight: weight.medium, fontSize: 13, color: colors.textSecondary, marginTop: 6, marginBottom: 12 },
  // Icon with golden glow
  iconWrap: {
    width: 110, height: 110, alignItems: 'center', justifyContent: 'center',
    marginBottom: 8, position: 'relative',
  },
  iconGlow: {
    ...StyleSheet.absoluteFillObject, borderRadius: 55,
  },
  iconGlowRing: {
    ...StyleSheet.absoluteFillObject, borderRadius: 55,
    borderWidth: 1.5, borderColor: 'rgba(255,200,50,0.2)',
  },
  icon: { fontSize: 56, zIndex: 2 },
  rewardName: {
    fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 22, color: '#ffffff',
    marginBottom: 18, letterSpacing: 0.5,
    textShadowColor: 'rgba(255,255,255,0.15)', textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  streakDots: { flexDirection: 'row', gap: 8, marginBottom: 22 },
  dot: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center' as const, justifyContent: 'center' as const,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.08)',
    position: 'relative' as const, overflow: 'visible' as const,
  },
  dotActive: {
    backgroundColor: colors.orange, borderColor: 'rgba(255,140,0,0.5)',
    shadowColor: colors.orange, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4, shadowRadius: 4, elevation: 2,
  },
  dotToday: {
    borderWidth: 2, borderColor: '#ffffff',
    shadowColor: colors.orange, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8, shadowRadius: 10, elevation: 6,
  },
  dotPulseRing: {
    position: 'absolute', width: 40, height: 40, borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(255,200,0,0.3)',
    top: -4, left: -4,
  },
  dotText: {
    fontFamily: fonts.body, fontWeight: weight.bold,
    fontSize: 11, color: 'rgba(255,255,255,0.3)',
  },
  dotTextActive: { color: '#ffffff' },
  claimBtnWrap: {
    width: '100%', marginTop: 4,
    shadowColor: 'rgba(255,140,0,0.5)', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1, shadowRadius: 16, elevation: 8,
  },
});
