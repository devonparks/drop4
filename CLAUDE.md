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

### 3D Character System
- **react-three-fiber** for real-time 3D characters (NOT sprite sheets anymore)
- **GLB models** from Synty Studios Sidekick Character Creator, exported via Unity pipeline
- **152 outfits** across 12 packs (human, elf, goblin, skeleton, zombie species)
- **16 pets** (Polygon Dogs), each with baked textures
- **48 animations** (emotes + idles), Mixamo-retargeted to Synty Humanoid rigs
- **Runtime material swaps** for skin color, hair color, outfit colors — tiny app, infinite combos
- **Skeleton rebinding + track path stripping** in Character3D.tsx — do NOT regress this (commit 67c3d97 fixed T-pose)

### Character3D Golden Rules
- ALWAYS pass `animationGlb` — never `undefined`. Use `DEFAULT_HUMAN_IDLE.glb` as fallback.
- GLB files are gitignored. `require('../assets/models/...')` calls are valid — Metro resolves them at build time.
- Character3DPortrait reads the player's customization from characterStore automatically.

### Navigation
- React Navigation 7 (native stack + bottom tabs)
- 5 bottom tabs: Home, Challenges, Collection, Profile, Shop
- Stack screens: Play, Matchup, Game, Career, CareerMap, CareerCity, Settings, Learn, Character3DCreator, Legal, BoardEditor, MatchHistory, Stats, CustomGame, LocalPlay

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

## v1 Status (as of April 2026)

- **Multiplayer: KILLED.** All Firebase services (matchmaking, emotes, friends) deleted. GameScreen has some dead `isOnlineMatch` variable references but they're inert (always false). Don't re-add MP code.
- **v1 is single-player only**: AI games (Easy/Medium/Hard), Career Mode (36 levels), Local Play (pass & play).
- **Retention hooks shipped**: daily spin, streak escalation (14/30/60/100-day milestones), shop rotation (4 daily featured deals), local push notifications, collection milestones (15 with title rewards).

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

Solo dev (Devon Parks), working between DoorDash shifts. Keep scope tight. Beta test > polish. No refactors unless they ship real player value.
