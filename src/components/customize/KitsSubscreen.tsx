// ═══════════════════════════════════════════════════════════════════════
// KitsSubscreen — Drop4's wiring for the engine CategorySubscreen.
//
// As of 2026-05-23 this screen IS the character editor — the legacy
// AmgCreator route was deleted in this pass, and species + skin tone
// editing is inlined here so the player never leaves Kits.
//
// renderItems branches on the Tier-2 sub:
//   · species  → 5-tile species picker (rewrites amgCharacter.species
//                + per-species default colors)
//   · skin     → 12-swatch skin-tone picker (rewrites
//                amgCharacter.colors['Skin 01'])
//   · owned    → flat 2-col grid of every owned part across buckets
//   · hair / face / tops / pants / shoes / hats / accessories →
//                2-col AmgPartCard grid filtered by SlotBucket
//
// Tap on a part card → opens the engine's AmgPartPreviewModal with
// WEAR (owned) or GET FROM BAGS (locked) actions wired into
// characterStore.equipPartVariant or LootBox navigation.
// ═══════════════════════════════════════════════════════════════════════

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Platform } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { PreviewSafeModal } from '../ui/PreviewSafeModal';
import {
  CategorySubscreen,
  AmgPartCard,
  AmgPartPreviewModal,
  DEFAULT_SLOT_BUCKETS,
  type AmgManifestPart,
} from '@amg/cosmetic-ui';
import {
  subcategoriesForBucket,
  subcategoryForPart,
  type TopBucket,
} from '../../data/partSubcategories';
import { KITS_SUB_SLOTS, HERO_SLOTS } from '../../data/drop4Categories';
import { packPrefixFromPartName } from '../../data/amgPartPricing';
import { variantFromPartName } from '@amg/cosmetic-ui';
import {
  DEFAULT_BLENDSHAPES,
  DEFAULT_COLORS_BY_SPECIES,
  type BlendshapeState,
  type CharacterState,
  type SpeciesKey,
} from '@amg/character-runtime/types';
import { SKIN_TONES } from '@amg/character-runtime/skinTones';
import { Slider } from '@amg/character-creator';
import { Character3DPortrait } from '../3d/Character3DPortrait';
import { drop4CosmeticAdapter } from '../../services/cosmeticAdapter';
import { useCharacterStore } from '../../stores/characterStore';
import {
  useLootBoxStore,
  selectWaitingBoxCount,
} from '../../stores/lootBoxStore';
import { haptics } from '../../services/haptics';
import { playSound } from '../../services/audio';
import { KITS_TIERS, type KitsSubId } from '../../data/drop4Categories';
import {
  TINT_COLORS_BY_SLOT,
  TINT_SLOT_PROPERTY,
  type TintSlot,
} from '../../data/colorRegistry';
import { DEFAULT_PALETTE, type VariantDef } from '@amg/cosmetic-ui';

const AMG_MANIFEST_URL =
  'https://pub-8953453f2512408f9c58656d4ea4e681.r2.dev/manifest.json';

const SPECIES_OPTIONS: { id: SpeciesKey; label: string; glyph: string }[] = [
  { id: 'Human',    label: 'Human',    glyph: '\u{1F468}' },
  { id: 'Elves',    label: 'Elf',      glyph: '\u{1F9DD}' },
  { id: 'Goblin',   label: 'Goblin',   glyph: '\u{1F47A}' },
  { id: 'Skeleton', label: 'Skeleton', glyph: '\u{1F480}' },
  { id: 'Zombie',   label: 'Zombie',   glyph: '\u{1F9DF}' },
];

// Per Sidekick blendshape rig: feminine ∈ [0,1] (mid = neutral),
// weight ∈ [-1,1] (mid = neutral), muscle ∈ [0,1] (mid = neutral).
// Presets give one-tap shortcuts to the canonical builds (matches the
// engine's BodyTab presets in @amg/character-creator/tabs/BodyTab.tsx).
const BODY_PRESETS: { label: string; blendshapes: BlendshapeState }[] = [
  { label: 'Slim',     blendshapes: { feminine: 0.4, weight: -0.5, muscle: 0.1 } },
  { label: 'Curvy',    blendshapes: { feminine: 0.7, weight:  0.3, muscle: 0.2 } },
  { label: 'Athletic', blendshapes: { feminine: 0.5, weight: -0.1, muscle: 0.8 } },
  { label: 'Bulky',    blendshapes: { feminine: 0.2, weight:  0.4, muscle: 0.9 } },
];

// ── Unlockable tint color mapping ────────────────────────────────────
// Maps KitsSubId → TintSlot so the swatch row knows which colors to
// render. Hair and Beard share the same slot (both tint 'Hair 01').
// Subs without a tint slot (species, skin, hats, etc.) get no swatches.

const KITS_SUB_TO_TINT_SLOT: Partial<Record<KitsSubId, TintSlot>> = {
  hairstyle: 'hair',
  beard:     'hair',
  tops:      'tops',
  pants:     'pants',
  shoes:     'shoes',
};

/** Outfit subs that get the CoD-camo variant picker instead of (or
 *  in addition to) the flat tint color row. The variant picker shows
 *  all 24 non-default palette variants with rarity borders, duo-chrome
 *  split swatches, and lock/owned state. */
const OUTFIT_CAMO_SUBS: Set<KitsSubId> = new Set(['tops', 'pants', 'shoes']);

/** Rarity-keyed border + glow colors for the camo variant picker.
 *  Matches the lootbox reveal screen's tier treatments. */
const VARIANT_RARITY_COLOR: Record<string, string> = {
  common:    'rgba(255,255,255,0.2)',
  uncommon:  'rgba(46,204,113,0.5)',
  rare:      'rgba(74,105,189,0.7)',
  epic:      'rgba(155,89,182,0.7)',
  legendary: 'rgba(241,196,15,0.8)',
};

/** Rarity-coded border colors for locked swatches so the player can
 *  see at a glance which colors are common vs legendary in loot boxes. */
const RARITY_BORDER: Record<string, string> = {
  common:    'rgba(255,255,255,0.2)',
  rare:      'rgba(74,105,189,0.6)',
  epic:      'rgba(155,89,182,0.6)',
  legendary: 'rgba(241,196,15,0.6)',
};

interface Props {
  onClose: () => void;
}

export function KitsSubscreen({ onClose }: Props) {
  const navigation = useNavigation<any>();

  // Force Canvas remount after returning from LootBox. React Navigation
  // on web hides the previous screen, which destroys the WebGL context.
  // Changing the key forces a fresh Canvas with a new context.
  const [canvasKey, setCanvasKey] = useState(0);
  const didMount = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (!didMount.current) {
        didMount.current = true;
        return;
      }
      setCanvasKey((k) => k + 1);
    }, []),
  );

  // Web: React Navigation's tab wrapper acquires a non-zero scrollLeft
  // when CategorySubscreen mounts (browser auto-scroll-into-view on
  // focus). This pushes the left rail and back button off-screen.
  // Attach scroll listeners on every ancestor that suppress horizontal
  // scroll so the browser can never shift the layout.
  const rootRef = useRef<View>(null);
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const node = (rootRef.current as unknown) as HTMLElement | null;
    if (!node) return;
    const handlers: Array<[HTMLElement, () => void]> = [];
    let el: HTMLElement | null = node;
    while (el) {
      const target = el;
      const handler = () => {
        if (target.scrollLeft !== 0) target.scrollLeft = 0;
      };
      target.addEventListener('scroll', handler, { passive: true });
      handlers.push([target, handler]);
      handler();
      el = el.parentElement;
    }
    return () => {
      for (const [t, h] of handlers) t.removeEventListener('scroll', h);
    };
  }, []);

  const amgCharacter = useCharacterStore(
    (s) => s.amgCharacter,
  ) as unknown as CharacterState | null;
  const setAmgCharacter = useCharacterStore((s) => s.setAmgCharacter);
  const isAmgPartOwned = useCharacterStore((s) => s.isAmgPartOwned);
  const isTintColorOwned = useCharacterStore((s) => s.isTintColorOwned);
  const equipPartVariant = useCharacterStore((s) => s.equipPartVariant);
  const unequipSlot = useCharacterStore((s) => s.unequipSlot);
  const ownedAmgParts = useCharacterStore((s) => s.ownedAmgParts);
  const setOutfitVariant = useCharacterStore((s) => s.setOutfitVariant);
  const equippedOutfitVariant = useCharacterStore((s) => s.equippedOutfitVariant);
  const isPartVariantOwned = useCharacterStore((s) => s.isPartVariantOwned);
  const ownedBoxes = useLootBoxStore((s) => s.ownedBoxes);
  const waitingBoxes = useMemo(
    () => selectWaitingBoxCount({ ownedBoxes } as any),
    [ownedBoxes],
  );

  // Manifest fetched once on mount, cached across tier/sub switches.
  const [manifest, setManifest] = useState<AmgManifestPart[] | null>(null);
  const [manifestError, setManifestError] = useState(false);
  const [manifestRetry, setManifestRetry] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setManifestError(false);
    (async () => {
      try {
        const r = await fetch(AMG_MANIFEST_URL);
        if (!r.ok) {
          if (!cancelled) setManifestError(true);
          return;
        }
        const data = await r.json();
        if (!cancelled) setManifest(data.parts as AmgManifestPart[]);
      } catch {
        if (!cancelled) setManifestError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [manifestRetry]);

  // Dressing-room mirror state.
  const [previewPart, setPreviewPart] = useState<{
    name: string;
    slot: string;
  } | null>(null);

  // Selection state — engine manages internally by default; we mirror
  // for renderItems' branching.
  const [activeTierId, setActiveTierId] = useState<string>(KITS_TIERS[0].id);
  const [activeSubId, setActiveSubId] = useState<KitsSubId>(
    KITS_TIERS[0].subcategories[0].id as KitsSubId,
  );

  // Sub-sub-cat ("All / Hoodies / Shirts / …") keyed by tier-2 sub id.
  // Players land on 'All' by default for every bucket so they see
  // everything first; tap a chip to narrow ("just show me Long hair").
  // Persisting per-sub means switching from Hair to Tops and back
  // restores the player's last filter on Hair.
  const [subSubcatBySub, setSubSubcatBySub] = useState<
    Partial<Record<KitsSubId, string>>
  >({});
  const setActiveSubSubcat = (sub: KitsSubId, value: string) =>
    setSubSubcatBySub((prev: Partial<Record<KitsSubId, string>>) => ({ ...prev, [sub]: value }));

  // Species filter for the item grids — 'All' shows every species,
  // otherwise filters to just that species' parts. Even on 'All' the
  // sort ranks the player's own species first so they see their
  // matching items at the top without an extra tap.
  const playerSpecies: SpeciesKey = amgCharacter?.species ?? 'Human';
  // Default to the player's own species so they only see compatible
  // parts (especially hair/beard/brows which are modeled per-species
  // and sit wrong on the wrong head shape). 'All' is one tap away
  // in the VIEW ALL modal for players who want to browse everything.
  const [speciesFilter, setSpeciesFilter] = useState<'All' | SpeciesKey>(playerSpecies);

  // VIEW ALL modal — full-screen browser with proper-sized chips and a
  // multi-column grid. The 110-px narrow right column couldn't fit a
  // readable horizontal chip row + thumbnails, so filtering chips moved
  // out of inline rendering entirely (Devon 2026-05-23: "the sub filters
  // on the right side arent good i cant even navigate through them.
  // we need a view all option to make this easier"). The inline column
  // is now a quick-equip view (species-sorted list, no chip controls);
  // VIEW ALL opens this modal which gets a full-screen grid + big chips.
  const [viewAllOpen, setViewAllOpen] = useState(false);

  // currentSub* — derived from activeSubId so the modal can render with
  // the right title / item set / chip list without re-running
  // filterManifestForSub inside renderItems' closure.
  const currentSubId = activeSubId as KitsSubId;
  const currentItems = useMemo(() => {
    if (!manifest) return [];
    return filterManifestForSub(
      manifest,
      currentSubId,
      speciesFilter,
      playerSpecies,
      isAmgPartOwned,
    );
  }, [
    manifest,
    currentSubId,
    speciesFilter,
    playerSpecies,
    isAmgPartOwned,
    ownedAmgParts,
  ]);
  const currentSubSubcats = subSubcatsFor(currentSubId);
  const currentSubSubcat = subSubcatBySub[currentSubId] ?? 'All';
  const currentSubLabel = useMemo(() => {
    for (const t of KITS_TIERS) {
      for (const s of t.subcategories) {
        if (s.id === currentSubId) return s.label;
      }
    }
    return '';
  }, [currentSubId]);

  const renderCharacterPreview = (opts: {
    width: number;
    height: number;
    cameraPreset: 'body' | 'face';
  }) => (
    <Character3DPortrait
      key={canvasKey}
      width={opts.width}
      height={opts.height}
      cameraPreset={opts.cameraPreset}
      showFloor={false}
    />
  );

  // ── Species swap ────────────────────────────────────────────────
  // Updating species also writes the per-species default colors so the
  // character actually looks like a Goblin / Elf / etc. after the tap.
  // Parts are kept as-is — if the new species needs different head /
  // hair parts the player can swap those in the relevant Tier-2.
  const setSpecies = (next: SpeciesKey) => {
    if (!amgCharacter) return;
    if (amgCharacter.species === next) return;
    haptics.win();
    playSound('click');
    const defaults = DEFAULT_COLORS_BY_SPECIES[next];
    setAmgCharacter({
      ...amgCharacter,
      species: next,
      colors: { ...defaults, ...amgCharacter.colors, 'Skin 01': defaults['Skin 01'] },
    } as unknown as Record<string, unknown>);
  };

  const setSkinTone = (hex: string) => {
    if (!amgCharacter) return;
    haptics.tap();
    playSound('click');
    setAmgCharacter({
      ...amgCharacter,
      colors: { ...(amgCharacter.colors ?? {}), 'Skin 01': hex },
    } as unknown as Record<string, unknown>);
  };

  // Body sliders + presets — both write into amgCharacter.blendshapes.
  // Falls back to DEFAULT_BLENDSHAPES when the saved character pre-dates
  // the blendshape rig (legacy starter chars seeded before sliders shipped).
  const blendshapes: BlendshapeState =
    amgCharacter?.blendshapes ?? DEFAULT_BLENDSHAPES;

  const setBlendshape = (key: keyof BlendshapeState, v: number) => {
    if (!amgCharacter) return;
    setAmgCharacter({
      ...amgCharacter,
      blendshapes: { ...blendshapes, [key]: v },
    } as unknown as Record<string, unknown>);
  };

  const applyBodyPreset = (bs: BlendshapeState) => {
    if (!amgCharacter) return;
    haptics.win();
    playSound('click');
    setAmgCharacter({
      ...amgCharacter,
      blendshapes: { ...blendshapes, ...bs },
    } as unknown as Record<string, unknown>);
  };

  const renderItems = (_tierId: string, subId: string) => {
    const sub = subId as KitsSubId;

    if (sub === 'species') {
      return (
        <SpeciesPicker
          activeSpecies={amgCharacter?.species ?? 'Human'}
          onPick={setSpecies}
        />
      );
    }

    if (sub === 'skin') {
      return (
        <SkinPicker
          activeColor={amgCharacter?.colors?.['Skin 01'] ?? '#dcb088'}
          onPick={setSkinTone}
        />
      );
    }

    if (sub === 'sliders') {
      return (
        <BodyPanel
          blendshapes={blendshapes}
          onChange={setBlendshape}
          onApplyPreset={applyBodyPreset}
        />
      );
    }

    if (manifestError) {
      return <ErrorTile onRetry={() => setManifestRetry((n) => n + 1)} />;
    }

    if (!manifest) {
      return <LoadingTile />;
    }

    const items = filterManifestForSub(
      manifest,
      sub,
      speciesFilter,
      playerSpecies,
      isAmgPartOwned,
    );
    if (items.length === 0) {
      return <EmptyTile message="No items in this category yet." />;
    }

    // Inline column is intentionally chip-free — the 110-px narrow
    // right rail can't fit a readable horizontal chip row, so all
    // filtering (species + sub-sub-cat) moved to the VIEW ALL modal.
    // The inline list is already species-sorted (player-species first
    // via filterManifestForSub) so the most relevant items surface
    // at the top without an extra tap. Players who need to narrow
    // further open the modal.
    const tintSlot = KITS_SUB_TO_TINT_SLOT[sub];
    const showCamoPicker = OUTFIT_CAMO_SUBS.has(sub);

    // Resolve the hero part for the active sub so we can check variant
    // ownership against it. The camo picker shows "owned" for variants
    // the player has unlocked on ANY part in their equipped outfit.
    const heroSlotName = HERO_SLOTS[sub]?.hero;
    const equippedHeroPart = heroSlotName
      ? ((amgCharacter as any)?.parts as Record<string, string> | undefined)?.[heroSlotName]
      : undefined;

    return (
      <View style={{ width: '100%' }}>
        {showCamoPicker && (
          <VariantCamoRow
            activeVariantId={equippedOutfitVariant}
            equippedPartName={equippedHeroPart}
            isVariantOwned={isPartVariantOwned}
            onPickOwned={(variantId) => {
              haptics.win();
              playSound('click');
              setOutfitVariant(variantId);
            }}
            onPickLocked={() => {
              haptics.tap();
              playSound('click');
              navigation.navigate('LootBox' as never);
            }}
          />
        )}
        {tintSlot && !showCamoPicker && (
          <UnlockableColorRow
            slot={tintSlot}
            label={tintSlot === 'hair' ? 'HAIR COLOR' : 'COLOR'}
            activeColor={amgCharacter?.colors?.[TINT_SLOT_PROPERTY[tintSlot]]}
            isOwned={isTintColorOwned}
            onPickOwned={(hex) => {
              if (!amgCharacter) return;
              haptics.tap();
              playSound('click');
              const prop = TINT_SLOT_PROPERTY[tintSlot];
              setAmgCharacter({
                ...amgCharacter,
                colors: { ...(amgCharacter.colors ?? {}), [prop]: hex },
              } as unknown as Record<string, unknown>);
            }}
            onPickLocked={() => {
              haptics.tap();
              playSound('click');
              navigation.navigate('LootBox' as never);
            }}
          />
        )}
        <Pressable
          onPress={() => {
            haptics.tap();
            playSound('click');
            setViewAllOpen(true);
          }}
          style={styles.viewAllBtn}
          accessibilityRole="button"
          accessibilityLabel={`View all ${items.length} items with filters`}
        >
          <Text style={styles.viewAllText}>VIEW ALL</Text>
          <Text style={styles.viewAllCount}>{items.length}</Text>
        </Pressable>
        <View style={styles.itemGrid}>
          {items.map((p) => {
            const heroSlot = HERO_SLOTS[currentSubId]?.hero ?? p.slot;
            const parts = (amgCharacter as any)?.parts as Record<string, string> | undefined;
            return (
              <AmgPartCard
                key={p.name}
                partName={p.name}
                owned={isAmgPartOwned(p.name)}
                isEquipped={parts?.[heroSlot] === p.name}
                adapter={drop4CosmeticAdapter}
                size="compact"
                onEquip={(name) => setPreviewPart({ name, slot: p.slot })}
                onBuy={(name) => setPreviewPart({ name, slot: p.slot })}
                hooks={{ playClick: () => playSound('click') }}
              />
            );
          })}
        </View>
      </View>
    );
  };

  const previewIsOwned = previewPart ? isAmgPartOwned(previewPart.name) : false;
  const isCurrentlyEquipped = (() => {
    if (!previewPart || !amgCharacter) return false;
    const parts = (amgCharacter as unknown as { parts?: Record<string, string> }).parts ?? {};
    return parts[previewPart.slot] === previewPart.name;
  })();

  return (
    <View ref={rootRef} style={{ flex: 1 }}>
      <CategorySubscreen
        title="Kits"
        onClose={onClose}
        tiers={KITS_TIERS}
        controlledActiveTierId={activeTierId}
        controlledActiveSubId={activeSubId}
        onTierChange={(id) => {
          setActiveTierId(id);
          const firstSub = KITS_TIERS.find((t) => t.id === id)?.subcategories[0]?.id;
          if (firstSub) setActiveSubId(firstSub as KitsSubId);
        }}
        onSubcategoryChange={(id) => setActiveSubId(id as KitsSubId)}
        renderCharacterPreview={renderCharacterPreview}
        renderItems={renderItems}
        onBagsPress={() => {
          haptics.tap();
          playSound('click');
          navigation.navigate('LootBox' as never);
        }}
        bagsBadgeCount={waitingBoxes}
      />

      <BrowseAllModal
        visible={viewAllOpen}
        onClose={() => setViewAllOpen(false)}
        title={currentSubLabel}
        items={currentItems}
        speciesFilter={speciesFilter}
        onSpeciesFilterChange={setSpeciesFilter}
        subSubcats={currentSubSubcats}
        activeSubSubcat={currentSubSubcat}
        onSubSubcatChange={(c) => setActiveSubSubcat(currentSubId, c)}
        isOwned={isAmgPartOwned}
        onPickPart={(name, slot) => setPreviewPart({ name, slot })}
        equippedPartName={(() => {
          const heroSlot = HERO_SLOTS[currentSubId]?.hero;
          if (!heroSlot) return null;
          return ((amgCharacter as any)?.parts as Record<string, string> | undefined)?.[heroSlot] ?? null;
        })()}
      />

      <PreviewSafeModal
        visible={previewPart !== null}
        onRequestClose={() => setPreviewPart(null)}
      >
        <AmgPartPreviewModal
          visible={previewPart !== null}
          partName={previewPart?.name ?? null}
          slot={previewPart?.slot ?? null}
          adapter={drop4CosmeticAdapter}
          currentCharacter={amgCharacter}
          renderCharacterPreview={(swappedCharacter, opts) => (
            <Character3DPortrait
              width={opts.width}
              height={opts.height}
              customization={swappedCharacter as CharacterState}
              cameraPreset={
                opts.slot === 'Hair' || opts.slot === 'FacialHair' ||
                opts.slot === 'EyebrowLeft' || opts.slot === 'EyebrowRight' ||
                opts.slot === 'EarLeft' || opts.slot === 'EarRight'
                  ? 'face'
                  : 'body'
              }
              showFloor={false}
            />
          )}
          onClose={() => setPreviewPart(null)}
          isCurrentlyEquipped={isCurrentlyEquipped}
          onUnequip={
            isCurrentlyEquipped && previewPart
              ? () => {
                  haptics.win();
                  playSound('click');
                  const heroConfig = HERO_SLOTS[currentSubId];
                  unequipSlot(
                    previewPart.slot,
                    heroConfig?.companions,
                  );
                  setPreviewPart(null);
                }
              : undefined
          }
          onEquip={
            previewIsOwned && previewPart
              ? () => {
                  haptics.win();
                  playSound('click');
                  const variant = variantFromPartName(previewPart.name);
                  equipPartVariant(previewPart.slot, previewPart.name, variant);
                  const heroConfig = HERO_SLOTS[currentSubId];
                  if (heroConfig && manifest) {
                    const pack = packPrefixFromPartName(previewPart.name);
                    const species = (amgCharacter as any)?.species ?? 'Human';
                    for (const companionSlot of heroConfig.companions) {
                      const match = manifest.find(
                        (p) =>
                          p.slot === companionSlot &&
                          p.species === species &&
                          packPrefixFromPartName(p.name) === pack &&
                          variantFromPartName(p.name) === variant,
                      );
                      if (match) {
                        equipPartVariant(companionSlot, match.name, variant);
                      }
                    }
                  }
                  setPreviewPart(null);
                }
              : undefined
          }
          lockedActionLabel={!previewIsOwned ? 'GET FROM BAGS' : undefined}
          onBuy={
            !previewIsOwned
              ? () => {
                  haptics.tap();
                  playSound('click');
                  setPreviewPart(null);
                  navigation.navigate('LootBox' as never);
                }
              : undefined
          }
          hooks={{
            playClick: () => playSound('click'),
            playWhoosh: () => playSound('click'),
          }}
        />
      </PreviewSafeModal>
    </View>
  );
}

// ─── Inline editors ─────────────────────────────────────────────────

function SpeciesPicker({
  activeSpecies,
  onPick,
}: {
  activeSpecies: SpeciesKey;
  onPick: (s: SpeciesKey) => void;
}) {
  return (
    <View style={styles.speciesGrid}>
      {SPECIES_OPTIONS.map((sp) => {
        const active = sp.id === activeSpecies;
        return (
          <Pressable
            key={sp.id}
            onPress={() => onPick(sp.id)}
            style={[
              styles.speciesTile,
              {
                borderColor: active ? '#ffb347' : 'rgba(255,255,255,0.18)',
                backgroundColor: active
                  ? 'rgba(255,140,0,0.22)'
                  : 'rgba(10,14,32,0.7)',
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={`${sp.label}${active ? ', selected' : ''}`}
            accessibilityState={{ selected: active }}
          >
            <Text style={styles.speciesGlyph}>{sp.glyph}</Text>
            <Text
              style={[
                styles.speciesLabel,
                { color: active ? '#ffffff' : 'rgba(255,255,255,0.75)' },
              ]}
              numberOfLines={1}
            >
              {sp.label.toUpperCase()}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function SpeciesFilterChips({
  active,
  onPick,
}: {
  active: 'All' | SpeciesKey;
  onPick: (v: 'All' | SpeciesKey) => void;
}) {
  const options: Array<{ id: 'All' | SpeciesKey; label: string }> = [
    { id: 'All',      label: 'All' },
    { id: 'Human',    label: 'Human' },
    { id: 'Elves',    label: 'Elf' },
    { id: 'Goblin',   label: 'Goblin' },
    { id: 'Skeleton', label: 'Skeleton' },
    { id: 'Zombie',   label: 'Zombie' },
  ];
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chipRow}
    >
      {options.map((opt) => {
        const isActive = opt.id === active;
        return (
          <Pressable
            key={opt.id}
            onPress={() => {
              haptics.tap();
              playSound('click');
              onPick(opt.id);
            }}
            style={[
              styles.chip,
              {
                borderColor: isActive ? '#3eb489' : 'rgba(255,255,255,0.18)',
                backgroundColor: isActive
                  ? 'rgba(62,180,137,0.22)'
                  : 'rgba(10,14,32,0.7)',
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Filter species: ${opt.label}${isActive ? ', selected' : ''}`}
            accessibilityState={{ selected: isActive }}
          >
            <Text
              style={[
                styles.chipText,
                { color: isActive ? '#ffffff' : 'rgba(255,255,255,0.75)' },
              ]}
              numberOfLines={1}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function SubSubcatChips({
  values,
  active,
  onPick,
}: {
  values: string[];
  active: string;
  onPick: (v: string) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chipRow}
    >
      {values.map((v) => {
        const isActive = v === active;
        return (
          <Pressable
            key={v}
            onPress={() => {
              haptics.tap();
              playSound('click');
              onPick(v);
            }}
            style={[
              styles.chip,
              {
                borderColor: isActive ? '#ffb347' : 'rgba(255,255,255,0.18)',
                backgroundColor: isActive
                  ? 'rgba(255,140,0,0.22)'
                  : 'rgba(10,14,32,0.7)',
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={`${v}${isActive ? ', selected' : ''}`}
            accessibilityState={{ selected: isActive }}
          >
            <Text
              style={[
                styles.chipText,
                { color: isActive ? '#ffffff' : 'rgba(255,255,255,0.75)' },
              ]}
              numberOfLines={1}
            >
              {v}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

// ─── VIEW ALL modal ─────────────────────────────────────────────────
// Full-screen browser for the currently-drilled-in sub. Player taps
// VIEW ALL in the narrow inline column → this opens with big readable
// filter chips at the top (Species + Style sub-sub-cat) and a 3-col
// grid of part thumbnails below. Tapping a card opens the preview
// modal on top (Browse stays open so the player can keep shopping
// after equipping). The browse modal owns its own filter state for
// sub-sub-cat (the parent supplies the active value + setter) so
// changes here persist when the modal closes.
function BrowseAllModal({
  visible,
  onClose,
  title,
  items,
  speciesFilter,
  onSpeciesFilterChange,
  subSubcats,
  activeSubSubcat,
  onSubSubcatChange,
  isOwned,
  onPickPart,
  equippedPartName,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  items: AmgManifestPart[];
  speciesFilter: 'All' | SpeciesKey;
  onSpeciesFilterChange: (v: 'All' | SpeciesKey) => void;
  subSubcats: string[] | null;
  activeSubSubcat: string;
  onSubSubcatChange: (v: string) => void;
  isOwned: (name: string) => boolean;
  onPickPart: (name: string, slot: string) => void;
  equippedPartName?: string | null;
}) {
  // `items` is already species-filtered by the parent — apply the
  // sub-sub-cat narrow here so changing the chip updates instantly
  // without re-running the parent's manifest filter.
  const filtered = useMemo(() => {
    if (!subSubcats || activeSubSubcat === 'All') return items;
    return items.filter(
      (p) => subcategoryForPart(p.name, p.slot) === activeSubSubcat,
    );
  }, [items, subSubcats, activeSubSubcat]);

  return (
    // PreviewSafeModal (not Modal): RN's Modal portals to document.body
    // on web and escapes the 390x844 PhoneFrame, so the BrowseAll
    // overlay would render full-monitor instead of phone-sized. The
    // safe wrapper renders an absolute-fill overlay on web (clipped
    // to PhoneFrame.screen) and a real Modal on native.
    <PreviewSafeModal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      transparent={false}
    >
      <View style={browseStyles.container}>
        {/* Header — title + close. */}
        <View style={browseStyles.header}>
          <Text style={browseStyles.title} numberOfLines={1}>
            {title.toUpperCase()}
          </Text>
          <Pressable
            onPress={() => {
              haptics.tap();
              playSound('click');
              onClose();
            }}
            style={browseStyles.closeBtn}
            accessibilityRole="button"
            accessibilityLabel="Close browse"
          >
            <Text style={browseStyles.closeText}>{'×'}</Text>
          </Pressable>
        </View>

        {/* Filters — species always, sub-sub-cat only when relevant. */}
        <View style={browseStyles.filterSection}>
          <Text style={browseStyles.filterLabel}>SPECIES</Text>
          <SpeciesFilterChips
            active={speciesFilter}
            onPick={onSpeciesFilterChange}
          />
        </View>
        {subSubcats && subSubcats.length > 1 && (
          <View style={browseStyles.filterSection}>
            <Text style={browseStyles.filterLabel}>STYLE</Text>
            <SubSubcatChips
              values={subSubcats}
              active={activeSubSubcat}
              onPick={onSubSubcatChange}
            />
          </View>
        )}

        {/* Result count strip — gives the player feedback that filters
            actually did something ("23 results" vs "0 results"). */}
        <View style={browseStyles.countStrip}>
          <Text style={browseStyles.countText}>
            {filtered.length}{' '}
            {filtered.length === 1 ? 'item' : 'items'}
          </Text>
        </View>

        {/* Grid — 3-col responsive layout. Scrolls vertically. */}
        <ScrollView
          contentContainerStyle={browseStyles.grid}
          showsVerticalScrollIndicator={false}
        >
          {filtered.length === 0 ? (
            <View style={browseStyles.emptyWrap}>
              <Text style={browseStyles.emptyText}>
                No items match these filters.
              </Text>
              <Text style={browseStyles.emptyHint}>
                Try a different species or style filter.
              </Text>
            </View>
          ) : (
            filtered.map((p) => (
              <View key={p.name} style={browseStyles.gridCell}>
                <AmgPartCard
                  partName={p.name}
                  owned={isOwned(p.name)}
                  isEquipped={p.name === equippedPartName}
                  adapter={drop4CosmeticAdapter}
                  size="compact"
                  onEquip={(name) => onPickPart(name, p.slot)}
                  onBuy={(name) => onPickPart(name, p.slot)}
                  hooks={{ playClick: () => playSound('click') }}
                />
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </PreviewSafeModal>
  );
}

function BodyPanel({
  blendshapes,
  onChange,
  onApplyPreset,
}: {
  blendshapes: BlendshapeState;
  onChange: (key: keyof BlendshapeState, v: number) => void;
  onApplyPreset: (bs: BlendshapeState) => void;
}) {
  const activePresetLabel = (() => {
    const hit = BODY_PRESETS.find(
      (p) =>
        Math.abs(blendshapes.feminine - p.blendshapes.feminine) < 0.02 &&
        Math.abs(blendshapes.weight - p.blendshapes.weight) < 0.02 &&
        Math.abs(blendshapes.muscle - p.blendshapes.muscle) < 0.02,
    );
    return hit?.label ?? null;
  })();

  return (
    <View style={styles.bodyPanel}>
      <Text style={styles.bodyPanelHeader}>SLIDERS</Text>
      <Slider
        label="Masc ↔ Fem"
        value={blendshapes.feminine}
        min={0}
        max={1}
        step={0.01}
        showMidTick
        formatValue={(v) => {
          // Read the slider direction in plain English so the player
          // doesn't have to map 0.30 ↔ "more masculine" in their head.
          if (v < 0.4) return 'MASC';
          if (v > 0.6) return 'FEM';
          return 'MID';
        }}
        onChange={(v) => onChange('feminine', v)}
      />
      <Slider
        label="Weight"
        value={blendshapes.weight}
        min={-1}
        max={1}
        step={0.01}
        showMidTick
        formatValue={(v) => (v > 0 ? `+${v.toFixed(2)}` : v.toFixed(2))}
        onChange={(v) => onChange('weight', v)}
      />
      <Slider
        label="Muscle"
        value={blendshapes.muscle}
        min={0}
        max={1}
        step={0.01}
        showMidTick
        formatValue={(v) => v.toFixed(2)}
        onChange={(v) => onChange('muscle', v)}
      />
      <Text style={styles.bodyPanelHeader}>PRESETS</Text>
      <View style={styles.presetCol}>
        {BODY_PRESETS.map((p) => {
          const active = p.label === activePresetLabel;
          return (
            <Pressable
              key={p.label}
              onPress={() => onApplyPreset(p.blendshapes)}
              style={[
                styles.presetBtn,
                {
                  borderColor: active ? '#ffb347' : 'rgba(255,255,255,0.18)',
                  backgroundColor: active
                    ? 'rgba(255,140,0,0.22)'
                    : 'rgba(10,14,32,0.7)',
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`${p.label} body preset${active ? ', selected' : ''}`}
              accessibilityState={{ selected: active }}
            >
              <Text
                style={[
                  styles.presetBtnText,
                  { color: active ? '#ffffff' : 'rgba(255,255,255,0.78)' },
                ]}
              >
                {p.label.toUpperCase()}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function SkinPicker({
  activeColor,
  onPick,
}: {
  activeColor: string;
  onPick: (hex: string) => void;
}) {
  return (
    <View style={styles.skinGrid}>
      {SKIN_TONES.map((hex: string) => {
        const active = hex.toLowerCase() === activeColor.toLowerCase();
        return (
          <Pressable
            key={hex}
            onPress={() => onPick(hex)}
            style={[
              styles.skinSwatchWrap,
              { borderColor: active ? '#ffb347' : 'rgba(255,255,255,0.18)' },
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Skin tone ${hex}${active ? ', selected' : ''}`}
            accessibilityState={{ selected: active }}
          >
            <View style={[styles.skinSwatch, { backgroundColor: hex }]} />
            {active && (
              <View style={styles.skinCheckBadge}>
                <Text style={styles.skinCheckText}>{'✓'}</Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

function UnlockableColorRow({
  slot,
  label,
  activeColor,
  isOwned,
  onPickOwned,
  onPickLocked,
}: {
  slot: TintSlot;
  label: string;
  activeColor?: string;
  isOwned: (colorId: string) => boolean;
  onPickOwned: (hex: string) => void;
  onPickLocked: () => void;
}) {
  const colors = TINT_COLORS_BY_SLOT[slot];
  return (
    <View style={styles.colorPickerWrap}>
      <Text style={styles.colorPickerLabel}>{label}</Text>
      <View style={styles.colorPickerGrid}>
        {colors.map((tc) => {
          const owned = tc.starter || isOwned(tc.id);
          const active =
            owned &&
            activeColor != null &&
            tc.hex.toLowerCase() === activeColor.toLowerCase();
          return (
            <Pressable
              key={tc.id}
              onPress={() => (owned ? onPickOwned(tc.hex) : onPickLocked())}
              style={[
                styles.colorSwatch,
                {
                  backgroundColor: tc.hex,
                  opacity: owned ? 1 : 0.35,
                  borderColor: active
                    ? '#ffb347'
                    : !owned
                      ? RARITY_BORDER[tc.rarity] ?? 'rgba(255,255,255,0.18)'
                      : 'rgba(255,255,255,0.18)',
                  borderWidth: active ? 2 : 1,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`${tc.name}${active ? ', selected' : ''}${!owned ? ', locked' : ''}`}
              accessibilityState={{ selected: active }}
            >
              {active && (
                <Text style={styles.colorCheck}>{'✓'}</Text>
              )}
              {!owned && (
                <View style={styles.colorLockOverlay}>
                  <Text style={styles.colorLockIcon}>{'🔒'}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ─── CoD-camo variant picker ───────────────────────────────────────
// Shows all 24 non-default palette variants as a compact swatch grid.
// Duo-chrome variants render as split discs (left = hero, right = accent).
// Each swatch has a rarity-coded border. Owned variants are bright and
// tappable; locked variants are dimmed with a lock icon. The active
// variant (equippedOutfitVariant) gets an orange highlight + check.

function VariantCamoRow({
  activeVariantId,
  equippedPartName,
  isVariantOwned,
  onPickOwned,
  onPickLocked,
}: {
  activeVariantId: string;
  equippedPartName?: string;
  isVariantOwned: (partName: string, variantId: string) => boolean;
  onPickOwned: (variantId: string) => void;
  onPickLocked: () => void;
}) {
  // Non-default variants only (skip index 0 = Default).
  const variants = DEFAULT_PALETTE.filter((v) => v.id !== '');

  // Resolve the active variant's display name for the header badge.
  const activeLabel = activeVariantId
    ? (DEFAULT_PALETTE.find((v) => v.id === activeVariantId)?.label ?? 'Unknown')
    : 'Default';
  const activeRarity = activeVariantId
    ? (DEFAULT_PALETTE.find((v) => v.id === activeVariantId)?.rarity ?? 'common')
    : 'common';
  const activeBadgeColor = VARIANT_RARITY_COLOR[activeRarity] ?? 'rgba(255,255,255,0.2)';

  return (
    <View style={camoStyles.wrap}>
      <View style={camoStyles.headerRow}>
        <Text style={camoStyles.label}>CAMOS</Text>
        <View style={[camoStyles.activeBadge, { borderColor: activeBadgeColor }]}>
          <Text style={camoStyles.activeBadgeText}>{activeLabel.toUpperCase()}</Text>
        </View>
      </View>
      <View style={camoStyles.grid}>
        {/* "Default" swatch — resets to base outfit colors */}
        {(() => {
          const isActive = !activeVariantId || activeVariantId === '';
          return (
            <Pressable
              onPress={() => onPickOwned('')}
              style={[
                camoStyles.swatch,
                {
                  borderColor: isActive ? '#ffb347' : 'rgba(255,255,255,0.25)',
                  borderWidth: isActive ? 2 : 1,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Default color${isActive ? ', selected' : ''}`}
              accessibilityState={{ selected: isActive }}
            >
              <View style={[camoStyles.swatchFill, { backgroundColor: '#7f8c8d' }]} />
              {isActive && <Text style={camoStyles.check}>{'✓'}</Text>}
            </Pressable>
          );
        })()}

        {variants.map((v) => {
          // A variant is "owned" if the player owns it for ANY part in
          // their current outfit. Dev mode grants everything.
          const owned = equippedPartName
            ? isVariantOwned(equippedPartName, v.id)
            : false;
          const isActive = activeVariantId === v.id;
          const rarityBorder = VARIANT_RARITY_COLOR[v.rarity] ?? 'rgba(255,255,255,0.2)';
          // Premium rarities (rare+) get a thicker border even when not active
          const isRarePlus = v.rarity === 'rare' || v.rarity === 'epic' || v.rarity === 'legendary';

          return (
            <Pressable
              key={v.id}
              onPress={() => (owned ? onPickOwned(v.id) : onPickLocked())}
              style={[
                camoStyles.swatch,
                {
                  borderColor: isActive ? '#ffb347' : rarityBorder,
                  borderWidth: isActive ? 2 : (isRarePlus ? 1.5 : 1),
                  opacity: owned ? 1 : 0.35,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`${v.label} camo (${v.rarity})${isActive ? ', selected' : ''}${!owned ? ', locked' : ''}`}
              accessibilityState={{ selected: isActive }}
            >
              {v.accent ? (
                // Duo-chrome: diagonal split swatch for visual punch
                <View style={camoStyles.splitFill}>
                  <View style={[camoStyles.splitDiagTop, { backgroundColor: v.color }]} />
                  <View style={[camoStyles.splitDiagBottom, { backgroundColor: v.accent }]} />
                </View>
              ) : (
                // Solid color
                <View style={[camoStyles.swatchFill, { backgroundColor: v.color }]} />
              )}
              {isActive && <Text style={camoStyles.check}>{'✓'}</Text>}
              {!owned && (
                <View style={camoStyles.lockOverlay}>
                  <Text style={camoStyles.lockIcon}>{'🔒'}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const camoStyles = StyleSheet.create({
  wrap: {
    width: '100%',
    marginBottom: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
    paddingHorizontal: 2,
  },
  label: {
    fontWeight: '900',
    fontSize: 8,
    letterSpacing: 1.2,
    color: 'rgba(255,255,255,0.55)',
  },
  activeBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  activeBadgeText: {
    fontWeight: '900',
    fontSize: 7,
    letterSpacing: 1,
    color: 'rgba(255,255,255,0.8)',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  swatch: {
    width: 26,
    height: 26,
    borderRadius: 7,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  swatchFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  splitFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  splitDiagTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: '50%',
  },
  splitDiagBottom: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    bottom: 0,
  },
  check: {
    fontWeight: '900',
    fontSize: 12,
    color: '#ffffff',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    zIndex: 1,
  },
  lockOverlay: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 7,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  lockIcon: {
    fontSize: 10,
  },
});

// ─── Manifest filter ────────────────────────────────────────────────

// Resolve the Synty slot allowlist for a given sub. Custom Drop4 subs
// (hairstyle / beard / brows) come from KITS_SUB_SLOTS; the rest
// (tops / pants / shoes / hats / accessories) defer to the engine's
// DEFAULT_SLOT_BUCKETS map. Returns null for inline-editor subs.
function slotsForSub(sub: KitsSubId): string[] | null {
  const custom = KITS_SUB_SLOTS[sub];
  if (custom) return custom;
  const bucket = DEFAULT_SLOT_BUCKETS.find((b) => b.id === sub);
  return bucket?.slots ?? null;
}

// Curated sub-sub-cat chip lists per sub. Hairstyle / Beard split the
// engine 'hair' bucket's mixed list so the chips on each sub stay
// focused. Brows is small enough that filtering would be noise.
// Tops / Pants / etc. defer to the engine bucket's curated list.
function subSubcatsFor(sub: KitsSubId): string[] | null {
  if (sub === 'hairstyle') return ['All', 'Short', 'Medium', 'Long', 'Buzzed', 'Styled', 'Other'];
  if (sub === 'beard')     return ['All', 'Beards', 'Stubble', 'Sideburns', 'Other'];
  if (sub === 'brows')     return null;
  if (sub === 'tops' || sub === 'pants' || sub === 'shoes' || sub === 'hats' || sub === 'accessories') {
    return subcategoriesForBucket(sub as TopBucket);
  }
  return null;
}

function filterManifestForSub(
  manifest: AmgManifestPart[],
  sub: KitsSubId,
  speciesFilter: 'All' | SpeciesKey,
  playerSpecies: SpeciesKey,
  isOwned: (name: string) => boolean,
): AmgManifestPart[] {
  if (sub === 'species' || sub === 'skin' || sub === 'sliders') return [];

  const slots = slotsForSub(sub);
  if (!slots) return [];

  // For multi-slot buckets (tops/pants/shoes), only show the hero slot
  // so the player sees ~100 torsos instead of ~689 torso+arm+hand parts.
  const heroConfig = HERO_SLOTS[sub];
  const allowedSlots = heroConfig
    ? new Set([heroConfig.hero])
    : new Set(slots);

  // Head-area parts (hair, beard, brows) are modeled per-species and
  // sit incorrectly on the wrong head shape (e.g. goblin hair floats
  // above a human head). Force species match for these subs regardless
  // of the user's species filter setting.
  const HEAD_AREA_SUBS: KitsSubId[] = ['hairstyle', 'beard', 'brows'];
  const forceSpecies = HEAD_AREA_SUBS.includes(sub);

  return manifest
    .filter((p) => {
      if (!allowedSlots.has(p.slot)) return false;
      if (forceSpecies && p.species !== playerSpecies) return false;
      if (!forceSpecies && speciesFilter !== 'All' && p.species !== speciesFilter) return false;
      return true;
    })
    .sort((a, b) => {
      const ao = isOwned(a.name) ? 0 : 1;
      const bo = isOwned(b.name) ? 0 : 1;
      if (ao !== bo) return ao - bo;
      const am = a.species === playerSpecies ? 0 : 1;
      const bm = b.species === playerSpecies ? 0 : 1;
      if (am !== bm) return am - bm;
      return a.name.localeCompare(b.name);
    });
}

// ─── State tiles ────────────────────────────────────────────────────

function LoadingTile() {
  return (
    <View style={styles.stateTile}>
      <Text style={styles.stateTileText}>Loading…</Text>
    </View>
  );
}

function ErrorTile({ onRetry }: { onRetry: () => void }) {
  return (
    <Pressable style={styles.stateTile} onPress={onRetry}>
      <Text style={styles.stateTileText}>Couldn't load — tap to retry</Text>
    </Pressable>
  );
}

function EmptyTile({ message }: { message: string }) {
  return (
    <View style={styles.stateTile}>
      <Text style={styles.stateTileText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  itemGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: 4,
  },
  // Species: single-col tile stack so the full name fits without
  // truncating to "HU…". Narrow column doesn't have room for two
  // species tiles side-by-side with a readable label.
  speciesGrid: {
    flexDirection: 'column',
    gap: 8,
    width: '100%',
  },
  speciesTile: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  speciesGlyph: {
    fontSize: 22,
  },
  speciesLabel: {
    fontWeight: '900',
    fontSize: 10,
    letterSpacing: 0,
    flex: 1,
  },
  // Skin: 4-col swatch grid (12 tones / 4 = 3 rows).
  skinGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  skinSwatchWrap: {
    width: 23,
    height: 23,
    borderRadius: 10,
    borderWidth: 2,
    overflow: 'hidden',
    position: 'relative',
  },
  skinSwatch: {
    flex: 1,
  },
  skinCheckBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#ffb347',
    alignItems: 'center',
    justifyContent: 'center',
  },
  skinCheckText: {
    fontWeight: '900',
    fontSize: 10,
    color: '#0a0e27',
  },
  // Sub-sub-cat chips — used INSIDE the BrowseAllModal (full-screen),
  // not inline (the 110-px column couldn't fit them readably). Sized
  // for thumb-tap with plenty of horizontal breathing room since the
  // modal isn't column-constrained.
  chipRow: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  chip: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  chipText: {
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 0.6,
  },
  // VIEW ALL pill at the top of the inline items column. Player taps
  // → opens BrowseAllModal. Styled to read as an obvious CTA (orange
  // accent + bold caps) so the player knows the chip filters from the
  // old layout are still reachable, just behind a button.
  viewAllBtn: {
    width: '100%',
    paddingVertical: 9,
    paddingHorizontal: 6,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#ffb347',
    backgroundColor: 'rgba(255,140,0,0.22)',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  viewAllText: {
    fontWeight: '900',
    fontSize: 10,
    color: '#ffffff',
    letterSpacing: 1.4,
  },
  viewAllCount: {
    fontWeight: '700',
    fontSize: 10,
    color: 'rgba(255,255,255,0.78)',
  },
  // Body sliders + presets panel.
  bodyPanel: {
    width: '100%',
    paddingVertical: 4,
    gap: 4,
  },
  bodyPanelHeader: {
    fontWeight: '900',
    fontSize: 9,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 1.2,
    marginTop: 8,
    marginBottom: 2,
    paddingHorizontal: 4,
  },
  presetCol: {
    gap: 6,
  },
  presetBtn: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  presetBtnText: {
    fontWeight: '900',
    fontSize: 10,
    letterSpacing: 1,
  },
  // Color picker — compact swatch grid for outfit / hair tinting.
  // Fits in the 110-px narrow column with 4 swatches per row.
  colorPickerWrap: {
    width: '100%',
    marginBottom: 6,
  },
  colorPickerLabel: {
    fontWeight: '900',
    fontSize: 8,
    letterSpacing: 1.2,
    color: 'rgba(255,255,255,0.55)',
    marginBottom: 4,
    paddingHorizontal: 2,
  },
  colorPickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  colorSwatch: {
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorCheck: {
    fontWeight: '900',
    fontSize: 11,
    color: '#ffffff',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  colorLockOverlay: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 6,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  colorLockIcon: {
    fontSize: 9,
  },
  // State tiles (loading / error / empty).
  stateTile: {
    width: '100%',
    paddingVertical: 30,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(10,14,32,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
  },
  stateTileText: {
    fontWeight: '700',
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.6,
  },
});

// ─── BrowseAllModal styles ──────────────────────────────────────────
// Separate StyleSheet so the modal's layout values don't bleed into
// the narrow-column styles above. Full-screen container with the same
// dark Drop4 background; chips render at full readable size since the
// modal isn't column-constrained.
const browseStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0e27',
    paddingTop: 36, // safe-area top
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  title: {
    flex: 1,
    fontWeight: '900',
    fontSize: 22,
    color: '#ffffff',
    letterSpacing: 1.6,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,140,0,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,210,140,0.85)',
  },
  closeText: {
    fontWeight: '900',
    fontSize: 26,
    lineHeight: 28,
    color: '#0a0e27',
    marginTop: -2,
  },
  filterSection: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 4,
  },
  filterLabel: {
    fontWeight: '900',
    fontSize: 10,
    letterSpacing: 1.4,
    color: 'rgba(255,255,255,0.55)',
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  countStrip: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    marginTop: 6,
  },
  countText: {
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 1.2,
    color: 'rgba(255,255,255,0.7)',
  },
  // Grid — flex-wrap with each cell sized ~31% of container width so 3
  // columns fit on a ~390-px screen with comfortable gaps. Uses
  // padding+gap rather than per-cell margin so the last row aligns
  // left without orphan spacing.
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 14,
    paddingBottom: 40,
  },
  gridCell: {
    width: '31.5%',
    alignItems: 'center',
  },
  emptyWrap: {
    width: '100%',
    paddingVertical: 60,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    fontWeight: '900',
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 0.8,
    textAlign: 'center',
  },
  emptyHint: {
    fontWeight: '600',
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
  },
});
