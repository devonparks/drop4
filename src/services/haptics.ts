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
  /** Strong double vibration for level-ups */
  levelUp: () => {
    if (!_enabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 150);
  },
  /** Triple pulse for achievements */
  achievement: () => {
    if (!_enabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium), 120);
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium), 240);
  },
  /** Light tap for coin earning */
  coinEarn: () => { if (_enabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); },
};
