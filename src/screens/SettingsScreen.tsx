import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Switch, Share, Alert, ScrollView } from 'react-native';
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
import { RankBadge } from '../components/ui/RankBadge';
import { toggleMute, getMuted } from '../services/audio';
import { haptics, getHapticsEnabled, setHapticsEnabled } from '../services/haptics';
import { colors } from '../theme/colors';
import { fonts, weight } from '../theme/typography';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Settings'>;
};

function SettingToggle({ label, value, onToggle, icon }: {
  label: string; value: boolean; onToggle: () => void; icon: string;
}) {
  return (
    <View style={styles.settingRow}>
      <Text style={styles.settingIcon}>{icon}</Text>
      <Text style={styles.settingLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={() => { haptics.tap(); onToggle(); }}
        trackColor={{ false: 'rgba(255,255,255,0.1)', true: 'rgba(255,140,0,0.4)' }}
        thumbColor={value ? colors.orange : '#666'}
      />
    </View>
  );
}

function SettingLink({ label, icon, onPress }: { label: string; icon: string; onPress: () => void }) {
  return (
    <Pressable onPress={() => { haptics.tap(); onPress(); }} style={styles.settingRow}>
      <Text style={styles.settingIcon}>{icon}</Text>
      <Text style={styles.settingLabel}>{label}</Text>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

export function SettingsScreen({ navigation }: Props) {
  const coins = useShopStore(s => s.coins);
  const gems = useShopStore(s => s.gems);
  const level = useShopStore(s => s.level);
  const playerName = useShopStore(s => s.playerName);
  const lifetimeCoinsEarned = useShopStore(s => s.lifetimeCoinsEarned);
  const rankedElo = useRankedStore(s => s.elo);
  const rankedWins = useRankedStore(s => s.rankedWins);
  const rankedLosses = useRankedStore(s => s.rankedLosses);
  const seasonHighElo = useRankedStore(s => s.seasonHighElo);
  const rankedSeasonHistory = useRankedStore(s => s.seasonHistory);
  const seasonNumber = useSeasonStore(s => s.seasonNumber);
  const matches = useMatchHistoryStore(s => s.matches);
  const achievements = useAchievementStore(s => s.achievements);
  const careerProgress = useCareerStore(s => s.progress);
  const careerDone = Object.values(careerProgress).filter(p => p.completed).length;
  const [soundOn, setSoundOn] = useState(!getMuted());
  const [hapticsOn, setHapticsOn] = useState(getHapticsEnabled());
  const [notificationsOn, setNotificationsOn] = useState(true);
  const [showPastSeasons, setShowPastSeasons] = useState(false);

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
        <Text style={styles.title}>SETTINGS</Text>

        {/* Audio */}
        <Text style={styles.sectionTitle}>AUDIO</Text>
        <View style={styles.section}>
          <SettingToggle
            label="Sound Effects"
            value={soundOn}
            onToggle={() => { toggleMute(); setSoundOn(!soundOn); }}
            icon="🔊"
          />
          <SettingToggle
            label="Haptic Feedback"
            value={hapticsOn}
            onToggle={() => { const next = !hapticsOn; setHapticsOn(next); setHapticsEnabled(next); }}
            icon="📳"
          />
        </View>

        {/* Season Stats */}
        <Text style={styles.sectionTitle}>SEASON STATS</Text>
        <View style={styles.section}>
          <View style={styles.seasonStatsRow}>
            <View style={styles.seasonStatItem}>
              <Text style={styles.seasonStatLabel}>Season</Text>
              <Text style={styles.seasonStatValue}>{seasonNumber}</Text>
            </View>
            <View style={styles.seasonStatItem}>
              <Text style={styles.seasonStatLabel}>ELO</Text>
              <Text style={styles.seasonStatValue}>{rankedElo}</Text>
            </View>
            <View style={styles.seasonStatItem}>
              <Text style={styles.seasonStatLabel}>Tier</Text>
              <RankBadge size="small" showElo={false} />
            </View>
          </View>
          <View style={styles.seasonRecordRow}>
            <Text style={styles.seasonRecordLabel}>Record</Text>
            <Text style={styles.seasonRecordValue}>
              {rankedWins}W - {rankedLosses}L
            </Text>
          </View>
          <View style={styles.seasonRecordRow}>
            <Text style={styles.seasonRecordLabel}>Season High</Text>
            <Text style={[styles.seasonRecordValue, { color: colors.coinGold }]}>
              {seasonHighElo} ELO
            </Text>
          </View>
          <Pressable
            onPress={() => { haptics.tap(); setShowPastSeasons(!showPastSeasons); }}
            style={styles.settingRow}
          >
            <Text style={styles.settingIcon}>📊</Text>
            <Text style={styles.settingLabel}>View Past Seasons</Text>
            <Text style={styles.chevron}>{showPastSeasons ? '⌄' : '›'}</Text>
          </Pressable>
          {showPastSeasons && (
            <View style={styles.pastSeasonsWrap}>
              {rankedSeasonHistory.length === 0 ? (
                <Text style={styles.pastSeasonEmpty}>No past seasons yet</Text>
              ) : (
                rankedSeasonHistory.map((s) => (
                  <View key={s.season} style={styles.pastSeasonRow}>
                    <Text style={styles.pastSeasonNum}>S{s.season}</Text>
                    <Text style={styles.pastSeasonTier}>{s.tier.charAt(0).toUpperCase() + s.tier.slice(1)}</Text>
                    <Text style={styles.pastSeasonElo}>{s.elo} ELO</Text>
                    <Text style={styles.pastSeasonRecord}>{s.wins}W {s.losses}L</Text>
                  </View>
                ))
              )}
            </View>
          )}
        </View>

        {/* Notifications */}
        <Text style={styles.sectionTitle}>NOTIFICATIONS</Text>
        <View style={styles.section}>
          <SettingToggle
            label="Push Notifications"
            value={notificationsOn}
            onToggle={() => setNotificationsOn(!notificationsOn)}
            icon="🔔"
          />
        </View>

        {/* What's New */}
        <Text style={styles.sectionTitle}>WHAT'S NEW IN v1.0.0</Text>
        <View style={styles.section}>
          {[
            { icon: '🎭', text: '30 emotes + Fortnite-style emote wheel in lobby' },
            { icon: '🏟', text: 'Party Lobby — invite friends with room codes' },
            { icon: '🎮', text: '36 career levels with boss battles & puzzle modes' },
            { icon: '🎨', text: '56+ skins: Dark Matter, Holographic, Galaxy & more' },
            { icon: '🎰', text: 'Daily FREE SPIN wheel with coin & gem rewards' },
            { icon: '🏆', text: 'Ranked mode with ELO, tiers & seasonal resets' },
            { icon: '⭐', text: 'Season Pass with 50 tiers of exclusive rewards' },
            { icon: '🎁', text: 'Loot boxes, challenges & achievement system' },
          ].map((item, i) => (
            <View key={i} style={styles.whatsNewRow}>
              <Text style={styles.whatsNewIcon}>{item.icon}</Text>
              <Text style={styles.whatsNewText}>{item.text}</Text>
            </View>
          ))}
        </View>

        {/* Your Journey */}
        <Text style={styles.sectionTitle}>YOUR JOURNEY</Text>
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

        {/* About */}
        <Text style={styles.sectionTitle}>ABOUT</Text>
        <View style={styles.section}>
          <SettingLink label="Rate Drop4" icon="⭐" onPress={() => {
            // Will link to app store when published
            haptics.tap();
          }} />
          <SettingLink label="Share with Friends" icon="📤" onPress={() => {
            Share.share({ message: 'Check out Drop4 — the best Connect 4 game! 🎮🔴🟡' });
          }} />
          <SettingLink label="Privacy Policy" icon="🔒" onPress={() => haptics.tap()} />
          <SettingLink label="Terms of Service" icon="📄" onPress={() => haptics.tap()} />
        </View>

        {/* Account */}
        <Text style={styles.sectionTitle}>ACCOUNT</Text>
        <View style={styles.section}>
          <SettingLink label="Sign In with Google" icon="🔑" onPress={() => haptics.tap()} />
          <View style={styles.playerIdRow}>
            <Text style={styles.settingIcon}>🆔</Text>
            <Text style={styles.settingLabel}>Player ID</Text>
            <Text style={styles.playerIdValue}>{playerName || 'Player'}</Text>
          </View>
        </View>

        {/* Danger Zone */}
        <View style={styles.dangerDivider} />
        <Text style={styles.dangerTitle}>DANGER ZONE</Text>
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

                    haptics.tap();
                  },
                },
              ],
            );
          }} style={styles.dangerRow}>
            <Text style={styles.settingIcon}>🗑️</Text>
            <Text style={styles.dangerLabel}>Reset All Progress</Text>
            <Text style={styles.dangerChevron}>›</Text>
          </Pressable>
          <Text style={styles.dangerHint}>
            Permanently erases coins, gems, levels, career, ranked stats, and all game data.
          </Text>
        </View>

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
  seasonStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  seasonStatItem: {
    alignItems: 'center',
    gap: 4,
  },
  seasonStatLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.regular,
    fontSize: 10,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  seasonStatValue: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 18,
    color: '#ffffff',
  },
  seasonRecordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  seasonRecordLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.medium,
    fontSize: 13,
    color: colors.textSecondary,
  },
  seasonRecordValue: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 14,
    color: '#ffffff',
  },
  pastSeasonsWrap: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  pastSeasonEmpty: {
    fontFamily: fonts.body,
    fontWeight: weight.regular,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: 8,
  },
  pastSeasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.03)',
  },
  pastSeasonNum: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 12,
    color: colors.orange,
    width: 28,
  },
  pastSeasonTier: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 12,
    color: '#ffffff',
    flex: 1,
  },
  pastSeasonElo: {
    fontFamily: fonts.body,
    fontWeight: weight.regular,
    fontSize: 11,
    color: colors.textSecondary,
  },
  pastSeasonRecord: {
    fontFamily: fonts.body,
    fontWeight: weight.regular,
    fontSize: 11,
    color: colors.textMuted,
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
