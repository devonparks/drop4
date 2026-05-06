import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';
import { MainTabs } from './MainTabs';
import { PlayScreen } from '../screens/PlayScreen';
import { ModePickScreen } from '../screens/ModePickScreen';
import { GameScreen } from '../screens/GameScreen';
import { LocalPlayScreen } from '../screens/LocalPlayScreen';
import { CustomGameScreen } from '../screens/CustomGameScreen';
import { CareerScreen } from '../screens/CareerScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { LearnScreen } from '../screens/LearnScreen';
import { SeasonPassScreen } from '../screens/SeasonPassScreen';
import { RosterScreen } from '../screens/RosterScreen';
import { CareerMapScreen } from '../screens/CareerMapScreen';
import { CareerCityScreen } from '../screens/CareerCityScreen';
import { LegalScreen } from '../screens/LegalScreen';
import { BoardEditorScreen } from '../screens/BoardEditorScreen';
import { ReplayViewerScreen } from '../screens/ReplayViewerScreen';
import { LootBoxScreen } from '../screens/LootBoxScreen';
import { MatchHistoryScreen } from '../screens/MatchHistoryScreen';
import { StatsScreen } from '../screens/StatsScreen';
import { MatchupScreen } from '../screens/MatchupScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { CharacterCreatorScreen as AmgCharacterCreatorScreen } from '../screens/CharacterCreatorScreen';
// Customize-side cosmetic screens added in the 2026-05-03 pivot. Both
// live as stack screens (vs slide-up sheets) so the player gets a
// proper full-screen browse + filter UI for "lots of content."
import { CategoryBrowserScreen } from '../screens/CategoryBrowserScreen';
import { ShardShopScreen } from '../screens/ShardShopScreen';
import type { BrowsableCategory } from '../screens/CategoryBrowserScreen';

export type CareerRewardParams = {
  type: 'coins' | 'board' | 'pieces' | 'pet' | 'emote' | 'title';
  amount?: number;
  id?: string;
};

export type MatchupParams = {
  mode: 'casual' | 'career' | 'local';
  difficulty?: string;
  opponentName?: string;
  opponentLevel?: number;
  opponentTitle?: string;
  courtName?: string;
  connectCount?: number;
  boardSize?: string;
  timerSeconds?: number;
  careerLevelId?: number;
  careerLevelReward?: CareerRewardParams;
  careerChapter?: number;
  presetBoard?: number[][];
  localPlayerNames?: { player1: string; player2: string };
  // Phase 2 career additions:
  movesLimit?: number;       // win in ≤ N moves or lose (moves_limit levels)
  rewardMultiplier?: number; // jeopardy levels pay 3× coins
  // Career overhaul phase 1 (obstacle level type):
  obstacleCells?: Array<{ row: number; col: number }>;
  // Level-type tag forwarded so MatchupScreen can render the matching
  // badge (BLITZ / OBSTACLE / TARGET / etc.) without re-deriving it.
  levelType?: string;
};

export type GameParams = {
  presetBoard?: number[][];
  careerLevelId?: number;
  careerLevelReward?: CareerRewardParams;
  localPlayerNames?: { player1: string; player2: string };
  // 3D NPC identity — forwarded from MatchupScreen so GameScreen renders
  // the correct per-opponent 3D look (career NPCs, difficulty bots, etc.)
  opponentName?: string;
  difficulty?: string;
  // Game speed (private match)
  gameSpeed?: 'normal' | 'fast' | 'instant';
  // Series mode: wins needed to win the series (1 = no series, 2 = bo3, 3 = bo5, 4 = bo7)
  seriesWinsNeeded?: number;
  // Phase 2 career additions — forwarded from MatchupScreen.
  movesLimit?: number;
  rewardMultiplier?: number;
  // Career overhaul phase 1 (obstacle level type) — forwarded so
  // GameScreen can stamp the wall cells onto the initial board.
  obstacleCells?: Array<{ row: number; col: number }>;
};

export type RootStackParamList = {
  MainTabs: undefined;
  Play: undefined;
  Matchup: MatchupParams;
  Game: GameParams | undefined;
  LocalPlay: undefined;
  CustomGame: undefined;
  Career: undefined;
  // Devon's radical-simplification pass: Home now has a single PLAY button
  // that opens this picker for VS AI / Career / Local Play.
  ModePick: undefined;
  Settings: undefined;
  Learn: undefined;
  SeasonPass: undefined;
  Roster: undefined;
  CareerMap: undefined;
  CareerCity: { cityId: string };
  Legal: { type: 'privacy' | 'terms' | 'credits' | 'support' };
  BoardEditor: undefined;
  ReplayViewer: undefined;
  LootBox: undefined;
  MatchHistory: undefined;
  Stats: undefined;
  // Profile is now a stack screen (reached via the top-right portrait in
  // TopBar) rather than a bottom tab — the 4-tab redesign removed Profile
  // from the tab bar.
  Profile: undefined;
  // The new AMG Studios character creator (Sims-tier tabbed editor).
  // Lives in @amg/character-creator and replaces Character3DCreator
  // across every AMG game. Character state persists to
  // characterStore.amgCharacter.
  // Engine's DEFAULT_AVAILABLE_TABS is just ['body', 'color'] — face/hair/outfit
  // were intentionally pulled into the host game's Customize hub (Clothes
  // catalog + Hair / Face category browsers). Keeping the union narrow so
  // stale deep-link calls fail at compile time instead of silently snapping
  // to 'body' inside the engine.
  AmgCreator: { initialTab?: 'body' | 'color' } | undefined;
  // Customize-side cosmetic browser. Single screen handles 6 simple
  // categories (boards / pieces / drop FX / win FX / frames / pets);
  // outfits keep the OutfitsCatalog modal, emotes keep AnimationPicker.
  CategoryBrowser: { category: BrowsableCategory };
  // Spend dupe-earned shards to directly unlock specific items.
  ShardShop: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// ── Per-screen ErrorBoundary plumbing ──────────────────────────────
//
// The app is already wrapped in a root ErrorBoundary (App.tsx). That
// catch-all is great for "the entire navigator threw" but bad for
// localized failure: one screen exception nukes navigation back to the
// last good state. Adding a boundary INSIDE each Stack.Screen means a
// single screen crash leaves the navigator (and bottom tabs) intact —
// the player taps Try Again or Go Home and recovers without restarting
// the app. The root boundary still catches anything that escapes (e.g.
// a throw inside the per-screen retry UI itself).

function ScreenErrorBoundary({ children }: { children: React.ReactNode }) {
  // useNavigation is valid here because this component renders inside
  // the NavigationContainer (each Stack.Screen child does).
  const navigation = useNavigation<any>();
  return (
    <ErrorBoundary onGoHome={() => navigation.navigate('MainTabs', { screen: 'Home' })}>
      {children}
    </ErrorBoundary>
  );
}

// Cache wrapped components by source so React Navigation sees a stable
// component identity across RootNavigator re-renders. Without this,
// every re-render hands React Navigation a fresh component, which
// would defeat its memoization and force a full screen remount.
const _safeCache = new WeakMap<React.ComponentType<any>, React.ComponentType<any>>();

// Returns ComponentType<any> rather than ComponentType<P> because React
// Navigation's ScreenComponentType is a wider union that accepts loose
// prop shapes — preserving P would cause its inference to reject the
// wrapped component (the screen's `navigation` prop is auto-injected by
// the navigator and shouldn't be required by the call site).
function safe<P extends object>(Component: React.ComponentType<P>): React.ComponentType<any> {
  let cached = _safeCache.get(Component);
  if (!cached) {
    const Safe = (props: P) => (
      <ScreenErrorBoundary>
        <Component {...props} />
      </ScreenErrorBoundary>
    );
    Safe.displayName = `Safe(${Component.displayName || Component.name || 'Anon'})`;
    cached = Safe as React.ComponentType<any>;
    _safeCache.set(Component, cached);
  }
  return cached;
}

export function RootNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        gestureEnabled: true,
        contentStyle: { backgroundColor: '#0a0e27' },
      }}
    >
      <Stack.Screen name="MainTabs" component={safe(MainTabs)} />
      <Stack.Screen name="ModePick" component={safe(ModePickScreen)} />
      <Stack.Screen name="Play" component={safe(PlayScreen)} />
      <Stack.Screen
        name="Matchup"
        component={safe(MatchupScreen)}
        options={{ animation: 'fade', gestureEnabled: false }}
      />
      <Stack.Screen name="LocalPlay" component={safe(LocalPlayScreen)} />
      <Stack.Screen name="CustomGame" component={safe(CustomGameScreen)} />
      <Stack.Screen name="Career" component={safe(CareerScreen)} />
      <Stack.Screen name="Settings" component={safe(SettingsScreen)} />
      <Stack.Screen name="Learn" component={safe(LearnScreen)} />
      <Stack.Screen
        name="SeasonPass"
        component={safe(SeasonPassScreen)}
        options={{ animation: 'fade_from_bottom' }}
      />
      <Stack.Screen
        name="Roster"
        component={safe(RosterScreen)}
        options={{ animation: 'fade_from_bottom' }}
      />
      <Stack.Screen
        name="CareerMap"
        component={safe(CareerMapScreen)}
        options={{ animation: 'fade' }}
      />
      <Stack.Screen
        name="CareerCity"
        component={safe(CareerCityScreen)}
        options={{ animation: 'fade_from_bottom' }}
      />
      <Stack.Screen
        name="Legal"
        component={safe(LegalScreen)}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="BoardEditor"
        component={safe(BoardEditorScreen)}
        options={{ animation: 'fade_from_bottom' }}
      />
      <Stack.Screen
        name="ReplayViewer"
        component={safe(ReplayViewerScreen)}
        options={{ animation: 'fade_from_bottom' }}
      />
      <Stack.Screen
        name="LootBox"
        component={safe(LootBoxScreen)}
        options={{ animation: 'fade_from_bottom' }}
      />
      <Stack.Screen
        name="MatchHistory"
        component={safe(MatchHistoryScreen)}
        options={{ animation: 'fade_from_bottom' }}
      />
      <Stack.Screen
        name="Stats"
        component={safe(StatsScreen)}
        options={{ animation: 'fade_from_bottom' }}
      />
      <Stack.Screen
        name="Profile"
        component={safe(ProfileScreen)}
        options={{ animation: 'fade_from_bottom' }}
      />
      <Stack.Screen
        name="AmgCreator"
        component={safe(AmgCharacterCreatorScreen)}
        options={{ animation: 'fade_from_bottom' }}
      />
      <Stack.Screen
        name="CategoryBrowser"
        component={safe(CategoryBrowserScreen)}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="ShardShop"
        component={safe(ShardShopScreen)}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="Game"
        component={safe(GameScreen)}
        options={{
          animation: 'fade',
          gestureEnabled: false,
        }}
      />
    </Stack.Navigator>
  );
}
