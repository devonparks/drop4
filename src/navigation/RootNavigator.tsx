import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MainTabs } from './MainTabs';
import { PlayScreen } from '../screens/PlayScreen';
import { GameScreen } from '../screens/GameScreen';
import { LocalPlayScreen } from '../screens/LocalPlayScreen';
import { CustomGameScreen } from '../screens/CustomGameScreen';
import { CareerScreen } from '../screens/CareerScreen';
import { MultiplayerScreen } from '../screens/MultiplayerScreen';
import { StageScreen } from '../screens/StageScreen';
import { TournamentScreen } from '../screens/TournamentScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { LearnScreen } from '../screens/LearnScreen';
import { SeasonPassScreen } from '../screens/SeasonPassScreen';
import { CharacterCreatorScreen } from '../screens/CharacterCreatorScreen';
import { BoardEditorScreen } from '../screens/BoardEditorScreen';
import { ReplayViewerScreen } from '../screens/ReplayViewerScreen';
import { LootBoxScreen } from '../screens/LootBoxScreen';
import { MatchHistoryScreen } from '../screens/MatchHistoryScreen';
import { SpectatorScreen } from '../screens/SpectatorScreen';

export type WagerCourtParams = {
  name: string;
  entry: number;
  winnerGets: number;
  minLevel?: number;
};

export type CareerRewardParams = {
  type: 'coins' | 'board' | 'pieces';
  amount?: number;
  id?: string;
};

export type GameParams = {
  wagerCourt?: WagerCourtParams;
  rankedMode?: boolean;
  rankedClockSeconds?: number;
  presetBoard?: number[][];
  careerLevelId?: number;
  careerLevelReward?: CareerRewardParams;
  localPlayerNames?: { player1: string; player2: string };
  // Online multiplayer
  onlineMatchId?: string;
  onlinePlayerNum?: 1 | 2;
  onlineOpponentName?: string;
};

export type RootStackParamList = {
  MainTabs: undefined;
  Play: { rankedMode?: boolean; rankedClockSeconds?: number } | undefined;
  Game: GameParams | undefined;
  LocalPlay: undefined;
  CustomGame: undefined;
  Career: undefined;
  Multiplayer: undefined;
  Stage: undefined;
  Tournament: undefined;
  Settings: undefined;
  Learn: undefined;
  SeasonPass: undefined;
  CharacterCreator: undefined;
  BoardEditor: undefined;
  ReplayViewer: undefined;
  LootBox: undefined;
  MatchHistory: undefined;
  Spectator: undefined;
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
      <Stack.Screen name="Play" component={PlayScreen} />
      <Stack.Screen name="LocalPlay" component={LocalPlayScreen} />
      <Stack.Screen name="CustomGame" component={CustomGameScreen} />
      <Stack.Screen name="Career" component={CareerScreen} />
      <Stack.Screen name="Multiplayer" component={MultiplayerScreen} />
      <Stack.Screen name="Stage" component={StageScreen} />
      <Stack.Screen name="Tournament" component={TournamentScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="Learn" component={LearnScreen} />
      <Stack.Screen name="SeasonPass" component={SeasonPassScreen} />
      <Stack.Screen name="CharacterCreator" component={CharacterCreatorScreen} />
      <Stack.Screen name="BoardEditor" component={BoardEditorScreen} />
      <Stack.Screen name="ReplayViewer" component={ReplayViewerScreen} />
      <Stack.Screen name="LootBox" component={LootBoxScreen} />
      <Stack.Screen name="MatchHistory" component={MatchHistoryScreen} />
      <Stack.Screen name="Spectator" component={SpectatorScreen} />
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
