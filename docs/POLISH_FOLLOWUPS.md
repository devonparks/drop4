# Polish Follow-Ups Queue

The continuous polish loop (`tools/polish-loop.sh`) picks from this list. Add ideas here when you notice something too big for a single iteration.

## Open — visual / UX polish

- Crossfade outfit mesh when the player switches in the creator (currently hard-cuts on GLB swap)
- Migrate Character3DCreatorScreen + ShopScreen pack chips to the shared `<FilterChip>` component (src/components/ui/FilterChip.tsx exists)
- Extract the blur backdrop style from modals (EmotePickerModal3D, OutfitPreviewModal, MilestoneToast, HSLColorPicker) into a reusable `<BlurOverlay>` component
- Audit `Animated.Value` uses — some could move to Reanimated `useSharedValue` for native-thread perf
- PortraitFrame on ProfileScreen still uses the 2D player_idle.png. Swap to a Character3DPortrait wrapped in the tier frame for a premium card look
<!-- MilestoneToast 3D preview + pulsing glow + confetti shipped below -->
- DailyRewardPopup day-7+ could show a scaled-up celebration (confetti, bigger icon) when the reward is outfit/pet/title vs coins
<!-- Shop "Outfit of the Day" HOT badge pulse + warm glow shipped below -->

## Open — retention polish

- Streak-recovery mechanic — one "freeze" per week so a single missed day doesn't reset progress
- Milestone screen in Profile showing progress toward each milestone (bars, percentages)
- Welcome-back bonus if player returns after 3+ days away (coins + free outfit of choice)
- Notification to claim daily spin if they opened the app but forgot (1h after last open)

## Open — code quality

- Dead Firebase-related services (friends.ts, matchmaking.ts, emotes.ts remote, firebase.ts itself) now unused after MP kill — safe to delete but test first
- `seriesStore.ts` still referenced by GameScreen for single-player series — keep but simplify
- Delete `src/services/friends.ts` and `src/services/matchmaking.ts` — nothing imports them post MP-kill
- MatchHistoryScreen — does it still render anything meaningful without multiplayer match history? Consider scoping to AI-only or removing
- StageScreen (wager courts) — kept the file but the courts require multiplayer to actually wager. Either gate behind `goldCourt` flag or reframe as "practice courts"
- Migrate Zustand stores to the new subscribeWithSelector pattern for the milestone detection hook (current implementation polls on render)

## Open — beta prep

- App Store / Google Play screenshots — use web preview at 1920×1080 bucket
- Privacy policy + terms of service legal pages (LegalScreen exists, write real content)
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

<!-- The polish loop moves items here with a commit SHA when shipped -->
