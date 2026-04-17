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

// Rotating copy variants — keeps the same slot from feeling repetitive across days.
// Morning/evening variants are picked by day offset so consecutive days differ.
const MORNING_VARIANTS: ReadonlyArray<{ title: string; body: string }> = [
  { title: '\u{1F3B0} Your daily spin is ready!', body: 'Spin the wheel for coins, gems, and exclusive rewards.' },
  { title: '\u{1F381} Free spin unlocked', body: 'Today\u2019s wheel could drop a legendary outfit. Take a shot.' },
  { title: '\u{1F48E} Rise and spin', body: 'Your daily freebie is waiting \u2014 no coins, no gems, just luck.' },
  { title: '\u{2728} Fresh spin, fresh loot', body: 'New prizes queued on the wheel. Claim before tomorrow resets it.' },
];

const EVENING_VARIANTS: ReadonlyArray<{ title: (n: number) => string; body: string }> = [
  { title: (n) => `\u{1F525} Don't lose your ${n}-day streak!`, body: 'Claim today\u2019s reward before midnight.' },
  { title: (n) => `\u{1F525} ${n} days strong \u2014 don't break it`, body: 'Two minutes to keep the streak alive. Tap to claim.' },
  { title: (n) => `\u{26A0}\uFE0F Your ${n}-day streak ends at midnight`, body: 'Quick tap keeps the fire burning.' },
  { title: (n) => `\u{1F3C6} ${n} days and counting`, body: 'Claim tonight\u2019s bonus before the streak resets.' },
];

const SATURDAY_VARIANTS: ReadonlyArray<{ title: string; body: string }> = [
  { title: '\u{1F6CD}\uFE0F New items in the shop today!', body: 'Fresh outfits, pets, and emotes on sale. Limited time.' },
  { title: '\u{1F525} Shop rotation just dropped', body: 'Four new featured deals live now \u2014 grab them before they\u2019re gone.' },
  { title: '\u{1F48E} This week\u2019s hot picks are live', body: 'Curated outfits and pets, only today. See what\u2019s new.' },
  { title: '\u{1F6D2} Weekend shop refresh', body: 'New rarities on the shelves. Check what made the rotation.' },
];

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
      const variant = MORNING_VARIANTS[(offset - 1) % MORNING_VARIANTS.length];
      await safeSchedule({
        content: {
          title: variant.title,
          body: variant.body,
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
        const variant = EVENING_VARIANTS[(offset - 1) % EVENING_VARIANTS.length];
        await safeSchedule({
          content: {
            title: variant.title(streak),
            body: variant.body,
            categoryIdentifier: DROP4_CATEGORY,
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: evening } as any,
        });
      }
    }
  }

  // Saturday noon — shop rotation reminder. Rotate variant by ISO week so
  // consecutive Saturdays don't repeat the same copy.
  const daysUntilSat = ((6 - now.getDay()) + 7) % 7 || 7;
  const sat = new Date(now);
  sat.setDate(sat.getDate() + daysUntilSat);
  sat.setHours(12, 0, 0, 0);
  const weekIdx = Math.floor(sat.getTime() / (7 * 24 * 60 * 60 * 1000));
  const satVariant = SATURDAY_VARIANTS[((weekIdx % SATURDAY_VARIANTS.length) + SATURDAY_VARIANTS.length) % SATURDAY_VARIANTS.length];
  await safeSchedule({
    content: {
      title: satVariant.title,
      body: satVariant.body,
      categoryIdentifier: DROP4_CATEGORY,
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: sat } as any,
  });
}

