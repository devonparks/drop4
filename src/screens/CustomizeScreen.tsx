import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, ImageSourcePropType, Platform, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { TopBar } from '../components/ui/TopBar';
import { Character3DPortrait } from '../components/3d/Character3DPortrait';
import { PressScale, StaggeredEntry } from '../components/animations';
import type { BrowsableCategory } from './CategoryBrowserScreen';
import { AnimationPicker } from '../components/ui/AnimationPicker';
import { ClothesCatalog } from '../components/customize/ClothesCatalog';
// Locker primitives lifted to @amg/cosmetic-ui — every AMG game's
// Customize tab inherits the same ambient twinkle, equipped pills,
// and loadout grid without a per-game copy.
import {
  SparkleField,
  EquippedDot,
  LoadoutCell,
  PulsingBadge,
} from '@amg/cosmetic-ui';
import { haptics } from '../services/haptics';
import { playSound } from '../services/audio';
import { useShopStore, getPlayerTitle, getPlayerTitleColor } from '../stores/shopStore';
import { useCharacterStore } from '../stores/characterStore';
import { usePetStore } from '../stores/petStore';
// Loot-box store backs the Customize "your locker" stat strip — total
// boxes waiting to open and items the player has enough shards to
// unlock right now. Both selectors are exported by lootBoxStore as
// pure helpers so the screen doesn't compute them inline.
import {
  useLootBoxStore,
  selectWaitingBoxCount,
  selectShardUnlockableItems,
  getAllLootableItems,
} from '../stores/lootBoxStore';
import { isLootItemOwned } from '../stores/lootBoxStore';
import { OUTFITS } from '../data/outfitRegistry';
import { OUTFIT_SHOP_ITEMS } from '../data/cosmeticsShopCatalog';
import { HUMAN_EMOTES } from '../data/animationRegistry';
import { PETS as PETS_3D } from '../data/petRegistry';
import { PETS_ENABLED } from '../data/featureFlags';
import {
  BOARD_THEMES, PIECE_THEMES, DROP_EFFECTS, WIN_ANIMATIONS,
} from '../data/shopCatalog';
import { AMG_PART_NAMES } from '../data/amgPartNamesIndex';
import { packMeta } from '../data/amgPackMeta';
import { fonts, weight } from '../theme/typography';

// Static category totals derived from the AMG part-names index. Counted
// once at module init so the Customize loadout cells can show
// owned/total ratios without waiting for the manifest fetch (the
// manifest is per-screen state inside ClothesCatalog and isn't
// available to the parent Customize screen). Same Synty slot codes
// the regex filters use elsewhere.
const HAIR_TOTAL = (() => {
  let n = 0;
  AMG_PART_NAMES.forEach((name) => { if (/_02HAIR_/.test(name)) n++; });
  return n;
})();
const FACE_TOTAL = (() => {
  let n = 0;
  AMG_PART_NAMES.forEach((name) => {
    if (/_(03EBRL|04EBRR|07EARL|08EARR|09FCHR)_/.test(name)) n++;
  });
  return n;
})();

// ═══════════════════════════════════════════════════════════════════════
// CustomizeScreen — the locker room (4-tab redesign)
//
// Phase 1 structure:
//   [TopBar] [CUSTOMIZE title] [3D character] [3x3 category grid]
//
// The 9 category cards mirror the Shop's sub-tab structure so one mental
// model carries across. Tap a card to jump to that Shop sub-tab (where
// equip/buy lives today). Dedicated in-tab equip drawers are a follow-up.
//
// Counts shown per card are "owned / total". "Total" comes from the
// canonical data registries (OUTFITS / HUMAN_EMOTES / PETS / BOARD_THEMES
// / etc.) so the UI stays accurate as content grows.
// ═══════════════════════════════════════════════════════════════════════

type CategoryId =
  | 'character'
  | 'clothes'
  | 'outfits'
  | 'hair'
  | 'face'
  | 'emotes'
  | 'pets'
  | 'pieces'
  | 'boards'
  | 'effects'
  | 'wins'
  | 'frames';

type CategoryMeta = {
  id: CategoryId;
  label: string;
  icon: ImageSourcePropType;
};

// Customize Overhaul timeline:
//   • 2026-04-30 — Dropped the OUTFITS tile in favor of the AMG
//     creator's Outfit tab covering both parts + pack swaps.
//   • 2026-05-03 — Brought OUTFITS BACK as a dedicated catalog card
//     after Devon flagged the loss of the painted Shop > Outfits art.
//     OUTFITS now opens the new OutfitsCatalog modal (152 pack
//     variants with painted Sidekick pack covers); CLOTHES still
//     opens the AMG creator's Outfit tab for individual-part shopping.
//     Same content surfaced two ways: parts catalog (CLOTHES) vs.
//     pack-bundle browse (OUTFITS). FRAMES dropped from the grid
//     until the season-pass / tournament reward registry ships.
//
// Each tile uses a chunky 3D category icon (cat-*.png) generated to
// match the locked-in DROP4 logo style — white-cyan body face + warm
// orange-red 3D extrusion + thick dark navy outline.
//
// Category order matters — at 4 cards per row, two visual rows naturally
// group themselves by row position. 8 cards in the grid (character is
// the hero card above and not in this list):
//
//   Row 1 — AVATAR / IDENTITY
//     CLOTHES (parts you wear) · OUTFITS (full pack bundles) ·
//     EMOTES (poses you perform) · PETS (companions you bring)
//
//   Row 2 — GAMEPLAY COSMETICS
//     PIECES (in-match) · BOARDS (in-match) ·
//     EFFECTS (drop FX) · WINS (victory FX)
//
// Players don't need section headers to feel the grouping — the row
// position does the work.
const CATEGORIES: CategoryMeta[] = [
  { id: 'character', label: 'Character', icon: require('../assets/images/ui/cat-character.png') },
  // Row 1 — avatar / identity (CLOTHES + HAIR + FACE follow the
  // NBA 2K myPlayer-vs-barbershop split per
  // amg-engine/docs/AMG_WARDROBE_ARCHITECTURE.md Phase 1).
  // 'outfits' opens the wardrobe view (152-pack catalog with painted
  // covers + parts grid). 'hair' opens a hair-only ClothesCatalog
  // mount (the barbershop). 'face' opens a face-only mount (eyebrows
  // / beard / ears). Each is a focused destination instead of forcing
  // the player into a tabbed creator that does too much.
  { id: 'outfits',   label: 'Clothes',   icon: require('../assets/images/ui/cat-clothes.png') },
  { id: 'hair',      label: 'Hair',      icon: require('../assets/images/ui/cat-character.png') },
  { id: 'face',      label: 'Face',      icon: require('../assets/images/ui/cat-character.png') },
  { id: 'emotes',    label: 'Emotes',    icon: require('../assets/images/ui/cat-emotes.png') },
  { id: 'pets',      label: 'Pets',      icon: require('../assets/images/ui/cat-pets.png') },
  // Row 2 — gameplay cosmetics
  { id: 'pieces',    label: 'Pieces',    icon: require('../assets/images/ui/cat-pieces.png') },
  { id: 'boards',    label: 'Boards',    icon: require('../assets/images/ui/cat-boards.png') },
  { id: 'effects',   label: 'Effects',   icon: require('../assets/images/ui/cat-effects.png') },
  { id: 'wins',      label: 'Wins',      icon: require('../assets/images/ui/cat-wins.png') },
];

// SparkleField was lifted to @amg/cosmetic-ui — every AMG game gets
// the same ambient twinkle. Drop4 imports it at the top of this file.

// 3D character presenter — Customize tab is a stage AND a tap-to-react
// toy. Tapping the character plays a random owned emote so the player
// can preview their cosmetics without leaving the tab. Same pattern
// Home uses (handleCharacterTap) — adapted for the locker context.
//
// AAA pass 2026-05-02:
//   - Layered radial spotlight glow underneath the character so it feels
//     "presented" instead of floating in space (like the Sims hero stage).
//   - Painted floor disc for grounding (subtle elliptical shadow).
//   - Character bumped 300→320 so it dominates the upper screen without
//     pushing the category grid below the bottom tab bar.
//   - tap-to-emote interaction (2026-05-02 round 2) — the spotlight is
//     no longer just decorative; tapping the character previews an
//     owned emote and shows off the player's cosmetics in motion.
function CustomizeCharacter({
  animationId,
  onTap,
}: {
  animationId: string | null;
  onTap: () => void;
}) {
  // Subtle slow breathing on the back-glow opacity — the spotlight
  // gently inhales and exhales across ~5 s so the stage feels "alive"
  // instead of static. Stays in a tight 0.85↔1.0 range so the effect
  // is sensed more than seen — same approach a museum spotlight
  // pulses to draw the eye to a centerpiece. AAA polish 2026-05-05.
  const glowBreath = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowBreath, { toValue: 0.85, duration: 2500, useNativeDriver: true }),
        Animated.timing(glowBreath, { toValue: 1, duration: 2500, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [glowBreath]);
  return (
    <View style={styles.charStageInner}>
      {/* No halo / no circle / no floor disc. Audit final 2026-05-05:
          every shape (disc, ring, rectangle, gradient pool) read as
          a UI element behind the character. The cleanest visual is
          NO shape at all — let the hero card's own warm radial
          gradient + slightly warmer card BG do the contrast lift.
          Character pops because the WHOLE card is warmer-tinted, not
          because there's a circle behind the figure. */}
      <Animated.View pointerEvents="none" style={{ opacity: glowBreath }} />
      <Character3DPortrait
        width={320}
        height={320}
        animationId={animationId}
        onTap={onTap}
        showFloor={false}
      />
    </View>
  );
}

// Subtle opacity pulse on the "TAP TO PREVIEW EMOTES" hint — draws
// the eye for first-time players without being noisy. Hides itself
// after the first character tap (parent gates rendering on
// hasTappedChar). Per AAA polish 2026-05-04: was a static 55%-opacity
// pill that was easy to miss; now it breathes between 50% and 90%.
function CharTapHintPulsing() {
  const opacity = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.9, duration: 1100, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 1100, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return (
    <Animated.View pointerEvents="none" style={[styles.charTapHint, { opacity }]}>
      <Text style={styles.charTapHintText}>TAP TO PREVIEW EMOTES</Text>
    </Animated.View>
  );
}

export function CustomizeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const coins = useShopStore((s) => s.coins);
  const gems = useShopStore((s) => s.gems);
  const level = useShopStore((s) => s.level);
  const xp = useShopStore((s) => s.xp);
  const owned = useShopStore((s) => s.owned);
  const ownedEmotes = useShopStore((s) => s.ownedEmotes);
  const ownedOutfits = useCharacterStore((s) => s.ownedOutfits);
  const ownedPets = usePetStore((s) => s.ownedPets);

  // Equipped readouts for the summary chip below the character. Three
  // primitive selectors (no method calls) so Zustand re-renders only on
  // the tiny relevant slices, not every store mutation.
  const equippedBoardId = useShopStore((s) => s.equipped.board);
  const equippedPiecesId = useShopStore((s) => s.equipped.pieces);
  const equippedDropEffectId = useShopStore((s) => s.equipped.dropEffect);
  const equippedWinAnimationId = useShopStore((s) => s.equipped.winAnimation);
  const equippedPetId = usePetStore((s) => s.activePetId);

  // Locker-stat selectors — three primitive reads so the stat strip
  // recomputes only when the relevant store slice changes.
  const ownedBoxesList = useLootBoxStore((s) => s.ownedBoxes);
  const lootShards = useLootBoxStore((s) => s.shards);
  // We're already pulling 'owned'/'ownedEmotes'/'ownedOutfits'/'ownedPets'
  // above; combine into a single ownedTotal count for the strip.
  const lockerStats = useMemo(() => {
    const allLootable = getAllLootableItems();
    const ownedCount = allLootable.reduce(
      (acc, item) => (isLootItemOwned(item) ? acc + 1 : acc),
      0,
    );
    const totalCount = allLootable.length;
    const waitingBoxes = selectWaitingBoxCount({ ownedBoxes: ownedBoxesList } as any);
    const shardReady = selectShardUnlockableItems({
      shards: lootShards,
    } as any).length;
    return { ownedCount, totalCount, waitingBoxes, shardReady };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    // Each ownership store is depended on so the count updates when
    // anything is unlocked. The selectors read the latest store state
    // via getState() inside isLootItemOwned, so they don't need the
    // arrays in deps — but we list them anyway for clarity + correctness.
    owned, ownedEmotes, ownedOutfits, ownedPets,
    ownedBoxesList, lootShards,
  ]);
  const summary = useMemo(() => {
    const boardName = BOARD_THEMES.find((b) => b.id === equippedBoardId)?.name;
    const piecesName = PIECE_THEMES.find((p) => p.id === equippedPiecesId)?.name;
    const petMeta = equippedPetId
      ? (PETS_3D as Record<string, { name?: string }>)[equippedPetId]
      : null;
    // Audit M-3 fix 2026-05-05 PM: surface equipped DROP EFFECT and
    // WIN ANIMATION when the player has set NON-DEFAULT picks. Lets
    // the equipped row flex the player's full loadout instead of
    // hiding gameplay-visible cosmetics. Default ids ('drop_default',
    // 'win_default') treated as "no flex needed."
    // Defaults are first-position freebies in their catalogs:
    // DROP_EFFECTS[0] = { id: 'none', name: 'None' }
    // WIN_ANIMATIONS[0] = { id: 'basic', name: 'Basic' }
    // Suppress those in the equipped row — they're "no flex" picks.
    const dropEffectMeta = DROP_EFFECTS.find((f) => f.id === equippedDropEffectId);
    const winAnimationMeta = WIN_ANIMATIONS.find((w) => w.id === equippedWinAnimationId);
    const isDropEffectDefault = !equippedDropEffectId || equippedDropEffectId === 'none';
    const isWinAnimationDefault = !equippedWinAnimationId || equippedWinAnimationId === 'basic';
    return {
      boardName,
      piecesName,
      petName: petMeta?.name ?? null,
      dropEffectName: !isDropEffectDefault ? (dropEffectMeta?.name ?? null) : null,
      winAnimationName: !isWinAnimationDefault ? (winAnimationMeta?.name ?? null) : null,
    };
  }, [equippedBoardId, equippedPiecesId, equippedPetId, equippedDropEffectId, equippedWinAnimationId]);

  // EMOTES card now opens the in-app AnimationPicker modal (same one
  // used by Home's emote/idle side buttons) instead of bouncing the
  // player to Shop > Emotes. The picker shows owned emotes/idles and
  // lets the player select one as their pinned emote/idle in two
  // taps without leaving the Customize tab.
  const [animPickerOpen, setAnimPickerOpen] = useState(false);
  const [animPickerTab, setAnimPickerTab] = useState<'emotes' | 'idles'>('emotes');

  // OUTFITS card opens the full-screen OutfitsCatalog modal — all 152
  // pack variants with painted Sidekick covers, rarity chips, IN BAGS
  // badges on locked items. Resurrects the old Shop > Outfits browse
  // view inside Customize per the 2026-05-03 pivot ("merge old shop
  // into customize"). Owned items tap-to-equip + close; locked items
  // route to LootBox.
  // Catalog destination state — drives both the wardrobe modal AND
  // the dedicated HAIR / FACE / ACCESSORIES bucket-locked mounts (per
  // amg-engine/docs/AMG_WARDROBE_ARCHITECTURE.md Phase 1). Each value
  // selects a focused ClothesCatalog view:
  //   · 'all'  → full wardrobe (PARTS + PACKS, all buckets)
  //   · 'hair' → hair-only (the barbershop)
  //   · 'face' → face-only (eyebrows, beard, ears)
  // Closed when null.
  type CatalogDest = 'all' | 'hair' | 'face' | null;
  const [clothesCatalogOpen, setClothesCatalogOpen] = useState<CatalogDest>(null);

  // Tap-to-preview emote on the 3D character. Same pattern as Home's
  // handleCharacterTap — picks a random owned emote, plays it for 3
  // seconds, then crossfades back to idle. Lets the player preview
  // their emote collection without committing to "pin this one" via
  // the AnimationPicker modal. Reads ownedEmotes from the shared
  // selector defined above.
  const [activeEmote, setActiveEmote] = useState<string | null>(null);
  // Tracks whether the player has tapped the character at least once
  // this mount. Drives the "TAP TO PREVIEW" affordance below the
  // character — visible until first interaction, then hidden so the
  // hint doesn't compete with the chip / hero card visually.
  const [hasTappedChar, setHasTappedChar] = useState(false);
  useEffect(() => {
    if (!activeEmote) return;
    // 5 s — most Sidekick emotes are 3.5–5 s long; the previous
    // 3 s was clipping dab / wave / dance mid-motion, then the
    // crossfade-back-to-idle caught the character at an extreme
    // pose and Devon read it as a "glitch" 2026-05-04.
    const t = setTimeout(() => setActiveEmote(null), 5000);
    return () => clearTimeout(t);
  }, [activeEmote]);
  const handleCharacterTap = () => {
    // Free + owned pool, same filter the AnimationPicker uses so the
    // tap-preview never plays an emote the player can't actually equip.
    const pool = HUMAN_EMOTES.filter(
      (e) => ownedEmotes.includes(e.id) || (e.price ?? 0) === 0,
    );
    if (pool.length === 0) return;
    const pick = pool[Math.floor(Math.random() * pool.length)].id;
    haptics.win();
    playSound('click');
    setActiveEmote(pick);
    setHasTappedChar(true);
  };

  const navigateTo = (screen: string) => navigation.dispatch(CommonActions.navigate({ name: screen }));

  // After 2026-05-03 Shop pivot, every card destination lives WITHIN
  // Drop4 (no more "jump to Shop > Clothes"). Each card has a clear,
  // distinct destination:
  //   • CHARACTER (hero) — AMG creator (full Sims-tier editor, all
  //                        tabs including Outfit for individual parts)
  //   • CLOTHES — full-screen catalog modal showing all 152 pack
  //               variants with painted Sidekick pack covers. Locked
  //               items show IN BAGS pills routing to LootBox. Owned
  //               items tap-to-equip the whole pack.
  //   • EMOTES — in-app AnimationPicker modal (one-tap selection)
  //   • PETS / PIECES / BOARDS / EFFECTS / WINS — slide-up EquipPanel
  //     sheet stays inside the Customize tab.
  const handleCategoryTap = (cat: CategoryMeta) => {
    haptics.tap();
    playSound('click');
    if (cat.id === 'character') {
      navigation.navigate('AmgCreator' as never);
      return;
    }
    if (cat.id === 'outfits') {
      // CLOTHES card opens the full wardrobe modal — every pack
      // variant + parts grid with painted Sidekick covers. Single
      // source of truth for "what clothes can I get from bags" /
      // "what do I own."
      setClothesCatalogOpen('all');
      return;
    }
    if (cat.id === 'hair') {
      // HAIR is the barbershop — bucket-locked ClothesCatalog mount
      // showing only hair parts with the dressing-room mirror flow.
      // Per AMG_WARDROBE_ARCHITECTURE Phase 1.
      setClothesCatalogOpen('hair');
      return;
    }
    if (cat.id === 'face') {
      // FACE is the face-details destination — eyebrows, beard, ears.
      // Same focused-bucket mount as HAIR.
      setClothesCatalogOpen('face');
      return;
    }
    if (cat.id === 'emotes') {
      // In-app AnimationPicker — owned emotes selectable in two taps
      // without leaving the tab.
      setAnimPickerTab('emotes');
      setAnimPickerOpen(true);
      return;
    }
    // Pivot 2026-05-03: Pets / Boards / Pieces / Effects / Wins / Frames
    // now navigate to the dedicated CategoryBrowserScreen instead of
    // opening the EquipPanel slide-up sheet. The browser shows ALL
    // items in the category (owned + locked) with rarity filters and
    // a Shard Shop link — replaces the "owned only" sheet so the
    // player can discover what they don't have yet, not just rotate
    // what they do have.
    const browserMap: Record<string, BrowsableCategory> = {
      pets: 'pets',
      boards: 'boards',
      pieces: 'pieces',
      effects: 'dropEffects',
      wins: 'winAnimations',
      frames: 'boardAccessories',
    };
    const browserCategory = browserMap[cat.id];
    if (browserCategory) {
      navigation.navigate('CategoryBrowser', { category: browserCategory });
      return;
    }
  };

  // Clothes (AMG parts) owned count — no canonical total yet because the
  // manifest is fetched at shop mount, so we show just the owned count
  // for now. The `/M` slot renders blank when total===0 below.
  const ownedAmgParts = useCharacterStore((s) => s.ownedAmgParts);

  // Outfits owned count: how many of the catalogued OUTFIT_SHOP_ITEMS
  // (152 pack variants) the player owns. ownedOutfits is the canonical
  // store of unlocked pack variant ids.
  const ownedOutfitsInCatalog = useMemo(
    () => OUTFIT_SHOP_ITEMS.filter((item) => ownedOutfits.includes(item.id)).length,
    [ownedOutfits],
  );

  // Emote ownership: free emotes (price=0 — Dab, Bow, Clap) are
  // available to every player without being explicitly added to
  // ownedEmotes. Count those toward the OWNED total so the EMOTES
  // cell reads "5/21" on day-one instead of a misleading "0/21."
  const totalEmotesOwned = useMemo(() => {
    const ownedSet = new Set(ownedEmotes);
    return HUMAN_EMOTES.reduce(
      (acc, e) => (ownedSet.has(e.id) || (e.price ?? 0) === 0 ? acc + 1 : acc),
      0,
    );
  }, [ownedEmotes]);

  // HAIR / FACE counts derived from owned AMG parts. Synty slot codes
  // appear in the part name (e.g. SK_MDRN_CIVL_01_02HAIR_HU01) so we
  // regex against ownedAmgParts directly. Tracks acquisition, not
  // equip — same logic the CLOTHES tab uses.
  const hairOwnedCount = useMemo(
    () => ownedAmgParts.filter((name) => /_02HAIR_/.test(name)).length,
    [ownedAmgParts],
  );
  const faceOwnedCount = useMemo(
    () => ownedAmgParts.filter((name) =>
      /_(03EBRL|04EBRR|07EARL|08EARR|09FCHR)_/.test(name),
    ).length,
    [ownedAmgParts],
  );

  const counts: Record<CategoryId, { owned: number; total: number }> = {
    character: { owned: ownedOutfits.length, total: Object.keys(OUTFITS).length },
    // 'clothes' kept in CategoryId for forward-compat (was removed
    // from the visible grid 2026-05-03 — outfits now labeled "Clothes"
    // covers the wardrobe view). Counts unused but the Record type
    // requires every key.
    clothes:   { owned: ownedAmgParts.length, total: 0 },
    outfits:   { owned: ownedOutfitsInCatalog, total: OUTFIT_SHOP_ITEMS.length },
    // HAIR + FACE: totals derived from the static AMG_PART_NAMES
    // index at module init (HAIR_TOTAL / FACE_TOTAL above). This way
    // the loadout cells show owned/total + the progress fill on
    // first paint without waiting for the in-screen manifest fetch.
    hair:      { owned: hairOwnedCount, total: HAIR_TOTAL },
    face:      { owned: faceOwnedCount, total: FACE_TOTAL },
    emotes:    { owned: totalEmotesOwned, total: HUMAN_EMOTES.length },
    pets:      { owned: ownedPets.length,    total: Object.keys(PETS_3D).length },
    pieces:    { owned: owned.pieces.length, total: PIECE_THEMES.length },
    boards:    { owned: owned.boards.length, total: BOARD_THEMES.length },
    effects:   { owned: owned.dropEffects.length, total: DROP_EFFECTS.length },
    wins:      { owned: owned.winAnimations.length, total: WIN_ANIMATIONS.length },
    // Frames don't have a canonical registry yet — show owned count only.
    frames:    { owned: 0, total: 0 },
  };

  // ── Identity banner inputs ──────────────────────────────────────
  // Player identity (name + computed title) replaces the redundant
  // "CUSTOMIZE / YOUR LOCKER" header from v1. The character is now the
  // hero — the chip-line above them tells you WHO you are looking at.
  const playerName = useShopStore((s) => s.playerName);
  const equippedCustomTitle = useShopStore((s) => s.equippedCustomTitle);
  const computedTitle = getPlayerTitle(level, undefined, coins);
  const displayTitle = equippedCustomTitle ?? computedTitle;
  const titleColor = getPlayerTitleColor(computedTitle);
  const collectionPct = lockerStats.totalCount > 0
    ? (lockerStats.ownedCount / lockerStats.totalCount) * 100
    : 0;

  // Currently-equipped item name per category — drives the loadout
  // grid where each cell shows what's on right now. Maps categoryId →
  // display name so the cell renderer doesn't reach into 4 stores.
  const equippedNames: Record<CategoryId, string | null> = useMemo(() => {
    const equipped = useShopStore.getState().equipped;
    const equippedOutfitId = useCharacterStore.getState().equippedOutfitId;
    // Outfit name comes through as e.g. "Fantasy Skeletons 05" — too
    // long for the loadout cell. Strip everything before the last
    // word and pad the index, yielding a tight "Skeletons 05" that
    // fits without truncation. Falls back to the full name if the
    // expected pattern doesn't match.
    const outfitFull = OUTFIT_SHOP_ITEMS.find((o) => o.id === equippedOutfitId)?.name ?? null;
    const outfitShort = outfitFull
      ? outfitFull.replace(/^(?:[A-Z][a-z]+\s)?/, '').trim() // drop leading "Modern " / "Fantasy " / "Sci-Fi "
      : null;
    const dropFx = DROP_EFFECTS.find((f) => f.id === equipped.dropEffect)?.name ?? null;
    const winFx = WIN_ANIMATIONS.find((w) => w.id === equipped.winAnimation)?.name ?? null;
    const petName = summary.petName;
    // Emote readout — show selected emote name when the player has
    // picked a specific one to play on character tap, else the count
    // of owned emotes (or "Tap to browse" empty state via LoadoutCell).
    // Was "X pinned" which was inaccurate (the count is OWNED, not
    // pinned-to-wheel — pinning is a separate concept). Audit 2026-05-05
    // follow-up.
    const emoteCount = ownedEmotes.length;
    const selectedEmote = useShopStore.getState().selectedHomeEmote;
    const homeEmoteRandomMode = useShopStore.getState().homeEmoteRandomMode;
    const selectedEmoteMeta = selectedEmote && !homeEmoteRandomMode
      ? HUMAN_EMOTES.find((e) => e.id === selectedEmote)
      : null;
    // Priority: specific selected emote → "Random" if random mode →
    // owned count. Each conveys real info instead of the misleading
    // "X pinned" label that was just the owned count with a wrong noun.
    const emoteReadout = selectedEmoteMeta?.name
      ?? (homeEmoteRandomMode ? 'Random' : (emoteCount > 0 ? `${emoteCount} owned` : null));
    // HAIR / FACE: derive a "Pack Short · NN" readout from the equipped
    // part name so the loadout cells match the rest of the grid (which
    // shows specific item identity like "Outlaws 03"). Was a generic
    // "Hair 01" / "Face" string that gave no pack context. Per audit
    // 2026-05-05 follow-up.
    const amgChar = useCharacterStore.getState().amgCharacter as unknown as
      { parts?: Record<string, string> } | null;
    // Helper: turn 'SK_APOC_OUTL_03_02HAIR_HU01' into 'Outlaws 03' using
    // packMeta.shortName when available, else first word of displayName.
    const labelFromPartName = (name: string | null): string | null => {
      if (!name) return null;
      const m = name.match(/^SK_([A-Z]{4})_([A-Z]{4})_(\d{2})_/);
      if (!m) return null;
      const pack = `${m[1]}_${m[2]}`;
      const meta = packMeta(pack);
      const short = meta.shortName ?? meta.displayName.split(' ')[0];
      return `${short} ${m[3]}`;
    };
    const equippedHair = amgChar?.parts?.['Hair'] ?? null;
    const equippedHairLabel = labelFromPartName(equippedHair);
    // Face: pick FacialHair (beard) first, else EyebrowLeft. The cell
    // hints at "what's on" — full grid lives in the FACE catalog.
    const equippedFace = amgChar?.parts?.['FacialHair'] ?? amgChar?.parts?.['EyebrowLeft'] ?? null;
    const equippedFaceLabel = labelFromPartName(equippedFace);

    return {
      character: playerName,
      clothes: outfitShort,
      outfits: outfitShort,
      hair: equippedHairLabel,
      face: equippedFaceLabel,
      emotes: emoteReadout,
      pets: petName,
      pieces: summary.piecesName ?? null,
      boards: summary.boardName ?? null,
      effects: dropFx,
      wins: winFx,
      frames: null,
    };
  }, [playerName, summary, ownedEmotes]);

  return (
    <ScreenBackground scene="profile">
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <TopBar
          coins={coins}
          gems={gems}
          level={level}
          onProfilePress={() => navigateTo('Profile')}
          onSettingsPress={() => navigateTo('Settings')}
          onCoinPress={() => navigation.navigate('MainTabs', { screen: 'Shop' } as never)}
          onGemPress={() => navigation.navigate('MainTabs', { screen: 'Shop' } as never)}
        />

        <ScrollView
          contentContainerStyle={styles.scrollWrap}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero card — character is the hero of this screen. Identity
              banner up top tells you WHO this is; character render fills
              the stage; equipped chip-line below shows your loadout at a
              glance. EDIT pill in top-right gets you to the creator. */}
          <StaggeredEntry index={0} delay={30}>
            <View style={styles.heroCard}>
              {/* Inner radial gradient — Audit C-1 2026-05-05 PM:
                  bumped opacity HARD (0.14 → 0.28 top, 0.06 → 0.16
                  bottom) so the whole card glows warmer behind the
                  character instead of relying on a halo disc.
                  Character contrast comes from the AMBIENT warmth
                  of the card, not a localized circle.

                  Three-stop: bright warm top (lit-from-above feel)
                  → mid-card transparent (lets the card BG show) →
                  warm reflected base (floor bounce). */}
              <LinearGradient
                pointerEvents="none"
                colors={[
                  'rgba(255,170,80,0.28)',
                  'rgba(10,14,32,0.0)',
                  'rgba(255,140,0,0.16)',
                ]}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              {/* Top-edge highlight — thin warm gradient line at the
                  very top of the card sells the "lit from above"
                  premium frame look. Sits above the radial gradient
                  but below the content. */}
              <LinearGradient
                pointerEvents="none"
                colors={['rgba(255,210,150,0.45)', 'rgba(255,210,150,0)']}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={styles.heroCardTopGloss}
              />
              {/* Ambient sparkle particles — six warm-amber dots
                  twinkling at staggered phases. Sells "alive premium
                  display" without competing with the character. */}
              <SparkleField />
              {/* Identity banner — split into TWO rows for proper
                  hierarchy. Row 1 = HERO (big name + level chip on
                  right). Row 2 = META (title + collection % pill).
                  Polish 2026-05-05: was a single cramped row where
                  name (13px), title (10px), LVL (9px) competed for
                  attention; the player's NAME should dominate. */}
              <View style={styles.identityHeroRow}>
                <View style={[styles.titleDot, { backgroundColor: titleColor }]} />
                <Text style={styles.identityName} numberOfLines={1}>
                  {playerName.toUpperCase()}
                </Text>
                <View style={{ flex: 1 }} />
                {/* Level chip — boxed treatment makes the LVL number
                    a tappable-feeling badge instead of stray inline
                    text. Number + LVL caption stack vertically. */}
                <View style={styles.lvlChip}>
                  <Text style={styles.lvlChipNum}>{level}</Text>
                  <Text style={styles.lvlChipCaption}>LVL</Text>
                </View>
              </View>
              <View style={styles.identityMetaRow}>
                <Text style={[styles.identityTitle, { color: titleColor }]} numberOfLines={1}>
                  {displayTitle.toUpperCase()}
                </Text>
                <View style={{ flex: 1 }} />
                {/* Collection % pill — subtle horizontal fill behind
                    the number so the chip itself visually reads
                    "you're X% there." AAA pass 2026-05-04. */}
                <View style={styles.collectionPill}>
                  <View
                    pointerEvents="none"
                    style={[
                      styles.collectionPillFill,
                      { width: `${Math.min(100, Math.max(0, collectionPct))}%` },
                    ]}
                  />
                  <Text style={styles.collectionPillText}>
                    {`${collectionPct.toFixed(1)}%`}
                  </Text>
                </View>
              </View>

              {/* XP progress to next level — bumped from 3 px → 5 px
                  with a glossy gradient fill and an inline numeric
                  label. Polish 2026-05-05: prior anemic 3 px hairline
                  felt like a UI bug; the new bar reads as "you're
                  progressing" with a real reward signal every coin. */}
              <View style={styles.xpRow}>
                <View style={styles.xpTrack}>
                  <LinearGradient
                    pointerEvents="none"
                    colors={['#ffce63', '#ff9a2c']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    // Audit M-2 fix: floor the visible width at 5 %
                    // so xp=0 doesn't render as a fully empty bar
                    // (which felt deflating for new players). Pattern
                    // borrowed from NBA 2K MyCareer's "starting at"
                    // stats. Five percent gives a visible nub at the
                    // start without faking real progress.
                    style={[
                      styles.xpFill,
                      {
                        width: `${Math.min(100, Math.max(5, (xp / (level * 100)) * 100))}%`,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.xpLabel}>
                  {`${xp}/${level * 100} XP`}
                </Text>
              </View>

              {/* Character stage — slimmer than v1 (260 vs 320) to leave
                  room for the loadout grid below without scrolling. EDIT
                  pill floats in the top-right corner of the stage so the
                  creator is one tap away without a full-width hero card
                  fighting the action band. */}
              <View style={styles.charStage}>
                <CustomizeCharacter
                  animationId={activeEmote}
                  onTap={handleCharacterTap}
                />
                <PressScale
                  onPress={() => {
                    haptics.tap();
                    playSound('click');
                    navigation.navigate('AmgCreator' as never);
                  }}
                  containerStyle={styles.editPill}
                  accessibilityLabel="Edit character"
                  accessibilityRole="button"
                >
                  {/* AAA pass 2026-05-04: was an outline-only glass pill
                      that read as a secondary affordance and got missed.
                      Now a filled warm-amber gradient with a pencil glyph
                      + bigger "EDIT CHARACTER" text. Players spot it
                      immediately as the way to enter the creator. */}
                  <LinearGradient
                    colors={['#ffb347', '#ff8c00']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.editPillInner}
                  >
                    <Text style={styles.editPillIcon}>{'✎'}</Text>
                    <Text style={styles.editPillText}>EDIT</Text>
                  </LinearGradient>
                </PressScale>
                {!hasTappedChar && (
                  <CharTapHintPulsing />
                )}
              </View>

              {/* Equipped summary line — three rarity-tinted dots with
                  inline labels. Each dot is tappable to jump straight
                  to that slot's browser (most direct "I want to change
                  this thing" affordance). */}
              <View
                style={styles.equippedRow}
                accessibilityLabel={`Currently equipped: ${summary.boardName ?? 'Classic'} board, ${summary.piecesName ?? 'Classic'} pieces${summary.petName ? `, ${summary.petName} pet` : ''}`}
              >
                <EquippedDot
                  color="#3a78d4"
                  label="BOARD"
                  name={summary.boardName ?? 'Classic'}
                  onPress={() => {
                    haptics.tap();
                    playSound('click');
                    navigation.navigate('CategoryBrowser', { category: 'boards' });
                  }}
                />
                <EquippedDot
                  color="#e63946"
                  label="PIECES"
                  name={summary.piecesName ?? 'Classic'}
                  onPress={() => {
                    haptics.tap();
                    playSound('click');
                    navigation.navigate('CategoryBrowser', { category: 'pieces' });
                  }}
                />
                {PETS_ENABLED && summary.petName && (
                  <EquippedDot
                    color="#2ecc71"
                    label="PET"
                    name={summary.petName}
                    onPress={() => {
                      haptics.tap();
                      playSound('click');
                      navigation.navigate('CategoryBrowser', { category: 'pets' });
                    }}
                  />
                )}
                {/* Audit M-3 fix 2026-05-05 PM: surface non-default
                    DROP EFFECT + WIN ANIMATION when the player has
                    equipped a real cosmetic. Hidden when at default
                    (most players initially) so the row stays clean
                    until there's something to flex. */}
                {summary.dropEffectName && (
                  <EquippedDot
                    color="#f1c40f"
                    label="EFFECT"
                    name={summary.dropEffectName}
                    onPress={() => {
                      haptics.tap();
                      playSound('click');
                      navigation.navigate('CategoryBrowser', { category: 'dropEffects' });
                    }}
                  />
                )}
                {summary.winAnimationName && (
                  <EquippedDot
                    color="#9b59b6"
                    label="WIN"
                    name={summary.winAnimationName}
                    onPress={() => {
                      haptics.tap();
                      playSound('click');
                      navigation.navigate('CategoryBrowser', { category: 'winAnimations' });
                    }}
                  />
                )}
              </View>
            </View>
          </StaggeredEntry>

          {/* Action band — single row, primary CTA full width unless the
              player has shards (or shard-ready items) in which case the
              SHARDS button takes a sliver. Hidden when both balance and
              shard-ready are 0 keeps the screen quiet for new players. */}
          <ActionBand
            waitingBoxes={lockerStats.waitingBoxes}
            shardReady={lockerStats.shardReady}
            shardsTotal={
              lootShards.common + lootShards.rare + lootShards.epic + lootShards.legendary
            }
            onOpenBoxes={() => {
              haptics.tap();
              playSound('click');
              navigation.navigate('LootBox');
            }}
            onOpenShardShop={() => {
              haptics.tap();
              playSound('click');
              navigation.navigate('ShardShop');
            }}
          />

          {/* Loadout grid — 2-col 4-row, 8 slots. 7 cosmetic categories
              + a SHARDS shortcut cell to fill the 8th slot (Frames was
              dropped from CATEGORIES until the registry ships, leaving
              an empty cell that looked like a layout bug).
              PETS_ENABLED gate 2026-05-05: pets pulled out of v1 per
              Devon — filter the cell out so the grid stays clean. */}
          <View style={styles.grid}>
            {CATEGORIES.slice(1).filter((cat) => PETS_ENABLED || cat.id !== 'pets').map((cat, i) => {
              const c = counts[cat.id];
              const hasNew = c.total > 0 && c.owned === 0;
              const equippedName = equippedNames[cat.id];
              return (
                <StaggeredEntry key={cat.id} index={i + 2} delay={30} style={styles.cellOuter}>
                  <LoadoutCell
                    icon={cat.icon}
                    label={cat.label}
                    accent={CATEGORY_ACCENT[cat.id] ?? '#ffb347'}
                    owned={c.owned}
                    total={c.total}
                    hasNew={hasNew}
                    equippedName={equippedName}
                    onPress={() => handleCategoryTap(cat)}
                  />
                </StaggeredEntry>
              );
            })}
            <StaggeredEntry index={CATEGORIES.length + 1} delay={30} style={styles.cellOuter}>
              <ShardsCell
                shardsTotal={
                  lootShards.common + lootShards.rare + lootShards.epic + lootShards.legendary
                }
                shardReady={lockerStats.shardReady}
                onPress={() => {
                  haptics.tap();
                  playSound('click');
                  navigation.navigate('ShardShop');
                }}
              />
            </StaggeredEntry>
          </View>
        </ScrollView>
      </View>

      {/* EquipPanel was the slide-up sheet used pre-pivot for Pets /
          Boards / Pieces / Effects / Wins / Frames. After the 2026-05-03
          pivot every category card routes to CategoryBrowserScreen
          instead, so the sheet never opens. Removed to keep this
          surface honest — the dead mount + setState plumbing was just
          confusing future readers. */}
      {/* AnimationPicker — full-screen emote/idle picker modal. Same
          one used by Home's emote/idle side buttons. Mounted here so
          tapping the EMOTES category card opens it in-place instead
          of bouncing the player to Shop > Emotes. */}
      <AnimationPicker
        visible={animPickerOpen}
        onClose={() => setAnimPickerOpen(false)}
        initialTab={animPickerTab}
      />
      {/* ClothesCatalog — full-screen catalog mounted here so tapping
          the CLOTHES / HAIR / FACE Customize cells surfaces the right
          focused destination without leaving the Customize tab.
            · 'all'  → full wardrobe (PARTS + PACKS, all buckets)
            · 'hair' → hair-only (barbershop)
            · 'face' → face-only (eyebrows / beard / ears)
          Per AMG_WARDROBE_ARCHITECTURE Phase 1. */}
      <ClothesCatalog
        visible={clothesCatalogOpen !== null}
        onClose={() => setClothesCatalogOpen(null)}
        lockedBucket={
          clothesCatalogOpen === 'hair' ? 'hair'
            : clothesCatalogOpen === 'face' ? 'face'
            : undefined
        }
        title={
          clothesCatalogOpen === 'hair' ? 'HAIR'
            : clothesCatalogOpen === 'face' ? 'FACE'
            : undefined
        }
        subtitle={
          clothesCatalogOpen === 'hair'
            ? 'Cuts, styles, and color volume.'
            : clothesCatalogOpen === 'face'
              ? 'Brows, ears, beards, sideburns.'
              : undefined
        }
      />
    </ScreenBackground>
  );
}

// PulsingBadge + EquippedDot were lifted to @amg/cosmetic-ui — see
// the imports at the top of this file.

// ── Action band ────────────────────────────────────────────────────
//
// Single-row primary CTA. OPEN BOXES is the hero — full-width unless
// the player has shards to spend, in which case SHARDS gets a sliver.
// The tiny stat sub-line below conveys context (collection %, shards)
// without a giant stat-strip eating vertical space.
function ActionBand({
  waitingBoxes, shardReady, shardsTotal, onOpenBoxes, onOpenShardShop,
}: {
  waitingBoxes: number;
  shardReady: number;
  shardsTotal: number;
  onOpenBoxes: () => void;
  onOpenShardShop: () => void;
}) {
  const showShards = shardReady > 0 || shardsTotal > 0;
  return (
    <StaggeredEntry index={1} delay={30}>
      <View style={styles.actionBand}>
        <PressScale
          onPress={onOpenBoxes}
          containerStyle={{ flex: showShards ? 2 : 1 }}
          accessibilityRole="button"
          accessibilityLabel={waitingBoxes > 0 ? `Open boxes, ${waitingBoxes} ready` : 'Open boxes'}
        >
          {/* Multi-layer button — outer glow ring, gradient fill, inner
              top-edge highlight for that "embossed metal" feel. */}
          <View style={styles.openBoxesShell}>
            <LinearGradient
              colors={['#ffce63', '#ff9a2c', '#e87617', '#b85c0e']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.openBoxesCta}
            >
              {/* Top inner highlight — thin horizontal rim that sells
                  the 3D button feel without needing an asset. */}
              <View pointerEvents="none" style={styles.openBoxesHighlight} />
              {/* Dynamic CTA — "OPEN 3 BOXES" when there's something specific
                  to open beats the static "OPEN BOXES" because the player
                  reads the number first and feels the urgency. The pulse
                  badge stays as a secondary signal. AAA polish 2026-05-04. */}
              <Text style={styles.openBoxesCtaText}>
                {waitingBoxes > 0
                  ? `OPEN ${waitingBoxes} ${waitingBoxes === 1 ? 'BOX' : 'BOXES'}`
                  : 'OPEN BOXES'}
              </Text>
              {waitingBoxes > 0 && <PulsingBadge value={waitingBoxes} />}
            </LinearGradient>
          </View>
        </PressScale>
        {showShards && (
          <PressScale
            onPress={onOpenShardShop}
            containerStyle={{ flex: 1 }}
            accessibilityRole="button"
            accessibilityLabel={`Shard shop${shardReady > 0 ? `, ${shardReady} unlockable` : ''}`}
          >
            {/* expo-blur on native gives a real frosted backdrop; on
                web we fall back to a translucent fill since BlurView
                requires the native module. */}
            {Platform.OS === 'web' ? (
              <View style={[styles.shardCta, styles.shardCtaWebFallback]}>
                <Text style={styles.shardCtaText}>{`SHARDS · ${shardsTotal}`}</Text>
              </View>
            ) : (
              <BlurView intensity={30} tint="dark" style={styles.shardCta}>
                <Text style={styles.shardCtaText}>{`SHARDS · ${shardsTotal}`}</Text>
              </BlurView>
            )}
          </PressScale>
        )}
      </View>
    </StaggeredEntry>
  );
}

// ── Loadout cell ───────────────────────────────────────────────────
//
// Each cosmetic category renders one cell showing: painted icon (top),
// category label (mid), currently-equipped item name (bottom),
// owned/total chip (top-right). 4 cells per row × 2 rows on a 390px
// phone = visible without scroll on the standard PhoneFrame.
// Per-category accent color for the loadout cell left edge. Each
// category gets a tint that ties into its content vibe — outfits =
// amber, pets = green, pieces = red (player1), boards = blue, etc.
// Replaces the uniform white-on-navy cell with a small visual hook.
const CATEGORY_ACCENT: Record<CategoryId, string> = {
  character: '#ffb347',
  clothes:   '#ffb347',
  outfits:   '#ffb347',
  hair:      '#e07a5f', // warm rose — barbershop vibe
  face:      '#f4d35e', // soft gold — face details (brows / beard / ears)
  emotes:    '#c997e7',
  pets:      '#3eb489',
  pieces:    '#e63946',
  boards:    '#3a78d4',
  effects:   '#f1c40f',
  wins:      '#9b59b6',
  frames:    '#1abc9c',
};

// LoadoutCell was lifted to @amg/cosmetic-ui — every AMG game's
// Customize tab inherits the same wardrobe-slot tile. Drop4 wires
// CATEGORY_ACCENT into the engine cell at the call site above.

// Specialized cell for the SHARDS shortcut — fills the 8th grid slot
// (the cosmetic categories only have 7 entries since Frames doesn't
// have a registry yet, leaving an awkward empty cell). Routes to the
// Shard Shop screen and shows the player's total shards as the
// "equipped" line.
function ShardsCell({ shardsTotal, shardReady, onPress }: {
  shardsTotal: number;
  shardReady: number;
  onPress: () => void;
}) {
  const accent = '#c997e7';
  return (
    <PressScale
      onPress={onPress}
      scaleTo={0.96}
      accessibilityRole="button"
      accessibilityLabel={`Shard shop, ${shardsTotal} total shards, ${shardReady} unlockable`}
    >
      <View style={[styles.cell, { borderColor: `${accent}55` }]}>
        <View style={[styles.cellAccent, { backgroundColor: accent }]} />
        <View style={[styles.cellIcon, styles.shardsIconWrap]}>
          <Text style={styles.shardsIconGlyph}>{'\u{2727}'}</Text>
        </View>
        <View style={styles.cellTextStack}>
          <View style={styles.cellLabelRow}>
            <Text style={styles.cellLabel} numberOfLines={1}>SHARDS</Text>
            <Text style={[styles.cellCountInline, { color: accent }]}>{shardsTotal}</Text>
          </View>
          <Text style={styles.cellEquipped} numberOfLines={1}>
            {shardReady > 0
              ? `${shardReady} ready to unlock`
              : shardsTotal > 0
                ? 'Tap to spend'
                : 'Open boxes to earn'}
          </Text>
        </View>
        <Text style={styles.cellChevron}>{'›'}</Text>
      </View>
    </PressScale>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollWrap: {
    paddingHorizontal: 12,
    paddingTop: 4,
    // Trimmed 20→12 per docs/CUSTOMIZE_VISUAL_AUDIT_2026-05-04.md Fix 7
    // — the 8px gain reduces the warm-amber bleed-through below the
    // loadout grid on phones where content barely fills the viewport.
    paddingBottom: 12,
  },

  // ── Hero card ──────────────────────────────────────────────────
  // Single rounded container that holds the identity banner + character
  // stage + equipped row. The screen reads as ONE block at the top
  // (hero) and one block below (action band + loadout grid) instead of
  // 7 stacked panels. Strong amber border + glassy fill + soft drop
  // shadow + inner radial give the card real "framed display" weight.
  // Hero card — polish 2026-05-05: stronger amber halo + thicker
  // gradient border highlight so the card reads as a premium frame.
  // Was a 1.5 px outline with weak shadow (0.18 opacity) that felt
  // mid-tier; now 2 px outline + 0.35 shadow + warmer base tint.
  heroCard: {
    position: 'relative',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(255,180,90,0.6)',
    backgroundColor: 'rgba(10,14,32,0.6)',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
    marginBottom: 10,
    overflow: 'hidden',
    shadowColor: '#ff8c00',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 22,
    elevation: 12,
  },
  // Thin top-edge gradient line — gives the card a "lit from above"
  // premium feel like a museum display case. 32 px tall fade.
  heroCardTopGloss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 32,
  },

  // ── Identity banner ─────────────────────────────────────────────
  // Player name + computed title + level + collection % chip on a
  // single tight row. Replaces the redundant "CUSTOMIZE / YOUR LOCKER"
  // big-title header from v1 — the bottom tab already says Customize.
  // Row 1 of the identity — name + level chip. Name is the hero of
  // this row; level chip floats on the right with vertical number+LVL
  // stack so it reads as a real badge.
  identityHeroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  // Row 2 of the identity — title text + collection % pill. Sub to
  // the name so visual hierarchy reads name → title → meta.
  identityMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
    marginBottom: 2,
  },
  // Tier-tinted dot precedes the name. Color comes from the player's
  // computed title (Rookie/Veteran/Champion/Legend/etc.) so the same
  // signal that's on Profile/Home reads here too. Bumped 7 → 9 px
  // and added a thin ring so it pops next to the bigger name.
  titleDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
    shadowColor: 'rgba(0,0,0,0.6)',
    shadowOpacity: 0.6,
    shadowRadius: 2,
  },
  // Player name — bumped 13 → 17 px and removed maxWidth so the name
  // gets the visual weight it deserves. Black weight + 1.4 spacing
  // sells "this is YOUR identity."
  identityName: {
    fontFamily: fonts.heading,
    fontWeight: weight.black,
    fontSize: 17,
    color: '#ffffff',
    letterSpacing: 1.4,
    flexShrink: 1,
  },
  identityTitle: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 11,
    letterSpacing: 1.4,
  },
  // Level chip — vertical stack: big number on top, "LVL" caption
  // below in muted color. Reads as a stat badge instead of stray
  // inline text. Boxed so it's visually distinct from the name.
  // Audit M-1 fix: bumped min-width 38 → 44 so single-digit numbers
  // don't feel pinched in their box.
  lvlChip: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    minWidth: 44,
  },
  lvlChipNum: {
    fontFamily: fonts.heading,
    fontWeight: weight.black,
    fontSize: 16,
    color: '#ffffff',
    lineHeight: 17,
    letterSpacing: 0.4,
  },
  lvlChipCaption: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 7,
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 1.2,
    marginTop: -1,
  },
  collectionPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,180,90,0.4)',
    backgroundColor: 'rgba(255,140,0,0.10)',
    overflow: 'hidden',
    position: 'relative',
    minWidth: 56,
    alignItems: 'center',
  },
  collectionPillFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,140,0,0.28)',
  },
  collectionPillText: {
    fontFamily: fonts.body,
    fontWeight: weight.black,
    fontSize: 10,
    color: '#ffb347',
    letterSpacing: 0.8,
    zIndex: 1,
  },

  // XP row — track + numeric label. Polish 2026-05-05: bumped from
  // 3 px hairline to 5 px with a glossy gradient fill so the bar
  // reads as a real progress system. Numeric label on the right
  // ("X / Y XP") concretizes the level-up math (level * 100).
  xpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
    marginHorizontal: 2,
  },
  xpTrack: {
    flex: 1,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  xpFill: {
    height: '100%',
    borderRadius: 2.5,
  },
  xpLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.black,
    fontSize: 9,
    color: 'rgba(255,180,90,0.85)',
    letterSpacing: 0.6,
    minWidth: 68,
    textAlign: 'right',
  },

  // ── Character stage ────────────────────────────────────────────
  // Polish 2026-05-05: bumped 260 → 320 because Devon flagged "the
  // character could be bigger." Larger silhouette also helps the
  // character read against the dark hero card. Loadout grid still
  // fits on a 390x844 phone with the bigger stage because the card
  // is in a ScrollView (not viewport-constrained).
  charStage: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 320,
    position: 'relative',
  },
  charStageInner: {
    width: 320,
    height: 320,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Floating EDIT pill in the top-right corner of the stage. Replaces
  // the v1 full-width EDIT CHARACTER hero card that ate ~80px of
  // vertical space. Glassmorphic outline so it reads as "secondary
  // affordance on the character" not "competing CTA."
  editPill: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 5,
    // Bigger touch target — pre-AAA-pass it was 10px padding which felt
    // missable. Drop shadow sells the "this is a real button on the
    // stage" depth so the gradient fill doesn't look pasted on.
    shadowColor: '#ff8c00',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.55,
    shadowRadius: 6,
    elevation: 6,
  },
  editPillInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255,210,120,0.85)',
  },
  editPillIcon: {
    fontFamily: fonts.heading,
    fontWeight: weight.black,
    fontSize: 13,
    color: '#0a0e27',
    lineHeight: 14,
    // Pencil glyph reads dark on the warm gradient so the icon pops.
  },
  editPillText: {
    fontFamily: fonts.heading,
    fontWeight: weight.black,
    fontSize: 12,
    color: '#0a0e27',
    letterSpacing: 1.4,
  },
  charTapHint: {
    position: 'absolute',
    bottom: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(10,14,32,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  charTapHintText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 8,
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 1.2,
  },
  // ── Sparkle ────────────────────────────────────────────────────
  // Each particle in the SparkleField — tiny circle with shadow glow
  // (color set per-particle). Position is animated at render time.
  // (Stage backdrop styles removed 2026-05-05 PM — the "pool of light"
  // approaches all read as visible UI shapes behind the character.
  // Final answer: no halo at all; lift contrast via the card-level
  // inner gradient + slightly warmer card BG.)

  // ── Equipped row ────────────────────────────────────────────────
  // Three rarity-tinted dots showing currently equipped board / pieces
  // / pet. Replaces the v1 emoji+text chip. Each dot is bigger, so the
  // row reads as "your loadout swatches" not "an info string."
  equippedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 4,
    paddingTop: 6,
    gap: 8,
  },
  // Outer PressScale wrapper for the equipped pill — flex:1 so the
  // inner View gets the same width treatment as the previous (non-
  // ── Action band ────────────────────────────────────────────────
  // Single-row primary CTA. OPEN BOXES is full-width unless the player
  // has shards (then SHARDS gets a sliver). Replaces the v1 stat strip
  // + progress bar + 2-button row sandwich (~140px → 56px).
  actionBand: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  // Shell wraps the gradient fill so we can layer a subtle amber outer
  // glow ring (border) without burning shadows on the gradient itself.
  openBoxesShell: {
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255,210,140,0.7)',
    overflow: 'hidden',
    shadowColor: '#ff8c00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.55,
    shadowRadius: 14,
    elevation: 8,
  },
  openBoxesCta: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    position: 'relative',
  },
  // Top inner highlight — thin bright rim that sells the embossed-metal
  // button feel. Positioned at the top of the gradient so it reads as
  // light catching the upper edge.
  openBoxesHighlight: {
    position: 'absolute',
    top: 1,
    left: 6,
    right: 6,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.4)',
    borderRadius: 1,
  },
  openBoxesCtaText: {
    fontFamily: fonts.heading,
    fontWeight: weight.black,
    fontSize: 14,
    color: '#ffffff',
    letterSpacing: 1.6,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  // PulsingBadge styles (pulsingBadgeWrap / pulseRing / openBoxesBadge
  // / openBoxesBadgeText) lifted to @amg/cosmetic-ui along with the
  // component itself.
  shardCta: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(155,89,182,0.55)',
  },
  // Web fallback — BlurView only renders frosted glass on native.
  // On web we use a translucent purple tint so the SHARDS button still
  // reads as a sibling style to OPEN BOXES (frosted vs glossy).
  shardCtaWebFallback: {
    backgroundColor: 'rgba(155,89,182,0.20)',
  },
  shardCtaText: {
    fontFamily: fonts.heading,
    fontWeight: weight.black,
    fontSize: 12,
    color: '#c997e7',
    letterSpacing: 1.2,
  },

  // ── Loadout grid ────────────────────────────────────────────────
  // 2-col 4-row grid of cells. Each cell is a horizontal loadout slot —
  // painted icon (left) + category label + currently-equipped item name
  // + count chip + chevron (right). Wide enough to read item names like
  // "Modern Civilians 01" without truncation.
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 8,
  },
  cellOuter: {
    width: '48.5%',
  },
  cell: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 64,
    borderRadius: 12,
    backgroundColor: 'rgba(10,14,32,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 8,
    paddingRight: 8,
    paddingLeft: 10, // 4px stripe + 6px breath
    gap: 6,
    overflow: 'hidden',
    shadowColor: 'rgba(0,0,0,0.5)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 2,
  },
  // Vertical accent stripe along the left edge of each cell, tinted
  // to the category's signature color. Adds visual identity per slot
  // and ties cells back to category icons (which use the same hue).
  cellAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  // Specialized shards icon — purple radiant sparkle glyph in lieu of
  // a painted asset (one will replace this in a polish pass via fal.ai).
  shardsIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(155,89,182,0.18)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(155,89,182,0.5)',
  },
  shardsIconGlyph: {
    fontSize: 22,
    color: '#c997e7',
  },
  cellIcon: {
    width: 36,
    height: 36,
  },
  cellTextStack: {
    flex: 1,
    minWidth: 0,
  },
  cellLabelRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  cellLabel: {
    fontFamily: fonts.heading,
    fontWeight: weight.black,
    fontSize: 11,
    color: '#ffffff',
    letterSpacing: 1.2,
  },
  cellCountInline: {
    fontFamily: fonts.body,
    fontWeight: weight.black,
    fontSize: 9,
    color: '#ffb347',
    letterSpacing: 0.4,
  },
  cellEquipped: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 10,
    color: 'rgba(255,255,255,0.65)',
    letterSpacing: 0.2,
    marginTop: 2,
  },
  cellChevron: {
    fontFamily: fonts.body,
    fontWeight: weight.black,
    fontSize: 18,
    color: 'rgba(255,255,255,0.4)',
    marginLeft: 2,
    marginRight: 2,
  },
});
