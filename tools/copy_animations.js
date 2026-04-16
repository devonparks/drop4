#!/usr/bin/env node
/**
 * Drop4 animation stager
 *
 * The Synty Sidekick + Polygon Dog packs already ship each animation as its
 * own FBX clip. We do NOT need to re-export from Unity — we copy a curated
 * selection straight into fbx_export/animations/, then run FBX2glTF on that
 * folder via `npm run convert-fbx animations`.
 *
 * Usage: node tools/copy_animations.js
 */

const fs = require('fs');
const path = require('path');

const UNITY_ROOT = path.resolve(
  'C:/Users/devon/OneDrive/Desktop/Unity Games/Synty Character Creator/Assets'
);
const OUT_ROOT = path.resolve(__dirname, '..', 'fbx_export', 'animations');

// CRITICAL: Use Sidekick (A_MOD_*) clips, NOT Polygon (A_POLY_*) clips!
// The Character Creator exports use the Sidekick skeleton bone names.
// Polygon clips have different bone names (UpperLeg_R vs the Sidekick names)
// and will result in T-pose with "No target node found" warnings.
const MASC = `${UNITY_ROOT}/Synty/AnimationIdles/Animations/Sidekick/Masculine`;
const FEMN = `${UNITY_ROOT}/Synty/AnimationIdles/Animations/Sidekick/Feminine`;
const EMOTES_M = `${UNITY_ROOT}/Synty/AnimationEmotesAndTaunts/Animations/Sidekick/Masculine`;
const EMOTES_F = `${UNITY_ROOT}/Synty/AnimationEmotesAndTaunts/Animations/Sidekick/Feminine`;
const DOG = `${UNITY_ROOT}/PolygonDog/Animations`;

// Curated idles (loops only — enter/exit excluded)
const HUMAN_IDLES = [
  // Base standing loop (the default)
  [`${MASC}/Base/Stances/A_MOD_IDL_Base_Masc.fbx`, 'idle_base'],
  // Looping stances — these cycle on home screen
  [`${MASC}/ArmsFolded/Stances/A_MOD_IDL_ArmsFolded_Casual_Loop_Masc.fbx`, 'idle_arms_folded'],
  [`${MASC}/HandsOnHips/Stances/A_MOD_IDL_HandsOnHips_Base_Loop_Masc.fbx`, 'idle_hands_on_hips'],
  [`${MASC}/HandsOnHips/Stances/A_MOD_IDL_HandsOnHips_Grumpy_Loop_Masc.fbx`, 'idle_hands_on_hips_grumpy'],
  // Short idle actions (one-shots that blend back to base)
  [`${MASC}/Bored/Actions/A_MOD_IDL_Bored_FootTap_Masc.fbx`, 'idle_bored_foot_tap'],
  [`${MASC}/Bored/Actions/A_MOD_IDL_Bored_SwingArms_Masc.fbx`, 'idle_bored_swing_arms'],
  [`${MASC}/Bored/Actions/A_MOD_IDL_Bored_SlumpBack_Masc.fbx`, 'idle_bored_slump'],
  [`${MASC}/CheckWatch/Actions/A_MOD_IDL_CheckWatch_Masc.fbx`, 'idle_check_watch'],
  // Feminine base (for feminine preset)
  [`${FEMN}/Base/Stances/A_MOD_IDL_Base_Femn.fbx`, 'idle_base_femn'],
  [`${FEMN}/HandsOnHips/Stances/A_MOD_IDL_HandsOnHips_Base_Loop_Femn.fbx`, 'idle_hands_on_hips_femn'],
  [`${FEMN}/ArmsFolded/Stances/A_MOD_IDL_ArmsFolded_Casual_Loop_Femn.fbx`, 'idle_arms_folded_femn'],
];

// Curated emotes (taunts, dances, celebrations, greets). These are one-shot.
const HUMAN_EMOTES = [
  // Dances
  [`${EMOTES_M}/Celebrate/A_MOD_EMOT_Celebrate_Dab_Masc.fbx`, 'emote_dab'],
  [`${EMOTES_M}/Celebrate/A_MOD_EMOT_Celebrate_AirGuitar_Masc.fbx`, 'emote_air_guitar'],
  [`${EMOTES_M}/Celebrate/A_MOD_EMOT_Celebrate_BeatChest_Masc.fbx`, 'emote_beat_chest'],
  [`${EMOTES_M}/Celebrate/A_MOD_EMOT_Celebrate_Clapping_Polite_Masc.fbx`, 'emote_clap'],
  [`${EMOTES_M}/Dance/A_MOD_EMOT_Dance_ChestPump_Masc.fbx`, 'emote_dance_chest_pump'],
  [`${EMOTES_M}/Dance/A_MOD_EMOT_Dance_RunningStep_Masc.fbx`, 'emote_dance_running_step'],
  [`${EMOTES_M}/Dance/A_MOD_EMOT_Dance_Spin_Slick_Masc.fbx`, 'emote_dance_spin_slick'],
  [`${EMOTES_M}/Dance/A_MOD_EMOT_Dance_Twist_Masc.fbx`, 'emote_dance_twist'],
  [`${EMOTES_M}/Dance/A_MOD_EMOT_Dance_GreasedLightnin_Masc.fbx`, 'emote_dance_greased'],
  // Greets / gestures
  [`${EMOTES_M}/Greet/A_MOD_EMOT_Greet_Bow_Masc.fbx`, 'emote_bow'],
  [`${EMOTES_M}/Greet/A_MOD_EMOT_Greet_Beckon_Finger_Masc.fbx`, 'emote_beckon'],
  // Aggression / taunts
  [`${EMOTES_M}/Aggressive/A_MOD_EMOT_Aggressive_MenacingFists_Masc.fbx`, 'emote_menacing_fists'],
  [`${EMOTES_M}/Aggressive/A_MOD_EMOT_Aggressive_ThumbsDown_Roman_Masc.fbx`, 'emote_thumbs_down'],
  [`${EMOTES_M}/Angry/A_MOD_EMOT_Angry_ShakeFist_Masc.fbx`, 'emote_shake_fist'],
  [`${EMOTES_M}/Angry/A_MOD_EMOT_Angry_Tantrum_Masc.fbx`, 'emote_tantrum'],
  // Affection
  [`${EMOTES_F}/Affection/A_MOD_EMOT_Affection_BlowKiss_Femn.fbx`, 'emote_blow_kiss'],
  [`${EMOTES_F}/Affection/A_MOD_EMOT_Affection_HeartHands_Femn.fbx`, 'emote_heart_hands'],
  [`${EMOTES_F}/Affection/A_MOD_EMOT_Affection_FingerHeart_Femn.fbx`, 'emote_finger_heart'],
  // Celebrate (more wins)
  [`${EMOTES_M}/Celebrate/A_MOD_EMOT_Celebrate_FingerGuns_Single_Masc.fbx`, 'emote_finger_guns'],
  [`${EMOTES_M}/Celebrate/A_MOD_EMOT_Celebrate_DustShoulder_Masc.fbx`, 'emote_dust_shoulder'],
  [`${EMOTES_M}/Celebrate/A_MOD_EMOT_Celebrate_HandOnHeart_Masc.fbx`, 'emote_hand_on_heart'],
];

// Dog animations — actions are already loops or one-shots
const DOG_ANIMS = [
  // Standing idles / locomotion base
  [`${DOG}/Locomotion/_POLYGON_Dog_Locomotion_Standing.fbx`, 'dog_idle'],
  [`${DOG}/Sit/_POLYGON_Dog_Sitting.fbx`, 'dog_sit_idle'],
  [`${DOG}/Sleep/_POLYGON_Dog_Sleep_Idle.fbx`, 'dog_sleep'],
  // Standing actions
  [`${DOG}/Actions_Standing/_POLYGON_Dog_Action_Standing_Bark.fbx`, 'dog_bark'],
  [`${DOG}/Actions_Standing/_POLYGON_Dog_Action_Standing_Beg.fbx`, 'dog_beg'],
  [`${DOG}/Actions_Standing/_POLYGON_Dog_Action_Standing_Howl.fbx`, 'dog_howl'],
  [`${DOG}/Actions_Standing/_POLYGON_Dog_Action_Standing_Shake.fbx`, 'dog_shake'],
  [`${DOG}/Actions_Standing/_POLYGON_Dog_Action_Standing_ShakeToy.fbx`, 'dog_shake_toy'],
  [`${DOG}/Actions_Standing/_POLYGON_Dog_Action_Standing_Sniff.fbx`, 'dog_sniff'],
  [`${DOG}/Actions_Standing/_POLYGON_Dog_Action_Standing_Dig.fbx`, 'dog_dig'],
  // Sitting actions
  [`${DOG}/Actions_Sitting/_POLYGON_Dog_Action_Sitting_Bark.fbx`, 'dog_sit_bark'],
  [`${DOG}/Actions_Sitting/_POLYGON_Dog_Action_Sitting_Beg.fbx`, 'dog_sit_beg'],
  [`${DOG}/Actions_Sitting/_POLYGON_Dog_Action_Sitting_Howl.fbx`, 'dog_sit_howl'],
  [`${DOG}/Actions_Sitting/_POLYGON_Dog_Action_Sitting_Scratch.fbx`, 'dog_sit_scratch'],
  [`${DOG}/Actions_Sitting/_POLYGON_Dog_Action_Sitting_TailWag.fbx`, 'dog_sit_tail_wag'],
  [`${DOG}/Actions_Sitting/_POLYGON_Dog_Action_Sitting_Yawn.fbx`, 'dog_sit_yawn'],
];

function stage(list, subdir) {
  const outDir = path.join(OUT_ROOT, subdir);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  let ok = 0, fail = 0;
  for (const [src, dstBase] of list) {
    const dst = path.join(outDir, dstBase + '.fbx');
    if (!fs.existsSync(src)) {
      console.warn('[anims] MISSING: ' + src);
      fail++;
      continue;
    }
    fs.copyFileSync(src, dst);
    ok++;
  }
  console.log(`[anims] ${subdir}: copied ${ok}, missing ${fail}`);
  return { ok, fail };
}

function main() {
  if (!fs.existsSync(OUT_ROOT)) fs.mkdirSync(OUT_ROOT, { recursive: true });

  console.log('[anims] Staging Synty + Dog animation FBX clips...');
  const a = stage(HUMAN_IDLES, 'idles');
  const b = stage(HUMAN_EMOTES, 'emotes');
  const c = stage(DOG_ANIMS, 'dog');

  console.log(
    `\n[anims] Done: ${a.ok + b.ok + c.ok} copied, ${a.fail + b.fail + c.fail} missing.`
  );
  console.log('[anims] Next: npm run convert-fbx animations');
}

main();
