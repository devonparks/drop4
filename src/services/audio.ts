import { Audio } from 'expo-av';

// Sound references — UI SFX only (no voice lines)
const sounds: Record<string, Audio.Sound | null> = {
  tap: null,
  drop: null,
  win: null,
  lose: null,
  coin: null,
  whoosh: null,
  click: null,
};

let isInitialized = false;
let isMuted = false;

export async function initAudio() {
  if (isInitialized) return;
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });
    isInitialized = true;
  } catch (e) {
    console.warn('Audio init failed:', e);
  }
}

async function loadSound(name: string, source: any): Promise<void> {
  try {
    const { sound } = await Audio.Sound.createAsync(source, { shouldPlay: false });
    sounds[name] = sound;
  } catch (e) {
    // Fail silently
  }
}

export async function preloadSounds() {
  await initAudio();

  const soundFiles: Record<string, any> = {
    tap: require('../assets/sounds/tap.wav'),
    drop: require('../assets/sounds/drop.wav'),
    win: require('../assets/sounds/win.wav'),
    lose: require('../assets/sounds/lose.wav'),
    coin: require('../assets/sounds/coin.wav'),
    whoosh: require('../assets/sounds/whoosh.wav'),
    click: require('../assets/sounds/click.wav'),
  };

  await Promise.all(
    Object.entries(soundFiles).map(([name, source]) => loadSound(name, source))
  );
}

export async function playSound(name: keyof typeof sounds) {
  if (isMuted || !sounds[name]) return;
  try {
    const sound = sounds[name]!;
    await sound.setPositionAsync(0);
    await sound.playAsync();
  } catch (e) {
    // Fail silently
  }
}

export function toggleMute(): boolean {
  isMuted = !isMuted;
  return isMuted;
}

export function getMuted(): boolean {
  return isMuted;
}

export async function unloadSounds() {
  for (const sound of Object.values(sounds)) {
    if (sound) await sound.unloadAsync();
  }
}
