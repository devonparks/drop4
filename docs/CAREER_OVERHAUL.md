# Career Mode Overhaul — v1.0 Vision

> **2026-05-06 strategic shift**: Multiplayer was killed in v1, so career mode IS the retention engine. The original "Phase 1 MVP / Phase 2 v1.1" split is dead. Everything in this doc is v1.0 scope. Ship date is no longer sacred — quality is. Working target: mid-to-late June 2026.

## Why this exists

Drop4 has no multiplayer. That means there's no friend-vs-friend hook, no ladder grind, no clan system. Players have to come back **for the single-player content** or they don't come back.

Reference games (Devon's framing):
- **Candy Crush** — 13,000+ levels across ~330 episodes. ~13 distinct level types in active rotation. Players come back daily because the next level always introduces a wrinkle they haven't seen.
- **Angry Birds** — new birds unlock per world, each with a distinct ability. Worlds give the SAME mechanics a new visual + thematic identity.
- **NBA Street Vol. 2** — career = a tour through NYC's parks with named opponents. Personality + place = the hook.

Drop4's career has to feel like all three. **The bar is "as addicting as Candy Crush," not the calendar.**

---

## v1.0 scope

### Levels: 200 across ~15 cities

The current 36 hand-typed entries don't scale. The path to 200 is a **level recipe DSL**:

```ts
// Each city is a recipe. The generator produces full CareerLevel
// objects from the recipe at module-init time.
const CITY_RECIPES: CityRecipe[] = [
  {
    id: 'brooklyn',
    name: 'The Rec',
    state: 'NY',
    palette: 'streetball',
    levels: [
      { slot: 1,  type: 'standard',  diff: 'easy',   name: 'First Drop' },
      { slot: 2,  type: 'timed',     diff: 'easy',   timer: 15 },
      { slot: 3,  type: 'standard',  diff: 'easy' },
      { slot: 4,  type: 'obstacle',  diff: 'easy',   walls: 2 },
      // ... up to slot 12 boss
    ],
  },
  // ... ~14 more cities
];

function generateLevels(): CareerLevel[] {
  // Walks recipes, fills in opponent names from a pool, personalities
  // from templates, star thresholds from difficulty + level type.
}
```

**Why recipes:** authoring 200 hand-typed entries is ~20 hours of pure typing + impossible to balance + impossible to refactor. Recipes give us:
- Per-city consistency (Brooklyn levels feel like Brooklyn)
- Difficulty curves we can tune in one place
- Opponent name pools that don't repeat across cities by accident
- The ability to add/remove cities cleanly post-launch

Each city has 12-15 levels (Candy Crush episode size) and ends with a boss.

### Mechanics: every type the engine supports + 1-2 new wrinkles per city

Already in the engine (DON'T remove):
- standard, blitz/timed, speed, obstacle, target/moves_limit, jeopardy, puzzle, connect3/5/6, go-second, boss

New wrinkles to introduce one-per-city as the player progresses:
- **Mirror columns** (city N) — opponent's drop mirrors yours into a different column
- **Frozen pieces** (city N+2) — pieces the player drops in certain columns can't be moved by anything for 3 turns
- **Double drop** (city N+3) — every other player turn drops 2 pieces
- **Decoy pieces** (city N+5) — opponent starts with 1-2 fake pieces that don't count for connect-N (visual + checkWin twist)
- **Survival mode** (city N+7) — opponent has 5 pieces preplaced and a connect-3 win condition; player has standard connect-4
- **Wild rules** (city N+10) — combinations of 2-3 of the above

Each wrinkle is a small engine extension (~1-2 hours each) using the patterns already proven by `obstacleCells`, `bossScript`, `RAINBOW`/`WALL` cell sentinels.

### Bosses: 1 per city = ~15 total scripted mechanics

Already shipped:
- ✅ **Tommy Blacktop** (Brooklyn) — column-parity rule (full mechanic)
- ⏳ **Sunset Sal** (Venice) — gravity flip every 4 moves (banner only — engine pending)
- ✅ **Cathedral Warden** (Harlem) — 4-piece pyramid seed (existing presetBoard works)

Need authoring + engine work for ~12 more bosses, one per new city. Each gets:
- A signature mechanic (one new engine wrinkle, NOT a stack of mechanics)
- A named persona with personality + a chunky 3D portrait
- A custom matchup banner with their rule
- A unique reward (legendary skin / power piece / city-themed cosmetic)
- A page in the City Completion Ceremony

### Power pieces: full set + animations

Engine logic shipped for all 3:
- ✅ **Bomb** — clears 3×3 around landing cell
- ✅ **Rainbow** — wildcard cell value 4, counts as either color in checkWin
- ✅ **Heavy** — pushes adjacent opponent pieces down 1 row

Animations pending:
- ⏳ **Bomb explosion FX** — particle burst, screen-shake, scorch ring on the cleared cells
- ⏳ **Rainbow shimmer trail** — gradient fade, particle sparkle as the rainbow piece drops
- ⏳ **Heavy push animation** — adjacent opponent pieces visually slide down (don't just snap)

Each is ~2-4 hours of focused work using react-native-reanimated 4 + the existing piece-drop animation primitives.

**Future:** Power pieces should drop from boxes too (currently career-unlock only). Defer to v1.1.

### Animation suite: per-mechanic celebration

Existing kit (DON'T re-build):
- ✅ Spring piece-drop with bounce
- ✅ Winning-line sparkle sweep (cascaded delay across the 4 pieces)
- ✅ ConfettiOverlay
- ✅ StaggeredEntry on screen mounts
- ✅ CityCompletionCeremony with species + power piece reveal cards
- ✅ MilestoneToast with 3D hero slot

What's missing (v1 scope):
- **Per-level intro card** — "TARGET: 6 MOVES" / "🧱 4 OBSTACLES" reveal that slides in for ~1.5s before play starts. Telegraphs the variant identity so players don't have to read the matchup screen carefully.
- **Star burst on level clear** — the 1/2/3 stars don't just appear; they ZOOM in one at a time with a pop sound and small confetti per star.
- **Combo/streak celebration** — when the player wins 3+ in a row, fire a "STREAK" banner + bonus coin animation.
- **Per-mechanic transition FX** — Sal's gravity flip needs the whole board to visually rotate 180° with the pieces still attached.
- **City-themed background palettes** — each city has a sky gradient (already exists) + ambient particle FX (snow for Cathedral, sand for Venice, neon flicker for Brooklyn, etc.).
- **Mascot reactions** — when the player lands a clutch win, the opponent's portrait does a defeat animation. When they lose, the opponent gloats. (Reuses existing 3D character animation rig — no new assets needed, just new emote triggers.)

### City progression: arc + identity

15 cities, 12-15 levels each, ~10 minutes per level on average = ~30-40 hours of gameplay just to clear v1.

Each city has:
- A real-world location (NYC boroughs → LA → Chicago → Atlanta → Houston → Cleveland → ... → world cities)
- A nickname (The Rec, The Boardwalk, The Cathedral, ...)
- A vibe (streetball, sun + sand, gothic survival, ...)
- A boss with a scripted mechanic
- A skin reward (legendary cosmetic on full clear)
- A power piece unlock at certain milestone cities (Brooklyn → Bomb, Venice → Rainbow, Harlem → Heavy, then ?)
- A species unlock at certain bosses (Elven, Goblin, Skeleton, Zombie, then ?)

The narrative arc: small-stakes neighborhood → big-stakes hometowns → coast-to-coast → international tournament → legendary opponents.

---

## What's already shipped (don't redo)

Per the 8 commits during the 2026-05-06 autonomous run:
- Engine WALL=3 + RAINBOW=4 cell sentinels
- ObstacleBlock visual in GameBoard
- 5 obstacle levels + 3 target levels distributed across the existing 3 chapters
- Type-appropriate rewards across all 36 levels (obstacle/timed → +Hint, speed/puzzle/target → +gems, etc.)
- Skip booster (1/match free + 5-gem refills)
- Tommy column-parity boss script (player + AI both gated)
- Sal + Warden matchup banners (Sal mechanic still pending)
- Bomb / Rainbow / Heavy engine actions (`dropBomb` / `dropRainbow` / `dropHeavy`)
- Power piece UI selector (career-only, gated on boss-clear unlock)
- careerStore.unlockedPowerPieces with persistence + auto-restore on save load
- City Completion Ceremony reveals BOTH species AND power piece in matching color tints

---

## What's next (in execution order)

### Phase A — Foundation (1-2 weeks)
The engine + content infrastructure that everything else depends on.

1. **Level recipe DSL + generator** — replace hand-typed `careerLevels.ts` with a recipe-driven system. Backward-compat shim so existing level IDs stay stable.
2. **Sal's gravity-flip mechanic** — column-array reverse + GameBoard visual rotation + touch coord remap. Most complex pending engine piece.
3. **City framework** — `CAREER_CITIES` data extends to 15 cities with palettes, vibes, opponent rosters, rewards, mascot portraits.
4. **Per-level intro card** — reusable component that fades in pre-play.

### Phase B — Content (2-3 weeks)
Generate the levels + author the bosses.

5. **Generate 200 levels via recipes** — Brooklyn / Venice / Harlem (existing) + 12 new cities. Distribute mechanic variety per the recipe-table-driven curve.
6. **Author 12 new bosses** — name, personality, signature mechanic, matchup banner, ceremony copy.
7. **Author the new mechanic wrinkles** (mirror, frozen, double-drop, decoy, survival, wild) — 1-2 per new city.
8. **Star threshold tuning pass** — playtest each level, set the 3-star / 2-star move counts.

### Phase C — Polish (1-2 weeks)
The stuff that turns "200 working levels" into "200 levels people want to play."

9. **Power piece animations** — bomb explosion, rainbow shimmer, heavy push slide.
10. **Star burst on level clear** + **combo/streak celebration**.
11. **City-themed ambient backgrounds** — particle FX, sky gradient variations.
12. **Mascot reactions** — defeat / gloat animation triggers on opponent portraits.
13. **AI tuning round** — playtest fresh-player win rates per city, adjust difficulty curves.

### Phase D — Ship (1 week)
14. **Beta build** → real-device playthroughs → TestFlight to friends.
15. **Config blockers** (your input): icon JPEG re-export, EAS init, Apple credentials, LegalScreen contact info, App Store screenshots.
16. **Submission + Apple review.**

Total estimated: **5-7 weeks** for the full vision. Working target ship date: mid-to-late June 2026 if everything stays on track. **The date is a target, not a deadline.**

---

## What NOT to do

- **Don't rename Brooklyn / Venice / Harlem** or rebrand "The Rec / Boardwalk / Cathedral." Existing players (you, beta testers) already have emotional IP attached. Keep them, build around them, place them as the first 3 of 15 cities.
- **Don't touch the v1 cosmetics pipeline.** It works, it's audited, it's stable. Career-mode work doesn't need to refactor lootboxes / shards / customize.
- **Don't add multiplayer back.** That's NOT the path. The bet is "we can make single-player good enough that MP isn't missed."
- **Don't ship before the bar is met.** If we hit June 30 and the animation polish isn't there, push to July. The strategic shift is "quality > date." Don't undo it under deadline pressure.
- **Don't over-engineer the level recipe DSL.** It's a tool to author 200 levels, not a runtime engine. Keep it simple TS — no codegen, no IDE plugin, no schema files. A function that returns `CareerLevel[]` is enough.
- **Don't forget the 1.1 deferrals** — they're still deferred. Express Mode, Live Activities, pets, frames-as-cell, pack crests, power-piece box drops, AMG cross-game sync. The date slip is for CAREER ONLY.

---

## Reference: existing engine support summary

For the recipe authoring pass — what each level type needs in `settings`:

| Type | Required settings | Optional |
|---|---|---|
| `standard` | none | `presetBoard` |
| `connect3/5/6` | `connectCount` (3/5/6) | board size |
| `timed` | `timerSeconds` (10-15) | |
| `speed` | `timerSeconds` (3-5) | |
| `go_second` | `playerGoesFirst: false` | optional `presetBoard` head-start |
| `puzzle` | `presetBoard` | |
| `boss` | `bossScript: 'tommy' \| 'sal' \| 'warden' \| <new>` | optional `presetBoard` seed |
| `jeopardy` | `rewardMultiplier: 3` | typically connect5 + bigger board |
| `moves_limit` | `movesLimit: N` | |
| `obstacle` | `obstacleCells: Array<{row,col}>` (3-6 cells) | |

New wrinkles will need their own settings keys + engine support. Add as needed.
