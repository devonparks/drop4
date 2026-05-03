import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import { CharacterCreator } from '@amg/character-creator';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import {
  NEUTRAL_CHARACTER,
  type CharacterState,
  type ContentSource,
} from '@amg/character-runtime';
import { useCharacterStore } from '../stores/characterStore';
import { useShopStore } from '../stores/shopStore';
import { haptics } from '../services/haptics';
import { isStarterPack, packPrefixFromPartName, getPartPrice, RARITY_COLORS, RARITY_LABELS } from '../data/amgPartPricing';
import { PACK_ICON } from '../data/cosmeticIcons';
import { getPartThumb } from '../data/partThumbs';

// ═══════════════════════════════════════════════════════════════════════
// CharacterCreatorScreen — Drop4's wiring for the shared AMG creator
//
// The creator itself lives in @amg/character-creator. This screen:
//   1. Pulls the current character state + ownedAmgParts from
//      Drop4's characterStore
//   2. Hands them to <CharacterCreator> alongside the content source
//   3. Persists the result back on Save
//   4. Handles inline "buy this locked part" via onLockedPart — spends
//      coins from shopStore and unlocks the part so the creator can
//      equip it immediately (GTA-meets-Sims flow).
// ═══════════════════════════════════════════════════════════════════════

// Content fetched from Cloudflare R2 public URL. Same URL works in dev
// and production — no need for the local `npm run serve-content` unless
// you're working offline or iterating on the exporter output. To swap
// back to local dev, change this to 'http://localhost:8080'.
const CONTENT_SOURCE: ContentSource = {
  baseUrl: 'https://pub-8953453f2512408f9c58656d4ea4e681.r2.dev',
};

// CHARACTER_LOOKS lives in @amg/character-creator's packs.ts. Each Look
// targets a specific Sidekick pack; this map turns each look.id into
// the chunky 3D pack cover image (cosmeticIcons.PACK_ICON). The Looks
// gallery in BodyTab uses these instead of the look.emoji glyph.
const LOOK_ICONS = {
  // Human looks
  casual:         PACK_ICON.MDRN_CIVL,
  athletic:       PACK_ICON.MDRN_CIVL,
  tactical:       PACK_ICON.MDRN_POLC,
  samurai:        PACK_ICON.SAMR_WARR,
  knight:         PACK_ICON.FANT_KNGT,
  apocalypse:     PACK_ICON.APOC_OUTL,
  cyberpunk:      PACK_ICON.SCFI_SOLD,
  pirate:         PACK_ICON.PIRT_CAPT,
  // Multi-species looks
  elven_ranger:   PACK_ICON.ELVN_WARR,
  goblin_brawler: PACK_ICON.GOBL_FIGT,
  bone_knight:    PACK_ICON.FANT_SKTN,
  undead_drifter: PACK_ICON.APOC_ZOMB,
};

export function CharacterCreatorScreen() {
  const navigation = useNavigation<any>();
  // Route params: optional initialTab so callers (like Customize) can
  // deep-link into a specific creator tab instead of the default
  // 'body'. Customize CLOTHES → initialTab='outfit', etc.
  const route = useRoute<any>();
  const initialTab = (route.params?.initialTab ?? 'body') as 'body' | 'face' | 'hair' | 'outfit' | 'color';
  // Styled in-app confirm dialog state — replaces the old window.confirm
  // / window.alert blocking pair when the player taps a locked AMG part
  // and is asked to spend coins (or told they can't afford it).
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    onConfirm: () => void;
    confirmOnly?: boolean;
  } | null>(null);

  // characterStore now has a dedicated amgCharacter slot persisted to
  // AsyncStorage alongside the legacy single-GLB customization. First
  // open gets NEUTRAL_CHARACTER; subsequent opens restore the last save.
  //
  // The store types amgCharacter as Record<string, unknown> to stay
  // decoupled from @amg/character-runtime. We cast at this boundary
  // since this screen is the one place that knows the shape is
  // actually CharacterState.
  const amgCharacter = useCharacterStore((s) => s.amgCharacter) as unknown as CharacterState | null;
  const setAmgCharacter = useCharacterStore((s) => s.setAmgCharacter);
  const ownedAmgParts = useCharacterStore((s) => s.ownedAmgParts);
  const unlockAmgPart = useCharacterStore((s) => s.unlockAmgPart);
  const amgStarterSeen = useCharacterStore((s) => s.amgStarterSeen);
  const markAmgStarterSeen = useCharacterStore((s) => s.markAmgStarterSeen);

  // First-open ceremony: tell the player they already own a starter
  // wardrobe so the creator doesn't feel gated from the jump. One-shot
  // per player — gated on characterStore.amgStarterSeen. Delayed a beat
  // so the creator gets to render its first frame before the modal
  // shows up, otherwise it pops before the character finishes loading.
  useEffect(() => {
    if (amgStarterSeen) return;
    const timer = setTimeout(() => {
      haptics.win();
      setConfirmDialog({
        title: '🎁 Starter Wardrobe Unlocked',
        message: "You already own 5 base character heads/hair (one per species) " +
          "and 12 Modern Civilian outfit variants. Browse the Shop's Clothes " +
          "tab to buy more packs (Samurai, Apocalypse, Fighters, and more).",
        confirmLabel: "Let's go",
        confirmOnly: true,
        onConfirm: () => markAmgStarterSeen(),
      });
    }, 600);
    return () => clearTimeout(timer);
  }, [amgStarterSeen, markAmgStarterSeen]);
  const initial = useMemo<CharacterState>(
    () => amgCharacter ?? NEUTRAL_CHARACTER,
    [amgCharacter],
  );

  // Build the ownedParts set the creator wants: combine the player's
  // explicitly-unlocked parts with every starter-pack part we know
  // about. The creator renders a lock chip on any part NOT in this set.
  // Using a Set means the creator's lookup is O(1) per thumbnail.
  //
  // We can't enumerate "every starter part" without the manifest, so we
  // pass the explicit list + rely on the creator's onLockedPart hook
  // for anything else — the starter-pack guard also lives in
  // characterStore.isAmgPartOwned so ownership decisions stay consistent
  // across the app.
  const ownedParts = useMemo(() => new Set(ownedAmgParts), [ownedAmgParts]);

  // Treat any part in a starter pack (Modern Civilians, base species
  // heads/hair, etc.) as owned even when not explicitly enumerated in
  // ownedAmgParts. The creator was rendering padlocks on free starter
  // parts because the player's saved ownedAmgParts list only captures
  // explicit purchases — starter ownership is a rule (pack prefix
  // matches STARTER_PACKS), not enumeration.
  const isPartOwned = useCallback((name: string) => {
    if (ownedAmgParts.includes(name)) return true;
    return isStarterPack(packPrefixFromPartName(name));
  }, [ownedAmgParts]);

  function handleSave(next: CharacterState) {
    haptics.win();
    setAmgCharacter(next as unknown as Record<string, unknown>);
    navigation.goBack();
  }

  function handleCancel() {
    haptics.tap();
    navigation.goBack();
  }

  // Inline buy-and-equip. When the player taps a locked part in any
  // picker (Outfit / Hair / Face), the creator calls this with the part
  // name. We price it, show a coin-spend prompt, and on confirm move
  // coins → unlock the part → the creator picks up the new ownedParts
  // set on the next render and unlocks the thumbnail.
  function handleLockedPart(partName: string) {
    // Starter-pack parts should never reach this handler, but guard
    // anyway so a stale render doesn't double-charge.
    if (isStarterPack(packPrefixFromPartName(partName))) return;

    const { price, rarity } = getPartPrice(partName);
    const coins = useShopStore.getState().coins;

    if (coins < price) {
      haptics.error();
      const shortBy = price - coins;
      setConfirmDialog({
        title: 'Not enough coins',
        message: `This ${RARITY_LABELS[rarity]} part costs ${price.toLocaleString()}. You have ${coins.toLocaleString()} — short by ${shortBy.toLocaleString()}.`,
        confirmLabel: 'Got it',
        onConfirm: () => {},
        confirmOnly: true,
      });
      return;
    }

    setConfirmDialog({
      title: `Buy this ${RARITY_LABELS[rarity]} part?`,
      message: `Unlock for ${price.toLocaleString()} coins. You have ${coins.toLocaleString()}, will leave ${(coins - price).toLocaleString()}.`,
      confirmLabel: `Buy · ${price.toLocaleString()} 🪙`,
      onConfirm: () => {
        const ok = useShopStore.getState().spendCoins(price);
        if (!ok) { haptics.error(); return; }
        haptics.win();
        unlockAmgPart(partName);
      },
    });
  }

  // Creator visual callbacks: rarity tint on every part thumbnail + a
  // coin-price chip on locked ones. The creator itself is economy-
  // agnostic; Drop4 supplies both by routing through getPartPrice().
  // Starter-pack parts skip the chip (their price is 0 + they're always
  // owned) so the UI only highlights purchasable tiers.
  function getRarityColor(partName: string): string | null {
    const { rarity, pack } = getPartPrice(partName);
    if (isStarterPack(pack)) return null;
    return RARITY_COLORS[rarity] ?? null;
  }

  function getPriceLabel(partName: string): string | null {
    const { price, pack } = getPartPrice(partName);
    if (isStarterPack(pack)) return null;
    return `${price} 🪙`;
  }

  return (
    <>
      <CharacterCreator
        source={CONTENT_SOURCE}
        initial={initial}
        ownedParts={ownedParts}
        isPartOwned={isPartOwned}
        onSave={handleSave}
        onCancel={handleCancel}
        onLockedPart={handleLockedPart}
        getRarityColor={getRarityColor}
        getPriceLabel={getPriceLabel}
        savedMessage="✓ SAVED"
        // Deep-link initial tab — Customize CLOTHES routes to 'outfit',
        // OUTFITS routes to 'outfit', everything else lands on default 'body'.
        initialTab={initialTab}
        // Painted chunky 3D dice for the RANDOMIZE action button. Per
        // docs/CUSTOMIZE_AUDIT.md item #4 the raw 🎲 emoji was the last
        // placeholder in an otherwise painted creator; this swaps it for
        // the same gen-art icon language as the rest of the locked
        // VISUAL_DIRECTION lockup.
        randomizeIcon={require('../assets/images/ui/creator-dice.png')}
        // Painted thumbnail per AMG part — replaces the placeholder
        // hash-color swatch in PartGrid with the rendered Unity image
        // for that part. partThumbs.ts has 2870 require()s, one per
        // PNG in src/assets/images/parts/. Fall back to undefined for
        // parts not yet rendered (e.g. broken APOC_ZOMB attachments)
        // and PartGrid uses the hashColor swatch for those.
        getPartThumb={getPartThumb}
        // BodyTab Looks gallery: replaces the per-look emoji glyph with
        // the painted chunky 3D pack cover. One image per Look — Casual /
        // Athletic / Tactical / Samurai / Knight / Pirate / etc. So the
        // first thing a player sees in BODY tab reads as painted product
        // art instead of OS-rendered emoji.
        lookIcons={LOOK_ICONS}
      />
      {/* Styled buy-confirm dialog for inline AMG part purchases (when
          a locked part is tapped in the creator). Replaces the prior
          window.confirm/alert calls that froze the web preview. */}
      <ConfirmDialog
        visible={confirmDialog !== null}
        title={confirmDialog?.title ?? ''}
        message={confirmDialog?.message}
        confirmLabel={confirmDialog?.confirmLabel ?? 'OK'}
        confirmOnly={confirmDialog?.confirmOnly}
        onConfirm={() => {
          confirmDialog?.onConfirm();
          setConfirmDialog(null);
        }}
        onCancel={() => setConfirmDialog(null)}
      />
    </>
  );
}
