# Full Pack + Dog + Animation Import Runbook

This is a one-page guide for producing every GLB asset the Drop4 app needs
from the Unity Synty Sidekick + Polygon Dog packs.

## What you'll get

- **All 17 Sidekick packs** × **5 species** × ~8–12 outfits each (≈ hundreds of outfit GLBs)
- **16 Polygon Dog breeds** as pet GLBs
- **~40 animation clips**: human idles, human emotes, dog idles, dog actions

All GLBs land in `src/assets/models/` — the React Native app already knows
how to load them.

---

## Step 1 — Export all Sidekick packs (Unity)

1. Open the Unity project at `C:\Users\devon\OneDrive\Desktop\Unity Games\Synty Character Creator\`
2. Open the Character Creator scene.
3. **Enter Play Mode** (required — the exporter iterates the live manager).
4. Menu: **Tools → Drop4 → Export ALL Packs As FBX**.
5. Confirm the dialog. Wait — it will iterate every species × pack × outfit (~10 min).

FBX files land in:

```
C:\Users\devon\OneDrive\Desktop\Drop4\fbx_export\outfits\
    human_modern_civilians_01.fbx
    human_apocalypse_outlaws_01.fbx
    elf_fantasy_knights_01.fbx
    ...
```

## Step 2 — Export Polygon Dogs (Unity)

Still in Play Mode:

1. Menu: **Tools → Drop4 → Export Polygon Dogs As FBX**
2. All 16 breeds export to `Drop4/fbx_export/pets/dog_*.fbx`

## Step 3 — Stage animation clips (no Unity needed)

The Synty + Dog packs already ship each animation as its own FBX.
A Node script copies the curated set:

```bash
cd C:\Users\devon\OneDrive\Desktop\Drop4
npm run stage-anims
```

This populates `fbx_export/animations/{idles,emotes,dog}/`.

## Step 4 — Convert everything to GLB

```bash
npm run convert-fbx outfits
npm run convert-fbx pets
npm run convert-fbx animations
```

Each run uses Meta's FBX2glTF. Output lands in `src/assets/models/<category>/`.

## Step 5 — Register the new GLBs in TypeScript

### Outfits
Edit `src/data/outfitRegistry.ts` — follow the existing
`modern_civilians_01..12` pattern. Add one entry per `<species>_<pack>_NN.glb`
produced in step 1. You'll probably want to group by species with separate
exported arrays (e.g. `HUMAN_OUTFITS`, `ELF_OUTFITS`).

### Pets
Edit `src/data/petRegistry.ts` — every entry already has its `require()`
path commented out. Uncomment the `glb:` line for each breed whose GLB
actually exists in `src/assets/models/pets/`.

### Animations
Edit `src/data/animationRegistry.ts` — same deal: uncomment the entries
whose GLB exists. The file already contains the full curated list.

## Step 6 — Wire up in the app

The building blocks already exist:

- **`Character3D`** takes an optional `animationGlb` + `animationLoop` prop.
  Pass `HUMAN_IDLES[0].glb` to loop the base idle, or an emote GLB +
  `animationLoop={false}` to play a one-shot.
- **`Pet3D`** renders a dog with an optional animation. Use it beside
  `Character3D` on the home screen / matchup / game-over screens.
- **`usePetStore()`** tracks owned + active pet. Hydrate it in `App.tsx`
  alongside the other stores.

Suggested follow-ups (not done yet):

- Add **Pets tab** in the Character Creator screen using `Pet3D` for preview.
- Add **Emotes tab** with a grid of emote buttons → taps set a "playing
  emote" state on the home screen that feeds `Character3D.animationGlb`.
- Shop: add a **Pets** and **Emotes** category backed by `PETS` and
  `HUMAN_EMOTES`.

---

## Why this pipeline?

- UnityGLTF's skinned-mesh export was broken (bind matrices wrong, characters
  invisible). We sidestep it entirely.
- Blender's FBX importer crashes on Unity FBX with blendshapes.
- FBX2glTF (Meta) handles both skinning and blendshapes perfectly, and it's
  a single binary invoked by the existing batch script.
- Animations don't need Unity re-export at all — the clips are already
  standalone FBX inside the Sidekick/Dog packs. We just copy + convert.
