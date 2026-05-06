# Drop4 — Beta Tester Guide

Thanks for testing Drop4 before the public launch. This is the v1.0 candidate build. Your job is to play normally and tell us what feels off.

## Install

You should have a TestFlight invite link in your email. Tap it on your iPhone and follow Apple's prompts. If you don't see it, ping Devon and resend.

**Versions covered:** iOS 16+. Tested on iPhone 12 → iPhone 16 Pro Max.

The app is portrait-only. Tablet support is automatic but not the focus — please test on a phone.

## What Drop4 is

Premium Connect 4 with deep cosmetics + a 36-level career mode. Single-player only in v1 — no multiplayer. Three game modes:

- **Quick Play** vs AI (Easy / Medium / Hard) — fastest match, ~2 min
- **Career** — 36 levels across 3 cities (Brooklyn / Venice Beach / Harlem) with variant rules every few levels: blitz timers, obstacle blocks, target-move levels, jeopardy 3× rewards, boss fights with signature mechanics
- **Local Play** — pass-and-play with a friend on one device

Cosmetics are the soul: customize your character, board, pieces, drop effects, win animations, emotes, idles. Most cosmetics drop from lootboxes; high-rarity items can be shard-unlocked from dupes.

## What we want feedback on (in priority order)

### 1. Career mode pacing
Does it feel like 12 distinct experiences per city, or like "Connect 4 over and over"? Specifically:
- Did the variant levels (blitz, obstacle, target, jeopardy) land as fun or annoying?
- Did the boss mechanics (Tommy's column-parity rule, Sal's gravity-flip banner, Warden's threat seed) feel like real boss fights or just harder AI?
- After clearing a city — did the "City Cleared" ceremony land? Did the new species + power piece unlocks feel earned?

### 2. Power pieces (career-only, unlocks progressively)
After clearing **Brooklyn** you unlock the **Bomb** piece. After **Venice**, the **Rainbow**. After **Harlem**, the **Heavy**. Each is 1 use per match, accessed from the controls row during a career game.

- Did you notice them?
- Did the icon + description telegraph what they did?
- Did using one feel powerful or fiddly?

### 3. Customize / cosmetics flow
Open the Customize tab and walk through every category (Clothes / Hair / Face / Emotes / Boards / Pieces / Effects / Wins). Try unlocking something via shards, opening a Loot Box, and equipping the result.

- Did anything fail to unlock or equip?
- Did the reveal screen feel celebratory enough for a Gold/Diamond Box?
- Did any cosmetic name truncate weirdly in the equipped row?

### 4. First-launch experience
On a fresh install:
- Did the welcome walkthrough make sense?
- Did the daily reward popup, starter wardrobe ceremony, and tap-tutorials feel coordinated or stacked?

### 5. Performance
- Any dropped frames in the 3D character preview?
- Long load times anywhere?
- Battery drain during a 30-min play session?

## How to file bugs

Email **support@amgstudios.com** with the subject **"BUG:"** followed by a one-line summary.

Include:
1. **What you did** — exact tap path
2. **What you expected**
3. **What happened instead**
4. **Phone model + iOS version** (Settings → General → About)
5. **Screenshot or screen recording** if visual

For crashes, ideally TestFlight will auto-attach a crash log to your next session start — no extra action needed.

## Daily test budget

You don't need to play every level. We're looking for:
- 1 full Quick Play match per day (different difficulty each day if you can)
- 2-3 career levels per day (try to cover blitz / obstacle / target variety)
- 1 lootbox open per day
- One full visit to Customize per week

That's ~10 minutes a day. Don't grind — natural play is more useful.

## Known issues (don't bother filing)

These are flagged and either fixed or planned — please don't waste a bug report on them:

- Sal's gravity-flip mechanic isn't fully live yet (banner shows, mechanic in active dev for v1).
- Many career mode cities are still empty / coming online — v1 target is ~200 levels across ~15 cities. As the build progresses, more cities will unlock between TestFlight releases.
- Power piece animations (Bomb explosion, Rainbow shimmer, Heavy push) are in active dev — engine logic works but the visual FX are still landing.
- Pets are disabled in v1 (PETS_ENABLED=false). They'll return in 1.1.
- Frames category doesn't have a Customize cell. Reachable only via lootbox drops in v1.
- Some pack name truncation on small chips ("Apocalypse Outla...") — by design at compact sizes.
- Web preview viewport-clipping on screens narrower than 390 px is preview-only, not a real device issue.

## Privacy

Drop4 collects anonymous gameplay stats (matches played, levels cleared, cosmetics owned). No PII. Full policy in Settings → Legal → Privacy. To delete your data, email **support@amgstudios.com** with subject "DELETE DATA".

## What's next

There's no fixed launch date. Drop4 ships when career mode is good enough to compete with Candy Crush / Angry Birds, since there's no multiplayer in v1 — career has to carry retention. Working target is mid-to-late June 2026, but quality is the bar, not the calendar.

You'll get rolling TestFlight builds as the career mode expands toward 200 levels across ~15 cities. After launch, the 1.1 update plan includes:
- Pets re-enabled
- Power piece drops from boxes (currently career-unlock only)
- Pack identity crests
- iOS Live Activities + Dynamic Island
- AMG account cross-game sync (Tic Tac Toe / Checkers / Chess will all share your character + cosmetics)

Thanks for testing. Hit Devon up if anything's unclear.
