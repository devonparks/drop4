# Drop4 Polish Charter

This document tells the overnight polish agent what "polish" means in this codebase. Read this every run.

## What you're polishing

Drop4 is a 3D Connect 4 game. The 3D character pipeline is already built (see `docs/3D_SYSTEM_OVERVIEW.md`). Your job is to find small, low-risk, high-leverage improvements to visual feel, UX, and code quality.

## Hard rules

1. **Only commit changes that compile cleanly.** Run `npx tsc --noEmit` and `npx jest`. If either is red, revert your work or fix it before committing. Never push red.
2. **One small polish per run.** Three 30-line improvements > one 300-line rewrite. Keep each commit self-contained and reviewable.
3. **Don't scope-creep.** If you notice a big refactor opportunity, write it in `docs/POLISH_FOLLOWUPS.md` and move on. Don't do it.
4. **Clean up ONLY your own mess.** If your commit orphans a local variable or import, remove it. Do NOT do drive-by cleanup on code your change didn't touch — even if it's obviously dead. Unsolicited refactors compound overnight and nobody can tell what actually moved. Flag dead neighbors in POLISH_FOLLOWUPS.md instead.
5. **Do NOT modify shared types.** `RootStackParamList`, `GameParams`, `MatchupParams`, Zustand store shapes, and any exported `type`/`interface` live in a blast radius larger than one file. Changing them cascades through every call site. These are structural refactors, not polish. If you spot dead type fields, flag them in POLISH_FOLLOWUPS.md and move on.
6. **Push to `main`.** Pre-commit hook (tsc + jest) is the only safety gate — red commits are blocked automatically.
7. **GLB files are gitignored.** `require('../assets/models/...')` calls are valid even though the files don't exist in the remote clone — Metro resolves them at build time on the user's machine. Don't "fix" them.
8. **Respect `CLAUDE.md`** conventions (Zustand selectors, GlossyButton web fallback, sprite sheet grids, etc.).
9. **Commit format:** `polish: <scope> — <one-line description>`. Co-Authored-By trailer for Claude.
10. **Stop after 1-3 commits.** Quality over quantity.

## Good polish targets (in priority order)

### Tier 1 — visible to users
- Loading states, fade-ins, empty states that currently pop or are blank
- Spacing/typography inconsistencies across screens
- Small animations that would improve feel (press scale, hover, bounce)
- Haptic/sound cues missing from interactions that have them elsewhere
- Error handling that silently fails — turn into user-visible toast
- Accessibility labels missing on pressable elements

### Tier 2 — code quality, invisible but good
- Dead imports (there are still some `CharacterAvatar` imports unused)
- `console.log` calls left in production code (should be `if (__DEV__) console.log`)
- Duplicated inline styles that could be extracted to a theme constant
- Missing TypeScript types (functions with inferred `any`)
- Unused exports / functions that nothing calls

### Tier 3 — performance
- `useMemo` / `useCallback` where re-computation is expensive
- `React.memo` wrappers on grid row components
- Image resizeMode missing where images are stretched
- `useShopStore(s => s.getStats())` anti-pattern (method calls in selectors)

## Bad polish targets — skip these

- Anything that requires running the game (you can't)
- Large refactors (tracking unlocks, rewriting a store, changing data shape)
- Package upgrades or installs
- Anything touching `src/engine/` (the game engine is off-limits)
- Deleting files or moving large chunks of code around
- Redesigning screens or changing layouts

## Signal for "done for the night"

If you run out of ideas, write a summary to `docs/POLISH_FOLLOWUPS.md` instead of inventing busywork. It's OK to have a run that commits nothing — an empty run still validates the codebase.

## How to find polish opportunities

Each run, pick ONE of these approaches to explore. Vary across runs.

1. `rg --type tsx -l "AnimatedCharacter\|CharacterAvatar"` — find 2D characters that should be 3D
2. `rg "console\." src --type ts --type tsx | grep -v __DEV__ | head` — find unguarded logs
3. `rg "// TODO\|// FIXME\|// HACK" src` — find self-documented debt
4. Read a recently-modified screen and look for rough edges
5. Read `docs/POLISH_FOLLOWUPS.md` for queued ideas

## Test after every change

```bash
npx tsc --noEmit        # must be 0 errors
npx jest                # must be all pass
```

If you touch `src/components/3d/Character3D.tsx`, the jest smoke tests will catch regressions.
