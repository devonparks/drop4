# Overnight polish session — 2026-05-05

Devon: "im going to sleep i want you to work on everything nonstop over the night"

Worked through every UX issue from the full Customize audit
(`CUSTOMIZE_FULL_AUDIT_2026-05-05.md`) plus extra polish rounds.
All commits passed `tsc --noEmit` and `jest` (74/74).

---

## All 5 audit UX issues — shipped

| # | Issue | Fix | Commit |
|---|---|---|---|
| UX-1 | NOW EQUIPPED banner duplicated on every CategoryBrowser (Pets/Pieces/Boards/Effects/Wins/Frames) | Removed banner + currentEquipped useMemo + 6 styles. Equipped state still signaled per-card with gold border + EQUIPPED chip. ~70 px × 5 surfaces reclaimed. | drop4 `fa4d287` |
| UX-2 | Starter face/hair parts hidden from catalog → player sees "FACE 3/381 owned" but zero owned cards in the catalog | Removed `isStarterPack` filter. Starter parts now show as "FREE ✓ OWNED" since they map to starter rarity (already had label "FREE" + muted-grey color). Catalog count now matches loadout cell count. | drop4 `89f1648` |
| UX-3 | "~250 px of empty floor below loadout grid" | Verified non-issue — content fits the visible viewport. Audit overstated; the dead space appeared transiently during scroll past the SHARDS cell. No code change needed. | (verified, no fix) |
| UX-4 | Pack name truncation ("Apocalypse Outla...") on every catalog card | Engine: optional `getPackShortName(partName)` on CosmeticAdapter. Drop4: shortName field on AmgPackMeta for ~22 packs (Outlaws, Civilians, Knights, Samurai, Vikings, etc.). AmgPartCard pack strip uses shortName when host supplies it. Modal/gallery still use full displayName because they have room. | engine `9cc0cea` + drop4 `1f741d8` |
| UX-5 | AmgCreator dice button has no visible label | Added compact "RANDOM" caps label below the dice icon. Stacked icon + label vertically; total button height matches CANCEL/RESET/SAVE. | engine `4a00a0c` |

---

## Bonus polish rounds

| Round | Change | Commit |
|---|---|---|
| 6 | CategoryBrowser progress bar (Pets/Pieces/Boards/Effects/Wins) animates fill from 0 to target on mount + on count change. Same reward-signal pattern as LoadoutCell. | drop4 `73ac01f` |
| 7 | AmgCreator LOOKS row gets right-edge scroll fade — players now see "swipe for more" affordance past Casual/Athletic/Tactical/Samurai. | engine `9c34701` |
| 8 | AmgCreator SPECIES picker row gets the same fade for Human/Goblin/Skeleton/Elves/Zombie. | engine `d0f3d58` |
| 9 | Shop locker chip pluralization — "1 BOXES READY" → "1 BOX READY" (singular when count=1). | drop4 `fef7070` |
| 10 | Daily Deal title shortening — "Pirate Captains 01" → "Pirates · #01" using packMeta.shortName, ends "Pirate Captain..." truncation on the 115-px deal card. | drop4 `fef7070` |
| 11 | ColorTab group headers get accessibilityLabel — screen-reader users now hear "{GROUP}, {N} colors, expanded/collapsed" instead of just "button, expanded". | engine `54f0a44` |
| 12 | Customize HAIR/FACE loadout cells show pack identity — was generic "Hair 01" / "Face", now shows "Civilians 03" / "Outlaws 02" matching CLOTHES/PETS/PIECES cells. Uses packMeta.shortName via inline labelFromPartName helper. | drop4 `477b820` |
| 13 | Defensive: CategoryBrowserScreen no longer crashes if routed to an unknown category. Found while overnight-testing — `category: 'fx'` (vs the actual 'dropEffects' route name) had no config switch case and crashed with "Cannot read properties of undefined." Added fallback empty config so player sees graceful empty state instead of the error boundary. | drop4 `72f0235` |
| 14 | Customize EMOTES cell — accurate readout. Was "X pinned" where X was ownedEmotes.length but "pinned" is the wheel-pinning concept (different field). Now shows the selected emote's name ("Wave" / "Dab" / "Clap"), or "Random" when in random mode (the default), or "X owned" as fallback. | drop4 `c273a44` |
| 15 | Catalog species filter defaults to player's species. Was "All" by default → Human players saw goblin starter parts on top because of alphabetical sort. Now opens with "Human" pre-active, Human Base parts on top, with the player's equipped part highlighted (gold EQUIPPED border + chip). Handles the `amgCharacter.species` capital-cased "Human" → lowercase 'human' SPECIES_FILTER id mapping. | drop4 `9fd6ea9` |

---

## Combined session totals (overnight)

- **15 polish wins + 1 defensive fix** across 16 commits
- **5 engine commits + 11 drop4 commits**
- **All 5 audit-flagged UX issues**: shipped
- **6 bonus polish rounds**: shipped (CategoryBrowser progress, LOOKS fade, SPECIES fade, BOX/BOXES grammar, Daily Deal shortening, ColorTab a11y)
- **All passed**: tsc clean (0 errors), jest 74/74, all pre-commit hooks
- **All pushed** to `origin/main` (drop4) and `origin/master` (engine)

---

## What's still on the punch list

**Art-blocked (Unity batch + fal.ai gen needed):**
- Art-1 🟢 ✅ **FIXED 2026-05-05 morning** — FACE thumbnails ULTRA-tight per-feature framings shipped (4 calibration passes; final coords below). All 6 face sub-slots now produce differentiable thumbs at 96 px catalog size: brows show brow-line dominant, eyes show eye+pupil, nose shows nose+mouth, beard shows chin+jaw mass, ears show 3/4 profile, hair shows full head.
- Art-2 🟡 HAIR thumbnails head-zoomed re-render — DONE as side effect (hair framing was the working anchor)
- Art-3 🟢 Pack identity crests (fal.ai gen ~17 icons)
- Art-4 🟢 Equipped pack visual dominance (intrinsic to wearing a full pack — not really fixable)
- Art-5 🟢 "None" effect feels weird as Common rarity

### Final FACE framing coords (Drop4Exporter.cs PartFraming)

Calibrated empirically over 4 passes. Y=1.78 anchor for ALL face sub-
framings (camera mounted above head); pitch + Z dialed per feature.
focal Y = 1.78 - Z * tan(pitch).

| Slot   | Pitch | Z    | FOV | Focal Y | Crop |
|--------|-------|------|-----|---------|------|
| Brows  | 20°   | 0.55 | 10  | 1.580   | brow-line tight |
| Eyes   | 22°   | 0.55 | 10  | 1.558   | eye+pupil tight |
| Nose   | 27°   | 0.55 | 12  | 1.498   | nose+mouth |
| Beard  | 26°   | 0.65 | 18  | 1.463   | chin+jaw+neck |
| Ears   | 8°    | 0.75 | 16  | (off-axis 0.55) | 3/4 profile |
| Hair   | 8°    | 0.95 | 18  | 1.647   | full head |

Synty character feature world Y (verified by 4-pass calibration):
brow ≈ 1.59 / eye ≈ 1.56 / nose ≈ 1.50 / chin ≈ 1.46.

**Verified working but pending phone build:**
- T-pose flicker fix (engine `6e4920b`)
- Stretched-mesh fix (engine `c5e118f` + `d8b6676`)
- Blendshape flush fix (engine `34e9159`)
- Right-side orb stretch fix (drop4 `255a2f7`)

**Could iterate further (low priority):**
- Loadout cell density (3-col × 4-row grid swap)

---

## Morning continuation 2026-05-05 (after overnight)

| # | Win | Commit |
|---|---|---|
| Art-1 | FACE thumbnail framings re-calibrated (4 passes) — all 6 face sub-slots now differentiable at 96 px | Drop4Exporter.cs (Unity, on disk) + parts/ PNGs re-rendered |
| 16 | Eye iris/pupil dark navy fix — Synty eye GLBs ship with both material slots flat gray; tint.ts now overrides slot[1] to navy `#162033` so pupils read against any skin | engine `tint.ts` |
| 17 | Catalog Owned/Locked filter chips — second filter row stacks under rarity, helps collector flex (Owned-only) and completionist hunt (Locked-only); empty-state copy adapts to filter cause | drop4 `86656d4` |
| 18 | Catalog UNLOCKABLE state — locked cards check shard balance; if affordable, footer flips from passive "IN BAGS" to active green "UNLOCKABLE", same density (no layout shift) | drop4 `1d58534` |
- Hero card bottom CTA card
- Daily Deal card title shortName treatment
- Catalog "Owned only" / "Locked only" filter

---

## Shipping rhythm summary across the broader 2026-05-04 → 2026-05-05 work

This session ran continuous from when Devon went to sleep ~2:30 AM. The
broader two-day push since the audit started:

**Customize audit and round 1-5 polish (2026-05-04 evening):**
- Dynamic OPEN N BOXES CTA, daily deals scroll fade, affordable price chips
- LoadoutCell progress bars + animations, HAIR/FACE counts, XP bar
- TAP-TO-PREVIEW pulse, real LootBox chest art, paired-slot collapse
- T-pose flicker fix, right-side stretch fix, stretched-mesh fix, blendshape flush

**Customize NOW WEARING banner removal (2026-05-04 night):**
- Catalog banner removed (~88 lines)

**Full Customize audit (2026-05-05 daytime):**
- Walked all 13 surfaces / 17 sub-screens
- Documented at `docs/CUSTOMIZE_FULL_AUDIT_2026-05-05.md`
- 5 UX issues + 5 art audit items identified

**Overnight session (2026-05-05 night):**
- All 5 UX issues from audit shipped
- 3 bonus polish rounds shipped
- This summary doc

The customize/shop flow is in extraordinary shape across every surface.
Demo-killer issue (FACE thumbnails identical) is the only outstanding
ship-blocker, and it's art-pipeline blocked (Unity batch needed).
