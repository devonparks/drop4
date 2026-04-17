# Drop4 Dev Log

Updated at the end of every task session. Raw material for the AMG Engine skill later.

---

## 🔥 Currently working on

**Now:** Devon is resting. Claude continues code-based polish on main until Devon wakes up. Art-pipeline / beta-submit work is blocked on Devon.

**Next (in order):**
1. **Art generation (Devon)** — app icon + splash + logo iteration in ComfyUI. Prompts ready in docs/COMFYUI_PROMPT_PACK.md.
2. **Store screenshots** — Claude captures from web preview at 1920x1080 when Devon picks a visual direction.
3. **First-launch tutorial** — replace WelcomeOverlay bullet list with interactive 3-screen walkthrough.
4. **`eas build`** — iOS + Android binaries.
5. **TestFlight / Play Console upload.**
6. **Find 5 beta testers.**

**Blocked on:** art assets from Devon. Everything else is ready.

**Target:** beta on real phones by end of this week.

---

## 2026-04-17 (late) — Overnight Polish Round 2

### What was built/changed (while Devon rested)

**Animation polish across 6 screens/components:**
- `b3f9595` — DailyRewardPopup premium-day treatment: outfit/pet/title/emote/lootbox days get confetti + larger icon (76px vs 56px) + bigger glow + "✨ RARE REWARD ✨" kicker + gold-tinted name. Coin/gem days keep the understated look.
- `b3f9595` — TutorialTooltip GOT IT button → PressScale scaleTo=0.94
- `b3f9595` — EmotePickerModal ALL_EMOTES grid wrapped in StaggeredEntry (28ms stagger, cascade reveal)
- `596952b` — CustomGameScreen option buttons (Connect N, board size, timer, speed): bare Pressable → PressScale scaleTo=0.94
- `16bc24a` — LearnScreen 11 lesson cards → PressScale scaleTo=0.97
- `ab77b26` — RosterScreen character cards → PressScale scaleTo=0.96
- `ef66085` — CareerScreen chapter tabs (Ch.1/2/3) + CONTINUE resume card → PressScale

**Workflow fix:**
- `fa3754b` — POLISH_CHARTER rule 5 added: "Do NOT modify shared types." The overnight loop attempted to strip `GameParams.wagerCourt`/`rankedMode` fields, which cascaded through MatchupScreen. Devon had to stop the loop. Rule now fences off RootStackParamList, GameParams, MatchupParams, Zustand store shapes from polish runs.
- Reverted the loop's mid-iteration uncommitted changes that broke MatchupScreen type-checking.

### Why these decisions

- **Every PressScale wrap uses the Animated.View-with-children-View pattern**: Wrapping an existing `<Pressable style={...}>` means pulling the style onto an inner View because PressScale already provides its own Animated.View. Consistent across all 6 commits. Easier to review.
- **Premium-day celebration threshold**: the animation inventory flagged DailyReward as "day-7+ should feel bigger." But the actual differentiator is reward TYPE (outfit/pet/title/emote/lootbox = real unlock content; coins/gems = just more of what you have). Keyed the treatment off `reward.type` rather than day number so the 14/30/60/100-day milestone rewards all get the treatment too.
- **Charter rule 5 is defensive**: the loop's isOnlineMatch strip was clean and passed tsc+jest. Where it went wrong was bleeding into `GameParams` type edits — a shared surface. Rule 5 keeps polish runs out of that blast radius without blocking legitimate dead-code removal.

### Patterns for reuse

- **Shared-component internal PressScale > per-site wrap**: GlossyButton (commit 360bc51) fixed ~40 sites with one edit. Same principle: when a widely-used interactive component lacks press feedback, add it inside the component, not at each call site.
- **"Rare reward" signal via type, not day**: Milestone celebrations should fire on content type (outfit/pet/title) not on hitting day N. This lets 7-day + 14-day + 30-day + 60-day + 100-day rewards all feel distinct from regular coin days without separate code paths per milestone.
- **Shared-type freeze**: For solo-dev autonomous polish bots, forbidding shared-type edits in polish commits is the cheapest safety rail. Dead type fields get noted for a future dedicated refactor, not stripped incrementally.

---

## 2026-04-17 — Audio + Animation Polish Sprint

### What was built/changed

**Audio overhaul (1 commit, 24 sounds total, up from 13):**
- Integrated Kenney Interface Sounds pack (CC0) — extracted 13 sounds, converted OGG→WAV
- Added new sound events: tick, pluck, select, toggle, tab_switch, back, open, close, modal_in, modal_out, error, purchase
- Fixed 5 silent `playSound('purchase')` callers that had been failing because the key didn't exist in the audio service
- Wired 20 `haptics.error()` sites to also play the error sound
- MainTabs: tab_switch sound on every press
- TopBar: back sound
- Settings: toggle sound on every switch
- 3 modal lifecycle events (AnimationPicker, DailyRewardPopup, MilestoneToast)

**Animation polish (8 commits, CRITICAL items first):**
- GlossyButton internal PressScale — ~40 call sites (Play/Home/Matchup/Profile/Learn/LocalPlay/SeasonPass/Roster) gain tactile press feedback + click sound in one file change
- MainTabs TabIcon scale bounce — spring to 1.18 then settle on focus change
- CosmeticPreviewModal + OutfitPreviewModal — animationType "none" → "slide" (snapped in previously)
- ShopScreen item/pet cards — PressScale wrap with scaleTo=0.96
- Character3D lighting — ambient 0.35→0.55, rim 0.9→1.4, plus warm orange platform glow ring. Character now pops off the background.
- CollectionScreen sub-tabs + ProfileScreen link cards + ChallengesScreen CLAIM buttons — PressScale
- ShopScreen category tabs — PressScale
- SeasonPass CLAIM buttons — PressScale + PulseGlow halo
- SettingsScreen SettingLink rows — one shared component change, every link row benefits
- HomeScreen character tap — onPressIn/onPressOut driven scale pinch so tap feels instant (was feeling laggy because emote animation takes ~200ms to fire)

**Workflow simplification:**
- Killed polish-loop branch entirely. Main-only workflow now.
- Polish loop pushes directly to main, pre-commit hook (tsc+jest) is the safety gate.
- Removed tools/merge-polish.sh + auto-merge cooling window (over-engineered).

**Docs:**
- docs/ANIMATION_INVENTORY.md (126 lines, severity-graded audit of every interactive element)
- docs/COMFYUI_PROMPT_PACK.md (254 lines, ready-to-paste Flux prompts for 4 art assets)

### Why these decisions

- **Kenney over Dustyroom**: Dustyroom is mediocre baseline quality. Kenney Interface Sounds are CC0, 5 variations per category, industry-standard quality. 12MB download, 13 WAV files extracted, massive quality uplift for zero cost.
- **GlossyButton internal PressScale** was the highest-leverage animation change available. One file edit, ~40 buttons benefit. The alternative (wrapping each individual GlossyButton call site) would have been 40 diffs and more fragile.
- **Branch simplification**: the polish-loop branch + auto-merge cooling window added friction every time I wanted to commit from this session (kept accidentally ending up on the wrong branch). Pre-commit hook is protection enough for a solo dev — red commits are blocked regardless of branch.
- **Character3D lighting** was the highest-impact 3D change. Every screen that renders a Character3D or Character3DPortrait benefits (Home, Profile, Matchup, Collection cards, MilestoneToast hero slot, Character3D Creator). One file change.
- **Can't do art generation**: coplay-mcp's generate_or_edit_images requires Unity Editor running. Pivoted to code-based visual polish (lighting, animations) and left art asset generation for Devon to do in ComfyUI using the prompt pack.

### Patterns for reuse

- **Press-scale via shared component internal wrap**: If a widely-used button component lacks press feedback, the highest-leverage fix is to add the feedback inside the component (one edit, N sites benefit). Avoid wrapping each call site individually — it compounds fragility.
- **Ambient+rim lighting formula for stylized 3D**: For Synty-style characters on dark backgrounds, ambient 0.55 (outfit detail readable) + rim 1.4 (silhouette separation) + warm platform ring at 0.18 opacity (grounds the character) is a clean premium look. Key light 1.3, fill 0.6, hemisphere 0.5.
- **Pre-commit hook as single safety gate**: For solo devs, branch protection is overkill. A hook that runs `tsc --noEmit` and `jest --silent` on every commit catches the same class of issues as a PR check without the friction.
- **OGG → WAV conversion via soundfile**: For projects that prefer WAV, `soundfile.read()` + `soundfile.write(subtype='PCM_16')` handles OGG Vorbis decoding without needing ffmpeg. No Unicode arrows in print statements on Windows (cp1252 codec fails).

---

## 2026-04-17 — Infrastructure Cleanup

### What was built/changed

**Dead code stripped (~300+ more lines):**
- GameScreen's `isOnlineMatch`, `onlineMatchId`, `myPlayerNum`, `wagerCourt` variables converted to hardcoded `false`/`null`/`undefined`/`any` constants. The 47 ternary expressions that referenced them still compile cleanly without needing to rewrite every call site. Type annotations keep TypeScript from narrowing too aggressively.
- StageScreen.tsx (221 lines) deleted — unreachable since MP kill. Removed from RootNavigator + route types. `stage_rake` tutorial entry removed.
- MatchHistoryScreen MODE_BADGES trimmed from 7 modes to 3 (ai/local/career). Legacy saves with stage/ranked/wager/online modes fall through to the default `ai` badge, but filter UI no longer advertises dead modes.

**Workflow infrastructure:**
- Pre-commit hook added (`.git/hooks/pre-commit`): runs `npx tsc --noEmit` and `npx jest --silent` before every commit. Red = commit blocks. Skippable with `--no-verify` if needed.
- Polish loop moved to `polish-loop` branch (`tools/polish-loop.sh` updated). Main stays clean; polish merges weekly via PR after a 30-sec review.
- CLAUDE.md + devlog.md shipped (previous commit 7a1416c). This file now has a "Currently working on" header that updates session-to-session.

### Why these decisions

- **Typed constants over full rewrite**: Rewriting 47 ternary expressions in a 3,200-line file is high-risk surgery for cosmetic benefit. Casting to constants at the declaration site keeps behavior identical (all branches still evaluate the same way) while eliminating the illusion of live state.
- **StageScreen delete was safe**: nothing navigated to it. The only reference was the RootNavigator registration and a tutorial tip.
- **Polish loop → branch**: A single bad overnight commit to main breaks the app for users + devs. Moving to a branch adds zero friction (merge is one click) but eliminates the blast radius.

### Patterns for reuse

- **Dead variable neutralization**: When a feature is killed but its vars are referenced in dozens of conditional expressions, don't rewrite. Hardcode the vars to always-false constants with explicit type annotations. Compiler does the rest.
- **Pre-commit guardrail**: Always run the same check your CI would before the commit happens. Prevents "oh I forgot to test" regressions that only show up when the polish loop barfs.

---

## 2026-04-16 — Visual Overhaul + Dead Code Purge

### What was built/changed

**Visual & UX (8 commits):**
- Home Screen logo swapped from code-based text to ChatGPT-generated PNG asset. Auto-cropped from 1024x1536 to 858x397 (content-only). Sized at 280x130 with negative margins.
- CUSTOMIZE button moved from `position: absolute, bottom: -10` (hidden behind PLAY card) to normal document flow. Always visible, always tappable, routes correctly to Character3DCreator.
- Emotes/Idles side buttons upgraded: 58px (was 54), orange-tinted borders/fills, warmer labels.
- AnimationPicker preview swapped from 2D AnimatedCharacter sprite to Character3DPortrait. Shows the player's actual 3D character.
- Character tap on Home now plays a random owned emote directly (fun!) instead of opening EmotePickerModal3D wheel. Wheel is for in-game only.
- Character Creator T-pose fixed — was passing `animationGlb={undefined}` when no emote preview active. Now falls back to `DEFAULT_HUMAN_IDLE.glb`.
- Shop outfit filter labels: "Elven · Elven" → "Elven" (skip redundant species prefix when it matches collection name).
- Settings "What's New" removed dead MP features (Party Lobby, Ranked mode), replaced with actual v1 features.

**Dead code deleted (~3,200 lines across 7 files):**
- `src/services/matchmaking.ts` (627 lines) — Firebase Firestore match listeners
- `src/services/emotes.ts` (99 lines) — Firebase emote subcollection
- `src/services/firebase.ts` (168 lines) — Firebase core (auth + Firestore init)
- `src/components/effects/EloChangeAnimation.tsx` (179 lines) — ranked ELO display
- `src/services/friends.ts` + `src/stores/friendsStore.ts` (from earlier session)
- `src/components/ui/EmoteWheel.tsx` + `EmoteBar.tsx` (from earlier session)
- GameScreen: 202 lines of online match code (3 useEffect listeners, resign/rematch UI, sendEmote calls)
- EmotePickerModal3D + EmoteShowcase removed from Home lobby (dead state + imports)
- Dead MULTIPLAYER "Coming Soon" button removed from Home

**Features (6 commits):**
- MilestoneToast: pulsing orange glow + confetti overlay + 3D hero slot (Character3DPortrait for outfit milestones, Pet3D for pet milestones) with emoji corner badge
- ProfileScreen: PortraitFrame upgraded with `renderContent` prop, passes Character3DPortrait for live 3D portrait in tier frame
- Awards tab on Collection: 15-milestone ladder with progress bars, grouped by Ready to Claim / In Progress / Unlocked / Locked
- LegalScreen: app-store-review-ready privacy policy + terms of service (account deletion, analytics disclosure, push notifications, GDPR/CCPA, governing law)
- ErrorBoundary: web reload via `window.location.reload()` + wired Go Home navigation
- `getMilestoneProgressList` helper in collectionMilestones.ts

### Why these decisions

- **Dead code removal**: The app had ~3,200 lines of multiplayer infrastructure that was killed in commit 00d9891 but never cleaned up. The imports were pulling Firebase into the bundle (Firestore, auth) even though no code paths could reach them. Removing them shrinks the bundle and eliminates confusion.
- **Logo as PNG asset**: The code-based logo (Outfit font + text shadows) looked like a placeholder heading. A rendered 3D logo with outlines and depth reads as a real game brand. The user will iterate on the art in ComfyUI later.
- **Character tap → direct emote**: The EmotePickerModal3D wheel was confusing in the lobby — players expected tap = play, not tap = open picker. The wheel is appropriate for in-game quick access (GameScreen), not the lobby.
- **AnimationPicker 3D preview**: Showing a 2D sprite in a picker for a 3D game is jarring. Character3DPortrait uses the player's actual customization from characterStore.

### Patterns for reuse

- **`renderContent` prop on PortraitFrame**: Any component that wraps content in a decorative frame can use a render prop for the inner content instead of requiring a specific type (Image, 3D scene, etc.). Backwards-compatible — old `image` prop still works.
- **`getMilestoneProgressList`**: Mirrors the eligibility logic in `getNewlyEarnedMilestones` so current/required counts can't drift from claim state. Any future progress-bar UI can call this.
- **Dead code removal pattern**: Remove imports first → run tsc → it reports exact line numbers of references → surgically delete each reference → re-run tsc until clean → delete the source file. Faster than reading 3,400 lines.

---

## 2026-04-15 — Retention Hooks + MP Kill + Polish Loop

### What was built/changed
- Multiplayer infrastructure killed: 7 screens + MatchmakingOverlay deleted, nav cleaned (commit 00d9891)
- Retention hooks shipped: shop daily rotation, streak escalation (Day 7 = rare outfit, 14/30/60/100-day milestones), local push notifications, collection milestones with MilestoneToast (commit 5e904c0)
- Feature flags cleanup post MP-kill (commit 762e92d)
- T-pose animation bug fixed: skeleton rebinding + track path stripping (commit 67c3d97)
- Character default idle swapped to forward-facing `idle_base` (commit e84c5b3)
- Continuous local polish loop tested and running (commits fafa9b7, 93fbff6)

### Patterns for reuse
- **Polish loop architecture**: `tools/polish-loop.sh` reads `POLISH_CHARTER.md` for rules, picks from `POLISH_FOLLOWUPS.md` queue, commits with `polish: <scope>` format, pushes every 3-7 min. Uses Claude Max subscription (not API billing). Reusable for any project.
- **Skeleton rebinding**: When loading animations from a different GLB than the body mesh, the skeleton needs to be rebound. Track paths need the prefix stripped (everything before the last `/`). This is the fix for T-pose on any Synty + Mixamo combo.
