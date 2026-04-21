# Polish Follow-Ups Queue

The continuous polish loop (`tools/polish-loop.sh`) picks from this list. Add ideas here when you notice something too big for a single iteration.

## Open — Playtest-driven fixes (2026-04-20 session, NEW HIGH PRIORITY)

Devon's playtest pass surfaced these. Each is self-contained and sized for one polish iteration.

<!-- Shipped: Defer "Tap Your Character!" tooltip — 5-min cooldown after welcome dismiss (HomeScreen) -->
<!-- Shipped: Defer "Need Help?" tooltip — 10-min cooldown after welcome dismiss (GameScreen) -->

<!-- Shipped: Encouraging message on first-game loss — overrides generic quote with "Great first try!" when matchHistory has exactly 1 game -->

- **Bot persona avatars.** Every bot in MatchupScreen/GameScreen uses the same generic player outfit. Add a `portrait: string` or `glb: string` field to each BOT_POOL persona and render a distinct 3D portrait / emoji per bot. "Rookie Ron" with a rookie cap, "Savage Sam" with a skull — sells the character.

- **Match-end coin/XP count-up animation.** The game-over screen shows final score but the reward doesn't animate. Add a count-up from 0 → earned amount for coins + XP on win, so the dopamine hits right. Maybe 800ms cubic-easeOut with a scale pulse.

- **First-time creator "Tap your character" tooltip defer.** Same pattern — don't stack another popup right after Welcome. Gate on welcome_dismissed_at.

- **GameScreen match-end: show winning line animation.** When the winning 4 pieces light up, add a sparkle/shimmer sweep across them over 600ms. Currently they just go static colored.

- **Easy AI tuning round 2.** First pass bumped miss-win to 30% and miss-block to 45%. Verify a playtest with a fresh player wins their first Easy game ~80% of the time. If not, bump to 40% miss-win / 55% miss-block.

- **Shop Clothes: 3D thumbnails (LARGE — split into 2 iterations).** Emoji thumbnails work but the real win is a 64×64 rendered GLB preview. Iteration 1: implement `AmgPartThumbnail3D` that mounts a tiny R3F Canvas with JUST the part mesh (no full character) against a dark disc. Iteration 2: swap emoji for the new component in AmgPartCard. Cache materials so the grid scroll stays 60fps.

- **Shop Clothes: long-press preview modal.** Tapping buys, long-press opens a modal showing the full player character with JUST this part swapped in. Helps players commit to a purchase. Reuses CompositeCharacter from @amg/character-runtime.

- **Bottom tab badges.** Shop tab could get a small red dot when new shop rotation hits (currently static). Missions tab already has badge for unclaimed — extend pattern to Shop + Customize (Customize dot if player has unequipped clothes newly unlocked this week).

- **Career: tap the NEXT circle on CareerMap to jump straight into the matchup sheet.** Currently tapping any level circle goes to CareerCity (shipped, good). Next iteration: for the single NEXT level, skip the city sheet and open the match sheet directly — saves a tap on the most common action.

- **Post-match: show "+1 owned part" hint if career win unlocks a part.** Career match sheet lists rewards; after winning, show a subtle toast or confetti.

- **Streak freeze visible.** characterStore / shopStore tracks streak freeze charges but it's only surfaced in DailyRewardPopup. Add a small icon in the TopBar (next to the streak flame) when player has freezes available, with a tap-to-explain tooltip.

<!-- Shipped: CharacterCreatorScreen audit — file has no StyleSheet at all after AMG repurpose; no dead styles to remove -->

## Open — GTA-meets-Sims shop integration (HIGH PRIORITY)

Foundation already shipped (commit 18fbbdc): `ownedAmgParts` on characterStore + `amgPartPricing.ts` + `handleLockedPart` in CharacterCreatorScreen spends coins + unlocks. Shop UI scaffold shipped (commits 2ee926f, e05018a): AmgPartCard + amgPackMeta + Clothes tab in ShopScreen rendering the R2 manifest grouped by pack. The remaining items are visual polish + edge cases. Each sized for ONE polish iteration — ship one, commit, next iteration picks the next.

<!-- Shipped: Shop AMG Parts tab scaffold — ShopScreen.tsx now has a 'clothes' tab that fetches R2 manifest and renders pack-grouped grids with species chip filter (commit e05018a) -->
<!-- Shipped: Shop Part card component — src/components/ui/AmgPartCard.tsx (commit 2ee926f) -->
<!-- Shipped: Shop Pack emoji + display name lookup — src/data/amgPackMeta.ts (commit 2ee926f) -->

<!-- Shipped: Shop Clothes tab owned count per pack — section headers now show N/M (commit 527ae83) -->


- **Shop Clothes tab: collection tab filter chips.** Add a second chip row below species: "All / Upper Body / Lower Body / Face / Accessories". Maps ALLOWED_SLOTS into 4 buckets so players can browse by what they want to change. Define buckets: upperBody=[Torso, ArmUpperLeft/Right, ArmLowerLeft/Right, HandLeft/Right], lowerBody=[Hips, LegLeft/Right, FootLeft/Right], face=[Head, Hair, FacialHair], accessories=[AttachmentHead, AttachmentFace, AttachmentBack].

- **Creator: lock overlay on part thumbnails.** In `@amg/character-creator`'s `PartGrid` component (packages/character-creator/src/controls/PartGrid.tsx), when a part is NOT in `ownedParts`, render a darkened overlay + padlock icon + price chip ('500 🪙') using the same `getPartPrice` price. Tapping a locked part already calls `onLockedTap(partName)` which fires the handleLockedPart buy flow in Drop4. This is UI only — the data is already wired.

- **Creator: rarity-tinted border on part cards.** Thin 2-px border matching `RARITY_COLORS[rarity]` around every part thumbnail in the creator's Outfit / Hair / Face pickers. Subtle but sells the economy.

- **Shop: preview modal on long-press.** Tapping a shop card adds to cart / buys; long-press opens a `<CharacterPreviewModal>` that mounts a `<CompositeCharacter>` rendering the current player wearing JUST this part swapped in. Helps players decide before spending.

- **Creator: "BUY X PARTS" bulk action.** When the player selects multiple locked parts (tap to select instead of equip, then tap again), a bottom bar shows total cost + a `Buy All` button that dispatches the sum to `spendCoins` in one shot. Great for outfit-pack purchases.

- **Shop: "NEW" badge on parts unlocked this week.** Track `unlockedAt: Date` when `unlockAmgPart` fires; show a red NEW badge on the part card in the Collection → Clothes section for 7 days so players notice their recent purchases.

- **Collection: Clothes tab.** Add a new tab to `src/screens/CollectionScreen.tsx` listing every part the player owns (via `ownedAmgParts` + starter packs), with counts per pack and "Equip" CTA that deep-links to the creator with that part preselected.

- **Daily deal on AMG parts.** shopStore already rotates 4 daily featured deals (legacy outfits). Add a 5th slot that picks a random rare-or-epic AMG part and discounts it 40%. `shopStore.dailyAmgDeal` + `refreshDailyDeals` picks one at rollover.

- **Starter pack unlock ceremony.** First-run onboarding: when the creator mounts for the first time, briefly show a "starter wardrobe unlocked" toast listing the free packs (Modern Civilians 12 outfits, base heads/hair for all 5 species). Sells the "you already own a bunch of cool stuff" hook.

## Open — visual / UX polish

- Crossfade outfit mesh when the player switches in the creator (currently hard-cuts on GLB swap)
<!-- ShopScreen species + collection chips migrated to FilterChip (commit TBD) -->
<!-- Character3DCreatorScreen species + pack chips migrated to FilterChip (commit TBD) -->
- Extract the blur backdrop style from modals (EmotePickerModal3D, OutfitPreviewModal, MilestoneToast, HSLColorPicker) into a reusable `<BlurOverlay>` component
- Audit `Animated.Value` uses — some could move to Reanimated `useSharedValue` for native-thread perf
<!-- ProfileScreen 3D portrait shipped below -->
<!-- MilestoneToast 3D preview + pulsing glow + confetti shipped below -->
- DailyRewardPopup day-7+ could show a scaled-up celebration (confetti, bigger icon) when the reward is outfit/pet/title vs coins
<!-- Shop "Outfit of the Day" HOT badge pulse + warm glow shipped below -->

## Open — retention polish

<!-- Streak-recovery shipped as streak freeze (commit 7ae43f0) — 1 charge/week auto-applies on missed day -->
<!-- Welcome-back bonus shipped (commit 863e8af) — 500 coins + 1 gem on 3+ day return -->
- Milestone screen in Profile showing progress toward each milestone (bars, percentages) — partially covered by Collection > Awards, could expand
- Notification to claim daily spin if they opened the app but forgot (1h after last open)

## Open — code quality

<!-- friends.ts, friendsStore.ts, EmoteWheel.tsx, EmoteBar.tsx deleted (commit cc58c09) -->
<!-- matchmaking.ts + emotes.ts + firebase.ts + EloChangeAnimation deleted (commits 0c037bf, 61d02ac, 79b2b2b) -->
<!-- GameScreen 202 lines of MP code stripped (commit df49f2a) -->
<!-- StageScreen.tsx deleted — unreachable (commit a9d922b) -->
<!-- seriesStore.ts deleted — zero importers after MP kill (commit TBD) -->
- MatchHistoryScreen — does it still render anything meaningful without multiplayer match history? Consider scoping to AI-only or removing
- Migrate Zustand stores to the new subscribeWithSelector pattern for the milestone detection hook (current implementation polls on render)
<!-- src/screens/CharacterCreatorScreen.tsx was repurposed (commit a61651a era) as the AMG creator wrapper that bridges RootNavigator to @amg/character-creator. DO NOT delete — it is the live screen behind the 'AmgCreator' route. The OLD 2D creator code that used to live at this path is gone (replaced wholesale). -->
- (Reserved slot — see comment above re: CharacterCreatorScreen.tsx repurpose; do not re-flag it as unreachable.)
<!-- GameScreen isOnlineMatch / onlineMatchId / myPlayerNum stripped (commit 40316bc). WagerCourtParams, rankedMode, rankedClockSeconds deleted (commit e2be2a5). MatchupParams.wagerAmount and dead 'ranked'|'wager' mode values cleaned (commit TBD). -->

## Open — beta prep

<!-- Interactive first-launch walkthrough shipped (commit c12142d) — 4-page carousel replaces bullet list -->
- App Store / Google Play screenshots — use web preview at 1920×1080 bucket
<!-- LegalScreen privacy + terms content shipped (commit f14b12d). Still needs a lawyer review pass + the {{SUPPORT_EMAIL}} / {{COMPANY_ADDRESS}} constants updated with final values before submission. -->
- App icon final export (1024×1024, no alpha for iOS)
- Splash screen polish (already has SplashAnimation component)
- Error boundary coverage — ensure ErrorBoundary wraps every screen, not just root
- First-launch tutorial: currently WelcomeOverlay is a bullet list. Consider an interactive 3-screen walkthrough
- Beta tester onboarding — a `/beta` skill or a README section for friends getting TestFlight invites

## Done (recent)

- Multiplayer infrastructure killed for v1 (commit 00d9891)
- Shop rotation with 4 daily featured deals (commit 5e904c0)
- Streak escalation with milestones (commit 5e904c0)
- Local push notifications for daily reminders (commit 5e904c0)
- Collection milestones with unique title rewards (commit 5e904c0)
- Feature flag cleanup post MP-kill
- `FilterChip` shared component
- Character3D shadow map 1024→512
- PressScale + GlossyButton accessibility labels
- Outfit shop cards with rarity gradients + pack emojis
- Preload player outfit + default idle at app startup
- T-pose fix (skeleton rebinding + track path stripping) — commit 67c3d97
- MilestoneToast pulsing glow + confetti + 3D hero slot (character or pet) with emoji corner badge
- Shop "Outfit of the Day" HOT badge pulse + warm orange glow (commit d3ac84f)
- Push notification content variants — 4 morning / 4 evening / 4 Saturday copy rotations
- ProfileScreen portrait upgraded to live 3D character (commit c74c94f)
- Deleted dead friends + emote wheel/bar code, 1,103 lines (commit cc58c09)
- LegalScreen privacy + terms ready for app store review — account deletion, analytics disclosure, push notifications, GDPR/CCPA, governing law (commit f14b12d)
- Home Screen visual overhaul — logo PNG swap, CUSTOMIZE button out of absolute positioning, Emotes/Idles buttons upgraded, dead MP removed from Settings What's New (commit f477757, 700d559)
- Character Creator T-pose fix — DEFAULT_HUMAN_IDLE fallback (commit 3cad509)
- Shop "Elven·Elven" filter labels fixed (commit 19f2e73)
- GameScreen MP code stripped — 202 lines of dead online match code (commit df49f2a)
- Deleted matchmaking.ts + emotes.ts + firebase.ts + EloChangeAnimation — ~1,100 lines (commits 0c037bf, 61d02ac, 79b2b2b)
- Emote/Idle picker: AnimationPicker uses 3D character, character tap plays emote directly instead of opening wheel (commit 296600c)
- Logo auto-cropped to content, EmotePickerModal3D + EmoteShowcase dead code removed from lobby (commits 8559959, 999d2e5)
- Awards tab: 15-milestone collection ladder with progress bars (commit 13cb24f)
- ErrorBoundary: web reload + wired Go Home handler (commit 4738f80)
- Deleted dead IdlePicker.tsx — 365 lines, replaced by AnimationPicker (commit 70385e0)

### 2026-04-17 autonomous Phase 2 session
- Career jeopardy levels — 3× coin multiplier, tougher opponents, dedicated badge + chip (commit d64c8d3)
- Career moves-limit levels — Candy-Crush target style with HUD move counter (commit d64c8d3)
- Chapter boss seed boards — each of levels 12/24/36 gets a signature opening position (commit 293d51a)
- CityCompletionCeremony — 'CITY CLEARED' reveal modal fires on chapter boss wins (commit 96849a7)
- Streak freeze — 1 auto-save charge per week, surfaced in Profile + DailyRewardPopup (commit 7ae43f0)
- Welcome-back bonus — 500 coins + 1 gem modal for 3+ day returns (commit 863e8af)
- Interactive 4-page welcome walkthrough — replaces bullet-list welcome (commit c12142d)

### 2026-04-17 session
- Audio overhaul: 13 → 24 sounds (Kenney Interface Sounds pack) + 20 silent `haptics.error()` sites wired up + fixed 5 silent `playSound('purchase')` callers (commit 2733f48)
- GlossyButton internal PressScale — ~40 call sites across Play/Home/Matchup/Profile/Learn/LocalPlay/SeasonPass/Roster now have tactile press feedback + click sound (commit 360bc51)
- MainTabs bottom tab icons — spring scale bounce on focus change
- CosmeticPreviewModal + OutfitPreviewModal — animationType none → slide
- Shop ShopItemCard + PetCard — PressScale wraps
- Character3D lighting overhaul — brighter ambient + stronger rim + warm platform glow (commit dcd4e1e)
- CollectionScreen sub-tabs + ProfileScreen link cards + ChallengesScreen CLAIM buttons — PressScale (commit 65a3790)
- ShopScreen category tabs — PressScale (commit 58bd6aa)
- SeasonPass CLAIM buttons — PressScale + PulseGlow halo (commit 6bfb8c2)
- SettingsScreen SettingLink rows — PressScale on shared component, benefits every row (commit 52e993b)
- HomeScreen character tap — instant onPressIn squeeze animation (commit 994ee51)
- docs/ANIMATION_INVENTORY.md — 126-line severity audit of every interactive element
- docs/COMFYUI_PROMPT_PACK.md — 254-line Flux prompt pack for app icon, splash, logo, screenshots
- Branch simplification: killed polish-loop branch, polish loop writes to main, pre-commit hook (tsc+jest) is the only gate

<!-- The polish loop moves items here with a commit SHA when shipped -->
