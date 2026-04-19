# Drop4 Art Workflow — Autonomous Generation

Two backends. Use ComfyUI for bulk work (free, unlimited, local GPU). Fall back to Gemini API when ComfyUI isn't running and you need one-offs.

Pick via `ART_BACKEND` env var. Default: `comfyui`.

---

## Backend 1: ComfyUI (recommended, free, unlimited)

Runs on your RTX 4090. Any checkpoint you have installed. No rate limits. No API costs.

### One-time setup

1. **Start ComfyUI** with the API enabled so the script can connect:

   ```bash
   # in your ComfyUI install dir
   python main.py --listen 127.0.0.1 --port 8188
   ```

   Leave the window open. Don't close it — the script talks to it over HTTP.

2. **Know your checkpoint filename.** The script defaults to `sd_xl_base_1.0.safetensors`. If you have a different SDXL or Flux checkpoint you prefer, set it in `.env.local`:

   ```
   COMFY_CHECKPOINT=my_flux_model.safetensors
   ```

   (Filename must match what ComfyUI sees in `models/checkpoints/`.)

3. **Optional tuning** in `.env.local`:

   ```
   COMFY_URL=http://127.0.0.1:8188          # default
   COMFY_CHECKPOINT=sd_xl_base_1.0.safetensors
   COMFY_STEPS=25                           # 20-30 is usually plenty
   COMFY_CFG=7                              # 6-9 typical for SDXL
   COMFY_NEGATIVE_PROMPT=text, watermark, signature, logo, ugly, blurry, low quality, distorted, deformed
   ```

### Running

```bash
# Generate only missing assets (skips anything in src/assets/images/ui/ already)
node tools/gen-art.mjs

# Regenerate everything
node tools/gen-art.mjs --force

# Only one manifest group
node tools/gen-art.mjs --only=tab-icons

# See what would run, no generation
node tools/gen-art.mjs --dry-run
```

Each image takes ~5-15 seconds on a 4090 depending on steps + resolution. The script waits patiently; expect ~2-3 minutes for the full 14-asset starter pack.

### If it fails to connect

> `Preflight failed: ComfyUI not reachable at http://127.0.0.1:8188`

ComfyUI isn't running, or it's running without the `--listen` flag. Fix: restart ComfyUI with `python main.py --listen`.

---

## Backend 2: Gemini Nano Banana (cloud fallback)

Use when ComfyUI isn't running (not at your desk, DoorDashing, etc).

### Setup

1. Get an API key at [aistudio.google.com](https://aistudio.google.com) → Get API key.
2. Add to `.env.local`:

   ```
   GOOGLE_API_KEY=AIza...
   ```

3. Free tier resets daily. For bulk generation, enable billing on your Google Cloud project (pay-as-you-go ~$0.039/image, $0.55 for the starter pack).

### Running

Force the Gemini backend:

```bash
ART_BACKEND=gemini node tools/gen-art.mjs
```

Or set it permanently in `.env.local`:

```
ART_BACKEND=gemini
GOOGLE_API_KEY=...
```

### Models (optional override)

```
GEMINI_MODEL=gemini-2.5-flash-image        # default, "Nano Banana"
GEMINI_MODEL=gemini-3.1-flash-image-preview  # newer, try if 2.5 quota hits
GEMINI_MODEL=gemini-3-pro-image-preview      # "Nano Banana Pro", 4K quality
GEMINI_MODEL=imagen-4.0-fast-generate-001    # Google Imagen 4, different quota bucket
```

---

## Adding new assets

Edit `docs/ui-asset-manifest.json`. Add an entry to `items[]`:

```json
{
  "group": "buttons",
  "id": "btn-primary",
  "filename": "btn-primary.png",
  "size": "800x200",
  "prompt": "Premium mobile game button background..."
}
```

Then `node tools/gen-art.mjs --only=buttons`.

### Prompt tips

- Always include the shared `_style_lockup_text` from the top of the manifest so assets look like one pack.
- Say "no text" explicitly — models love hallucinating fake logos.
- Say "transparent background" or "edges fade to transparent" for icons + frames.
- Reference games: "polish like Basketball Stars or Candy Crush Saga" anchors the quality.
- Sizes: 512² for icons, 1200×300 for wide buttons, 1080×1920 for backgrounds, 600×800 / 800×800 for frames.

---

## Autonomous Claude sessions

When Claude sessions need to generate art:

1. Devon starts ComfyUI once (`python main.py --listen`).
2. Tells Claude what to make ("3 new tab icons for Shop / Challenges / Home, wire into MainTabs").
3. Claude adds entries to `docs/ui-asset-manifest.json`, runs `node tools/gen-art.mjs`, imports the resulting PNGs, replaces emoji in the UI, runs tsc + jest, commits through the pre-commit gate.

If ComfyUI isn't running and Claude can't reach you, it falls back to the Gemini API (if `GOOGLE_API_KEY` is set) — assuming free-tier quota is available.

---

## Cost quick-reference

| Backend | Cost | Speed | When to use |
|---|---|---|---|
| ComfyUI | Free | 5-15s/image | Bulk work, iteration, style exploration |
| Gemini standard | $0.039/image | 5-10s | ComfyUI down, need one-offs, consistent results |
| Gemini Nano Banana Pro | ~$0.10/image | 10-20s | Hero assets where quality matters more than cost |
| Imagen 4 Fast | Similar | 5-8s | Alternative quota bucket if Gemini is capped |

---

## Troubleshooting

| Error | Fix |
|---|---|
| `GOOGLE_API_KEY missing` | Add to `.env.local` |
| `ComfyUI not reachable` | Start ComfyUI with `--listen` flag |
| Gemini `429 quota` | Wait 24h, enable billing, or switch to `ART_BACKEND=comfyui` |
| Gemini `404 model not found` | Wrong `GEMINI_MODEL`. Defaults should be fine; check `/models` endpoint with your key |
| ComfyUI `ckpt_name not found` | `COMFY_CHECKPOINT` must match a filename in your ComfyUI `models/checkpoints/` folder |
| ComfyUI timeout | Check the ComfyUI window for errors — probably out of VRAM or bad checkpoint |

---

## What NOT to use this for

- Character 3D models — that's Unity + GLB export.
- Audio — that's Dustyroom / AudioCraft / Freesound.
- Complex multi-layer compositions — use ComfyUI GUI manually for those.
- Animations — that's Mixamo / Lottie / webgpu-vfx.
