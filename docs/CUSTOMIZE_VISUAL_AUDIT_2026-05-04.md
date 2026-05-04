# Customize / Wardrobe Visual Audit — 2026-05-04

Post-Phase-1-architecture pass. Devon: "It looks visually way better,
it's just confusing in places — for example BROW L says the slot
but the pack name underneath is small, and one brow looks like
another. We need new pictures 100% but do a visual audit first."

This doc inventories every customize-flow surface, grades it, and
identifies fixes split into:
- **Today-shippable** (no new art needed)
- **Needs new art** (Unity render passes / fal.ai gen)

---

## Surface inventory + grades

| # | Surface | Grade | Headline |
|---|---|---|---|
| 1 | Customize hero card (identity row, character stage, EDIT pill, equipped row) | **A** | Reads cleanly. EDIT pill upgrade lands. Equipped dots differentiate categories. |
| 2 | Customize loadout grid (10 cells: CLOTHES/HAIR/FACE/EMOTES/PETS/PIECES/BOARDS/EFFECTS/WINS/SHARDS) | **A−** | Cell visuals strong. Grid grew to 5 rows; needs scroll on 390px phone — acceptable but could tighten with 3-col layout. |
| 3 | CLOTHES catalog (full wardrobe) | **B+** | Grid + filters + sub-cats works. NEW ribbons + OWNED chips are great. Variant index hard to read at glance. |
| 4 | HAIR catalog (locked bucket) | **B** | Right title + sub-cats. Hair thumbnails differentiate well (visible silhouettes). |
| 5 | **FACE catalog (locked bucket)** | **C+** | **Worst surface in the audit.** All face thumbnails look identical at 96×120 — same painted character face, the actual part is too small to see. Devon's specific complaint. |
| 6 | Dressing-room mirror (locked path) | **A−** | Modal opens cleanly. 3D character rotates. Action row [CANCEL][GET FROM BAGS] reads as expected. For body parts the character is well-framed. |
| 7 | Dressing-room mirror (owned path) | **A−** | [CANCEL][VARIANTS][WEAR] composition is strong. WEAR is the warm amber CTA, VARIANTS is the purple secondary — clean visual hierarchy. |
| 8 | Dressing-room mirror (FACE context — BROW L, BEARD, EAR L) | **B−** | Modal opens but character is full-body shot — the FACE part you're previewing is tiny on the head. Needs camera-zoom for FACE/HAIR slots. |
| 9 | AmgCreator BODY tab | **A−** | Body-only strip lands cleanly. LOOKS / SPECIES / BODY PRESET sections read well. |
| 10 | AmgCreator COLOR tab | **A−** | Skin tone palettes display cleanly. SKIN 01 / SKIN 02 / SKIN 03 progressive disclosure works. |

---

## Today-shippable fixes (no new art)

### Fix 1 — Accessibility labels include slot

**Problem.** Every face-bucket card has the IDENTICAL screen-reader
label "Buy Apocalypse Outlaws 01 for 1000 coins" — a screen-reader
user has no way to differentiate BROW L from EAR R from BEARD.
Engine `AmgPartCard` builds the label without including the slot.

**Fix.** Update `AmgPartCard` accessibilityLabel to:
```
"Buy {SLOT} from {pack name} {variant} for {price} coins"
```
Resulting in:
```
"Buy BROW L from Apocalypse Outlaws 01 for 1000 coins"
"Buy BEARD from Apocalypse Outlaws 01 for 1000 coins"
```
One-line change in `@amg/cosmetic-ui/components/AmgPartCard.tsx`.

### Fix 2 — Variant number prominence on cards

**Problem.** The "·01" / "·02" / "·03" variant index is the ONLY
differentiator at thumbnail scale for face parts (since the actual
brow/ear/beard render is too small). Currently fontSize 9, weight
700, letterSpacing 0.5 — easy to miss.

**Fix.** Bump the variantNumber to fontSize 13, weight 900, brand
amber color. Maybe also right-align in its own pill. Variant index
becomes readable at a glance — players can tell BROW L variant 01
from BROW L variant 02 just from the chip.

### Fix 3 — Camera zoom for FACE/HAIR in the dressing-room mirror

**Problem.** The mirror character preview is a fixed body shot. For
TORSO/PANTS that's correct. For FACE (BROW, EAR, BEARD) and HAIR,
the previewed PART is a tiny detail on the head — players see "I
clicked a brow" but can barely see the brow on the model.

**Fix.** Engine modal accepts a `slot` parameter in
`renderCharacterPreview(swapped, { width, height, slot })`. Drop4's
wrapper branches: when slot is in `{Hair, EyebrowLeft, EyebrowRight,
EarLeft, EarRight, FacialHair, Nose}`, mount Character3DPortrait
with a face-zoomed camera preset. AmgCreator already has
`CAMERA_POSES.face` defined; reuse those values.

### Fix 4 — Card label hierarchy: SLOT > VARIANT > PACK

**Problem.** Current card label order:
1. Big SLOT label ("BROW L")
2. Small pack identity strip ("Modern Civilians · 01")
3. Small footer (rarity + price)

Devon's complaint: pack name is small, and within a pack, the
variant number is the differentiator but it's harder to read than
the pack name.

**Fix.** Re-rank in code:
1. SLOT (unchanged — big label)
2. **VARIANT** (bumped per Fix 2 — bigger, brand-colored)
3. Pack name (subtler — it's context, not identity)
4. Footer rarity + price

The card now reads SLOT → VARIANT first; pack is the supporting
context. Fixes Devon's "what makes this brow different from that
brow" mental model.

### Fix 5 — Paired-slot pre-collapse for FACE

**Problem.** FACE bucket shows BROW L and BROW R as two cards. EAR
L and EAR R as two cards. Functionally these are paired — players
always equip both at once because brows / ears are mirror pairs.
6 brows × 2 sides = 12 brow cards when really there are only 6
brow STYLES.

**Fix.** In FACE-bucket-locked mode, group paired slots: show one
"BROWS" card per style (representing both BROW L + BROW R). Tap
equips both. Same for EARS. The card count drops 50% in FACE.

This is a small data-grouping change (12 cards → 6) — significant
UX improvement without touching art.

### Fix 6 — Customize grid 5-row scroll mitigation

**Problem.** The grid grew from 8 cells to 10 with HAIR + FACE.
On a 390×844 phone, only 3 rows are visible at once — players
must scroll to reach BOARDS / EFFECTS / WINS / SHARDS.

**Fix.** Switch the grid from 2 cols × 5 rows to 3 cols × 4 rows.
Each cell width drops from 48.5% to ~31.5%, height stays same.
12 cells fit on screen without scroll. Cells become a touch tighter
but the icon + label + count + chevron format adapts cleanly.

OR: keep 2 cols × 5 rows and accept the scroll. The hero card +
action band + 3 rows of grid is already ~85% of the phone vertical
budget; the trade is real.

### Fix 7 — Bottom padding tightening

**Problem.** ~250px of empty floor below the loadout grid in
Customize. Players see warm-amber emptiness where they expect
content.

**Fix.** Tighten `scrollWrap` paddingBottom and / or remove the
oversized contentContainerStyle padding that's causing the floor.

---

## What needs new art (deferred to render passes)

### Art issue 1 — FACE bucket parts are visually identical

**The actual problem.** Unity renders for face parts use the same
camera framing as full-body / torso parts. A 96×120 thumbnail of
the entire character barely shows the eyebrow / ear / beard that
the card represents. Six cards = six near-identical paintings.

**The fix.** Re-render face parts with **face-zoomed camera**:
- Crop to head + neck (not full body)
- Centered framing on the face
- Light contrast against background to make brows / beard pop
- Maybe a subtle highlight glow on the previewed part vs the rest
  of the face

This is a Unity export pass via `Drop4ColorwayExporter` (or a
new `Drop4FacePartExporter`) — render every face slot with the
zoomed camera + the same colorway logic.

**Estimated content cost.** ~30 face parts per pack × ~17 packs =
~500 PNGs. Unity batch run, probably <30 minutes total.

### Art issue 2 — HAIR thumbnails could be tighter too

Hair thumbnails read better than face (the silhouette is
distinctive) but they currently include the full body. A
head-and-shoulders crop would give 2× the visual real estate to
the actual hair style.

Lower priority than face but worth doing in the same Unity batch.

### Art issue 3 — Pack identity badges / icons

When Devon says "the pack name underneath is small," part of the
fix is the bigger variant chip (above), but the OTHER part is
that pack identity could be reinforced with a small painted
**pack badge** in the corner of every card. The card chrome
already implies the pack via the rarity color, but a tiny painted
"Apocalypse Outlaws crest" badge would be a more legible identity
signal than a text strip.

This is a fal.ai gen pass — one badge per pack × ~17 packs =
~17 small painted icons. Quick generate, then ship.

---

## Suggested sequence

1. **Today (no art needed) — SHIPPED 2026-05-04:**
   - ✅ Fix 1 (accessibility labels) — engine commit 0815aa6
   - ✅ Fix 2 (variant prominence) — engine commit 0815aa6
   - ✅ Fix 4 (card label hierarchy) — engine commit 0815aa6
   - ⏸️  Fix 6 (3-col grid) — deferred (audit noted trade is real;
     2-col with scroll is acceptable until LoadoutCell density
     pressure forces the issue)
   - ✅ Fix 7 (padding tightening) — Drop4 commit a0fe5d7

2. **Soon (no art needed, slightly bigger) — SHIPPED 2026-05-04:**
   - ✅ Fix 3 (camera zoom for FACE/HAIR mirror) — engine 5eb8ca8 +
     Drop4 4e90fc1 (CAMERA_PRESETS body/face on Character3DPortrait,
     slot-aware preset selection in dressing-room mirror wrapper)
   - ✅ Fix 5 (paired-slot collapse for FACE) — engine 905f069 +
     Drop4 a0fe5d7 (slotLabelOverride on AmgPartCard +
     AmgPartPreviewModal, partsInBucket filter drops right-side
     mates, onEquip dual-equips by name substitution)

3. **Unity batch (Devon's call when to run):**
   - Re-render face parts with head-zoomed camera
   - Tighter hair part renders

4. **fal.ai pass (separate session):**
   - Pack identity badges for each of the ~17 packs

---

## Grade summary

- **Architecture:** A (Phase 1 working correctly, every game inherits cleanly)
- **Visual identity:** A− (warm amber + gold rim language is consistent)
- **Information hierarchy at the card level:** B (Fix 2 + Fix 4 push to A−)
- **Face-bucket-specific browsing:** C+ today → **B+ post Fix 1+2+3+5 (SHIPPED)** → A post Unity re-render

The audit's headline finding: **almost everything works, but the
FACE bucket is the demo killer.** Fix 1 + 2 + 3 + 5 today get it
to "good" (✅ shipped 2026-05-04); the Unity re-render gets it
to "great." Hair, body
clothes, and accessories are already in good shape.
