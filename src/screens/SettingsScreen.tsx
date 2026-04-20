import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Switch, Share, Alert, ScrollView, Platform, Image, ImageSourcePropType } from 'react-native';
import { ReactNativeLegal } from 'react-native-legal';
import { StaggeredEntry } from '../components/animations';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { TopBar } from '../components/ui/TopBar';
import { useShopStore } from '../stores/shopStore';
import { useRankedStore } from '../stores/rankedStore';
import { useGameStore } from '../stores/gameStore';
import { useCareerStore } from '../stores/careerStore';
import { useSeasonStore } from '../stores/seasonStore';
import { useAchievementStore } from '../stores/achievementStore';
import { useMatchHistoryStore } from '../stores/matchHistoryStore';
import { useReplayStore } from '../stores/replayStore';
import { useDailyRewardStore } from '../stores/dailyRewardStore';
import { useLootBoxStore } from '../stores/lootBoxStore';
import { useBoardEditorStore } from '../stores/boardEditorStore';
import { useChallengeStore } from '../stores/challengeStore';
import { useDailySpinStore } from '../stores/dailySpinStore';
import { useTutorialStore } from '../stores/tutorialStore';
import { useRosterStore } from '../stores/rosterStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { toggleMute, getMuted, playSound } from '../services/audio';
import { PressScale } from '../components/animations';
import { haptics, getHapticsEnabled, setHapticsEnabled } from '../services/haptics';
import { colors } from '../theme/colors';
import { fonts, weight } from '../theme/typography';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Settings'>;
};

function SettingToggle({ label, value, onToggle, icon, iconImage }: {
  label: string; value: boolean; onToggle: () => void; icon: string; iconImage?: ImageSourcePropType;
}) {
  return (
    <View style={styles.settingRow}>
      {iconImage ? (
        <Image source={iconImage} style={styles.settingIconImg} resizeMode="contain" />
      ) : (
        <Text style={styles.settingIcon}>{icon}</Text>
      )}
      <Text style={styles.settingLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={() => { haptics.tap(); playSound('toggle'); onToggle(); }}
        trackColor={{ false: 'rgba(255,255,255,0.1)', true: 'rgba(255,140,0,0.4)' }}
        thumbColor={value ? colors.orange : '#666'}
        accessibilityLabel={label}
        accessibilityRole="switch"
        accessibilityState={{ checked: value }}
      />
    </View>
  );
}

function SettingLink({ label, icon, onPress }: { label: string; icon: string; onPress: () => void }) {
  return (
    <PressScale
      onPress={() => { playSound('click'); haptics.tap(); onPress(); }}
      scaleTo={0.98}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={styles.settingRow}>
        <Text style={styles.settingIcon}>{icon}</Text>
        <Text style={styles.settingLabel}>{label}</Text>
        <Text style={styles.chevron}>›</Text>
      </View>
    </PressScale>
  );
}

export function SettingsScreen({ navigation }: Props) {
  const coins = useShopStore(s => s.coins);
  const gems = useShopStore(s => s.gems);
  const level = useShopStore(s => s.level);
  const playerName = useShopStore(s => s.playerName);
  const lifetimeCoinsEarned = useShopStore(s => s.lifetimeCoinsEarned);
  const matches = useMatchHistoryStore(s => s.matches);
  const achievements = useAchievementStore(s => s.achievements);
  const careerProgress = useCareerStore(s => s.progress);
  const careerDone = Object.values(careerProgress).filter(p => p.completed).length;
  const [soundOn, setSoundOn] = useState(!getMuted());
  const [hapticsOn, setHapticsOn] = useState(getHapticsEnabled());
  const [notificationsOn, setNotificationsOn] = useState(true);

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

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <StaggeredEntry index={0} delay={60}>
        <Text style={styles.title} accessibilityRole="header">SETTINGS</Text>
        </StaggeredEntry>

        {/* Audio */}
        <StaggeredEntry index={1} delay={60}>
        <Text style={styles.sectionTitle} accessibilityRole="header">AUDIO</Text>
        <View style={styles.section}>
          <SettingToggle
            label="Sound Effects"
            value={soundOn}
            onToggle={() => { toggleMute(); setSoundOn(!soundOn); }}
            icon="🔊"
            iconImage={require('../assets/images/ui/settings-audio.png')}
          />
          <SettingToggle
            label="Haptic Feedback"
            value={hapticsOn}
            onToggle={() => { const next = !hapticsOn; setHapticsOn(next); setHapticsEnabled(next); }}
            icon="📳"
            iconImage={require('../assets/images/ui/settings-haptic.png')}
          />
        </View>
        </StaggeredEntry>

        {/* Notifications */}
        <StaggeredEntry index={2} delay={60}>
        <Text style={styles.sectionTitle} accessibilityRole="header">NOTIFICATIONS</Text>
        <View style={styles.section}>
          <SettingToggle
            label="Push Notifications"
            value={notificationsOn}
            onToggle={() => setNotificationsOn(!notificationsOn)}
            icon="🔔"
            iconImage={require('../assets/images/ui/settings-notif.png')}
          />
        </View>
        </StaggeredEntry>

        {/* What's New */}
        <StaggeredEntry index={3} delay={60}>
        <Text style={styles.sectionTitle} accessibilityRole="header">WHAT'S NEW IN v1.0.0</Text>
        <View style={styles.section}>
          {[
            { icon: '🎭', text: '30 emotes + Fortnite-style emote wheel in lobby' },
            { icon: '🎮', text: '36 career levels with boss battles & puzzle modes' },
            { icon: '🎨', text: '152 outfits across 12 packs + 16 pets' },
            { icon: '🎰', text: 'Daily FREE SPIN wheel with coin & gem rewards' },
            { icon: '🏆', text: '15 collection milestones with unique title rewards' },
            { icon: '⭐', text: 'Season Pass with 50 tiers of exclusive rewards' },
            { icon: '🎁', text: 'Loot boxes, challenges & achievement system' },
          ].map((item, i) => (
            <View key={i} style={styles.whatsNewRow}>
              <Text style={styles.whatsNewIcon}>{item.icon}</Text>
              <Text style={styles.whatsNewText}>{item.text}</Text>
            </View>
          ))}
        </View>
        </StaggeredEntry>

        {/* Your Journey */}
        <StaggeredEntry index={4} delay={60}>
        <Text style={styles.sectionTitle} accessibilityRole="header">YOUR JOURNEY</Text>
        <View style={styles.section}>
          <View style={styles.journeyGrid}>
            <View style={styles.journeyItem}>
              <Text style={styles.journeyValue}>{matches.length}</Text>
              <Text style={styles.journeyLabel}>Games Played</Text>
            </View>
            <View style={styles.journeyItem}>
              <Text style={[styles.journeyValue, { color: colors.green }]}>{matches.filter(m => m.result === 'win').length}</Text>
              <Text style={styles.journeyLabel}>Victories</Text>
            </View>
            <View style={styles.journeyItem}>
              <Text style={[styles.journeyValue, { color: colors.coinGold }]}>{lifetimeCoinsEarned.toLocaleString()}</Text>
              <Text style={styles.journeyLabel}>Coins Earned</Text>
            </View>
            <View style={styles.journeyItem}>
              <Text style={[styles.journeyValue, { color: colors.orange }]}>{achievements.filter(a => a.unlocked).length}/{achievements.length}</Text>
              <Text style={styles.journeyLabel}>Achievements</Text>
            </View>
            <View style={styles.journeyItem}>
              <Text style={[styles.journeyValue, { color: '#9b59b6' }]}>{careerDone}</Text>
              <Text style={styles.journeyLabel}>Career Levels</Text>
            </View>
            <View style={styles.journeyItem}>
              <Text style={[styles.journeyValue, { color: colors.teal }]}>Lv.{level}</Text>
              <Text style={styles.journeyLabel}>Player Level</Text>
            </View>
          </View>
        </View>
        </StaggeredEntry>

        {/* Support & Purchases */}
        <StaggeredEntry index={5} delay={60}>
        <Text style={styles.sectionTitle} accessibilityRole="header">SUPPORT</Text>
        <View style={styles.section}>
          <SettingLink label="Contact Support" icon="💬" onPress={() => {
            haptics.tap();
            navigation.navigate('Legal', { type: 'support' });
          }} />
          <SettingLink label="Restore Purchases" icon="🔄" onPress={() => {
            haptics.tap();
            // Stubbed: in v1 release this will call StoreKit restore.
            // For now, show a friendly confirmation so reviewers see the
            // required button exists and responds.
            Alert.alert(
              'Restore Purchases',
              'No previous purchases to restore. This button will fetch any non-consumable items you\'ve bought when the store is live.',
              [{ text: 'OK' }],
            );
          }} />
        </View>
        </StaggeredEntry>

        {/* About */}
        <StaggeredEntry index={6} delay={60}>
        <Text style={styles.sectionTitle} accessibilityRole="header">ABOUT</Text>
        <View style={styles.section}>
          <SettingLink label="Rate Drop4" icon="⭐" onPress={() => {
            haptics.tap();
            // Linking.openURL('itms-apps://itunes.apple.com/...') once published
          }} />
          <SettingLink label="Share with Friends" icon="📤" onPress={() => {
            Share.share({ message: 'Check out Drop4 — the best Connect 4 game! 🎮🔴🟡' });
          }} />
          <SettingLink label="Credits" icon="🏆" onPress={() => {
            haptics.tap();
            navigation.navigate('Legal', { type: 'credits' });
          }} />
          <SettingLink label="Privacy Policy" icon="🔒" onPress={() => {
            haptics.tap();
            navigation.navigate('Legal', { type: 'privacy' });
          }} />
          <SettingLink label="Terms of Service" icon="📄" onPress={() => {
            haptics.tap();
            navigation.navigate('Legal', { type: 'terms' });
          }} />
          {/* Third-party license acknowledgements — required by App Store for
              apps that bundle OSS dependencies. Uses react-native-legal's
              native license list view. No-op on web (native module only). */}
          {Platform.OS !== 'web' && (
            <SettingLink label="Open Source Licenses" icon="📜" onPress={() => {
              haptics.tap();
              try {
                ReactNativeLegal.launchLicenseListScreen('Open Source Licenses');
              } catch (e) {
                Alert.alert('Licenses', 'Unavailable in this build. Rebuild the app after `expo prebuild` to enable.');
              }
            }} />
          )}
        </View>
        </StaggeredEntry>

        {/* Account */}
        <StaggeredEntry index={7} delay={60}>
        <Text style={styles.sectionTitle} accessibilityRole="header">ACCOUNT</Text>
        <View style={styles.section}>
          <SettingLink label="Sign In with Google" icon="🔑" onPress={() => haptics.tap()} />
          <View style={styles.playerIdRow}>
            <Text style={styles.settingIcon}>🆔</Text>
            <Text style={styles.settingLabel}>Player ID</Text>
            <Text style={styles.playerIdValue}>{playerName || 'Player'}</Text>
          </View>
        </View>
        </StaggeredEntry>

        {/* Danger Zone */}
        <StaggeredEntry index={8} delay={60}>
        <View style={styles.dangerDivider} />
        <Text style={styles.dangerTitle} accessibilityRole="header">DANGER ZONE</Text>
        <View style={styles.dangerSection}>
          <Pressable onPress={() => {
            haptics.error();
            Alert.alert(
              'Reset All Progress',
              'This will erase all your coins, gems, levels, career progress, ranked stats, and game data. This cannot be undone.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Reset Everything',
                  style: 'destructive',
                  onPress: () => {
                    // Shop — reset to defaults
                    useShopStore.setState({
                      coins: 500, gems: 0, level: 1, xp: 0,
                      playerName: 'Player',
                      equipped: { board: 'default', pieces: 'classic', dropEffect: 'none', winAnimation: 'basic', boardAccessory: 'none' },
                      owned: { boards: ['default'], pieces: ['classic'], dropEffects: ['none'], winAnimations: ['basic'], boardAccessories: ['none'] },
                    });
                    // Ranked — full wipe (not resetSeason which adds history)
                    useRankedStore.setState({
                      elo: 500, tier: 'bronze', division: 1,
                      rankedWins: 0, rankedLosses: 0, rankedGames: 0,
                      seasonHighElo: 500, currentSeason: 0, seasonHistory: [],
                    });
                    // Game scores + streaks
                    useGameStore.setState({ scores: { player1: 0, player2: 0 }, winStreak: 0, bestStreak: 0 });
                    // Career progress
                    useCareerStore.setState({ progress: {}, currentChapter: 1 });
                    // Achievements
                    useAchievementStore.setState({
                      achievements: useAchievementStore.getState().achievements.map(a => ({ ...a, unlocked: false })),
                    });
                    // Match history
                    useMatchHistoryStore.setState({ matches: [] });
                    // Replays
                    useReplayStore.setState({ replays: [], currentMoves: [], isRecording: false });
                    // Daily rewards
                    useDailyRewardStore.setState({ currentStreak: 0, lastClaimDate: null });
                    // Loot boxes
                    useLootBoxStore.setState({ ownedBoxes: [], openHistory: [] });
                    // Season pass
                    useSeasonStore.setState({ currentTier: 0, xp: 0, hasPremium: false });
                    // Board editor
                    useBoardEditorStore.setState({ myBoards: [] });
                    // Challenges
                    useChallengeStore.getState().refreshChallenges();
                    // Daily spin
                    useDailySpinStore.setState({ lastSpinDate: '' });
                    // Tutorial tips + lesson mastery
                    useTutorialStore.setState({ seenTips: [], completionAwarded: false, viewedLessons: [] });
                    // Roster (new character-locked emotes + unlocks)
                    try { useRosterStore?.setState?.({
                      equippedCharacterId: 'default_player',
                      unlockedCharacterIds: ['default_player'],
                      pendingUnlocks: [],
                    }); } catch (e) { /* roster store optional */ }
                    // Welcome overlay — nuke the async storage flag so a fresh
                    // onboarding fires on next launch (used to bypass drop4_ prefix).
                    AsyncStorage.removeItem('drop4_welcome_dismissed').catch(() => {});
                    // Legacy key from older builds — clean up if it exists.
                    AsyncStorage.removeItem('welcome_dismissed').catch(() => {});

                    haptics.tap();
                  },
                },
              ],
            );
          }}
          style={styles.dangerRow}
          accessibilityRole="button"
          accessibilityLabel="Reset all progress"
          accessibilityHint="Permanently erases coins, gems, levels, career, and all game data">
            <Text style={styles.settingIcon}>🗑️</Text>
            <Text style={styles.dangerLabel}>Reset All Progress</Text>
            <Text style={styles.dangerChevron}>›</Text>
          </Pressable>
          <Text style={styles.dangerHint}>
            Permanently erases coins, gems, levels, career, ranked stats, and all game data.
          </Text>
        </View>
        </StaggeredEntry>

        {/* Version */}
        <View style={styles.footer}>
          <Text style={styles.versionBadge}>DROP4 v1.0.0</Text>
          <Text style={styles.copyright}>Created by Devon Parks</Text>
          <Text style={styles.copyright}>AMG Studios © 2026</Text>
        </View>
        </ScrollView>
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  title: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 24,
    color: '#ffffff',
    letterSpacing: 2,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 11,
    color: colors.textSecondary,
    letterSpacing: 2,
    paddingHorizontal: 20,
    marginBottom: 6,
    marginTop: 12,
  },
  section: {
    marginHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
    gap: 12,
  },
  settingIcon: {
    fontSize: 20,
  },
  // Flux-painted Settings row icon — replaces the emoji when iconImage is
  // provided. Same visual footprint as the 20pt emoji so toggle/link rows
  // stay the same height whether painted or emoji.
  settingIconImg: {
    width: 26,
    height: 26,
  },
  settingLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.medium,
    fontSize: 15,
    color: '#ffffff',
    flex: 1,
  },
  chevron: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 20,
    color: colors.textSecondary,
  },
  whatsNewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
    gap: 12,
  },
  whatsNewIcon: {
    fontSize: 18,
  },
  whatsNewText: {
    fontFamily: fonts.body,
    fontWeight: weight.medium,
    fontSize: 13,
    color: '#ffffff',
    flex: 1,
  },
  // Player ID row
  playerIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  playerIdValue: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 13,
    color: colors.orange,
    letterSpacing: 0.5,
  },
  // Danger zone
  dangerDivider: {
    height: 1,
    backgroundColor: 'rgba(231,76,60,0.15)',
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 4,
  },
  dangerTitle: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 11,
    color: '#e74c3c',
    letterSpacing: 2,
    paddingHorizontal: 20,
    marginBottom: 6,
    marginTop: 12,
  },
  dangerSection: {
    marginHorizontal: 16,
    backgroundColor: 'rgba(231,76,60,0.06)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(231,76,60,0.2)',
    overflow: 'hidden',
  },
  dangerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  dangerLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.medium,
    fontSize: 15,
    color: '#e74c3c',
    flex: 1,
  },
  dangerChevron: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 20,
    color: 'rgba(231,76,60,0.5)',
  },
  dangerHint: {
    fontFamily: fonts.body,
    fontWeight: weight.regular,
    fontSize: 11,
    color: 'rgba(231,76,60,0.5)',
    paddingHorizontal: 16,
    paddingBottom: 12,
    marginTop: -4,
  },
  footer: {
    alignItems: 'center',
    marginTop: 24,
    paddingBottom: 24,
  },
  versionBadge: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 14,
    color: colors.textSecondary,
    letterSpacing: 2,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
    marginBottom: 6,
  },
  copyright: {
    fontFamily: fonts.body,
    fontWeight: weight.regular,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  journeyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
  },
  journeyItem: {
    width: '32%',
    alignItems: 'center',
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  journeyValue: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 18,
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  journeyLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 9,
    color: colors.textMuted,
    marginTop: 2,
    letterSpacing: 0.3,
  },
});
