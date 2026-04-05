import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { SlideInDown } from 'react-native-reanimated';
import { GlossyButton } from './GlossyButton';
import { useDailyRewardStore } from '../../stores/dailyRewardStore';
import { useShopStore } from '../../stores/shopStore';
import { useLootBoxStore } from '../../stores/lootBoxStore';
import { haptics } from '../../services/haptics';
import { playSound } from '../../services/audio';
import { colors } from '../../theme/colors';
import { fonts, weight } from '../../theme/typography';

export function DailyRewardPopup() {
  const [visible, setVisible] = useState(false);
  const [reward, setReward] = useState<any>(null);
  const { checkAndShowReward, claimReward, currentStreak } = useDailyRewardStore();
  const addCoins = useShopStore(s => s.addCoins);
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
      if (claimed.type === 'lootbox') addBox(claimed.day === 7 ? 'gold_box' : 'bronze_box');
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
          <Text style={styles.icon}>{reward.icon}</Text>
          <Text style={styles.rewardName}>{reward.name}</Text>
          <View style={styles.streakDots}>
            {[1,2,3,4,5,6,7].map(d => (
              <View key={d} style={[styles.dot, d <= (currentStreak % 7) + 1 && styles.dotActive]} />
            ))}
          </View>
          <GlossyButton label="CLAIM" variant="orange" onPress={handleClaim} />
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center' },
  card: {
    width: '80%', maxWidth: 320, backgroundColor: colors.surface,
    borderRadius: 24, padding: 28, alignItems: 'center',
    borderWidth: 1, borderColor: colors.surfaceBorder, overflow: 'hidden',
  },
  glow: { ...StyleSheet.absoluteFillObject, borderRadius: 24 },
  title: { fontFamily: fonts.heading, fontWeight: weight.bold, fontSize: 22, color: colors.coinGold, letterSpacing: 2 },
  streak: { fontFamily: fonts.body, fontWeight: weight.medium, fontSize: 13, color: colors.textSecondary, marginTop: 4, marginBottom: 16 },
  icon: { fontSize: 56, marginBottom: 8 },
  rewardName: { fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 20, color: '#ffffff', marginBottom: 16 },
  streakDots: { flexDirection: 'row', gap: 6, marginBottom: 20 },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.1)' },
  dotActive: { backgroundColor: colors.orange },
});
