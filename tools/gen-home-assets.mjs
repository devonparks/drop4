#!/usr/bin/env node
// One-shot generator for the home screen asset refresh. Calls fal.ai
// Flux Pro in parallel for mode-play, mode-career, mode-local, and
// home-platform. Pay-per-use (~$0.05 each = ~$0.20 total).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const MANIFEST = path.join(ROOT, 'docs', 'ui-asset-manifest.json');
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

const FAL_MODEL = process.env.FAL_MODEL || 'fal-ai/flux-pro/v1.1';
const API = 'https://queue.fal.run';
const TARGETS = ['mode-play', 'mode-career', 'mode-local', 'home-platform'];

const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf-8'));
const items = TARGETS.map((id) => {
  const it = manifest.items.find((i) => i.id === id);
  if (!it) throw new Error(`${id} not in manifest`);
  return it;
});

async function generate(item) {
  const [w, h] = item.size.split('x').map(Number);
  console.log(`[${item.id}] starting (${w}x${h})`);
  const submit = await fetch(`${API}/${FAL_MODEL}`, {
    method: 'POST',
    headers: { Authorization: `Key ${FAL_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: item.prompt,
      image_size: { width: w, height: h },
      num_inference_steps: 28,
      guidance_scale: 3.5,
      num_images: 1,
      enable_safety_checker: false,
    }),
  });
  if (!submit.ok) throw new Error(`${item.id} submit ${submit.status}: ${await submit.text()}`);
  const { request_id, status_url, response_url } = await submit.json();
  console.log(`[${item.id}] queued ${request_id}`);

  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const s = await fetch(status_url, { headers: { Authorization: `Key ${FAL_KEY}` } });
    const state = await s.json();
    if (state.status === 'COMPLETED') break;
    if (state.status === 'FAILED') throw new Error(`${item.id} failed`);
  }
  const r = await fetch(response_url, { headers: { Authorization: `Key ${FAL_KEY}` } });
  const payload = await r.json();
  const url = payload?.images?.[0]?.url;
  if (!url) throw new Error(`${item.id} no image`);
  const img = await fetch(url);
  const buf = Buffer.from(await img.arrayBuffer());
  const outPath = path.join(OUT_DIR, item.filename);
  fs.writeFileSync(outPath, buf);
  console.log(`[${item.id}] wrote ${item.filename} (${Math.round(buf.length / 1024)}KB)`);
}

// Parallel — fal.ai handles concurrent requests fine
await Promise.all(items.map(generate));
console.log('all done');
