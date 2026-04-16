/**
 * MilestoneToast — pops a celebration modal when the player crosses a
 * collection milestone (e.g. "Completed Modern Civilians!" → unlocks a title).
 *
 * Subscribes to ownedOutfits + ownedPets and computes any newly-earned
 * milestones on change. Shows them one at a time, auto-claims on tap.
 *
 * Mount this near the app root (e.g. in App.tsx alongside DailyRewardPopup)
 * so it can fire from anywhere the player unlocks a cosmetic.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { useCharacterStore } from '../../stores/characterStore';
import { usePetStore } from '../../stores/petStore';
import { useShopStore } from '../../stores/shopStore';
import { useMilestoneStore } from '../../stores/milestoneStore';
import {
  getNewlyEarnedMilestones,
  type CollectionMilestone,
} from '../../data/collectionMilestones';
import { haptics } from '../../services/haptics';
import { playSound } from '../../services/audio';
import { colors } from '../../theme/colors';
import { fonts, weight } from '../../theme/typography';

export function MilestoneToast() {
  const ownedOutfits = useCharacterStore((s) => s.ownedOutfits);
  const ownedPets = usePetStore((s) => s.ownedPets);
  const claimedIds = useMilestoneStore((s) => s.claimedIds);
  const claimMilestone = useMilestoneStore((s) => s.claim);
  const unlockTitle = useMilestoneStore((s) => s.unlockTitle);
  const addCoins = useShopStore((s) => s.addCoins);

  const [queue, setQueue] = useState<CollectionMilestone[]>([]);
  const [active, setActive] = useState<CollectionMilestone | null>(null);

  const earned = useMemo(
    () => getNewlyEarnedMilestones(ownedOutfits, ownedPets, claimedIds),
    [ownedOutfits, ownedPets, claimedIds],
  );

  // When newly-earned milestones appear, append to queue
  useEffect(() => {
    if (earned.length === 0) return;
    setQueue((q) => {
      const existingIds = new Set([...q.map((m) => m.id), active?.id].filter(Boolean));
      const fresh = earned.filter((m) => !existingIds.has(m.id));
      return [...q, ...fresh];
    });
  }, [earned, active]);

  // Pop the next one from the queue if nothing is active
  useEffect(() => {
    if (active || queue.length === 0) return;
    setActive(queue[0]);
    setQueue((q) => q.slice(1));
  }, [active, queue]);

  if (!active) return null;

  const handleClaim = () => {
    haptics.win();
    playSound('level_up');
    claimMilestone(active.id);

    // Grant the reward payload
    if (active.reward.type === 'coins' && typeof active.reward.value === 'number') {
      addCoins(active.reward.value);
    }
    if (active.reward.type === 'title' && typeof active.reward.value === 'string') {
      unlockTitle(active.reward.value);
    }
    // Hair color + emote rewards land via their respective stores
    // (extend handleClaim when more milestones add those types).

    setActive(null);
  };

  return (
    <Modal transparent visible animationType="none">
      <Animated.View entering={FadeIn.duration(180)} style={styles.overlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={handleClaim}
          accessibilityRole="button"
          accessibilityLabel="Claim milestone reward"
        />
        <Animated.View entering={SlideInDown.springify().damping(12)} style={styles.card}>
          <LinearGradient
            colors={['rgba(255,209,102,0.2)', 'rgba(255,140,0,0.05)', 'transparent']}
            style={StyleSheet.absoluteFill}
          />
          <Text style={styles.kicker}>MILESTONE UNLOCKED</Text>
          <Text style={styles.icon}>{active.reward.icon}</Text>
          <Text style={styles.title}>{active.name}</Text>
          <Text style={styles.description}>{active.description}</Text>

          <View style={styles.rewardBox}>
            <Text style={styles.rewardLabel}>REWARD</Text>
            <Text style={styles.rewardName}>{active.reward.name}</Text>
          </View>

          <Pressable
            onPress={handleClaim}
            style={styles.button}
            accessibilityRole="button"
            accessibilityLabel={`Claim ${active.reward.name}`}
          >
            <LinearGradient
              colors={['#ff8c00', '#cc5500']}
              style={StyleSheet.absoluteFill}
            />
            <Text style={styles.buttonText}>CLAIM</Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center', justifyContent: 'center', padding: 20,
  },
  card: {
    width: '100%', maxWidth: 360,
    backgroundColor: '#0d1030', borderRadius: 24, padding: 24,
    alignItems: 'center', gap: 12,
    borderWidth: 1.5, borderColor: 'rgba(255,140,0,0.4)',
    shadowColor: '#ff8c00', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5, shadowRadius: 20, elevation: 20,
    overflow: 'hidden',
  },
  kicker: {
    fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 11,
    color: colors.orange, letterSpacing: 2,
  },
  icon: {
    fontSize: 56, marginTop: 4,
  },
  title: {
    fontFamily: fonts.heading, fontWeight: weight.bold, fontSize: 22,
    color: '#fff', letterSpacing: 1, textAlign: 'center',
  },
  description: {
    fontFamily: fonts.body, fontSize: 13,
    color: colors.textSecondary, textAlign: 'center',
  },
  rewardBox: {
    marginTop: 8, paddingVertical: 10, paddingHorizontal: 20,
    borderRadius: 14, alignItems: 'center',
    backgroundColor: 'rgba(255,140,0,0.15)',
    borderWidth: 1, borderColor: 'rgba(255,140,0,0.3)',
  },
  rewardLabel: {
    fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 10,
    color: colors.orange, letterSpacing: 2, marginBottom: 2,
  },
  rewardName: {
    fontFamily: fonts.heading, fontWeight: weight.bold, fontSize: 16,
    color: '#fff', letterSpacing: 0.5,
  },
  button: {
    width: '100%', borderRadius: 14, paddingVertical: 14,
    alignItems: 'center', marginTop: 4, overflow: 'hidden',
  },
  buttonText: {
    fontFamily: fonts.heading, fontWeight: weight.bold, fontSize: 16,
    color: '#fff', letterSpacing: 1.5,
  },
});
