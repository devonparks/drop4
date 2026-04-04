import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { useShopStore } from '../stores/shopStore';
import { useMatchHistoryStore } from '../stores/matchHistoryStore';
import { haptics } from '../services/haptics';
import { colors } from '../theme/colors';
import { fonts, weight } from '../theme/typography';

type LeaderboardTab = 'global' | 'weekly' | 'friends';

interface LeaderboardEntry {
  rank: number;
  name: string;
  wins: number;
  winRate: number;
  level: number;
  isPlayer: boolean;
}

// Mock leaderboard data (will be replaced with Firebase data)
function generateMockLeaderboard(playerWins: number, playerLevel: number): LeaderboardEntry[] {
  const names = [
    'xXDropKingXx', 'ConnectQueen', 'FourInARow99', 'BoardMaster',
    'StrategyPro', 'PieceDropper', 'WinStreak_', 'GoldCourt_MVP',
    'DiamondHands', 'DarkMatter1', 'CasualCarl', 'TrapSetter',
    'SpeedDemon42', 'ChainReactor', 'VerticalVic', 'DiagonalDan',
    'CenterCtrl', 'BlockParty', 'DropItLikeItsHot', 'FourReal',
  ];

  const entries: LeaderboardEntry[] = names.map((name, i) => ({
    rank: i + 1,
    name,
    wins: Math.floor(Math.random() * 200) + 50,
    winRate: Math.floor(Math.random() * 40) + 40,
    level: Math.floor(Math.random() * 30) + 5,
    isPlayer: false,
  }));

  // Sort by wins descending
  entries.sort((a, b) => b.wins - a.wins);

  // Add player
  const playerEntry: LeaderboardEntry = {
    rank: 0,
    name: 'You',
    wins: playerWins,
    winRate: playerWins > 0 ? Math.floor(Math.random() * 30) + 50 : 0,
    level: playerLevel,
    isPlayer: true,
  };

  entries.push(playerEntry);
  entries.sort((a, b) => b.wins - a.wins);
  entries.forEach((e, i) => e.rank = i + 1);

  return entries;
}

const RANK_EMOJIS: Record<number, string> = {
  1: '🥇',
  2: '🥈',
  3: '🥉',
};

export function LeaderboardScreen() {
  const [activeTab, setActiveTab] = useState<LeaderboardTab>('global');
  const { level } = useShopStore();
  const stats = useMatchHistoryStore(s => s.getStats());

  const leaderboard = generateMockLeaderboard(stats.wins, level);

  const tabs: { key: LeaderboardTab; label: string }[] = [
    { key: 'global', label: 'Global' },
    { key: 'weekly', label: 'Weekly' },
    { key: 'friends', label: 'Friends' },
  ];

  return (
    <ScreenBackground>
      <View style={styles.container}>
        <Text style={styles.title}>LEADERBOARDS</Text>

        {/* Tabs */}
        <View style={styles.tabRow}>
          {tabs.map(tab => (
            <Pressable
              key={tab.key}
              onPress={() => { haptics.tap(); setActiveTab(tab.key); }}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            >
              <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Leaderboard */}
        <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
          {leaderboard.map((entry) => (
            <View
              key={entry.rank}
              style={[
                styles.entryRow,
                entry.isPlayer && styles.entryRowPlayer,
                entry.rank <= 3 && styles.entryRowTop3,
              ]}
            >
              {/* Rank */}
              <View style={styles.rankCol}>
                {entry.rank <= 3 ? (
                  <Text style={styles.rankEmoji}>{RANK_EMOJIS[entry.rank]}</Text>
                ) : (
                  <Text style={[styles.rankNum, entry.isPlayer && { color: colors.orange }]}>
                    #{entry.rank}
                  </Text>
                )}
              </View>

              {/* Avatar + Name */}
              <View style={styles.nameCol}>
                <Text style={[
                  styles.entryName,
                  entry.isPlayer && { color: colors.orange },
                  entry.rank === 1 && { color: colors.coinGold },
                ]}>
                  {entry.name}
                </Text>
                <Text style={styles.entryLevel}>Lv.{entry.level}</Text>
              </View>

              {/* Stats */}
              <View style={styles.statsCol}>
                <Text style={styles.entryWins}>{entry.wins}W</Text>
                <Text style={styles.entryRate}>{entry.winRate}%</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 16,
  },
  title: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 24,
    color: '#ffffff',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 10,
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 6,
    marginBottom: 10,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tabActive: {
    backgroundColor: 'rgba(255,140,0,0.1)',
    borderColor: 'rgba(255,140,0,0.3)',
  },
  tabLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 13,
    color: colors.textSecondary,
  },
  tabLabelActive: {
    color: colors.orange,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 100,
    gap: 3,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 8,
  },
  entryRowPlayer: {
    backgroundColor: 'rgba(255,140,0,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,140,0,0.25)',
  },
  entryRowTop3: {
    backgroundColor: 'rgba(255,209,102,0.05)',
  },
  rankCol: {
    width: 36,
    alignItems: 'center',
  },
  rankEmoji: {
    fontSize: 20,
  },
  rankNum: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 13,
    color: colors.textSecondary,
  },
  nameCol: {
    flex: 1,
  },
  entryName: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 14,
    color: '#ffffff',
  },
  entryLevel: {
    fontFamily: fonts.body,
    fontWeight: weight.regular,
    fontSize: 10,
    color: colors.textSecondary,
  },
  statsCol: {
    alignItems: 'flex-end',
  },
  entryWins: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 13,
    color: colors.green,
  },
  entryRate: {
    fontFamily: fonts.body,
    fontWeight: weight.regular,
    fontSize: 10,
    color: colors.textSecondary,
  },
});
