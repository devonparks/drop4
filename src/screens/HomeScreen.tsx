import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { TopBar } from '../components/ui/TopBar';
import { GlossyButton } from '../components/ui/GlossyButton';
import { Drop4Logo } from '../components/ui/Drop4Logo';
import { AnimatedCharacter, useEmoteTrigger } from '../components/ui/AnimatedCharacter';
import { EmoteWheel, EmoteWheelTrigger } from '../components/ui/EmoteWheel';
import { useShopStore } from '../stores/shopStore';
import { colors } from '../theme/colors';
import { fonts, weight } from '../theme/typography';

export function HomeScreen() {
  const navigation = useNavigation<any>();
  const { coins, gems, level } = useShopStore();
  const { emote, triggerEmote, clearEmote } = useEmoteTrigger();
  const [wheelOpen, setWheelOpen] = useState(false);

  const navigateTo = (screen: string) => {
    navigation.dispatch(CommonActions.navigate({ name: screen }));
  };

  return (
    <ScreenBackground>
      <View style={styles.container}>
        <TopBar
          coins={coins} gems={gems} level={level}
          onProfilePress={() => navigateTo('CharacterCreator')}
          onSettingsPress={() => navigateTo('Settings')}
        />

        {/* Season & Daily Challenges */}
        <View style={styles.statusBar}>
          <Pressable onPress={() => navigateTo('SeasonPass')} style={{ flex: 1 }}>
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
          </Pressable>

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
        </View>

        {/* ===== LOBBY AREA ===== */}
        <View style={styles.lobbyArea}>
          {/* Logo */}
          <Drop4Logo size="small" />

          {/* Character Stage */}
          <Pressable onPress={() => navigateTo('CharacterCreator')} style={styles.stage}>
            {/* Stage glow */}
            <View style={styles.stageGlow} />

            {/* Character */}
            <AnimatedCharacter
              size={180}
              emote={emote}
              onEmoteComplete={clearEmote}
            />

            {/* Stage platform */}
            <LinearGradient
              colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)', 'transparent']}
              style={styles.stagePlatform}
            />

            {/* Player name */}
            <Text style={styles.playerName}>Player</Text>
          </Pressable>

          {/* Emote wheel trigger */}
          <EmoteWheelTrigger onPress={() => setWheelOpen(true)} />
        </View>

        {/* Emote Wheel Modal */}
        <EmoteWheel
          visible={wheelOpen}
          onClose={() => setWheelOpen(false)}
          onSelect={triggerEmote}
        />

        {/* Menu Buttons */}
        <View style={styles.buttonsWrap}>
          <GlossyButton label="PLAY" variant="orange" iconRight="▶" onPress={() => navigateTo('Play')} />
          <GlossyButton label="CAREER" variant="purple" iconRight="🏆" onPress={() => navigateTo('Career')} />
          <GlossyButton label="MULTIPLAYER" variant="teal" iconRight="👥" onPress={() => navigateTo('Multiplayer')} />
          <GlossyButton label="SHOP" variant="gold" iconRight="🛍" onPress={() => navigation.dispatch(CommonActions.navigate({ name: 'Shop' }))} />
        </View>

        {/* Version */}
        <Text style={styles.version}>V1.0</Text>
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
  pillIcon: { fontSize: 18 },
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
  // Lobby
  lobbyArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  stage: {
    alignItems: 'center',
    position: 'relative',
  },
  stageGlow: {
    position: 'absolute',
    bottom: 20,
    width: 200,
    height: 40,
    borderRadius: 100,
    backgroundColor: 'rgba(255,140,0,0.08)',
  },
  stagePlatform: {
    width: 120,
    height: 8,
    borderRadius: 50,
    marginTop: -8,
  },
  playerName: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 14,
    color: '#ffffff',
    marginTop: 4,
  },
  // Buttons
  buttonsWrap: {
    paddingHorizontal: 24,
    gap: 8,
    paddingBottom: 4,
  },
  version: {
    position: 'absolute',
    bottom: 4,
    left: 12,
    fontFamily: fonts.body,
    fontWeight: weight.medium,
    fontSize: 10,
    color: 'rgba(255,255,255,0.2)',
  },
});
