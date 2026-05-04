# Drop4 Sprint Log

Chronological session-by-session log of what shipped + decisions made.

---

## 2026-05-04 — overnight session: lootbox pivot + AMG Engine foundation

**Strategic shift confirmed**: Devon decided Drop4 is no longer the
priority — every feature built from this point on is an AMG Engine
investment that the next game (Tic Tac Toe clone, weeks away) inherits
for free. Quality over Drop4 ship date.

### Commits this session

| Hash | Scope | What |
|------|-------|------|
| `2e91308` | drop4 | feat: lootbox pivot + customize/sub-screens AAA polish |
| `9532250` | drop4 | shop: section-grouped boxes + themed accent stripes + sync colors |
| `92a930c` | drop4 | shop: BOXES READY + SHARDS locker strip above Daily Deals |
| `3b372b1` | drop4 | customize: emote count fix, tighter outfit names, brighter sparkles |
| `5854781` | drop4 | shop: kill misleading discount-price subtitle on Daily Deals |
| `d7fe1d7` | drop4 | shop: BAGS section header text-only, drop redundant purple banner |
| `60af2df` | drop4 | customize: ClothesCatalog — GTA/Skyrim per-slot wardrobe shopping |
| `7107356` | drop4 | customize: Path A variants — ownership, sub-categories, Goku gallery |
| `24b95c0` | amg-engine | feat: scaffold @amg/cosmetic-ui + @amg/cosmetic-runtime packages |
| *(unity script committed below)* | unity | Drop4ColorwayExporter for Path A render batch |

### What's now live

**Drop4** — production-ready at this commit:

- **Lootbox economy**: 11 boxes (4 tiered + 5 themed + 1 featured),
  pity timers per tier, shards with rarity buckets, dupe → shards +
  coin refund, Shard Shop with deterministic unlock flow
- **Customize tab**: hero card with player identity (name, tier-tinted
  title, level, collection %), ambient sparkle particles, EDIT pill,
  equipped pills tap-to-jump to that slot's browser, glassmorphic
  action band, 2-col loadout cells with rarity stripes + currently-
  equipped item names
- **ClothesCatalog**: PARTS (GTA per-slot) + PACKS (152 outfit bundles)
  modes. Sub-categories per top bucket (TOPS → Hoodies / Shirts /
  Jackets / Armor / etc.), painted Unity thumbnails, NOW WEARING
  banner, species filter
- **VariantGallery**: Goku-transformations modal — tap an owned part
  → modal opens with all 10 colorways in a grid. Owned = lit + tappable
  to equip; locked = silhouette + LootBox route. Premium colorways
  (Gold / Camo / Neon) get a star badge.
- **Sub-screens**: CategoryBrowser (boards / pieces / FX / wins /
  frames / pets) with NOW EQUIPPED banner + progress + filter chips +
  preview swatches per category. ShardShop with HOW IT WORKS hero
  for first-timers.
- **Shop**: TODAY'S DEALS daily rotation, BOXES READY locker strip
  above Daily Deals, BAGS sectioned by TIERED / THEMED / FEATURED,
  themed boxes have category-tinted accent stripes consistent with
  Customize.

**AMG Engine** — scaffolded for cross-game lift:

- `@amg/cosmetic-ui` (new): pure-presentational UI for wardrobe
  surfaces. First lift: `VariantGallery`. Headless of game stores —
  every game wires its own `CosmeticAdapter`.
- `@amg/cosmetic-runtime` (new): cross-game wardrobe types +
  lootbox economy primitives (`SHARD_UNLOCK_COST`, `DUPE_COIN_REFUND`,
  `RARITY_TO_LOOT`). The `WardrobeShape` interface defines what
  the future Firebase AMG account document will hold.

**Unity Synty Character Creator** — Path A render batch ready:

- `Drop4ColorwayExporter.cs` — new MonoBehaviour with two batch
  modes (full and Human-Torso smoke test). Iterates species × parts
  × Synty `ColorGroup.Outfits` presets, writing one PNG per
  `(part, presetIdx)` to `src/assets/images/parts-colorways/`. Also
  emits `colorway-manifest.json` listing the preset slugs so Drop4
  knows what colorways exist. Compiled clean.

### Variant ownership data layer (Drop4 characterStore)

Path A from the variant pivot — additive, backward-compat:

```ts
ownedPartVariants:    Record<PartName, string[]>  // e.g. { "SK_..._10TORS_HU01": ["red", "cyan"] }
equippedPartVariant:  Record<PartName, string>    // current variant per part
equippedOutfitVariant: string                      // pack-level variant
```

`DEFAULT_VARIANT_ID = ''` — represents the as-rendered Synty default
colorway, always implicitly owned when the base part is owned. New
methods: `unlockPartVariant`, `equipPartVariant`,
`isPartVariantOwned`, `ownedVariantsForPart`. No save migration
required — `ownedVariantsForPart` synthesizes the default from
legacy `ownedAmgParts`.

### Sub-category taxonomy

Tagged by pack-prefix (Modern Civilians = Hoodies + Jeans + Sneakers,
Fantasy Knights = Armor + Pants + Boots, Samurai Warriors = Armor +
Robes + Sandals, etc.) — see `src/data/partSubcategories.ts`. Hair
uses name-pattern heuristics (long / short / medium / buzzed / styled).
Face / Accessories use slot-driven taxonomy (brows / beards / ears /
backpacks / belts / pauldrons / knee pads).

### What needs Devon's input next session

1. **Run the colorway exporter** — drop `Drop4ColorwayExporter` onto
   the Character Creator scene rig and trigger the smoke test from
   the inspector context menu first. Verify the 8-or-so Synty preset
   slugs match what's expected (the manifest JSON tells you). Then
   trigger the full pass for the multi-hour batch. Output goes to
   `src/assets/images/parts-colorways/`.
2. **Update Drop4 partThumbs** to surface colorway PNGs alongside
   the default thumbnails (`getPartVariantThumb(partName, variantId)`)
   so the VariantGallery swaps from tinted disc placeholders to real
   painted Unity renders.
3. **Lootbox drop pool expansion** — once the manifest lands, expand
   `lootBoxStore.openBox()` to mint `(partName, variantId)` tuples
   instead of just `partName`. Drops the tuple via
   `unlockPartVariant`. Pool size jumps from ~245 items to ~2K.
4. **Continue the engine lift** — port `ClothesCatalog`,
   `CategoryBrowser`, `ShardShop`, `LockerHeroCard` from Drop4 to
   `@amg/cosmetic-ui`. Drop4 rewires its imports as each lift lands.
5. **Tic Tac Toe scaffolding** — start the project, install
   `@amg/cosmetic-ui` + `@amg/cosmetic-runtime`, wire the same
   wardrobe surface using TTT's own game-local store. First proof
   the engine pattern works.

### Decisions locked

- **Path A variants** (vs runtime tinting palettes) — confirmed.
- **Cross-game wardrobe** for Synty cosmetics; per-game cosmetics
  (Drop4 boards/pieces/FX, TTT X/O marks) stay local.
- **Sub-category taxonomy** as listed (Tops/Pants/Shoes/Hair/Face/
  Hats/Accessories with sub-cats per bucket).
- **AMG Engine** = the strategic foundation. Drop4 ship date is
  flexible.
- **`@amg/cosmetic-ui` + `@amg/cosmetic-runtime`** as the package
  names for the lift.

---

## 2026-05-04 — overnight session round 2: end-to-end engine wiring

Devon said "keep going" so I continued from the engine-package
scaffolding into actually wiring Drop4 to consume the engine.

### Commits this round

| Hash | Scope | What |
|------|-------|------|
| `28b8f39` | drop4 | engine-lift: ClothesCatalog now consumes @amg/cosmetic-ui |

### What's now live (round 2)

- **`src/services/cosmeticAdapter.ts`** — Drop4's bridge to the
  engine. Wraps `useCharacterStore` + `getPartThumb` +
  `amgPartPricing` + `packMeta` into the cross-game `CosmeticAdapter`
  shape every engine component takes as a prop.
- **VariantGallery now from engine.** Drop4's local copy at
  `src/components/customize/VariantGallery.tsx` is deleted. The
  `@amg/cosmetic-ui` version is the live one; Drop4 wires it via
  `drop4CosmeticAdapter` + game-specific equip/route callbacks.
- **Slot bucket types lifted.** `SlotBucket`, `AmgManifestPart`, and
  `DEFAULT_SLOT_BUCKETS` now live in `@amg/cosmetic-ui` (under
  `types/slots.ts`). Drop4 imports them; the local definitions were
  removed.
- **Variant drop machinery in lootBoxStore.** `LootItemType`
  extended with `'partVariant'`; `variantDropId` / `parseVariantDropId`
  encode `(partName, variantId)` tuples as `partName__variantId`
  ids; `mintPartVariantItem` + `awardPartVariant` are the
  achievement/scripted-event hooks. `grantItem` and
  `isLootItemOwned` dispatch the `partVariant` case through
  `characterStore.unlockPartVariant` / `isPartVariantOwned`.
- **`getLootItemById` synthesizes** partVariant items for any id
  matching the `__` pattern, so the manifest-driven pool expansion
  can grant variants without pre-registering each.

### What's NOT in this round (waits on Unity batch)

- The actual lootbox drop POOL doesn't yet seed variant items.
  Once `colorway-manifest.json` lands at
  `src/assets/images/parts-colorways/`, a follow-up commit reads the
  manifest and seeds `(part, variant)` entries into
  `POOL.byCatRarity` by rarity.

### Cross-game proof

Drop4's `ClothesCatalog` calls into the engine `VariantGallery` via
the adapter pattern. Tic Tac Toe will write its own
`tttCosmeticAdapter.ts` against its own zustand stores and render the
exact same engine `VariantGallery` JSX. **The platform claim is now
testable** — there's no Drop4-specific code inside the engine
package.

### Decisions locked (round 2)

- **`partName__variantId` id format** is canonical across the
  lootbox + the Unity colorway exporter (filenames match this).
- **`awardPartVariant`** is the standard hook for achievements /
  scripted events — uses the same dupe → shards+coin-refund logic
  as `openBox` so the UX stays consistent.
- **Drop4-local `partSubcategories.ts`** stays in Drop4 (pack
  tagging is game-specific). The `SubcategoryAdapter` interface in
  `@amg/cosmetic-ui` lets games plug their own taxonomy in when
  ClothesCatalog itself gets lifted (deferred for now since it's
  ~1100 lines and the leaf primitives — adapter, gallery, slot
  buckets — give TTT enough to start).
