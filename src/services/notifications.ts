/**
 * Push notifications service — local scheduled reminders only.
 *
 * Multiplayer was killed for v1 so we dropped the remote push / Firebase
 * registration path. Everything here is on-device local notifications:
 *
 *   • Morning (10am): "Your daily spin is ready!"
 *   • Evening (8pm): "Don't lose your {N}-day streak!" (only if streak > 0)
 *   • Saturday noon: "New featured items in the shop today!"
 *
 * Re-scheduled on every app launch, covering the next 7 days. Silently
 * no-ops if the user hasn't granted permission or we're on web.
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { useDailyRewardStore } from '../stores/dailyRewardStore';

const DROP4_CATEGORY = 'drop4-daily';

// Show banner even when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Request notification permission. Safe to call on every launch —
 * iOS shows the dialog only once.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') return true;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch (e) {
    if (__DEV__) console.warn('[notifications] permission request failed:', e);
    return false;
  }
}

async function cancelDrop4Notifications(): Promise<void> {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      scheduled
        .filter((n) => n.content.categoryIdentifier === DROP4_CATEGORY)
        .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
    );
  } catch {
    /* best-effort */
  }
}

async function safeSchedule(req: Notifications.NotificationRequestInput): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync(req);
  } catch (e) {
    if (__DEV__) console.warn('[notifications] schedule failed:', e);
  }
}

/**
 * Schedule the next 7 days of daily reminders. Call on app launch.
 * Re-entrant: first cancels any prior Drop4 notifications to avoid dupes.
 */
export async function scheduleDailyReminders(): Promise<void> {
  if (Platform.OS === 'web') return;

  const granted = await requestNotificationPermission();
  if (!granted) return;

  await cancelDrop4Notifications();

  const streak = useDailyRewardStore.getState().currentStreak;
  const now = new Date();

  for (let offset = 1; offset <= 7; offset++) {
    const day = new Date(now);
    day.setDate(day.getDate() + offset);

    // 10 AM local — daily spin ready
    const morning = new Date(day);
    morning.setHours(10, 0, 0, 0);
    if (morning.getTime() > now.getTime()) {
      await safeSchedule({
        content: {
          title: '\u{1F3B0} Your daily spin is ready!',
          body: 'Spin the wheel for coins, gems, and exclusive rewards.',
          categoryIdentifier: DROP4_CATEGORY,
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: morning } as any,
      });
    }

    // 8 PM local — streak preservation nudge (only if they have a streak)
    if (streak > 0) {
      const evening = new Date(day);
      evening.setHours(20, 0, 0, 0);
      if (evening.getTime() > now.getTime()) {
        await safeSchedule({
          content: {
            title: `\u{1F525} Don't lose your ${streak}-day streak!`,
            body: 'Claim today\u2019s reward before midnight.',
            categoryIdentifier: DROP4_CATEGORY,
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: evening } as any,
        });
      }
    }
  }

  // Saturday noon — shop rotation reminder
  const daysUntilSat = ((6 - now.getDay()) + 7) % 7 || 7;
  const sat = new Date(now);
  sat.setDate(sat.getDate() + daysUntilSat);
  sat.setHours(12, 0, 0, 0);
  await safeSchedule({
    content: {
      title: '\u{1F6CD}\uFE0F New items in the shop today!',
      body: 'Fresh outfits, pets, and emotes on sale. Limited time.',
      categoryIdentifier: DROP4_CATEGORY,
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: sat } as any,
  });
}

/** Kill switch — useful for a Settings toggle. */
export async function cancelAllNotifications(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    /* best-effort */
  }
}
