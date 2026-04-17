# Drop4 Dev Log

Updated at the end of every task session. Raw material for the AMG Engine skill later.

---

## 🔥 Currently working on

**Now:** Infrastructure cleanup — final dead MP code strip, pre-commit hook, move polish loop to branch.

**Next (in order):**
1. **Art pipeline** — Devon generates app icon + splash + logo iteration in ComfyUI.
2. **Store screenshots** — Claude captures from web preview at 1920x1080.
3. **First-launch tutorial** — replace WelcomeOverlay bullet list with interactive 3-screen walkthrough.
4. **`eas build`** — iOS + Android binaries.
5. **TestFlight / Play Console upload.**
6. **Find 5 beta testers.**

**Blocked on:** nothing. Every item above is unblocked and actionable.

**Target:** beta on real phones by end of this week.

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
