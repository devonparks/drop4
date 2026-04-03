import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { TopBar } from '../components/ui/TopBar';
import { GlossyButton } from '../components/ui/GlossyButton';
import { CharacterAvatar } from '../components/ui/CharacterAvatar';
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

  const startGame = (difficulty: Difficulty) => {
    newGame(difficulty, true);
    navigation.navigate('Game');
  };

  return (
    <ScreenBackground>
      <View style={styles.container}>
        <TopBar
          coins={coins}
          gems={gems}
          level={level}
          showBack
          onBackPress={() => navigation.goBack()}
        />

        <View style={styles.mainContent}>
          <Text style={styles.title}>PLAY</Text>

          <CharacterAvatar size="xlarge" variant="player" />

          <View style={styles.buttonsWrap}>
            <GlossyButton label="EASY" subtitle="Casual & Fun" variant="green" iconRight="⭐" onPress={() => startGame('easy')} />
            <GlossyButton label="MEDIUM" subtitle="Think Ahead" variant="orange" iconRight="⭐⭐" onPress={() => startGame('medium')} />
            <GlossyButton label="HARD" subtitle="No Mercy" variant="red" iconRight="⭐⭐⭐" onPress={() => startGame('hard')} />
            <GlossyButton label="Custom Game" variant="navy" icon="🔧" onPress={() => {}} />
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
    gap: 6,
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
  characterEmoji: {
    fontSize: 100,
  },
  buttonsWrap: {
    width: '100%',
    maxWidth: 340,
    gap: 10,
  },
});
