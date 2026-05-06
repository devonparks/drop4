/**
 * Animation GLB Registry
 *
 * Curated set of Synty Sidekick (human) + Polygon Dog animation clips.
 * Each entry is a require() to a GLB containing a single AnimationClip.
 *
 * Pipeline:
 *   1) npm run stage-anims         (copies source FBX from Unity project)
 *   2) npm run convert-fbx animations   (FBX → GLB via FBX2glTF)
 */

type AnimationId = string;

export interface AnimationMeta {
  id: AnimationId;
  name: string;
  /** Bundled GLB asset id. Only populated for entries that the legacy
   *  single-GLB renderer still consumes (currently DOG_* via Pet3D).
   *  Human emote/idle clips are streamed by CompositeCharacter from the
   *  AMG content CDN — no bundled require() needed. */
  glb?: number;
  loop: boolean;
  category: 'idle' | 'emote' | 'dance' | 'taunt' | 'greet' | 'dog_idle' | 'dog_action';
  price?: number;
}

// ── Humans: Idles (loops) ──
// AMG runtime streams these from the content CDN — no bundled require()
// needed. The id maps to a relative path under animations/idles/ via
// CompositeCharacter's idleList prop or state.animation field.
export const HUMAN_IDLES: AnimationMeta[] = [
  { id: 'idle_base',                 name: 'Base',              loop: true, category: 'idle' },
  { id: 'idle_hands_on_hips',        name: 'Hands On Hips',     loop: true, category: 'idle' },
  { id: 'idle_arms_folded',          name: 'Arms Folded',       loop: true, category: 'idle' },
  { id: 'idle_hands_on_hips_grumpy', name: 'Grumpy',            loop: true, category: 'idle' },
  { id: 'idle_base_femn',            name: 'Base (F)',          loop: true, category: 'idle' },
  { id: 'idle_hands_on_hips_femn',   name: 'Hands On Hips (F)', loop: true, category: 'idle' },
  { id: 'idle_arms_folded_femn',     name: 'Arms Folded (F)',   loop: true, category: 'idle' },
];

// ── Humans: Idle one-shots ──
const HUMAN_IDLE_ACTIONS: AnimationMeta[] = [
  { id: 'idle_bored_foot_tap',   name: 'Foot Tap',    loop: false, category: 'idle' },
  { id: 'idle_bored_swing_arms', name: 'Swing Arms',  loop: false, category: 'idle' },
  { id: 'idle_bored_slump',      name: 'Slump',       loop: false, category: 'idle' },
  { id: 'idle_check_watch',      name: 'Check Watch', loop: false, category: 'idle' },
];

// ── Humans: Emotes ──
export const HUMAN_EMOTES: AnimationMeta[] = [
  { id: 'emote_dab',                name: 'Dab',               loop: false, category: 'dance', price: 0 },
  { id: 'emote_dance_twist',        name: 'Twist',             loop: false, category: 'dance', price: 500 },
  { id: 'emote_dance_spin_slick',   name: 'Slick Spin',        loop: false, category: 'dance', price: 750 },
  { id: 'emote_dance_greased',      name: 'Greased Lightnin',  loop: false, category: 'dance', price: 1000 },
  { id: 'emote_dance_chest_pump',   name: 'Chest Pump',        loop: false, category: 'dance', price: 500 },
  { id: 'emote_dance_running_step', name: 'Running Step',      loop: false, category: 'dance', price: 500 },
  { id: 'emote_air_guitar',         name: 'Air Guitar',        loop: false, category: 'dance', price: 500 },
  { id: 'emote_bow',                name: 'Bow',               loop: false, category: 'greet', price: 0 },
  { id: 'emote_clap',               name: 'Clap',              loop: false, category: 'greet', price: 0 },
  { id: 'emote_beckon',             name: 'Come Here',         loop: false, category: 'greet', price: 250 },
  { id: 'emote_menacing_fists',     name: 'Menacing Fists',    loop: false, category: 'taunt', price: 750 },
  { id: 'emote_shake_fist',         name: 'Shake Fist',        loop: false, category: 'taunt', price: 500 },
  { id: 'emote_thumbs_down',        name: 'Thumbs Down',       loop: false, category: 'taunt', price: 500 },
  { id: 'emote_tantrum',            name: 'Tantrum',           loop: false, category: 'taunt', price: 1000 },
  { id: 'emote_finger_guns',        name: 'Finger Guns',       loop: false, category: 'emote', price: 250 },
  { id: 'emote_beat_chest',         name: 'Beat Chest',        loop: false, category: 'emote', price: 500 },
  { id: 'emote_dust_shoulder',      name: 'Dust Shoulder',     loop: false, category: 'emote', price: 500 },
  { id: 'emote_hand_on_heart',      name: 'Hand On Heart',     loop: false, category: 'emote', price: 250 },
  { id: 'emote_blow_kiss',          name: 'Blow Kiss',         loop: false, category: 'emote', price: 500 },
  { id: 'emote_heart_hands',        name: 'Heart Hands',       loop: false, category: 'emote', price: 500 },
  { id: 'emote_finger_heart',       name: 'Finger Heart',      loop: false, category: 'emote', price: 250 },
];

// ── Dogs: Idles ──
export const DOG_IDLES: AnimationMeta[] = [
  { id: 'dog_idle',     name: 'Stand', glb: require('../assets/models/animations/dog/dog_idle.glb'),     loop: true, category: 'dog_idle' },
  { id: 'dog_sit_idle', name: 'Sit',   glb: require('../assets/models/animations/dog/dog_sit_idle.glb'), loop: true, category: 'dog_idle' },
  { id: 'dog_sleep',    name: 'Sleep', glb: require('../assets/models/animations/dog/dog_sleep.glb'),    loop: true, category: 'dog_idle' },
];

// "Alive" idle pool — cycle the dog through these every 6-12 s so it
// feels like a real pet shifting around (sniff floor, shake fur,
// scratch, wag tail) instead of frozen in one pose. Mirrors the same
// pattern CompositeCharacter uses for human idle cycling. Devon
// 2026-05-05: "i want the dog to be alive just like the sidekick
// character." All GLBs already exported — just enumerated here.
export const DOG_IDLE_POOL: AnimationMeta[] = [
  // Standing variants — dog is on its feet, doing dog things
  { id: 'dog_idle',         name: 'Stand',     glb: require('../assets/models/animations/dog/dog_idle.glb'),         loop: true, category: 'dog_idle' },
  { id: 'dog_sniff',        name: 'Sniff',     glb: require('../assets/models/animations/dog/dog_sniff.glb'),        loop: true, category: 'dog_idle' },
  { id: 'dog_shake',        name: 'Shake',     glb: require('../assets/models/animations/dog/dog_shake.glb'),        loop: true, category: 'dog_idle' },
  { id: 'dog_dig',          name: 'Dig',       glb: require('../assets/models/animations/dog/dog_dig.glb'),          loop: true, category: 'dog_idle' },
  // Sitting variants — dog parked beside the player, chilling
  { id: 'dog_sit_idle',     name: 'Sit',       glb: require('../assets/models/animations/dog/dog_sit_idle.glb'),     loop: true, category: 'dog_idle' },
  { id: 'dog_sit_tail_wag', name: 'Tail Wag',  glb: require('../assets/models/animations/dog/dog_sit_tail_wag.glb'), loop: true, category: 'dog_idle' },
  { id: 'dog_sit_yawn',     name: 'Yawn',      glb: require('../assets/models/animations/dog/dog_sit_yawn.glb'),     loop: true, category: 'dog_idle' },
  { id: 'dog_sit_scratch',  name: 'Scratch',   glb: require('../assets/models/animations/dog/dog_sit_scratch.glb'),  loop: true, category: 'dog_idle' },
];

// Dog "emote" pool — one-shot reactions when player taps the dog.
// Plays once, dog returns to idle pool afterward. Mirrors the
// character tap-to-emote pattern.
export const DOG_EMOTE_POOL: AnimationMeta[] = [
  { id: 'dog_bark',         name: 'Bark',      glb: require('../assets/models/animations/dog/dog_bark.glb'),         loop: false, category: 'dog_action' },
  { id: 'dog_howl',         name: 'Howl',      glb: require('../assets/models/animations/dog/dog_howl.glb'),         loop: false, category: 'dog_action' },
  { id: 'dog_beg',          name: 'Beg',       glb: require('../assets/models/animations/dog/dog_beg.glb'),          loop: false, category: 'dog_action' },
  { id: 'dog_shake_toy',    name: 'Toy',       glb: require('../assets/models/animations/dog/dog_shake_toy.glb'),    loop: false, category: 'dog_action' },
  { id: 'dog_sit_bark',     name: 'Sit Bark',  glb: require('../assets/models/animations/dog/dog_sit_bark.glb'),     loop: false, category: 'dog_action' },
  { id: 'dog_sit_howl',     name: 'Sit Howl',  glb: require('../assets/models/animations/dog/dog_sit_howl.glb'),     loop: false, category: 'dog_action' },
  { id: 'dog_sit_beg',      name: 'Sit Beg',   glb: require('../assets/models/animations/dog/dog_sit_beg.glb'),      loop: false, category: 'dog_action' },
];

