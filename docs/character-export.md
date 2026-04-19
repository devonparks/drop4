# Character Export Pipeline

Canonical doc for how characters + animations + pets move from Unity → GLB → React Native runtime. Every AMG game inherits this. Keep it accurate; breaking it breaks Express Mode, ranked replays, and any future mocap feature.

## Source of truth

- **Unity project:** `~/Desktop/Unity Games/Synty Character Creator/`
- **Character pack:** Synty Studios Sidekick Character Creator (Modern Civilians + every DLC pack)
- **Animation library:** Mixamo, retargeted onto the Sidekick Humanoid rig inside Unity
- **Pet pack:** Synty POLYGON Dogs, rigged separately (not humanoid)

Drop4 loads ~216 GLBs at build time via Metro `require()`:
- `src/assets/models/outfits/*.glb` — character bodies with baked outfits
- `src/assets/models/animations/idles/*.glb` — idle variants (10 clips)
- `src/assets/models/animations/emotes/*.glb` — emotes (30 clips)
- `src/assets/models/animations/dog/*.glb` — pet animations
- `src/assets/models/pets/*.glb` — pet base bodies

## Humanoid skeleton (every outfit + every animation)

**Scheme: Synty Sidekick (UE4-standard).** Not Mixamo. Not CC3. The Unity
export preserves the Synty bone names as-is, NOT the Mixamo prefix that
animations originally shipped with.

### Full landmark map

| Logical joint | Synty bone name | Mixamo equivalent |
|---|---|---|
| Root | `root` | `mixamorigHips` (parent) |
| Hips | `pelvis` | `mixamorigHips` |
| Spine (lower) | `spine_01` | `mixamorigSpine` |
| Spine (mid) | `spine_02` | `mixamorigSpine1` |
| Spine (upper) | `spine_03` | `mixamorigSpine2` |
| Neck | `neck_01` | `mixamorigNeck` |
| Head | `head` | `mixamorigHead` |
| Left shoulder | `clavicle_l` | `mixamorigLeftShoulder` |
| Left upper arm | `upperarm_l` | `mixamorigLeftArm` |
| Left forearm | `lowerarm_l` | `mixamorigLeftForeArm` |
| Left hand | `hand_l` | `mixamorigLeftHand` |
| Right shoulder | `clavicle_r` | `mixamorigRightShoulder` |
| Right upper arm | `upperarm_r` | `mixamorigRightArm` |
| Right forearm | `lowerarm_r` | `mixamorigRightForeArm` |
| Right hand | `hand_r` | `mixamorigRightHand` |
| Left thigh | `thigh_l` | `mixamorigLeftUpLeg` |
| Left shin | `calf_l` | `mixamorigLeftLeg` |
| Left foot | `foot_l` | `mixamorigLeftFoot` |
| Right thigh | `thigh_r` | `mixamorigRightUpLeg` |
| Right shin | `calf_r` | `mixamorigRightLeg` |
| Right foot | `foot_r` | `mixamorigRightFoot` |

### Why this matters

**Current pipeline:** Mixamo animations are retargeted inside Unity onto the Synty skeleton before GLB export. The GLB ends up with Synty bone names. When `Character3D.tsx` loads a character + separate animation GLB, the track-path-stripping code (commit `67c3d97`) walks the skeleton and rebinds animation tracks by stripping the `mixamorig` prefix. Because the Synty skeleton uses different names entirely, the actual rebinding happens by JOINT INDEX / hierarchy position, not by name. This works today — nothing to fix.

**Express Mode (v1.1):** three-mediapipe-rig produces a pose stream with joint landmarks using its own internal names (usually Blender/Unity Humanoid style: `Hips`, `Spine`, `Head`, etc.). To drive a Drop4 character, Express Mode needs a BoneMap that translates:

```ts
const SYNTY_BONE_MAP = {
  Hips: 'pelvis',
  Spine: 'spine_01',
  Chest: 'spine_02',
  UpperChest: 'spine_03',
  Neck: 'neck_01',
  Head: 'head',
  LeftShoulder: 'clavicle_l',
  LeftUpperArm: 'upperarm_l',
  LeftLowerArm: 'lowerarm_l',
  LeftHand: 'hand_l',
  // ... etc
};
```

This map lives in `src/data/animationRegistry.ts` (or a new `src/data/boneMap.ts`) when Express Mode work begins. The audit script in `tools/audit-bone-names.mjs` verifies every character GLB still uses the Synty scheme so the map stays valid.

## Pet skeleton

Polygon Dogs use a `*_joint` naming convention from Mesh2Motion's auto-rigger:

```
base_joint
root_joint
spine_C0_hip_joint
spine_C0_0_joint
spine_C0_1_joint
...
neck_C0_0_joint
head_C0_0_joint
```

Pets are NOT humanoid. They will NOT support Express Mode. The audit script detects pet GLBs (either via filepath or the `_C\d+_\d+_joint` pattern) and skips humanoid landmark checking for them.

## Running the audit

```bash
node tools/audit-bone-names.mjs          # scan every GLB, summary at end
node tools/audit-bone-names.mjs --verbose  # show every file
```

Output:
- `scheme: synty` — humanoid rig, Synty naming, good for Express Mode v1.1
- `scheme: mixamo` — humanoid rig, Mixamo naming (shouldn't happen today but script handles it)
- `scheme: pet` — non-humanoid rig (pets), expected, skipped
- `unknown` — skeleton doesn't match any known scheme, export config may have regressed

The script exits non-zero if any humanoid file has missing landmarks, so it can be wired into CI for the next AMG game.

## If the export config ever regresses

Symptoms: humanoid landmarks missing, or `mixamorig` prefix reappearing, or bones renamed.

Fix inside the Unity project:
1. Open `~/Desktop/Unity Games/Synty Character Creator/`
2. Check the `glTF Export` settings on the character prefab.
3. Bone name preservation option should be ON (export exact skeleton, don't rename).
4. Mixamo retargeter should run BEFORE export so the final skeleton is Synty-named.
5. Re-export one sample GLB, run `node tools/audit-bone-names.mjs --first-only --verbose` to verify.

Never hand-edit the exported GLBs — changes won't survive the next Unity export.
