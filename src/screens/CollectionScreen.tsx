import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { useRosterStore } from '../stores/rosterStore';
import { useCharacterStore } from '../stores/characterStore';
import { usePetStore } from '../stores/petStore';
import { useMilestoneStore } from '../stores/milestoneStore';
import { getMilestoneProgressList, type MilestoneProgress } from '../data/collectionMilestones';
import {
  ROSTER,
  RosterCharacter,
} from '../data/characterRoster';
import { AnimatedCharacter } from '../components/ui/AnimatedCharacter';
import { Character3DPortrait } from '../components/3d/Character3DPortrait';
import { getRosterCustomization } from '../data/npcCustomizations';
import { FEATURES } from '../config/features';
import { haptics } from '../services/haptics';
import { PressScale, StaggeredEntry } from '../components/animations';
import { colors } from '../theme/colors';
import { fonts, weight } from '../theme/typography';

// ═══════════════════════════════════════════════════════════════════════
// CollectionScreen — "🎒 Collection" tab
//
// Sub-tabs: Characters / Loot / Awards
// Characters shows playable roster (starters + boss unlocks).
// Loot and Awards are placeholders for v1 — link to full screens later.
// ═══════════════════════════════════════════════════════════════════════

type SubTab = 'characters' | 'loot' | 'awards';

export function CollectionScreen() {
  const [activeTab, setActiveTab] = useState<SubTab>('characters');
  const insets = useSafeAreaInsets();

  return (
    <ScreenBackground>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Text style={styles.headerTitle} accessibilityRole="header">COLLECTION</Text>
      </View>

      {/* Sub-tab bar */}
      <View style={styles.tabRow}>
        {([
          { id: 'characters' as SubTab, icon: '👥', label: 'Characters' },
          { id: 'loot' as SubTab, icon: '📦', label: 'Loot' },
          { id: 'awards' as SubTab, icon: '🏅', label: 'Awards' },
        ]).map((tab) => (
          <Pressable
            key={tab.id}
            onPress={() => { haptics.tap(); setActiveTab(tab.id); }}
            style={[styles.tab, activeTab === tab.id && styles.tabActive]}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected: activeTab === tab.id }}
          >
            <Text style={styles.tabIcon}>{tab.icon}</Text>
            <Text style={[styles.tabLabel, activeTab === tab.id && styles.tabLabelActive]}>
              {tab.label}
            </Text>
            {activeTab === tab.id && <View style={styles.tabIndicator} />}
          </Pressable>
        ))}
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentInner}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'characters' && <CharactersTab />}
        {activeTab === 'loot' && <PlaceholderTab icon="📦" title="LOOT BOXES" desc="Win games to earn loot boxes. Open them for coins, board skins, and rare cosmetics." tip="Win 3 games → earn a Bronze Box" />}
        {activeTab === 'awards' && <AwardsTab />}
      </ScrollView>
    </ScreenBackground>
  );
}

// ─── Characters tab ──────────────────────────────────────────────────
function CharactersTab() {
  const equippedId = useRosterStore((s) => s.equippedCharacterId);
  const unlockedIds = useRosterStore((s) => s.unlockedCharacterIds);
  const equipCharacter = useRosterStore((s) => s.equipCharacter);

  const starters = ROSTER.filter((c) => c.unlockedAtCareerLevel == null);
  const bosses = ROSTER.filter((c) => c.isBoss);
  const equipped = ROSTER.find((c) => c.id === equippedId);

  const handleEquip = (id: string) => {
    if (id === equippedId) return;
    haptics.tap();
    equipCharacter(id);
  };

  return (
    <View>
      {/* Equipped character hero */}
      <View style={styles.heroCard}>
        <LinearGradient
          colors={['rgba(255,140,0,0.15)', 'rgba(255,140,0,0.03)']}
          style={styles.heroGradient}
        >
          {FEATURES.character3D
            ? <Character3DPortrait width={160} height={200} showFloor={false} />
            : <AnimatedCharacter size={160} />}
          <Text style={styles.heroName}>{equipped?.name.toUpperCase() || 'ROOKIE'}</Text>
          <Text style={styles.heroTitle}>{equipped?.title || 'The Newcomer'}</Text>
        </LinearGradient>
      </View>

      {/* Starters */}
      <Text style={styles.sectionTitle} accessibilityRole="header">YOUR CHARACTERS</Text>
      <View style={styles.charGrid}>
        {starters.map((c, i) => (
          <StaggeredEntry key={c.id} index={i}>
            <CharCard char={c} equipped={c.id === equippedId} unlocked={unlockedIds.includes(c.id)} onEquip={() => handleEquip(c.id)} />
          </StaggeredEntry>
        ))}
      </View>

      {/* Bosses */}
      <Text style={styles.sectionTitle} accessibilityRole="header">BOSS UNLOCKS</Text>
      <Text style={styles.sectionSub}>Beat chapter bosses to unlock</Text>
      <View style={styles.charGrid}>
        {bosses.map((c, i) => (
          <StaggeredEntry key={c.id} index={i}>
            <CharCard char={c} equipped={c.id === equippedId} unlocked={unlockedIds.includes(c.id)} onEquip={() => handleEquip(c.id)} />
          </StaggeredEntry>
        ))}
      </View>
    </View>
  );
}

// ─── Character card ──────────────────────────────────────────────────
function CharCard({ char, equipped, unlocked, onEquip }: {
  char: RosterCharacter; equipped: boolean; unlocked: boolean; onEquip: () => void;
}) {
  const a11yLabel = unlocked
    ? `${char.name}${char.isBoss ? ' (boss)' : ''}${equipped ? ', equipped' : ''}`
    : 'Locked character';
  const a11yHint = !unlocked
    ? 'Beat the chapter boss to unlock'
    : equipped
    ? 'Already equipped'
    : 'Equip this character';
  return (
    <PressScale
      onPress={unlocked ? onEquip : undefined}
      disabled={!unlocked}
      accessibilityLabel={a11yLabel}
      accessibilityHint={a11yHint}
    >
      <View style={[styles.charCard, { borderColor: equipped ? colors.greenLight : 'rgba(255,255,255,0.1)' }, !unlocked && { opacity: 0.45 }]}>
        <LinearGradient
          colors={unlocked ? ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)'] : ['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.15)']}
          style={styles.charCardInner}
        >
          {unlocked ? (
            FEATURES.character3D
              ? <Character3DPortrait width={65} height={80} customization={getRosterCustomization(char.id) ?? undefined} showFloor={false} />
              : <AnimatedCharacter characterId={char.id} size={65} />
          ) : (
            <Text style={{ fontSize: 26, opacity: 0.6 }}>🔒</Text>
          )}
          <Text style={[styles.charName, !unlocked && { color: 'rgba(255,255,255,0.35)' }]} numberOfLines={1}>
            {unlocked ? char.name : '???'}
          </Text>
          {equipped && (
            <View style={styles.equippedPill}>
              <Text style={styles.equippedPillText}>EQUIPPED</Text>
            </View>
          )}
          {char.isBoss && unlocked && <Text style={styles.bossLabel}>👑 BOSS</Text>}
        </LinearGradient>
      </View>
    </PressScale>
  );
}

// ─── Awards tab ──────────────────────────────────────────────────────
// Shows every collection milestone with a progress bar, ordered so the
// player always sees what's most imminently within reach first.
//   1. Earned but unclaimed (the player owes themselves a tap on the toast)
//   2. In-progress, highest fraction first — "you're 80% of the way to this"
//   3. Claimed already (accomplishments, dimmed)
//   4. Not started — full catalog visible so the ladder is legible
function AwardsTab() {
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
      <View style={awardStyles.summary}>
        <LinearGradient
          colors={['rgba(255,140,0,0.18)', 'rgba(255,140,0,0.03)']}
          style={awardStyles.summaryInner}
        >
          <Text style={awardStyles.summaryKicker}>MILESTONES</Text>
          <Text style={awardStyles.summaryBig}>
            {claimedCount}
            <Text style={awardStyles.summarySmall}> / {total}</Text>
          </Text>
          <Text style={awardStyles.summaryHint}>
            Complete a pack or collect enough outfits / pets to unlock exclusive titles + rewards.
          </Text>
        </LinearGradient>
      </View>

      {earnedUnclaimed.length > 0 && (
        <MilestoneSection title="READY TO CLAIM" emoji="✨" items={earnedUnclaimed} />
      )}
      {inProgress.length > 0 && (
        <MilestoneSection title="IN PROGRESS" emoji="🎯" items={inProgress} />
      )}
      {claimed.length > 0 && (
        <MilestoneSection title="UNLOCKED" emoji="🏆" items={claimed} dimmed />
      )}
      {notStarted.length > 0 && (
        <MilestoneSection title="LOCKED" emoji="🔒" items={notStarted} dimmed />
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
      <Text style={awardStyles.sectionHeader}>
        <Text>{emoji}  </Text>
        <Text>{title}</Text>
        <Text style={awardStyles.sectionCount}>  ({items.length})</Text>
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
      style={[awardStyles.row, dimmed && awardStyles.rowDim]}
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
      <Text style={awardStyles.rowIcon}>{m.reward.icon}</Text>
      <View style={awardStyles.rowBody}>
        <View style={awardStyles.rowTitleLine}>
          <Text style={awardStyles.rowTitle} numberOfLines={1}>{m.name}</Text>
          {claimed && <Text style={awardStyles.rowClaimedTag}>CLAIMED</Text>}
          {complete && !claimed && <Text style={awardStyles.rowReadyTag}>READY</Text>}
        </View>
        <Text style={awardStyles.rowDesc} numberOfLines={2}>{m.description}</Text>
        <View style={awardStyles.progressTrack}>
          <View
            style={[
              awardStyles.progressFill,
              { width: `${Math.round(fraction * 100)}%` },
              claimed && awardStyles.progressFillClaimed,
              complete && !claimed && awardStyles.progressFillReady,
            ]}
          />
        </View>
        <View style={awardStyles.rowMetaLine}>
          <Text style={awardStyles.rowProgress}>{current} / {required}</Text>
          <Text style={awardStyles.rowReward} numberOfLines={1}>🎁 {m.reward.name}</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Placeholder tab ─────────────────────────────────────────────────
function PlaceholderTab({ icon, title, desc, tip }: { icon: string; title: string; desc: string; tip: string }) {
  return (
    <Animated.View entering={FadeIn.duration(280)} style={styles.placeholder}>
      <Text style={{ fontSize: 48, marginBottom: 12 }}>{icon}</Text>
      <Text style={styles.placeholderTitle}>{title}</Text>
      <Text style={styles.placeholderDesc}>{desc}</Text>
      <View style={styles.placeholderTip}>
        <Text style={styles.placeholderTipText}>{tip}</Text>
      </View>
    </Animated.View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  header: { alignItems: 'center', paddingBottom: 6 },
  headerTitle: { fontFamily: fonts.heading, fontWeight: weight.black, fontSize: 22, color: '#ffffff', letterSpacing: 2 },

  tabRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 4, marginBottom: 8 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10, position: 'relative' },
  tabActive: {},
  tabIcon: { fontSize: 18 },
  tabLabel: { fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 2, letterSpacing: 0.5 },
  tabLabelActive: { color: colors.orange },
  tabIndicator: { position: 'absolute', bottom: 0, width: 24, height: 3, borderRadius: 2, backgroundColor: colors.orange },

  content: { flex: 1 },
  contentInner: { paddingHorizontal: 16, paddingBottom: 40 },

  heroCard: { borderRadius: 20, overflow: 'hidden', marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,140,0,0.25)' },
  heroGradient: { alignItems: 'center', paddingVertical: 14 },
  heroName: { fontFamily: fonts.heading, fontWeight: weight.black, fontSize: 18, color: '#ffffff', marginTop: 4, letterSpacing: 1 },
  heroTitle: { fontFamily: fonts.body, fontSize: 11, color: colors.orange, marginTop: 2 },

  sectionTitle: { fontFamily: fonts.body, fontWeight: weight.black, fontSize: 12, color: '#ffffff', letterSpacing: 1.5, marginTop: 8, marginBottom: 4 },
  sectionSub: { fontFamily: fonts.body, fontSize: 10, color: colors.textMuted, marginBottom: 8 },

  charGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  charCard: {
    flexBasis: '30%', flexGrow: 1, minWidth: 95, maxWidth: 130,
    borderRadius: 16, borderWidth: 1.5, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 3,
  },
  charCardInner: { alignItems: 'center', paddingVertical: 10, paddingHorizontal: 6, minHeight: 110, justifyContent: 'center' },
  charName: { fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 11, color: '#ffffff', textAlign: 'center', marginTop: 4 },
  equippedPill: { marginTop: 4, backgroundColor: colors.green, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  equippedPillText: { fontFamily: fonts.body, fontWeight: weight.black, fontSize: 8, color: '#ffffff', letterSpacing: 0.8 },
  bossLabel: { fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 9, color: colors.coinGold, marginTop: 3 },

  placeholder: { alignItems: 'center', paddingVertical: 40 },
  placeholderTitle: { fontFamily: fonts.heading, fontWeight: weight.black, fontSize: 16, color: '#ffffff', letterSpacing: 2 },
  placeholderDesc: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, textAlign: 'center', marginTop: 8, paddingHorizontal: 30, lineHeight: 18 },
  placeholderTip: { marginTop: 16, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: 'rgba(255,140,0,0.1)', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,140,0,0.25)' },
  placeholderTipText: { fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 11, color: colors.orange },
});

const awardStyles = StyleSheet.create({
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
  sectionCount: {
    color: colors.textMuted, fontWeight: weight.bold,
  },

  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14, padding: 10, marginBottom: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  rowDim: { opacity: 0.72 },
  rowIcon: {
    fontSize: 26, width: 40, textAlign: 'center',
  },
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
