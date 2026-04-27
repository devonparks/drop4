/**
 * DailyMissionPeek — small card for the Home screen.
 *
 * Fills the dead air between the mode buttons and the bottom tab bar
 * with a real retention driver: "Today's missions — 1 of 3 done."
 *
 * Visual:
 *   [🎯]  TODAY'S MISSIONS    [progress bar]  ›
 *         1 of 3 done
 *
 * Tap → navigates to the Missions tab. Hidden when all 3 daily
 * missions are complete (the bag has been claimed) so the home
 * screen stays clean.
 */
import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { PressScale } from '../animations';
import { useChallengeStore } from '../../stores/challengeStore';
import { colors } from '../../theme/colors';
import { fonts, weight } from '../../theme/typography';
import { haptics } from '../../services/haptics';
import { playSound } from '../../services/audio';

interface Props {
  onPress?: () => void;
}

export function DailyMissionPeek({ onPress }: Props) {
  const challenges = useChallengeStore((s) => s.challenges);

  const { completed, total, nextTitle } = useMemo(() => {
    const done = challenges.filter((c) => c.completed).length;
    const upcoming = challenges.find((c) => !c.completed);
    return {
      completed: done,
      total: challenges.length,
      nextTitle: upcoming?.title ?? null,
    };
  }, [challenges]);

  // Hide when no challenges loaded yet (first frame on cold boot) or
  // when all 3 are done (player has nothing to chase). Cleaner than
  // showing a "completed!" state that no longer drives action.
  if (total === 0 || completed >= total) return null;

  const fraction = total > 0 ? completed / total : 0;

  return (
    <PressScale
      onPress={() => {
        haptics.tap();
        playSound('click');
        onPress?.();
      }}
      scaleTo={0.97}
      style={styles.card}
      accessibilityRole="button"
      accessibilityLabel={`Today's missions, ${completed} of ${total} done`}
      accessibilityHint="Open the missions tab"
    >
      <LinearGradient
        colors={['rgba(10,14,32,0.85)', 'rgba(10,14,32,0.65)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.cardGradient}
      >
        <View style={styles.iconWrap}>
          <Text style={styles.icon}>🎯</Text>
        </View>
        <View style={styles.textWrap}>
          <Text style={styles.title} numberOfLines={1}>
            {nextTitle ? `Up next: ${nextTitle}` : "Today's missions"}
          </Text>
          <View style={styles.progressRow}>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.max(fraction * 100, 4)}%` },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {completed}/{total}
            </Text>
          </View>
        </View>
        <Text style={styles.chevron}>›</Text>
      </LinearGradient>
    </PressScale>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,180,90,0.35)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 3,
  },
  cardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,180,90,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,180,90,0.3)',
  },
  icon: {
    fontSize: 18,
  },
  textWrap: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 12,
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.orange,
    borderRadius: 2,
  },
  progressText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 11,
    color: colors.orange,
    minWidth: 24,
  },
  chevron: {
    fontSize: 22,
    color: 'rgba(255,180,90,0.6)',
    fontWeight: weight.bold,
  },
});
