import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { TopBar } from '../components/ui/TopBar';
import { GlossyButton } from '../components/ui/GlossyButton';
import { useShopStore } from '../stores/shopStore';
import { colors } from '../theme/colors';
import { fonts, weight } from '../theme/typography';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Multiplayer'>;
};

export function MultiplayerScreen({ navigation }: Props) {
  const { coins, gems, level } = useShopStore();

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
          <Text style={styles.title}>MULTIPLAYER</Text>
          <Text style={styles.subtitle}>Play with friends or go head-to-head</Text>

          <View style={styles.buttonsWrap}>
            <GlossyButton
              label="LOCAL PLAY"
              subtitle="Pass & Play"
              variant="teal"
              icon="👥"
              onPress={() => navigation.navigate('LocalPlay')}
            />
            <GlossyButton
              label="STAGE MODE"
              subtitle="Wager Coins"
              variant="gold"
              icon="🏟"
              onPress={() => navigation.navigate('Stage')}
            />
            <GlossyButton
              label="TOURNAMENT"
              subtitle="4-8 Player Bracket"
              variant="red"
              icon="🏆"
              onPress={() => navigation.navigate('Tournament')}
            />
            <GlossyButton
              label="ONLINE"
              subtitle="Coming Soon"
              variant="navy"
              icon="🌐"
              onPress={() => {}}
              disabled
            />
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
    gap: 12,
  },
  title: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 28,
    color: '#ffffff',
    letterSpacing: 2,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontWeight: weight.regular,
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  buttonsWrap: {
    width: '100%',
    maxWidth: 340,
    gap: 12,
  },
});
