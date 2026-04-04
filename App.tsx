import React, { useCallback, useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
import { RootNavigator } from './src/navigation/RootNavigator';
import { PhoneFrame } from './src/components/ui/PhoneFrame';
import { colors } from './src/theme/colors';
import { preloadSounds } from './src/services/audio';
import { useShopStore } from './src/stores/shopStore';
import { useCareerStore } from './src/stores/careerStore';
import { useAchievementStore } from './src/stores/achievementStore';
import { useMatchHistoryStore } from './src/stores/matchHistoryStore';
import { useReplayStore } from './src/stores/replayStore';
import { useDailyRewardStore } from './src/stores/dailyRewardStore';
import { useRankedStore } from './src/stores/rankedStore';
import { useLootBoxStore } from './src/stores/lootBoxStore';
import { useSeasonStore } from './src/stores/seasonStore';
import { useBoardEditorStore } from './src/stores/boardEditorStore';
import { DailyRewardPopup } from './src/components/ui/DailyRewardPopup';
import { ErrorBoundary } from './src/components/ui/ErrorBoundary';
import { WelcomeOverlay } from './src/components/ui/WelcomeOverlay';

// Keep splash screen visible while loading
SplashScreen.preventAutoHideAsync();

export default function App() {
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        // Load variable fonts — each alias maps to the same file but
        // React Native will use the fontWeight style prop to pick the weight
        await Font.loadAsync({
          'Fredoka': require('./src/assets/fonts/Fredoka.ttf'),
          'Outfit': require('./src/assets/fonts/Outfit.ttf'),
        });
        // Load persisted state
        await useShopStore.getState().loadFromStorage();
        await useCareerStore.getState().loadFromStorage();
        await useAchievementStore.getState().loadFromStorage();
        await useMatchHistoryStore.getState().loadFromStorage();
        await useReplayStore.getState().loadFromStorage();
        await useDailyRewardStore.getState().loadFromStorage();
        await useRankedStore.getState().loadFromStorage();
        await useLootBoxStore.getState().loadFromStorage();
        await useSeasonStore.getState().loadFromStorage();
        await useBoardEditorStore.getState().loadFromStorage();
        // Preload sound effects
        await preloadSounds();
      } catch (e) {
        console.warn('Font loading error:', e);
      } finally {
        setAppReady(true);
      }
    }
    prepare();
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (appReady) {
      await SplashScreen.hideAsync();
    }
  }, [appReady]);

  if (!appReady) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingLogo}>DROP<Text style={styles.loadingLogo4}>4</Text></Text>
        <Text style={styles.loadingTagline}>Stack. Connect. Dominate.</Text>
        <ActivityIndicator size="small" color={colors.orange} style={{ marginTop: 20 }} />
      </View>
    );
  }

  return (
    <ErrorBoundary>
    <PhoneFrame>
    <GestureHandlerRootView style={styles.container} onLayout={onLayoutRootView}>
      <StatusBar style="light" />
      <NavigationContainer
        theme={{
          dark: true,
          colors: {
            primary: colors.orange,
            background: colors.bgDark,
            card: colors.bgDark,
            text: colors.textPrimary,
            border: 'transparent',
            notification: colors.red,
          },
          fonts: {
            regular: { fontFamily: 'Outfit', fontWeight: 'normal' },
            medium: { fontFamily: 'Outfit', fontWeight: '500' },
            bold: { fontFamily: 'Outfit', fontWeight: 'bold' },
            heavy: { fontFamily: 'Outfit', fontWeight: '800' },
          },
        }}
      >
        <RootNavigator />
        <DailyRewardPopup />
        <WelcomeOverlay />
      </NavigationContainer>
    </GestureHandlerRootView>
    </PhoneFrame>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgDark,
  },
  loading: {
    flex: 1,
    backgroundColor: colors.bgDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingLogo: {
    fontSize: 48,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 3,
  },
  loadingLogo4: {
    color: colors.orange,
    fontSize: 52,
  },
  loadingTagline: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 3,
    marginTop: 4,
  },
});
