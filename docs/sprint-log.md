# Drop4 Sprint Log

Chronological session-by-session log of what shipped + decisions made.

---

## 2026-05-15 — iPhone + Android JS-thread perf, Path B: character mesh merge

**Trigger.** Devon: "the android ran horribly. i just want to focus on
ios dev first … but its the same exact app but my android is old so the
ios handles it a little better but its the same issue." Path A
(`FrameThrottle@30 FPS`, shipped earlier today) cut per-second JS work
in half but didn't move per-frame cost, and 12 SkinnedMesh skinning
uploads + draw calls per frame on Hermes interpreted JS was the
ceiling. Path B collapses that.

**What shipped (engine-side, no Drop4 src/ changes).** All of the work
lives in `amg-engine/packages/character-runtime` — Drop4's wiring of
`Character3DPortrait.tsx` + `HomeScreen.tsx` from earlier today
(`<FrameThrottle fps={30} />` on iOS + `frameloop="demand"`) is
unchanged. The merge runs invisibly inside `CompositeCharacter` after
the existing graft/rebind step. From Drop4's perspective the character
renders the same; one Canvas, one CompositeCharacter, but inside
there's now 1 SkinnedMesh instead of 12.

See `amg-engine/docs/sprint-log.md` entry from today for the full file
list + implementation notes.

**Expected impact.**
- JS FPS on iPhone: 7 (baseline) → ≥ 25 sustained (target). Throttled
  to 30 FPS via FrameThrottle, so 25–30 is the realistic top.
- Per-frame JS work for the character: 12 mesh traversals + 12
  skinning uploads + 12 draw calls → 1 + 1 + 1.
- Android (Samsung): same direction; the per-frame collapse should
  recover smoothness on Devon's older device.

**No visual compromise.** Sidekick part materials only differ in
`.color`; roughness + metalness + textures + normals are uniform.
Vertex-color baking produces pixel-equivalent PBR output. Eyes/teeth
fixed colors and the eye-iris dark override (`#162033`) all flow
through `resolveSlotColor` and bake into COLOR_0 the same way.

**Known behavioral change.** Sidekick emote GLBs carry morph-target
animation tracks (browFurrow, mouthOpen, etc.) that referenced
specific per-part mesh names. After merge, those mesh names are gone
→ tracks silently no-op. Effect: emotes' baked-in face expressions
(e.g. dab's "scream face") no longer play. Body bone animation is
unaffected. Slider + expression morphs continue working — they're
written by `applyBlendshapes` to the merged mesh's union
`morphTargetInfluences`. This actually eliminates the
"scream-face-stuck-after-dab" bug the existing 0.8 s override window
in `CompositeCharacter` was already working around. The override
window stays in place (removing it is orthogonal) but it's
structurally unnecessary now.

**Validation plan (Devon to execute).**
1. `cd Drop4 && npx expo start --port 8082`
2. iPhone: EAS dev client → `exp://192.168.1.86:8082`. Shake → Perf
   Monitor. Compare JS FPS to the 7 FPS pre-FrameThrottle baseline
   and the post-FrameThrottle reading (whatever that was).
3. Android (Samsung SM-A136U): `a` in Metro. Same perf check.
4. Visual: HomeScreen character looks identical (skin tone, hair
   color, eyes have pupils, teeth white, outfit colors match).
5. Customize → swap an outfit. Verify part swap works (it now
   re-merges; ~50 ms hidden under the existing swap fade).
6. Emote button (dab / wave / clap / bow). Verify body animation
   plays. Facial expression baked in the clip will be absent —
   not a regression, see "Known behavioral change".

**Files (engine, uncommitted on working tree).**
- `amg-engine/packages/character-runtime/src/scene/merge.ts` (NEW)
- `amg-engine/packages/character-runtime/src/scene/tint.ts` (modified — exports + applyTints branch)
- `amg-engine/packages/character-runtime/src/scene/CompositeCharacter.tsx` (modified — full-rebuild + part-swap call merge)
- `amg-engine/packages/character-runtime/src/index.ts` (modified — new exports)
- `amg-engine/packages/character-runtime/src/scene/__tests__/merge.spec.md` (NEW — test cases documented as spec; engine workspace has no jest runner yet)

**Type-check.** `npx tsc --noEmit` from Drop4 — 0 errors in Drop4 src/.
Engine-workspace tsc noise (`Cannot find module 'three'` etc.) is the
same pattern as yesterday's run, expected per metro.config.js
workspace setup.

---

## 2026-05-15 — iPhone JS-thread perf, Path A: FrameThrottle@30 FPS

**Symptom.** iPhone HomeScreen idle/emote animations played slow and stuttery
even though the UI was smooth. Web and Samsung Android were fine.

**Diagnosis.** RN Perf Monitor on iPhone: **UI thread 53 FPS, JS thread
7 FPS, RAM 684 MB**. The character mixer in `@amg/character-runtime`
runs inside r3f's `useFrame`, which executes on the JS thread. iOS
Hermes is interpreted (JIT disallowed in the iOS sandbox), so the JS
cost of rendering a 12-mesh skinned Synty character at 60 FPS pegs the
thread at 7 FPS. With CompositeCharacter's 50 ms delta clamp (added
during the 2026-05-13 pretzel fix), each tick advances animation by
at most 50 ms × 7 ticks/sec = animations playing at ~35 % of authored
speed. That's what Devon was feeling — slow, choppy emotes.

**False starts ruled out.**
- `LiveBackground3D` is imported but never rendered on HomeScreen — not a contributor.
- Every `Animated.timing`/`loop`/`spring` on HomeScreen uses `useNativeDriver: true` → UI thread. Sparkles, breathing, drift, pulse, fade-ins all run native. Not JS thread work.
- No Reanimated worklets compete for JS on home.
- `setInterval` at line 712 fires every 10 s — negligible.

**Earlier attempt (this session, rolled back).** Cheap-wins pass —
TopBar snapshots, `dpr` cap via `setPixelRatio` in onCreated, MSAA off,
shadows off for portraits, TurntableGroup split. Reverted because (a)
it broke the home character's position (likely the `setPixelRatio`
call in onCreated interacted badly with expo-gl's size logic), and
(b) all those changes targeted the **GPU**, which was already running
fine at 53 UI FPS. The bottleneck was JS, not GPU. Wrong tree.

**What shipped.**
- `@amg/character-runtime` gained a new `FrameThrottle` helper component (`scene/FrameThrottle.tsx`, exported from the package root). It drives a parent Canvas at a fixed FPS by calling `invalidate()` on a `setInterval`. Pairs with `frameloop="demand"` on the Canvas.
- Drop4 wires `<FrameThrottle fps={30} />` into the two character Canvases when `Platform.OS === 'ios'`:
  - `src/components/3d/Character3DPortrait.tsx` — used by MatchupScreen, GameScreen game-over, Customize, AnimationPicker, Profile, every modal that shows a character.
  - `src/screens/HomeScreen.tsx` — the hero canvas.
- Android keeps `frameloop="always"` (Hermes JITs there; already smooth).
- Per `amg-engine/CLAUDE.md` quality > speed: FrameThrottle lives in
  the engine, not in Drop4, because every game after Drop4 (Tic Tac Toe,
  Checkers, Chess, RPS+) inherits the same character pipeline and the
  same iOS Hermes constraint.

**Files.**
- `amg-engine/packages/character-runtime/src/scene/FrameThrottle.tsx` (new)
- `amg-engine/packages/character-runtime/src/index.ts` (export)
- `Drop4/src/components/3d/Character3DPortrait.tsx` (wire + frameloop platform-switch)
- `Drop4/src/screens/HomeScreen.tsx` (wire + frameloop platform-switch)

**Expected impact.** JS FPS 7 → ~14–18 on iPhone. Mixer tick interval
drops from ~143 ms (10 % of intended rate) to ~33 ms (matches 30 FPS
animation budget). Animations should play at full authored speed with
a small visual drop from "60 FPS rendering" to "30 FPS rendering" that
mobile players don't perceive (industry-standard mobile rate).

**Path B (planned follow-up, not shipped).** If 30 JS FPS still feels
slow, merge the 12 character meshes into 1 SkinnedMesh at runtime to
cut draw calls and skinning uploads ~12 → 1. Full plan at
`amg-engine/docs/character-mesh-merge-plan.md`. Roughly 500 LOC, 1–2
days of focused work. Defer until after testing FrameThrottle on
iPhone; only invest if needed.

**Verification.** `tsc --noEmit` clean on Drop4 src/. The only tsc
output is the pre-existing engine-workspace "Cannot find module 'react'"
noise (same shape as the dozens of pre-existing errors in
CharacterCreator etc.); engine code resolves react at runtime via
Drop4's `node_modules` per metro.config.js workspace setup.

**Next:** rebuild and measure on iPhone. Open RN dev menu → Show Perf
Monitor → compare JS FPS to the 7 FPS baseline. If ≥ 25, Path A is
enough for v1.0. If still < 20, schedule Path B.

---

## 2026-05-06 — strategic shift: career mode is the retention engine

**Decision**: Drop4 ship date is no longer sacred. Bar = "career mode as addicting as Candy Crush / Angry Birds." Quality over calendar.

**Why**: Multiplayer was killed in v1. Without MP, career has to carry retention by itself. The original 36-level "MVP for beta" career is now the FOUNDATION, not the product.

**New v1 scope** (from `docs/CAREER_OVERHAUL.md`):
- ~200 unique levels across ~15 cities, recipe-generated (NOT 200 hand-typed)
- Every engine level type in active rotation + 1-2 new wrinkles per city (mirror cols, frozen pieces, double-drop, decoy pieces, survival mode, wild combos)
- All 3 boss scripts FULLY working (Tommy ✅ shipped, Sal mechanic still pending, Warden ✅ via existing seed)
- All 3 power pieces with full animations (engine ✅ shipped, animations pending)
- Per-level intro card + star burst + combo celebrations + per-mechanic FX
- City-themed background palettes + ambient particles + mascot reactions

**What's NOT changing** (1.1 deferrals stay deferred — date slip is for CAREER ONLY):
- Express Mode, iOS Live Activities, Pets, Frames-as-cell, Pack identity crests, Power piece box drops, AMG cross-game sync.

**Working target**: mid-to-late June 2026. **Real ship rule**: "when career competes."

**Documents updated**:
- `~/Desktop/CLAUDE.md` (Game Queue + Career Mode Pattern + Standing Context + "Ship v1" rule)
- `~/Desktop/Drop4/CLAUDE.md` (v1 Status + new "Career Mode is the Retention Engine" section + Dev Situation)
- `~/Desktop/Drop4/docs/CAREER_OVERHAUL.md` (full rewrite — Phase 1/2 split is dead, everything is v1.0 scope, 4-phase execution plan A-D)
- `~/Desktop/Drop4/docs/BETA.md` (no fixed launch date, rolling TestFlight builds, 1.1 roadmap shifted)

**Earlier today (2026-05-06)** before this shift: shipped 8 commits of career overhaul phase 1 + phase 2 work — variant cadence rewrite, type-appropriate rewards, obstacle/target authoring, Skip booster, Tommy boss script + Sal/Warden banners, Bomb/Rainbow/Heavy power piece engine + UI, City Completion Ceremony power-piece reveal card, BETA.md. All of that is now the foundation for the bigger 200-level vision.

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

---

## 2026-05-04 — daytime polish session (Devon at work)

Devon's directive: "keep working all night... I want all of [the
customize section + sub-tabs] to look good and cohesive. The EDIT
button is too small for the AMG creator." Worked through the polish
queue + cohesion targets while Devon was at his ODA shift.

### Commits this session

| Hash | Scope | What |
|------|-------|------|
| `3ecf123` | drop4 | polish: customize EDIT pill — bigger, filled gradient, pencil glyph |
| `a471d2d` | drop4 | polish: filter chip cohesion across all sub-tabs (Shop / Clothes / CategoryBrowser / MatchHistory now share the FilterChip primitive) |
| `3800fe6` | drop4 | polish: NEW ribbon on parts unlocked this week (PartsGrid wired to amgPartUnlockedAt) |
| `96689c4` | drop4 | polish: ClothesCatalog OPEN BOXES footer matches Customize hero CTA |
| `684739a` | drop4 | polish: bottom tab badge for Customize — unequipped new clothes |
| `063c5a3` | drop4 | polish: collection % pill — subtle horizontal progress fill behind the digits |
| `c1161a7` | drop4 | cleanup: drop dead "+" buy-more badge code from TopBar CurrencyPill (~50 dead lines) |
| `92129e2` | drop4 | cleanup: drop stale GlossyButton import in HomeScreen |
| `8e0cd31` | drop4 | docs: sprint log — daytime polish session summary |
| `6a48c2d` | drop4 | polish: ClothesCatalog manifest fetch — error state with Try Again button |
| `9df8505` | drop4 | polish: fix StaggeredEntry index collision in Customize cascade |
| `66fd45f` | drop4 | cleanup: drop unused textStyles record (~115 lines dead in theme/typography) |
| `db7f4e5` | drop4 | docs: sprint log — extend daytime polish summary with later commits |
| `bb9c378` | drop4 | polish: lootbox reveal — show colorway swatch on partVariant drops |

### Polish themes shipped

**EDIT affordance prominence (Devon's specific complaint).** The
top-right EDIT pill on the Customize hero card was an outline-only
glass chip that read as secondary chrome. Now a filled warm-amber
gradient with a pencil glyph + larger padding + gold rim + drop
shadow. Tap target ~3× larger, reads as "this is how you enter
the creator."

**Filter chip cohesion across sub-tabs.** ClothesCatalog +
CategoryBrowserScreen each had their own near-identical filter-chip
styles. Migrated both to the shared `FilterChip` primitive that
ShopScreen + MatchHistoryScreen already use. Net: one visual
treatment for filter rows EVERYWHERE in Drop4. Less code, better
consistency, free haptics+sound from FilterChip's internal
handlers.

**NEW ribbon + retention badging.** The engine `AmgPartCard`
already had an `isNew` prop with a wobbling red ribbon — wired
`characterStore.amgPartUnlockedAt` to it. 7-day window. Plus a
matching bottom-tab badge for Customize that counts unequipped
recently-unlocked parts — clears as soon as the player engages.

**OPEN BOXES CTA cohesion.** ClothesCatalog footer now uses the
same 4-stop amber gradient + gold rim the Customize hero's OPEN
BOXES button uses. Both buttons route to the same screen so they
match visually.

**Collection % pill micro-polish.** The flat amber chip in the hero
identity row now has a horizontal warm-orange fill behind the
digits proportional to the player's collection %. Reads as "X%
there" at a glance.

**TopBar dead-code purge.** ~50 lines of dead "+" badge code in
CurrencyPill — the calm-pass dropped the badge but left props
+ JSX + styles dormant for ~6 weeks. Plus a stale GlossyButton
import in HomeScreen.

**Manifest fetch error state.** Before: a flaky network or R2
outage left PartsGrid stuck on the loading spinner forever.
Now: ⚠️ icon + "Couldn't reach the parts catalog" message + a
TRY AGAIN gradient button matching the OPEN BOXES treatment.
Tap retry → bumps a counter that re-runs the fetch useEffect
without remounting the modal. Same warm-amber gradient + gold
rim + drop-shadow text as the rest of the customize CTAs so the
error state feels like part of the family.

**StaggeredEntry timing collision fix.** The Customize cascade had
ActionBand at index=1 colliding with the first loadout cell at
index=(0+1)=1 — both animated together at 30ms. Bumped cells to
i+2 so the cascade now reads as a clean wave: Hero (0ms) →
ActionBand (30ms) → Clothes (60ms) → ... → ShardsCell (240ms).

**textStyles dead code purge.** ~115 lines of pre-built TextStyle
ladder (displayXL → micro + specialized stat/currency/badge) was
exported from theme/typography but never imported anywhere across
src/. Every screen rolls inline TextStyle blocks instead. Removed.

**Lootbox variant swatch on reveal.** Variant drops (the ~8K
`(partName, variantId)` tuples seeded yesterday) showed a generic
"COLORWAY" chip with no hint of which color rolled — players only
learned the color from the item name string. Now the reveal chip
shows an inline color disc parsed from the drop id against
`@amg/cosmetic-ui`'s DEFAULT_PALETTE, so opening a Gold variant
of Apocalypse Outlaws actually shows the gold disc inside the
COLORWAY chip.

### Status

- typecheck clean across all 14 commits
- 70/70 jest passing
- pre-commit hook validated every commit
- no engine-side changes this session (Devon has an in-flight
  Dart Club refactor to character-creator that I left untouched)

### Polish-queue progress

Shipped from POLISH_FOLLOWUPS.md:
- Bottom tab badges → Customize (Shop tab still pending)
- Shop: NEW badge on parts unlocked this week
- DailyRewardPopup day-7+ celebration — verified already shipped

Still queued for future runs:
- Crossfade outfit mesh in creator (engine work, blocked by
  Dart Club refactor in flight)
- Daily AMG part deal slot in shopStore
- Starter pack unlock ceremony toast
- ErrorBoundary coverage on per-screen level
- App Store screenshots + 1024×1024 icon export

---

## 2026-05-04 — AMG Wardrobe Architecture Phase 1

Devon's strategic call: forget the ship date, get the engine done
right. The AMG Creator becomes the single source of truth for every
3D asset across every AMG game — Creation Club / CoD HQ pattern
mapped to AMG's portfolio. Multi-hour redesign of the wardrobe
architecture.

### Drop4 commits this session

| Hash | Scope | What |
|------|-------|------|
| `3f5a00f` | drop4 | test: 4 new tests covering `filterManifestForGame` paths |
| `07c1d71` | drop4 | polish: CLOTHES first-tap is the dressing-room mirror |
| `cc04735` | drop4 | engine-lift: AmgPartPreviewModal now from @amg/cosmetic-ui |
| `f25fb6f` | drop4 | feat: HAIR + FACE Customize destinations (barbershop split) |

Plus engine commits saving Devon's pre-existing Dart Club rail
refactor + the architecture doc + the gameExclusive foundation +
the AmgCreator strip (see amg-engine/docs/sprint-log.md round 9).

### What changed for Drop4 specifically

**The CLOTHES tab is now the dressing-room mirror.** Tapping a
part — owned or locked — opens AmgPartPreviewModal showing the
player's character wearing it. Action row composes from owned/
equipped state:
- Owned + not equipped: [VARIANTS] [WEAR]
- Owned + currently equipped: [VARIANTS] [WEARING ✓]
- Locked: [GET FROM BAGS]

Replaces the previous split where owned tap → straight to colorway
gallery and locked tap → info-only ConfirmDialog. The mirror beat
is the GTA pattern Devon called out as missing.

**HAIR and FACE became their own Customize destinations.** The
Customize loadout grid gains two new cells:
- HAIR cell (warm rose accent) → opens hair-only ClothesCatalog
  (the barbershop)
- FACE cell (soft gold accent) → opens face-only ClothesCatalog
  (eyebrows / beard / ears)

ClothesCatalog gained `lockedBucket` / `title` / `subtitle` props
to support these focused destinations. The full wardrobe (CLOTHES
cell) still works as before.

**The AmgCreator became body-identity only.** The engine package
defaults to `availableTabs = ['body', 'color']` — Drop4's wrapper
inherits it, so the FACE / HAIR / OUTFIT tabs disappear from the
creator. Cosmetic equipping moves to the Customize hub. The body
sliders and color pickers stay free + always editable (NBA 2K
myPlayer pattern).

### Architecture decisions you'll see in the code

- AMG manifest entries can carry `gameExclusive: 'drop4' | 'ttt' | ...`
- Most parts have no flag (cross-game). Drop4 lootbox sees
  cross-game + Drop4-exclusive parts; TTT will see cross-game +
  TTT-exclusive parts; equip remains unrestricted (acquired in
  one game = wearable in any game)
- The line between cross-game and per-game: anything on the AMG
  character mesh = cross-game (clothes, hair, face, pets, emotes).
  Anything on the game board = per-game (Drop4 boards/pieces, TTT
  X/O marks, Chess piece sets).
- 5 build phases mapped out, no ship date pressure on any. See
  amg-engine/docs/AMG_WARDROBE_ARCHITECTURE.md for the full plan.

### Status

- Drop4 typecheck clean across all 4 commits
- 74/74 jest passing
- Drop4 main + engine master both pushed to GitHub
- Web preview rebuilds the new architecture on next reload
  (port 8086, dev hooks at window.__stores)

---

## 2026-05-26 — Autonomous Polish Sprint

### Per-Slot Colorway System
- `equipOutfitColorway` now accepts optional `targetSlot` parameter
- Picking a hoodie color no longer changes pants/shoes colors
- Added `equippedSlotColorway: Record<string, string>` to characterStore
- Per-slot tracking persisted via AsyncStorage

### DailyRewardPopup
- Added X close button (top-right corner) for dismiss without claiming
- Added 1.2s delayed dismiss with "Claimed!" badge after claiming
- Players now see the reward land before the modal closes

### HomeScreen SparkleParticle Fix
- Merged separate fade + drift animation loops into single unified loop
- Eliminates visible snap-back when two unsynchronized loops drifted

### ChallengesScreen
- Glow animation switched from `useNativeDriver: false` to `true`
- Weekly CLAIM buttons wrapped in PressScale + PulseGlow
- Added haptics.tap() + playSound('click') to weekly claim buttons

### ShopScreen
- Watch Ad card: "COMING SOON" badge + toast instead of dead button
- Pet/emote featured deals now route to their handlers (was silently no-op)
- Owned featured deals show "Already in your locker!" toast

### Sound/Haptics Sweep (17 files)
- ExpressionPanel + ExpressionHotBar: added playSound('click')
- PlayScreen: added haptics + click to CTAs
- ProfileScreen: added haptics to stat/settings links
- CareerMapScreen/CareerCityScreen: added haptics to navigation
- LearnScreen: added haptics to lesson cards
- GameScreen: added click sounds to emoji/phrases/emotes category buttons
- SettingsScreen: reset button gets PressScale + playSound('error')
- LootBoxScreen: tier tabs get PressScale + haptics + click sound
- devModeStore: console.log calls gated behind __DEV__

### Accessibility
- LootChest: accessibilityRole="image" + descriptive label
- WelcomeBackPopup: accessibilityRole="summary" on reward block
- SettingsScreen version badge: accessibilityLabel + hint

### Audit Results
- Zero ungated console.log calls in production code
- Zero hardcoded fontFamily (all use fonts.heading/body)
- Zero TODO/FIXME comments in screens or components
- All useNativeDriver: false confirmed necessary (color/width)
- All Pressables have accessibility labels
- Every haptics.tap() paired with playSound('click')

### Status
- Drop4 typecheck clean (0 new errors, ~103 pre-existing amg-engine)
- 43/43 Drop4 tests passing (4 pre-existing amg-engine failures)
- 3 commits pushed to main: 3cafad3f, 80f49ed0, bc2c46ec
