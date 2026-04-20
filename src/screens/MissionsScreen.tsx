import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { MilestonesList } from '../components/missions/MilestonesList';
import { ChallengesScreen } from './ChallengesScreen';
import { PressScale, StaggeredEntry } from '../components/animations';
import { haptics } from '../services/haptics';
import { playSound } from '../services/audio';
import { colors } from '../theme/colors';
import { fonts, weight } from '../theme/typography';

// ═══════════════════════════════════════════════════════════════════════
// MissionsScreen — merged objectives tab
//
// Combines:
//   - Daily      → existing ChallengesScreen (daily/weekly challenges)
//   - Milestones → extracted MilestonesList (lifetime collection awards)
//
// Both answer "what should I work toward next" so living under one tab
// cleans up the bottom bar (5 tabs → 4).
//
// Structure:
//   On "Daily": renders ChallengesScreen fullbleed (it owns its own
//     ScreenBackground + title). The sub-tab switcher overlays at the top
//     so it's accessible without disturbing the existing Challenges layout.
//   On "Milestones": owns its own ScreenBackground wrapper and renders
//     MilestonesList below the switcher.
//
// CollectionScreen has been deleted (4-tab redesign) — this file plus
// CustomizeScreen now cover what Collection used to hold.
// ═══════════════════════════════════════════════════════════════════════

type MissionsTab = 'daily' | 'milestones';

export function MissionsScreen() {
  const [tab, setTab] = useState<MissionsTab>('daily');

  if (tab === 'daily') {
    // ChallengesScreen owns its own background + TopBar-less layout. We
    // overlay the switcher at the top center so users can flip to the
    // Milestones view without touching Challenges' internal structure.
    return (
      <View style={{ flex: 1 }}>
        <ChallengesScreen />
        <SubTabSwitcher tab={tab} onChange={setTab} />
      </View>
    );
  }

  return (
    <ScreenBackground scene="challenges">
      <MilestonesBody />
      <SubTabSwitcher tab={tab} onChange={setTab} />
    </ScreenBackground>
  );
}

function MilestonesBody() {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{
        paddingTop: insets.top + 56, // leave room for the floating switcher
        paddingHorizontal: 16,
        paddingBottom: 20,
      }}
      showsVerticalScrollIndicator={false}
    >
      <StaggeredEntry index={0} delay={60}>
        <MilestonesList />
      </StaggeredEntry>
    </ScrollView>
  );
}

// ─── Sub-tab switcher ────────────────────────────────────────────────
// Floating pill pair at top center, below the status bar. Absolutely
// positioned so it overlays whichever body is underneath without needing
// each body to reserve space.

function SubTabSwitcher({ tab, onChange }: { tab: MissionsTab; onChange: (t: MissionsTab) => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.switchWrap, { top: insets.top + 6 }]} pointerEvents="box-none">
      {(['daily', 'milestones'] as MissionsTab[]).map((key) => (
        <PressScale
          key={key}
          onPress={() => { haptics.tap(); playSound('click'); onChange(key); }}
          accessibilityRole="tab"
          accessibilityLabel={key === 'daily' ? 'Daily Challenges tab' : 'Milestones tab'}
          accessibilityState={{ selected: tab === key }}
        >
          <View style={[styles.switchBtn, tab === key && styles.switchBtnActive]}>
            <Text style={[styles.switchText, tab === key && styles.switchTextActive]}>
              {key === 'daily' ? 'DAILY' : 'MILESTONES'}
            </Text>
          </View>
        </PressScale>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  switchWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    zIndex: 100,
  },
  switchBtn: {
    paddingHorizontal: 18,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(10,14,32,0.82)',
  },
  switchBtnActive: {
    borderColor: colors.orange,
    backgroundColor: 'rgba(255,140,0,0.28)',
  },
  switchText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 11,
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 1.2,
  },
  switchTextActive: {
    color: '#ffffff',
  },
});
