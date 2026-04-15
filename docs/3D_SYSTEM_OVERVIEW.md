# Drop4 3D Character System Overview

This document covers the architecture of Drop4's runtime 3D character system: how models get from Unity into the game, how they're rendered, and how to add more content.

## Big picture

```
[Unity Synty Sidekick] ──(Tools/Drop4/Export…)──▶ [FBX]
[Polygon Dog pack]     ──────────────────────────▶ [FBX]
[Synty animation clips] ──(npm run stage-anims)──▶ [FBX]

  [FBX] ──(npm run convert-fbx <category>)──▶ [GLB files in src/assets/models/]

  [GLBs] ──(registries)──▶ [React Native / three.js] ──▶ [Character3D, Pet3D]
```

**Key call-out:** The GLB binaries are **local-only**. `fbx_export/` and `src/assets/models/**/*.glb` are `.gitignore`d. The repo only tracks code + registries. Each dev who wants the GLBs has to run the Unity export + conversion pipeline themselves (see `docs/FULL_IMPORT_RUNBOOK.md`).

## The three registries

All live in `src/data/`:

| File | Exports | Count |
|------|---------|-------|
| `outfitRegistry.ts` | `OUTFITS`, `OUTFIT_IDS`, `PACKS`, `outfitsForSpecies()`, `outfitsForPack()` | 152 outfits across 5 species × 14 packs |
| `petRegistry.ts` | `PETS`, `PET_IDS`, `STARTER_PET_ID` | 16 Polygon Dog breeds |
| `animationRegistry.ts` | `HUMAN_IDLES`, `HUMAN_EMOTES`, `DOG_IDLES`, `DOG_ACTIONS`, `findAnimation()` | 48 clips (idles + emotes + dog actions) |

Every entry has a `glb: require('../assets/models/...')` — Metro's static analyzer resolves these at build time.

`outfitRegistry.ts` is **auto-generated** by `tools/generate_outfit_registry.js` from whatever GLBs land in `src/assets/models/outfits/`. Re-run `npm run gen-outfits` after adding new outfits.

### Derived shop catalog

`src/data/cosmeticsShopCatalog.ts` wraps the three registries to produce `ShopItem[]` arrays with prices + rarities + collections:

- `OUTFIT_SHOP_ITEMS` — all 152 outfits as shop items (pack-tiered pricing)
- `PET_SHOP_ITEMS` — 16 pets
- `EMOTE_SHOP_ITEMS` — 21 emotes

This is the data source for the ShopScreen `outfits` / `pets` / `emotes` tabs.

## The render components

All in `src/components/3d/`:

### `Character3D.tsx`
The core renderer. Takes a body GLB + customization (skin color, hair color, outfit part colors, blendshape sliders) + optional `animationGlb`. Uses `@react-three/fiber` Canvas with three-point lighting (warm key + cool fill + rim), subtle breathing idle, auto turntable in creator mode, and a floor shadow plate.

Key subcomponents (all in the same file):
- `CharacterModel` — loads + normalizes the GLB, applies per-mesh color overrides, drives `THREE.AnimationMixer` for retargeted clips
- `BreathingRig` — 2% scale pulse + tiny Y-bob for organic feel
- `TurntableRig` — slow Y-axis rotation (creator mode only)
- `Floor` — circular translucent plate that receives shadows

Per-part color routing uses Synty's mesh name convention:
- `01HEAD`, `15HNDL`, `16HNDR`, `34EARL`, `33EARR` → skin
- `02HAIR`, `32FHAR` → hair
- `10TORS`, `18LEGL`, etc. → outfit colors map
- `05EYEL`, `06EYER`, `03EBLL`, `04EBRL`, `36TETH`, `37TONG` → fixed (white/black/red)

### `Character3DPortrait.tsx`
Drop-in replacement for legacy `AnimatedCharacter` / `CharacterAvatar`. Reads the local player's customization from `characterStore` by default; accepts `customization` + `animationId` overrides. Used by:
- MatchupScreen (player slot)
- GameScreen (game-over player avatar)
- PartyLobbyScreen (player slot)
- OutfitPreviewModal (3D preview)

### `Pet3D.tsx`
Same pipeline as Character3D but quadruped-framed (lower camera, wider FOV, no blendshapes). Used by:
- `PetDisplay` when a 3D dog GLB exists for the given pet ID
- Future: dedicated pet showcase screens

## Stores (Zustand + AsyncStorage)

| Store | Tracks | File |
|-------|--------|------|
| `useCharacterStore` | Customization (outfit, body sliders, skin, hair, outfit colors), owned outfits, unlocked hair colors + color packs | `src/stores/characterStore.ts` |
| `usePetStore` | Owned pets, active pet | `src/stores/petStore.ts` |
| `useShopStore` | Coins, gems, everything else (boards, pieces, emote slots, pet equipped) | `src/stores/shopStore.ts` |

Emotes bridge two stores: ownership lives in `useShopStore.ownedEmotes` (array of IDs, can mix legacy 2D IDs + new 3D `emote_*` IDs), and `EmotePickerModal3D` cross-references with `HUMAN_EMOTES` from `animationRegistry.ts` to resolve the GLBs.

## Feature flag

`src/config/features.ts` → `FEATURES.character3D`.

Every call site that renders a character wraps its 3D render in:

```tsx
{FEATURES.character3D
  ? <Character3DPortrait ... />
  : <AnimatedCharacter ... />}
```

This lets us ship the 3D pipeline gradually without removing the 2D fallback. Flip the flag off to regress any screen to legacy 2D.

## Adding new content

### Add a new outfit
1. In Unity: build the character in the Character Creator, then run `Tools/Drop4/Export Character As FBX`.
2. Drop the FBX into `fbx_export/outfits/<species>_<pack>_<NN>.fbx`.
3. Run `npm run convert-fbx outfits`.
4. Run `npm run gen-outfits` to regenerate the registry.
5. The shop + creator pick it up automatically.

### Add a new dog breed
1. Add a new prefab under `Assets/PolygonDog/Prefabs/Dogs/`.
2. Extend `DOG_BREEDS` in `Assets/CharacterCreator/Editor/Drop4FbxExporter.cs`.
3. Run `Tools/Drop4/Export Polygon Dogs As FBX`.
4. Run `npm run convert-fbx pets`.
5. Add an entry to `src/data/petRegistry.ts`.

### Add a new emote
1. Locate the FBX in `Assets/Synty/AnimationEmotesAndTaunts/Animations/Polygon/<Gender>/<Category>/`.
2. Add it to the list in `tools/copy_animations.js`.
3. Run `npm run stage-anims && npm run convert-fbx animations`.
4. Add an entry to `HUMAN_EMOTES` in `src/data/animationRegistry.ts`.
5. The creator + shop emotes tabs + home emote picker all read from that array.

## Performance notes

- Each `<Canvas>` costs ~1-2 draw calls per frame. Home/Matchup/Creator/Preview screens = 1 Canvas each, fine.
- **Grids (Collection, Roster)** render many characters at once — do NOT use live Canvas per card. TODO: implement `CharacterSnapshot` that renders once offscreen and caches a PNG via `react-native-view-shot`.
- HUD-size (< 50px) characters stay 2D forever — Canvas overhead isn't worth it.
- Pet3D uses `frameloop="always"` for the idle animation; cap animation usage in grids.

## Pipeline why-this-not-that

- **Why FBX intermediate, not direct GLB from Unity?** UnityGLTF's skinned mesh export is broken (invisible characters with wrong bind matrices). FBX + FBX2glTF round-trips perfectly.
- **Why not Blender?** Blender's FBX importer crashes on Unity FBX with blendshapes.
- **Why local-only GLBs?** 500MB+ of binaries would bloat the repo permanently. Git LFS is overkill when the pipeline is fully reproducible from Unity source.
