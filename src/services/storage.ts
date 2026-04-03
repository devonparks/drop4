import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_PREFIX = 'drop4_';

export async function saveState(key: string, state: any): Promise<void> {
  try {
    const json = JSON.stringify(state);
    await AsyncStorage.setItem(STORAGE_PREFIX + key, json);
  } catch (e) {
    // Fail silently — don't crash the app over storage issues
  }
}

export async function loadState<T>(key: string): Promise<T | null> {
  try {
    const json = await AsyncStorage.getItem(STORAGE_PREFIX + key);
    if (json) return JSON.parse(json) as T;
    return null;
  } catch (e) {
    return null;
  }
}

export async function clearState(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_PREFIX + key);
  } catch (e) {
    // Fail silently
  }
}

// Save all critical stores
export async function saveAllStores(stores: Record<string, any>): Promise<void> {
  const promises = Object.entries(stores).map(([key, state]) =>
    saveState(key, state)
  );
  await Promise.all(promises);
}
