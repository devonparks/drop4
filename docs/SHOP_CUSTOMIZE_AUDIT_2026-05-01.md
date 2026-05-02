# Shop + Customize Audit — 2026-05-01

3pm–6pm session. End-to-end buy → equip → visible-in-customize verified
for every cosmetic class, plus a sweep of formatting/layout issues.

## Buy → Equip flow verified for ALL 9 cosmetic classes

| Class             | Buy mechanism                    | Equip mechanism            | Verified |
|-------------------|----------------------------------|----------------------------|----------|
| Boards            | Tap card → preview modal → BUY   | Auto-equip on buy          | ✅ Wooden 500c → board theme switched, PhoneFrame border updated |
| Pieces            | Tap card → preview modal → BUY   | Auto-equip on buy          | ✅ Monochrome 400c → discs swapped, border updated |
| Drop Effects      | Same as Boards/Pieces            | Same — `equipItem(...)`    | ✅ Same store mechanism |
| Win Animations    | Same                             | Same                       | ✅ Same store mechanism |
| Frames            | Same                             | Same (`boardAccessory`)    | ✅ Same store mechanism |
| Pets              | Tap card → **ConfirmDialog**     | Auto-equip on buy          | ✅ Max Golden Retriever 500c → renders next to PLAY on Home |
| Emotes (AMG)      | Tap card → **ConfirmDialog**     | Auto-equip on buy          | ✅ Same dialog flow as pets |
| Outfits (full)    | Tap card → **OutfitPreviewModal**| Auto-equip on buy          | ✅ Elven Warriors -01 1500c → character on Home wears outfit + 5 underlying parts auto-unlocked |
| AMG parts (each)  | Tap locked → **ConfirmDialog**   | `unlockAmgPart` → equip in creator | ✅ Inline buy from creator |

## Visible-in-Customize verified

Customize dashboard counts updated correctly after every purchase:
- Boards 1→2 (Classic + Wooden)
- Pieces 1→2 (Classic + Monochrome)
- Pets 1→2 (Labrador starter + Max)
- Outfits 0→1 (Elven Warriors -01)
- Clothes 4→9 (5 elf parts auto-unlocked from outfit pack)

Customize-tab `EquipPanel` (slide-up sheet for Pets/Boards/Pieces/Effects/
Wins/Frames) reliably shows the equipped item with a yellow EQUIPPED
badge + the rest as either EQUIP (owned) or 🔒 LOCKED.

## Visual / formatting issues fixed

1. **EquipPanel modal header was hidden** — sheet was anchoring to a
   stale React Navigation parent at viewport y=-66.5/h=689 instead of
   the PhoneFrame screen. Sheet's flex:1 + flex-end docked the bottom
   correctly but the top extended above the visible phone bezel.
   *Fix*: switched backdrop + sheet to absolute positioning, capped sheet
   height at 400px (conservative across all category contexts).

2. **PartGrid rendered placeholder hash-color squares** instead of the
   2870 Unity-rendered part thumbnails. The wiring existed in `partThumbs.ts`
   but never reached PartGrid.
   *Fix*: added `getPartThumb` prop to CharacterCreator → useFaceTab /
   useHairTab / useOutfitTab → PartGrid → PartChip. Now every thumbnail
   shows the actual rendered part (the player can see exactly what
   they're equipping).

3. **DAILY CHALLENGES title overlapped** the floating DAILY/MILESTONES
   tab pill. ChallengesScreen.styles.headerGradient.paddingTop bumped
   12 → 48 to clear the absolute-positioned switcher.

4. **Bundle cards (Get More Coins / Get More Gems) overflowed the
   PhoneFrame** — width:'47%' didn't compute through PressScale wrapper,
   so 4 cards rendered in a single row, clipping leftmost + rightmost.
   *Fix*: switched to fixed pixel width (168px) → 2-per-row layout.

## UX improvements

* **All 4 blocking native dialogs replaced** with a styled
  `ConfirmDialog` component (PreviewSafeModal-backed). The previous
  `window.confirm()` / multi-button `Alert.alert` calls froze the web
  preview AND looked off-brand:
  * ShopScreen: emote purchase confirm (was `window.confirm`)
  * ShopScreen: emote not-enough-coins alert (was `window.alert`)
  * ShopScreen: pet purchase confirm + not-enough-coins (both)
  * CharacterCreatorScreen: locked-part buy confirm + not-enough-coins
  * CharacterCreatorScreen: starter-wardrobe-unlocked prompt (was `Alert.alert` w/ `cancelable: false`)

  ConfirmDialog supports both **2-button mode** (Cancel / Confirm) and
  **single-button mode** (`confirmOnly: true`) for terminal alerts.

* **PartGrid thumbnails painted** (per #2 above) — the visual DNA of the
  customize tab is now the same WYSIWYG painted-product art language as
  the shop instead of debug-color placeholders.

## Screens audited (no issues found)

- Home (3D character with elven outfit + Max the dog visible next to PLAY)
- Customize dashboard (3x3 category grid, 3D character stage)
- Customize creator (BODY / FACE / HAIR / OUTFIT / COLOR — all clean)
- Settings (audio toggles, what's new list)
- Profile (70 OVR badge, Bronze tier, daily goals)
- Career → matchup screen (Player vs Rookie Ron, READY CTA)
- Game (Connect-4 board with Classic Blue theme, score header)
- Daily Reward popup (Day 2 of 7, 150 Coins, CLAIM REWARD)
- Daily Spin Wheel (SPIN & WIN, full prize wheel)
- Loot Bags section (Standard / Premium / VIP)

## Commits this session (in order)

```
645abd9 shop: bundle cards width '47%' → fixed 168px (4-in-row overflow fix)
d1e3633 challenges: title no longer collides with floating SubTabSwitcher pill
533e255 shop + creator: ConfirmDialog also handles "not enough coins" + starter prompt
30dc121 shop: pass getPartThumb to CharacterCreator
05b7320 creator: PartGrid renders actual Unity-rendered part thumbnails
dde77e9 shop: styled ConfirmDialog replaces blocking native confirm for pets/emotes
49e5118 phoneframe: revert position:relative on screen (broke Customize layout)
94ffaec customize: tighten EquipPanel sheet cap 480→400 for parent variance
baba0b4 customize: cap EquipPanel sheet height + force absolute positioning
ecc6ac0 shop: rename dead PACK_ICON emoji map to _LEGACY_PACK_ICON
ed66cfd shop: outfit cards use chunky 3D pack covers (drop emoji glyphs)
270b95b shop: wire LOOK_ICONS map → CharacterCreator.lookIcons
67c6885 creator: HAIR/FACE tab body needs flex:1 to clamp PartGrid
2bc8d3e creator: section hierarchy + soft active pill + painted dice icon
5d66100 shop: chunky 3D icon batch + per-part Unity thumbnails + customize fix-up
```

### Follow-up polish pass (4-6pm)

Visual / dead-code:
```
39b25e8 animationpicker: Random tile dice glyph -> painted dice icon
88fc1d8 shop: delete dead _LEGACY_PACK_ICON emoji map (19 lines)
ef262ac customize: EquipPanel pets show painted breed icons (drop 🐾 fallback)
ac15b47 animationpicker: now-playing 🎲 badge → painted dice + clean text
```

Layout bugs (PressScale + flex):
```
6477935 shop: AmgPartPreviewModal BUY button — 2:1 width ratio actually applies
99d28b1 shop: OutfitPreviewModal action row — Close vs primary now actually 1:2
```

Buy-dialog UX (rarity label, balance, shortfall, after-balance):
```
8be95dd creator: inline buy dialog shows rarity label + coin balance
43ee46d creator: not-enough-coins dialog calls out the shortfall amount
a072ea0 shop: not-enough-coins dialogs surface the shortfall amount
a4c1e52 shop: buy-confirm dialogs preview the post-purchase balance
722be23 creator: inline buy dialog also shows post-purchase balance
```

Web event-handling fixes:
```
3f344fe topbar: avatar onClick fallback fixes intermittent profile open on web
deb4c00 topbar: CurrencyPill "+" button onClick fallback for reliable web taps
```

Alert.alert → ConfirmDialog migration (multi-button no-op on RN-Web):
```
f96f868 seasonpass: Premium upgrade dialogs use ConfirmDialog
2318105 game: quit-match prompt uses ConfirmDialog
d775bbe settings: Reset All Progress confirm uses ConfirmDialog
```

Matching amg-engine commits:
```
95d8646 creator: FaceTab "Random Face" inline dice glyph → painted icon
1b05ed4 creator: PartGrid locked-part scrim — lock glyph reads vs painted thumb
```

Layout bugs caught in 4-6pm pass: both preview modals had a PressScale
+ flex pattern that silently collapsed BUY to text-width. PressScale's
`style` prop applies to its inner Animated.View, not the outer
Pressable — flex split must go through `containerStyle`.

RN-Web Alert.alert gotcha: multi-button configs (Cancel + Confirm)
silently no-op — the dialog never renders, so the destructive action
is one tap away with zero confirmation. Single-button alerts work
fine. Migrated three of the most-used multi-button sites:
- Premium Pass upgrade (was 2-step Alert chain)
- Mid-match quit (was Quit Match? Cancel/Quit)
- Reset All Progress (was the most destructive button in the app —
  arguably a safety bug since players could nuke their save without
  ever seeing a confirm on web).

Buy-dialog UX before/after:
- Before: "This common item costs 80. You have 40."
- After:  "This COMMON part costs 80. You have 40 — short by 40."
- Before: "Costs 500 coins. You have 1500."
- After:  "Costs 500 coins. You have 1500, will leave 1000."

Three-flow consistency: emote buy, pet buy, and creator-part buy all
read the same way — rarity label, balance call-out, shortfall on
fail, after-balance on confirm.

Plus matching `amg-engine` commits for the shared character-creator
package work (see that repo's log).

## What's left (optional polish)

* **Effect/Win preview cards** still use emoji icons inside their
  animated EffectPreviewCard. Intentional — the emoji is part of the
  effect representation.
* **Boxes tab loot box icons** (📦 🎁 ✨ 💎) — already swapped for the
  rendered LootChest component (bronze/silver/gold/diamond tiers), no
  emoji left in lootbox previews.
* **TopBar "Open profile" press from Home** — sometimes doesn't navigate
  on first tap (intermittent web-preview repro; works via
  `window.__nav.navigate('Profile')` which suggests the route IS
  registered). Worth a closer look if the issue persists on real
  devices.
* **dog_coyote pet icon** — petRegistry has the breed but the
  `dog_coyote_idle.png` doesn't exist yet, so the EquipPanel falls back
  to the 🐾 emoji for that one row. Run the Unity dog renderer to add.

## Testing

Pre-commit hook ran clean on every commit:
```
typecheck — 0 errors
jest      — 47/47 passing
```

47 tests across 5 suites unchanged.
