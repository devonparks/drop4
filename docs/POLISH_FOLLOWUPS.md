# Polish Follow-Ups Queue

The overnight polish agent adds ideas here when it notices something too big to do in a single run. Future sessions can pick from this list.

## Open

- Preload the current player's outfit GLB at app startup (avoid home-screen loading spinner)
- Crossfade between outfits when the player switches in the creator (currently hard-cuts)
- Add `React.memo` to `ShopItemCard` (renders often in grid)
- Extract the inline `styles.overlay` blur backdrop into a reusable `<BlurOverlay>` component (repeated across ~4 modals)
- Audit all `Animated.Value` uses — a few could migrate to Reanimated `useSharedValue` for native-thread perf
- Migrate `Character3DCreatorScreen` and `ShopScreen` pack chips to the new `<FilterChip>` component
- Preload emote GLBs at app startup for instant playback (currently first-tap has a brief delay)

## Done

- Shared `<FilterChip>` component created (src/components/ui/FilterChip.tsx)
- Character3D shadow map 1024 → 512 (halves GPU)
- PressScale + GlossyButton: accessibility labels wired through (a11y WCAG 2.1 Level A)
- Dead `CharacterAvatar` imports removed from MatchmakingOverlay + CharacterCreatorScreen
- Outfit shop cards: rarity-tinted gradient + pack emoji + index badge (no more blue-board placeholder)
