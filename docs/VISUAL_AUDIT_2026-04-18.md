# Visual Audit — 2026-04-18 night session

Explored the app as a curious player, note issues, fix inline.

## Home ✓
- LOCAL PLAY visible (fixed this session).
- Drag-to-rotate works.
- Character angled 3/4, slight right-lean. Acceptable with drag-rotate.

## TO EXPLORE
- [ ] Challenges tab
- [ ] Collection tab (Characters / Loot / Awards)
- [ ] Profile tab
- [ ] Shop tab (Outfits / Boards / Pieces / Effects / Wins)
- [ ] Play → difficulty → Matchup → Game → Game Over
- [ ] Career → Brooklyn → opponent modal → Matchup → Game
- [ ] Settings → each row
- [ ] Legal → privacy + terms
- [ ] Character3D Creator → every tab
- [ ] Customize → each panel
- [ ] Daily Reward popup (fresh day)
- [ ] Daily Spin wheel
- [ ] City Completion Ceremony (requires beating a boss)
- [ ] Welcome Back (requires 3+ day absence simulation)
- [ ] Walkthrough (fresh install)

## FINDINGS

### FIXED THIS SESSION
1. **Home — LOCAL PLAY cut off** → reserved 80px paddingBottom for tab bar, capped lobbyArea max height, guaranteed menuButtons can't shrink. All 3 mode cards visible. Commit `49b72f6`.
2. **Legacy 2D character system still present** → deleted `CharacterCreatorScreen.tsx` (1838 lines, unreachable), `SpriteSheetAnimator.tsx` (only consumer deleted), rewrote `AnimatedCharacter.tsx` from 436 lines of sprite rendering to 67 lines of pure types + constants. Commit `e66eee1`.
3. **T-poses on some screens** → `Character3D` now internally falls back to `DEFAULT_HUMAN_IDLE` when caller passes no `animationGlb`. No more T-posed bind poses during loading gaps. Commit `0eedbaa`.
4. **Drag-to-rotate missing** → `Character3D` gains `rotationY?` prop that overrides auto-turntable. `HomeScreen` wires a PanResponder; horizontal drag spins the character, drops in place. Commit `8debb45`.
5. **Emote wheel label "POINT & LAU..."** → renamed `laughpoint` display label from "Point & Laugh" (13 chars, truncated) to "Laughing" (8 chars, fits). Commit `6fbefe8`.
6. **Loot tab = 60% empty space** → replaced single-button placeholder with a 3-tier preview grid (Bronze / Silver / Gold). Each card: icon + tier-colored name + contents summary + unlock hint + owned-count pill. Commit `6fbefe8`.
7. **Jest choking on GLB requires** → added asset mock for all binary extensions. Tests green. Commit `cf6bc89`.

### OBSERVED, NOT FIXED (OK-enough for v1)
- Shop category chip row clips at right edge. ScrollView is there; fade gradient provides minimal indication. Could add a right-chevron hint if it becomes a complaint.
- Career City opponent nodes show OVR numbers, not character portraits. Intentional — keeps the "silhouette city" visual metaphor.
- AnimationPicker modal renders full-screen (outside PhoneFrame) on web. Acceptable for full-screen pickers.
- Character3D Creator auto-rotates, sometimes showing rear view. Intended for creator — you want to see the outfit from all sides.

