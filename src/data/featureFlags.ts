/**
 * Feature flags — central kill-switches for in-progress features.
 *
 * Pets/Dogs were ripped out of v1 per Devon 2026-05-05 ("just take
 * out all the dogs from the game") after multiple unsatisfying
 * iterations on rendering / sizing / position / animation cycling.
 *
 * The pet code itself stays (Pet3D component, petStore, petRegistry,
 * 16 dog GLBs in src/assets/models/pets/, 16 animation GLBs in
 * src/assets/models/animations/dog/) so a v1.1 push can re-enable
 * pets cleanly. Just flip PETS_ENABLED to true and the UI surfaces
 * them again.
 */

/** When false, all pet UI surfaces are hidden:
 *  - HomeScreen pet companion
 *  - GameScreen pet beside avatar
 *  - ProfileScreen pet on portrait
 *  - CustomizeScreen PET equipped dot + PETS loadout cell
 *  - CategoryBrowser 'pets' tab
 *  - ShopScreen pet shop items
 *  - LootBoxScreen pet rewards
 */
export const PETS_ENABLED = false;
