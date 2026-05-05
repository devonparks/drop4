# Customize + Shop Visual Audit — 2026-05-05 (PM, post-hero-card-pass)

Devon: "take a screenshot. actually do a whole visual audit of
customization and shop"

Audit done by Claude with browser MCP screenshots of running web preview
on `localhost:8086`. PhoneFrame at 390×844, web only.

---

## Summary

The morning's polish wins (hero card identity rows / level chip / XP
bar / catalog UNLOCKABLE / shard balance / etc.) all landed
correctly. The Customize hero card now has the right STRUCTURE.
What it doesn't have yet is enough VISUAL CONTRAST against the dark
UI — the character literally disappears into the background when
the player wears dark clothes (which is most of the Sidekick library).

Two critical issues. Two medium. A handful of micro nits.

---

## 🔴 Critical

### C-1: Character invisible against dark hero card BG

**Observation:** Default character (Civilian Male in Skeletons 05 dark
outfit) reads as a black silhouette with barely-visible head. The
amber halo is too subtle to lift it; the navy hero card BG eats the
costume color; the three-point lighting in `Character3DPortrait` is
overall low-key.

**Root causes:**
1. Hero card BG `rgba(10,14,32,0.6)` is essentially the same value as
   the dark Sidekick outfits — no contrast.
2. `charGlow` opacity 0.16 is too low; the halo sits behind the
   character but doesn't make the silhouette pop.
3. `Character3DPortrait` ambient is `#c0ccf0` @ 0.55 (cool blue) —
   pulls outfits toward navy in shadow, blending with BG.

**Fix options (pick 1-2):**
- A. **Lift the stage zone** — paint a lighter, warmer rectangle
  behind ONLY the character stage (not the whole card). Like a
  museum vitrine — bright spotlit zone vs. darker frame.
- B. **Bigger amber halo (300 → 360 px) + 0.16 → 0.28 opacity** with
  a radial fade (see C-2).
- C. **Rim light on the 3D character** — boost the warm rim
  directional light intensity 1.4 → 1.8, push position more
  behind/above for a true rim. Adds outline glow that pops the
  silhouette regardless of outfit color.
- D. **Per-screen lighting profile** — Customize gets a brighter
  preset than Home/Matchup, where the painted scene already supplies
  contrast.

**Recommended:** A + B + C combined. Cheap, additive, big lift.

---

### C-2: Halo reads as a hard disc, not a soft spotlight

**Observation:** The single `charGlow` circle (300 px @ 0.16 opacity)
has a visible round edge in the screenshot. Devon flagged this
explicitly: "it has 2 overlapping circles" — I removed one in
commit `d59a76d`, but the remaining one is still a hard fill
because RN's `View` with `borderRadius` produces a solid disc, not
a radial gradient.

**Fix:** Two paths:
- **Cheap:** Use `shadowColor` + huge `shadowRadius` on a transparent
  view. The shadow IS a soft radial gradient. No additional asset
  needed.
- **Proper:** Use `react-native-svg` `<RadialGradient>` for a true
  radial. Requires a tiny new dep but gives photo-quality fade.

**Recommended:** Cheap path — change `charGlow` to a 0-opacity view
with a strong colored shadow. Result reads as an organic glow with
no hard edge.

---

## 🟡 Medium

### M-1: Level chip cramped at 38 px min width

**Observation:** "1 LVL" chip at right of identity row looks pinched
when level is 1 digit. Single-digit numbers float in a too-tight
box.

**Fix:** Bump `minWidth: 38 → 44`, add 2 px more horizontal padding,
or make it width:auto with comfortable padding. Should feel less
cramped without dominating.

---

### M-2: XP bar reads as empty/deflating for new players

**Observation:** `0 / 100 XP` with an empty bar is the first thing a
new player sees. It says "you have nothing." Even the gradient fill
is invisible because `width: 0%` collapses it.

**Fix:** Two options:
- A. Show a "starting at level 1" hint when xp=0 instead of the empty
  bar — e.g. "🌟 Earn coins to level up"
- B. Pre-fill 5 % of the bar at xp=0 so the player sees the trough
  has a starting position (used in NBA 2K MyCareer when stats are
  zero). Just needs a `Math.max(5, ...)` floor on the width calc.

**Recommended:** B. One-line code change, sells "the bar is alive."

---

### M-3: Equipped dots row only shows 3 of 7 cosmetic types

**Observation:** Hero card bottom row shows `BOARD / PIECES / PET`
only. Player has 7+ cosmetic categories equipped (clothes, hair,
emotes, drops, wins, frames, board, pieces, pet). The dots row
under-represents the player's loadout.

**Fix:** Either:
- A. Add `EFFECTS / WINS` dots when equipped (more representative)
- B. Convert dots to a tappable scrollable strip showing every
  equipped slot
- C. Drop the row entirely and let the loadout grid (below)
  carry the equipped state — currently it duplicates info.

**Recommended:** A. Adds 2 more dots without a layout overhaul.

---

## 🟢 Minor / Polish

### P-1: Shop daily deal cards have first-letter clipping

**Observation:** Gold Box / Diamond Box / Outfits Box / Pets Box etc.
in the LootBox tier list show "old Box / iamond Box / utfits Box"
in screenshots. Either icon overlap or actual clipping.

**Status:** Need to verify in-app — could be a screenshot artifact
from PhoneFrame border-radius clipping.

---

### P-2: Sparkle field is very subtle at default opacity

**Observation:** The 6 ambient sparkles in the hero card are nearly
invisible against the dark BG. Could be brighter / a bit larger to
feel like a real "alive premium display" vibe.

**Fix:** Bump particle opacity 0.5 → 0.75, particle size 3 → 4 px,
or add a glow halo per particle.

---

### P-3: Stage feels "tall" — hero card aspect ratio

**Observation:** With 320 px stage + identity rows + xp + equipped
dots + paddings, the hero card is now ~440 px tall. Consumes ~52 %
of an 844 px viewport before the action band even appears. Player
must scroll to see OPEN BOXES + loadout grid.

**Fix options:**
- Trim stage 320 → 280 (give back some room)
- Trim hero card padding top/bottom 10 → 6
- Move equipped dots into the stage as floating chips (overlay)
- Move the action band ABOVE the loadout grid into the hero card

**Recommended:** Hold for now — Devon explicitly asked for bigger
character. The viewport scroll is acceptable since the screen is
in a ScrollView.

---

## What's working well (don't touch)

- Identity row split into 2 rows reads clean — name dominates as
  hero, title + collection is meta. ✓
- Level chip vertical stack (number + LVL caption) feels like a
  badge, not stray text. ✓
- XP bar gradient fill (#ffce63 → #ff9a2c) is the right warm tone. ✓
- Hero card border + 0.35 amber shadow gives a premium frame
  feel. ✓
- Top-edge gloss line (32 px) sells "lit from above." ✓
- Catalog screens (CategoryBrowser / ShardShop) are in great shape
  from morning batch — UNLOCKABLE state, ready dot, OPEN BOXES CTA,
  Owned/Locked filter all landed. ✓
- Shop daily deal cards have proper painted icons (PACK_ICON /
  EMOTE_ICON), pulse badges, dynamic prices. ✓

---

## Punch list (priority order)

1. 🔴 **C-2** Halo hard-edge → shadow-based radial (1 line change)
2. 🔴 **C-1** Character contrast against BG (rim light boost +
   stage-zone backdrop)
3. 🟡 **M-2** XP bar 5 % minimum fill (1 line change)
4. 🟡 **M-1** Level chip min-width 38 → 44
5. 🟡 **M-3** Add EFFECTS + WINS to equipped dots row
6. 🟢 **P-2** Sparkle opacity bump
7. 🟢 **P-1** Verify Shop tier-list clipping isn't a real bug

---

## Screenshots reference

Saved via Claude in Chrome MCP this session. Captured at 1568×778
(scaled from actual 2048×1017 viewport with 390×844 PhoneFrame
centered at page x=829-1219).

- `ss_2255ebqd1` — Customize hero card top (identity + XP + character)
- `ss_3337tyogn` — Customize mid-scroll (character feet + EQUIPPED row + OPEN 5 BOXES)
- `ss_0052u0clt` — Customize loadout grid (10 cells × 2 cols)
- `ss_5228o65j2` — Shop tier list (Gold/Diamond/Outfits/Pets/Boards/Pieces/Emotes Box)
- `ss_6626imgj5` — Shop daily deals (Watch Ad + Pirates · #01)

The morning's UNLOCKABLE / N UNLOCKABLE / ready dot / MAX pill /
shard balance / empty CTA work all needs in-app verification by
playing through CategoryBrowser → tap a locked card with shards
on hand. Scope outside this audit's screenshot reach.
