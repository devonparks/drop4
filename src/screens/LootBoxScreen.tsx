import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Dimensions, Animated as RNAnimated, Platform, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { SlideInDown, FadeInUp, ZoomIn } from 'react-native-reanimated';
import { StaggeredEntry } from '../components/animations';
import { useNavigation } from '@react-navigation/native';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { TopBar } from '../components/ui/TopBar';
import { GlossyButton } from '../components/ui/GlossyButton';
import {
  useLootBoxStore,
  LOOT_BOXES,
  LootBoxItem,
  LootBox,
  OpenBoxResult,
  TIER_RARITY_WEIGHTS,
  featuredItemsForWeek,
} from '../stores/lootBoxStore';
import { LootChest, LootChestTier } from '../components/ui/LootChest';
import { useShopStore } from '../stores/shopStore';
import { useCharacterStore, countUniqueCamos } from '../stores/characterStore';
import { haptics } from '../services/haptics';
import { playSound } from '../services/audio';
import { PressScale } from '../components/animations';
import { colors } from '../theme/colors';
import { fonts, weight } from '../theme/typography';
import { boxShadow } from '../utils/shadow';
// DEFAULT_PALETTE + parseVariantDropId let us decode a partVariant
// drop's colorway hex so the reveal screen shows the actual color,
// not just a generic "COLORWAY" chip.
import { DEFAULT_PALETTE } from '@amg/cosmetic-ui';
import { parseVariantDropId } from '@amg/cosmetic-runtime';
// Thumbnail sources for the reveal card. Emotes have painted
// figurines; outfit packs have painted chunky 3D pack covers; AMG
// parts have rendered Unity thumbnails. Everything else falls back
// to a rarity-tinted disc (defined in styles below) so the reveal
// always shows SOMETHING beyond the rarity banner + name.
import { EMOTE_ICON, PACK_ICON } from '../data/cosmeticIcons';
import { getPartThumb } from '../data/partThumbs';
import { OUTFITS } from '../data/outfitRegistry';
import { OUTFIT_PACK_TO_SIDEKICK } from '../data/amgPackMeta';

/** Resolve the best thumbnail source for a reveal item. Returns an
 *  Image source when we have painted art for the category, else null
 *  (caller renders the colored disc fallback). Centralized here so
 *  every drop type gets the same lookup logic — Emotes → painted
 *  figurine, Outfits → pack cover, Parts → Unity thumbnail, etc. */
function thumbnailFor(item: LootBoxItem): any | null {
  switch (item.category) {
    case 'emotes':
      return EMOTE_ICON[item.id] ?? null;
    case 'outfits': {
      const meta = OUTFITS[item.id as keyof typeof OUTFITS];
      const code = meta ? OUTFIT_PACK_TO_SIDEKICK[meta.pack] : null;
      return code ? PACK_ICON[code] ?? null : null;
    }
    case 'pets':
      // Pets render via a 3D component normally — no painted icon yet.
      return null;
    case 'frames':
    case 'boards':
    case 'pieces':
    case 'effects':
    case 'wins':
      return null; // Color disc fallback
    default:
      return null;
  }
}

/** Part variants drop as `partVariant` items — try the Unity thumbnail
 *  for the underlying part. Splits the variant id back to the part name
 *  via parseVariantDropId. */
function partThumbnailFor(item: LootBoxItem): any | null {
  if (item.type === 'partVariant') {
    const { partName } = parseVariantDropId(item.id);
    return getPartThumb(partName) ?? null;
  }
  return null;
}

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const RARITY_COLORS: Record<string, string> = {
  common: '#8892b0',
  // Source-registry tier between common and rare (Mint & Coral, Candy,
  // Midnight, Monochrome). Reveal + dupe banner now show this tag
  // verbatim — preserves the catalog branding.
  uncommon: '#4ade80',
  rare: '#3498db',
  epic: '#9b59b6',
  legendary: '#f1c40f',
  // Source-registry "above legendary" tier. Maps to legendary for
  // shard cost but keeps its own visual tag.
  mythic: '#e94560',
};

const TIER_STYLES: Record<string, {
  gradient: [string, string];
  border: string;
  glow: string;
  icon: string;
  tagColor: string;
  tagBg: string;
}> = {
  bronze: {
    gradient: ['rgba(205,127,50,0.25)', 'rgba(205,127,50,0.05)'],
    border: 'rgba(205,127,50,0.5)',
    glow: 'rgba(205,127,50,0.3)',
    icon: '\u{1F4E6}',
    tagColor: '#cd7f32',
    tagBg: 'rgba(205,127,50,0.2)',
  },
  silver: {
    gradient: ['rgba(192,192,192,0.25)', 'rgba(192,192,192,0.05)'],
    border: 'rgba(192,192,192,0.5)',
    glow: 'rgba(192,192,192,0.3)',
    icon: '\u{1F381}',
    tagColor: '#c0c0c0',
    tagBg: 'rgba(192,192,192,0.2)',
  },
  gold: {
    gradient: ['rgba(241,196,15,0.3)', 'rgba(241,196,15,0.05)'],
    border: 'rgba(241,196,15,0.6)',
    glow: 'rgba(241,196,15,0.4)',
    icon: '\u2728',
    tagColor: '#f1c40f',
    tagBg: 'rgba(241,196,15,0.2)',
  },
  diamond: {
    gradient: ['rgba(52,152,219,0.3)', 'rgba(155,89,182,0.15)'],
    border: 'rgba(52,152,219,0.6)',
    glow: 'rgba(52,152,219,0.4)',
    icon: '\u{1F48E}',
    tagColor: '#3498db',
    tagBg: 'rgba(52,152,219,0.2)',
  },
  // Featured Box uses gold-with-amber styling. The actual chest art falls
  // back to gold below since LootChest doesn't render featured natively.
  featured: {
    gradient: ['rgba(241,196,15,0.32)', 'rgba(241,196,15,0.06)'],
    border: 'rgba(241,196,15,0.7)',
    glow: 'rgba(241,196,15,0.5)',
    icon: '⭐',
    tagColor: '#f1c40f',
    tagBg: 'rgba(241,196,15,0.25)',
  },
};

/** Map a logical box tier (which now includes 'featured') down to a tier
 *  the LootChest component can render. Featured shares gold's chest art. */
function chestTierFor(tier: LootBox['tier']): LootChestTier {
  return tier === 'featured' ? 'gold' : tier;
}

// ── Full-screen opening experience ─────────────────────────────
function BoxOpeningScreen({ box, onReveal, onCancel }: {
  box: LootBox; onReveal: () => void; onCancel: () => void;
}) {
  const tier = TIER_STYLES[box.tier];
  const pulseAnim = useRef(new RNAnimated.Value(0)).current;
  const floatAnim = useRef(new RNAnimated.Value(0)).current;
  const [tapCount, setTapCount] = useState(0);

  useEffect(() => {
    // Pulse glow
    const pulse = RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
        RNAnimated.timing(pulseAnim, { toValue: 0.3, duration: 1200, useNativeDriver: true }),
      ])
    );
    pulse.start();
    // Float
    const float = RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(floatAnim, { toValue: -8, duration: 1500, useNativeDriver: true }),
        RNAnimated.timing(floatAnim, { toValue: 8, duration: 1500, useNativeDriver: true }),
      ])
    );
    float.start();
    return () => { pulse.stop(); float.stop(); };
  }, []);

  const revealedRef = useRef(false);
  const handleTap = () => {
    if (revealedRef.current) return;
    haptics.tap();
    playSound('click');
    const next = tapCount + 1;
    setTapCount(next);
    if (next >= 3 && !revealedRef.current) {
      revealedRef.current = true;
      haptics.heavy();
      playSound('whoosh');
      onReveal();
    }
  };

  return (
    <Pressable
      style={st.openingOverlay}
      onPress={handleTap}
      // Web onClick fallback — LinearGradient inside Pressable can
      // swallow pointer events on web. The whole loot-box-opening
      // gesture is "tap 3 times" so dropped taps are especially bad.
      {...(Platform.OS === 'web'
        ? ({ onClick: handleTap } as any)
        : {})}
      accessibilityRole="button"
      accessibilityLabel={`Tap to open ${box.name}`}
      accessibilityHint="Tap three times to reveal the reward"
    >
      <LinearGradient
        colors={['#0a0e27', '#111b47', '#0a0e27']}
        style={st.openingBg}
      >
        {/* Halftone dot pattern overlay */}
        <View style={st.halftoneOverlay} />

        {/* Back button */}
        <Pressable
          style={st.openingBack}
          onPress={onCancel}
          accessibilityRole="button"
          accessibilityLabel="Cancel opening"
        >
          <Text style={st.openingBackText}>{'\u2190'} Back</Text>
        </Pressable>

        {/* Open your bag header */}
        <Animated.View entering={FadeInUp.delay(200).springify()} style={st.openingHeader}>
          <Text style={st.openingTitle} accessibilityRole="header">Open your bag!</Text>
          <Text style={st.openingArrow}>{'\u25BC'}</Text>
        </Animated.View>

        {/* Tap progress dots */}
        <View style={st.tapProgress}>
          {[0, 1, 2].map(i => (
            <View key={i} style={[st.tapDot, tapCount > i && { backgroundColor: tier.tagColor, boxShadow: `0px 0px 6px ${tier.tagColor}` }]} />
          ))}
        </View>

        {/* The box/bag */}
        <RNAnimated.View style={[st.openingBoxWrap, { transform: [{ translateY: floatAnim }] }]}>
          <RNAnimated.View style={[st.openingGlow, {
            opacity: pulseAnim,
            backgroundColor: tier.glow,
            boxShadow: `0px 0px 40px ${tier.tagColor}`,
          }]} />
          <View style={[st.openingBox, { borderColor: tier.border }]}>
            <LinearGradient colors={tier.gradient as any} style={st.openingBoxInner}>
              {/* Use the SAME painted chest art as the selection list
                  (LootChest at size 96) so the visual continuity holds
                  across the buy → open flow. Was a generic 🎁 / 📦
                  emoji that broke the premium feel of the box rotation.
                  AAA polish 2026-05-04. */}
              <LootChest tier={chestTierFor(box.tier)} size={96} />
              <Text style={[st.openingBoxName, { color: tier.tagColor }]}>{box.name}</Text>
            </LinearGradient>
          </View>
        </RNAnimated.View>

        <Text style={st.openingHint}>Tap to open!</Text>
      </LinearGradient>
    </Pressable>
  );
}

// ── Item reveal screen ─────────────────────────────────────────
//
// Now consumes the full OpenBoxResult so we can surface DUPE / PITY
// state on the card. Dupes don't feel like a loss anymore — the player
// gets shards + a coin refund and the screen makes that visible.
function ItemRevealScreen({ result, onContinue }: { result: OpenBoxResult; onContinue: () => void }) {
  const { item, isDupe, shardsAwarded, coinRefund, wasPityEpic, wasPityLegendary } = result;
  // Prefer the source-registry rarity tag so the reveal matches what
  // the player sees in CategoryBrowser (e.g. an Uncommon piece reveals
  // as "UNCOMMON", not the loot-tier "COMMON" it's accounted as for
  // shard cost). Falls back to the 4-tier rarity for legacy items
  // seeded before displayRarity was added.
  const displayRarity = item.displayRarity ?? item.rarity;
  const rarityColor = RARITY_COLORS[displayRarity] ?? RARITY_COLORS[item.rarity];
  // Friendly category label per drop type. Replaces the prior raw
  // `item.type.toUpperCase()` which read poorly for compound types
  // ('PARTVARIANT' → 'COLORWAY'). Variant drops (Path A, 2026-05-04)
  // get a dedicated label so the player understands "you got a new
  // colorway of an existing part" vs "you got a new part."
  const TYPE_LABEL: Record<typeof item.type, string> = {
    board: 'BOARD',
    pieces: 'PIECES',
    dropFx: 'DROP FX',
    winFx: 'WIN FX',
    frame: 'FRAME',
    outfit: 'OUTFIT',
    pet: 'PET',
    emote: 'EMOTE',
    partVariant: 'COLORWAY',
    tintColor: 'COLOR',
    emoji: 'EMOJI',
    phrase: 'PHRASE',
    outfitColorway: 'COLORWAY',
    coins: 'COINS',
    gems: 'GEMS',
  } as const;
  const categoryLabel = TYPE_LABEL[item.type] ?? String(item.type).toUpperCase();

  return (
    <ScreenBackground>
      <View style={st.revealContainer}>
        {/* Sparkle particles (decorative) */}
        {Array.from({ length: 8 }).map((_, i) => (
          <Animated.View
            key={i}
            entering={ZoomIn.delay(400 + i * 100).springify()}
            style={[st.sparkle, {
              top: SCREEN_H * 0.2 + Math.sin(i * 0.8) * 100,
              left: SCREEN_W * 0.1 + (i / 8) * SCREEN_W * 0.8,
              backgroundColor: rarityColor,
            }]}
          />
        ))}

        <Animated.View entering={SlideInDown.springify().damping(10)} style={st.revealCard}>
          <LinearGradient
            colors={[`${rarityColor}40`, `${rarityColor}15`, 'transparent']}
            style={st.revealGlow}
          />

          {/* Top banner: PITY / DUPE / NEW status takes precedence over
              the bare rarity label so the player understands the roll
              context at a glance. */}
          {(wasPityLegendary || wasPityEpic) ? (
            <View style={[st.revealRarityBanner, { backgroundColor: '#f1c40f30', borderColor: '#f1c40f80' }]}>
              <Text style={[st.revealRarityText, { color: '#f1c40f' }]}>
                {wasPityLegendary ? 'PITY · LEGENDARY' : 'PITY · EPIC'}
              </Text>
            </View>
          ) : isDupe ? (
            <View style={[st.revealRarityBanner, { backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.2)' }]}>
              <Text style={[st.revealRarityText, { color: 'rgba(255,255,255,0.85)' }]}>DUPLICATE</Text>
            </View>
          ) : (
            <View style={[st.revealRarityBanner, { backgroundColor: `${rarityColor}30`, borderColor: `${rarityColor}50` }]}>
              <Text style={[st.revealRarityText, { color: rarityColor }]}>{displayRarity.toUpperCase()}</Text>
            </View>
          )}

          {/* Item thumbnail — painted figurine for emotes, painted pack
              cover for outfits, Unity render for parts, colored disc
              fallback for boards / pieces / effects / wins / frames.
              Audit 2026-05-06: previously the reveal had no item visual
              between the rarity banner and the category chip, which
              under-celebrated the prize. */}
          {(() => {
            const thumb = thumbnailFor(item) ?? partThumbnailFor(item);
            if (thumb) {
              return (
                <Image
                  source={thumb}
                  style={[st.revealThumb, { borderColor: rarityColor }]}
                  resizeMode="contain"
                  accessibilityIgnoresInvertColors
                />
              );
            }
            return (
              <View
                style={[
                  st.revealThumbDisc,
                  { backgroundColor: `${rarityColor}30`, borderColor: rarityColor },
                ]}
              />
            );
          })()}

          {/* Rarity-tinted category chip stands in for the old emoji icon.
              For partVariant drops we sneak the colorway swatch in front of
              the COLORWAY label so the reveal feels like a real "look at
              the new color" moment instead of a generic category tag. */}
          <View style={[st.revealCategoryChip, { borderColor: rarityColor, backgroundColor: `${rarityColor}15` }]}>
            {item.type === 'partVariant' && (() => {
              const { variantId } = parseVariantDropId(item.id);
              const variant = DEFAULT_PALETTE.find((v) => v.id === variantId);
              if (!variant) return null;
              // Duo-chrome variants get a split swatch; solid variants get a disc.
              if (variant.accent) {
                return (
                  <View style={st.revealVariantSwatch}>
                    <View style={[st.revealSwatchHalf, { backgroundColor: variant.color, borderTopLeftRadius: 8, borderBottomLeftRadius: 8 }]} />
                    <View style={[st.revealSwatchHalf, { backgroundColor: variant.accent, borderTopRightRadius: 8, borderBottomRightRadius: 8 }]} />
                  </View>
                );
              }
              return (
                <View
                  style={[st.revealVariantSwatch, { backgroundColor: variant.color }]}
                />
              );
            })()}
            <Text style={[st.revealCategoryChipText, { color: rarityColor }]}>{categoryLabel}</Text>
          </View>
          <Text style={[st.revealName, { color: rarityColor }]}>{item.name}</Text>

          {/* Dupe payout strip — shows what the player got instead of
              the duplicate item. Hidden when the item was new. The
              shard award uses the 4-tier loot rarity (the actual shard
              bucket the player gets) — not the granular displayRarity,
              since shards are awarded in those four buckets. */}
          {isDupe && (shardsAwarded > 0 || coinRefund > 0) && (
            <View style={st.dupePayout}>
              {shardsAwarded > 0 && (
                <Text style={st.dupePayoutLine}>{`+${shardsAwarded} ${item.rarity.toUpperCase()} SHARDS`}</Text>
              )}
              {coinRefund > 0 && (
                <Text style={st.dupePayoutLine}>{`+${coinRefund} COINS REFUND`}</Text>
              )}
            </View>
          )}

          {/* Camo collection progress — fires the collector's brain when
              they see "12 / 24 Camos" and realize they're halfway there. */}
          {item.type === 'partVariant' && !isDupe && (() => {
            const camoCount = countUniqueCamos(useCharacterStore.getState().ownedPartVariants);
            return (
              <Text style={st.collectionHint}>
                {'🎨'} {camoCount} / 24 Camos Collected
              </Text>
            );
          })()}

          {/* Shine line */}
          <View style={st.shineLine} />
        </Animated.View>

        <GlossyButton
          label="CONTINUE"
          variant={item.rarity === 'legendary' ? 'gold' : item.rarity === 'epic' ? 'purple' : 'orange'}
          onPress={onContinue}
          style={{ marginTop: 24 }}
        />
      </View>
    </ScreenBackground>
  );
}

// ── Box card for the list ──────────────────────────────────────
function BoxCard({ box, count, isOpening, onOpen, onBuy, playerCoins, index }: {
  box: LootBox; count: number; isOpening: boolean;
  onOpen: () => void; onBuy: () => void; playerCoins: number; index: number;
}) {
  const tier = TIER_STYLES[box.tier];

  return (
    <Animated.View entering={FadeInUp.delay(index * 80).springify()}>
      <View style={[st.boxCard, { borderColor: tier.border }]}>
        <LinearGradient colors={tier.gradient as any} style={st.boxCardGradient}>
          {/* Tier badge */}
          <View style={[st.tierBadge, { backgroundColor: tier.tagBg, borderColor: tier.border }]}>
            <Text style={[st.tierBadgeText, { color: tier.tagColor }]}>{box.tier.toUpperCase()}</Text>
          </View>

          <View style={st.boxCardRow}>
            {/* Rendered chest art (per-tier composition, no image assets).
                Featured falls back to the gold chest since it's a logical
                tier without its own art (handled by chestTierFor). */}
            <View style={[st.boxIconArea, { borderColor: tier.border }]}>
              <LootChest tier={chestTierFor(box.tier)} size={60} />
            </View>

            {/* Info */}
            <View style={st.boxCardInfo}>
              <Text style={st.boxCardName} numberOfLines={1}>{box.name}</Text>
              <View style={st.boxCountRow}>
                <Text style={st.boxCountLabel}>Owned:</Text>
                <View style={[st.boxCountBadge, count > 0 && { backgroundColor: 'rgba(39,174,61,0.2)' }]}>
                  <Text style={[st.boxCountNum, count > 0 && { color: colors.green }]}>{count}</Text>
                </View>
              </View>
            </View>

            {/* Action */}
            <View style={st.boxActionArea}>
              {count > 0 ? (
                <PressScale
                  onPress={onOpen}
                  disabled={isOpening}
                  scaleTo={0.93}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${box.name}`}
                  accessibilityState={{ disabled: isOpening }}
                >
                  <LinearGradient colors={['#27ae3d', '#1e8a30']} style={st.openBtnGradient}>
                    <Text style={st.openBtnText}>OPEN</Text>
                  </LinearGradient>
                </PressScale>
              ) : box.cost > 0 ? (
                <PressScale
                  onPress={onBuy}
                  disabled={playerCoins < box.cost}
                  scaleTo={0.93}
                  style={{ opacity: playerCoins < box.cost ? 0.5 : 1 }}
                  accessibilityRole="button"
                  accessibilityLabel={`Buy ${box.name} for ${box.cost} coins`}
                  accessibilityState={{ disabled: playerCoins < box.cost }}
                >
                  <LinearGradient
                    colors={playerCoins >= box.cost ? ['#d4ac0d', '#b8960a'] : ['#555', '#444']}
                    style={st.openBtnGradient}
                  >
                    <Text style={[st.openBtnText, { color: '#1a1a00' }]}>{'\u{1FA99}'} {box.cost.toLocaleString()}</Text>
                  </LinearGradient>
                </PressScale>
              ) : (
                <View style={st.emptyWrap}>
                  <Text style={st.emptyText}>Empty</Text>
                </View>
              )}
            </View>
          </View>
        </LinearGradient>
      </View>
    </Animated.View>
  );
}

// ═══════════════════════════════════════════════════════════════
// LOOT BOX SCREEN
// ═══════════════════════════════════════════════════════════════
export function LootBoxScreen() {
  const navigation = useNavigation();
  const { openBox, getBoxCount, addBox } = useLootBoxStore();
  const shards = useLootBoxStore((s) => s.shards);
  const lifetimeOpens = useLootBoxStore((s) => s.lifetimeOpens);
  const coins = useShopStore(s => s.coins);
  const gems = useShopStore(s => s.gems);
  const level = useShopStore(s => s.level);
  const spendCoins = useShopStore(s => s.spendCoins);
  // Reveal state holds the FULL OpenBoxResult so the reveal screen can
  // render dupe + pity context, not just the bare item.
  const [revealedResult, setRevealedResult] = useState<OpenBoxResult | null>(null);
  const [isOpening, setIsOpening] = useState(false);
  const [openingBox, setOpeningBox] = useState<LootBox | null>(null);

  const handleBuyBox = (box: LootBox) => {
    if (box.cost <= 0) return;
    const success = spendCoins(box.cost);
    if (success) {
      addBox(box.id);
      haptics.win();
      playSound('coin');
    } else {
      haptics.error(); playSound('error');
    }
  };

  const handleStartOpen = (box: LootBox) => {
    if (isOpening) return;
    const count = getBoxCount(box.id);
    if (count <= 0) return;
    haptics.heavy();
    playSound('whoosh');
    setOpeningBox(box);
  };

  const handleReveal = () => {
    if (!openingBox) return;
    setIsOpening(true);

    // openBox() already grants rewards (coins, gems, items) inside lootBoxStore
    // and now also handles dupes by giving shards + coin refund. We feed the
    // whole OpenBoxResult to the reveal screen so it can render context.
    const result = openBox(openingBox.id);
    if (result) {
      setRevealedResult(result);
      haptics.win();
      playSound('win');
    }
    setOpeningBox(null);
    setIsOpening(false);
  };

  const handleCancelOpen = () => {
    haptics.tap();
    playSound('click');
    setOpeningBox(null);
  };

  // Full-screen opening sequence
  if (openingBox) {
    return <BoxOpeningScreen box={openingBox} onReveal={handleReveal} onCancel={handleCancelOpen} />;
  }

  // Item reveal screen
  if (revealedResult) {
    return <ItemRevealScreen result={revealedResult} onContinue={() => setRevealedResult(null)} />;
  }

  return (
    <ScreenBackground>
      <TopBar coins={coins} gems={gems} level={level} showBack onBackPress={() => navigation.goBack()} />
      <View style={st.container}>
        {/* Header */}
        <StaggeredEntry index={0} delay={60} style={st.headerWrap}>
          <LinearGradient colors={['#8e44ad', '#9b59b6']} style={st.headerBanner}>
            <Text style={st.title} accessibilityRole="header">LOOT BOXES</Text>
            <Text style={st.subtitle}>Open boxes to win cosmetics and coins</Text>
          </LinearGradient>
        </StaggeredEntry>

        <ScrollView contentContainerStyle={st.boxList} showsVerticalScrollIndicator={false}>
          {/* Shard balance strip — earned from dupes, spent in Shard Shop. */}
          <StaggeredEntry index={0} delay={40}>
            <View style={st.shardStrip} accessibilityRole="text" accessibilityLabel="Shard balance">
              {(['common', 'rare', 'epic', 'legendary'] as const).map((r) => {
                const c = RARITY_COLORS[r];
                return (
                  <View key={r} style={[st.shardChip, { borderColor: `${c}55` }]}>
                    <Text style={[st.shardChipValue, { color: c }]}>{shards[r]}</Text>
                    <Text style={st.shardChipLabel}>{r.toUpperCase()}</Text>
                  </View>
                );
              })}
            </View>
          </StaggeredEntry>

          {/* Lifetime opens stat — small flex */}
          {lifetimeOpens > 0 && (
            <Text style={st.lifetimeText}>
              {lifetimeOpens.toLocaleString()} BOXES OPENED ALL-TIME
            </Text>
          )}

          {/* Boxes grouped: Tiered / Themed / Featured. Each section
              gets a header so the player can see at a glance what
              kind of box they're picking. */}
          {(() => {
            const tiered = LOOT_BOXES.filter((b) => !b.themedCategory && b.tier !== 'featured');
            const themed = LOOT_BOXES.filter((b) => b.themedCategory);
            const featured = LOOT_BOXES.filter((b) => b.tier === 'featured');
            let runningIndex = 1;
            const renderSection = (title: string, blurb: string, list: LootBox[]) =>
              list.length === 0 ? null : (
                <View key={title} style={st.section}>
                  <View style={st.sectionHeader}>
                    <Text style={st.sectionTitle} accessibilityRole="header">{title}</Text>
                    <Text style={st.sectionBlurb}>{blurb}</Text>
                  </View>
                  {list.map((box) => {
                    const count = getBoxCount(box.id);
                    const idx = runningIndex++;
                    return (
                      <BoxCard
                        key={box.id}
                        box={box}
                        count={count}
                        isOpening={isOpening}
                        onOpen={() => handleStartOpen(box)}
                        onBuy={() => handleBuyBox(box)}
                        playerCoins={coins}
                        index={idx}
                      />
                    );
                  })}
                </View>
              );
            return (
              <>
                {renderSection('TIERED', 'Generic pool, better odds at higher tiers', tiered)}
                {renderSection('THEMED', 'Bias toward a specific category', themed)}
                {renderSection('FEATURED', 'Hand-picked rotation, refreshed weekly', featured)}
                {/* Mini-preview strip of this week's 10 picks. Lives
                    only when the Featured Box rendered above so the
                    player understands what they're shopping. */}
                {featured.length > 0 && <FeaturedPreview />}
              </>
            );
          })()}

          {/* Drop rates transparency — per-tier switcher reads the real
              TIER_RARITY_WEIGHTS so the player can see exactly how each
              box is biased. Replaces the prior static 60/25/10/5 panel
              which was a single average across all boxes. */}
          <DropRatesPanel />
        </ScrollView>
      </View>
    </ScreenBackground>
  );
}

// ── Per-tier drop-rates panel ──────────────────────────────────
//
// Tier switcher (Bronze/Silver/Gold/Diamond/Featured) + the four
// rarity bars for the active tier. Reads from TIER_RARITY_WEIGHTS so
// any future tuning of the table flows here without code changes.
function DropRatesPanel() {
  const tiers: LootBox['tier'][] = ['bronze', 'silver', 'gold', 'diamond', 'featured'];
  const [tier, setTier] = useState<LootBox['tier']>('bronze');
  const weights = TIER_RARITY_WEIGHTS[tier];
  const total = weights.common + weights.rare + weights.epic + weights.legendary;
  const rows = [
    { key: 'common',    label: 'Common',    color: RARITY_COLORS.common,    w: weights.common },
    { key: 'rare',      label: 'Rare',      color: RARITY_COLORS.rare,      w: weights.rare },
    { key: 'epic',      label: 'Epic',      color: RARITY_COLORS.epic,      w: weights.epic },
    { key: 'legendary', label: 'Legendary', color: RARITY_COLORS.legendary, w: weights.legendary },
  ];
  return (
    <StaggeredEntry index={1} delay={60}>
      <View style={st.ratesSection}>
        <LinearGradient colors={['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.02)']} style={st.ratesGradient}>
          <Text style={st.ratesTitle} accessibilityRole="header">DROP RATES</Text>

          {/* Tier switcher */}
          <View style={st.tierSwitcher}>
            {tiers.map((t) => {
              const active = t === tier;
              return (
                <Pressable
                  key={t}
                  onPress={() => setTier(t)}
                  style={[st.tierTab, active && st.tierTabActive]}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`${t} tier drop rates`}
                >
                  <Text style={[st.tierTabText, active && st.tierTabTextActive]}>
                    {t.toUpperCase()}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Rate bars */}
          <View style={st.ratesGrid}>
            {rows.map((rate) => {
              const pct = total > 0 ? Math.round((rate.w / total) * 100) : 0;
              return (
                <View key={rate.key} style={st.rateRow}>
                  <View style={[st.rateDot, { backgroundColor: rate.color, boxShadow: boxShadow(rate.color, 0.5, 0, 0, 4) }]} />
                  <Text style={[st.rateLabel, { color: rate.color }]}>{rate.label}</Text>
                  <Text style={st.ratePct}>{pct}%</Text>
                </View>
              );
            })}
          </View>
          <Text style={st.ratesNote}>Diamond & Featured tilt hardest toward Epic & Legendary.</Text>
        </LinearGradient>
      </View>
    </StaggeredEntry>
  );
}

// ── Featured rotation preview strip ─────────────────────────────
//
// Below the Featured Box card we render a horizontal scroller of the
// 10 hand-picked items in this week's rotation. Each tile is just a
// rarity-tinted disc + name — small, readable, no images required.
function FeaturedPreview() {
  const items = featuredItemsForWeek();
  return (
    <View style={st.featuredPreviewWrap}>
      <Text style={st.featuredPreviewTitle}>THIS WEEK&rsquo;S PICKS</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={st.featuredPreviewRow}
      >
        {items.map((it) => {
          const c = RARITY_COLORS[it.rarity];
          return (
            <View key={it.id} style={[st.featuredTile, { borderColor: `${c}aa` }]}>
              <View style={[st.featuredTileDisc, { backgroundColor: `${c}55` }]} />
              <Text style={st.featuredTileName} numberOfLines={2}>{it.name}</Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
const st = StyleSheet.create({
  container: { flex: 1, paddingTop: 8 },

  // ── Header ──
  headerWrap: { paddingHorizontal: 16, marginBottom: 16 },
  headerBanner: {
    borderRadius: 14, paddingVertical: 14, paddingHorizontal: 20, alignItems: 'center',
  },
  title: {
    fontFamily: fonts.heading, fontWeight: weight.bold, fontSize: 26,
    color: '#ffffff', letterSpacing: 2,
    textShadow: '0px 1px 3px rgba(0,0,0,0.3)',
  },
  subtitle: {
    fontFamily: fonts.body, fontWeight: weight.regular, fontSize: 12,
    color: 'rgba(255,255,255,0.7)', marginTop: 2,
  },

  // ── Box list ──
  boxList: { paddingHorizontal: 16, gap: 12, paddingBottom: 100 },
  boxCard: {
    borderRadius: 18, overflow: 'hidden', borderWidth: 1.5,
  },
  boxCardGradient: {
    padding: 16, borderRadius: 18, position: 'relative',
  },
  tierBadge: {
    position: 'absolute', top: 8, right: 8,
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1,
  },
  tierBadgeText: {
    fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 8,
    letterSpacing: 1,
  },
  boxCardRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
  },
  boxIconArea: {
    width: 64, height: 64, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  boxCardInfo: { flex: 1, gap: 4 },
  boxCardName: {
    fontFamily: fonts.heading, fontWeight: weight.bold, fontSize: 17, color: '#ffffff',
  },
  boxCountRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  boxCountLabel: {
    fontFamily: fonts.body, fontWeight: weight.medium, fontSize: 12, color: colors.textSecondary,
  },
  boxCountBadge: {
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  boxCountNum: {
    fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 14, color: colors.textSecondary,
  },
  boxActionArea: { alignItems: 'center', gap: 4 },
  openBtnGradient: {
    paddingHorizontal: 24, paddingVertical: 10, borderRadius: 14,
    boxShadow: '0px 3px 8px rgba(39,174,61,0.5)', elevation: 6,
  },
  openBtnText: {
    fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 15,
    color: '#ffffff', letterSpacing: 1.5,
  },
  emptyWrap: {
    paddingHorizontal: 16, paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12,
  },
  emptyText: { fontFamily: fonts.body, fontWeight: weight.medium, fontSize: 13, color: colors.textMuted },

  // ── Rates ──
  ratesSection: { borderRadius: 16, overflow: 'hidden', marginTop: 4 },
  ratesGradient: {
    borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  ratesTitle: {
    fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 11, color: colors.textSecondary,
    letterSpacing: 1.5, marginBottom: 10,
  },
  ratesGrid: { gap: 6 },
  rateRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rateDot: {
    width: 12, height: 12, borderRadius: 6,
    // boxShadow set dynamically inline
    elevation: 2,
  },
  rateLabel: { fontFamily: fonts.body, fontWeight: weight.semibold, fontSize: 12, flex: 1 },
  ratePct: { fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  ratesNote: {
    fontFamily: fonts.body, fontWeight: weight.regular, fontSize: 10,
    color: colors.textMuted, marginTop: 8,
  },

  // ── Opening sequence (full screen) ──
  openingOverlay: { flex: 1 },
  openingBg: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  halftoneOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.1)',
    // Halftone pattern simulated with opacity
  },
  openingBack: {
    position: 'absolute', top: 60, left: 20,
    paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12,
  },
  openingBackText: { fontFamily: fonts.body, fontWeight: weight.semibold, fontSize: 14, color: 'rgba(255,255,255,0.6)' },
  openingHeader: { alignItems: 'center', marginBottom: 30 },
  openingTitle: {
    fontFamily: fonts.heading, fontWeight: weight.bold, fontSize: 36,
    color: '#ffffff', letterSpacing: 2,
    textShadow: '0px 3px 8px rgba(0,0,0,0.5)',
  },
  openingArrow: {
    fontSize: 28, color: 'rgba(255,255,255,0.5)', marginTop: 8,
  },
  tapProgress: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  tapDot: {
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    // boxShadow set dynamically inline when active
    elevation: 4,
  },
  openingBoxWrap: { alignItems: 'center', position: 'relative' },
  openingGlow: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    top: -20, alignSelf: 'center',
    // boxShadow set dynamically inline
    elevation: 12,
  },
  openingBox: {
    width: 160, height: 180, borderRadius: 24,
    overflow: 'hidden', borderWidth: 2,
  },
  openingBoxInner: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 24,
  },
  openingBoxIcon: { fontSize: 64 },
  openingBoxName: {
    fontFamily: fonts.heading, fontWeight: weight.bold, fontSize: 18, letterSpacing: 1,
  },
  openingHint: {
    fontFamily: fonts.body, fontWeight: weight.medium, fontSize: 14,
    color: 'rgba(255,255,255,0.4)', marginTop: 30,
  },

  // ── Reveal ──
  revealContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  sparkle: {
    position: 'absolute', width: 6, height: 6, borderRadius: 3,
    boxShadow: '0px 0px 6px rgba(0,0,0,0.8)',
    elevation: 4,
  },
  revealCard: {
    width: '85%', alignItems: 'center', backgroundColor: colors.surface,
    borderRadius: 24, padding: 32, borderWidth: 2, borderColor: colors.surfaceBorder,
    position: 'relative', overflow: 'hidden',
  },
  revealGlow: { ...StyleSheet.absoluteFillObject, borderRadius: 24 },
  revealRarityBanner: {
    borderRadius: 10, paddingHorizontal: 16, paddingVertical: 4,
    borderWidth: 1, marginBottom: 14,
  },
  // Item thumbnail in the reveal card — sized to feel "presented"
  // without crowding the rarity banner above or the category chip
  // below. Border tinted by rarity so it reads as an integrated card
  // element, not a stamp.
  revealThumb: {
    width: 88,
    height: 88,
    borderRadius: 18,
    borderWidth: 2,
    marginBottom: 12,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  // Color-disc fallback when the category has no painted thumbnail
  // (boards / pieces / effects / wins / frames). Solid disc with a
  // ring border in the rarity color so the reveal still feels framed.
  revealThumbDisc: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    marginBottom: 12,
  },
  revealRarityText: {
    fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 12,
    letterSpacing: 2,
  },
  // Category chip replaces the old emoji icon — with 245+ possible drop
  // outcomes, a typed label reads more clearly than a generic glyph.
  revealCategoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 12, borderWidth: 1.5,
    marginBottom: 16,
  },
  revealCategoryChipText: {
    fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 11,
    letterSpacing: 1.4,
  },
  // Color disc shown inside the chip for partVariant drops, so the
  // player sees the actual colorway they rolled (not just the word
  // COLORWAY). Duo-chrome variants use a left/right split.
  revealVariantSwatch: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    overflow: 'hidden' as const,
    flexDirection: 'row' as const,
  },
  revealSwatchHalf: {
    flex: 1,
  },
  revealName: { fontFamily: fonts.heading, fontWeight: weight.bold, fontSize: 24, textAlign: 'center' },
  // Dupe-payout strip — visible only when isDupe, shows the shard +
  // coin refund the player got instead of the duplicate item.
  dupePayout: {
    marginTop: 14,
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', gap: 4,
  },
  dupePayoutLine: {
    fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 12,
    color: 'rgba(255,255,255,0.85)', letterSpacing: 1.2,
  },
  shineLine: {
    position: 'absolute', top: 0, left: -20, right: -20, height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    transform: [{ rotate: '-5deg' }],
  },
  collectionHint: {
    fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 11,
    color: colors.textMuted, textAlign: 'center', marginTop: 6,
    letterSpacing: 0.5,
  },

  // ── Shard balance strip ────────────────────────────────────────
  shardStrip: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 4,
    marginBottom: 6,
  },
  shardChip: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1.5,
    backgroundColor: 'rgba(10,14,32,0.55)',
    alignItems: 'center',
  },
  shardChipValue: {
    fontFamily: fonts.heading,
    fontWeight: weight.black,
    fontSize: 16,
  },
  shardChipLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 8,
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 0.8,
    marginTop: 1,
  },

  // ── Section headers ────────────────────────────────────────────
  section: {
    marginTop: 4,
  },
  sectionHeader: {
    paddingHorizontal: 4,
    paddingTop: 8,
    paddingBottom: 6,
  },
  sectionTitle: {
    fontFamily: fonts.heading,
    fontWeight: weight.black,
    fontSize: 12,
    color: '#ffffff',
    letterSpacing: 1.6,
  },
  sectionBlurb: {
    fontFamily: fonts.body,
    fontWeight: weight.regular,
    fontSize: 10,
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 0.4,
    marginTop: 2,
  },

  // Lifetime stat
  lifetimeText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 9,
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: 1.2,
    textAlign: 'center',
    paddingVertical: 4,
  },

  // ── Tier switcher inside DROP RATES panel ─────────────────────
  tierSwitcher: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginVertical: 8,
  },
  tierTab: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  tierTabActive: {
    borderColor: 'rgba(255,180,90,0.85)',
    backgroundColor: 'rgba(255,140,0,0.18)',
  },
  tierTabText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 9,
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 1.0,
  },
  tierTabTextActive: { color: '#ffffff' },

  // ── Featured rotation preview ────────────────────────────────
  featuredPreviewWrap: {
    marginTop: 4,
    paddingHorizontal: 4,
    paddingTop: 6,
    paddingBottom: 8,
  },
  featuredPreviewTitle: {
    fontFamily: fonts.heading,
    fontWeight: weight.black,
    fontSize: 10,
    color: 'rgba(241,196,15,0.85)',
    letterSpacing: 1.4,
    marginBottom: 6,
  },
  featuredPreviewRow: {
    gap: 8,
    paddingRight: 8,
  },
  featuredTile: {
    width: 76,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 10,
    borderWidth: 1.5,
    backgroundColor: 'rgba(10,14,32,0.55)',
    alignItems: 'center',
  },
  featuredTileDisc: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginBottom: 4,
  },
  featuredTileName: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 9,
    color: '#ffffff',
    textAlign: 'center',
    letterSpacing: 0.4,
    minHeight: 22,
    lineHeight: 11,
  },
});
