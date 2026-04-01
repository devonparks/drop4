import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { TopBar } from '../components/ui/TopBar';
import { GlossyButton } from '../components/ui/GlossyButton';
import { useShopStore } from '../stores/shopStore';
import { colors } from '../theme/colors';
import { fonts, weight } from '../theme/typography';
import type { RootStackParamList } from '../navigation/RootNavigator';

export function HomeScreen() {
  const navigation = useNavigation<any>();
  const { coins, gems, level } = useShopStore();
  const insets = useSafeAreaInsets();

  return (
    <ScreenBackground>
      <View style={{ paddingTop: insets.top }}>
        <TopBar
          coins={coins}
          gems={gems}
          level={level}
          onProfilePress={() => {}}
        />
      </View>

      {/* Season & Daily Challenges bar */}
      <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.statusBar}>
        <View style={styles.seasonPill}>
          <Text style={styles.seasonIcon}>🏆</Text>
          <View>
            <Text style={styles.seasonLabel}>Season 1</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: '50%' }]} />
            </View>
          </View>
          <Text style={styles.seasonProgress}>4/8</Text>
        </View>
        <View style={styles.challengePill}>
          <Text style={styles.challengeIcon}>📋</Text>
          <View>
            <Text style={styles.challengeLabel}>Daily Challenges</Text>
            <Text style={styles.challengeTimer}>Ends in: 11h 46m</Text>
          </View>
          <View style={styles.challengeBadge}>
            <Text style={styles.challengeCount}>3</Text>
          </View>
        </View>
      </Animated.View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.logoWrap}>
          <Text style={styles.logoText}>
            DROP<Text style={styles.logoAccent}>4</Text>
          </Text>
          <Text style={styles.tagline}>Stack. Connect. Dominate.</Text>
        </Animated.View>

        {/* Character placeholder */}
        <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.characterWrap}>
          <Text style={styles.characterEmoji}>🧑🏾</Text>
        </Animated.View>

        {/* Main menu buttons */}
        <View style={styles.buttonsWrap}>
          <Animated.View entering={FadeInDown.delay(400).springify()}>
            <GlossyButton
              label="PLAY"
              variant="orange"
              iconRight="▶"
              onPress={() => navigation.dispatch(CommonActions.navigate({ name: 'Play' }))}
            />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(500).springify()}>
            <GlossyButton
              label="CAREER"
              variant="purple"
              iconRight="🏆"
              onPress={() => {}}
            />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(600).springify()}>
            <GlossyButton
              label="MULTIPLAYER"
              variant="teal"
              iconRight="👥"
              onPress={() => {}}
            />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(700).springify()}>
            <GlossyButton
              label="SHOP"
              variant="gold"
              iconRight="🛍"
              onPress={() => {}}
            />
          </Animated.View>
        </View>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: 'rgba(0,100,0,0.3)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(39,174,61,0.4)',
  },
  seasonIcon: {
    fontSize: 20,
  },
  seasonLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 12,
    color: '#ffffff',
  },
  progressBar: {
    width: 60,
    height: 6,
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
  seasonProgress: {
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
    backgroundColor: 'rgba(0,60,100,0.3)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(26,188,156,0.4)',
  },
  challengeIcon: {
    fontSize: 20,
  },
  challengeLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 11,
    color: '#ffffff',
  },
  challengeTimer: {
    fontFamily: fonts.body,
    fontWeight: weight.regular,
    fontSize: 10,
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
  challengeCount: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 12,
    color: '#ffffff',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  logoWrap: {
    alignItems: 'center',
    marginTop: 16,
  },
  logoText: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 56,
    color: '#ffffff',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 6,
  },
  logoAccent: {
    color: colors.orange,
    fontSize: 60,
  },
  tagline: {
    fontFamily: fonts.body,
    fontWeight: weight.medium,
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: -4,
    letterSpacing: 2,
  },
  characterWrap: {
    alignItems: 'center',
    marginVertical: 12,
  },
  characterEmoji: {
    fontSize: 100,
  },
  buttonsWrap: {
    width: '100%',
    maxWidth: 340,
    gap: 14,
    marginTop: 8,
  },
});
