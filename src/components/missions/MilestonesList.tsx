import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useCharacterStore } from '../../stores/characterStore';
import { usePetStore } from '../../stores/petStore';
import { useMilestoneStore } from '../../stores/milestoneStore';
import { getMilestoneProgressList, type MilestoneProgress } from '../../data/collectionMilestones';
import { StaggeredEntry } from '../animations';
import { colors } from '../../theme/colors';
import { fonts, weight } from '../../theme/typography';

// ═══════════════════════════════════════════════════════════════════════
// MilestonesList — lifetime collection milestones
//
// Lifetime collection milestones — summary + sections broken down by
// Ready-to-Claim / In-Progress / Unlocked / Locked. Originally lived as
// the Awards sub-tab inside the old CollectionScreen; moved here when
// the 4-tab redesign collapsed Collection into Customize + Missions.
//
// Renders:
//   - Summary card (X / total milestones claimed)
//   - "Ready to Claim" section (earned but not yet tapped)
//   - "In Progress" section (some progress)
//   - "Unlocked" section (claimed — dimmed)
//   - "Locked" section (zero progress — dimmed)
// ═══════════════════════════════════════════════════════════════════════

export function MilestonesList() {
  const ownedOutfits = useCharacterStore((s) => s.ownedOutfits);
  const ownedPets = usePetStore((s) => s.ownedPets);
  const claimedIds = useMilestoneStore((s) => s.claimedIds);

  const { earnedUnclaimed, inProgress, claimed, notStarted, total, claimedCount } = useMemo(() => {
    const list = getMilestoneProgressList(ownedOutfits, ownedPets, claimedIds);
    const earnedUnclaimed: MilestoneProgress[] = [];
    const inProgress: MilestoneProgress[] = [];
    const claimed: MilestoneProgress[] = [];
    const notStarted: MilestoneProgress[] = [];
    for (const p of list) {
      if (p.complete && !p.claimed) earnedUnclaimed.push(p);
      else if (p.claimed) claimed.push(p);
      else if (p.current > 0) inProgress.push(p);
      else notStarted.push(p);
    }
    inProgress.sort((a, b) => b.fraction - a.fraction);
    return {
      earnedUnclaimed,
      inProgress,
      claimed,
      notStarted,
      total: list.length,
      claimedCount: list.filter((p) => p.claimed).length,
    };
  }, [ownedOutfits, ownedPets, claimedIds]);

  return (
    <Animated.View entering={FadeIn.duration(220)}>
      {/* Summary header */}
      <View style={styles.summary}>
        <LinearGradient
          colors={['rgba(255,140,0,0.18)', 'rgba(255,140,0,0.03)']}
          style={styles.summaryInner}
        >
          <Text style={styles.summaryKicker}>MILESTONES</Text>
          <Text style={styles.summaryBig}>
            {claimedCount}
            <Text style={styles.summarySmall}> / {total}</Text>
          </Text>
          <Text style={styles.summaryHint}>
            Complete a pack or collect enough outfits / pets to unlock exclusive titles + rewards.
          </Text>
        </LinearGradient>
      </View>

      {earnedUnclaimed.length > 0 && (
        <MilestoneSection title="READY TO CLAIM" emoji={'\u2728'} items={earnedUnclaimed} />
      )}
      {inProgress.length > 0 && (
        <MilestoneSection title="IN PROGRESS" emoji={String.fromCodePoint(0x1F3AF)} items={inProgress} />
      )}
      {claimed.length > 0 && (
        <MilestoneSection title="UNLOCKED" emoji={String.fromCodePoint(0x1F3C6)} items={claimed} dimmed />
      )}
      {notStarted.length > 0 && (
        <MilestoneSection title="LOCKED" emoji={String.fromCodePoint(0x1F512)} items={notStarted} dimmed />
      )}
    </Animated.View>
  );
}

function MilestoneSection({
  title, emoji, items, dimmed,
}: {
  title: string; emoji: string; items: MilestoneProgress[]; dimmed?: boolean;
}) {
  return (
    <View style={{ marginBottom: 8 }}>
      <Text style={styles.sectionHeader}>
        <Text>{emoji}  </Text>
        <Text>{title}</Text>
        <Text style={styles.sectionCount}>  ({items.length})</Text>
      </Text>
      {items.map((p, i) => (
        <StaggeredEntry key={p.milestone.id} index={i} delay={35}>
          <MilestoneRow progress={p} dimmed={dimmed} />
        </StaggeredEntry>
      ))}
    </View>
  );
}

function MilestoneRow({ progress, dimmed }: { progress: MilestoneProgress; dimmed?: boolean }) {
  const { milestone: m, current, required, fraction, complete, claimed } = progress;
  return (
    <View
      style={[styles.row, dimmed && styles.rowDim]}
      accessible
      accessibilityRole="summary"
      accessibilityLabel={
        claimed
          ? `${m.name} unlocked, reward ${m.reward.name}`
          : complete
          ? `${m.name} ready to claim, reward ${m.reward.name}`
          : `${m.name}, ${current} of ${required}, reward ${m.reward.name}`
      }
    >
      <Text style={styles.rowIcon}>{m.reward.icon}</Text>
      <View style={styles.rowBody}>
        <View style={styles.rowTitleLine}>
          <Text style={styles.rowTitle} numberOfLines={1}>{m.name}</Text>
          {claimed && <Text style={styles.rowClaimedTag}>CLAIMED</Text>}
          {complete && !claimed && <Text style={styles.rowReadyTag}>READY</Text>}
        </View>
        <Text style={styles.rowDesc} numberOfLines={2}>{m.description}</Text>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${Math.round(fraction * 100)}%` },
              claimed && styles.progressFillClaimed,
              complete && !claimed && styles.progressFillReady,
            ]}
          />
        </View>
        <View style={styles.rowMetaLine}>
          <Text style={styles.rowProgress}>{current} / {required}</Text>
          <Text style={styles.rowReward} numberOfLines={1}>{String.fromCodePoint(0x1F381)} {m.reward.name}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  summary: {
    borderRadius: 20, overflow: 'hidden', marginBottom: 14,
    borderWidth: 1, borderColor: 'rgba(255,140,0,0.25)',
  },
  summaryInner: { alignItems: 'center', paddingVertical: 16, paddingHorizontal: 16 },
  summaryKicker: {
    fontFamily: fonts.body, fontWeight: weight.black, fontSize: 10,
    color: colors.orange, letterSpacing: 2,
  },
  summaryBig: {
    fontFamily: fonts.heading, fontWeight: weight.black, fontSize: 38,
    color: '#ffffff', marginTop: 2,
  },
  summarySmall: { fontSize: 18, color: colors.textSecondary, fontWeight: weight.bold },
  summaryHint: {
    fontFamily: fonts.body, fontSize: 11, color: colors.textMuted,
    textAlign: 'center', marginTop: 6, paddingHorizontal: 8, lineHeight: 15,
  },

  sectionHeader: {
    fontFamily: fonts.body, fontWeight: weight.black, fontSize: 11,
    color: '#ffffff', letterSpacing: 1.4, marginTop: 8, marginBottom: 6,
  },
  sectionCount: { color: colors.textMuted, fontWeight: weight.bold },

  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14, padding: 10, marginBottom: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  rowDim: { opacity: 0.72 },
  rowIcon: { fontSize: 26, width: 40, textAlign: 'center' },
  rowBody: { flex: 1, marginLeft: 8 },
  rowTitleLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowTitle: {
    fontFamily: fonts.heading, fontWeight: weight.bold, fontSize: 13,
    color: '#ffffff', flexShrink: 1,
  },
  rowClaimedTag: {
    fontFamily: fonts.body, fontWeight: weight.black, fontSize: 8,
    color: '#0d1030', backgroundColor: colors.greenLight,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5,
    letterSpacing: 0.8, overflow: 'hidden',
  },
  rowReadyTag: {
    fontFamily: fonts.body, fontWeight: weight.black, fontSize: 8,
    color: '#0d1030', backgroundColor: colors.orange,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5,
    letterSpacing: 0.8, overflow: 'hidden',
  },
  rowDesc: {
    fontFamily: fonts.body, fontSize: 11, color: colors.textMuted,
    marginTop: 1, lineHeight: 15,
  },
  progressTrack: {
    marginTop: 6, height: 5, borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden',
  },
  progressFill: {
    height: '100%', backgroundColor: colors.orange, borderRadius: 3,
  },
  progressFillReady: { backgroundColor: colors.orange },
  progressFillClaimed: { backgroundColor: colors.greenLight },
  rowMetaLine: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginTop: 4, gap: 8,
  },
  rowProgress: {
    fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 10,
    color: colors.textSecondary,
  },
  rowReward: {
    fontFamily: fonts.body, fontSize: 10, color: colors.orange,
    fontWeight: weight.bold, flexShrink: 1, textAlign: 'right',
  },
});
