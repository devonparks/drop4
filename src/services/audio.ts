import { Audio } from 'expo-av';

// Sound references
const sounds: Record<string, Audio.Sound | null> = {
  // UI SFX
  tap: null,
  drop: null,
  win: null,
  lose: null,
  coin: null,
  whoosh: null,
  click: null,
  // AI Voice Lines
  voice_nice_move: null,
  voice_my_turn: null,
  voice_you_win: null,
  voice_i_win: null,
  voice_thinking: null,
  voice_good_game: null,
  voice_oh_no: null,
  voice_bring_it: null,
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
    // UI SFX
    tap: require('../assets/sounds/tap.wav'),
    drop: require('../assets/sounds/drop.wav'),
    win: require('../assets/sounds/win.wav'),
    lose: require('../assets/sounds/lose.wav'),
    coin: require('../assets/sounds/coin.wav'),
    whoosh: require('../assets/sounds/whoosh.wav'),
    click: require('../assets/sounds/click.wav'),
    // AI Voice Lines
    voice_nice_move: require('../assets/sounds/voice_nice_move.wav'),
    voice_my_turn: require('../assets/sounds/voice_my_turn.wav'),
    voice_you_win: require('../assets/sounds/voice_you_win.wav'),
    voice_i_win: require('../assets/sounds/voice_i_win.wav'),
    voice_thinking: require('../assets/sounds/voice_thinking.wav'),
    voice_good_game: require('../assets/sounds/voice_good_game.wav'),
    voice_oh_no: require('../assets/sounds/voice_oh_no.wav'),
    voice_bring_it: require('../assets/sounds/voice_bring_it.wav'),
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

// Play a random voice line from a category
export async function playRandomVoice(category: 'thinking' | 'win' | 'lose' | 'taunt') {
  const voiceMap: Record<string, string[]> = {
    thinking: ['voice_thinking', 'voice_my_turn'],
    win: ['voice_i_win'],
    lose: ['voice_you_win', 'voice_good_game'],
    taunt: ['voice_nice_move', 'voice_oh_no', 'voice_bring_it'],
  };
  const options = voiceMap[category];
  const pick = options[Math.floor(Math.random() * options.length)];
  await playSound(pick as keyof typeof sounds);
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
