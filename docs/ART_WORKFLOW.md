# Drop4 Art Workflow — Nano Banana Autonomous Generation

Lets Claude (or Devon) generate UI assets on demand via the Google Gemini 2.5 Flash Image API ("Nano Banana"). Assets live in the repo, wire into components, ship.

## One-time setup

1. **Get a key.** Go to [aistudio.google.com](https://aistudio.google.com) → "Get API key" → create one in a Google Cloud project. Free tier covers the initial UI pack (~$0.55 total at standard rate).
2. **Drop it in `.env.local`** at the repo root:
   ```
   GOOGLE_API_KEY=AIza...
   ```
   (`.env.local` is gitignored; the key never leaves your machine.)
3. **Confirm it works:**
   ```bash
   node tools/gen-art.mjs --dry-run
   ```
   Should print the plan and estimated cost without hitting the API.

## Generating assets

```bash
# Generate only missing assets (skips anything already in src/assets/images/ui/)
node tools/gen-art.mjs

# Regenerate everything (useful after editing the style_lockup)
node tools/gen-art.mjs --force

# Only regenerate one group
node tools/gen-art.mjs --only=tab-icons

# See what would run without spending money
node tools/gen-art.mjs --dry-run
```

Outputs go to `src/assets/images/ui/<filename>`. Metro bundles them automatically.

## Adding new assets

Edit `docs/ui-asset-manifest.json`. Add an entry to `items[]`:

```json
{
  "group": "buttons",
  "id": "btn-primary",
  "filename": "btn-primary.png",
  "size": "800x200",
  "prompt": "Premium mobile game button background: ..."
}
```

Then `node tools/gen-art.mjs --only=buttons`.

**Prompt tips for consistency:**
- Reference the `_style_lockup_text` at the top of the manifest — the shared visual language (dark navy + neon orange + warm gold).
- Specify "no text" explicitly (the model sometimes adds phantom logos).
- Specify "transparent background" or "edges fade to transparent" for icons and frames.
- Mention reference games: "polish like Basketball Stars or Candy Crush Saga" anchors the quality bar.
- Keep sizes at 512² for icons, 1200×300 for buttons, 1080×1920 for backgrounds, 600×800 or 800×800 for frames.

## Autonomous Claude sessions

If you want Claude to generate + wire up assets autonomously during a session:

1. Put the key in `.env.local` before the session starts.
2. Tell Claude the asset type and where you want it used ("generate 3 new tab icons for Shop, Challenges, Home and wire them into MainTabs").
3. Claude will add entries to the manifest, run the script, import the resulting PNGs, replace the emoji in the UI, run tsc + jest, and commit.

## Cost reference

- $0.039 per image at standard rate
- $0.0195 per image at batch rate (contact Google for batch access)
- Initial UI pack: 14 images ≈ $0.55
- Full pack extension (50+ assets): ~$2-3

## When to use this vs ComfyUI

- **Use Nano Banana (this workflow)** for bulk UI assets: icons, buttons, frames, backgrounds, ambient textures. The API is always on, results are deterministic per prompt, and you can batch generate 50+ assets in one Claude session.
- **Use ComfyUI** for hero art: app icon, splash screen, marketing banners, anything that needs LoRAs, inpainting, or fine control over composition. ComfyUI runs on your desktop GPU so it's only available when the machine's on.
- **Don't use either** for character 3D (that's Unity + GLB export) or audio (Dustyroom / AudioCraft / Freesound).

## Troubleshooting

- **"GOOGLE_API_KEY not found"** — check `.env.local` exists at repo root with `GOOGLE_API_KEY=...`
- **"Gemini API 403"** — key is valid but image generation quota exceeded. Check aistudio.google.com usage.
- **"Gemini API 400"** — prompt may have triggered a safety filter. Rephrase, avoid copyrighted game names in the prompt text.
- **Image looks generic or off-style** — edit the prompt to reference `_style_lockup_text` explicitly, rerun with `--force`.
