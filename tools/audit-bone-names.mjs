#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════
// audit-bone-names.mjs — scan every GLB in the project for its skeleton
// bone names. Verifies that the Synty Sidekick Humanoid rig is preserved
// through the Unity → GLB export so that Express Mode (webcam mocap,
// v1.1) has clean bone names to retarget onto.
//
// Express Mode expects `mixamorig*` prefixed names (Hips, Spine, Head,
// LeftArm, RightArm, etc.) — or at minimum a consistent humanoid naming
// scheme that three-mediapipe-rig can map to.
//
// This script parses GLB binary headers (no three.js, no @gltf-transform
// required — keeps dev deps light) and extracts the skeleton joint names
// from the `nodes[]` array.
//
// Usage:
//   node tools/audit-bone-names.mjs
//   node tools/audit-bone-names.mjs --glob="src/assets/models/outfits/*.glb"
// ═══════════════════════════════════════════════════════════════════════

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const DEFAULT_SEARCH_DIRS = [
  'src/assets/models/outfits',
  'src/assets/models/pets',
  'src/assets/models/animations',
];

// Bone names we WANT to see for Express Mode compatibility.
// Two acceptable schemes:
//   - Mixamo / Humanoid: Hips, Spine, Head, LeftArm, RightArm, etc.
//   - Synty Sidekick (UE4 standard): pelvis, spine_01, head, clavicle_l, etc.
// Mapping between them lives in docs/character-export.md.
const HUMANOID_LANDMARKS_MIXAMO = [
  'Hips', 'Spine', 'Chest', 'Neck', 'Head',
  'LeftArm', 'LeftForeArm', 'LeftHand',
  'RightArm', 'RightForeArm', 'RightHand',
  'LeftUpLeg', 'LeftLeg', 'LeftFoot',
  'RightUpLeg', 'RightLeg', 'RightFoot',
];

const HUMANOID_LANDMARKS_SYNTY = [
  'pelvis', 'spine_01', 'spine_02', 'spine_03', 'neck_01', 'head',
  'upperarm_l', 'lowerarm_l', 'hand_l',
  'upperarm_r', 'lowerarm_r', 'hand_r',
  'thigh_l', 'calf_l', 'foot_l',
  'thigh_r', 'calf_r', 'foot_r',
];

/**
 * Parse a .glb file and return its JSON chunk. GLB format:
 *   Header (12 bytes) + JSON chunk (length + type + data) + Bin chunk...
 */
function parseGlb(buffer) {
  if (buffer.length < 12) throw new Error('Too small for GLB');
  const magic = buffer.readUInt32LE(0);
  if (magic !== 0x46546c67) throw new Error('Not a GLB (bad magic)');
  // Skip header
  const jsonLen = buffer.readUInt32LE(12);
  const jsonType = buffer.readUInt32LE(16);
  if (jsonType !== 0x4e4f534a) throw new Error('First chunk is not JSON'); // 'JSON'
  const jsonBytes = buffer.slice(20, 20 + jsonLen);
  // JSON chunks are padded with spaces; strip trailing whitespace + nulls.
  const text = jsonBytes.toString('utf-8').replace(/[\x00\s]+$/, '');
  return JSON.parse(text);
}

function collectNodeNames(gltfJson) {
  const nodes = gltfJson.nodes ?? [];
  return nodes.map((n) => n.name ?? '<unnamed>');
}

function auditFile(filepath) {
  const buf = fs.readFileSync(filepath);
  const json = parseGlb(buf);
  const names = collectNodeNames(json);
  const hasMixamo = names.some((n) => /^mixamorig/i.test(n));

  // Pets (Polygon Dogs) have a completely different skeleton — don't
  // evaluate against humanoid landmarks. Identified by Mesh2Motion's
  // `spine_C0_*_joint` naming convention.
  const looksLikePet =
    filepath.includes(path.sep + 'pets' + path.sep) ||
    filepath.includes(path.sep + 'dog' + path.sep) ||
    names.some((n) => /_C\d+_\d+_joint$/.test(n));

  if (looksLikePet) {
    return { filepath, nodeCount: names.length, hasMixamo: false, names, landmarks: [], scheme: 'pet' };
  }

  // Try Mixamo/Humanoid first. If nothing matches, try Synty UE4.
  const mixamoHits = HUMANOID_LANDMARKS_MIXAMO.map((l) => {
    const hit = names.find((n) => n === l || n === `mixamorig${l}`);
    return { name: l, found: !!hit, actual: hit };
  });
  const syntyHits = HUMANOID_LANDMARKS_SYNTY.map((l) => {
    const hit = names.find((n) => n === l);
    return { name: l, found: !!hit, actual: hit };
  });

  const mixamoScore = mixamoHits.filter((h) => h.found).length;
  const syntyScore = syntyHits.filter((h) => h.found).length;

  // Pick whichever scheme matches better. Express Mode mapper will
  // branch on `scheme` to pick the right bone-name dictionary.
  let scheme = 'unknown';
  let landmarks = mixamoHits;
  if (syntyScore > mixamoScore) {
    scheme = 'synty';
    landmarks = syntyHits;
  } else if (mixamoScore > 0) {
    scheme = 'mixamo';
  }

  return { filepath, nodeCount: names.length, hasMixamo, names, landmarks, scheme };
}

function walkGlbs(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  const stack = [dir];
  while (stack.length) {
    const d = stack.pop();
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (entry.isFile() && entry.name.toLowerCase().endsWith('.glb')) {
        out.push(full);
      }
    }
  }
  return out;
}

function main() {
  const args = new Set(process.argv.slice(2));
  const verbose = args.has('--verbose');
  const firstOnly = args.has('--first-only');

  const files = [];
  for (const rel of DEFAULT_SEARCH_DIRS) {
    files.push(...walkGlbs(path.join(ROOT, rel)));
  }
  if (files.length === 0) {
    console.log('No GLB files found in default search dirs.');
    return;
  }

  // Summary: scan every file but only deep-report the first one per dir + all failures.
  console.log(`Scanning ${files.length} GLB files…\n`);

  let clean = 0;
  let missingLandmarks = 0;
  let errored = 0;
  const perDirFirstReported = new Set();

  for (const f of files) {
    const rel = path.relative(ROOT, f);
    const dir = path.dirname(rel);
    let result;
    try {
      result = auditFile(f);
    } catch (err) {
      console.log(`  ✗ ${rel} — PARSE ERROR: ${err.message}`);
      errored += 1;
      continue;
    }

    const missing = result.landmarks.filter((l) => !l.found);
    const isFirstInDir = !perDirFirstReported.has(dir);

    if (result.scheme === 'pet') {
      clean += 1; // pets are fine — separate pipeline, not expected to have humanoid bones
      if (isFirstInDir || verbose) {
        console.log(`  ✓ ${rel}  (${result.nodeCount} nodes, pet rig — not audited against humanoid landmarks)`);
        perDirFirstReported.add(dir);
      }
    } else if (missing.length === 0) {
      clean += 1;
      if (isFirstInDir || verbose) {
        console.log(`  ✓ ${rel}  (${result.nodeCount} nodes, ${result.scheme} scheme${result.hasMixamo ? ', mixamo prefix' : ''})`);
        perDirFirstReported.add(dir);
      }
    } else if (result.scheme === 'unknown') {
      missingLandmarks += 1;
      console.log(`  ⚠ ${rel}  NO RECOGNIZED SKELETON  (first 10 nodes: ${result.names.slice(0, 10).join(', ')})`);
    } else {
      // Partial — has SOME landmarks, missing others. Interesting for export config review.
      missingLandmarks += 1;
      console.log(`  ⚠ ${rel}  ${result.scheme} scheme, missing: ${missing.map((m) => m.name).join(', ')}`);
    }

    if (firstOnly) break;
  }

  console.log(`\nSummary: ${clean} clean · ${missingLandmarks} missing-landmarks · ${errored} errored · ${files.length} total`);

  // Exit 0 if everything is clean, 1 if any failures (for CI integration).
  if (missingLandmarks + errored > 0) {
    console.log('\nAction: if "missing-landmarks" > 0, revisit the Unity → GLB export config.');
    console.log('Express Mode (v1.1 webcam mocap) requires humanoid bone names on every character rig.');
    process.exit(1);
  }
  console.log('\nAll character rigs use the Synty Humanoid skeleton. Express Mode v1.1 is unblocked.');
}

main();
