import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, ImageSourcePropType } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { TopBar } from '../components/ui/TopBar';
import { Character3DPortrait } from '../components/3d/Character3DPortrait';
import { PressScale, StaggeredEntry } from '../components/animations';
import { EquipPanel, type EquipCategory } from '../components/customize/EquipPanel';
import { AnimationPicker } from '../components/ui/AnimationPicker';
import { haptics } from '../services/haptics';
import { playSound } from '../services/audio';
import { useShopStore } from '../stores/shopStore';
import { useCharacterStore } from '../stores/characterStore';
import { usePetStore } from '../stores/petStore';
import { OUTFITS } from '../data/outfitRegistry';
import { HUMAN_EMOTES } from '../data/animationRegistry';
import { PETS as PETS_3D } from '../data/petRegistry';
import {
  BOARD_THEMES, PIECE_THEMES, DROP_EFFECTS, WIN_ANIMATIONS,
} from '../data/shopCatalog';
import { colors } from '../theme/colors';
import { fonts, weight } from '../theme/typography';

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

// Customize Overhaul 2026-04-30: dropped the redundant Outfits tile
// (now covered by Clothes via the AMG migration — every part lives in
// the per-pack Clothes catalog). Remaining 9 fit cleanly in a 3x3 grid
// with no orphan card, which Devon flagged in the audit.
//
// Each tile uses a chunky 3D category icon (cat-*.png) generated to
// match the locked-in DROP4 logo style — white-cyan body face + warm
// orange-red 3D extrusion + thick dark navy outline.
// Category order matters — at 4 cards per row, two visual rows naturally
// group themselves by row position. Now 8 cards in the grid (character is
// the hero card above and not in this list):
//
//   Row 1 — AVATAR / IDENTITY
//     CLOTHES (parts you wear) · EMOTES (poses you perform) ·
//     PETS (companions you bring) · FRAMES (your profile chrome)
//
//   Row 2 — GAMEPLAY COSMETICS
//     PIECES (in-match) · BOARDS (in-match) ·
//     EFFECTS (drop FX) · WINS (victory FX)
//
// Players don't need section headers to feel the grouping — the row
// position does the work.
//
// CLOTHES routes to the AMG creator on its 'outfit' tab (the parts
// catalog that shows owned + locked + tap-to-buy). OUTFITS-as-bundle
// is currently folded INTO the Clothes catalog because the creator's
// Outfit tab handles both individual parts AND full pack swaps via
// PresetBar. If we later split them, add a separate OUTFITS card.
const CATEGORIES: CategoryMeta[] = [
  { id: 'character', label: 'Character', icon: require('../assets/images/ui/cat-character.png') },
  // Row 1 — avatar / identity
  { id: 'clothes',   label: 'Clothes',   icon: require('../assets/images/ui/cat-clothes.png') },
  { id: 'emotes',    label: 'Emotes',    icon: require('../assets/images/ui/cat-emotes.png') },
  { id: 'pets',      label: 'Pets',      icon: require('../assets/images/ui/cat-pets.png') },
  { id: 'frames',    label: 'Frames',    icon: require('../assets/images/ui/cat-frames.png') },
  // Row 2 — gameplay cosmetics
  { id: 'pieces',    label: 'Pieces',    icon: require('../assets/images/ui/cat-pieces.png') },
  { id: 'boards',    label: 'Boards',    icon: require('../assets/images/ui/cat-boards.png') },
  { id: 'effects',   label: 'Effects',   icon: require('../assets/images/ui/cat-effects.png') },
  { id: 'wins',      label: 'Wins',      icon: require('../assets/images/ui/cat-wins.png') },
];

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
  return (
    <View style={styles.charStageInner}>
      {/* Back-glow — large warm orange aura so the silhouette pops out
          of the dark navy background. Layered behind the character. */}
      <View pointerEvents="none" style={styles.charGlow} />
      {/* Floor disc — soft elliptical shadow under the feet for grounding. */}
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(255,140,0,0.22)', 'rgba(255,140,0,0)']}
        style={styles.charFloorDisc}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
      <Character3DPortrait
        width={320}
        height={320}
        animationId={animationId}
        onTap={onTap}
        // Painted scene already supplies warm-amber backdrop; we own the
        // floor disc + spotlight stack here so the look is consistent
        // even if the bg theme is swapped per-screen later.
        showFloor={false}
      />
    </View>
  );
}

export function CustomizeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const coins = useShopStore((s) => s.coins);
  const gems = useShopStore((s) => s.gems);
  const level = useShopStore((s) => s.level);
  const owned = useShopStore((s) => s.owned);
  const ownedEmotes = useShopStore((s) => s.ownedEmotes);
  const ownedOutfits = useCharacterStore((s) => s.ownedOutfits);
  const ownedPets = usePetStore((s) => s.ownedPets);

  // Equipped readouts for the summary chip below the character. Three
  // primitive selectors (no method calls) so Zustand re-renders only on
  // the tiny relevant slices, not every store mutation.
  const equippedBoardId = useShopStore((s) => s.equipped.board);
  const equippedPiecesId = useShopStore((s) => s.equipped.pieces);
  const equippedPetId = usePetStore((s) => s.activePetId);
  const summary = useMemo(() => {
    const boardName = BOARD_THEMES.find((b) => b.id === equippedBoardId)?.name;
    const piecesName = PIECE_THEMES.find((p) => p.id === equippedPiecesId)?.name;
    const petMeta = equippedPetId
      ? (PETS_3D as Record<string, { name?: string }>)[equippedPetId]
      : null;
    return { boardName, piecesName, petName: petMeta?.name ?? null };
  }, [equippedBoardId, equippedPiecesId, equippedPetId]);

  // Customize-tab equip panel state. Replaces the previous "tap card →
  // jump to Shop tab" behavior for non-character categories. Tapping a
  // card now opens this slide-up panel inside Customize so the player
  // never leaves the tab to equip what they own.
  const [equipPanelCategory, setEquipPanelCategory] = useState<EquipCategory | null>(null);

  // EMOTES card now opens the in-app AnimationPicker modal (same one
  // used by Home's emote/idle side buttons) instead of bouncing the
  // player to Shop > Emotes. The picker shows owned emotes/idles and
  // lets the player select one as their pinned emote/idle in two
  // taps without leaving the Customize tab.
  const [animPickerOpen, setAnimPickerOpen] = useState(false);
  const [animPickerTab, setAnimPickerTab] = useState<'emotes' | 'idles'>('emotes');

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
    const t = setTimeout(() => setActiveEmote(null), 3000);
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
  //   • CHARACTER (hero) — AMG creator on Body tab (default tab)
  //   • CLOTHES — AMG creator on Outfit tab (the catalog of parts —
  //               shows owned + locked + tap-to-buy via creator's
  //               existing PartGrid). This IS the Synty parts catalog
  //               now that Shop's Clothes tab is gone.
  //   • EMOTES — in-app AnimationPicker modal (one-tap selection)
  //   • PETS / PIECES / BOARDS / EFFECTS / WINS / FRAMES — slide-up
  //     EquipPanel sheet stays inside the Customize tab.
  const handleCategoryTap = (cat: CategoryMeta) => {
    haptics.tap();
    playSound('click');
    if (cat.id === 'character') {
      navigation.navigate('AmgCreator' as never);
      return;
    }
    if (cat.id === 'clothes') {
      // Open the creator on the Outfit tab — that's where the parts
      // catalog (PartGrid with owned + locked + tap-to-buy) lives.
      navigation.navigate('AmgCreator' as never, { initialTab: 'outfit' } as never);
      return;
    }
    if (cat.id === 'emotes') {
      // In-app AnimationPicker — owned emotes selectable in two taps
      // without leaving the tab.
      setAnimPickerTab('emotes');
      setAnimPickerOpen(true);
      return;
    }
    // Pets / Boards / Pieces / Effects / Wins / Frames → open the
    // EquipPanel slide-up sheet inside Customize (no nav detour).
    const equipPanelMap: Record<string, EquipCategory> = {
      pets: 'pets',
      boards: 'boards',
      pieces: 'pieces',
      effects: 'effects',
      wins: 'wins',
      frames: 'frames',
    };
    const panelCategory = equipPanelMap[cat.id];
    if (panelCategory) {
      setEquipPanelCategory(panelCategory);
      return;
    }
  };

  // Clothes (AMG parts) owned count — no canonical total yet because the
  // manifest is fetched at shop mount, so we show just the owned count
  // for now. The `/M` slot renders blank when total===0 below.
  const ownedAmgParts = useCharacterStore((s) => s.ownedAmgParts);

  const counts: Record<CategoryId, { owned: number; total: number }> = {
    character: { owned: ownedOutfits.length, total: Object.keys(OUTFITS).length },
    clothes:   { owned: ownedAmgParts.length, total: 0 },
    emotes:    { owned: ownedEmotes.length,  total: HUMAN_EMOTES.length },
    pets:      { owned: ownedPets.length,    total: Object.keys(PETS_3D).length },
    pieces:    { owned: owned.pieces.length, total: PIECE_THEMES.length },
    boards:    { owned: owned.boards.length, total: BOARD_THEMES.length },
    effects:   { owned: owned.dropEffects.length, total: DROP_EFFECTS.length },
    wins:      { owned: owned.winAnimations.length, total: WIN_ANIMATIONS.length },
    // Frames don't have a canonical registry yet — show owned count only.
    frames:    { owned: 0, total: 0 },
  };

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
        {/* AAA pass: title row also carries an inline subtitle pill so the
            screen reads as "your locker" not just a generic dashboard. */}
        <View style={styles.titleRow}>
          <Text style={styles.title} accessibilityRole="header">CUSTOMIZE</Text>
          <Text style={styles.titleSub}>YOUR LOCKER</Text>
        </View>

        {/* 3D character stage. Centered with spotlight aura + floor disc.
            Tappable — fires a random owned emote preview so the player
            can show off their cosmetics without leaving the tab.
            Live-updates when the player changes gear via the category
            cards / EquipPanel sheets below. */}
        <View style={styles.charStage}>
          <CustomizeCharacter
            animationId={activeEmote}
            onTap={handleCharacterTap}
          />
          {/* Tap-to-preview affordance — only visible until the player
              has tapped the character at least once this mount. Fades
              automatically after first interaction so it doesn't
              compete with the chip / hero card visually. */}
          {!hasTappedChar && (
            <View pointerEvents="none" style={styles.charTapHint}>
              <Text style={styles.charTapHintText}>TAP TO PREVIEW EMOTES</Text>
            </View>
          )}
        </View>

        {/* Equipped summary readout — passive at-a-glance label of what
            the player has on right now. Per-slot icons (board / pieces /
            pet) make the chip self-documenting: each value sits next to
            an indicator of WHICH cosmetic slot it represents, instead
            of a single generic 🎯 anchor. */}
        <View
          style={styles.equippedChip}
          accessibilityRole="text"
          accessibilityLabel={`Currently equipped: ${summary.boardName ?? 'Classic'} board, ${summary.piecesName ?? 'Classic'} pieces${summary.petName ? `, ${summary.petName} pet` : ''}`}
        >
          <Text style={styles.equippedChipSlotIcon}>{'\u{1F3B2}'}</Text>
          <Text style={styles.equippedChipText} numberOfLines={1}>
            {summary.boardName ?? 'Classic'}
          </Text>
          <Text style={styles.equippedChipDot}>{'·'}</Text>
          <Text style={styles.equippedChipSlotIcon}>{'\u{1F534}'}</Text>
          <Text style={styles.equippedChipText} numberOfLines={1}>
            {summary.piecesName ?? 'Classic'}
          </Text>
          {summary.petName && (
            <>
              <Text style={styles.equippedChipDot}>{'·'}</Text>
              <Text style={styles.equippedChipSlotIcon}>{'\u{1F436}'}</Text>
              <Text style={styles.equippedChipText} numberOfLines={1}>
                {summary.petName}
              </Text>
            </>
          )}
        </View>

        {/* Category grid. AAA pass: CHARACTER is broken out as a
            full-width hero card so the player's primary action — open the
            creator — is the obvious next tap. Remaining 8 categories sit
            in a 4x2 / 2x4 grid below. */}
        <ScrollView
          contentContainerStyle={styles.gridWrap}
          showsVerticalScrollIndicator={false}
        >
          <StaggeredEntry index={0} delay={35}>
            <HeroCharacterCard
              cat={CATEGORIES[0]}
              onPress={() => handleCategoryTap(CATEGORIES[0])}
            />
          </StaggeredEntry>
          <View style={styles.grid}>
            {CATEGORIES.slice(1).map((cat, i) => {
              const c = counts[cat.id];
              // "NEW" badge: when the player owns 0 of a category that
              // has content available, surface a small accent so the
              // category reads as "go explore." Suppressed for character
              // (multi-attribute) and frames (no registry yet).
              const hasNew = c.total > 0 && c.owned === 0;
              return (
                <StaggeredEntry key={cat.id} index={i + 1} delay={35}>
                  <CategoryCard
                    cat={cat}
                    owned={c.owned}
                    total={c.total}
                    hasNew={hasNew}
                    onPress={() => handleCategoryTap(cat)}
                  />
                </StaggeredEntry>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* EquipPanel — slide-up sheet for Pets / Boards / Pieces / Effects /
          Wins / Frames. Replaces the legacy "jump to Shop tab" redirect
          for those categories. Open: setEquipPanelCategory(id). Close:
          setEquipPanelCategory(null) via onClose. */}
      <EquipPanel
        visible={equipPanelCategory !== null}
        category={equipPanelCategory}
        onClose={() => setEquipPanelCategory(null)}
      />
      {/* AnimationPicker — full-screen emote/idle picker modal. Same
          one used by Home's emote/idle side buttons. Mounted here so
          tapping the EMOTES category card opens it in-place instead
          of bouncing the player to Shop > Emotes. */}
      <AnimationPicker
        visible={animPickerOpen}
        onClose={() => setAnimPickerOpen(false)}
        initialTab={animPickerTab}
      />
    </ScreenBackground>
  );
}

function CategoryCard({
  cat, owned, total, hasNew, onPress,
}: {
  cat: CategoryMeta; owned: number; total: number; hasNew?: boolean; onPress: () => void;
}) {
  // Show count only when category is count-based (not Character, not the
  // unregistered Frames). Character is a multi-attribute editor.
  const showCount = cat.id !== 'character' && total > 0;
  return (
    <PressScale
      onPress={onPress}
      scaleTo={0.95}
      accessibilityRole="button"
      accessibilityLabel={`${cat.label}${showCount ? `, ${owned} of ${total} owned` : ''}${hasNew ? ', new content available' : ''}`}
    >
      <View style={styles.card}>
        <Image source={cat.icon} style={styles.cardIcon} resizeMode="contain" accessibilityIgnoresInvertColors />
        <Text style={styles.cardLabel} numberOfLines={1}>{cat.label.toUpperCase()}</Text>
        {showCount && (
          <Text style={styles.cardCount}>{owned}/{total}</Text>
        )}
        {hasNew && (
          // Tiny accent pill in the top-right corner — surfaces "you
          // have not equipped anything in this category yet." Helps the
          // player discover content they own but haven't tried.
          <View style={styles.newBadge}>
            <Text style={styles.newBadgeText}>NEW</Text>
          </View>
        )}
      </View>
    </PressScale>
  );
}

// Hero CHARACTER card — full-width, painted icon left, copy stack right
// + chevron. The screen's primary CTA so it owns visual weight that the
// 8 grid cards below collectively share.
function HeroCharacterCard({
  cat, onPress,
}: {
  cat: CategoryMeta; onPress: () => void;
}) {
  return (
    <PressScale
      onPress={onPress}
      scaleTo={0.97}
      accessibilityRole="button"
      accessibilityLabel="Open character creator"
      accessibilityHint="Edit body, face, hair, outfit, and color"
    >
      <LinearGradient
        colors={['rgba(255,140,0,0.22)', 'rgba(255,80,0,0.08)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <View style={styles.heroIconWrap}>
          <Image source={cat.icon} style={styles.heroIcon} resizeMode="contain" accessibilityIgnoresInvertColors />
        </View>
        <View style={styles.heroTextWrap}>
          <Text style={styles.heroTitle}>EDIT CHARACTER</Text>
          <Text style={styles.heroSub}>Body · Face · Hair · Outfit · Color</Text>
        </View>
        <Text style={styles.heroChevron}>{'›'}</Text>
      </LinearGradient>
    </PressScale>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Title row — primary "CUSTOMIZE" + secondary "YOUR LOCKER" pill so
  // the screen identity reads at a glance instead of a single bare word.
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
    marginBottom: 2,
  },
  title: {
    fontFamily: fonts.heading,
    fontWeight: weight.black,
    fontSize: 24,
    color: '#ffffff',
    letterSpacing: 2.4,
  },
  titleSub: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 9,
    color: 'rgba(255,180,90,0.85)',
    letterSpacing: 1.6,
    paddingTop: 2,
  },

  // Character stage with layered backdrop:
  //   1. charGlow — large diffuse aura behind the silhouette
  //   2. charFloorDisc — soft warm gradient under the feet
  //   3. Character3DPortrait — the actual rendered hero
  charStage: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 300,
    marginBottom: 2,
    position: 'relative',
  },
  // First-visit hint that the character is tappable. Hides after the
  // first tap (tracked by hasTappedChar). Positioned at the bottom of
  // the stage so it sits between the character's feet and the chip
  // below — reads as "tap me" without overlapping the silhouette.
  charTapHint: {
    position: 'absolute',
    bottom: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(10,14,32,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255,180,90,0.35)',
  },
  charTapHintText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 9,
    color: 'rgba(255,180,90,0.85)',
    letterSpacing: 1.4,
  },
  charStageInner: {
    width: 320,
    height: 320,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Soft warm halo behind the character — diffuse, no hard edge. Reads
  // as "warm light from above" rather than a circle on stage. We layer
  // a tighter inner disc on top to add depth.
  charGlow: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(255,140,0,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,140,0,0.10)',
  },
  // Floor shadow — squashed ellipse under the feet. Lower opacity than
  // before so it doesn't compete with the character silhouette as the
  // dominant orange element on screen.
  charFloorDisc: {
    position: 'absolute',
    bottom: 38,
    width: 200,
    height: 22,
    borderRadius: 100,
    transform: [{ scaleY: 0.5 }],
    opacity: 0.6,
  },

  // Equipped summary chip — quick "what's on me right now" + tap-to-edit.
  // Sits between character stage and category grid as a connective tissue
  // pill (no border-shouting, just a subtle warm-amber outline).
  equippedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    flexWrap: 'nowrap',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,180,90,0.4)',
    backgroundColor: 'rgba(10,14,32,0.55)',
    marginHorizontal: 16,
    marginBottom: 8,
    maxWidth: 360,
  },
  // Per-slot indicator (board / pieces / pet). Sits to the LEFT of
  // each equipped name so the chip is self-documenting at a glance.
  equippedChipSlotIcon: {
    fontSize: 11,
    marginRight: 1,
  },
  // Subtle dot separator between (slot + value) groups. Lower opacity
  // than the values so the eye reads "icon + name" as one unit.
  equippedChipDot: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    marginHorizontal: 2,
  },
  equippedChipText: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 0.4,
  },

  gridWrap: {
    paddingHorizontal: 12,
    paddingBottom: 16,
  },

  // Hero CHARACTER card — full-width, painted icon left, label stack
  // right, chevron tail. Owns the screen's primary action visual weight.
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255,180,90,0.6)',
    marginBottom: 10,
    shadowColor: '#ff8c00',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  heroIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  heroIcon: {
    width: 46,
    height: 46,
  },
  heroTextWrap: {
    flex: 1,
  },
  heroTitle: {
    fontFamily: fonts.heading,
    fontWeight: weight.black,
    fontSize: 15,
    color: '#ffffff',
    letterSpacing: 1.4,
  },
  heroSub: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.4,
    marginTop: 2,
  },
  heroChevron: {
    fontFamily: fonts.body,
    fontWeight: weight.black,
    fontSize: 26,
    color: '#ffffff',
    marginLeft: 6,
    marginRight: 4,
    lineHeight: 26,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },

  // Category cards (8 in a 4-col layout). Smaller than the previous 3-col
  // layout to make room for the hero CHARACTER card above. Width tuned
  // so 4 fit per row on a 390px-wide phone with 12px outer padding +
  // 8px gaps.
  card: {
    width: 80,
    height: 92,
    borderRadius: 12,
    backgroundColor: 'rgba(10,14,32,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    paddingVertical: 8,
    shadowColor: 'rgba(0,0,0,0.6)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  cardIcon: {
    width: 38,
    height: 38,
    marginBottom: 2,
  },
  cardLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 9,
    color: '#ffffff',
    letterSpacing: 0.7,
    textAlign: 'center',
  },
  cardCount: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 9,
    color: colors.orange,
    marginTop: 2,
  },
  newBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
    backgroundColor: '#ff8c00',
  },
  newBadgeText: {
    fontFamily: fonts.body,
    fontWeight: weight.black,
    fontSize: 8,
    color: '#0a0e27',
    letterSpacing: 0.5,
  },
});
