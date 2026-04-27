#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════
// gen-art.mjs — batch UI asset generator for Drop4
//
// Supports four backends. Pick via ART_BACKEND env var.
//
//  1. fal (default)     — fal.ai cloud API with Flux image models. Premium
//                          game-UI quality, strong prompt fidelity, pay-
//                          per-use (~$0.05/image Flux Pro, cheaper Schnell).
//                          Requires FAL_KEY. Use for volume + 3D pipeline.
//
//  2. openai            — OpenAI gpt-image-1. Highest 2D art quality, native
//                          transparent-bg support (no Bria post-process),
//                          ~$0.042/image at medium quality. Requires
//                          OPENAI_API_KEY. Use for hero 2D icons / marketing.
//
//  3. comfyui           — local ComfyUI server on the 4090. Free,
//                          unlimited, any checkpoint (SDXL, Flux, etc).
//                          Requires `python main.py --listen` running.
//
//  4. gemini            — Google's Nano Banana API. $0.039/image standard.
//                          Requires GOOGLE_API_KEY.
//
// Output: src/assets/images/ui/<filename> per docs/ui-asset-manifest.json.
//
// Usage:
//   node tools/gen-art.mjs                       Default backend, missing only
//   node tools/gen-art.mjs --force               Regenerate all
//   node tools/gen-art.mjs --only=tab-icons      Filter by manifest group
//   node tools/gen-art.mjs --dry-run             Plan only, no generation
//   ART_BACKEND=openai node tools/gen-art.mjs    Force OpenAI backend
//   ART_BACKEND=gemini node tools/gen-art.mjs    Force Gemini backend
//
// OpenAI env (optional):
//   OPENAI_QUALITY=low|medium|high   (default: medium)
//   OPENAI_MODEL=gpt-image-1         (default)
//
// ComfyUI env (optional, defaults shown):
//   COMFY_URL=http://127.0.0.1:8188
//   COMFY_CHECKPOINT=sd_xl_base_1.0.safetensors
//   COMFY_STEPS=25
//   COMFY_CFG=7
// ═══════════════════════════════════════════════════════════════════════

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// ── Config ──────────────────────────────────────────────────────────────
const MANIFEST_PATH = path.join(ROOT, 'docs', 'ui-asset-manifest.json');
const OUTPUT_DIR = path.join(ROOT, 'src', 'assets', 'images', 'ui');
const ENV_LOCAL = path.join(ROOT, '.env.local');

// ── Helpers ─────────────────────────────────────────────────────────────

/** Parse `.env.local` into process.env (does not overwrite existing). */
function loadEnvLocal() {
  if (!fs.existsSync(ENV_LOCAL)) return;
  const text = fs.readFileSync(ENV_LOCAL, 'utf-8');
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.+)$/);
    if (!m) continue;
    const [, k, rawV] = m;
    const v = rawV.trim().replace(/^["']|["']$/g, '');
    if (!(k in process.env)) process.env[k] = v;
  }
}
loadEnvLocal();

const BACKEND = (process.env.ART_BACKEND || 'fal').toLowerCase();

const args = new Set(process.argv.slice(2));
const FORCE = args.has('--force');
const DRY_RUN = args.has('--dry-run');
const ONLY_ARG = [...args].find((a) => a.startsWith('--only='));
const ONLY = ONLY_ARG ? ONLY_ARG.split('=')[1] : null;

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}
function log(msg) {
  process.stdout.write(msg + '\n');
}
function parseSize(sizeStr) {
  const m = /^(\d+)\s*x\s*(\d+)$/i.exec((sizeStr || '').trim());
  if (!m) return { width: 1024, height: 1024 };
  return { width: parseInt(m[1], 10), height: parseInt(m[2], 10) };
}

// ── Backend: Gemini (Nano Banana) ───────────────────────────────────────

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash-image';
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

async function generateViaGemini(item) {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_API_KEY missing');
  const url = `${GEMINI_API_BASE}/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const body = {
    contents: [{ parts: [{ text: item.prompt }] }],
    generationConfig: { responseModalities: ['IMAGE'] },
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text();
    const err = new Error(`Gemini API ${res.status}: ${errText.slice(0, 300)}`);
    err.status = res.status;
    throw err;
  }
  const json = await res.json();
  const parts = json?.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find((p) => p.inlineData?.mimeType?.startsWith('image/'));
  if (!imagePart) throw new Error('No image in Gemini response');
  return Buffer.from(imagePart.inlineData.data, 'base64');
}

// ── Backend: ComfyUI ────────────────────────────────────────────────────

const COMFY_URL = (process.env.COMFY_URL || 'http://127.0.0.1:8188').replace(/\/$/, '');
const COMFY_CHECKPOINT = process.env.COMFY_CHECKPOINT || 'sd_xl_base_1.0.safetensors';
const COMFY_STEPS = parseInt(process.env.COMFY_STEPS || '25', 10);
const COMFY_CFG = parseFloat(process.env.COMFY_CFG || '7');
const COMFY_NEGATIVE =
  process.env.COMFY_NEGATIVE_PROMPT ||
  'text, watermark, signature, logo, lettering, typography, ugly, blurry, low quality, distorted, deformed, extra limbs';

/** Minimal SDXL-style workflow JSON. Nodes match ComfyUI's default. */
function buildComfyWorkflow({ positivePrompt, negativePrompt, width, height, seed }) {
  return {
    '3': {
      class_type: 'KSampler',
      inputs: {
        seed,
        steps: COMFY_STEPS,
        cfg: COMFY_CFG,
        sampler_name: 'dpmpp_2m',
        scheduler: 'karras',
        denoise: 1.0,
        model: ['4', 0],
        positive: ['6', 0],
        negative: ['7', 0],
        latent_image: ['5', 0],
      },
    },
    '4': {
      class_type: 'CheckpointLoaderSimple',
      inputs: { ckpt_name: COMFY_CHECKPOINT },
    },
    '5': {
      class_type: 'EmptyLatentImage',
      inputs: { width, height, batch_size: 1 },
    },
    '6': {
      class_type: 'CLIPTextEncode',
      inputs: { text: positivePrompt, clip: ['4', 1] },
    },
    '7': {
      class_type: 'CLIPTextEncode',
      inputs: { text: negativePrompt, clip: ['4', 1] },
    },
    '8': {
      class_type: 'VAEDecode',
      inputs: { samples: ['3', 0], vae: ['4', 2] },
    },
    '9': {
      class_type: 'SaveImage',
      inputs: { filename_prefix: 'drop4_gen', images: ['8', 0] },
    },
  };
}

async function comfyCheckRunning() {
  try {
    const res = await fetch(`${COMFY_URL}/system_stats`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) throw new Error(`status ${res.status}`);
    return true;
  } catch (err) {
    throw new Error(
      `ComfyUI not reachable at ${COMFY_URL}. Start it with: python main.py --listen 127.0.0.1 --port 8188`,
    );
  }
}

async function generateViaComfyUI(item) {
  // Size comes from manifest "size": "WxH"
  const { width, height } = parseSize(item.size);
  const seed = Math.floor(Math.random() * 1e9);
  const clientId = randomUUID();
  const workflow = buildComfyWorkflow({
    positivePrompt: item.prompt,
    negativePrompt: COMFY_NEGATIVE,
    width,
    height,
    seed,
  });

  // Queue the prompt
  const queueRes = await fetch(`${COMFY_URL}/prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: workflow, client_id: clientId }),
  });
  if (!queueRes.ok) {
    const errText = await queueRes.text();
    throw new Error(`ComfyUI queue ${queueRes.status}: ${errText.slice(0, 300)}`);
  }
  const { prompt_id: promptId } = await queueRes.json();
  if (!promptId) throw new Error('ComfyUI did not return prompt_id');

  // Poll history until this prompt completes
  const startTime = Date.now();
  const MAX_WAIT_MS = 300_000; // 5 min per image ceiling
  while (Date.now() - startTime < MAX_WAIT_MS) {
    await new Promise((r) => setTimeout(r, 1500));
    const histRes = await fetch(`${COMFY_URL}/history/${promptId}`);
    if (!histRes.ok) continue;
    const hist = await histRes.json();
    const entry = hist[promptId];
    if (!entry) continue;
    if (entry.status?.completed || entry.outputs) {
      // Find the SaveImage output — node 9 in our workflow
      const outputs = entry.outputs ?? {};
      const saveNode = outputs['9'];
      const imgInfo = saveNode?.images?.[0];
      if (!imgInfo) throw new Error('ComfyUI completed but no image output');
      // Fetch the PNG
      const viewUrl =
        `${COMFY_URL}/view?` +
        `filename=${encodeURIComponent(imgInfo.filename)}` +
        `&subfolder=${encodeURIComponent(imgInfo.subfolder ?? '')}` +
        `&type=${encodeURIComponent(imgInfo.type ?? 'output')}`;
      const viewRes = await fetch(viewUrl);
      if (!viewRes.ok) throw new Error(`ComfyUI fetch image ${viewRes.status}`);
      const arr = await viewRes.arrayBuffer();
      return Buffer.from(arr);
    }
  }
  throw new Error('ComfyUI timed out after 5 min waiting for completion');
}

// ── Backend: fal.ai (Flux) ──────────────────────────────────────────────

// fal.ai model IDs: fast cheap → slow premium.
//   fal-ai/flux/schnell       — Flux Schnell: 4 steps, fastest, ~$0.003/image
//   fal-ai/flux/dev           — Flux Dev: 28 steps, ~$0.025/image
//   fal-ai/flux-pro/v1.1      — Flux 1.1 Pro: premium, ~$0.05/image
//   fal-ai/flux-pro/v1.1-ultra — Flux 1.1 Pro Ultra: highest quality, ~$0.06/image
// Default is dev — good balance of quality + cost for a UI pack.
const FAL_MODEL = process.env.FAL_MODEL || 'fal-ai/flux/dev';
const FAL_API_BASE = 'https://queue.fal.run';

async function generateViaFal(item) {
  const apiKey = process.env.FAL_KEY || process.env.FAL_API_KEY;
  if (!apiKey) throw new Error('FAL_KEY missing');
  const { width, height } = parseSize(item.size);

  // fal.ai's Flux endpoints accept this shape.
  const body = {
    prompt: item.prompt,
    image_size: { width, height },
    num_inference_steps: FAL_MODEL.includes('schnell') ? 4 : 28,
    num_images: 1,
    enable_safety_checker: true,
  };

  // Submit the job to the queue
  const submitRes = await fetch(`${FAL_API_BASE}/${FAL_MODEL}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Key ${apiKey}`,
    },
    body: JSON.stringify(body),
  });
  if (!submitRes.ok) {
    const errText = await submitRes.text();
    throw new Error(`fal.ai submit ${submitRes.status}: ${errText.slice(0, 300)}`);
  }
  const submitJson = await submitRes.json();
  const statusUrl = submitJson?.status_url;
  const responseUrl = submitJson?.response_url;
  if (!statusUrl || !responseUrl) {
    throw new Error('fal.ai response missing status_url / response_url');
  }

  // Poll status until COMPLETED
  const startTime = Date.now();
  const MAX_WAIT_MS = 180_000;
  while (Date.now() - startTime < MAX_WAIT_MS) {
    await new Promise((r) => setTimeout(r, 1500));
    const statusRes = await fetch(statusUrl, {
      headers: { 'Authorization': `Key ${apiKey}` },
    });
    if (!statusRes.ok) continue;
    const status = await statusRes.json();
    if (status.status === 'COMPLETED') break;
    if (status.status === 'FAILED') {
      throw new Error('fal.ai job failed: ' + JSON.stringify(status).slice(0, 200));
    }
  }

  // Pull the final response
  const resultRes = await fetch(responseUrl, {
    headers: { 'Authorization': `Key ${apiKey}` },
  });
  if (!resultRes.ok) {
    const errText = await resultRes.text();
    throw new Error(`fal.ai result ${resultRes.status}: ${errText.slice(0, 200)}`);
  }
  const result = await resultRes.json();
  const imageUrl = result?.images?.[0]?.url;
  if (!imageUrl) throw new Error('fal.ai result has no image URL');

  // Download the PNG
  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) throw new Error(`fal.ai image download ${imgRes.status}`);
  const arr = await imgRes.arrayBuffer();
  return Buffer.from(arr);
}

// ── Backend: OpenAI (gpt-image-1) ───────────────────────────────────────
//
// Premium 2D quality, native transparent-bg support (no Bria post-process
// needed for icons), slower than Flux but the best per-image fidelity for
// hero UI art and marketing.
//
// Pricing (gpt-image-1, square 1024):
//   low      ~$0.011 / image
//   medium   ~$0.042 / image  (default — comparable to Flux Dev)
//   high     ~$0.167 / image  (use sparingly for hero / marketing)
//
// Sizes supported by gpt-image-1: 1024x1024, 1024x1536 (portrait),
// 1536x1024 (landscape), or 'auto'. Manifest sizes get rounded to the
// closest aspect — wide cards / banners come back at 1536x1024 and can
// be cropped or used as-is.
//
// Per-item override: set "background": "transparent" on a manifest item
// to request a transparent PNG directly (skips the bria-bg-removal step).
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-image-1';
const OPENAI_QUALITY = (process.env.OPENAI_QUALITY || 'medium').toLowerCase();
const OPENAI_API_BASE = 'https://api.openai.com/v1';

function mapSizeToOpenAI(width, height) {
  // Square if within 64px
  if (Math.abs(width - height) <= 64) return '1024x1024';
  return width > height ? '1536x1024' : '1024x1536';
}

async function generateViaOpenAI(item) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY missing');
  const { width, height } = parseSize(item.size);
  const size = mapSizeToOpenAI(width, height);
  const background = item.background || 'auto'; // 'transparent' | 'opaque' | 'auto'

  const body = {
    model: OPENAI_MODEL,
    prompt: item.prompt,
    n: 1,
    size,
    quality: OPENAI_QUALITY,
    background,
    output_format: 'png',
  };

  const res = await fetch(`${OPENAI_API_BASE}/images/generations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text();
    const err = new Error(`OpenAI ${res.status}: ${errText.slice(0, 300)}`);
    err.status = res.status;
    throw err;
  }
  const json = await res.json();
  const b64 = json?.data?.[0]?.b64_json;
  if (!b64) throw new Error('OpenAI response missing b64_json');
  return Buffer.from(b64, 'base64');
}

// ── Backend dispatch ────────────────────────────────────────────────────

const BACKENDS = {
  fal: { generate: generateViaFal, preflight: async () => {
    if (!process.env.FAL_KEY && !process.env.FAL_API_KEY) {
      throw new Error('FAL_KEY missing (add to .env.local — get one at fal.ai → Dashboard → API Keys)');
    }
  }},
  openai: { generate: generateViaOpenAI, preflight: async () => {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY missing (add to .env.local — get one at platform.openai.com → API Keys)');
    }
  }},
  gemini: { generate: generateViaGemini, preflight: async () => {
    if (!process.env.GOOGLE_API_KEY) throw new Error('GOOGLE_API_KEY missing (add to .env.local)');
  }},
  comfyui: { generate: generateViaComfyUI, preflight: comfyCheckRunning },
};

// ── Main ────────────────────────────────────────────────────────────────

async function main() {
  const backend = BACKENDS[BACKEND];
  if (!backend) {
    console.error(`Unknown ART_BACKEND='${BACKEND}'. Valid: ${Object.keys(BACKENDS).join(', ')}`);
    process.exit(1);
  }

  if (!fs.existsSync(MANIFEST_PATH)) {
    console.error(`Manifest not found: ${MANIFEST_PATH}`);
    process.exit(1);
  }
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
  const items = Array.isArray(manifest.items) ? manifest.items : [];
  const filtered = ONLY ? items.filter((it) => it.group === ONLY) : items;
  if (filtered.length === 0) {
    console.error(`No items match --only=${ONLY}`);
    process.exit(1);
  }

  ensureDir(OUTPUT_DIR);

  const todo = [];
  for (const item of filtered) {
    const outPath = path.join(OUTPUT_DIR, item.filename);
    if (!FORCE && fs.existsSync(outPath)) {
      log(`SKIP  ${item.filename}  (exists — use --force to regenerate)`);
      continue;
    }
    todo.push({ ...item, outPath });
  }

  log(`\nBackend: ${BACKEND}`);
  log(`Plan: generate ${todo.length} image${todo.length === 1 ? '' : 's'}.`);
  if (BACKEND === 'gemini') log('Estimated cost: $' + (todo.length * 0.039).toFixed(3) + ' at Gemini standard.');
  if (BACKEND === 'fal') {
    const per = FAL_MODEL.includes('schnell') ? 0.003
             : FAL_MODEL.includes('ultra') ? 0.06
             : FAL_MODEL.includes('pro') ? 0.05
             : 0.025;
    log(`Estimated cost: $${(todo.length * per).toFixed(3)} at ${FAL_MODEL}.`);
  }
  if (BACKEND === 'openai') {
    const per = OPENAI_QUALITY === 'low' ? 0.011
             : OPENAI_QUALITY === 'high' ? 0.167
             : 0.042;
    log(`Estimated cost: $${(todo.length * per).toFixed(3)} at ${OPENAI_MODEL} (${OPENAI_QUALITY}).`);
  }
  log('');

  if (DRY_RUN) {
    for (const item of todo) log(`  [${item.group ?? 'misc'}] ${item.filename}  (${item.size})`);
    log('\n(dry run — no generation)');
    return;
  }
  if (todo.length === 0) {
    log('Nothing to do.');
    return;
  }

  // Preflight (key check, server reachable, etc)
  try {
    await backend.preflight();
  } catch (err) {
    console.error(`\nPreflight failed: ${err.message}\n`);
    process.exit(2);
  }

  let ok = 0;
  let fail = 0;
  for (const [i, item] of todo.entries()) {
    const label = `[${i + 1}/${todo.length}] ${item.filename}`;
    process.stdout.write(`${label}  …`);
    try {
      const buf = await backend.generate(item);
      ensureDir(path.dirname(item.outPath));
      fs.writeFileSync(item.outPath, buf);
      process.stdout.write(`\r${label}  ✓ ${buf.length.toLocaleString()} bytes\n`);
      ok += 1;
    } catch (err) {
      process.stdout.write(`\r${label}  ✗ ${err.message.slice(0, 160)}\n`);
      fail += 1;
      // Fail-fast on Gemini quota — stop burning requests
      if (BACKEND === 'gemini' && /\b429\b|quota|rate.?limit/i.test(err.message)) {
        console.log('\nQuota exceeded. Either wait for free-tier reset, enable billing,');
        console.log('or rerun with ART_BACKEND=comfyui and ComfyUI running locally.');
        process.exit(3);
      }
    }
  }

  log(`\nDone. ${ok} ok, ${fail} failed. Output: ${OUTPUT_DIR}`);
  if (fail > 0) process.exit(2);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
