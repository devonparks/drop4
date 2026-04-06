import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { useShopStore } from '../stores/shopStore';
import { useMatchHistoryStore } from '../stores/matchHistoryStore';
import { useRankedStore, RANKED_TIERS } from '../stores/rankedStore';
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
  elo: number;
  isPlayer: boolean;
}

// Map a level to an approximate ELO for mock data display
function levelToElo(lvl: number): number {
  return Math.min(300 + lvl * 60, 2900);
}

// Get tier icon for a given ELO
function getTierIcon(elo: number): string {
  for (let i = RANKED_TIERS.length - 1; i >= 0; i--) {
    if (elo >= RANKED_TIERS[i].minElo) return RANKED_TIERS[i].icon;
  }
  return RANKED_TIERS[0].icon;
}

// Seeded random for stable mock data across renders
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// Mock leaderboard data (will be replaced with Firebase data)
function generateGlobalLeaderboard(playerWins: number, playerLevel: number, playerElo: number): LeaderboardEntry[] {
  const rand = seededRandom(42);
  const names = [
    'xXDropKingXx', 'ConnectQueen', 'FourInARow99', 'BoardMaster',
    'StrategyPro', 'PieceDropper', 'WinStreak_', 'GoldCourt_MVP',
    'DiamondHands', 'DarkMatter1', 'CasualCarl', 'TrapSetter',
    'SpeedDemon42', 'ChainReactor', 'VerticalVic', 'DiagonalDan',
    'CenterCtrl', 'BlockParty', 'DropItLikeItsHot', 'FourReal',
  ];

  const entries: LeaderboardEntry[] = names.map((name) => {
    const lvl = Math.floor(rand() * 40) + 10;
    return {
      rank: 0,
      name,
      wins: Math.floor(rand() * 500) + 100,
      winRate: Math.floor(rand() * 40) + 45,
      level: lvl,
      elo: levelToElo(lvl),
      isPlayer: false,
    };
  });

  entries.push({
    rank: 0, name: 'You', wins: playerWins,
    winRate: playerWins > 0 ? Math.floor(rand() * 30) + 50 : 0,
    level: playerLevel, elo: playerElo, isPlayer: true,
  });

  entries.sort((a, b) => b.wins - a.wins);
  entries.forEach((e, i) => e.rank = i + 1);
  return entries;
}

function generateWeeklyLeaderboard(playerWins: number, playerLevel: number, playerElo: number): LeaderboardEntry[] {
  const rand = seededRandom(77);
  const names = [
    'WinStreak_', 'SpeedDemon42', 'ConnectQueen', 'DiagonalDan',
    'VerticalVic', 'GoldCourt_MVP', 'ChainReactor', 'TrapSetter',
    'BoardMaster', 'xXDropKingXx', 'CenterCtrl', 'DarkMatter1',
    'FourInARow99', 'PieceDropper', 'BlockParty',
  ];

  const entries: LeaderboardEntry[] = names.map((name) => {
    const lvl = Math.floor(rand() * 30) + 5;
    return {
      rank: 0,
      name,
      wins: Math.floor(rand() * 30) + 5,
      winRate: Math.floor(rand() * 35) + 40,
      level: lvl,
      elo: levelToElo(lvl),
      isPlayer: false,
    };
  });

  const weeklyWins = Math.min(playerWins, Math.floor(rand() * 10) + 2);
  entries.push({
    rank: 0, name: 'You', wins: weeklyWins,
    winRate: weeklyWins > 0 ? Math.floor(rand() * 30) + 45 : 0,
    level: playerLevel, elo: playerElo, isPlayer: true,
  });

  entries.sort((a, b) => b.wins - a.wins);
  entries.forEach((e, i) => e.rank = i + 1);
  return entries;
}

function generateFriendsLeaderboard(playerWins: number, playerLevel: number, playerElo: number): LeaderboardEntry[] {
  const rand = seededRandom(123);
  const names = [
    'Alex_Drops', 'Jamie4Real', 'SamConnect', 'Jordan_MVP',
    'RileyWins', 'TaylorGG', 'CaseyDrop4', 'MorganW',
  ];

  const entries: LeaderboardEntry[] = names.map((name) => {
    const lvl = Math.floor(rand() * 20) + 3;
    return {
      rank: 0,
      name,
      wins: Math.floor(rand() * 80) + 10,
      winRate: Math.floor(rand() * 35) + 35,
      level: lvl,
      elo: levelToElo(lvl),
      isPlayer: false,
    };
  });

  entries.push({
    rank: 0, name: 'You', wins: playerWins,
    winRate: playerWins > 0 ? Math.floor(rand() * 30) + 50 : 0,
    level: playerLevel, elo: playerElo, isPlayer: true,
  });

  entries.sort((a, b) => b.wins - a.wins);
  entries.forEach((e, i) => e.rank = i + 1);
  return entries;
}

const RANK_EMOJIS: Record<number, string> = {
  1: '🥇',
  2: '🥈',
  3: '🥉',
};

type SortMode = 'wins' | 'elo';

export function LeaderboardScreen() {
  const [activeTab, setActiveTab] = useState<LeaderboardTab>('global');
  const [sortMode, setSortMode] = useState<SortMode>('wins');
  const level = useShopStore(s => s.level);
  const rankedElo = useRankedStore(s => s.elo);
  const matches = useMatchHistoryStore(s => s.matches);
  const stats = useMemo(() => {
    const wins = matches.filter(m => m.result === 'win').length;
    const losses = matches.filter(m => m.result === 'loss').length;
    const draws = matches.filter(m => m.result === 'draw').length;
    const totalGames = matches.length;
    const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;
    const totalCoinsEarned = matches.reduce((sum, m) => sum + m.coinsEarned, 0);
    return { wins, losses, draws, totalGames, winRate, totalCoinsEarned };
  }, [matches]);

  const globalData = useMemo(() => generateGlobalLeaderboard(stats.wins, level, rankedElo), [stats.wins, level, rankedElo]);
  const weeklyData = useMemo(() => generateWeeklyLeaderboard(stats.wins, level, rankedElo), [stats.wins, level, rankedElo]);
  const friendsData = useMemo(() => generateFriendsLeaderboard(stats.wins, level, rankedElo), [stats.wins, level, rankedElo]);

  const rawData = activeTab === 'global' ? globalData
    : activeTab === 'weekly' ? weeklyData
    : friendsData;

  // Re-sort by ELO if needed, otherwise keep wins-based order
  const leaderboard = useMemo(() => {
    if (sortMode === 'elo') {
      const sorted = [...rawData].sort((a, b) => b.elo - a.elo);
      sorted.forEach((e, i) => e.rank = i + 1);
      return sorted;
    }
    return rawData;
  }, [rawData, sortMode]);

  // Find player rank
  const playerEntry = leaderboard.find(e => e.isPlayer);
  const playerRank = playerEntry?.rank ?? 0;
  const totalPlayers = leaderboard.length;

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

        {/* Sort toggle + Player rank */}
        <View style={styles.sortRow}>
          <View style={styles.sortToggle}>
            <Pressable
              onPress={() => { haptics.tap(); setSortMode('wins'); }}
              style={[styles.sortBtn, sortMode === 'wins' && styles.sortBtnActive]}
            >
              <Text style={[styles.sortBtnText, sortMode === 'wins' && styles.sortBtnTextActive]}>By Wins</Text>
            </Pressable>
            <Pressable
              onPress={() => { haptics.tap(); setSortMode('elo'); }}
              style={[styles.sortBtn, sortMode === 'elo' && styles.sortBtnActive]}
            >
              <Text style={[styles.sortBtnText, sortMode === 'elo' && styles.sortBtnTextActive]}>By ELO</Text>
            </Pressable>
          </View>
          {playerRank > 0 && (
            <Text style={styles.playerRankText}>
              You are <Text style={styles.playerRankHighlight}>#{playerRank}</Text> of {totalPlayers}
            </Text>
          )}
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

              {/* Tier icon + Name */}
              <View style={styles.nameCol}>
                <View style={styles.nameRow}>
                  <Text style={styles.tierIcon}>{getTierIcon(entry.elo)}</Text>
                  <Text style={[
                    styles.entryName,
                    entry.isPlayer && { color: colors.orange },
                    entry.rank === 1 && { color: colors.coinGold },
                  ]} numberOfLines={1}>
                    {entry.name}
                  </Text>
                </View>
                <Text style={styles.entryLevel}>Lv.{entry.level} • {entry.elo} ELO</Text>
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
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  sortToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  sortBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  sortBtnActive: {
    backgroundColor: 'rgba(255,140,0,0.15)',
  },
  sortBtnText: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 11,
    color: colors.textSecondary,
  },
  sortBtnTextActive: {
    color: colors.orange,
  },
  playerRankText: {
    fontFamily: fonts.body,
    fontWeight: weight.medium,
    fontSize: 12,
    color: colors.textSecondary,
  },
  playerRankHighlight: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
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
    backgroundColor: 'rgba(255,140,0,0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,140,0,0.45)',
    shadowColor: '#ff8c00',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
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
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tierIcon: {
    fontSize: 13,
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
