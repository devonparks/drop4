# Drop4 Playtest Report — 2026-04-17 evening

**Tester:** Claude Sonnet (Claude Preview driving web build at `localhost:8086`)
**Build:** main @ `0b65f60` (CustomGameScreen polish)
**Method:** Systematic screen-by-screen playtest via web preview. Every screen visited, every interactive element tapped.

---

## Summary

**Overall grade: B.** Playable, polished in a lot of places, but has a few ship-blocking bugs on web and one system (career) that needs an overhaul before beta. Home screen, win screen, profile, challenges, and awards feel A-/A. Shop and customization are B+ content-dense but held back by thumbnail blindness. Career mode is C+ — 36 levels, same mechanic, and the framing ("boss battle" on level 1) makes the progression feel flat.

### Top ship blockers (fix before beta)

1. ✅ Emote wheel off-screen on web → **FIXED** (commit `4ba6178`)
2. ✅ Daily spin wheel unreachable → **FIXED** (commit `efe51c3`)
3. ✅ Career matchup labels every opponent BOSS BATTLE → **FIXED** (commit `efe51c3`)
4. ✅ TopBar nested `<button>` hydration errors → **FIXED** (commit `adc3b89`)
5. First-launch modal stacking (DailyReward + Welcome) — still open
6. Shop outfit cards use pack icons, not outfit-specific previews — still open
7. Win reward display shows +35 but balance grew by +85 — still open

### System grades

| System | Grade | Notes |
|---|---|---|
| First-launch / onboarding | C+ | DailyReward + Welcome stack. Tutorial tooltips are fine but the bullet-list welcome feels 2018. |
| Home screen | A- | Logo, character stage, emote/idle/customize/spin buttons all read clearly. Clean. |
| Quick Play match flow | A | Great matchup screen, tight game feel, excellent win screen. |
| Career mode | C+ | Progression is just "rating goes up." No variety per level. BOSS BATTLE framing on level 1 broke immersion (fixed, but the mode still needs mechanical variety — see `CAREER_OVERHAUL.md`). |
| Shop | B+ | Dense catalog, tier colors + "X games to go" countdowns are great. Kneecapped by outfit cards showing the same pack icon. |
| Collection / Characters | A- | Hero portrait + grid + sub-tabs (Characters / Loot / Awards) is polished. Loot tab empty state is sparse. |
| Collection / Awards | A | Milestones, progress bars, title rewards — this is the gamification layer done right. |
| Profile | A- | OVR badge + portrait frame + daily goals card + coin goal. NBA 2K vibes. Clean. |
| Challenges | A- | Daily + weekly split, progress bars, reward pills, bag meter. |
| Customize | B+ | Turntable 3D preview is great. 152 outfits across packs. Same thumbnail issue as shop. |
| Settings | A- | Audio/haptic/notif toggles, What's New list, Privacy/ToS, account, Reset Progress, version footer. Solid. |
| Daily reward | A | Escalating 7-day cycle, premium day treatment (confetti, bigger icon). |
| Daily spin | A (now that it's reachable) | Basketball-Stars-style wheel, rarity tiers, time-to-next-spin countdown. |

### Shipped this session

- `4ba6178` — FortniteEmoteWheel centered in modal (no more off-screen on web)
- `efe51c3` — Daily spin now accessible via a SPIN pill on home; career matchup uses city nickname instead of defaulting to BOSS BATTLE; initial playtest report committed
- `adc3b89` — TopBar CurrencyPill no longer nests `<button>` inside `<button>`

### Backlog (found but not shipped)

- First-launch modal stacking: DailyReward + Welcome both auto-open, order is wrong
- Shop / customizer outfit thumbnails: every card in a pack shares the same pack icon
- Win-screen coin delta doesn't match actual currency growth
- Quick Play tip references "Custom Game" but there's no visible entry point for it
- Loot tab empty state is 50% dead space
- Outfit names truncated to "Elven Warriors..." everywhere — no short/display name pattern
- DailySpinWheel still uses `Dimensions.get('window')` for sizing — may have the same off-screen issue on tablets / iPad web

---

## Live Findings Log

_(Appended in order as issues surfaced during the playtest.)_

### [MEDIUM] Career matchup screen labels every opponent "BOSS BATTLE"
- **Repro:** Career → The Rec → Rookie Ron → PLAY MATCH → Matchup screen has big red "CAREER: BOSS BATTLE" header, BOSS BATTLE pill, and a red/pink intimidating gradient.
- **Impact:** Rookie Ron is literally tagged "First Drop — Your first opponent. Go easy on him." — but the matchup screen shouts BOSS BATTLE at the player. Label discipline broken; if everything is a boss, nothing is.
- **Fix:** Only the last opponent per city (or every 12th level) should be tagged "BOSS BATTLE." Non-boss levels should say "CAREER · CH.1" with the flavor text and a less menacing gradient.

### [HIGH] Shop outfit cards all show the same pack-icon, not outfit-specific previews
- **Repro:** Shop → Outfits tab → Elven Warriors pack shows 6 cards all with the same bow-and-arrow emoji. Same for other packs (Goblin pack = red devil mask × N).
- **Impact:** Cosmetics are the game's soul. Players can't distinguish outfits without tapping each one individually. This kills browsing joy.
- **Fix options:**
  1. Best: render a small 3D Character3DPortrait with the outfit applied in each card (expensive — 6+ 3D canvases per screen).
  2. Middle: pre-render outfit thumbnails via ComfyUI or Unity pipeline, save as static PNGs in `assets/outfit-thumbs/<outfit_id>.png`, use in cards.
  3. Cheap: show the outfit's dominant color as a pill/swatch + the pack icon, so cards at least differ visually within a pack.
- Option 3 is 30 min of work; option 2 is a pipeline job for later.

### [LOW] Win reward display — screen shows "+35 coins" but balance grew by 85
- **Repro:** Start with 550 coins → win an Easy match → win screen shows "+35" coin reward, "FIRST WIN OF THE DAY 2x XP" banner → close win screen → top bar shows 635 coins.
- **Cause:** The 2x first-win-of-day bonus probably doubles coins silently but the "+35" label doesn't reflect it. Either the label is wrong (should show "+70") or extra +50 comes from a hidden streak/level-up bonus.
- **Impact:** Minor. Player gets more coins than advertised (pleasant surprise), but mismatched display is unpolished.
- **Fix:** Trace the reward calc in `GameScreen.tsx` around line 492 (ownedCosmetics + coin reward path) and make the displayed number equal the actual currency delta.

### [CRITICAL] Emote wheel renders offscreen on web (user-reported "emote button doesn't work") ✅ FIXED (commit 4ba6178)
- **Repro:** Start a match (PLAY → EASY → READY) → tap the 😀 emote button bottom-right → wheel renders far LEFT of the phone frame, half the slots cut off the viewport.
- **Cause:** `FortniteEmoteWheel` uses `Dimensions.get('window')` + absolute `left: SCREEN_WIDTH/2 + x` positioning. RN `<Modal>` on web portals to document root (escapes the PhoneFrame wrapper), so the wheel's coordinate origin is (0,0) of the REAL window, but `SCREEN_WIDTH` is the emulated phone width (390). Wheel ends up at x≈195 — inside the phone frame's WIDTH but at the LEFT EDGE of the viewport.
- **Impact:** Emote wheel unusable on web, two slots cut off. On native it probably works (window IS the phone). **This is the user-reported bug.**
- **Fix:** Replace absolute `left:`/`top:` slot positioning with flex-centered layout using `transform: translate(dx, dy)` from the wheel center. Or wrap slots in a centered container View with `alignItems: 'center', justifyContent: 'center'` and use relative transforms.

### [HIGH] CurrencyPill — nested `<button>` inside `<button>` (invalid HTML + web click issues)
- **Repro:** Open home screen on web. Console shows 20+ hydration errors: `<button> cannot contain a nested <button>`.
- **Cause:** `CurrencyPill` wraps the full pill in a `Pressable` (→ `<button>` on web) AND the inner `+` badge is also a `Pressable` (→ nested `<button>`). React's dev build complains; production builds may swallow the inner click or double-fire.
- **Impact:** Web-only: invalid HTML, unreliable "+" taps, hydration warnings every render. Mobile: works fine (RN treats Pressables as Views).
- **Fix:** Change the inner `+` badge to `View` + `onPress`-on-TouchableWithoutFeedback, OR make the outer wrapper a `View` and only put `Pressable` on the inner zones. Need to see `CurrencyPill.tsx` to decide.

### [HIGH] First-launch modal stacking — DailyReward + Welcome overlap
- **Repro:** Fresh install. App boots → DailyReward popup shows → tap CLAIM REWARD → Welcome overlay slides in on top of it → tap LET'S GO → DailyReward popup is still there, still unclaimed.
- **Impact:** Confusing first-5-seconds experience. Player taps CLAIM, sees Welcome (unrelated), dismisses Welcome, has to tap CLAIM again. Looks buggy.
- **Fix:** Welcome should gate DailyReward. Either delay the DailyReward check until `drop4_welcome_dismissed === 'true'`, or have DailyReward's `show` effect watch the welcome flag.
- **File:** probably `App.tsx` or `HomeScreen.tsx` where the modal show-logic lives.


