import React from 'react';
import { ChallengesScreen } from './ChallengesScreen';

// ═══════════════════════════════════════════════════════════════════════
// MissionsScreen — merged objectives tab
//
// Phase 1 (this file): delegates to the existing ChallengesScreen so the
// tab rename doesn't regress any of the challenge logic / art from batch 4.
//
// Phase 2 (next commit): add a "Milestones" sub-tab that renders the old
// Collection/Awards content so daily objectives and lifetime achievements
// live under a single bottom tab.
// ═══════════════════════════════════════════════════════════════════════

export function MissionsScreen() {
  return <ChallengesScreen />;
}
