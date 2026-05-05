# Customize Tab — Full Audit + Art Review (2026-05-05)

Devon: "i need you to test and audit the full customization tab with ALL the
sub tabs. and test everything and do a art audit"

Walked every cell + every sub-tab in the Customize flow. Took a screenshot
of each surface. Below: per-surface grade, what's working, what's broken,
art issues separate from UX issues.

---

## Surface inventory

| # | Surface | Grade | One-line |
|---|---|---|---|
| 1  | Customize hero card (identity + character + equipped chips + EDIT) | **A** | Tight, premium feel; XP bar + collection % chip + pulsing "TAP TO PREVIEW" |
| 2  | Customize loadout grid (10 cells: CLOTHES/HAIR/FACE/EMOTES/PETS/PIECES/BOARDS/EFFECTS/WINS/SHARDS) | **A−** | Each cell has count + progress bar (animated). 5 rows scroll on a 390 phone — by design |
| 3  | CLOTHES catalog · PARTS mode | **A−** | Slot/sub-cat hierarchy reads clean. EQUIPPED/NEW/OWNED chips work |
| 3b | CLOTHES catalog · PACKS mode | **A−** | Painted pack covers, rarity-coded backdrops, IN BAGS chip |
| 4  | HAIR catalog (locked-bucket destination) | **B** | Visual differentiation between hair variants is weak — same head, similar hair |
| 5  | **FACE catalog (locked-bucket destination)** | **B−** | **Demo-killer.** All 9 visible face thumbnails look identical at 96×120. Variant chips are the only differentiator |
| 6  | EMOTES picker · EMOTES tab | **A−** | Painted mascot icons clearly differentiate emotes (Dab guy, Twist guy, etc.) |
| 6b | EMOTES picker · IDLES tab | **A−** | Blue-figurine pose icons read cleanly across the 6 idles |
| 7  | PETS browser | **A−** | Beautiful breed icons, clear rarity stripes, Husky equipped state pops |
| 8  | PIECES browser | **A** | Disc-pair previews are gorgeous and instantly differentiated by color combo |
| 9  | BOARDS browser | **A** | Mini-board previews + rarity stripes (gold for Legendary, etc.) — best surface |
| 10 | DROP EFFECTS browser | **A−** | Single-color circle swatch per effect, rarity stripes |
| 10b | WIN ANIMATIONS browser | **A−** | Same swatch language; Mythic tier (Black Hole) looks epic |
| 11 | SHARD SHOP | **A−** | "How shards work" 3-step + tier strip + affordable-aware NEED N pills |
| 12 | AmgCreator · BODY tab | **A−** | LOOKS strip (Casual/Athletic/Tactical/Samurai painted figures) + SPECIES + BODY PRESET |
| 12b | AmgCreator · COLOR tab | **A−** | Multi-tone skin swatches (SKIN 01/02/03), 41 species variants |
| 13 | Dressing-room mirror · LOCKED path | **A−** | Slot label overrides ("BROWS" not "BROW L"), face-zoomed camera, [CANCEL][GET FROM BAGS] |
| 13b | Dressing-room mirror · OWNED path | **A−** | [CANCEL][VARIANTS][WEAR] composition (audited prior session) |

**Overall: A−.** The flow is solid end-to-end. The one structural issue is the
FACE catalog's identical-thumbnails problem — and that's an art-pipeline
issue, not code.

---

## Cross-surface UX issues found

### Issue UX-1 — Redundant "NOW EQUIPPED" banners on every CategoryBrowser

**Where:** PETS, PIECES, BOARDS, EFFECTS (when something equipped), WINS

**What:** Every CategoryBrowser screen has a ~70px banner near the top showing
"NOW EQUIPPED [item name] [rarity chip]." Same redundant pattern Devon
already flagged on the catalog (which I removed in `6d2d945`). The equipped
item is already signaled at the card level (gold border + EQUIPPED chip on
the matching card), so the banner is double-counting.

**Fix:** Remove the banner from CategoryBrowserScreen.tsx. Reclaims ~70 px
on every Pets/Pieces/Boards/Effects/Wins browse — same logic as the catalog
removal. Brings consistency to the customization flow.

**Estimated impact:** Smaller than the catalog change because each browse
already shows fewer cards, but still ~70 px back per surface. 5 surfaces ×
70 px = significant cumulative visual weight removed.

### Issue UX-2 — FACE/HAIR catalogs only show ONE pack's variants prominently

**Where:** HAIR catalog, FACE catalog

**What:** Player has 108 hair variants and 381 face variants total per the
loadout cells, but only ~9 visible from a single pack (Apocalypse Outlaws)
near the top. Other packs (Modern Civilians, Fantasy Knights, etc.) are
buried below scroll. The owned-first sort places the player's owned items
at the top — but the player's owned face items are STARTER pack which is
hidden by `isStarterPack` filter.

**So:** the player sees "0 owned" face items even though they have 3
equipped — because their 3 equipped face items are starter parts that
the catalog filters out.

**Fix:** Either (a) include starter parts in the catalog with a "starter"
chip so players can see what they own, or (b) show pack rotation/grouping
header rows so the catalog scans like a shop, not a flat list.

**Estimated impact:** Real player confusion right now. Player thinks they
own nothing in FACE because the 3 they own are hidden.

### Issue UX-3 — ~250 px of warm-amber bleed below loadout grid

**Where:** Customize tab below the loadout grid

**What:** The 10-cell grid + hero + action band fills about 70% of the
phone. Below is ~250 px of empty space where the screen background's warm
orb halo bleeds through. Audit Fix 7 trimmed `paddingBottom` 20→12 but the
real issue is content underflow, not padding.

**Fix options:**
- **Today:** Add a bottom CTA card that takes up the dead space, e.g.
  "BROWSE SHOP" or "COMPLETE COLLECTION (35%)" — turns dead space into
  another reward funnel.
- **Defer:** Switch grid from 2 cols × 5 rows to 3 cols × 4 rows so the
  grid is denser (audit Fix 6 deferred). Cells get tighter but full grid
  fits without scroll AND there's less dead space.

### Issue UX-4 — Pack name truncation on cards

**Where:** Every AmgPartCard (CLOTHES/HAIR/FACE catalogs)

**What:** "Apocalypse Outla..." is hard-truncated. The full name "Apocalypse
Outlaws" doesn't fit in a compact 96 px card. Fine in isolation, but every
card has the same prefix so the truncation is uniform across the screen.

**Fix:** Either (a) shorten pack labels in `packMeta` so "Apocalypse Outlaws"
becomes "Apoc Outlaws" or "AO" for compact cards, or (b) fade the truncation
edge so it's softer than a hard ellipsis.

**Estimated impact:** Minor — players adapt — but premium feel takes a hit.

### Issue UX-5 — AmgCreator dice button has no label

**Where:** AmgCreator action bar (between CANCEL and RESET)

**What:** A small dice glyph (🎲) sits between CANCEL and RESET buttons. No
label. Probably "randomize" but a first-time player wouldn't know.

**Fix:** Either label it ("RANDOM") or add an `accessibilityHint`. Visual
label is better — three-button-row ⟶ four-button-row layout.

---

## Art audit issues

These are asset/render-pipeline issues, not code issues. They need Unity
batch re-renders or fal.ai gen passes to fix.

### Art-1 — FACE thumbnails are visually identical

**Severity:** 🔴 Critical (the demo-killer)

**Where:** FACE catalog (Surface 5)

**What:** The 9 visible cards (BROWS #01–#03, EARS #01–#03, BEARD #01–#03)
all show the SAME painted character head with brows/ears/beard. The
variant numbers (#01–#03) and slot labels (BROWS/EARS/BEARD) are the only
differentiators. Players genuinely can't tell BROW #01 from BROW #02 at
thumbnail size.

**Root cause:** Unity face parts are rendered with the standard full-body
camera. At 96×120 px the face occupies ~10% of the thumbnail. Differences
between brow shapes/colors are sub-pixel.

**Fix:** Re-render every face part with a head-zoomed camera in Unity. New
`Drop4FacePartExporter` script that crops to head + neck and renders each
brow/ear/beard variant with a head silhouette overlay. ~500 PNGs total
(≈30 face parts × ~17 packs).

**Estimated cost:** Unity batch run + R2 upload, probably <30 min total
machine time. Devon's call.

**Workaround until shipped:** The variant chip prominence (audit Fix 2,
shipped engine `0815aa6`) and paired-slot collapse (audit Fix 5, shipped
engine `905f069`) both reduce the impact — players see fewer cards and
the variant chip is the prominent differentiator. Grade B− with these
mitigations; A after re-render.

### Art-2 — HAIR thumbnails are full-body when they should be head-zoomed

**Severity:** 🟡 Moderate

**Where:** HAIR catalog (Surface 4)

**What:** Same root cause as Art-1 but lower severity because hair
silhouettes are larger and more distinctive than brows/ears. Still, the
hair occupies ~25% of the thumbnail when it could occupy 60% with a
head-zoomed crop.

**Fix:** Re-render in the same Unity batch as Art-1. Marginal cost.

### Art-3 — Pack identity could use crests/badges

**Severity:** 🟢 Minor

**Where:** Every catalog card

**What:** Pack identity is conveyed by (a) rarity color, (b) text label
("Apocalypse Outlaws"). The text truncates. A small painted crest/badge
in the card corner — same way armor patches identify factions — would
read as pack identity at a glance without text.

**Fix:** fal.ai gen pass — one badge per pack × ~17 packs = ~17 small
painted icons. Could be done in a separate session.

### Art-4 — All Apocalypse Outlaws clothing has an EQUIPPED state in the catalog

**Severity:** 🟢 Minor (data, not art)

**Where:** CLOTHES PARTS mode (Surface 3)

**What:** Player wearing Apocalypse Outlaws 03 shows ALL torso/arms/legs
parts with the gold EQUIPPED border. Visually dominant — every visible
card has the gold treatment. Looks like the entire grid is "yours" until
you scroll past the player's pack.

**Not really a fix** — this is correct behavior for someone wearing a
full pack. Could be tuned by sorting equipped-pack-first then by-rarity,
which already happens.

### Art-5 — None effect (Common rarity) feels off

**Severity:** 🟢 Minor

**Where:** DROP EFFECTS browser (Surface 10)

**What:** "None" is shown as a Common-rarity OWNED item. Functionally it
means "no effect" but appearing in the rarity tier list as Common feels
weird — it's not a "common rarity item," it's the absence of a choice.

**Fix:** Either give "None" a special "Default" tag (no rarity) or hide
it entirely and have the absence of equipped effect implicitly mean
None. Low priority.

---

## What's working extraordinarily well

These are surfaces I'd hold up as the AAA bar for the rest of the app:

1. **PIECES browser (A):** disc-pair previews are gorgeous. Every piece
   feels distinctly itself — Classic (red/yellow), Chrome (silver), Fire &
   Ice (red/blue), Neon (purple/green). The visual language IS the card.
2. **BOARDS browser (A):** mini-board previews show actual gameplay
   surface. Rarity stripes at the top tier the cards. Gold Court's gold
   stripe immediately reads "this is the legendary one."
3. **EMOTES picker:** painted mascot icons (Dab guy, Twist guy, Slick
   Spin guy) make every emote instantly recognizable without needing
   variant numbers.
4. **Dressing-room mirror with face camera (Fix 3 shipped):** when you
   tap a brow/ear/beard, the modal zooms to head — face-detail visible.
   This is how the FACE catalog SHOULD feel once Art-1 ships.
5. **AmgPartCard ✓ OWNED + EPIC dual-state footer:** owned cards keep
   rarity AND show ownership in the same compact footer. Easy to scan a
   long catalog and see "I own all the commons, the epics are still
   locked."

---

## Today-shippable follow-ups

In priority order:

1. **UX-1: Remove NOW EQUIPPED banner from CategoryBrowserScreen** — same
   logic as the catalog removal Devon already approved. Touches Pets,
   Pieces, Boards, Effects, Wins. Reclaims ~70 px × 5 surfaces.
2. **UX-2: Stop hiding starter parts from FACE/HAIR catalog** OR add an
   "Owned" filter chip that shows starter items with a Starter tag. Player
   confusion right now ("FACE 3/381" but I see no owned cards).
3. **UX-5: Label or hint the AmgCreator dice button.**
4. **UX-3: Decide:** add a bottom CTA card OR switch to 3-col grid OR
   accept the dead space.
5. **UX-4 / Art-3: pack name truncation softening or fal.ai pack badges.**

---

## Deferred to art batch

| Issue | Cost | Devon's call |
|---|---|---|
| Art-1: Re-render FACE parts head-zoomed | Unity batch ~30 min + R2 upload | When ready |
| Art-2: Re-render HAIR head-zoomed | Same batch | When ready |
| Art-3: Pack identity crests | fal.ai gen ~17 icons | Separate session |

---

## Final grades by axis

- **Architecture:** A — Phase 1 wardrobe shipped, every game inherits cleanly
- **Visual identity:** A− — warm amber + rarity-colored language is consistent across every surface
- **Information hierarchy:** A− at the catalog level, A at the browser level
- **Face-bucket browsing:** B− today → A after Unity re-render
- **Visual differentiation between items:** A for pieces/boards/emotes/pets/effects/wins, B for hair/face (art-blocked)
- **Hero card / loadout grid:** A — XP bar, progress bars, dynamic CTA, pulsing hint, breathing spotlight all firing
- **Catalog cards:** A− with shipped 9-round polish (locked dim + lock badge, EPIC ✓ OWNED footer, NEW ribbons, EQUIPPED gold borders)
- **Dressing-room mirror:** A− with shipped paired-slot collapse + face camera

**Headline finding:** The customization flow is in extraordinary shape across
the board. The two open issues that matter for ship are (1) remove the
duplicate NOW EQUIPPED banners from CategoryBrowser for consistency with
the catalog, and (2) re-render FACE parts head-zoomed so the demo-killer
becomes a demo-shower. Everything else is iteration polish.
