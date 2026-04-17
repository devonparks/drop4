# Drop4 Animation Inventory Audit

Generated: 2026-04-17

Scope: every tappable / interactive element across primary screens, modals, tab
navigation, and character interactions. Each row lists the current animation
(or lack thereof), a severity, and a concrete fix suggestion.

**Animation library available** (`src/components/animations/`):
PressScale, Shimmer, PulseGlow, StaggeredEntry, CountUp, BreathingView,
SlideReveal. All built on Reanimated 3, haptics auto-integrated in PressScale.

---

## Summary

| Severity | Count | What it means |
|---|---|---|
| CRITICAL | 6  | Interactive feels broken — zero visual feedback where user expects it |
| HIGH     | 17 | Feels cheap — card/tab/button with only haptics, no press scale or hover |
| MEDIUM   | 11 | Nice-to-have polish — missing reveal, transition, or idle motion |
| LOW      | 6  | Cosmetic polish — entry stagger, micro-shimmer, secondary flair |

**Top quick wins (Monday pick-list, in order of impact):**
1. Wrap `GlossyButton` internally with `PressScale` — fixes ~40 buttons across Play, Home, Profile, Matchup, Learn, LocalPlay in one change.
2. Add press scale to the 5 bottom tab icons (MainTabs.tsx) — every navigation feels dead right now.
3. Add press scale to Shop item/pet cards + all tab/filter Pressables.
4. Add `SlideReveal` to the three modals currently using `animationType="none"` (CosmeticPreviewModal, OutfitPreviewModal, in-game end modal backdrop fade).

---

## CRITICAL — feels broken, fix first

| Location | Element | Current Animation | Fix |
|---|---|---|---|
| `src/components/ui/GlossyButton.tsx` | Every GlossyButton (~40 call sites: Play difficulty buttons, Home PLAY/CAREER/LOCAL, Profile Stats/Settings, Matchup READY, Learn PRACTICE NOW, LocalPlay START, SeasonPass tabs etc.) | Haptics only, **no press feedback at all** | Wrap the internal `Pressable` with shared press-scale logic (duplicate PressScale's `useSharedValue` scale transform). One change fixes the whole app. |
| `src/navigation/MainTabs.tsx` lines 16-29 (`TabIcon`) | All 5 bottom-tab icons (Home, Challenges, Collection, Profile, Shop) | Haptic on tabPress, opacity swap on focus. **No scale/bounce on tap.** | Wrap `TabIcon` in `Animated.View` + run a spring scale 1 → 1.12 → 1 on focus change. Major feel win — this is touched every session. |
| `src/screens/ShopScreen.tsx:356` (`ShopItemCard` Pressable) | Shop item cards — outfits, pieces, boards, effects, emotes | FadeInDown entry only, **no press scale** on tap-to-equip/buy | Wrap inner Pressable in `PressScale scaleTo={0.97}`. Cards bought/equipped constantly. |
| `src/screens/ShopScreen.tsx:452` (`PetCard` Pressable) | Shop pet cards | FadeInDown entry only, **no press feedback** | Same fix as item cards — wrap with `PressScale`. |
| `src/components/ui/CosmeticPreviewModal.tsx:167` | Cosmetic preview modal (opens on Shop item tap) | `animationType="none"` — **snaps in with zero transition** | Wrap modal content in `SlideReveal from="bottom"` or use `animationType="slide"`. Currently jarring. |
| `src/components/ui/OutfitPreviewModal.tsx:61` | Outfit preview modal | `animationType="none"` — **snaps in** | Same fix — `SlideReveal` or `animationType="slide"`. |

---

## HIGH — feels cheap

| Location | Element | Current Animation | Fix |
|---|---|---|---|
| `src/screens/CollectionScreen.tsx:50` | Collection sub-tabs (Characters / Loot / Awards) | Haptic only | Wrap in `PressScale scaleTo={0.94}` or add underline-slide indicator animation. |
| `src/screens/ShopScreen.tsx:745` | Shop category tabs (outfits / pieces / pets / boxes etc.) | Haptic only | `PressScale` — or switch to shared `FilterChip` (which already uses PressScale). |
| `src/screens/ShopScreen.tsx:781, 820` | Shop species filter pills + collection filter pills | Haptic only | Already exists as `FilterChip` — swap inline Pressable for that component. |
| `src/screens/HomeScreen.tsx:390, 482` | Emotes + Idles side buttons on Home character stage | Haptic only (wrapped in bare Pressable) | Wrap in `PressScale`. These are the most discoverable emote entry points. |
| `src/screens/HomeScreen.tsx:502` | CUSTOMIZE button under character | Haptic only | `PressScale scaleTo={0.96}`. |
| `src/screens/HomeScreen.tsx:413` (character tap Pressable) | Character tap (plays emote) | `BreathingView` idle only — no press scale on tap, no punch when emote fires | Add `PressScale` *inside* BreathingView for the press-in squeeze. |
| `src/screens/ProfileScreen.tsx:220` | Share Profile button | `pressed && { opacity: 0.7 }` only | Replace with `PressScale`. |
| `src/screens/ProfileScreen.tsx:329, 340` | Stats + Settings profile links | No animation | `PressScale scaleTo={0.98}`. |
| `src/screens/ProfileScreen.tsx:415` | VIEW ALL achievements button | No animation | `PressScale`. |
| `src/screens/ProfileScreen.tsx:473` | "View All →" match history link | No animation | `PressScale`. |
| `src/screens/ChallengesScreen.tsx:112, 492, 554` | CLAIM buttons (daily + weekly challenges) | Daily has `PulseGlow` parent; **the Pressable itself has no press scale**, weeklies have nothing | Wrap each `Pressable` in `PressScale scaleTo={0.93}`. |
| `src/screens/ChallengesScreen.tsx:408` | CLAIM REWARD BAG big button | `PulseGlow` wrapper, no press scale | Add `PressScale` around the Pressable. |
| `src/screens/SettingsScreen.tsx:57` | Every `SettingLink` row (Sign In, Legal, Support, etc.) | Haptic only | `PressScale scaleTo={0.98}` or add row highlight on press. |
| `src/screens/SettingsScreen.tsx:305` | Reset All Progress (danger) button | No animation | `PressScale` + maybe red PulseGlow for gravitas. |
| `src/screens/LocalPlayScreen.tsx:78, 108, 165` | Player-name inputs + start buttons | None | `PressScale` on START/CANCEL buttons. |
| `src/screens/MatchHistoryScreen.tsx:37, 54` (`FilterChip`, `SortChip`) | Filter + sort chips (local copies, NOT shared FilterChip) | Haptic only | Replace with shared `src/components/ui/FilterChip.tsx` or wrap these in `PressScale`. |
| `src/screens/Character3DCreatorScreen.tsx:132` | 7 tabs across top (Outfit/Body/Skin/Hair/Colors/Pets/Emotes) | Haptic only | `PressScale scaleTo={0.95}`. |

---

## MEDIUM — nice-to-have polish

| Location | Element | Current Animation | Fix |
|---|---|---|---|
| `src/navigation/RootNavigator.tsx:111` | Stack screen transitions | Mix of `slide_from_right`, `fade`, `fade_from_bottom` — already decent | Verify gesture-back feels right on Settings/Shop/Profile; consider `slide_from_bottom` for modal-like screens (Stats, MatchHistory). Currently fine but inconsistent. |
| `src/components/ui/EmotePickerModal.tsx:256, 265` | Emote / Chat tab switch | Haptic, no animated indicator | Animate underline or background-pill slide between tabs. Would feel premium. |
| `src/components/ui/EmotePickerModal.tsx:234` | Whole modal | `animationType="slide"` (OK) but cards inside pop in with no stagger | Wrap `ALL_EMOTES.map(...)` in `StaggeredEntry` for grid reveal. |
| `src/components/ui/AnimationPicker.tsx:94` | Animation picker modal | `animationType="slide"` (OK) | Add `StaggeredEntry` on inner emote / idle list for cascade reveal. |
| `src/components/ui/DailySpinWheel.tsx` | Claim reward overlay after wheel stops | Wheel itself animates; result card snaps in | Add `ZoomIn.springify()` on reward card. |
| `src/components/ui/DailyRewardPopup.tsx:35` | Daily reward popup | `animationType="none"` + `SlideInDown` inside (OK) | Fine; verify dismiss animation also has a fade-out (some paths reset to `null` instantly). |
| `src/screens/CareerMapScreen.tsx:136` | City/zone cards | `PressScale` present | Also add a `SlideReveal from="bottom"` per city on scroll-into-view so the map feels alive. |
| `src/screens/CareerMapScreen.tsx:566` | Individual level nodes in the grid | `PressScale` | Add per-node `StaggeredEntry` on first mount; the 12-node grid popping in at once feels flat. |
| `src/screens/SeasonPassScreen.tsx:132, 173` | Free-tier + premium-tier CLAIM buttons | No animation | `PressScale` + `PulseGlow` on claimable tiers. |
| `src/screens/LootBoxScreen.tsx:257, 269` | OPEN / BUY buttons inside box cards | Haptic via LootChest only | Wrap inner Pressable in `PressScale scaleTo={0.93}`. |
| `src/components/ui/TutorialTooltip.tsx:112` | GOT IT dismiss button | Tooltip has `spring` slide-in; button itself has no press scale | `PressScale` on GOT IT. |

---

## LOW — cosmetic polish

| Location | Element | Current Animation | Fix |
|---|---|---|---|
| `src/screens/HomeScreen.tsx:155` | Pet bounce on tap | Custom `Animated.spring` bounce + heart float — already great | None. Reference implementation. |
| `src/screens/HomeScreen.tsx:517` | Menu buttons (PLAY/CAREER/LOCAL PLAY) | `SlideReveal` staggered entry + `PressScale` wrapper — excellent | None. Reference implementation. |
| `src/screens/CollectionScreen.tsx:115` | Character cards in Collection | `StaggeredEntry` + `PressScale` — good | Consider a `Shimmer` on equipped card for the equipped glow. |
| `src/screens/ShopScreen.tsx:719` | Coin + gem displays in header | `Shimmer` on both — good | None. |
| `src/screens/ProfileScreen.tsx:235` | XP bar when `xp > 0` | `Shimmer` wrap — good | None. |
| `src/screens/ChallengesScreen.tsx:38` | Claimable challenge cards | Custom `Animated.loop` scale pulse on ready state — good | Consolidate to `BreathingView` + `PulseGlow` combo for consistency. |

---

## Observations / cross-cutting notes

- **GlossyButton is the single biggest lever.** One change inside GlossyButton.tsx (adding a shared value + scale transform around the internal `Pressable`) would lift the feel of Play, Home, Matchup, Profile, Learn, LocalPlay, SeasonPass, Roster, and every `<GlossyButton />` call site in the app. Estimated ~40 sites.
- **Two reveal libraries in play.** Codebase mixes React Native's `Animated` API (HomeScreen sparkles, TopBar coin flash, TutorialTooltip) with Reanimated 3 (everything new). Both fine, but consolidating custom loops into `BreathingView`/`PulseGlow` would reduce duplication.
- **Modal inconsistency.** `MatchupScreen` end-of-game modal uses `animationType="none"` + manual `SlideReveal`; `CosmeticPreviewModal` / `OutfitPreviewModal` also `animationType="none"` but with **no** slide reveal inside — that's the CRITICAL fix. Otherwise, align all custom modals on the SlideReveal pattern for consistency.
- **Tab switches are flat everywhere.** Collection sub-tabs, Shop category tabs, EmotePickerModal tabs, Character3DCreator tabs, MatchHistory sort/filter chips — all haptic-only. A single shared `TabBar` primitive with an animated indicator would fix all of them at once.
- **Shared `FilterChip` component exists** but is only used by `Character3DCreatorScreen` so far. Shop + MatchHistory have their own inline copies without press scale. Quick refactor.
- **No character tap press-scale.** The tap on the Home character plays an emote (great), but the Pressable itself has no press-down squeeze; feels like the tap might be ignored until the emote fires ~200ms later. Wrapping with PressScale inside BreathingView would make the tap feel instant.
- **Bottom-tab active indicator** (`activeIndicator` at `src/navigation/MainTabs.tsx:142`) jumps between tabs with no slide. Animating its `left` or using a Reanimated layout transition would feel much more premium — Instagram-style.

---

## Recommendations by effort tier

**30-minute fixes** (high leverage, minimal code change):
1. Internal `PressScale` wrap inside GlossyButton — fixes ~40 buttons.
2. Swap inline Pressables in Shop + MatchHistory for shared `FilterChip`.
3. Change `animationType="none"` → `"slide"` on the two preview modals (CosmeticPreviewModal, OutfitPreviewModal).

**1–2 hour fixes**:
4. Wrap all CRITICAL/HIGH Pressables with `PressScale`.
5. Add scale-pop on `TabIcon` when `focused` changes.
6. Animated indicator slide under MainTabs active tab.

**Bigger refactor** (skip for v1 unless player-facing value):
7. Shared `TabBar` primitive with animated underline — would touch CollectionScreen, ShopScreen, EmotePickerModal, Character3DCreatorScreen.
8. Consolidate custom `Animated.loop` pulses on ChallengesScreen into `PulseGlow`/`BreathingView`.
