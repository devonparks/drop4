# Drop4 Overnight Autonomous Work Queue

You are a scheduled remote Claude Code agent. You wake up every ~2 hours, read this file, pick the next unchecked task, do it, commit + push, check the box, and stop.

## Operating rules — READ FIRST, EVERY RUN

1. **Start by running `git pull --rebase` so you're on the latest state.** Another run may have committed since the schedule fired.
2. **Do one task per run.** Do not try to do multiple tasks — keep commits small and reviewable.
3. **Pick the first unchecked task** (`- [ ]`) in the TASKS list below. Skip any marked `BLOCKED:` until unblocked.
4. **Never delete GLB imports.** The binaries live only on the user's local machine (gitignored). `require('../assets/models/...')` calls are valid at build time — do NOT remove them because the file appears missing in the remote clone. This is expected. Use placeholder/fallback code only when adding NEW features, never when editing existing working code.
5. **TypeScript must stay green.** Run `npx tsc --noEmit` before committing. If it fails, fix your own work — never commit red.
6. **Commit message format**: `overnight: <scope> — <what you did>`. Example: `overnight: shop — add outfits tab pulling from cosmeticsShopCatalog`.
7. **Push to origin/main** (or whatever the default branch is).
8. **Check the box** in this file as the last step, in the same commit as your work.
9. **If you get stuck or a task is ambiguous**, mark it `BLOCKED: <reason>` and move to the next one. Leave a note in `docs/OVERNIGHT_NOTES.md` explaining what you tried.
10. **Stop after one task.** Do not start another.

## Repository context

- Tech stack: React Native 0.81 + Expo SDK 54 + TypeScript + Zustand + react-three-fiber
- 3D pipeline: Unity Synty Sidekick → FBX2glTF → GLBs at `src/assets/models/` (GLBs NOT in git — local only)
- Registries: `src/data/outfitRegistry.ts` (152 outfits), `src/data/petRegistry.ts` (16 dogs), `src/data/animationRegistry.ts` (48 clips), `src/data/cosmeticsShopCatalog.ts` (auto-generated shop items)
- Rendering: `Character3D.tsx`, `Character3DPortrait.tsx` (drop-in), `Pet3D.tsx`
- Feature flag: `FEATURES.character3D` in `src/config/features.ts`
- Starting points: `docs/FULL_IMPORT_RUNBOOK.md` has the big-picture architecture
- User's CLAUDE.md at repo root has project conventions — respect them (no methods in Zustand selectors, GlossyButton onClick fallback, AnimatedCharacter always renders fallback opacity 1, etc.)

## TASKS

Pick the FIRST unchecked item.

### Shop integration (purchasing the 189 new cosmetics)

- [x] **Task 1: Add `'outfits'` tab to ShopScreen.** Import `OUTFIT_COLLECTIONS` + `OUTFIT_SHOP_ITEMS` from `src/data/cosmeticsShopCatalog.ts`. Add `'outfits'` to the `ShopTab` union in `src/screens/ShopScreen.tsx`. Add a tab button. Render a grid using the existing `ShopItemCard` but with the new `OUTFIT_SHOP_ITEMS`. Ownership = `useCharacterStore(s => s.ownedOutfits).includes(id)`. Purchase = deduct coins via `useShopStore.spendCoins(price)` + call `useCharacterStore.unlockOutfit(id)`. Equip = `useCharacterStore.setOutfit(id)`. Test by running `npx tsc --noEmit`.

- [x] **Task 2: Group ShopScreen outfits tab by pack using `OUTFIT_COLLECTIONS`.** Show a horizontal pack-picker chip row (Modern Civilians, Police, Apocalypse, Fantasy, Pirates, Samurai, Sci-Fi, Viking, Elven, Goblin, Skeleton, Zombie). Selecting a pack filters the grid. Include a "Species" super-filter (Human, Elf, Goblin, Skeleton, Zombie) above the pack chips. This turns the single tab into a browsable 152-piece shop.

- [x] **Task 3: Rewrite ShopScreen 'pets' tab to use `PET_SHOP_ITEMS` + `usePetStore`.** Currently it uses `useShopStore.ownedPets/equippedPet` with a 2D PetCard. Add 3D preview using `<Pet3D>` inside each card at 80×80. Keep 2D fallback when `!FEATURES.character3D`. Wire purchase to `usePetStore.purchasePet`. Cross-check with existing `petStore` in `src/stores/petStore.ts`.

- [x] **Task 4: Wire `shopStore.ownedEmotes` + `useShopStore.purchaseEmote` to the new `EMOTE_SHOP_ITEMS` array.** Existing emotes tab already reads from shopStore. Extend its data source to include HUMAN_EMOTES entries in addition to whatever 2D emotes were there. Make sure the emote wheel / picker can equip either old or new IDs (new IDs start with `emote_`).

### Character creator polish

- [x] **Task 5: Add Species picker to Outfit tab in Character3DCreatorScreen.** Horizontal row of 5 species chips (Human/Elves/Goblin/Skeleton/Zombie) above the outfit grid. Selecting filters the outfit grid via `outfitsForSpecies(species)`. Lock non-human species behind `FEATURES.multipleSpecies` or a careerStore unlock — for now just show them all unlocked.

- [x] **Task 6: Add Pack filter chips in Outfit tab.** Below Species picker, a horizontal row of pack chips for the currently selected species. Uses `PACKS.filter(p => p.species === selectedSpecies)`. Selecting filters the grid.

- [x] **Task 7: Emote preview on tap in creator Emotes tab.** Currently tapping an emote in `EmotesTab` of Character3DCreatorScreen just buys/equips. Instead, tapping an OWNED emote should play it on the 3D preview character for its duration, then return to idle. Requires state like `[playingEmoteId, setPlayingEmoteId]` in the creator screen + passing it as `animationId` to the preview Character3D. After the clip length, reset to null.

### Screen 2D → 3D migration

- [x] **Task 8: Swap PartyLobbyScreen to use Character3DPortrait.** Replace both `AnimatedCharacter` usages (lines ~261 and ~311 per inventory). Gate on `FEATURES.character3D`. Keep 2D fallback intact.

- [x] **Task 9: Swap PlayScreen CharacterAvatar difficulty selectors to Character3DPortrait.** (N/A — CharacterAvatar is imported but not actually rendered anywhere in PlayScreen; the inventory was wrong. Import should probably be removed as a separate cleanup.) Since these are opponent bots without custom data, use the default customization (no override) OR build a cheap per-difficulty preset map (e.g. Easy = civilians_01, Medium = police_01, Hard = samurai_01, Legend = sci_fi_soldiers_01). Add that map to `src/data/npcCustomizations.ts` as a new file if needed.

- [x] **Task 10: Collection/Roster grids — snapshot approach.** Installed `react-native-view-shot`. New `CharacterSnapshot` component renders Character3D inside `ViewShot`, captures PNG via `capture()`, caches the data URI in AsyncStorage keyed by an FNV-1a hash of customization + size. Graceful fallback to live Character3D on web (view-shot + GLContext don't play nice in browsers). Applied to the CollectionScreen hero card. NPC roster grid stays 2D since NPCs don't have per-character 3D customization data yet (future work). These render many characters simultaneously, so live `<Canvas>` per card kills performance. Build `src/components/3d/CharacterSnapshot.tsx` that renders a Character3D offscreen ONCE, captures it to PNG via `expo-gl`/`react-native-view-shot`, caches the PNG at `AsyncStorage`, and returns an `<Image>`. Replace AnimatedCharacter in CollectionScreen + RosterScreen with this. Cache key = hash of customization + outfitId. If `react-native-view-shot` isn't installed, mark `BLOCKED: requires 'npm install react-native-view-shot'` and move on.

### Testing & polish

- [x] **Task 11: Add smoke test for Character3D.** Installed jest + jest-expo + react-test-renderer + @types/jest. Wrote lightweight mocks: `jest.rn-mock.js` (react-native subset), `jest.r3f-mock.js` (Canvas → fragment), `jest.three-mock.js` (THREE classes + GLTFLoader). 3 smoke tests pass: mount with min props, full customization, animation in creator mode. Run with `npm test`. Reanimated is mocked at setup time to avoid worklets init failure. Create `src/components/3d/__tests__/Character3D.test.tsx`. Use jest + @testing-library/react-native to render `<Character3D width={100} height={100} bodyGlb={0} />` and assert it doesn't throw. If jest isn't set up in package.json, install jest + jest-expo + @testing-library/react-native first via `npm install --save-dev`.

- [x] **Task 12: Write emote picker component.** `src/components/ui/EmotePickerModal3D.tsx` — modal showing a 2×3 grid of the player's 6 equipped emotes (from `useShopStore.equippedEmotes`). Tapping one dismisses the modal and calls an `onPlay(animationId)` callback. Used by HomeScreen later to trigger emotes on the 3D character.

- [x] **Task 13: Wire emote playback into HomeScreen.** Add state `[activeEmote, setActiveEmote]` to HomeScreen. When user triggers an emote via `HomeEmoteSelector` or long-press on character, set it. Pass `animationId={activeEmote ?? 'idle_base'}` + `animationLoop={!activeEmote}` to the `Character3DWrapper`. Clear after 3 seconds (emote clips are 2-3s typically).

### Shop catalog expansion

- [x] **Task 14: Generate per-pack "Collection" entries in the shop daily deals.** Extend `src/screens/ShopScreen.tsx` daily deals to rotate in one random OUTFIT_SHOP_ITEMS item at 20% discount. Seed random by day-of-year so same deal shows all day.

- [x] **Task 15: Add outfit preview modal.** Long-press on an outfit in the shop should show a preview modal with the 3D character wearing that outfit (live Character3D at 200×280). Add buy/equip buttons in modal. Reuse existing CosmeticPreviewModal pattern if present.

### If all tasks above are complete, pick from:

- [x] **Task 16: Career mode species unlocks.** In `src/data/careerLevels.ts`, add species-unlock triggers at certain boss levels (Elven at Venice Beach chapter, Goblin at Harlem, Skeleton at Cyber chapter, Zombie at Apocalypse chapter). Wire `careerStore` to expose `unlockedSpecies: string[]`. Reflect in creator Species picker.

- [x] **Task 17: Write docs/3D_SYSTEM_OVERVIEW.md.** Architectural doc covering: registries, rendering components, feature flag, pipeline, how to add a new outfit/pet/emote. For future contributors.

## DONE LOG

As tasks complete, move them here with the commit SHA:

<!-- example: - [x] Task 1 — commit abc1234 — 2026-04-15 -->
