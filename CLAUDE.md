# Drop4

Premium Connect 4 mobile game built with React Native + Expo. First game in the **AMG Studios** ecosystem (shared accounts, currency, and cosmetics across Drop4, Tic Tac Toe, Checkers, Chess, RPS).

## Quality Bar

**More polished than Candy Crush and Basketball Stars.** The game's soul is **cosmetics** — character, emotes, board skins, pieces, pets. Every screen should either:
1. Show off cosmetics
2. Give a reason to earn/buy more cosmetics
3. Let the player discover new cosmetics

## AMG Engine

Skills repo: `~/Desktop/amg-engine/skills/`

**Before starting work**, read `amg-router.skill` and load 1-3 relevant skills for the task. After shipping a feature, optionally run the `amg-updater` process to update the skills with what was learned.

Available skills:
- `amg-router` — start here, picks the right skills for any task
- `amg-cosmetics` — character, emotes, skins, pets
- `amg-economy` — coins, gems, shop, IAP
- `amg-character-creator` — Synty character + customization
- `amg-career-mode` — level progression, NPCs, boss battles
- `amg-multiplayer` — Firebase matches, ranked, wagers
- `amg-matchmaking` — queue logic, ELO
- `amg-season-system` — battle pass, tiers, rewards
- `amg-wager-system` — wager courts, gold court
- `amg-ui-patterns` — buttons, modals, screens
- `amg-audio` — sounds, music, SFX
- `amg-analytics` — tracking, metrics
- `amg-tools` — dev utilities

## Tech Stack

- React Native 0.81 + Expo SDK 54 + TypeScript
- Zustand (18 stores, AsyncStorage auto-save)
- React Navigation 7 (native stack + bottom tabs)
- Firebase (Firestore + Anonymous Auth) for online features
- React Native Reanimated 3 for animations
- Sprite sheet animation system (viewport clipping with translateX/Y)
- 41 character sprite sheets exported from Unity (Synty Studios)

## Project Conventions

- **Zustand selectors**: NEVER call methods inside selectors (`useStore(s => s.getStats())` causes infinite re-renders). Use primitive selectors + `useMemo`.
- **GlossyButton on web**: Apply `onClick` to the View wrapper as a fallback because LinearGradient inside Pressable can block pointer events.
- **AnimatedCharacter**: Always renders idle frame 0 at opacity 1 as fallback so the character is never invisible.
- **Sprite sheet grids**: Base idle is **3 cols × 4 rows** (768×1024). Idle variants are **4 cols × 3 rows** (1024×768). Emotes are **6 cols × 4 rows** (1536×1024). All frames are 256×256.
- **Phone preview**: PhoneFrame wraps the app on web only (390×844). Native renders children directly.

## Testing

Web preview: `npx expo start --web --port 8086`

The game runs in a simulated phone frame on web for visual development. Use `mcp__Claude_Preview__*` tools for screenshots and interaction.

## Audio

Audio is muted by default during dev (`isMuted = true` in `src/services/audio.ts`). Toggle in Settings or change the default for real device testing.
