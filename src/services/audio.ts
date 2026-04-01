import { Audio } from 'expo-av';
import { Platform } from 'react-native';

// Sound references
let sounds: Record<string, Audio.Sound | null> = {
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

// Initialize audio system
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

// Preload a sound file
async function loadSound(name: string, source: any): Promise<void> {
  try {
    const { sound } = await Audio.Sound.createAsync(source, { shouldPlay: false });
    sounds[name] = sound;
  } catch (e) {
    // Sound file may not exist yet - fail silently
    console.warn(`Failed to load sound "${name}":`, e);
  }
}

// Preload all sounds at app startup
export async function preloadSounds() {
  await initAudio();

  // These will be loaded when actual sound files are added to assets/sounds/
  // For now, the play function handles missing sounds gracefully
  const soundFiles: Record<string, any> = {};

  try {
    // Attempt to require sound files — they may not exist yet
    // soundFiles.tap = require('../assets/sounds/tap.mp3');
    // soundFiles.drop = require('../assets/sounds/drop.mp3');
    // soundFiles.win = require('../assets/sounds/win.mp3');
    // soundFiles.lose = require('../assets/sounds/lose.mp3');
    // soundFiles.coin = require('../assets/sounds/coin.mp3');
    // soundFiles.whoosh = require('../assets/sounds/whoosh.mp3');
    // soundFiles.click = require('../assets/sounds/click.mp3');
  } catch (e) {
    // Expected when sound files aren't present yet
  }

  for (const [name, source] of Object.entries(soundFiles)) {
    await loadSound(name, source);
  }
}

// Play a sound by name
export async function playSound(name: keyof typeof sounds) {
  if (isMuted || !sounds[name]) return;

  try {
    const sound = sounds[name]!;
    await sound.setPositionAsync(0);
    await sound.playAsync();
  } catch (e) {
    // Fail silently — missing sounds shouldn't crash the game
  }
}

// Toggle mute
export function toggleMute(): boolean {
  isMuted = !isMuted;
  return isMuted;
}

export function getMuted(): boolean {
  return isMuted;
}

// Cleanup
export async function unloadSounds() {
  for (const sound of Object.values(sounds)) {
    if (sound) {
      await sound.unloadAsync();
    }
  }
  sounds = { tap: null, drop: null, win: null, lose: null, coin: null, whoosh: null, click: null };
}
