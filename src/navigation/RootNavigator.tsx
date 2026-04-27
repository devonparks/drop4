import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
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
import { Character3DCreatorScreen } from '../screens/Character3DCreatorScreen';
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
  Character3DCreator: undefined;
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
  AmgCreator: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

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
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="ModePick" component={ModePickScreen} />
      <Stack.Screen name="Play" component={PlayScreen} />
      <Stack.Screen
        name="Matchup"
        component={MatchupScreen}
        options={{ animation: 'fade', gestureEnabled: false }}
      />
      <Stack.Screen name="LocalPlay" component={LocalPlayScreen} />
      <Stack.Screen name="CustomGame" component={CustomGameScreen} />
      <Stack.Screen name="Career" component={CareerScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="Learn" component={LearnScreen} />
      <Stack.Screen
        name="SeasonPass"
        component={SeasonPassScreen}
        options={{ animation: 'fade_from_bottom' }}
      />
      <Stack.Screen
        name="Character3DCreator"
        component={Character3DCreatorScreen}
        options={{ animation: 'fade_from_bottom' }}
      />
      <Stack.Screen
        name="Roster"
        component={RosterScreen}
        options={{ animation: 'fade_from_bottom' }}
      />
      <Stack.Screen
        name="CareerMap"
        component={CareerMapScreen}
        options={{ animation: 'fade' }}
      />
      <Stack.Screen
        name="CareerCity"
        component={CareerCityScreen}
        options={{ animation: 'fade_from_bottom' }}
      />
      <Stack.Screen
        name="Legal"
        component={LegalScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="BoardEditor"
        component={BoardEditorScreen}
        options={{ animation: 'fade_from_bottom' }}
      />
      <Stack.Screen
        name="ReplayViewer"
        component={ReplayViewerScreen}
        options={{ animation: 'fade_from_bottom' }}
      />
      <Stack.Screen
        name="LootBox"
        component={LootBoxScreen}
        options={{ animation: 'fade_from_bottom' }}
      />
      <Stack.Screen
        name="MatchHistory"
        component={MatchHistoryScreen}
        options={{ animation: 'fade_from_bottom' }}
      />
      <Stack.Screen
        name="Stats"
        component={StatsScreen}
        options={{ animation: 'fade_from_bottom' }}
      />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ animation: 'fade_from_bottom' }}
      />
      <Stack.Screen
        name="AmgCreator"
        component={AmgCharacterCreatorScreen}
        options={{ animation: 'fade_from_bottom' }}
      />
      <Stack.Screen
        name="Game"
        component={GameScreen}
        options={{
          animation: 'fade',
          gestureEnabled: false,
        }}
      />
    </Stack.Navigator>
  );
}
