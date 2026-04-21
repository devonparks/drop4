import React, { useEffect, useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import { Alert, Platform } from 'react-native';
import { CharacterCreator } from '@amg/character-creator';
import {
  NEUTRAL_CHARACTER,
  type CharacterState,
  type ContentSource,
} from '@amg/character-runtime';
import { useCharacterStore } from '../stores/characterStore';
import { useShopStore } from '../stores/shopStore';
import { haptics } from '../services/haptics';
import { isStarterPack, packPrefixFromPartName, getPartPrice, RARITY_COLORS } from '../data/amgPartPricing';

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

export function CharacterCreatorScreen() {
  const navigation = useNavigation<any>();

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
      Alert.alert(
        '🎁 Starter Wardrobe Unlocked',
        "You already own 5 base character heads/hair (one per species) " +
        "and 12 Modern Civilian outfit variants. Browse the Shop's Clothes " +
        "tab to buy more packs (Samurai, Apocalypse, Fighters, and more).",
        [{ text: "Let's go", onPress: () => markAmgStarterSeen() }],
        { cancelable: false },
      );
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
      const msg = `Not enough coins — this ${rarity} item costs ${price}. You have ${coins}.`;
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Not enough coins', msg);
      return;
    }

    // RN-Web's Alert.alert silently swallows multi-button configs, so
    // we branch: native gets a proper Alert, web uses window.confirm.
    const doBuy = () => {
      const ok = useShopStore.getState().spendCoins(price);
      if (!ok) { haptics.error(); return; }
      haptics.win();
      unlockAmgPart(partName);
    };
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(`Unlock this ${rarity} item for ${price} coins?`);
      if (confirmed) doBuy();
      else haptics.tap();
    } else {
      Alert.alert(
        'Buy this part?',
        `Unlock this ${rarity} item for ${price} coins?`,
        [
          { text: 'Cancel', style: 'cancel', onPress: () => haptics.tap() },
          { text: `Buy ${price}`, style: 'default', onPress: doBuy },
        ],
      );
    }
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
    <CharacterCreator
      source={CONTENT_SOURCE}
      initial={initial}
      ownedParts={ownedParts}
      onSave={handleSave}
      onCancel={handleCancel}
      onLockedPart={handleLockedPart}
      getRarityColor={getRarityColor}
      getPriceLabel={getPriceLabel}
    />
  );
}
