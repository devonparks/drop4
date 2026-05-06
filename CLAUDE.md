# Drop4

Premium Connect 4 mobile game built with React Native + Expo. First game in the **AMG Studios** ecosystem (shared accounts, currency, and cosmetics across Drop4, Tic Tac Toe, Checkers, Chess, RPS).

## Principles

1. **Think Before Coding** — analyze what exists before changing anything. Read the relevant files, understand the data flow, then act.
2. **Simplicity First** — no over-engineering, no unnecessary dependencies. If a feature can be done in 30 lines, don't write 300.
3. **Surgical Changes** — only touch files relevant to the current task. Don't refactor neighboring code "while you're in there" unless the user asks.
4. **Goal-Driven Execution** — run `npx tsc --noEmit` and `npx jest` after every change. Verify the fix actually works before committing.

## Quality Bar

**More polished than Candy Crush and Basketball Stars.** The game's soul is **cosmetics** — character, emotes, board skins, pieces, pets. Every screen should either:
1. Show off cosmetics
2. Give a reason to earn/buy more cosmetics
3. Let the player discover new cosmetics

## Architecture

### 3D Character System (AMG-native)
- **AMG Engine** (`@amg/character-runtime` + `@amg/character-creator`) is the single source of truth for character rendering across every screen.
- `CompositeCharacter` from `@amg/character-runtime` is the only renderer. Per-slot Sidekick part GLBs are streamed from the R2 CDN (`https://pub-8953453f2512408f9c58656d4ea4e681.r2.dev`); the manifest + ~17 parts are dedup-cached by `loader/glb.ts`.
- Every character is a `CharacterState` — species + per-slot equipped part names + colors + blendshapes. The store field is `characterStore.amgCharacter`.
- Runtime material swaps for `Skin 01` / `Hair 01` / `Outfit 01 Primary/Secondary/Tertiary` SidekickColorProperty names.
- **Animation:** `state.animation` is a relative path under `animations/` (e.g. `emotes/emote_dab.glb`). Paths starting with `emotes/` play once and clamp; everything else loops. Idles cycle through `DEFAULT_IDLE_LIST` when `state.animation` is null.
- **Skeleton rebinding + track path stripping** lives in `packages/character-runtime/src/scene/skeleton.ts` and `animation.ts` — do NOT regress this. The Synty Humanoid bone names are load-bearing.

### Character data flow
1. `App.tsx` boots → `useCharacterStore.loadFromStorage()` hydrates the save → if `amgCharacter` is null, seeds `STARTER_HUMAN_CHARACTER`.
2. `App.tsx` pre-warms the AMG manifest (non-blocking).
3. `HomeScreen` renders the player's `amgCharacter` via `Character3DWrapper` → `CompositeCharacter`.
4. `Character3DPortrait` is the standard portrait wrapper used by Matchup / Game / Profile / Customize / shop preview. With no `customization` prop it auto-reads `amgCharacter`; pass an explicit `CharacterState` (e.g. `getNpcCustomization('rookie ron')`) to render an NPC.
5. The creator (`AmgCreator` route → `CharacterCreatorScreen`) wraps `@amg/character-creator`'s `CharacterCreator` and persists via `setAmgCharacter` on Save.
6. The shop's "buy outfit pack" flow calls `unlockOutfit(id)` which auto-unlocks the underlying AMG parts via `unlockAmgPart`, then `equipOutfitPack(id)` swaps the body slots into `amgCharacter` (Head / Eyebrows preserved).
7. NPC variety is hand-authored in `src/data/npcCustomizations.ts` via the `make()` translator — outfit id + sliders → `CharacterState` with manifest-validated fallback chain (`pack-variant → pack 01 → species base`).

### Navigation
- React Navigation 7 (native stack + bottom tabs)
- 5 bottom tabs: Home, Challenges, Collection, Profile, Shop
- Stack screens: Play, Matchup, Game, Career, CareerMap, CareerCity, Settings, Learn, AmgCreator, Legal, BoardEditor, MatchHistory, Stats, CustomGame, LocalPlay

### State Management
- Zustand (21 stores, AsyncStorage auto-save via `saveState`/`loadState`)
- **NEVER** call methods inside selectors — `useStore(s => s.getStats())` causes infinite re-renders. Use primitive selectors + `useMemo`.

### Key Services
- `audio.ts` — muted by default in dev (`isMuted = true`). Toggle in Settings.
- `haptics.ts` — tactile feedback, can be disabled in Settings.
- `notifications.ts` — local scheduled push reminders (morning spin, evening streak, Saturday shop).
- `storage.ts` — AsyncStorage wrapper for Zustand persistence.

## Project Conventions

- **GlossyButton on web**: Apply `onClick` to the View wrapper as a fallback because LinearGradient inside Pressable can block pointer events.
- **Phone preview**: PhoneFrame wraps the app on web only (390x844). Native renders children directly.
- **Commit format**: `polish: <scope> — <description>` for the polish loop. `feat:`, `fix:`, `cleanup:` for manual commits.
- **Polish loop**: `tools/polish-loop.sh` runs autonomously via Claude Max subscription. Reads `docs/POLISH_CHARTER.md` for rules, picks from `docs/POLISH_FOLLOWUPS.md` queue.

## v1 Status (as of 2026-05-06 strategic shift)

- **Multiplayer: KILLED.** All Firebase services (matchmaking, emotes, friends) deleted. All dead MP variable references have been stripped. Don't re-add MP code.
- **v1 is single-player only**: AI games (Easy/Medium/Hard), Career Mode, Local Play (pass & play).
- **Retention hooks shipped**: daily spin, streak escalation (14/30/60/100-day milestones), shop rotation (4 daily featured deals), local push notifications, collection milestones (15 with title rewards).

## Career Mode is the Retention Engine (2026-05-06 decision)

Because there's no multiplayer in v1, **career mode has to carry the entire retention loop**. Bar = "as addicting as Candy Crush / Angry Birds." The original 36-level career was sized for "MVP for beta"; that's now the foundation, not the product.

**v1 career scope:**
- **~200 unique levels** across **~15 cities**, recipe-generated from a level-template DSL (NOT 200 hand-typed entries — that doesn't scale and isn't how Candy Crush authors theirs either).
- **Every level type the engine supports** in active rotation: standard, blitz/timed, speed, obstacle, target/moves_limit, jeopardy, puzzle, connect3/5/6, go-second, boss. Each city introduces 1-2 wrinkles on top.
- **All 3 boss scripts working**, not just banners: Tommy column-parity (✅ shipped), Sal gravity-flip (engine work pending — board column-array reverse + visual rotation + touch-coord remap), Warden seed-threat (✅ shipped via existing presetBoard).
- **All 3 power pieces working with full animations**: Bomb explosion FX, Rainbow shimmer trail, Heavy push-impact + adjacent-piece slide animation. Engine logic is shipped (`dropBomb` / `dropRainbow` / `dropHeavy`); animations pending.
- **Per-level intro card** ("TARGET: 6 MOVES" reveal before play starts) so the variant identity registers before the player taps a column.
- **Per-mechanic celebrations** — star burst on level clear, combo glow on streaks, city-themed background palettes per chapter.
- **City-complete ceremony** (✅ shipped) — already reveals species + power piece. May want to extend to also reveal a SKIN drop per the overhaul doc.

**Ship rule:** v1 ships when career mode actually competes. Date is target, not gospel. Working target: mid-to-late June 2026. If we hit the bar earlier, ship earlier. If we don't, push.

**What ELSE is still v1.1+** (the date-slip is for CAREER ONLY, not a general scope-loosening):
- Express Mode (webcam motion-cap)
- iOS Live Activities / Dynamic Island
- Pets (still gated by `PETS_ENABLED=false`)
- Frames category as a Customize cell
- Pack identity crests
- Power piece drops from boxes (currently career-unlock only)
- AMG account cross-game sync

## Testing

```bash
npx tsc --noEmit        # must be 0 errors
npx jest                # must be all pass
npx expo start --web --port 8086  # web preview
```

## AMG Engine

Skills repo: `~/Desktop/amg-engine/skills/`

Before starting work, read `amg-router.skill` and load 1-3 relevant skills for the task. After shipping a feature, optionally run the `amg-updater` process to update the skills with what was learned.

## Dev Situation

Solo dev (Devon Parks), working between DoorDash shifts. Keep scope tight on EVERYTHING EXCEPT career mode — career is the retention engine and gets the AAA treatment. Everywhere else: beta test > polish, no refactors without player value.
