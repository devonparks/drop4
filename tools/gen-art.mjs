#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════
// gen-art.mjs — Nano Banana (Gemini 2.5 Flash Image) batch generator
//
// Reads docs/ui-asset-manifest.json and generates any assets whose files
// don't yet exist (or all of them with --force). Writes PNGs into
// src/assets/images/ui/<filename>.
//
// Env:
//   GOOGLE_API_KEY — Google AI Studio key (required). Get one at
//                    aistudio.google.com → API keys. Free tier is usually
//                    enough for an initial pass.
//
// Usage:
//   node tools/gen-art.mjs                    Generate missing assets only.
//   node tools/gen-art.mjs --force            Regenerate everything.
//   node tools/gen-art.mjs --only=tab-icons   Only assets whose `group` matches.
//   node tools/gen-art.mjs --dry-run          Print plan + cost estimate, no API calls.
//
// Pricing (reference, check Google pricing page):
//   $0.039 per image standard
//   $0.0195 per image batch
// ═══════════════════════════════════════════════════════════════════════

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// ── Config ──────────────────────────────────────────────────────────────
const MANIFEST_PATH = path.join(ROOT, 'docs', 'ui-asset-manifest.json');
const OUTPUT_DIR = path.join(ROOT, 'src', 'assets', 'images', 'ui');
const ENV_LOCAL = path.join(ROOT, '.env.local');
const MODEL = 'gemini-2.5-flash-image-preview';
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const PRICE_PER_IMAGE = 0.039; // USD, standard

// ── CLI args ────────────────────────────────────────────────────────────
const args = new Set(process.argv.slice(2));
const FORCE = args.has('--force');
const DRY_RUN = args.has('--dry-run');
const ONLY_ARG = [...args].find((a) => a.startsWith('--only='));
const ONLY = ONLY_ARG ? ONLY_ARG.split('=')[1] : null;

// ── Helpers ─────────────────────────────────────────────────────────────

/** Read GOOGLE_API_KEY from process env or .env.local. */
function loadApiKey() {
  if (process.env.GOOGLE_API_KEY) return process.env.GOOGLE_API_KEY;
  if (fs.existsSync(ENV_LOCAL)) {
    const text = fs.readFileSync(ENV_LOCAL, 'utf-8');
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(/^GOOGLE_API_KEY=(.+)$/);
      if (m) return m[1].trim().replace(/^["']|["']$/g, '');
    }
  }
  return null;
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function log(msg) {
  process.stdout.write(msg + '\n');
}

/**
 * Call Gemini 2.5 Flash Image. Returns a PNG Buffer or throws.
 * Docs: ai.google.dev/gemini-api/docs/image-generation
 */
async function generateImage(prompt, apiKey) {
  const url = `${API_BASE}/${MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseModalities: ['IMAGE'],
    },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API ${res.status}: ${errText.slice(0, 400)}`);
  }

  const json = await res.json();
  const parts = json?.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find((p) => p.inlineData?.mimeType?.startsWith('image/'));
  if (!imagePart) {
    throw new Error('No image in response: ' + JSON.stringify(json).slice(0, 400));
  }
  return Buffer.from(imagePart.inlineData.data, 'base64');
}

// ── Main ────────────────────────────────────────────────────────────────

async function main() {
  if (!fs.existsSync(MANIFEST_PATH)) {
    console.error(`Manifest not found: ${MANIFEST_PATH}`);
    console.error('Create it first — see docs/ui-asset-manifest.json starter.');
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
  const items = Array.isArray(manifest.items) ? manifest.items : [];
  if (items.length === 0) {
    console.error('Manifest has no items[] array. Add some assets first.');
    process.exit(1);
  }

  const filtered = ONLY
    ? items.filter((it) => (it.group ?? '') === ONLY)
    : items;

  if (filtered.length === 0) {
    console.error(`No items match --only=${ONLY}. Available groups:`,
      [...new Set(items.map((it) => it.group ?? ''))].join(', '));
    process.exit(1);
  }

  ensureDir(OUTPUT_DIR);

  // Decide which to generate
  const todo = [];
  for (const item of filtered) {
    const outPath = path.join(OUTPUT_DIR, item.filename);
    if (!FORCE && fs.existsSync(outPath)) {
      log(`SKIP  ${item.filename}  (exists — use --force to regenerate)`);
      continue;
    }
    todo.push({ ...item, outPath });
  }

  const estCost = todo.length * PRICE_PER_IMAGE;
  log(`\nPlan: generate ${todo.length} image${todo.length === 1 ? '' : 's'}.`);
  log(`Estimated cost: $${estCost.toFixed(3)} at standard rate.\n`);

  if (DRY_RUN) {
    for (const item of todo) {
      log(`  [${item.group ?? 'misc'}] ${item.filename}`);
    }
    log('\n(dry run — no API calls made)');
    return;
  }

  if (todo.length === 0) {
    log('Nothing to do. Use --force to regenerate, or add entries to manifest.');
    return;
  }

  const apiKey = loadApiKey();
  if (!apiKey) {
    console.error('\nGOOGLE_API_KEY not found. Options:');
    console.error('  1. Create .env.local with:  GOOGLE_API_KEY=...');
    console.error('  2. Export it:  export GOOGLE_API_KEY=...');
    console.error('\nGet a key at aistudio.google.com → API keys (free tier works).');
    process.exit(1);
  }

  // Generate sequentially (avoids hitting concurrent rate limits on free tier).
  let ok = 0;
  let fail = 0;
  for (const [i, item] of todo.entries()) {
    const label = `[${i + 1}/${todo.length}] ${item.filename}`;
    process.stdout.write(`${label}  …`);
    try {
      const buf = await generateImage(item.prompt, apiKey);
      ensureDir(path.dirname(item.outPath));
      fs.writeFileSync(item.outPath, buf);
      process.stdout.write(`\r${label}  ✓ ${buf.length.toLocaleString()} bytes\n`);
      ok += 1;
    } catch (err) {
      process.stdout.write(`\r${label}  ✗ ${err.message}\n`);
      fail += 1;
    }
  }

  log(`\nDone. ${ok} ok, ${fail} failed. Output: ${OUTPUT_DIR}`);
  if (fail > 0) process.exit(2);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
