import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { useShopStore } from '../stores/shopStore';
import { useRosterStore } from '../stores/rosterStore';
import {
  ROSTER,
  RosterCharacter,
} from '../data/characterRoster';
import { AnimatedCharacter } from '../components/ui/AnimatedCharacter';
import { Character3DPortrait } from '../components/3d/Character3DPortrait';
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
        <Text style={styles.headerTitle}>COLLECTION</Text>
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
        {activeTab === 'awards' && <PlaceholderTab icon="🏅" title="ACHIEVEMENTS" desc="Track your achievements in the Challenges tab. Complete milestones to earn trophies and unlock titles." tip="22 achievements across 3 tiers" />}
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
      <Text style={styles.sectionTitle}>YOUR CHARACTERS</Text>
      <View style={styles.charGrid}>
        {starters.map((c, i) => (
          <StaggeredEntry key={c.id} index={i}>
            <CharCard char={c} equipped={c.id === equippedId} unlocked={unlockedIds.includes(c.id)} onEquip={() => handleEquip(c.id)} />
          </StaggeredEntry>
        ))}
      </View>

      {/* Bosses */}
      <Text style={styles.sectionTitle}>BOSS UNLOCKS</Text>
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
  return (
    <PressScale onPress={unlocked ? onEquip : undefined} disabled={!unlocked}>
      <View style={[styles.charCard, { borderColor: equipped ? colors.greenLight : 'rgba(255,255,255,0.1)' }, !unlocked && { opacity: 0.45 }]}>
        <LinearGradient
          colors={unlocked ? ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)'] : ['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.15)']}
          style={styles.charCardInner}
        >
          {unlocked ? (
            <AnimatedCharacter characterId={char.id} size={65} />
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

// ─── Placeholder tab ─────────────────────────────────────────────────
function PlaceholderTab({ icon, title, desc, tip }: { icon: string; title: string; desc: string; tip: string }) {
  return (
    <View style={styles.placeholder}>
      <Text style={{ fontSize: 48, marginBottom: 12 }}>{icon}</Text>
      <Text style={styles.placeholderTitle}>{title}</Text>
      <Text style={styles.placeholderDesc}>{desc}</Text>
      <View style={styles.placeholderTip}>
        <Text style={styles.placeholderTipText}>{tip}</Text>
      </View>
    </View>
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
