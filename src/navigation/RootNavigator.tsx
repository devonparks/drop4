import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MainTabs } from './MainTabs';
import { PlayScreen } from '../screens/PlayScreen';
import { GameScreen } from '../screens/GameScreen';

export type RootStackParamList = {
  MainTabs: undefined;
  Play: undefined;
  Game: undefined;
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
      <Stack.Screen
        name="Game"
        component={GameScreen}
        options={{
          animation: 'fade',
          gestureEnabled: false, // Don't accidentally swipe back mid-game
        }}
      />
    </Stack.Navigator>
  );
}
