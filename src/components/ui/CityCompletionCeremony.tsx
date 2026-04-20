import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Modal, Animated as RNAnimated } from 'react-native';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { GlossyButton } from './GlossyButton';
import { ConfettiOverlay } from '../effects/ConfettiOverlay';
import { useCareerStore } from '../../stores/careerStore';
import { CAREER_CITIES, ALL_CAREER_LEVELS } from '../../data/careerLevels';
import { haptics } from '../../services/haptics';
import { playSound } from '../../services/audio';
import { fonts, weight } from '../../theme/typography';

// ═══════════════════════════════════════════════════════════════════════
// CityCompletionCeremony
//
// The big "YOU CLEARED BROOKLYN" reveal moment. Fires whenever a player
// beats the boss level of a chapter (12, 24, 36). Watches careerStore's
// `cityCompletePending` flag — set by completeLevel, cleared by the
// CONTINUE button here.
//
// Mounted at App root so it fires regardless of which screen the player
// is on when the win handler completes (win-screen → Home → ceremony is
// a common path).
// ═══════════════════════════════════════════════════════════════════════

const SPECIES_DISPLAY: Record<string, { label: string; emoji: string; blurb: string }> = {
  elves: { label: 'Elven Warriors', emoji: '🏹', blurb: 'Forest archers joined your roster.' },
  goblin: { label: 'Goblin Fighters', emoji: '👺', blurb: 'Underbelly crew signed up.' },
  skeleton: { label: 'Skeleton Crew', emoji: '💀', blurb: 'The bones have awakened.' },
  zombie: { label: 'Zombie Outlaws', emoji: '🧟', blurb: "They don't stay down.".replace(/'/g, '\u2019') },
};

export function CityCompletionCeremony() {
  const pending = useCareerStore(s => s.cityCompletePending);
  const acknowledge = useCareerStore(s => s.acknowledgeCityComplete);

  const city = useMemo(() => {
    if (!pending) return null;
    return CAREER_CITIES.find(c => c.levelIds.includes(pending.bossLevelId)) ?? null;
  }, [pending]);

  const boss = useMemo(() => {
    if (!pending) return null;
    return ALL_CAREER_LEVELS.find(l => l.id === pending.bossLevelId) ?? null;
  }, [pending]);

  const stars = useCareerStore(s => (pending ? s.progress[pending.bossLevelId]?.stars ?? 0 : 0));

  // Chapter-cleared slam-in animation on the headline
  const slamScale = useRef(new RNAnimated.Value(2.5)).current;
  const slamOpacity = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    if (!pending) return;
    // Reset so re-opens replay the slam
    slamScale.setValue(2.5);
    slamOpacity.setValue(0);
    RNAnimated.parallel([
      RNAnimated.spring(slamScale, {
        toValue: 1,
        useNativeDriver: true,
        damping: 9,
        stiffness: 140,
      }),
      RNAnimated.timing(slamOpacity, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start();
    // Sound + haptic pop when the reveal fires
    playSound('level_up');
    haptics.win();
  }, [pending]);

  if (!pending || !city || !boss) return null;

  const handleContinue = () => {
    haptics.tap();
    playSound('click');
    acknowledge();
  };

  return (
    <Modal transparent visible={!!pending} animationType="fade">
      <View style={styles.overlay}>
        <LinearGradient
          colors={city.skyGradient as any}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
        {/* Dim vignette so readable on bright sunset skies */}
        <LinearGradient
          colors={['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.75)']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />

        <ConfettiOverlay visible />

        <View style={styles.container}>
          {/* Slam-in headline */}
          <RNAnimated.View
            style={{
              transform: [{ scale: slamScale }],
              opacity: slamOpacity,
              alignItems: 'center',
            }}
          >
            <Text style={[styles.kickerLabel, { color: city.accentColor }]}>CHAPTER {boss.chapter} · CLEARED</Text>
            <Text style={[styles.cityNickname, { color: city.themeColor, textShadowColor: city.themeColor + '99' }]}>
              {city.nickname.toUpperCase()}
            </Text>
            <Text style={styles.cityLocation}>{city.name}, {city.state}</Text>
          </RNAnimated.View>

          {/* 3-star summary */}
          <Animated.View entering={FadeInDown.delay(500).duration(500)} style={styles.starsRow}>
            {[0, 1, 2].map(i => (
              <Text key={i} style={[styles.star, { color: i < stars ? '#ffd700' : 'rgba(255,255,255,0.18)' }]}>★</Text>
            ))}
          </Animated.View>

          {/* Boss line — flavor */}
          <Animated.View entering={FadeInDown.delay(700).duration(500)}>
            <Text style={styles.bossLine}>
              You beat <Text style={{ color: city.accentColor, fontWeight: '900' }}>{boss.opponent}</Text>.
            </Text>
          </Animated.View>

          {/* Species unlock block — the big carrot */}
          {pending.speciesUnlocked.length > 0 && (
            <Animated.View
              entering={ZoomIn.delay(1000).duration(600).springify().damping(10)}
              style={[styles.unlockCard, { borderColor: city.themeColor, shadowColor: city.themeColor }]}
            >
              <Text style={[styles.unlockKicker, { color: city.accentColor }]}>NEW SPECIES UNLOCKED</Text>
              <View style={styles.unlockRow}>
                {pending.speciesUnlocked.map(sp => {
                  const meta = SPECIES_DISPLAY[sp];
                  if (!meta) return null;
                  return (
                    <View key={sp} style={styles.unlockChip}>
                      <Text style={styles.unlockEmoji}>{meta.emoji}</Text>
                      <Text style={styles.unlockLabel}>{meta.label}</Text>
                      <Text style={styles.unlockBlurb}>{meta.blurb}</Text>
                    </View>
                  );
                })}
              </View>
            </Animated.View>
          )}

          {/* Tagline as a prestige footer */}
          <Animated.View entering={FadeIn.delay(1400).duration(400)}>
            <Text style={styles.tagline}>{`\u201C${city.tagline}\u201D`}</Text>
          </Animated.View>

          {/* Continue button */}
          <Animated.View entering={FadeInDown.delay(1700).duration(400)} style={styles.buttonWrap}>
            <GlossyButton
              label="CONTINUE"
              variant="orange"
              onPress={handleContinue}
              icon="→"
              iconRight=""
            />
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  kickerLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.black,
    fontSize: 12,
    letterSpacing: 4,
    marginBottom: 8,
  },
  cityNickname: {
    fontFamily: fonts.heading,
    fontWeight: weight.black,
    fontSize: 48,
    letterSpacing: 2,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 18,
    textAlign: 'center',
  },
  cityLocation: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 13,
    color: 'rgba(255,255,255,0.78)',
    letterSpacing: 2,
    marginTop: 4,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 22,
  },
  star: {
    fontSize: 42,
    textShadowColor: 'rgba(255,215,0,0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  bossLine: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 16,
    textAlign: 'center',
  },
  unlockCard: {
    marginTop: 22,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 16,
    borderWidth: 2,
    paddingHorizontal: 22,
    paddingVertical: 16,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 18,
    elevation: 10,
  },
  unlockKicker: {
    fontFamily: fonts.body,
    fontWeight: weight.black,
    fontSize: 12,
    letterSpacing: 3,
    marginBottom: 10,
  },
  unlockRow: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  unlockChip: {
    alignItems: 'center',
    minWidth: 110,
  },
  unlockEmoji: {
    fontSize: 42,
    marginBottom: 6,
  },
  unlockLabel: {
    fontFamily: fonts.heading,
    fontWeight: weight.black,
    fontSize: 15,
    color: '#ffffff',
    letterSpacing: 1,
  },
  unlockBlurb: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 3,
    textAlign: 'center',
    maxWidth: 140,
    lineHeight: 14,
  },
  tagline: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 12,
    color: 'rgba(255,255,255,0.72)',
    marginTop: 22,
    fontStyle: 'italic',
    textAlign: 'center',
    maxWidth: 300,
  },
  buttonWrap: {
    marginTop: 30,
    minWidth: 200,
  },
});
