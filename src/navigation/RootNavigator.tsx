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

export type RootStackParamList = {
  MainTabs: undefined;
  Play: undefined;
  Game: undefined;
  LocalPlay: undefined;
  CustomGame: undefined;
  Career: undefined;
  Multiplayer: undefined;
  Stage: undefined;
  Tournament: undefined;
  Settings: undefined;
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
