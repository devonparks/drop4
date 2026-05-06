import { Audio } from 'expo-av';
import { logger } from '../utils/logger';

// Sound references — Kenney Interface Sounds (CC0) + AMG Studios pack
//
// Audit 2026-05-06: dropped 5 entries (tick / pluck / select / open /
// countdown) that were preloaded at startup but never called from any
// caller in the codebase. The .wav files stay on disk under
// src/assets/sounds/ so they can be re-added when a caller actually
// wires them up — this just stops paying the preload cost for sounds
// nobody is playing.
const sounds: Record<string, Audio.Sound | null> = {
  // Core UI — taps and clicks
  tap: null,         // existing: light tap
  click: null,       // upgraded: Kenney click_001 (better quality than prior)
  whoosh: null,      // existing: navigation whoosh
  swoosh: null,      // existing: alt navigation swoosh
  // Interactions
  toggle: null,      // NEW: Kenney toggle_001 — switches
  tab_switch: null,  // NEW: Kenney switch_003 — bottom tab change
  back: null,        // NEW: Kenney back_002 — back navigation
  // Modals
  close: null,       // NEW: Kenney close_001 — modal/sheet closes
  modal_in: null,    // NEW: Kenney maximize_003 — large modal entrance
  modal_out: null,   // NEW: Kenney minimize_003 — large modal exit
  // Feedback
  error: null,       // NEW: Kenney error_003 — invalid taps / failed actions
  purchase: null,    // FIX: was missing (5 silent callers) — Kenney confirmation_001
  // Gameplay
  drop: null,
  win: null,
  lose: null,
  coin: null,
  // Events
  level_up: null,
  achievement: null,
  boss_intro: null,
  match_found: null,
};

let isInitialized = false;
let isMuted = false;

async function initAudio() {
  if (isInitialized) return;
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });
    isInitialized = true;
  } catch (e) {
    logger.warn('Audio init failed:', e);
  }
}

async function loadSound(name: string, source: any): Promise<void> {
  try {
    const { sound } = await Audio.Sound.createAsync(source, { shouldPlay: false });
    sounds[name] = sound;
  } catch (e) {
    // Fail silently — sound file may not exist yet
  }
}

export async function preloadSounds() {
  await initAudio();

  const soundFiles: Record<string, any> = {
    // Core UI
    tap: require('../assets/sounds/tap.wav'),
    click: require('../assets/sounds/click.wav'),
    whoosh: require('../assets/sounds/whoosh.wav'),
    swoosh: require('../assets/sounds/swoosh.wav'),
    // Interactions
    toggle: require('../assets/sounds/toggle.wav'),
    tab_switch: require('../assets/sounds/tab_switch.wav'),
    back: require('../assets/sounds/back.wav'),
    // Modals
    close: require('../assets/sounds/close.wav'),
    modal_in: require('../assets/sounds/modal_in.wav'),
    modal_out: require('../assets/sounds/modal_out.wav'),
    // Feedback
    error: require('../assets/sounds/error.wav'),
    purchase: require('../assets/sounds/purchase.wav'),
    // Gameplay
    drop: require('../assets/sounds/drop.wav'),
    win: require('../assets/sounds/win.wav'),
    lose: require('../assets/sounds/lose.wav'),
    coin: require('../assets/sounds/coin.wav'),
    // Events
    level_up: require('../assets/sounds/level_up.wav'),
    achievement: require('../assets/sounds/achievement.wav'),
    boss_intro: require('../assets/sounds/boss_intro.wav'),
    match_found: require('../assets/sounds/match_found.wav'),
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

