import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { TopBar } from '../components/ui/TopBar';
import { GlossyButton } from '../components/ui/GlossyButton';
import { Drop4Logo } from '../components/ui/Drop4Logo';
import { useShopStore } from '../stores/shopStore';
import { colors } from '../theme/colors';
import { fonts, weight } from '../theme/typography';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export function HomeScreen() {
  const navigation = useNavigation<any>();
  const { coins, gems, level } = useShopStore();
  const insets = useSafeAreaInsets();

  const navigateTo = (screen: string) => {
    navigation.dispatch(CommonActions.navigate({ name: screen }));
  };

  return (
    <ScreenBackground>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Top Bar */}
        <TopBar
          coins={coins}
          gems={gems}
          level={level}
          onProfilePress={() => {}}
        />

        {/* Season & Daily Challenges */}
        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.statusBar}>
          <LinearGradient
            colors={['rgba(0,100,0,0.35)', 'rgba(0,80,0,0.2)']}
            style={styles.seasonPill}
          >
            <Text style={styles.pillIcon}>🏆</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.seasonLabel}>Season 1</Text>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: '50%' }]} />
              </View>
            </View>
            <Text style={styles.seasonCount}>4/8</Text>
          </LinearGradient>

          <LinearGradient
            colors={['rgba(0,60,120,0.35)', 'rgba(0,40,80,0.2)']}
            style={styles.challengePill}
          >
            <Text style={styles.pillIcon}>📋</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.challengeLabel}>Daily Challenges</Text>
              <Text style={styles.challengeTimer}>Ends in: 11h 46m</Text>
            </View>
            <View style={styles.challengeBadge}>
              <Text style={styles.badgeText}>3</Text>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Main Content — fills remaining space */}
        <View style={styles.mainContent}>
          {/* Logo */}
          <Animated.View entering={FadeInDown.delay(200).springify()}>
            <Drop4Logo size="large" />
          </Animated.View>

          {/* Character placeholder */}
          <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.characterWrap}>
            <Text style={styles.characterEmoji}>🧑🏾</Text>
          </Animated.View>

          {/* Menu Buttons */}
          <View style={styles.buttonsWrap}>
            <Animated.View entering={FadeInDown.delay(350).springify()}>
              <GlossyButton
                label="PLAY"
                variant="orange"
                iconRight="▶"
                onPress={() => navigateTo('Play')}
              />
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(420).springify()}>
              <GlossyButton
                label="CAREER"
                variant="purple"
                iconRight="🏆"
                onPress={() => {}}
              />
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(490).springify()}>
              <GlossyButton
                label="MULTIPLAYER"
                variant="teal"
                iconRight="👥"
                onPress={() => navigateTo('LocalPlay')}
              />
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(560).springify()}>
              <GlossyButton
                label="SHOP"
                variant="gold"
                iconRight="🛍"
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
  statusBar: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    gap: 8,
    marginTop: 4,
  },
  seasonPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(39,174,61,0.3)',
  },
  pillIcon: {
    fontSize: 18,
  },
  seasonLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 11,
    color: '#ffffff',
  },
  progressBar: {
    height: 5,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 3,
    marginTop: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.green,
    borderRadius: 3,
  },
  seasonCount: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 12,
    color: colors.green,
  },
  challengePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(26,188,156,0.3)',
  },
  challengeLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 10,
    color: '#ffffff',
  },
  challengeTimer: {
    fontFamily: fonts.body,
    fontWeight: weight.regular,
    fontSize: 9,
    color: colors.textSecondary,
    marginTop: 1,
  },
  challengeBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 12,
    color: '#ffffff',
  },
  mainContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  characterWrap: {
    marginVertical: 4,
  },
  characterEmoji: {
    fontSize: 80,
  },
  buttonsWrap: {
    width: '100%',
    maxWidth: 340,
    gap: 11,
  },
});
