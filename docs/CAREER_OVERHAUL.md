# Career Mode Overhaul

## Why this exists

Current career = 36 levels of the same Connect 4 rules with rising AI difficulty. Rated Rookie Ron (73) → ??? (87). That's it. The "story" hook is city themes (Brooklyn → Venice Beach → Harlem), but mechanically every level plays identically.

Reference games (Devon's framing):
- **Angry Birds** — new birds unlock per world, changing how you solve levels
- **Candy Crush** — 8+ level types (jelly, timed, ingredients, order, target score, sugar drops, mixed) so no two levels feel the same
- **"Double Jeopardy"** — high-stakes bonus levels with big multipliers

The overhaul is a two-axis change:
1. **Level variety** — introduce distinct level types within each city
2. **Progression unlocks** — unlock boosters and power pieces as the player advances through cities

---

## Two-phase plan

### Phase 1 — MVP (ship before beta)
Minimum viable overhaul. 3-4 days of work. Adds 4 level types + a simple booster pop.

### Phase 2 — Full vision (post-launch update 1.1)
All 9 level types + power pieces + boss mechanics + ability tree.

Ship phase 1 for beta, flesh out phase 2 after data comes back.

---

## Level types

### MVP set (phase 1)

| Type | Rule | Feels like |
|---|---|---|
| **standard** | Classic 7×6 Connect 4 | Baseline. |
| **blitz** | 10-second shot clock per move. Miss = you drop in a random column. | Tilt + pressure. |
| **obstacle** | Board starts with 3-6 "concrete" cells neither player can play | Puzzle. |
| **target** | Board seeded with a pre-set position. Win in ≤ N moves or lose. | Candy Crush target levels. |

### Full set (phase 2 — post-launch)

| Type | Rule | Feels like |
|---|---|---|
| **bigBoard** | 10×8 board, connect 5 to win | Marathon. |
| **gravityFlip** | Every 3rd move inverts gravity for that turn | Brain-melter. |
| **movesLimit** | 12 total moves to land a connect-4 or you lose | Candy Crush moves level. |
| **jeopardy** | Opponent OVR is the city's top rating, reward 3×. 1 per city. | Double Jeopardy. |
| **boss** | City finale with a unique scripted mechanic | Boss battle. |

---

## Distribution within a city (12 levels)

**Current:** 12 standard levels with rising OVR.

**New (MVP):**
```
Level 1:  standard  (OVR 73)  — "First Drop"
Level 2:  standard  (OVR 71)
Level 3:  standard  (OVR 74)
Level 4:  blitz     (OVR 76)  — first non-standard, introduces shot clock
Level 5:  standard  (OVR 77)
Level 6:  obstacle  (OVR 72)  — concrete cells
Level 7:  standard  (OVR 75)
Level 8:  target    (OVR 78)  — puzzle: win in 6 moves from pre-set
Level 9:  standard  (OVR 73)
Level 10: blitz     (OVR 84)  — second blitz, tighter clock
Level 11: target    (OVR 79)  — puzzle: win in 4 moves
Level 12: boss      (OVR 87)  — unique mechanic per city
```

Player hits a new level type every 2-3 matches. No two levels feel identical.

**Full (phase 2):** same 12-level slot distribution but using all 9 level types.

---

## Boss mechanics (phase 2)

Each city's level 12 boss has a signature twist:

- **Brooklyn — Tommy Blacktop (OVR 87)**
  You can only drop in even-numbered columns on even turns, odd on odd turns. Breaks the normal "any column" reflex.
- **Venice Beach — Sunset Sal (OVR 91)**
  Gravity flips every 4 moves. Pieces stack upward, then flip and fall back down.
- **Harlem — The Cathedral Warden (OVR 95)**
  Board starts with 4 Warden pieces in a threatening diagonal. You have 10 moves to block his connect-4 AND land your own.

Bosses drop a **signature character skin** as a reward (legendary drop). This is what Devon's AMG cosmetics ecosystem leverages.

---

## Booster / power-piece system

### Phase 1 — MVP boosters (already partially in code)

Existing boosters in GameScreen:
- Hint (3/game) ✓
- Undo (unlimited?) ✓

Add:
- **Skip** — opponent's turn is skipped. 1/game. Purchased with gems or earned from boxes.

That's it for MVP. Keep the scope tight.

### Phase 2 — Power pieces

Unlocked progressively as player completes cities:

**After Brooklyn:** Bomb Piece — drops as a 3×3 destroyer. Wipes opponent + your own pieces. 1 per match.

**After Venice Beach:** Rainbow Piece — counts as either color. 1 per match.

**After Harlem:** Heavy Piece — on impact, pushes adjacent opponent pieces down one row. 1 per match.

Power pieces slot into the existing emote wheel UI — reuse the radial picker, just swap emotes for power pieces during a career match with boosters enabled.

---

## Implementation sketch

### Data model change

`src/data/careerLevels.ts`: add fields to `CareerLevel`:

```ts
export type LevelType =
  | 'standard' | 'blitz' | 'obstacle' | 'target'   // phase 1
  | 'bigBoard' | 'gravityFlip' | 'movesLimit' | 'jeopardy' | 'boss';  // phase 2

export interface CareerLevel {
  // ...existing fields
  type: LevelType;              // already exists as 'standard'|'puzzle'|... — expand enum
  blitzSeconds?: number;        // for blitz
  obstacleCells?: Array<{ row: number; col: number }>;  // for obstacle
  targetMoves?: number;         // for target + movesLimit
  targetBoard?: string;         // pre-set position (already exists as presetBoard)
  rewardMultiplier?: number;    // 3 for jeopardy
  bossScript?: 'tommy' | 'sal' | 'warden';
}
```

### GameScreen changes

Gate the new mechanics behind `params.levelType`:

```ts
// In GameScreen
const levelType = params.levelType ?? 'standard';

if (levelType === 'blitz') {
  // Use existing turn timer, just enable it by default
  const clockSeconds = params.blitzSeconds ?? 10;
  // ...
}

if (levelType === 'obstacle' && params.obstacleCells) {
  // Pre-mark cells as locked in the board state
}

if (levelType === 'target') {
  // Load params.targetBoard into initial state
  // Show "Win in N moves" in HUD
  // Lose condition: reached move N+1 without a win
}
```

### Matchup screen changes

Add a **LEVEL TYPE BADGE** next to the mode badge:

- Standard: no badge
- Blitz: `⏱️ BLITZ — 10s per move`
- Obstacle: `🧱 OBSTACLE`
- Target: `🎯 TARGET — win in 6 moves`
- Boss: `👑 BOSS BATTLE` (already exists for boss)

### Reward change

Level rewards shift from "always coins" to type-appropriate:

- Standard: coins
- Blitz: coins + XP bonus (for the pressure)
- Obstacle: coins + 1 Hint booster
- Target: gems (puzzle solves are harder)
- Jeopardy: coins × 3
- Boss: legendary character skin unlock

---

## Player-facing progression message

Each city should feel like a new chapter with new tools, not just harder AI:

### City 1: The Rec — Brooklyn, NY
"Cracked blacktop, real respect. Learn to drop, block, and play the clock. Unlock the Skip booster."

- Teaches: connect-4 basics, hint usage, first taste of timed + obstacle levels
- Unlock on complete: Skip booster, Brooklyn character skin

### City 2: The Boardwalk — Venice Beach, CA
"Sun, sand, and speed. Sharpen up or get burned. Unlock the Rainbow Piece."

- Teaches: bigger boards, puzzle-level thinking, moves-limit pressure
- Unlock on complete: Rainbow Piece, Venice character skin

### City 3: The Cathedral — Harlem, NY
"Where legends are made. Survive the night. Unlock the Bomb Piece."

- Teaches: everything combined, high OVR opponents, gravity flip
- Unlock on complete: Bomb Piece, Cathedral boss skin

Players come back every day to see what new mechanic the next level throws at them — the same retention hook Candy Crush uses.

---

## Acceptance criteria

### Phase 1 (MVP — target: ship in beta)

- [ ] `CareerLevel.type` enum expanded with blitz/obstacle/target
- [ ] `ALL_CAREER_LEVELS` data updated so each city has 4 distinct types distributed across its 12 levels
- [ ] GameScreen reads `params.levelType` and applies: blitz timer, obstacle cells, target-move counter
- [ ] MatchupScreen shows a level-type badge
- [ ] Win screen shows type-appropriate reward ("+50 coins + 1 Hint" for obstacle, etc.)
- [ ] Career city map shows a level-type mini-icon on each unlocked node
- [ ] Boss level 12 keeps the existing BOSS BATTLE treatment

### Phase 2 (post-launch 1.1)

- [ ] 5 additional level types: bigBoard, gravityFlip, movesLimit, jeopardy, boss
- [ ] Boss scripts for Tommy, Sal, Warden
- [ ] Power piece system: Bomb, Rainbow, Heavy
- [ ] Power piece slot UI during career matches (reuse emote wheel)
- [ ] City-complete unlock ceremony with skin reveal

---

## What NOT to do

- **Don't rename the cities.** Brooklyn/Venice/Harlem + The Rec/Boardwalk/Cathedral is already emotional IP. Keep it.
- **Don't touch the opponent roster.** 12 opponents per city with personality/quotes is working. Add level types on top.
- **Don't change matchmaking OVR.** The existing 73→87 curve per city is fine — variety comes from level TYPE, not from tougher Hard AI.
- **Don't ship power pieces in phase 1.** Mechanics bloat before beta is how projects die. Shoot for variety first, systems later.
