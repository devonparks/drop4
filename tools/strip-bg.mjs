#!/usr/bin/env node
// Strip backgrounds from Flux-Pro-generated PNGs using fal.ai's
// BiRefNet background-removal model (~$0.003 per image). Flux Pro
// outputs RGB only, so any asset that should be isolated on the UI
// ships with a black or grey background unless we post-process here.
//
// Usage:
//   node tools/strip-bg.mjs <filename> [<filename>...]
//   # defaults to stripping home-logo, side-btn-*, free-spin-btn
//
// Writes back to the same path. Makes a backup as <file>.bg.png.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'src', 'assets', 'images', 'ui');
const ENV_LOCAL = path.join(ROOT, '.env.local');

if (fs.existsSync(ENV_LOCAL)) {
  for (const line of fs.readFileSync(ENV_LOCAL, 'utf-8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.+)$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
}

const FAL_KEY = process.env.FAL_KEY;
if (!FAL_KEY) { console.error('FAL_KEY missing'); process.exit(1); }

const API = 'https://queue.fal.run';
const MODEL = 'fal-ai/birefnet/v2';

const DEFAULT_TARGETS = [
  'home-logo.png',
  'side-btn-emotes.png',
  'side-btn-idles.png',
  'free-spin-btn.png',
];

const targets = process.argv.length > 2 ? process.argv.slice(2) : DEFAULT_TARGETS;

async function uploadAndStrip(filename) {
  const srcPath = path.join(OUT_DIR, filename);
  if (!fs.existsSync(srcPath)) {
    console.error(`${filename}: not found at ${srcPath}`);
    return;
  }
  // Back up original once
  const backup = srcPath.replace(/\.png$/, '.bg.png');
  if (!fs.existsSync(backup)) {
    fs.copyFileSync(srcPath, backup);
  }

  // fal's BiRefNet accepts image_url — we need a data URI for local files
  const bytes = fs.readFileSync(srcPath);
  const dataUri = `data:image/png;base64,${bytes.toString('base64')}`;

  console.log(`[${filename}] submitting to BiRefNet…`);
  const submit = await fetch(`${API}/${MODEL}`, {
    method: 'POST',
    headers: { Authorization: `Key ${FAL_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_url: dataUri }),
  });
  if (!submit.ok) {
    console.error(`[${filename}] submit ${submit.status}: ${await submit.text()}`);
    return;
  }
  const { status_url, response_url } = await submit.json();

  for (let i = 0; i < 45; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const s = await fetch(status_url, { headers: { Authorization: `Key ${FAL_KEY}` } });
    const state = await s.json();
    if (state.status === 'COMPLETED') break;
    if (state.status === 'FAILED') { console.error(`[${filename}] failed`); return; }
  }
  const r = await fetch(response_url, { headers: { Authorization: `Key ${FAL_KEY}` } });
  const payload = await r.json();
  const outUrl = payload?.image?.url;
  if (!outUrl) { console.error(`[${filename}] no image url`, payload); return; }

  const img = await fetch(outUrl);
  const buf = Buffer.from(await img.arrayBuffer());
  fs.writeFileSync(srcPath, buf);
  console.log(`[${filename}] stripped (${Math.round(buf.length / 1024)}KB); backup at ${path.basename(backup)}`);
}

for (const t of targets) {
  await uploadAndStrip(t);
}
console.log('done');
