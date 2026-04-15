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

export type AnimationId = string;

export interface AnimationMeta {
  id: AnimationId;
  name: string;
  glb: number;
  loop: boolean;
  category: 'idle' | 'emote' | 'dance' | 'taunt' | 'greet' | 'dog_idle' | 'dog_action';
  price?: number;
}

// ── Humans: Idles (loops) ──
export const HUMAN_IDLES: AnimationMeta[] = [
  { id: 'idle_base',                 name: 'Base',          glb: require('../assets/models/animations/idles/idle_base.glb'),                 loop: true, category: 'idle' },
  { id: 'idle_arms_folded',          name: 'Arms Folded',   glb: require('../assets/models/animations/idles/idle_arms_folded.glb'),          loop: true, category: 'idle' },
  { id: 'idle_hands_on_hips',        name: 'Hands On Hips', glb: require('../assets/models/animations/idles/idle_hands_on_hips.glb'),        loop: true, category: 'idle' },
  { id: 'idle_hands_on_hips_grumpy', name: 'Grumpy',        glb: require('../assets/models/animations/idles/idle_hands_on_hips_grumpy.glb'), loop: true, category: 'idle' },
  { id: 'idle_base_femn',            name: 'Base (F)',      glb: require('../assets/models/animations/idles/idle_base_femn.glb'),            loop: true, category: 'idle' },
  { id: 'idle_hands_on_hips_femn',   name: 'Hands On Hips (F)', glb: require('../assets/models/animations/idles/idle_hands_on_hips_femn.glb'), loop: true, category: 'idle' },
  { id: 'idle_arms_folded_femn',     name: 'Arms Folded (F)', glb: require('../assets/models/animations/idles/idle_arms_folded_femn.glb'),   loop: true, category: 'idle' },
];

// ── Humans: Idle one-shots ──
export const HUMAN_IDLE_ACTIONS: AnimationMeta[] = [
  { id: 'idle_bored_foot_tap',   name: 'Foot Tap',    glb: require('../assets/models/animations/idles/idle_bored_foot_tap.glb'),   loop: false, category: 'idle' },
  { id: 'idle_bored_swing_arms', name: 'Swing Arms',  glb: require('../assets/models/animations/idles/idle_bored_swing_arms.glb'), loop: false, category: 'idle' },
  { id: 'idle_bored_slump',      name: 'Slump',       glb: require('../assets/models/animations/idles/idle_bored_slump.glb'),      loop: false, category: 'idle' },
  { id: 'idle_check_watch',      name: 'Check Watch', glb: require('../assets/models/animations/idles/idle_check_watch.glb'),      loop: false, category: 'idle' },
];

// ── Humans: Emotes ──
export const HUMAN_EMOTES: AnimationMeta[] = [
  { id: 'emote_dab',              name: 'Dab',              glb: require('../assets/models/animations/emotes/emote_dab.glb'),              loop: false, category: 'dance', price: 0 },
  { id: 'emote_dance_twist',      name: 'Twist',            glb: require('../assets/models/animations/emotes/emote_dance_twist.glb'),      loop: false, category: 'dance', price: 500 },
  { id: 'emote_dance_spin_slick', name: 'Slick Spin',       glb: require('../assets/models/animations/emotes/emote_dance_spin_slick.glb'), loop: false, category: 'dance', price: 750 },
  { id: 'emote_dance_greased',    name: 'Greased Lightnin', glb: require('../assets/models/animations/emotes/emote_dance_greased.glb'),    loop: false, category: 'dance', price: 1000 },
  { id: 'emote_dance_chest_pump', name: 'Chest Pump',       glb: require('../assets/models/animations/emotes/emote_dance_chest_pump.glb'), loop: false, category: 'dance', price: 500 },
  { id: 'emote_dance_running_step', name: 'Running Step',   glb: require('../assets/models/animations/emotes/emote_dance_running_step.glb'), loop: false, category: 'dance', price: 500 },
  { id: 'emote_air_guitar',       name: 'Air Guitar',       glb: require('../assets/models/animations/emotes/emote_air_guitar.glb'),       loop: false, category: 'dance', price: 500 },
  { id: 'emote_bow',              name: 'Bow',              glb: require('../assets/models/animations/emotes/emote_bow.glb'),              loop: false, category: 'greet', price: 0 },
  { id: 'emote_clap',             name: 'Clap',             glb: require('../assets/models/animations/emotes/emote_clap.glb'),             loop: false, category: 'greet', price: 0 },
  { id: 'emote_beckon',           name: 'Come Here',        glb: require('../assets/models/animations/emotes/emote_beckon.glb'),           loop: false, category: 'greet', price: 250 },
  { id: 'emote_menacing_fists',   name: 'Menacing Fists',   glb: require('../assets/models/animations/emotes/emote_menacing_fists.glb'),   loop: false, category: 'taunt', price: 750 },
  { id: 'emote_shake_fist',       name: 'Shake Fist',       glb: require('../assets/models/animations/emotes/emote_shake_fist.glb'),       loop: false, category: 'taunt', price: 500 },
  { id: 'emote_thumbs_down',      name: 'Thumbs Down',      glb: require('../assets/models/animations/emotes/emote_thumbs_down.glb'),      loop: false, category: 'taunt', price: 500 },
  { id: 'emote_tantrum',          name: 'Tantrum',          glb: require('../assets/models/animations/emotes/emote_tantrum.glb'),          loop: false, category: 'taunt', price: 1000 },
  { id: 'emote_finger_guns',      name: 'Finger Guns',      glb: require('../assets/models/animations/emotes/emote_finger_guns.glb'),      loop: false, category: 'emote', price: 250 },
  { id: 'emote_beat_chest',       name: 'Beat Chest',       glb: require('../assets/models/animations/emotes/emote_beat_chest.glb'),       loop: false, category: 'emote', price: 500 },
  { id: 'emote_dust_shoulder',    name: 'Dust Shoulder',    glb: require('../assets/models/animations/emotes/emote_dust_shoulder.glb'),    loop: false, category: 'emote', price: 500 },
  { id: 'emote_hand_on_heart',    name: 'Hand On Heart',    glb: require('../assets/models/animations/emotes/emote_hand_on_heart.glb'),    loop: false, category: 'emote', price: 250 },
  { id: 'emote_blow_kiss',        name: 'Blow Kiss',        glb: require('../assets/models/animations/emotes/emote_blow_kiss.glb'),        loop: false, category: 'emote', price: 500 },
  { id: 'emote_heart_hands',      name: 'Heart Hands',      glb: require('../assets/models/animations/emotes/emote_heart_hands.glb'),      loop: false, category: 'emote', price: 500 },
  { id: 'emote_finger_heart',     name: 'Finger Heart',     glb: require('../assets/models/animations/emotes/emote_finger_heart.glb'),     loop: false, category: 'emote', price: 250 },
];

// ── Dogs: Idles ──
export const DOG_IDLES: AnimationMeta[] = [
  { id: 'dog_idle',     name: 'Stand', glb: require('../assets/models/animations/dog/dog_idle.glb'),     loop: true, category: 'dog_idle' },
  { id: 'dog_sit_idle', name: 'Sit',   glb: require('../assets/models/animations/dog/dog_sit_idle.glb'), loop: true, category: 'dog_idle' },
  { id: 'dog_sleep',    name: 'Sleep', glb: require('../assets/models/animations/dog/dog_sleep.glb'),    loop: true, category: 'dog_idle' },
];

// ── Dogs: Actions ──
export const DOG_ACTIONS: AnimationMeta[] = [
  { id: 'dog_bark',         name: 'Bark',      glb: require('../assets/models/animations/dog/dog_bark.glb'),         loop: false, category: 'dog_action' },
  { id: 'dog_beg',          name: 'Beg',       glb: require('../assets/models/animations/dog/dog_beg.glb'),          loop: false, category: 'dog_action' },
  { id: 'dog_howl',         name: 'Howl',      glb: require('../assets/models/animations/dog/dog_howl.glb'),         loop: false, category: 'dog_action' },
  { id: 'dog_shake',        name: 'Shake',     glb: require('../assets/models/animations/dog/dog_shake.glb'),        loop: false, category: 'dog_action' },
  { id: 'dog_shake_toy',    name: 'Shake Toy', glb: require('../assets/models/animations/dog/dog_shake_toy.glb'),    loop: false, category: 'dog_action' },
  { id: 'dog_sniff',        name: 'Sniff',     glb: require('../assets/models/animations/dog/dog_sniff.glb'),        loop: false, category: 'dog_action' },
  { id: 'dog_dig',          name: 'Dig',       glb: require('../assets/models/animations/dog/dog_dig.glb'),          loop: false, category: 'dog_action' },
  { id: 'dog_sit_bark',     name: 'Sit Bark',  glb: require('../assets/models/animations/dog/dog_sit_bark.glb'),     loop: false, category: 'dog_action' },
  { id: 'dog_sit_beg',      name: 'Sit Beg',   glb: require('../assets/models/animations/dog/dog_sit_beg.glb'),      loop: false, category: 'dog_action' },
  { id: 'dog_sit_howl',     name: 'Sit Howl',  glb: require('../assets/models/animations/dog/dog_sit_howl.glb'),     loop: false, category: 'dog_action' },
  { id: 'dog_sit_scratch',  name: 'Scratch',   glb: require('../assets/models/animations/dog/dog_sit_scratch.glb'),  loop: false, category: 'dog_action' },
  { id: 'dog_sit_tail_wag', name: 'Tail Wag',  glb: require('../assets/models/animations/dog/dog_sit_tail_wag.glb'), loop: true,  category: 'dog_action' },
  { id: 'dog_sit_yawn',     name: 'Yawn',      glb: require('../assets/models/animations/dog/dog_sit_yawn.glb'),     loop: false, category: 'dog_action' },
];

export const ALL_HUMAN_ANIMATIONS: AnimationMeta[] = [
  ...HUMAN_IDLES,
  ...HUMAN_IDLE_ACTIONS,
  ...HUMAN_EMOTES,
];

export const ALL_DOG_ANIMATIONS: AnimationMeta[] = [
  ...DOG_IDLES,
  ...DOG_ACTIONS,
];

export const DEFAULT_HUMAN_IDLE: AnimationMeta | null = HUMAN_IDLES[0] ?? null;
export const DEFAULT_DOG_IDLE: AnimationMeta | null = DOG_IDLES[0] ?? null;

export function findAnimation(id: AnimationId): AnimationMeta | null {
  return (
    ALL_HUMAN_ANIMATIONS.find((a) => a.id === id) ||
    ALL_DOG_ANIMATIONS.find((a) => a.id === id) ||
    null
  );
}
