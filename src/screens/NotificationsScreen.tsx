import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { useAchievementStore } from '../stores/achievementStore';
import { useLootBoxStore } from '../stores/lootBoxStore';
import { useMatchHistoryStore } from '../stores/matchHistoryStore';
import { colors } from '../theme/colors';
import { fonts, weight } from '../theme/typography';

interface Notification {
  id: string;
  icon: string;
  title: string;
  message: string;
  time: string;
  type: 'achievement' | 'reward' | 'info';
}

function generateNotifications(): Notification[] {
  const notifications: Notification[] = [];
  const achievements = useAchievementStore.getState().achievements;
  const stats = useMatchHistoryStore.getState().getStats();

  // Recent achievement unlocks
  achievements
    .filter(a => a.unlocked && a.unlockedAt)
    .sort((a, b) => (b.unlockedAt || 0) - (a.unlockedAt || 0))
    .slice(0, 3)
    .forEach(a => {
      notifications.push({
        id: `ach_${a.id}`,
        icon: a.icon,
        title: 'Achievement Unlocked!',
        message: `${a.name} — ${a.description}`,
        time: 'Recently',
        type: 'achievement',
      });
    });

  // Welcome / tips
  if (stats.totalGames === 0) {
    notifications.push({
      id: 'welcome',
      icon: '👋',
      title: 'Welcome to Drop4!',
      message: 'Play your first game to start earning coins and unlocking rewards.',
      time: 'Just now',
      type: 'info',
    });
  }

  if (stats.totalGames > 0 && stats.totalGames < 5) {
    notifications.push({
      id: 'tip_career',
      icon: '🏆',
      title: 'Try Career Mode!',
      message: 'Complete career levels to earn exclusive cosmetics and player titles.',
      time: 'Today',
      type: 'info',
    });
  }

  // Loot box notification
  const totalBoxes = useLootBoxStore.getState().ownedBoxes.reduce((sum, b) => sum + b.count, 0);
  if (totalBoxes > 0) {
    notifications.push({
      id: 'lootbox',
      icon: '🎁',
      title: `You have ${totalBoxes} loot box${totalBoxes > 1 ? 'es' : ''}!`,
      message: 'Open them from your Profile to win cosmetics and coins.',
      time: 'Now',
      type: 'reward',
    });
  }

  // Daily challenge reminder
  notifications.push({
    id: 'daily',
    icon: '🎯',
    title: 'Daily Challenges Available',
    message: 'Complete 3 challenges for bonus coins and XP.',
    time: 'Today',
    type: 'info',
  });

  return notifications;
}

const TYPE_COLORS: Record<string, string> = {
  achievement: colors.coinGold,
  reward: colors.green,
  info: colors.textSecondary,
};

export function NotificationsScreen() {
  const notifications = generateNotifications();

  return (
    <ScreenBackground>
      <View style={styles.container}>
        <Text style={styles.title}>NOTIFICATIONS</Text>

        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {notifications.map(notif => (
            <View key={notif.id} style={styles.notifCard}>
              <Text style={styles.notifIcon}>{notif.icon}</Text>
              <View style={styles.notifContent}>
                <Text style={[styles.notifTitle, { color: TYPE_COLORS[notif.type] || '#fff' }]}>
                  {notif.title}
                </Text>
                <Text style={styles.notifMessage}>{notif.message}</Text>
                <Text style={styles.notifTime}>{notif.time}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 16 },
  title: {
    fontFamily: fonts.heading, fontWeight: weight.bold,
    fontSize: 24, color: '#ffffff', letterSpacing: 2,
    textAlign: 'center', marginBottom: 12,
  },
  list: { paddingHorizontal: 14, gap: 6, paddingBottom: 100 },
  notifCard: {
    flexDirection: 'row', gap: 10,
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  notifIcon: { fontSize: 28, marginTop: 2 },
  notifContent: { flex: 1 },
  notifTitle: {
    fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 14,
  },
  notifMessage: {
    fontFamily: fonts.body, fontWeight: weight.regular,
    fontSize: 12, color: colors.textSecondary, marginTop: 2, lineHeight: 17,
  },
  notifTime: {
    fontFamily: fonts.body, fontWeight: weight.regular,
    fontSize: 10, color: colors.textMuted, marginTop: 4,
  },
});
