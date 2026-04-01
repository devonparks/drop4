import React, { useCallback, useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
import { RootNavigator } from './src/navigation/RootNavigator';
import { colors } from './src/theme/colors';

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
        <ActivityIndicator size="large" color={colors.orange} />
      </View>
    );
  }

  return (
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
      </NavigationContainer>
    </GestureHandlerRootView>
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
});
