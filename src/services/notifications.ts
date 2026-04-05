import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { db, getCurrentUser } from './firebase';
import { doc, updateDoc } from 'firebase/firestore';

// ============ NOTIFICATION HANDLER (module-level) ============

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// ============ PUSH TOKEN REGISTRATION ============

/**
 * Registers the device for push notifications and stores the
 * Expo push token on the user's Firestore profile.
 * Returns the token string or null if registration fails.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  try {
    // Push notifications only work on physical devices
    if (!Device.isDevice) {
      console.warn('Push notifications require a physical device');
      return null;
    }

    // Check / request permission
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('Push notification permission not granted');
      return null;
    }

    // Get the Expo push token
    const tokenData = await Notifications.getExpoPushTokenAsync();
    const token = tokenData.data;

    // Android needs a notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#ff8c00',
      });
    }

    // Store token in Firestore on the user's profile
    const user = getCurrentUser();
    if (user) {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { pushToken: token }).catch(() => {
        // If the doc doesn't exist yet, that's fine — it will be created later
        console.warn('Could not update push token on user profile (doc may not exist yet)');
      });
    }

    return token;
  } catch (error) {
    console.warn('registerForPushNotifications failed:', error);
    return null;
  }
}

// ============ LOCAL SCHEDULED NOTIFICATIONS ============

/**
 * Schedules a daily local notification at 7 PM reminding the user
 * to collect their daily rewards.
 */
export async function scheduleDailyReminder(): Promise<string | null> {
  try {
    // Cancel any existing daily reminder first
    await cancelNotificationsByTag('daily-reminder');

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Drop4',
        body: 'Your daily rewards are waiting! 🎁',
        data: { screen: 'Home', tag: 'daily-reminder' },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 19,
        minute: 0,
      },
    });

    return id;
  } catch (error) {
    console.warn('scheduleDailyReminder failed:', error);
    return null;
  }
}

/**
 * Schedules a notification 24 hours from now reminding the user
 * that their win streak is waiting.
 */
export async function scheduleInactivityReminder(): Promise<string | null> {
  try {
    // Cancel any existing inactivity reminder first
    await cancelNotificationsByTag('inactivity-reminder');

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Drop4',
        body: 'Your win streak is waiting! 🔥',
        data: { screen: 'Home', tag: 'inactivity-reminder' },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 24 * 60 * 60, // 24 hours
      },
    });

    return id;
  } catch (error) {
    console.warn('scheduleInactivityReminder failed:', error);
    return null;
  }
}

// ============ IMMEDIATE LOCAL NOTIFICATIONS ============

/**
 * Shows a local notification when a friend invites the user to a match.
 */
export async function sendMatchInviteNotification(friendName: string): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Match Invite!',
        body: `${friendName} invited you to play!`,
        data: { screen: 'Lobby', tag: 'match-invite' },
        sound: true,
      },
      trigger: null, // Show immediately
    });
  } catch (error) {
    console.warn('sendMatchInviteNotification failed:', error);
  }
}

// ============ RESPONSE HANDLING ============

/**
 * Handles when the user taps on a notification.
 * Returns the target screen name from the notification data,
 * so the caller can navigate accordingly.
 */
export function handleNotificationResponse(
  response: Notifications.NotificationResponse
): { screen: string } | null {
  try {
    const data = response.notification.request.content.data;
    if (data && typeof data.screen === 'string') {
      return { screen: data.screen };
    }
    return null;
  } catch (error) {
    console.warn('handleNotificationResponse failed:', error);
    return null;
  }
}

/**
 * Sets up the global notification response listener.
 * Call this once at app startup (e.g., in App.tsx).
 * Returns a cleanup function.
 */
export function setupNotificationResponseListener(
  onNavigate: (screen: string) => void
): () => void {
  const subscription = Notifications.addNotificationResponseReceivedListener(
    (response: Notifications.NotificationResponse) => {
      const result = handleNotificationResponse(response);
      if (result) {
        onNavigate(result.screen);
      }
    }
  );

  return () => subscription.remove();
}

// ============ CANCELLATION ============

/**
 * Cancels all scheduled notifications.
 */
export async function cancelAllScheduled(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.warn('cancelAllScheduled failed:', error);
  }
}

/**
 * Cancels scheduled notifications matching a specific tag.
 */
async function cancelNotificationsByTag(tag: string): Promise<void> {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const notification of scheduled) {
      if (notification.content.data?.tag === tag) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      }
    }
  } catch (error) {
    console.warn('cancelNotificationsByTag failed:', error);
  }
}
