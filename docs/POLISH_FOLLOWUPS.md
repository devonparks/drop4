# Polish Follow-Ups Queue

The overnight polish agent adds ideas here when it notices something too big to do in a single run. Future sessions can pick from this list.

## Open

- Preload the current player's outfit GLB at app startup (avoid home-screen loading spinner)
- Crossfade between outfits when the player switches in the creator (currently hard-cuts)
- Add `React.memo` to `ShopItemCard` (renders often in grid)
- Extract the inline `styles.overlay` blur backdrop into a reusable `<BlurOverlay>` component (repeated across ~4 modals)
- Consolidate the three near-identical "pack chip" style blocks in Character3DCreatorScreen + ShopScreen into a shared `<FilterChip>` component
- Audit all `Animated.Value` uses — a few could migrate to Reanimated `useSharedValue` for native-thread perf
- Character3D: consider dropping shadow map 1024 → 512 on mobile (halves GPU cost, barely visible)

## Done

<!-- Move items here with commit SHA when completed -->
