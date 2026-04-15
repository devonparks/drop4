#!/usr/bin/env node
/**
 * Drop4 FBX → GLB batch converter
 *
 * Uses FBX2glTF (Meta's battle-tested converter) to convert Unity FBX exports
 * to GLB files with proper skeleton + skinning that Three.js can consume.
 *
 * Input:  fbx_export/<category>/*.fbx
 * Output: src/assets/models/<category>/*.glb
 *
 * Usage:
 *   node tools/fbx_to_glb_batch.js            (converts everything)
 *   node tools/fbx_to_glb_batch.js bodies     (converts just bodies)
 *   npm run convert-fbx
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const FBX_ROOT = path.join(PROJECT_ROOT, 'fbx_export');
const GLB_ROOT = path.join(PROJECT_ROOT, 'src', 'assets', 'models');

// Locate FBX2glTF binary
function findFbx2glTF() {
  const binDir = path.join(PROJECT_ROOT, 'node_modules', 'fbx2gltf', 'bin');
  const candidates = {
    win32: path.join(binDir, 'Windows_NT', 'FBX2glTF.exe'),
    darwin: path.join(binDir, 'Darwin', 'FBX2glTF'),
    linux: path.join(binDir, 'Linux', 'FBX2glTF'),
  };
  const binary = candidates[process.platform];
  if (!binary || !fs.existsSync(binary)) {
    console.error(`[batch] FBX2glTF binary not found at ${binary}. Run: npm install fbx2gltf`);
    process.exit(1);
  }
  return binary;
}

function convertOne(binary, inputFbx, outputGlbNoExt) {
  const outDir = path.dirname(outputGlbNoExt);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  try {
    execFileSync(binary, [
      '--binary',
      '--embed',                    // Embed textures in GLB
      '--pbr-metallic-roughness',   // Use PBR materials (Synty renders correctly with these)
      '--input', inputFbx,
      '--output', outputGlbNoExt,
    ], { stdio: 'pipe' });

    const glbPath = outputGlbNoExt + '.glb';
    const sizeKB = Math.round(fs.statSync(glbPath).size / 1024);
    console.log(`[batch] ✓ ${path.basename(glbPath)} (${sizeKB}KB)`);
    return true;
  } catch (e) {
    console.error(`[batch] ✗ Failed: ${inputFbx}`);
    console.error(`        ${e.message}`);
    return false;
  }
}

// Walk a directory recursively, returning all .fbx files as objects
// { inputFbx, relativeDir } so we can mirror the folder layout into GLB_ROOT.
function walkFbx(rootDir, relDir = '') {
  const absDir = path.join(rootDir, relDir);
  if (!fs.existsSync(absDir)) return [];
  const results = [];
  for (const entry of fs.readdirSync(absDir, { withFileTypes: true })) {
    const entryRel = path.join(relDir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkFbx(rootDir, entryRel));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.fbx')) {
      results.push({ inputFbx: path.join(rootDir, entryRel), relativeDir: relDir });
    }
  }
  return results;
}

function convertCategory(binary, category) {
  const fbxDir = path.join(FBX_ROOT, category);
  if (!fs.existsSync(fbxDir)) {
    console.log(`[batch] Skipping ${category}: no directory at ${fbxDir}`);
    return { success: 0, failed: 0 };
  }

  const files = walkFbx(fbxDir);
  if (files.length === 0) {
    console.log(`[batch] No FBX files in ${fbxDir}`);
    return { success: 0, failed: 0 };
  }

  console.log(`\n[batch] Converting ${files.length} files in ${category}...`);
  let success = 0, failed = 0;
  for (const { inputFbx, relativeDir } of files) {
    const baseName = path.basename(inputFbx, path.extname(inputFbx));
    const outputGlbNoExt = path.join(GLB_ROOT, category, relativeDir, baseName);
    if (convertOne(binary, inputFbx, outputGlbNoExt)) success++;
    else failed++;
  }
  return { success, failed };
}

function main() {
  const binary = findFbx2glTF();
  console.log(`[batch] Using ${binary}`);

  const targetCategory = process.argv[2];
  const categories = targetCategory
    ? [targetCategory]
    : fs.readdirSync(FBX_ROOT).filter(d => fs.statSync(path.join(FBX_ROOT, d)).isDirectory());

  let totalSuccess = 0, totalFailed = 0;
  for (const cat of categories) {
    const { success, failed } = convertCategory(binary, cat);
    totalSuccess += success;
    totalFailed += failed;
  }

  console.log(`\n[batch] Done: ${totalSuccess} succeeded, ${totalFailed} failed`);
  process.exit(totalFailed > 0 ? 1 : 0);
}

main();
