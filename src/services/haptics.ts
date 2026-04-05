import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

const HAPTICS_KEY = 'drop4_hapticsEnabled';
let _enabled = true;

// Load persisted setting on startup
AsyncStorage.getItem(HAPTICS_KEY).then(v => {
  if (v !== null) _enabled = v === 'true';
});

export function getHapticsEnabled(): boolean {
  return _enabled;
}

export function setHapticsEnabled(on: boolean): void {
  _enabled = on;
  AsyncStorage.setItem(HAPTICS_KEY, String(on));
}

export const haptics = {
  tap: () => { if (_enabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); },
  drop: () => { if (_enabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); },
  heavy: () => { if (_enabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); },
  win: () => { if (_enabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); },
  error: () => { if (_enabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); },
  select: () => { if (_enabled) Haptics.selectionAsync(); },
};
