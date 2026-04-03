import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { CharacterAvatar } from '../components/ui/CharacterAvatar';
import { useShopStore } from '../stores/shopStore';
import { useGameStore } from '../stores/gameStore';
import { useMatchHistoryStore } from '../stores/matchHistoryStore';
import { haptics } from '../services/haptics';
import { colors } from '../theme/colors';
import { fonts, weight } from '../theme/typography';

function StatCard({ label, value, color = '#ffffff' }: { label: string; value: string | number; color?: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function EquippedItem({ label, name, rarity }: { label: string; name: string; rarity: string }) {
  const rarityColors: Record<string, string> = {
    common: '#8892b0',
    rare: '#3498db',
    epic: '#9b59b6',
    legendary: '#f1c40f',
  };
  return (
    <View style={styles.equippedItem}>
      <Text style={styles.equippedLabel}>{label}</Text>
      <Text style={[styles.equippedName, { color: rarityColors[rarity] || '#fff' }]}>{name}</Text>
    </View>
  );
}

export function ProfileScreen() {
  const { level, xp, coins, gems, equipped } = useShopStore();
  const { scores, winStreak, bestStreak } = useGameStore();
  const recentMatches = useMatchHistoryStore(s => s.getRecentMatches(5));

  const totalGames = scores.player1 + scores.player2;
  const winRate = totalGames > 0 ? Math.round((scores.player1 / totalGames) * 100) : 0;

  // Map equipped IDs to display names
  const boardNames: Record<string, string> = {
    default: 'Classic Blue', wood: 'Wooden', neon: 'Neon Glow',
    galaxy: 'Galaxy', gold: 'Gold Court', ice: 'Ice Arena',
    lava: 'Lava Pit', darkmatter: 'Dark Matter',
  };
  const pieceNames: Record<string, string> = {
    classic: 'Classic', chrome: 'Chrome', fire_ice: 'Fire & Ice',
    neon: 'Neon', holo: 'Holographic', darkmatter: 'Dark Matter',
  };

  return (
    <ScreenBackground>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarSection}>
            <LinearGradient
              colors={['#d4ac0d', '#f1c40f', '#d4ac0d']}
              style={styles.avatarRing}
            >
              <View style={styles.avatarInner}>
                <CharacterAvatar size="large" variant="player" />
              </View>
            </LinearGradient>
          </View>

          <Text style={styles.playerName}>Player</Text>
          <Text style={styles.playerTitle}>Rookie</Text>

          {/* Level bar */}
          <View style={styles.levelSection}>
            <View style={styles.levelRow}>
              <Text style={styles.levelLabel}>Level {level}</Text>
              <Text style={styles.xpLabel}>{xp} / {level * 100} XP</Text>
            </View>
            <View style={styles.xpBar}>
              <LinearGradient
                colors={[colors.orange, '#ff6600']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.xpFill, { width: `${Math.min((xp / (level * 100)) * 100, 100)}%` }]}
              />
            </View>
          </View>
        </View>

        {/* Stats grid */}
        <Text style={styles.sectionTitle}>STATISTICS</Text>
        <View style={styles.statsGrid}>
          <StatCard label="Wins" value={scores.player1} color={colors.green} />
          <StatCard label="Losses" value={scores.player2} color={colors.pieceRed} />
          <StatCard label="Win Rate" value={`${winRate}%`} color={colors.orange} />
          <StatCard label="Games" value={totalGames} />
          <StatCard label="Coins" value={coins.toLocaleString()} color={colors.coinGold} />
          <StatCard label="Gems" value={gems} color={colors.gemGreen} />
        </View>

        {/* Equipped cosmetics */}
        <Text style={styles.sectionTitle}>EQUIPPED</Text>
        <View style={styles.equippedGrid}>
          <EquippedItem label="Board" name={boardNames[equipped.board] || equipped.board} rarity="common" />
          <EquippedItem label="Pieces" name={pieceNames[equipped.pieces] || equipped.pieces} rarity="common" />
          <EquippedItem label="Drop Effect" name="None" rarity="common" />
          <EquippedItem label="Win Animation" name="Basic" rarity="common" />
        </View>

        {/* Achievements */}
        <Text style={styles.sectionTitle}>ACHIEVEMENTS</Text>
        <View style={styles.achievementsList}>
          {[
            { icon: '🏆', name: 'First Win', desc: 'Win your first game', done: scores.player1 > 0 },
            { icon: '🔥', name: 'On Fire', desc: 'Win 3 games in a row', done: false },
            { icon: '⚡', name: 'Speed Demon', desc: 'Win in under 10 moves', done: false },
            { icon: '🎯', name: 'Sharpshooter', desc: 'Beat Hard AI', done: false },
            { icon: '💎', name: 'Collector', desc: 'Own 5 cosmetic items', done: false },
            { icon: '👑', name: 'Drop King', desc: 'Reach Level 10', done: level >= 10 },
          ].map((ach, i) => (
            <View key={i} style={[styles.achievementRow, ach.done && styles.achievementDone]}>
              <Text style={styles.achievementIcon}>{ach.icon}</Text>
              <View style={styles.achievementInfo}>
                <Text style={[styles.achievementName, ach.done && { color: colors.coinGold }]}>
                  {ach.name}
                </Text>
                <Text style={styles.achievementDesc}>{ach.desc}</Text>
              </View>
              {ach.done && <Text style={styles.checkmark}>✓</Text>}
            </View>
          ))}
        </View>

        {/* Streaks */}
        <Text style={styles.sectionTitle}>STREAKS</Text>
        <View style={styles.statsGrid}>
          <StatCard label="Current" value={winStreak > 0 ? `🔥 ${winStreak}` : '0'} color={colors.orange} />
          <StatCard label="Best" value={bestStreak} color={colors.coinGold} />
        </View>

        {/* Match History */}
        {recentMatches.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>RECENT MATCHES</Text>
            <View style={styles.matchList}>
              {recentMatches.map(match => (
                <View key={match.id} style={styles.matchRow}>
                  <Text style={[styles.matchResult, {
                    color: match.result === 'win' ? colors.green : match.result === 'loss' ? colors.pieceRed : colors.textSecondary,
                  }]}>
                    {match.result === 'win' ? 'W' : match.result === 'loss' ? 'L' : 'D'}
                  </Text>
                  <View style={styles.matchInfo}>
                    <Text style={styles.matchOpponent}>vs {match.opponent}</Text>
                    <Text style={styles.matchMeta}>{match.moves} moves</Text>
                  </View>
                  {match.coinsEarned > 0 && (
                    <Text style={styles.matchCoins}>+{match.coinsEarned} 🪙</Text>
                  )}
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: 16,
    paddingBottom: 100,
  },
  profileHeader: {
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  avatarSection: {
    marginBottom: 12,
  },
  avatarRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    padding: 3,
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
  },
  avatarInner: {
    width: '100%',
    height: '100%',
    borderRadius: 47,
    backgroundColor: '#1a1a3a',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  playerName: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 24,
    color: '#ffffff',
  },
  playerTitle: {
    fontFamily: fonts.body,
    fontWeight: weight.medium,
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  levelSection: {
    width: '100%',
    maxWidth: 280,
    marginTop: 12,
  },
  levelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  levelLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 13,
    color: '#ffffff',
  },
  xpLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.regular,
    fontSize: 12,
    color: colors.textSecondary,
  },
  xpBar: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  xpFill: {
    height: '100%',
    borderRadius: 4,
  },
  sectionTitle: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 12,
    color: colors.textSecondary,
    letterSpacing: 2,
    paddingHorizontal: 20,
    marginBottom: 10,
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 16,
  },
  statCard: {
    width: '30%',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  statValue: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 22,
    marginBottom: 2,
  },
  statLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.regular,
    fontSize: 10,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  equippedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 16,
  },
  equippedItem: {
    width: '47%',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  equippedLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.regular,
    fontSize: 10,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  equippedName: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 14,
  },
  achievementsList: {
    paddingHorizontal: 16,
    gap: 6,
  },
  achievementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    opacity: 0.5,
  },
  achievementDone: {
    opacity: 1,
    borderColor: 'rgba(255,209,102,0.2)',
    backgroundColor: 'rgba(255,209,102,0.05)',
  },
  achievementIcon: {
    fontSize: 24,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementName: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 14,
    color: '#ffffff',
  },
  achievementDesc: {
    fontFamily: fonts.body,
    fontWeight: weight.regular,
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  checkmark: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 18,
    color: colors.green,
  },
  matchList: {
    paddingHorizontal: 16,
    gap: 4,
    marginBottom: 16,
  },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 10,
    padding: 10,
    gap: 10,
  },
  matchResult: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 18,
    width: 24,
    textAlign: 'center',
  },
  matchInfo: {
    flex: 1,
  },
  matchOpponent: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 13,
    color: '#ffffff',
  },
  matchMeta: {
    fontFamily: fonts.body,
    fontWeight: weight.regular,
    fontSize: 10,
    color: colors.textSecondary,
  },
  matchCoins: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 12,
    color: colors.coinGold,
  },
});
