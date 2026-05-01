// ═══════════════════════════════════════════════════════════════════════
// cosmeticIcons.ts — generated icon art lookup for emotes / idles / packs.
//
// These PNGs come from `tools/gen-art.mjs` (OpenAI gpt-image-1) and live
// in `src/assets/images/ui/`. They follow the chunky 3D dimensional
// VISUAL_DIRECTION_LOCKIN style — chunky figure / mascot art per cosmetic.
//
// Use these instead of emojis everywhere a cosmetic is shown in the UI.
// require() paths must be literal so Metro can bundle the assets.
// ═══════════════════════════════════════════════════════════════════════

import type { ImageSourcePropType } from 'react-native';

// ── Emote icons (keyed by AMG emote_* id from animationRegistry) ──

export const EMOTE_ICON: Record<string, ImageSourcePropType> = {
  // Dance
  emote_dab: require('../assets/images/ui/emote-dab.png'),
  emote_dance_twist: require('../assets/images/ui/emote-dance-twist.png'),
  emote_dance_spin_slick: require('../assets/images/ui/emote-dance-spin-slick.png'),
  emote_dance_greased: require('../assets/images/ui/emote-dance-greased.png'),
  emote_dance_chest_pump: require('../assets/images/ui/emote-dance-chest-pump.png'),
  emote_dance_running_step: require('../assets/images/ui/emote-dance-running-step.png'),
  emote_air_guitar: require('../assets/images/ui/emote-air-guitar.png'),
  // Greet
  emote_bow: require('../assets/images/ui/emote-bow.png'),
  emote_clap: require('../assets/images/ui/emote-clap.png'),
  emote_beckon: require('../assets/images/ui/emote-beckon.png'),
  // Taunt
  emote_menacing_fists: require('../assets/images/ui/emote-menacing-fists.png'),
  emote_shake_fist: require('../assets/images/ui/emote-shake-fist.png'),
  emote_thumbs_down: require('../assets/images/ui/emote-thumbs-down.png'),
  emote_tantrum: require('../assets/images/ui/emote-tantrum.png'),
  // General
  emote_finger_guns: require('../assets/images/ui/emote-finger-guns.png'),
  emote_beat_chest: require('../assets/images/ui/emote-beat-chest.png'),
  emote_dust_shoulder: require('../assets/images/ui/emote-dust-shoulder.png'),
  emote_hand_on_heart: require('../assets/images/ui/emote-hand-on-heart.png'),
  emote_blow_kiss: require('../assets/images/ui/emote-blow-kiss.png'),
  emote_heart_hands: require('../assets/images/ui/emote-heart-hands.png'),
  emote_finger_heart: require('../assets/images/ui/emote-finger-heart.png'),
};

// ── Idle icons (keyed by AMG idle_* id from animationRegistry) ──

export const IDLE_ICON: Record<string, ImageSourcePropType> = {
  idle_base: require('../assets/images/ui/idle-base.png'),
  idle_hands_on_hips: require('../assets/images/ui/idle-hands-on-hips.png'),
  idle_arms_folded: require('../assets/images/ui/idle-arms-folded.png'),
  idle_bored_foot_tap: require('../assets/images/ui/idle-bored-foot-tap.png'),
  idle_bored_swing_arms: require('../assets/images/ui/idle-bored-swing-arms.png'),
  idle_bored_slump: require('../assets/images/ui/idle-bored-slump.png'),
  idle_check_watch: require('../assets/images/ui/idle-check-watch.png'),
  // Femn variants share the male's icon — pose is identical, only rig differs
  idle_base_femn: require('../assets/images/ui/idle-base.png'),
  idle_hands_on_hips_femn: require('../assets/images/ui/idle-hands-on-hips.png'),
  idle_arms_folded_femn: require('../assets/images/ui/idle-arms-folded.png'),
  // Grumpy variant uses hands-on-hips with a different mood; pose icon reuses
  idle_hands_on_hips_grumpy: require('../assets/images/ui/idle-hands-on-hips.png'),
};

// ── Pack covers (keyed by Sidekick pack code: MDRN_CIVL, FANT_KNGT, etc.) ──

export const PACK_ICON: Record<string, ImageSourcePropType> = {
  HUMN_BASE: require('../assets/images/ui/pack-humn-base.png'),
  ELVN_BASE: require('../assets/images/ui/pack-elvn-base.png'),
  GOBL_BASE: require('../assets/images/ui/pack-gobl-base.png'),
  SKTN_BASE: require('../assets/images/ui/pack-sktn-base.png'),
  ZOMB_BASE: require('../assets/images/ui/pack-zomb-base.png'),
  MDRN_CIVL: require('../assets/images/ui/pack-mdrn-civl.png'),
  MDRN_POLC: require('../assets/images/ui/pack-mdrn-polc.png'),
  SCFI_CIVL: require('../assets/images/ui/pack-scfi-civl.png'),
  SCFI_SOLD: require('../assets/images/ui/pack-scfi-sold.png'),
  FANT_KNGT: require('../assets/images/ui/pack-fant-kngt.png'),
  FANT_VILL: require('../assets/images/ui/pack-fant-vill.png'),
  FANT_SKTN: require('../assets/images/ui/pack-fant-sktn.png'),
  SAMR_WARR: require('../assets/images/ui/pack-samr-warr.png'),
  VIKG_WARR: require('../assets/images/ui/pack-vikg-warr.png'),
  ELVN_WARR: require('../assets/images/ui/pack-elvn-warr.png'),
  GOBL_FIGT: require('../assets/images/ui/pack-gobl-figt.png'),
  APOC_OUTL: require('../assets/images/ui/pack-apoc-outl.png'),
  APOC_SURV: require('../assets/images/ui/pack-apoc-surv.png'),
  APOC_ZOMB: require('../assets/images/ui/pack-apoc-zomb.png'),
  HORR_VILN: require('../assets/images/ui/pack-horr-viln.png'),
  PIRT_CAPT: require('../assets/images/ui/pack-pirt-capt.png'),
};

// ── Helpers ──

export function getEmoteIcon(emoteId: string): ImageSourcePropType | undefined {
  return EMOTE_ICON[emoteId];
}

export function getIdleIcon(idleId: string): ImageSourcePropType | undefined {
  return IDLE_ICON[idleId];
}

export function getPackIcon(packCode: string): ImageSourcePropType | undefined {
  return PACK_ICON[packCode];
}
