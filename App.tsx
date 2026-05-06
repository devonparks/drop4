import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { AppState, StyleSheet } from 'react-native';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
import { RootNavigator } from './src/navigation/RootNavigator';
import { PhoneFrame } from './src/components/ui/PhoneFrame';
import { colors } from './src/theme/colors';
import { preloadSounds } from './src/services/audio';
import { seedDrop4Variants } from './src/services/seedDrop4Variants';
import { scheduleDailyReminders, scheduleSpinReminderIn, cancelSpinReminder } from './src/services/notifications';
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
import { useDailySpinStore } from './src/stores/dailySpinStore';
import { useTutorialStore } from './src/stores/tutorialStore';
import { useCharacterStore } from './src/stores/characterStore';
import { STARTER_HUMAN_CHARACTER, getManifest, partUrl, loadGlbFromUrl } from '@amg/character-runtime';
import { seedAmgCharacter, mergeMissingFaceSlots } from './src/utils/characterMigration';
import { buildAmgBodyForOutfit } from './src/data/npcCustomizations';
import type { CharacterState } from '@amg/character-runtime';
import { usePetStore } from './src/stores/petStore';
import { DailyRewardPopup } from './src/components/ui/DailyRewardPopup';
import { MilestoneToast } from './src/components/ui/MilestoneToast';
import { CityCompletionCeremony } from './src/components/ui/CityCompletionCeremony';
import { WelcomeBackPopup } from './src/components/ui/WelcomeBackPopup';
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
        await useDailySpinStore.getState().loadFromStorage();
        await useTutorialStore.getState().loadFromStorage();
        await useCharacterStore.getState().loadFromStorage();
        // Migrate the persisted character into whatever the latest schema
        // expects. Two paths handled by pure helpers in
        // src/utils/characterMigration.ts:
        //   · cold seed (no amgCharacter): build a starter with the
        //     migrated equippedOutfitId's body so returning players keep
        //     their last-equipped look across the Path-A schema flip.
        //   · forward-migrate (existing amgCharacter): merge in any
        //     starter face slot the save doesn't have so old saves don't
        //     render with hollow eye sockets.
        const charStore = useCharacterStore.getState();
        if (charStore.amgCharacter == null) {
          const seeded = seedAmgCharacter({
            starter: STARTER_HUMAN_CHARACTER,
            equippedOutfitId: charStore.equippedOutfitId,
            starterOutfitId: 'human_modern_civilians_01',
            buildBody: buildAmgBodyForOutfit,
          });
          charStore.setAmgCharacter(seeded as unknown as Record<string, unknown>);
        } else {
          const cur = charStore.amgCharacter as unknown as CharacterState;
          const upgraded = mergeMissingFaceSlots(cur, STARTER_HUMAN_CHARACTER);
          if (upgraded) {
            charStore.setAmgCharacter(upgraded as unknown as Record<string, unknown>);
          }
        }
        await usePetStore.getState().hydrate();
        await useMilestoneStore.getState().loadFromStorage();

        // Seed the lootbox drop pool with Path A variant entries
        // (2026-05-04 colorway pivot). Generates ~8K (partName,
        // variantId) drops on top of the existing ~245-item pool so
        // openBox can roll variant drops alongside the original
        // outfit-pack drops. Idempotent — safe across hot reloads.
        seedDrop4Variants();
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

        // Pre-warm the AMG manifest cache + the player's currently-equipped
        // part GLBs (non-blocking). The first CompositeCharacter mount can
        // then read everything from the dedup cache instead of paying ~5 s
        // of network round-trips. Failure is recoverable — the runtime
        // re-fetches on its own when the character mounts. Fire-and-forget.
        const AMG_BASE_URL = 'https://pub-8953453f2512408f9c58656d4ea4e681.r2.dev';
        const amgSource = { baseUrl: AMG_BASE_URL };
        (async () => {
          try {
            const manifest = await getManifest(amgSource);
            const cur = useCharacterStore.getState().amgCharacter as unknown as { parts?: Record<string, string> } | null;
            const partNames = cur?.parts ? Object.values(cur.parts) : [];
            // Look up each equipped part's file path in the manifest and
            // fire off concurrent fetches. The runtime cache dedups so
            // CompositeCharacter's later loads are instant.
            const filesByName = new Map(manifest.parts.map((p) => [p.name, p.file]));
            await Promise.all(
              partNames
                .filter((n): n is string => typeof n === 'string')
                .map((n) => filesByName.get(n))
                .filter((f): f is string => !!f)
                .map((file) => loadGlbFromUrl(partUrl(amgSource, file)).catch(() => null)),
            );
          } catch {
            /* best-effort */
          }
        })();

        // AMG `CompositeCharacter` handles its own fetch + dedup cache for
        // the manifest, base skeleton, and per-slot part GLBs. First mount
        // pays the network cost once; subsequent mounts hit the cache.
        // No boot-time preload needed — the legacy single-GLB warmup is
        // gone with the legacy renderer.
      } catch (e) {
        if (__DEV__) console.warn('Font loading error:', e);
      } finally {
        setAppReady(true);
      }
    }
    prepare();
  }, []);

  // "You opened the app but skipped the spin" reminder. When the player
  // backgrounds the app with an unclaimed daily spin, schedule a one-shot
  // 1-hour notification nudging them back. Coming back to foreground
  // cancels the pending nudge so they don't get a "claim your spin"
  // banner while they're already in the game.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'background' || next === 'inactive') {
        if (useDailySpinStore.getState().canSpin()) {
          scheduleSpinReminderIn(60).catch(() => { /* best-effort */ });
        }
      } else if (next === 'active') {
        cancelSpinReminder().catch(() => { /* best-effort */ });
      }
    });
    return () => sub.remove();
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
          // Dev/test hook: expose navigation + stores for the playtest bot.
          // Lets the headless preview agent drive the unlock + equip flow
          // without rolling RNG to hit every cosmetic category.
          if (__DEV__ && typeof window !== 'undefined') {
            const w = window as any;
            w.__nav = navRef.current;
            w.__stores = {
              shop: useShopStore,
              character: useCharacterStore,
              pet: usePetStore,
              lootBox: useLootBoxStore,
              challenge: useChallengeStore,
              achievement: useAchievementStore,
              dailyReward: useDailyRewardStore,
              dailySpin: useDailySpinStore,
              tutorial: useTutorialStore,
              game: useGameStore,
            };
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
        {/* WelcomeBack renders first in the popup stack so returning players
            see the welcome-back reward before their daily reward popup.
            DailyRewardPopup gates on WelcomeOverlay; WelcomeBack gates on
            the same flag + a 3+ day absence window, so they don't collide. */}
        <WelcomeBackPopup />
        <DailyRewardPopup />
        <MilestoneToast />
        <CharacterUnlockToast />
        <CityCompletionCeremony />
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
