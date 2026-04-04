import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { TopBar } from '../components/ui/TopBar';
import { GlossyButton } from '../components/ui/GlossyButton';
import { AnimatedCharacter, useEmoteTrigger } from '../components/ui/AnimatedCharacter';
import { EmoteWheel } from '../components/ui/EmoteWheel';
import { useShopStore } from '../stores/shopStore';
import { haptics } from '../services/haptics';
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
          <Pressable onPress={() => navigateTo('SeasonPass')} style={styles.statusPill}>
            <Text style={styles.statusIcon}>🏆</Text>
            <Text style={styles.statusLabel}>Season 1</Text>
            <View style={styles.progressBarSmall}>
              <View style={[styles.progressFillSmall, { width: '50%' }]} />
            </View>
            <Text style={styles.statusValue}>4/8</Text>
          </Pressable>

          <View style={styles.statusPill}>
            <Text style={styles.statusIcon}>📋</Text>
            <Text style={styles.statusLabel}>Daily Challenges</Text>
            <View style={styles.challengeBadge}>
              <Text style={styles.badgeNum}>3</Text>
            </View>
          </View>
        </View>

        {/* ═══ DROP4 LOGO ═══ */}
        <View style={styles.logoArea}>
          <Text style={styles.logoMain}>
            DROP<Text style={styles.logo4}>4</Text>
          </Text>
          <Text style={styles.logoTagline}>Stack. Connect. Dominate.</Text>
        </View>

        {/* ═══ CHARACTER LOBBY ═══ */}
        <View style={styles.lobbyArea}>
          {/* Emotes button (left) */}
          <Pressable onPress={() => { haptics.tap(); setWheelOpen(true); }} style={styles.sideBtn}>
            <LinearGradient colors={['rgba(255,200,0,0.2)', 'rgba(255,140,0,0.1)']} style={styles.sideBtnGradient}>
              <Text style={styles.sideBtnIcon}>😀</Text>
            </LinearGradient>
            <Text style={styles.sideBtnLabel}>Emotes</Text>
          </Pressable>

          {/* Character on stage */}
          <View style={styles.characterStage}>
            <AnimatedCharacter
              size={160}
              emote={emote}
              onEmoteComplete={clearEmote}
            />
            {/* Stage platform */}
            <LinearGradient
              colors={['rgba(100,180,255,0.15)', 'rgba(100,180,255,0.05)', 'transparent']}
              style={styles.stagePlatform}
            />
          </View>

          {/* Pose button (right) */}
          <Pressable onPress={() => { haptics.tap(); navigateTo('CharacterCreator'); }} style={styles.sideBtn}>
            <LinearGradient colors={['rgba(255,140,0,0.2)', 'rgba(200,100,0,0.1)']} style={styles.sideBtnGradient}>
              <Text style={styles.sideBtnIcon}>🕺</Text>
            </LinearGradient>
            <Text style={styles.sideBtnLabel}>Pose</Text>
          </Pressable>
        </View>

        {/* Customize button */}
        <Pressable onPress={() => navigateTo('CharacterCreator')} style={styles.customizeBtn}>
          <Text style={styles.customizeIcon}>✏️</Text>
          <Text style={styles.customizeText}>Customize</Text>
        </Pressable>

        {/* ═══ MENU BUTTONS ═══ */}
        <View style={styles.menuButtons}>
          <GlossyButton
            label="PLAY"
            subtitle="Quick Match"
            variant="orange"
            iconRight="▶"
            onPress={() => navigateTo('Play')}
          />
          <GlossyButton
            label="CAREER"
            subtitle="Progress & Unlocks"
            variant="purple"
            iconRight="🏆"
            onPress={() => navigateTo('Career')}
          />
          <GlossyButton
            label="MULTIPLAYER"
            subtitle="Cosmetics & Coins"
            variant="teal"
            iconRight="👥"
            onPress={() => navigateTo('Multiplayer')}
          />
        </View>

        {/* Version */}
        <Text style={styles.version}>V1.0</Text>

        {/* Emote Wheel Modal */}
        <EmoteWheel
          visible={wheelOpen}
          onClose={() => setWheelOpen(false)}
          onSelect={triggerEmote}
        />
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Status bar
  statusBar: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    gap: 6,
    marginTop: 4,
  },
  statusPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  statusIcon: { fontSize: 14 },
  statusLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 10,
    color: '#ffffff',
  },
  progressBarSmall: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFillSmall: {
    height: '100%',
    backgroundColor: '#9b59b6',
    borderRadius: 2,
  },
  statusValue: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 11,
    color: '#9b59b6',
  },
  challengeBadge: {
    marginLeft: 'auto',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeNum: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 11,
    color: '#ffffff',
  },
  // Logo
  logoArea: {
    alignItems: 'center',
    marginTop: 6,
  },
  logoMain: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 44,
    color: '#ffffff',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 8,
    letterSpacing: 2,
  },
  logo4: {
    color: '#ff8c00',
    textShadowColor: 'rgba(255,140,0,0.5)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 10,
  },
  logoTagline: {
    fontFamily: fonts.body,
    fontWeight: weight.medium,
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 2,
    marginTop: -2,
  },
  // Character lobby
  lobbyArea: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginVertical: 4,
  },
  sideBtn: {
    alignItems: 'center',
    gap: 4,
  },
  sideBtnGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  sideBtnIcon: {
    fontSize: 26,
  },
  sideBtnLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
  },
  characterStage: {
    flex: 1,
    alignItems: 'center',
  },
  stagePlatform: {
    width: 140,
    height: 12,
    borderRadius: 70,
    marginTop: -6,
  },
  // Customize button
  customizeBtn: {
    flexDirection: 'row',
    alignSelf: 'center',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(100,180,255,0.12)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(100,180,255,0.3)',
    marginBottom: 6,
  },
  customizeIcon: { fontSize: 14 },
  customizeText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 12,
    color: 'rgba(200,230,255,0.9)',
    letterSpacing: 0.5,
  },
  // Menu buttons
  menuButtons: {
    paddingHorizontal: 20,
    gap: 8,
    paddingBottom: 4,
  },
  // Version
  version: {
    position: 'absolute',
    bottom: 4,
    left: 12,
    fontFamily: fonts.body,
    fontWeight: weight.medium,
    fontSize: 10,
    color: 'rgba(255,255,255,0.15)',
  },
});
