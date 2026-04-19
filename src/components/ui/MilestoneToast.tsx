/**
 * MilestoneToast — pops a celebration modal when the player crosses a
 * collection milestone (e.g. "Completed Modern Civilians!" → unlocks a title).
 *
 * Subscribes to ownedOutfits + ownedPets and computes any newly-earned
 * milestones on change. Shows them one at a time, auto-claims on tap.
 *
 * Mount this near the app root (e.g. in App.tsx alongside DailyRewardPopup)
 * so it can fire from anywhere the player unlocks a cosmetic.
 *
 * Visual treatment: pulsing orange glow + confetti on reveal + a 3D hero
 * slot that shows the player's character (or their pet for pet milestones)
 * with the reward emoji as a corner badge so the milestone's identity
 * survives. Celebrates the player, not just the payload.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  FadeIn,
  SlideInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
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
import { ConfettiOverlay } from '../effects/ConfettiOverlay';
import { Character3DPortrait } from '../3d/Character3DPortrait';
import { Pet3D } from '../3d/Pet3D';
import { PETS, STARTER_PET_ID, type PetId } from '../../data/petRegistry';

// Pet milestones celebrate the kennel, so the hero slot should show a pet.
// Everything else (pack completion, total outfits, species collector) is
// centered on the character — we render the player's current customization.
function isPetMilestone(m: CollectionMilestone): boolean {
  return typeof m.anyPetsTotal === 'number';
}

// Prefer the player's active pet (the one they've equipped) for the hero
// slot. If that's somehow null (legacy save), fall back to the most recently
// owned pet, then to the starter Labrador. Never returns undefined.
function pickShowcasePetGlb(
  activePetId: PetId | null,
  ownedPets: string[],
): number {
  if (activePetId && PETS[activePetId]) return PETS[activePetId].glb;
  for (let i = ownedPets.length - 1; i >= 0; i--) {
    const id = ownedPets[i] as PetId;
    if (PETS[id]) return PETS[id].glb;
  }
  return PETS[STARTER_PET_ID].glb;
}

export function MilestoneToast() {
  const ownedOutfits = useCharacterStore((s) => s.ownedOutfits);
  const ownedPets = usePetStore((s) => s.ownedPets);
  const activePetId = usePetStore((s) => s.activePetId);
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
    playSound('achievement');
  }, [active, queue]);

  // Continuous glow pulse while a milestone is visible. Drives shadow radius,
  // shadow opacity, and border alpha so the card breathes in orange.
  const glow = useSharedValue(0.35);
  useEffect(() => {
    if (!active) return;
    glow.value = 0.35;
    glow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.35, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
  }, [active, glow]);

  const cardGlowStyle = useAnimatedStyle(() => ({
    shadowOpacity: 0.3 + glow.value * 0.5,
    shadowRadius: 16 + glow.value * 14,
    borderColor: `rgba(255,140,0,${0.35 + glow.value * 0.55})`,
  }));

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

  const showPet = isPetMilestone(active);

  return (
    <Modal transparent visible animationType="none">
      {/* key by milestone id so confetti re-fires for each queued toast */}
      <ConfettiOverlay key={active.id} visible />
      <Animated.View entering={FadeIn.duration(180)} style={styles.overlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={handleClaim}
          accessibilityRole="button"
          accessibilityLabel="Claim milestone reward"
        />
        <Animated.View
          entering={SlideInDown.springify().damping(12)}
          style={[styles.card, cardGlowStyle]}
        >
          <LinearGradient
            colors={['rgba(255,209,102,0.2)', 'rgba(255,140,0,0.05)', 'transparent']}
            style={StyleSheet.absoluteFill}
          />
          <Text style={styles.kicker}>MILESTONE UNLOCKED</Text>

          <View style={styles.heroSlot}>
            {/* Painted sunburst backdrop — sits behind the hero character/pet
                at 70% opacity. Flux-generated, gives the milestone moment a
                theatrical "you did it!" celebration feel. */}
            <View pointerEvents="none" style={styles.burstBg}>
              <Image
                source={require('../../assets/images/ui/level-up-burst.png')}
                style={styles.burstImg}
                resizeMode="contain"
              />
            </View>
            {showPet ? (
              <Pet3D
                width={150}
                height={150}
                petGlb={pickShowcasePetGlb(activePetId, ownedPets)}
                cameraDistance={1.8}
                cameraHeight={0.45}
                autoRotate
              />
            ) : (
              <Character3DPortrait
                width={140}
                height={160}
                autoRotate
                showFloor={false}
              />
            )}
            <View style={styles.emojiBadge} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              <Text style={styles.emojiBadgeText}>{active.reward.icon}</Text>
            </View>
          </View>

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
  heroSlot: {
    width: 160, height: 160,
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
    marginTop: 4, marginBottom: 4,
  },
  burstBg: {
    position: 'absolute',
    top: -30, left: -30, right: -30, bottom: -30,
    opacity: 0.7,
  },
  burstImg: {
    width: '100%',
    height: '100%',
  },
  emojiBadge: {
    position: 'absolute',
    bottom: 0, right: 0,
    width: 44, height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(13,16,48,0.95)',
    borderWidth: 2, borderColor: 'rgba(255,140,0,0.7)',
    alignItems: 'center', justifyContent: 'center',
  },
  emojiBadgeText: {
    fontSize: 22,
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
