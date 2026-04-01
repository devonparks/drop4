import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { TopBar } from '../components/ui/TopBar';
import { GlossyButton } from '../components/ui/GlossyButton';
import { useShopStore } from '../stores/shopStore';
import { useGameStore, Difficulty } from '../stores/gameStore';
import { fonts, weight } from '../theme/typography';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Play'>;
};

export function PlayScreen({ navigation }: Props) {
  const { coins, gems, level } = useShopStore();
  const newGame = useGameStore(s => s.newGame);
  const insets = useSafeAreaInsets();

  const startGame = (difficulty: Difficulty) => {
    newGame(difficulty, true);
    navigation.navigate('Game');
  };

  return (
    <ScreenBackground>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <TopBar
          coins={coins}
          gems={gems}
          level={level}
          showBack
          onBackPress={() => navigation.goBack()}
        />

        <View style={styles.mainContent}>
          <Animated.Text
            entering={FadeInDown.delay(100).springify()}
            style={styles.title}
          >
            PLAY
          </Animated.Text>

          {/* Character */}
          <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.characterWrap}>
            <Text style={styles.characterEmoji}>🧑🏾</Text>
          </Animated.View>

          {/* Difficulty buttons */}
          <View style={styles.buttonsWrap}>
            <Animated.View entering={FadeInDown.delay(280).springify()}>
              <GlossyButton
                label="EASY"
                subtitle="Casual & Fun"
                variant="green"
                iconRight="⭐"
                onPress={() => startGame('easy')}
              />
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(360).springify()}>
              <GlossyButton
                label="MEDIUM"
                subtitle="Think Ahead"
                variant="orange"
                iconRight="⭐⭐"
                onPress={() => startGame('medium')}
              />
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(440).springify()}>
              <GlossyButton
                label="HARD"
                subtitle="No Mercy"
                variant="red"
                iconRight="⭐⭐⭐"
                onPress={() => startGame('hard')}
              />
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(520).springify()}>
              <GlossyButton
                label="Custom Game"
                variant="navy"
                icon="🔧"
                onPress={() => {}}
              />
            </Animated.View>
          </View>
        </View>
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mainContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  title: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 36,
    color: '#ffffff',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    letterSpacing: 3,
  },
  characterWrap: {
    marginVertical: 8,
  },
  characterEmoji: {
    fontSize: 100,
  },
  buttonsWrap: {
    width: '100%',
    maxWidth: 340,
    gap: 12,
  },
});
