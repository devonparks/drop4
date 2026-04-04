import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Switch, Share } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { TopBar } from '../components/ui/TopBar';
import { useShopStore } from '../stores/shopStore';
import { useRankedStore } from '../stores/rankedStore';
import { useSeasonStore } from '../stores/seasonStore';
import { RankBadge } from '../components/ui/RankBadge';
import { toggleMute, getMuted } from '../services/audio';
import { haptics } from '../services/haptics';
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
  const { coins, gems, level } = useShopStore();
  const ranked = useRankedStore();
  const season = useSeasonStore();
  const [soundOn, setSoundOn] = useState(!getMuted());
  const [hapticsOn, setHapticsOn] = useState(true);
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
            onToggle={() => setHapticsOn(!hapticsOn)}
            icon="📳"
          />
        </View>

        {/* Season Stats */}
        <Text style={styles.sectionTitle}>SEASON STATS</Text>
        <View style={styles.section}>
          <View style={styles.seasonStatsRow}>
            <View style={styles.seasonStatItem}>
              <Text style={styles.seasonStatLabel}>Season</Text>
              <Text style={styles.seasonStatValue}>{season.seasonNumber}</Text>
            </View>
            <View style={styles.seasonStatItem}>
              <Text style={styles.seasonStatLabel}>ELO</Text>
              <Text style={styles.seasonStatValue}>{ranked.elo}</Text>
            </View>
            <View style={styles.seasonStatItem}>
              <Text style={styles.seasonStatLabel}>Tier</Text>
              <RankBadge size="small" showElo={false} />
            </View>
          </View>
          <View style={styles.seasonRecordRow}>
            <Text style={styles.seasonRecordLabel}>Record</Text>
            <Text style={styles.seasonRecordValue}>
              {ranked.rankedWins}W - {ranked.rankedLosses}L
            </Text>
          </View>
          <View style={styles.seasonRecordRow}>
            <Text style={styles.seasonRecordLabel}>Season High</Text>
            <Text style={[styles.seasonRecordValue, { color: colors.coinGold }]}>
              {ranked.seasonHighElo} ELO
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
              {ranked.seasonHistory.length === 0 ? (
                <Text style={styles.pastSeasonEmpty}>No past seasons yet</Text>
              ) : (
                ranked.seasonHistory.map((s) => (
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
          <SettingLink label="Reset Progress" icon="⚠️" onPress={() => haptics.error()} />
        </View>

        {/* Version */}
        <View style={styles.footer}>
          <Text style={styles.version}>Drop4 v1.0.0</Text>
          <Text style={styles.copyright}>Created by Devon Parks</Text>
          <Text style={styles.copyright}>AMG Studios © 2026</Text>
        </View>
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  footer: {
    alignItems: 'center',
    marginTop: 'auto',
    paddingBottom: 24,
  },
  version: {
    fontFamily: fonts.body,
    fontWeight: weight.medium,
    fontSize: 13,
    color: colors.textSecondary,
  },
  copyright: {
    fontFamily: fonts.body,
    fontWeight: weight.regular,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
});
