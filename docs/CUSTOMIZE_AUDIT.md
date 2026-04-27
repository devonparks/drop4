# Customize Tab Audit — 2026-04-26

You said "the character creator is still bad." I navigated to it and looked
honestly. This doc is the punch list — not implemented overnight because
the creator lives in the shared `@amg/character-creator` package
(`amg-engine/packages/character-creator`) and your AMG Engine CLAUDE.md
explicitly says: **"Don't over-engineer shared systems before the second
game needs them — build for Drop4, refactor for reuse when Tic Tac Toe
starts"** + **"ask before inventing architecture."** Sweeping edits to a
cross-game package overnight would violate both. Your call in the morning.

---

## What's actually broken about the creator

### 1. The 3D preview is bathed in deep red

The `SceneBackground` shader (CharacterCreator.tsx ~line 76) blends the
active tab's tint color into the bg at **18%** opacity. The BODY tab tint
is `#ff6b35` (warm coral). That makes the entire preview canvas read as
"character standing in a maroon-lit room." On FACE the room turns blue, on
HAIR it turns purple, on OUTFIT teal, on COLOR yellow. Visually loud,
distracting, and clashes with Drop4's calm-Home palette.

**Fix:** drop the blend from 18% → 4-6%. Or kill the per-tab tint entirely
and use a single calm Drop4-style atmosphere (deep navy + warm amber pool
under feet) shared across all tabs. The tabs already announce themselves
in the tab bar — the preview doesn't need to repeat the signal.

### 2. Visual hierarchy is broken

What I see top-to-bottom in BODY tab:
- Tiny grey "SPECIES" label
- Row of pill chips (Human / Goblin / Skeleton / Elves / Zombie)
- Tiny grey "BODY PRESET" label
- 4 pill chips (Slim / Curvy / Athletic / Bulky)
- Tiny grey "BODY SHAPE" label
- 3 full-width orange sliders

**Three problems:**
- Section labels are too small and too grey to read as hierarchy
- The orange ACTIVE pill (Human) fights the orange ACTIVE tab (BODY) for attention
- Sliders are uniformly neon orange → everything looks equally weighted, no eye landing

**Fix:** larger section headers (12pt → 16pt), stronger contrast (grey →
white at 70% opacity). Make the active pill use a *subtle* tint, not the
brand orange. Sliders: keep the fill but dim the inactive track.

### 3. Tabs read as config, not creation

The tab labels are emoji + word: 💪 BODY · 😊 FACE · ✂ HAIR · 👕 OUTFIT
· 🎨 COLOR. Functional but feels like settings, not a creator. Compare to
"The Sims" or "NBA 2K MyPlayer" where each tab has a hero illustration of
what you'll edit (a body silhouette, a face close-up, a hair flow, an
outfit silhouette, a color wheel).

**Fix:** Replace emoji tab icons with painted PNG icons matching the calm
Home palette — single-object hero silhouettes on dark, warm rim light. ~5
icons at GPT medium ($0.21) but only after you green-light a refactor of
this shared package.

### 4. Action row buttons are utilitarian

CANCEL · 🎲 · RESET · SAVE — the dice for randomize is a literal emoji,
the others are uppercase text on flat buttons. SAVE is bright orange with
black text.

**Fix:** match the new CareerCity HUD pattern (translucent dark navy +
thin warm-amber border + white icon). SAVE keeps a stronger amber fill to
remain the primary CTA. Randomize gets a painted dice icon at GPT medium.

### 5. No quick equip flow

The big creative-pain point: to see how an outfit looks, you have to swap
to the OUTFIT tab, scroll, tap a thumbnail, wait for the GLB to load,
then visually evaluate. Five clicks per outfit. Painful for a 152-outfit
catalog. There's no hover preview, no "browse mode," no swipe.

**Fix proposal (bigger work):** OUTFIT tab gets a horizontal scroll strip
of thumbnails ABOVE the existing grid, each ~80px wide. Swiping the strip
auto-equips the previewed outfit. The grid below stays for explicit
purchase + favorite. This is real product work, ~2 hours, but it's the
single biggest joy unlock for the creator.

### 6. Saved/Cancel visibility is unclear

Cancel and Save look similar weight. When you're 5 tabs deep changing 30
things, you can't tell at a glance "if I tap Cancel right now, I lose all
this." There's no dirty-state indicator (no asterisk, no glow, no "Unsaved
changes" pill).

**Fix:** track a `isDirty` boolean (state !== initial). When dirty, SAVE
gets a subtle pulse + "Unsaved changes" caption. CANCEL changes label to
"Discard 12 changes" or similar. Standard premium-app pattern.

### 7. Stage platform on Customize dashboard is mismatched

Before you even hit the creator: the Customize tab dashboard
(`CustomizeScreen.tsx`) shows the 3D character on a glossy gold octagonal
disc (the `home-platform.png` asset, regenerated tonight). On the calm
dark bg, the disc reads as a hard-edged glossy plate that fights the
painterly atmosphere. The bg-profile spotlight already gives the character
a stage; the disc is redundant.

**Fix:** drop the disc from CustomizeScreen, let the painted bg-profile
amber pool be the ground cue (matches what Home does). One file edit.

### 8. The 9-card grid icons don't match Drop4's calm palette

The `CATEGORIES` map in CustomizeScreen.tsx uses old Flux-painted shop-tab
icons (orange shirt for CHARACTER + CLOTHES, hanger for OUTFITS, dog
for PETS, etc.). The CHARACTER and CLOTHES cards share the same orange
shirt icon — confusing, since CHARACTER goes to the editor and CLOTHES
goes to the AMG parts shop tab.

**Fix:** regen the 10 category icons via GPT medium with the calm brief
(~$0.42) once you approve the customize redesign direction.

---

## What I did NOT do

- Did not edit `@amg/character-creator` source. Cross-game package; needs
  your "go" before invasive refactor.
- Did not regen any creator-facing art. Speculative until the redesign
  direction is approved.
- Did not touch the customize dashboard's stage disc. One-line fix but
  flagged it here for you to greenlight.

---

## Recommended priority order if/when you call "go"

1. **Customize dashboard polish** (Drop4-only, no shared package risk):
   drop the gold disc under the character (item #7 above). 5 min.
2. **Creator scene tint reduction** (shared package, low-risk visual): drop
   the per-tab shader blend from 18% → 5%. 1 file, 2-line change.
3. **Section header / hierarchy refresh** in tabs (shared package, medium
   visual): bigger headers, dimmer inactive sliders. 5 files, ~40 lines.
4. **Action row recolor** to match calm HUD pattern (shared package, low
   risk): unified dark+amber button style for CANCEL/RESET/SAVE.
5. **Quick equip swipe strip in OUTFIT tab** (shared package, real
   product work): biggest joy unlock, biggest scope. ~2 hours.
6. **Dirty-state indicator on SAVE** (shared package, small): "Unsaved
   changes" pill + pulse glow when state !== initial. 1 hour.
7. **Regen tab icons + category icons via GPT** (~$0.63 total): only after
   the visual direction is locked.

Items 1-4 are 1-2 hours of code and won't change creator structure. Items
5-7 are bigger product moves and worth a real conversation.

---

## What's the simplest morning move?

Pick **#1** (drop the gold disc on Customize dashboard) and **#2** (reduce
creator tint blend to 5%) as a no-risk warmup. That's 10 min of work, no
art spend, and it'll signal whether the calmer direction is what you
want before we touch the bigger items.

Or skip Customize entirely for now and prioritize Career mechanics — your
phase 4 — once you're sure foundation + Customize visuals are good
*enough* to ship.
