import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
import { RootNavigator } from './src/navigation/RootNavigator';
import { PhoneFrame } from './src/components/ui/PhoneFrame';
import { colors } from './src/theme/colors';
import { preloadSounds } from './src/services/audio';
import { scheduleDailyReminders } from './src/services/notifications';
import { preloadGLBs } from './src/utils/glbLoader';
import { OUTFITS } from './src/data/outfitRegistry';
import { DEFAULT_HUMAN_IDLE } from './src/data/animationRegistry';
import { useShopStore } from './src/stores/shopStore';
import { useCareerStore } from './src/stores/careerStore';
import { useRosterStore } from './src/stores/rosterStore';
import { useAchievementStore } from './src/stores/achievementStore';
import { useMilestoneStore } from './src/stores/milestoneStore';
import { useMatchHistoryStore } from './src/stores/matchHistoryStore';
import { useReplayStore } from './src/stores/replayStore';
import { useDailyRewardStore } from './src/stores/dailyRewardStore';
import { useRankedStore } from './src/stores/rankedStore';
import { useLootBoxStore } from './src/stores/lootBoxStore';
import { useSeasonStore } from './src/stores/seasonStore';
import { useBoardEditorStore } from './src/stores/boardEditorStore';
import { useGameStore } from './src/stores/gameStore';
import { useChallengeStore } from './src/stores/challengeStore';
import { useSeriesStore } from './src/stores/seriesStore';
import { useDailySpinStore } from './src/stores/dailySpinStore';
import { useTutorialStore } from './src/stores/tutorialStore';
import { useCharacterStore } from './src/stores/characterStore';
import { usePetStore } from './src/stores/petStore';
import { DailyRewardPopup } from './src/components/ui/DailyRewardPopup';
import { MilestoneToast } from './src/components/ui/MilestoneToast';
import { CharacterUnlockToast } from './src/components/effects/CharacterUnlockToast';
import { ErrorBoundary } from './src/components/ui/ErrorBoundary';
// WelcomeOverlay is rendered in HomeScreen (first-launch only, AsyncStorage-gated)
import { SplashAnimation } from './src/components/ui/SplashAnimation';

// Keep splash screen visible while loading
SplashScreen.preventAutoHideAsync();

export default function App() {
  const [appReady, setAppReady] = useState(false);
  const navRef = useRef<NavigationContainerRef<any>>(null);

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
        await useRosterStore.getState().loadFromStorage();
        await useCareerStore.getState().loadFromStorage();
        await useAchievementStore.getState().loadFromStorage();
        await useMatchHistoryStore.getState().loadFromStorage();
        await useReplayStore.getState().loadFromStorage();
        await useDailyRewardStore.getState().loadFromStorage();
        await useRankedStore.getState().loadFromStorage();
        await useLootBoxStore.getState().loadFromStorage();
        await useSeasonStore.getState().loadFromStorage();
        await useBoardEditorStore.getState().loadFromStorage();
        await useGameStore.getState().loadFromStorage();
        await useChallengeStore.getState().loadFromStorage();
        await useSeriesStore.getState().loadFromStorage();
        await useDailySpinStore.getState().loadFromStorage();
        await useTutorialStore.getState().loadFromStorage();
        await useCharacterStore.getState().loadFromStorage();
        await usePetStore.getState().hydrate();
        await useMilestoneStore.getState().loadFromStorage();
        // Auto-refresh daily challenges if stale
        const challengeState = useChallengeStore.getState();
        const today = new Date().toDateString();
        const lastRefreshDate = new Date(challengeState.lastRefresh).toDateString();
        if (lastRefreshDate !== today) {
          challengeState.refreshChallenges();
        }
        // Preload sound effects
        await preloadSounds();

        // Schedule local daily reminder notifications (non-blocking).
        // Covers next 7 days — re-runs every app launch.
        scheduleDailyReminders().catch(() => { /* best-effort */ });

        // Preload the player's current outfit + default idle so the home
        // screen character mounts without a loading spinner. Other outfits
        // load lazily when swapped in the creator.
        try {
          const cust = useCharacterStore.getState().customization;
          const outfit = OUTFITS[cust.outfitId] ?? OUTFITS['human_modern_civilians_01'];
          const preloadList: number[] = [];
          if (outfit?.glb != null) preloadList.push(outfit.glb);
          if (DEFAULT_HUMAN_IDLE?.glb != null) preloadList.push(DEFAULT_HUMAN_IDLE.glb);
          if (preloadList.length) await preloadGLBs(preloadList);
        } catch { /* best-effort */ }
      } catch (e) {
        if (__DEV__) console.warn('Font loading error:', e);
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
    return <SplashAnimation />;
  }

  return (
    <ErrorBoundary
      onGoHome={() => {
        // Reset nav to the Home tab. If the nav ref isn't ready
        // (shouldn't happen when the app is past the splash gate, but
        // defensively anyway), we just clear the error and the user
        // stays on whatever Home renders by default.
        navRef.current?.navigate('MainTabs', { screen: 'Home' } as any);
      }}
    >
    <PhoneFrame>
    <GestureHandlerRootView style={styles.container} onLayout={onLayoutRootView}>
      <StatusBar style="light" />
      <NavigationContainer
        ref={navRef}
        onReady={() => {
          // Dev/test hook: expose navigation for the playtest bot
          if (__DEV__ && typeof window !== 'undefined') {
            (window as any).__nav = navRef.current;
          }
        }}
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
        <MilestoneToast />
        <CharacterUnlockToast />
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
});
