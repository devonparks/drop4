#!/usr/bin/env node
// One-shot regenerator for bg-home specifically. Calls fal.ai directly
// with the current manifest prompt and writes the result over
// src/assets/images/ui/bg-home.png. Used when we want to bump JUST
// the home background without regenerating the whole backgrounds
// group. Pay-per-use (~$0.05 on Flux Pro v1.1).
//
// Usage:
//   node tools/gen-bg-home.mjs                 # Flux Pro v1.1
//   FAL_MODEL=fal-ai/flux/dev node tools/...   # override model

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const MANIFEST = path.join(ROOT, 'docs', 'ui-asset-manifest.json');
const OUT = path.join(ROOT, 'src', 'assets', 'images', 'ui', 'bg-home.png');
const ENV_LOCAL = path.join(ROOT, '.env.local');

// Load .env.local
if (fs.existsSync(ENV_LOCAL)) {
  for (const line of fs.readFileSync(ENV_LOCAL, 'utf-8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.+)$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
}

const FAL_KEY = process.env.FAL_KEY;
if (!FAL_KEY) {
  console.error('FAL_KEY missing. Add it to .env.local.');
  process.exit(1);
}

const FAL_MODEL = process.env.FAL_MODEL || 'fal-ai/flux-pro/v1.1';
const FAL_API_BASE = 'https://queue.fal.run';

const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf-8'));
const item = manifest.items.find((i) => i.id === 'bg-home');
if (!item) {
  console.error('bg-home not in manifest');
  process.exit(1);
}

const [w, h] = item.size.split('x').map(Number);

console.log(`[gen-bg-home] model=${FAL_MODEL} size=${w}x${h}`);
console.log(`[gen-bg-home] prompt=${item.prompt.slice(0, 120)}...`);

const submit = await fetch(`${FAL_API_BASE}/${FAL_MODEL}`, {
  method: 'POST',
  headers: {
    'Authorization': `Key ${FAL_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    prompt: item.prompt,
    image_size: { width: w, height: h },
    num_inference_steps: FAL_MODEL.includes('schnell') ? 4 : 28,
    guidance_scale: 3.5,
    num_images: 1,
    enable_safety_checker: false,
  }),
});

if (!submit.ok) {
  console.error(`submit ${submit.status}: ${await submit.text()}`);
  process.exit(1);
}

const { request_id, status_url, response_url } = await submit.json();
console.log(`[gen-bg-home] queued request_id=${request_id}`);

// Poll
let resultUrl = null;
for (let i = 0; i < 60; i++) {
  await new Promise((r) => setTimeout(r, 2000));
  const s = await fetch(status_url, { headers: { 'Authorization': `Key ${FAL_KEY}` } });
  const state = await s.json();
  console.log(`[gen-bg-home] ${i * 2}s: ${state.status}${state.logs ? ` (${state.logs.length} logs)` : ''}`);
  if (state.status === 'COMPLETED') {
    resultUrl = response_url;
    break;
  }
  if (state.status === 'FAILED') {
    console.error('job failed', state);
    process.exit(1);
  }
}
if (!resultUrl) {
  console.error('timed out');
  process.exit(1);
}

const r = await fetch(resultUrl, { headers: { 'Authorization': `Key ${FAL_KEY}` } });
const payload = await r.json();
const imageUrl = payload?.images?.[0]?.url;
if (!imageUrl) {
  console.error('no image url in response', payload);
  process.exit(1);
}

const img = await fetch(imageUrl);
if (!img.ok) {
  console.error(`image fetch ${img.status}`);
  process.exit(1);
}
const buf = Buffer.from(await img.arrayBuffer());
fs.writeFileSync(OUT, buf);
console.log(`[gen-bg-home] wrote ${OUT}  (${Math.round(buf.length / 1024)}KB)`);
