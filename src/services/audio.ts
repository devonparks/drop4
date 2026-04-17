import { Audio } from 'expo-av';
import { logger } from '../utils/logger';

// Sound references — Kenney Interface Sounds (CC0) + AMG Studios pack
const sounds: Record<string, Audio.Sound | null> = {
  // Core UI — taps and clicks
  tap: null,         // existing: light tap
  click: null,       // upgraded: Kenney click_001 (better quality than prior)
  tick: null,        // NEW: Kenney tick_002 — subtle nav tick
  pluck: null,       // NEW: Kenney pluck_001 — subtle accent (selection highlight)
  whoosh: null,      // existing: navigation whoosh
  swoosh: null,      // existing: alt navigation swoosh
  // Interactions
  select: null,      // NEW: Kenney select_001 — picking an item / category
  toggle: null,      // NEW: Kenney toggle_001 — switches
  tab_switch: null,  // NEW: Kenney switch_003 — bottom tab change
  back: null,        // NEW: Kenney back_002 — back navigation
  // Modals
  open: null,        // NEW: Kenney open_004 — modal/sheet opens
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
  countdown: null,
  boss_intro: null,
  match_found: null,
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
    tick: require('../assets/sounds/tick.wav'),
    pluck: require('../assets/sounds/pluck.wav'),
    whoosh: require('../assets/sounds/whoosh.wav'),
    swoosh: require('../assets/sounds/swoosh.wav'),
    // Interactions
    select: require('../assets/sounds/select.wav'),
    toggle: require('../assets/sounds/toggle.wav'),
    tab_switch: require('../assets/sounds/tab_switch.wav'),
    back: require('../assets/sounds/back.wav'),
    // Modals
    open: require('../assets/sounds/open.wav'),
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
    countdown: require('../assets/sounds/countdown.wav'),
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

