import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { TopBar } from '../components/ui/TopBar';
import { GlossyButton } from '../components/ui/GlossyButton';
import { AnimatedCharacter, useEmoteTrigger } from '../components/ui/AnimatedCharacter';
import { EmoteWheel } from '../components/ui/EmoteWheel';
import { useShopStore } from '../stores/shopStore';
import { useSeasonStore } from '../stores/seasonStore';
import { useChallengeStore } from '../stores/challengeStore';
import { haptics } from '../services/haptics';
import { colors } from '../theme/colors';
import { fonts, weight } from '../theme/typography';

export function HomeScreen() {
  const navigation = useNavigation<any>();
  const coins = useShopStore(s => s.coins);
  const gems = useShopStore(s => s.gems);
  const level = useShopStore(s => s.level);
  const currentTier = useSeasonStore(s => s.currentTier);
  const maxTier = useSeasonStore(s => s.maxTier);
  const seasonName = useSeasonStore(s => s.seasonName);
  const challenges = useChallengeStore(s => s.challenges);
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

        {/* ═══ DROP4 LOGO ═══ */}
        <View style={styles.logoArea}>
          <Text style={styles.logoMain}>
            DROP<Text style={styles.logo4}>4</Text>
          </Text>
          <Text style={styles.logoTagline}>Stack. Connect. Dominate.</Text>
        </View>

        {/* Season & Daily Challenges (under logo) */}
        <View style={styles.statusBar}>
          <Pressable onPress={() => navigateTo('SeasonPass')} style={styles.statusPill}>
            <Text style={styles.statusIcon}>🏆</Text>
            <Text style={styles.statusLabel}>{seasonName}</Text>
            <View style={styles.progressBarSmall}>
              <View style={[styles.progressFillSmall, { width: `${(currentTier / maxTier) * 100}%` }]} />
            </View>
            <Text style={styles.statusValue}>{currentTier}/{maxTier}</Text>
          </Pressable>

          <View style={styles.statusPill}>
            <Text style={styles.statusIcon}>📋</Text>
            <Text style={styles.statusLabel}>Daily Challenges</Text>
            <View style={styles.challengeBadge}>
              <Text style={styles.badgeNum}>{challenges.filter(c => !c.completed).length}</Text>
            </View>
          </View>
        </View>

        {/* ═══ CHARACTER LOBBY ═══ */}
        <View style={styles.lobbyArea}>
          {/* Emotes button (left) */}
          <Pressable onPress={() => { haptics.tap(); setWheelOpen(true); }} style={styles.sideBtn}>
            <LinearGradient colors={['rgba(255,220,50,0.3)', 'rgba(50,200,50,0.2)', 'rgba(50,100,255,0.2)']} style={styles.sideBtnGradient}>
              <Text style={styles.sideBtnIcon}>😀</Text>
            </LinearGradient>
            <Text style={styles.sideBtnLabel}>Emotes</Text>
          </Pressable>

          {/* Character on stage */}
          <View style={styles.characterStage}>
            {/* Glow rings behind character (Fortnite-style platform) */}
            <View style={styles.stageGlowOuter} />
            <View style={styles.stageGlowInner} />

            <AnimatedCharacter
              size={240}
              emote={emote}
              onEmoteComplete={clearEmote}
            />
            {/* Stage platform glow */}
            <LinearGradient
              colors={['rgba(100,180,255,0.3)', 'rgba(80,140,255,0.12)', 'transparent']}
              style={styles.stagePlatform}
            />
            {/* Stage outer ring */}
            <View style={styles.stageRing} />
          </View>

          {/* Pose button (right) */}
          <Pressable onPress={() => { haptics.tap(); navigateTo('CharacterCreator'); }} style={styles.sideBtn}>
            <LinearGradient colors={['rgba(255,160,0,0.35)', 'rgba(255,100,0,0.2)']} style={styles.sideBtnGradient}>
              <Text style={styles.sideBtnIcon}>🕺</Text>
            </LinearGradient>
            <Text style={styles.sideBtnLabel}>Pose</Text>
          </Pressable>
        </View>

        {/* Quick action buttons */}
        <View style={styles.quickActions}>
          <Pressable onPress={() => navigateTo('CharacterCreator')} style={styles.customizeBtn}>
            <Text style={styles.customizeIcon}>✏️</Text>
            <Text style={styles.customizeText}>Customize</Text>
          </Pressable>
          <Pressable onPress={() => navigateTo('Friends')} style={styles.friendsBtn}>
            <Text style={styles.customizeIcon}>👫</Text>
            <Text style={styles.friendsBtnText}>Friends</Text>
          </Pressable>
        </View>

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
            subtitle="Wager & Compete"
            variant="teal"
            iconRight="👥"
            onPress={() => navigateTo('Multiplayer')}
          />
        </View>

        {/* Version */}
        <Text style={styles.version}>v1.0.0</Text>

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
    marginTop: 2,
  },
  logoMain: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 52,
    color: '#ffffff',
    textShadowColor: 'rgba(80,120,255,0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
    letterSpacing: 3,
  },
  logo4: {
    color: '#ff8c00',
    fontSize: 56,
    textShadowColor: 'rgba(255,140,0,0.7)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 25,
  },
  logoTagline: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 13,
    color: 'rgba(200,220,255,0.5)',
    letterSpacing: 3,
    marginTop: 0,
  },
  // Character lobby
  lobbyArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  sideBtn: {
    alignItems: 'center',
    gap: 4,
  },
  sideBtnGradient: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.25)',
    shadowColor: 'rgba(255,200,0,0.4)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 6,
  },
  sideBtnIcon: {
    fontSize: 30,
  },
  sideBtnLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
  },
  characterStage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: -10,
  },
  stageGlowOuter: {
    width: 240,
    height: 240,
    borderRadius: 120,
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(100,180,255,0.08)',
    backgroundColor: 'rgba(80,140,255,0.03)',
  },
  stageGlowInner: {
    width: 180,
    height: 180,
    borderRadius: 90,
    position: 'absolute',
    bottom: 60,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: 'rgba(100,180,255,0.12)',
    backgroundColor: 'rgba(80,140,255,0.04)',
  },
  stagePlatform: {
    width: 200,
    height: 16,
    borderRadius: 100,
    marginTop: -10,
    shadowColor: 'rgba(80,140,255,0.6)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 8,
  },
  stageRing: {
    width: 240,
    height: 6,
    borderRadius: 120,
    backgroundColor: 'rgba(100,180,255,0.08)',
    marginTop: 2,
  },
  // Quick action buttons
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 6,
  },
  customizeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(100,180,255,0.12)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(100,180,255,0.3)',
  },
  customizeIcon: { fontSize: 14 },
  customizeText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 12,
    color: 'rgba(200,230,255,0.9)',
    letterSpacing: 0.5,
  },
  friendsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,140,0,0.12)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,140,0,0.3)',
  },
  friendsBtnText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 12,
    color: 'rgba(255,200,130,0.9)',
    letterSpacing: 0.5,
  },
  // Menu buttons
  menuButtons: {
    paddingHorizontal: 20,
    gap: 6,
    paddingBottom: 8,
  },
  // Version
  version: {
    fontFamily: fonts.body,
    fontWeight: weight.medium,
    fontSize: 10,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
});
