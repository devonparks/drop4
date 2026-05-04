import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, ScrollView, Dimensions, TextInput, Pressable, ImageSourcePropType } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeIn,
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { RarityChip, type Rarity } from '../components/ui/RarityChip';
import { PressScale, Shimmer, StaggeredEntry } from '../components/animations';
import { useShopStore } from '../stores/shopStore';
import { haptics } from '../services/haptics';
import { playSound } from '../services/audio';
import { BOARD_THEMES, PIECE_THEMES, DROP_EFFECTS, WIN_ANIMATIONS, BOARD_ACCESSORIES, EMOTES, RARITY_COLORS, RARITY_LABELS, ShopItem } from '../data/shopCatalog';
import { CosmeticPreviewModal } from '../components/ui/CosmeticPreviewModal';
import { AnimatedRarityBg } from '../components/effects/AnimatedRarityBg';

const EMOTE_IDS = new Set(EMOTES.map(e => e.id));
import { useLootBoxStore, LOOT_BOXES, SHARD_UNLOCK_COST, type LootBoxRarity } from '../stores/lootBoxStore';
import { LootChest } from '../components/ui/LootChest';
import { useChallengeStore } from '../stores/challengeStore';
import { PETS, Pet, PET_RARITY_COLORS, PET_RARITY_LABELS } from '../data/pets';
import { OUTFIT_SHOP_ITEMS, EMOTE_SHOP_ITEMS } from '../data/cosmeticsShopCatalog';
import { getDailyFeatured } from '../data/shopRotation';
import { OUTFITS } from '../data/outfitRegistry';
import { useCharacterStore } from '../stores/characterStore';
import { packMeta, OUTFIT_PACK_TO_SIDEKICK } from '../data/amgPackMeta';
import { getPackIcon, getEmoteIcon } from '../data/cosmeticIcons';
import { filterAmgParts, groupAmgPartsByPack } from '../data/amgShopFilters';
import { AmgPartPreviewModal } from '../components/ui/AmgPartPreviewModal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { getPartPrice, isStarterPack, packPrefixFromPartName } from '../data/amgPartPricing';
import { Alert, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { OutfitPreviewModal } from '../components/ui/OutfitPreviewModal';
import { PETS as PETS_3D } from '../data/petRegistry';
// Pet3D / DOG_IDLES no longer imported here — shop pet cards use the
// painted idleImage PNG instead of the live 3D render. Pet3D's camera
// framing is tuned for larger contexts (Home stage, EquipPanel preview)
// and renders cropped at the 90×90 shop card size.
import { useCareerStore } from '../stores/careerStore';
import { PremiumBoardThumbnail } from '../components/ui/PremiumBoardThumbnail';
import { colors } from '../theme/colors';
import { fonts, weight } from '../theme/typography';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type ShopTab = 'clothes' | 'outfits' | 'boards' | 'pieces' | 'effects' | 'wins' | 'accessories' | 'emotes' | 'pets' | 'boxes';

// R2 manifest URL — source of truth for every Sidekick part available
// on the CDN. Fetched once when the Clothes tab first renders and
// cached in component state for the remainder of the screen's life.
const AMG_MANIFEST_URL = 'https://pub-8953453f2512408f9c58656d4ea4e681.r2.dev/manifest.json';

interface AmgManifestPart {
  name: string;
  species: string;
  slot: string;
  file: string;
}

/** Species values that can appear in the manifest. The shop filter chip
 *  row exposes these; 'All' is the unfiltered default. */
type AmgSpecies = 'All' | 'Human' | 'Goblin' | 'Elves' | 'Skeleton' | 'Zombie';

/** Part slot buckets the Clothes tab exposes as a filter row. "All"
 *  shows every ALLOWED_SLOTS part; the other buckets group the slots
 *  the way a player thinks about an outfit ("I want to change my
 *  upper body"). Keep in sync with SLOT_BUCKETS below.
 *
 *  Coverage: every cosmetic-relevant Sidekick slot. Internal slots
 *  (Teeth, Tongue) are not exposed because players don't shop for
 *  them — they're fixed per head and color-tinted only. */
type AmgSlotBucket = 'All' | 'Upper Body' | 'Lower Body' | 'Face' | 'Accessories' | 'Armor';

const SLOT_BUCKETS: Record<Exclude<AmgSlotBucket, 'All'>, readonly string[]> = {
  'Upper Body': [
    'Torso', 'ArmUpperLeft', 'ArmUpperRight',
    'ArmLowerLeft', 'ArmLowerRight', 'HandLeft', 'HandRight',
  ],
  'Lower Body': ['Hips', 'LegLeft', 'LegRight', 'FootLeft', 'FootRight'],
  // Face: full set of swappable face parts. Different packs ship
  // different eye / brow / nose shapes — players who want a goblin face
  // on a human body, etc., browse here.
  'Face': [
    'Head', 'Hair', 'FacialHair',
    'EyebrowLeft', 'EyebrowRight',
    'EyeLeft', 'EyeRight',
    'Nose',
    'EarLeft', 'EarRight',
  ],
  // Accessories: hat / mask / backpack / cape — top-level wear-overs.
  'Accessories': [
    'AttachmentHead', 'AttachmentFace', 'AttachmentBack', 'Wrap',
  ],
  // Armor: every body-mounted attachment (hip plates, pauldrons, knee
  // guards, etc). Sidekick ships dozens of these per warrior pack —
  // surfacing them as their own bucket so players can build a knight
  // or samurai look without scrolling past unrelated cosmetics.
  'Armor': [
    'AttachmentHipsFront', 'AttachmentHipsBack',
    'AttachmentHipsLeft', 'AttachmentHipsRight',
    'AttachmentShoulderLeft', 'AttachmentShoulderRight',
    'AttachmentElbowLeft', 'AttachmentElbowRight',
    'AttachmentKneeLeft', 'AttachmentKneeRight',
  ],
};

// ─── Effect/Win/Frame preview configs ──────────────────────────
interface EffectPreviewConfig {
  bg: [string, string];
  icon: string;
  accentColor: string;
  particles?: string[];
}

const EFFECT_PREVIEWS: Record<string, EffectPreviewConfig> = {
  // Drop effects
  none:             { bg: ['#1a1a2e', '#0e0e1a'], icon: '—', accentColor: '#555' },
  sparks:           { bg: ['#2a1800', '#1a0e00'], icon: '✨', accentColor: '#f4a623', particles: ['⚡', '✦'] },
  smoke:            { bg: ['#1a1a22', '#0e0e14'], icon: '💨', accentColor: '#8892b0', particles: ['☁️'] },
  splash:           { bg: ['#001a2e', '#000e1a'], icon: '💧', accentColor: '#3498db', particles: ['💦'] },
  lightning:        { bg: ['#1a1a00', '#0e0e00'], icon: '⚡', accentColor: '#f1c40f', particles: ['⚡', '✦', '⚡'] },
  confetti:         { bg: ['#1a0022', '#0e0014'], icon: '🎊', accentColor: '#e84393', particles: ['🎉', '🎊'] },
  shockwave:        { bg: ['#001a1a', '#000e0e'], icon: '💥', accentColor: '#1abc9c', particles: ['◎', '◉'] },
  fireball:         { bg: ['#2a0800', '#1a0400'], icon: '🔥', accentColor: '#e74c3c', particles: ['🔥', '💥'] },
  portal:           { bg: ['#0a001a', '#06000e'], icon: '🌀', accentColor: '#9b59b6', particles: ['✦', '🌀'] },
  plasma:           { bg: ['#001a2a', '#000e1a'], icon: '⚡', accentColor: '#00d4ff', particles: ['⚡', '✦', '⚡'] },
  darkmatter_drop:  { bg: ['#1a0020', '#0e0014'], icon: '🕳️', accentColor: '#e94560', particles: ['✦', '✦'] },
  darkmatter_trail: { bg: ['#1a0020', '#0e0014'], icon: '💫', accentColor: '#e94560', particles: ['✦', '✦', '✦'] },
  // Win animations
  basic:            { bg: ['#1a1a2e', '#0e0e1a'], icon: '✓', accentColor: '#27ae3d' },
  fireworks:        { bg: ['#0a0a1e', '#06061a'], icon: '🎆', accentColor: '#f39c12', particles: ['✦', '🎇', '✦'] },
  lightning_strike: { bg: ['#1a1a00', '#0e0e00'], icon: '⚡', accentColor: '#f1c40f', particles: ['⚡', '⚡'] },
  gold_rain:        { bg: ['#1a1400', '#0e0a00'], icon: '🪙', accentColor: '#ffd700', particles: ['🪙', '✦', '🪙'] },
  nuke:             { bg: ['#1a0000', '#0e0000'], icon: '☢️', accentColor: '#e74c3c', particles: ['💥', '🔥'] },
  meteor:           { bg: ['#1a0800', '#0e0400'], icon: '☄️', accentColor: '#ff6b35', particles: ['☄️', '✦'] },
  black_hole:       { bg: ['#0a001a', '#06000e'], icon: '🕳️', accentColor: '#9b59b6', particles: ['✦', '🌀', '✦'] },
  darkmatter_win:   { bg: ['#1a0020', '#0e0014'], icon: '👁️', accentColor: '#e94560', particles: ['✦', '✦', '✦'] },
  // Board accessories / frames
  flames:           { bg: ['#2a0800', '#1a0400'], icon: '🔥', accentColor: '#e74c3c', particles: ['🔥'] },
  vines:            { bg: ['#001a0a', '#000e06'], icon: '🌿', accentColor: '#2ecc71', particles: ['✦', '🌿'] },
  chains:           { bg: ['#1a1400', '#0e0a00'], icon: '⛓️', accentColor: '#ffd700', particles: ['✦'] },
  circuit:          { bg: ['#001a2a', '#000e1a'], icon: '🔌', accentColor: '#00d4ff', particles: ['◎', '◉'] },
  darkmatter_frame: { bg: ['#1a0020', '#0e0014'], icon: '🕳️', accentColor: '#e94560', particles: ['✦', '✦'] },
};

function EffectPreviewCard({ config, width, height }: { config: EffectPreviewConfig; width: number; height: number }) {
  return (
    <View style={{ width, height, overflow: 'hidden', borderRadius: 4 }}>
      <LinearGradient colors={config.bg} style={StyleSheet.absoluteFill} />
      {/* Accent glow */}
      <View style={{
        position: 'absolute', left: width * 0.2, top: height * 0.15,
        width: width * 0.6, height: height * 0.7,
        borderRadius: width * 0.3,
        backgroundColor: config.accentColor,
        opacity: 0.15,
      }} />
      {/* Center icon */}
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 24 }}>{config.icon}</Text>
      </View>
      {/* Floating particles */}
      {config.particles && config.particles.map((p, i) => (
        <Text key={i} style={{
          position: 'absolute',
          fontSize: 8,
          opacity: 0.5,
          left: (width * 0.15) + (i * width * 0.25),
          top: height * (0.15 + (i % 2) * 0.5),
        }}>{p}</Text>
      ))}
      {/* Bottom accent line */}
      <View style={{
        position: 'absolute', bottom: 0, left: width * 0.1, right: width * 0.1,
        height: 2, borderRadius: 1, backgroundColor: config.accentColor, opacity: 0.5,
      }} />
    </View>
  );
}

// ─── Countdown hook ────────────────────────────────────────────
function useCountdown() {
  const [time, setTime] = useState('');
  useEffect(() => {
    const update = () => {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setDate(midnight.getDate() + 1);
      midnight.setHours(0, 0, 0, 0);
      const diff = midnight.getTime() - now.getTime();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setTime(`${h}h ${m.toString().padStart(2, '0')}m`);
    };
    update();
    const id = setInterval(update, 60000);
    return () => clearInterval(id);
  }, []);
  return time;
}

// ─── Section Header ────────────────────────────────────────────
function SectionHeader({ title, gradientColors, rightText }: { title: string; gradientColors: [string, string]; rightText?: string }) {
  return (
    <LinearGradient colors={gradientColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.sectionHeader}>
      <Text style={s.sectionHeaderText} accessibilityRole="header">{title}</Text>
      {rightText && <Text style={s.sectionHeaderRight}>{rightText}</Text>}
    </LinearGradient>
  );
}

// ─── Daily Deal Card ───────────────────────────────────────────
function DailyDealCard({ icon, iconImage, title, subtitle, buttonLabel, buttonColor, badge, pulseBadge, onPress }: {
  icon: string;
  // Optional painted icon — preferred over the emoji icon when supplied.
  // Lets featured outfit / pet / emote deals show their actual painted
  // pack cover instead of a generic '👗' / '🐶' / '💃' glyph.
  iconImage?: ImageSourcePropType;
  title: string; subtitle: string; buttonLabel: string;
  buttonColor: [string, string]; badge?: string; pulseBadge?: boolean; onPress: () => void;
}) {
  // "Outfit of the Day" (and other hot deals) get a pulse/glow on the badge
  // to steal the eye from the rest of the horizontal row.
  const badgeScale = useSharedValue(1);
  useEffect(() => {
    if (pulseBadge) {
      badgeScale.value = withRepeat(
        withSequence(
          withTiming(1.14, { duration: 700 }),
          withTiming(1, { duration: 700 }),
        ),
        -1,
        true,
      );
    } else {
      badgeScale.value = 1;
    }
  }, [pulseBadge]);
  const badgeAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: badgeScale.value }] }));

  return (
    <PressScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}${badge ? `, ${badge}` : ''}, ${subtitle}`}
      accessibilityHint={`Opens ${buttonLabel.toLowerCase()} deal`}
    >
      <View style={s.dealCard}>
        <LinearGradient colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)']} style={s.dealCardInner}>
          {badge && (
            <Animated.View style={[s.dealBadge, pulseBadge && s.dealBadgeHot, pulseBadge && badgeAnimStyle]}>
              <Text style={s.dealBadgeText}>{badge}</Text>
            </Animated.View>
          )}
          {iconImage ? (
            <Image
              source={iconImage}
              style={s.dealIconImg}
              resizeMode="contain"
              accessibilityIgnoresInvertColors
            />
          ) : (
            <Text style={s.dealIcon}>{icon}</Text>
          )}
          <Text style={s.dealTitle} numberOfLines={1}>{title}</Text>
          <Text style={s.dealSub} numberOfLines={1}>{subtitle}</Text>
          <LinearGradient colors={buttonColor} style={s.dealBtn}>
            <Text style={s.dealBtnText}>{buttonLabel}</Text>
          </LinearGradient>
        </LinearGradient>
      </View>
    </PressScale>
  );
}

// ─── Loot Bag Card ─────────────────────────────────────────────
function LootBagCard({ tier, icon, name, price, color, borderCol, onPress }: {
  tier: string; icon: string; name: string; price: string;
  color: [string, string]; borderCol: string; onPress: () => void;
}) {
  return (
    <PressScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${name} loot bag, ${tier} tier, ${price}`}
      accessibilityHint="Opens loot bag purchase and reveal"
    >
      <View style={[s.bagCard, { borderColor: borderCol }]}>
        <LinearGradient colors={color} style={s.bagCardInner}>
          <View style={s.bagIconWrap}>
            <Text style={s.bagIcon}>{icon}</Text>
          </View>
          <Text style={s.bagName}>{name}</Text>
          <Text style={s.bagPrice}>{price}</Text>
          <LinearGradient colors={['#27ae3d', '#1e8a30']} style={s.bagOpenBtn}>
            <Text style={s.bagOpenText}>OPEN</Text>
          </LinearGradient>
        </LinearGradient>
      </View>
    </PressScale>
  );
}

// ─── Bundle Card ───────────────────────────────────────────────
function BundleCard({ icon, amount, bonus, price, color, highlight, onPress }: {
  icon: string; amount: string; bonus?: string; price: string;
  color: [string, string]; highlight?: boolean; onPress: () => void;
}) {
  return (
    <PressScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${amount} bundle${bonus ? `, ${bonus}` : ''}${highlight ? ', most popular' : ''}, ${price}`}
      accessibilityHint="Opens gem bundle purchase"
    >
      <View style={[s.bundleCard, highlight && s.bundleCardHighlight]}>
        <LinearGradient colors={color} style={s.bundleInner}>
          {bonus && (
            <View style={[s.bundleBadge, bonus === 'BEST' && { backgroundColor: '#f39c12' }]}>
              <Text style={s.bundleBadgeText}>{bonus}</Text>
            </View>
          )}
          <Text style={s.bundleIcon}>{icon}</Text>
          <Text style={s.bundleAmount}>{amount}</Text>
          {highlight && <Text style={s.bundlePopular}>MOST POPULAR</Text>}
        </LinearGradient>
        <LinearGradient
          colors={highlight ? ['rgba(255,140,0,0.25)', 'rgba(255,100,0,0.15)'] : ['rgba(0,0,0,0.35)', 'rgba(0,0,0,0.25)']}
          style={s.bundlePriceRow}
        >
          <Text style={[s.bundlePrice, highlight && { color: '#ffffff' }]}>{price}</Text>
        </LinearGradient>
      </View>
    </PressScale>
  );
}

// ─── Unlock Requirements for earn-only items ─────────────────────
const UNLOCK_REQUIREMENTS: Record<string, string> = {
  // Board themes
  darkmatter: 'Reach Dark Matter rank',
  // Piece themes
  damascus: 'Complete Career Mode',
  // Drop effects
  darkmatter_drop: 'Reach Dark Matter rank',
  darkmatter_trail: 'Reach Dark Matter rank',
  // Win animations
  darkmatter_win: 'Reach Dark Matter rank',
  // Board accessories
  darkmatter_frame: 'Reach Dark Matter rank',
  // Emotes
  griddy: 'Reach Dark Matter rank',
};

// ─── Premium piece disc for piece-skin previews ──────────────
// Used when a shop item is a piece skin (has p1/p2 colors). Gives the
// same glossy plastic treatment as the pieces inside PremiumBoardThumbnail
// but a bit larger so piece-skin cards still read clearly.
function PremiumPiece({ color }: { color: string }) {
  return (
    <View
      style={{
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: color,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.45)',
        shadowColor: color,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.9,
        shadowRadius: 8,
        elevation: 6,
        overflow: 'hidden',
      }}
    >
      {/* Inner gloss highlight */}
      <View
        style={{
          position: 'absolute',
          top: 4,
          left: 7,
          width: 12,
          height: 10,
          borderRadius: 10,
          backgroundColor: 'rgba(255,255,255,0.55)',
          transform: [{ rotate: '-20deg' }],
        }}
      />
    </View>
  );
}

// ─── Shop Item Card (existing, improved) ───────────────────────
// OUTFIT_PACK_TO_SIDEKICK lives in amgPackMeta.ts — single source of
// truth shared with ClothesCatalog (Customize tab).

// Deterministic hue from an outfit id. Used to tint each outfit card a
// different color so Elven Warriors 01/02/03 look distinct without needing
// pre-rendered thumbnails. Returns 0–359 (HSL hue degrees).
function outfitIdHue(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % 360;
}


function ShopItemCard({ item, isOwned, isEquipped, onPress, index, playerCoins }: {
  item: ShopItem; isOwned: boolean; isEquipped: boolean; onPress: () => void; index: number; playerCoins: number;
}) {
  const rarityColor = RARITY_COLORS[item.rarity];
  const isDarkMatter = item.rarity === 'darkmatter';
  const isPremium = item.rarity === 'epic' || item.rarity === 'legendary' || item.rarity === 'mythic' || isDarkMatter;
  const canAfford = playerCoins >= item.price;
  const coinsNeeded = item.price - playerCoins;
  // Average ~50 coins per game (medium difficulty)
  const gamesNeeded = Math.ceil(coinsNeeded / 50);
  const unlockReq = UNLOCK_REQUIREMENTS[item.id];
  // Detect outfit items (their id is in the OUTFITS registry)
  const outfitMeta = OUTFITS[item.id];

  return (
    <Animated.View entering={FadeInDown.delay(index * 60).springify()}>
      <PressScale
        onPress={onPress}
        scaleTo={0.96}
        accessibilityRole="button"
        accessibilityLabel={`${item.name}, ${RARITY_LABELS[item.rarity]}${isEquipped ? ', equipped' : isOwned ? ', owned' : `, ${item.price.toLocaleString()} coins`}`}
        accessibilityState={{ selected: isEquipped, disabled: !isOwned && !canAfford && !isDarkMatter }}
      >
        <View style={[s.itemCard, isEquipped && { borderColor: colors.green, borderWidth: 2 }]}>
        <View style={[s.rarityStrip, { backgroundColor: rarityColor }]} />
        <View style={s.itemPreview}>
          {getEmoteIcon(item.id) ? (
            // AMG emote (id like 'emote_dab', 'emote_bow') — show the
            // chunky 3D emote icon over a rarity-tinted backdrop. Replaces
            // the prior emoji placeholder so the emote shop reads as
            // "real cosmetics" not "text strings."
            <View style={{ width: 108, height: 64, borderRadius: 6, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
              {isPremium ? (
                <AnimatedRarityBg rarity={item.rarity as any} width={108} height={64} style={StyleSheet.absoluteFill} />
              ) : (
                <LinearGradient colors={[rarityColor + '33', '#0e0e1a', '#060610']} style={StyleSheet.absoluteFill} />
              )}
              <Image
                source={getEmoteIcon(item.id)!}
                style={{ width: 60, height: 60, zIndex: 1 }}
                resizeMode="contain"
                accessibilityIgnoresInvertColors
              />
            </View>
          ) : outfitMeta ? (
            // Outfit preview: rarity-tinted backdrop with a pack emoji +
            // large number overlay. 3D preview happens in the tap modal.
            // Variant tint: every outfit id hashes to a unique HSL hue so
            // that Elven Warriors 01/02/03 etc. don't all look identical.
            // Without this tint the shop felt like "here are 6 copies of
            // the same card" even though each is a distinct outfit.
            (() => {
              // Each index in a pack gets a distinct hue spread around the
              // wheel (360 / 8 = 45°). Combined with the id hash for variety
              // between packs. This way Elven Warriors 01/02/03 look clearly
              // different, not "3 copies of the same card."
              const packBase = outfitIdHue(outfitMeta.pack);
              const variantHue = (packBase + (outfitMeta.index - 1) * 45) % 360;
              const variantStrong = `hsl(${variantHue}, 70%, 42%)`;
              const variantSoft = `hsl(${variantHue}, 60%, 22%)`;
              return (
                <View style={{ width: 108, height: 64, borderRadius: 6, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
                  <LinearGradient
                    colors={[variantStrong, variantSoft, '#060914']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                  {(() => {
                    // Outfit cards now show the chunky 3D pack cover
                    // (matching what the Character/Clothes tab shows in
                    // its pack section headers) instead of an emoji
                    // glyph. Translates the lowercase outfit pack-slug
                    // to the Sidekick prefix used by cosmeticIcons.
                    const sidekickKey = OUTFIT_PACK_TO_SIDEKICK[outfitMeta.pack];
                    const cover = sidekickKey ? getPackIcon(sidekickKey) : undefined;
                    if (cover) {
                      return (
                        <Image
                          source={cover}
                          style={{ width: 60, height: 60, zIndex: 1 }}
                          resizeMode="contain"
                          accessibilityIgnoresInvertColors
                        />
                      );
                    }
                    return <Text style={{ fontSize: 30, zIndex: 1 }}>{'\u{1F455}'}</Text>;
                  })()}
                  {/* Rarity corner chip (top-left) to keep tier legible */}
                  <View style={{ position: 'absolute', top: 3, left: 3, zIndex: 2, width: 7, height: 7, borderRadius: 4, backgroundColor: rarityColor }} />
                  <Text style={{
                    position: 'absolute', top: 4, right: 6, zIndex: 2,
                    fontFamily: fonts.heading, fontWeight: weight.black, fontSize: 10,
                    color: '#ffffff', letterSpacing: 0.5, opacity: 0.95,
                    textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2,
                  }}>
                    {String(outfitMeta.index).padStart(2, '0')}
                  </Text>
                </View>
              );
            })()
          ) : item.preview.p1Color && item.preview.p2Color ? (
            <View style={s.piecePreviewBackdrop}>
              {isPremium ? (
                <AnimatedRarityBg rarity={item.rarity as any} width={108} height={64} style={StyleSheet.absoluteFill} />
              ) : (
                <LinearGradient colors={['#1a1a2e', '#0e0e1a', '#060610']} style={StyleSheet.absoluteFill} />
              )}
              <View style={s.piecePreviewRow}>
                <PremiumPiece color={item.preview.p1Color} />
                <PremiumPiece color={item.preview.p2Color} />
              </View>
            </View>
          ) : EFFECT_PREVIEWS[item.id] ? (
            isPremium ? (
              <View style={{ width: 108, height: 64, overflow: 'hidden', borderRadius: 4, alignItems: 'center', justifyContent: 'center' }}>
                <AnimatedRarityBg rarity={item.rarity as any} width={108} height={64} style={StyleSheet.absoluteFill} />
                <Text style={{ fontSize: 24, zIndex: 1 }}>{EFFECT_PREVIEWS[item.id].icon}</Text>
              </View>
            ) : (
              <EffectPreviewCard config={EFFECT_PREVIEWS[item.id]} width={108} height={64} />
            )
          ) : (
            <PremiumBoardThumbnail themeId={item.id} width={108} height={64} />
          )}
        </View>
        {/* Outfits put the variant index in a corner badge above, so the
         *  name line drops the trailing " 03" and just shows the pack
         *  label uppercase. Allowed to wrap to 2 lines since some pack
         *  labels (APOCALYPSE OUTLAWS, FANTASY VILLAGERS) are too long
         *  to fit a 108px card on one line at any readable size — wrap
         *  beats truncating to "APOCALYPSE OUTLA..." which loses the
         *  pack identity. Non-outfit cards stay single-line since
         *  their names are uniformly short ("Wooden", "Chrome", etc). */}
        <Text style={s.itemName} numberOfLines={outfitMeta ? 2 : 1}>
          {outfitMeta ? outfitMeta.packLabel.toUpperCase() : item.name}
        </Text>
        <View style={s.rarityChipWrap}>
          <RarityChip rarity={item.rarity as Rarity} size="sm" width={84} />
        </View>
        {isEquipped ? (
          <View style={s.equippedBadge}><Text style={s.equippedText}>EQUIPPED</Text></View>
        ) : isOwned ? (
          <Text style={s.ownedText}>Tap to Equip</Text>
        ) : isDarkMatter || (item.price === 0 && item.rarity === 'mythic') ? (
          <>
            <Text style={[s.lockedText, { color: rarityColor }]}>Earn Only</Text>
            {unlockReq && (
              <Text style={s.unlockReqText} numberOfLines={2}>{unlockReq}</Text>
            )}
          </>
        ) : (
          <>
            <View style={s.priceRow}>
              <Text style={s.priceEmoji}>{'\u{1FA99}'}</Text>
              <Text style={[s.priceText, !canAfford && { color: '#e74c3c' }]}>{item.price.toLocaleString()}</Text>
            </View>
            {!canAfford && coinsNeeded > 0 && (
              <Text style={s.coinGoalText} numberOfLines={2}>
                Need {coinsNeeded.toLocaleString()} more{'\n'}{gamesNeeded} game{gamesNeeded !== 1 ? 's' : ''} to go!
              </Text>
            )}
          </>
        )}
        </View>
      </PressScale>
    </Animated.View>
  );
}

type CollectionFilter = 'All' | 'OG Collection' | 'Season 0' | 'Neon Pack' | 'Mythic Collection';

// ─── Pet Card ─────────────────────────────────────────────────
function PetCard({ pet, isOwned, isEquipped, onPress, index }: {
  pet: Pet; isOwned: boolean; isEquipped: boolean; onPress: () => void; index: number;
}) {
  const rarityColor = PET_RARITY_COLORS[pet.rarity];
  const isEarnOnly = pet.price === 0;

  // Pet preview uses the painted idle PNG (pet.idleImage). Pet3D
  // exists in petRegistry but its camera framing is tuned for the
  // larger Home stage / EquipPanel contexts (140-200px) — at the
  // 90×90 shop card size the 3D dogs render cropped awkwardly. The
  // painted PNG portraits read cleaner at small sizes and are
  // already in the asset pipeline.

  return (
    <Animated.View entering={FadeInDown.delay(index * 60).springify()}>
      <PressScale
        onPress={onPress}
        scaleTo={0.96}
        accessibilityRole="button"
        accessibilityLabel={`${pet.name}, ${pet.breed}, ${PET_RARITY_LABELS[pet.rarity]}${isEquipped ? ', equipped' : isOwned ? ', owned' : isEarnOnly ? ', earn only' : `, ${pet.price.toLocaleString()} coins`}`}
        accessibilityState={{ selected: isEquipped }}
      >
        <View style={[s.petCard, isEquipped && { borderColor: colors.green, borderWidth: 2 }]}>
        <View style={[s.rarityStrip, { backgroundColor: rarityColor }]} />
        <View style={s.petPreview}>
          <Image source={pet.idleImage} style={s.petPreviewImage} resizeMode="contain" accessibilityIgnoresInvertColors />
        </View>
        <Text style={s.petName} numberOfLines={1}>{pet.name}</Text>
        <Text style={s.petBreed} numberOfLines={1}>{pet.breed}</Text>
        <View style={s.rarityChipWrap}>
          <RarityChip rarity={pet.rarity as Rarity} size="sm" width={84} />
        </View>
        {isEquipped ? (
          <View style={s.equippedBadge}><Text style={s.equippedText}>EQUIPPED</Text></View>
        ) : isOwned ? (
          <Text style={s.ownedText}>Tap to Equip</Text>
        ) : isEarnOnly ? (
          <Text style={[s.lockedText, { color: rarityColor }]}>{pet.description || 'Earn Only'}</Text>
        ) : (
          <View style={s.priceRow}>
            <Text style={s.priceEmoji}>{'\u{1FA99}'}</Text>
            <Text style={s.priceText}>{pet.price.toLocaleString()}</Text>
          </View>
        )}
        </View>
      </PressScale>
    </Animated.View>
  );
}

// ═══════════════════════════════════════════════════════════════
// SHOP SCREEN
// ═══════════════════════════════════════════════════════════════
export function ShopScreen() {
  const coins = useShopStore(s2 => s2.coins);
  const gems = useShopStore(s2 => s2.gems);
  const owned = useShopStore(s2 => s2.owned);
  const equipped = useShopStore(s2 => s2.equipped);
  const equippedEmotes = useShopStore(s2 => s2.equippedEmotes);
  const ownedEmotes = useShopStore(s2 => s2.ownedEmotes);
  const equippedPet = useShopStore(s2 => s2.equippedPet);
  const ownedPets = useShopStore(s2 => s2.ownedPets);
  // Pivot 2026-05-03: direct-purchase actions (purchaseItem,
  // purchaseEmote, purchasePet, spendCoins) and inline part/outfit
  // unlocks (unlockOutfit, unlockAmgPart, equipAmgPart) are no longer
  // called from this screen — every locked-item path routes through
  // runLockedAction → either spendShardsForItem (lootBoxStore) or
  // navigation to LootBox. The store still exposes those actions
  // because the loot-box grant path uses them.
  const equipItem = useShopStore(s2 => s2.equipItem);
  const setEquippedEmote = useShopStore(s2 => s2.setEquippedEmote);
  const removeEquippedEmote = useShopStore(s2 => s2.removeEquippedEmote);
  const equipPet = useShopStore(s2 => s2.equipPet);

  // Outfits live in characterStore (separate from shopStore's board/piece owned set)
  const ownedOutfits = useCharacterStore(s => s.ownedOutfits);
  const equippedOutfitId = useCharacterStore(s => s.equippedOutfitId);
  const equipOutfitPack = useCharacterStore(s => s.equipOutfitPack);
  const unlockedSpecies = useCareerStore(s => s.unlockedSpecies);
  const ownedBoxes = useLootBoxStore(s => s.ownedBoxes);
  // Shards + spend action — used so locked-item BUY actions can offer
  // a shard-spend path when affordable instead of always routing to
  // LootBox screen (post-pivot 2026-05-03).
  const shards = useLootBoxStore(s => s.shards);
  const spendShardsForItem = useLootBoxStore(s => s.spendShardsForItem);
  const lastShopCoinCollect = useShopStore(s2 => s2.lastShopCoinCollect);
  const collectDailyShopCoins = useShopStore(s2 => s2.collectDailyShopCoins);
  const [activeTab, setActiveTab] = useState<ShopTab>('clothes');
  const [collectionFilter, setCollectionFilter] = useState<CollectionFilter | string>('All');
  // In-app styled confirm modal — replaces window.confirm() for pet +
  // emote purchases AND the "not enough coins" terminal alert. The
  // native browser dialog froze the web preview (Claude headless can't
  // dismiss) AND looked off-brand.
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    onConfirm: () => void;
    /** Single-button mode — no Cancel. Used for terminal alerts like
     *  "not enough coins" where the player just acknowledges. */
    confirmOnly?: boolean;
  } | null>(null);
  const [outfitSpecies, setOutfitSpecies] = useState<'All' | 'human' | 'elves' | 'goblin' | 'skeleton' | 'zombie'>('All');
  const [outfitPreview, setOutfitPreview] = useState<ShopItem | null>(null);

  // AMG Clothes tab: manifest of every Sidekick part available on R2.
  // Fetched once on first Clothes render, grouped by pack prefix, and
  // rendered via AmgPartCard. Species chip filters the grid.
  const navigation = useNavigation<any>();
  const ownedAmgParts = useCharacterStore(s => s.ownedAmgParts);
  const isAmgPartOwned = useCharacterStore(s => s.isAmgPartOwned);
  const amgPartUnlockedAt = useCharacterStore(s => s.amgPartUnlockedAt);
  const [amgManifest, setAmgManifest] = useState<AmgManifestPart[] | null>(null);
  const [amgSpecies, setAmgSpecies] = useState<AmgSpecies>('All');
  const [amgBucket, setAmgBucket] = useState<AmgSlotBucket>('All');
  const [amgQuery, setAmgQuery] = useState('');
  const [amgOwnedOnly, setAmgOwnedOnly] = useState(false);
  // Brief equip toast — flashes when the player taps an owned card to
  // equip in-place. Fades after 1.4 s. Lives on the shop instead of the
  // creator because the equip happens here without navigating away.
  const [equipToast, setEquipToast] = useState<{ label: string } | null>(null);
  // Active part preview — when set, shows the AmgPartPreviewModal with
  // the part rendered on the player's character before they decide to
  // buy. Replaces the old "tap an unowned card → OS confirm dialog"
  // flow that didn't actually show what was being bought.
  const [partPreview, setPartPreview] = useState<{ name: string; slot: string } | null>(null);
  useEffect(() => {
    if (!equipToast) return;
    const t = setTimeout(() => setEquipToast(null), 1400);
    return () => clearTimeout(t);
  }, [equipToast]);
  // Collapsible pack sections — players see the catalog as a list of
  // pack rows with counts, and tap a row to expand its parts grid. Cuts
  // initial render from O(filtered-parts) to O(packs) for hundreds of
  // SKUs. Search auto-expands any matching pack so the player sees
  // results without manually clicking through.
  const [amgExpandedPacks, setAmgExpandedPacks] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (activeTab !== 'clothes' || amgManifest) return;
    let canceled = false;
    (async () => {
      try {
        const r = await fetch(AMG_MANIFEST_URL);
        if (!r.ok) return;
        const data = await r.json();
        if (!canceled) setAmgManifest(data.parts as AmgManifestPart[]);
      } catch {
        // Best-effort — shop stays on the empty-state message.
      }
    })();
    return () => { canceled = true; };
  }, [activeTab, amgManifest]);

  // Cosmetic preview modal state
  const [previewItem, setPreviewItem] = useState<ShopItem | null>(null);
  const [previewCategory, setPreviewCategory] = useState<'boards' | 'pieces' | 'dropEffects' | 'winAnimations' | 'boardAccessories' | 'emotes'>('boards');

  // Derive collected state from persisted store (resets at midnight, not on navigation)
  const today = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })();
  const dailyCollected = lastShopCoinCollect === today;
  const insets = useSafeAreaInsets();
  const countdown = useCountdown();

  // Track shop_visit challenge on mount
  useEffect(() => {
    useChallengeStore.getState().updateProgress('shop_visit', 1);
  }, []);

  // ── Locked-item routing (post-pivot 2026-05-03) ─────────────────────
  //
  // After the loot-box pivot, no cosmetic is buyable directly. When a
  // locked item is tapped from the shop's preview modals, we either:
  //   • offer a shard-spend if the player has enough shards of the
  //     matching rarity (cheap, deterministic unlock), OR
  //   • route to the LootBox screen so they can open boxes for it.
  //
  // The two helpers below centralize that decision so every category
  // (boards, pieces, FX, frames, outfits, parts, pets, emotes) plugs
  // into the same logic and shows the same "OPEN BOXES" / "USE N
  // SHARDS" CTA copy on the preview modal.

  /** Map a source-registry rarity (7-tier) onto the loot-box 4-tier
   *  rarity used by the shard cost table. Mirrors the helper in
   *  lootBoxStore so we don't drag a private export across files. */
  function mapToLootRarity(rarity: ShopItem['rarity']): LootBoxRarity {
    switch (rarity) {
      case 'rare': return 'rare';
      case 'epic': return 'epic';
      case 'legendary':
      case 'mythic': return 'legendary';
      default: return 'common'; // common, uncommon, darkmatter (shouldn't drop)
    }
  }

  /** Given an item id + its 4-tier rarity, return the locked-state
   *  primary-CTA label. "USE N SHARDS" when affordable, else "OPEN
   *  BOXES". `itemId` is used to query ownership-aware shard cost. */
  function lockedActionLabelFor(rarity: LootBoxRarity): string {
    const cost = SHARD_UNLOCK_COST[rarity];
    return shards[rarity] >= cost
      ? `USE ${cost} ${rarity.toUpperCase()} SHARDS`
      : 'OPEN BOXES';
  }

  /** Run the locked-tap action: if the player has enough shards, spend
   *  them via the loot-box store (which invokes the right grant
   *  action). Otherwise navigate to LootBox. `onShardUnlockSuccess` is
   *  called when the shard spend lands so the caller can equip the
   *  newly-unlocked item in one beat. */
  function runLockedAction(itemId: string, rarity: LootBoxRarity, onShardUnlockSuccess?: () => void) {
    const cost = SHARD_UNLOCK_COST[rarity];
    if (shards[rarity] >= cost) {
      const ok = spendShardsForItem(itemId);
      if (ok) {
        haptics.win();
        playSound('coin');
        onShardUnlockSuccess?.();
        return;
      }
      // Spend failed (already owned race or unknown id). Fall through
      // to box routing so the player still gets a path forward.
    }
    haptics.tap();
    playSound('click');
    navigation.navigate('LootBox' as never);
  }

  // Open cosmetic preview modal instead of buying directly
  const handleItemPress = (category: 'boards' | 'pieces' | 'dropEffects' | 'winAnimations' | 'boardAccessories', item: ShopItem) => {
    haptics.tap();
    setPreviewItem(item);
    setPreviewCategory(category);
  };

  const handlePreviewBuy = () => {
    if (!previewItem) return;
    const equipKey = previewCategory === 'boards' ? 'board'
      : previewCategory === 'pieces' ? 'pieces'
      : previewCategory === 'dropEffects' ? 'dropEffect'
      : previewCategory === 'boardAccessories' ? 'boardAccessory'
      : 'winAnimation';
    // Post-pivot: no direct purchase. Run the shared locked-action —
    // shard-spend if affordable (auto-equips on success), else route
    // to LootBox so the player can open boxes for this category.
    const rarity = mapToLootRarity(previewItem.rarity);
    runLockedAction(previewItem.id, rarity, () => {
      equipItem(equipKey, previewItem.id);
      setPreviewItem(null);
    });
    setPreviewItem(null);
  };

  const handlePreviewEquip = () => {
    if (!previewItem) return;
    const equipKey = previewCategory === 'boards' ? 'board'
      : previewCategory === 'pieces' ? 'pieces'
      : previewCategory === 'dropEffects' ? 'dropEffect'
      : previewCategory === 'boardAccessories' ? 'boardAccessory'
      : 'winAnimation';
    equipItem(equipKey, previewItem.id);
    haptics.select();
    setPreviewItem(null);
  };

  // Outfit tap → open preview modal. Modal handles buy/equip via callbacks.
  const handleOutfitPress = (item: ShopItem) => {
    haptics.tap();
    setOutfitPreview(item);
  };

  // AMG part tap — post-pivot routes to LootBox screen. Individual AMG
  // parts are not shard-unlockable in v1 (only outfit packs are, since
  // a pack auto-unlocks all its parts). So when the player taps the
  // CTA in AmgPartPreviewModal, we always navigate to boxes — the
  // creator does the same. No coin debit, no inline unlock.
  const confirmPartPurchase = (_partName: string) => {
    haptics.tap();
    playSound('click');
    setPartPreview(null);
    navigation.navigate('LootBox' as never);
  };

  const handleOutfitBuy = () => {
    if (!outfitPreview) return;
    // Post-pivot: shard-spend if affordable (auto-equips), else route
    // to LootBox. unlockOutfit + equipOutfitPack still grant + equip
    // when shards land — they're called from the lootBoxStore grant
    // path inside spendShardsForItem.
    const rarity = mapToLootRarity(outfitPreview.rarity);
    const itemId = outfitPreview.id;
    runLockedAction(itemId, rarity, () => {
      // After a shard unlock the outfit is already in ownedOutfits;
      // make sure it's the equipped pack so the player sees the change.
      equipOutfitPack(itemId);
      setOutfitPreview(null);
    });
    setOutfitPreview(null);
  };

  const handleOutfitEquip = () => {
    if (!outfitPreview) return;
    equipOutfitPack(outfitPreview.id);
    setOutfitPreview(null);
  };

  const handleEmotePress = (item: ShopItem) => {
    if (item.rarity === 'darkmatter') { haptics.error(); playSound('error'); return; }
    const isEquipped = equippedEmotes.includes(item.id);
    const isOwned = ownedEmotes.includes(item.id) || item.price === 0;

    if (isEquipped) {
      removeEquippedEmote(item.id);
      haptics.select();
      return;
    }

    const equipEmote = (id: string) => {
      // Prefer replacing a free (price=0) emote slot over paid ones
      const freeEmoteIds = new Set(EMOTES.filter(e => e.price === 0).map(e => e.id));
      const slotIdx = equippedEmotes.findIndex(e => e !== id && (freeEmoteIds.has(e) || !EMOTE_IDS.has(e) || e === ''));
      setEquippedEmote(slotIdx !== -1 ? slotIdx : 0, id);
    };

    if (isOwned) {
      equipEmote(item.id);
      haptics.select();
      playSound('whoosh');
      return;
    }

    // Post-pivot: locked emote → shard-unlock if affordable, else
    // route to LootBox. Direct coin purchase + the corresponding
    // confirm dialog are gone.
    const rarity = mapToLootRarity(item.rarity);
    runLockedAction(item.id, rarity, () => {
      // After a shard unlock the emote is in ownedEmotes; equip it
      // into the wheel like the old buy path did.
      equipEmote(item.id);
    });
  };

  const handlePetPress = (pet: Pet) => {
    if (equippedPet === pet.id) {
      // Unequip
      equipPet(null);
      haptics.select();
      playSound('whoosh');
      return;
    }
    if (ownedPets.includes(pet.id)) {
      equipPet(pet.id);
      haptics.select();
      playSound('whoosh');
      return;
    }
    if (pet.price <= 0) return;
    // Post-pivot: locked pet → shard-unlock if affordable, else
    // route to LootBox. Pet rarity comes from petRegistry meta.
    const rarity: LootBoxRarity =
      pet.rarity === 'rare' ? 'rare'
      : pet.rarity === 'epic' ? 'epic'
      : pet.rarity === 'legendary' ? 'legendary'
      : 'common';
    runLockedAction(pet.id, rarity, () => {
      // After a shard unlock the pet is in ownedPets; equip it.
      equipPet(pet.id);
    });
  };

  const handleDailyCollect = () => {
    const collected = collectDailyShopCoins();
    if (collected) { haptics.win(); playSound('coin'); }
    else { haptics.error(); playSound('error'); }
  };

  // Painted shop-tab icons (Flux-generated). Replaces the emoji set —
  // each tab now has a consistent glossy illustrated icon that reads
  // as premium game art at 32-48px.
  const tabs: { key: ShopTab; label: string; iconSource: any }[] = [
    { key: 'clothes', label: 'Clothes', iconSource: require('../assets/images/ui/shop-outfits.png') },
    { key: 'outfits', label: 'Outfits', iconSource: require('../assets/images/ui/shop-outfits.png') },
    { key: 'boards', label: 'Boards', iconSource: require('../assets/images/ui/shop-boards.png') },
    { key: 'pieces', label: 'Pieces', iconSource: require('../assets/images/ui/shop-pieces.png') },
    { key: 'effects', label: 'Effects', iconSource: require('../assets/images/ui/shop-effects.png') },
    { key: 'wins', label: 'Wins', iconSource: require('../assets/images/ui/shop-wins.png') },
    { key: 'accessories', label: 'Frames', iconSource: require('../assets/images/ui/shop-frames.png') },
    { key: 'emotes', label: 'Emotes', iconSource: require('../assets/images/ui/shop-emotes.png') },
    { key: 'pets', label: 'Pets', iconSource: require('../assets/images/ui/shop-pets.png') },
    { key: 'boxes', label: 'Boxes', iconSource: require('../assets/images/ui/shop-boxes.png') },
  ];

  const rawItems = activeTab === 'boards' ? BOARD_THEMES :
                   activeTab === 'pieces' ? PIECE_THEMES :
                   activeTab === 'effects' ? DROP_EFFECTS :
                   activeTab === 'wins' ? WIN_ANIMATIONS :
                   activeTab === 'accessories' ? BOARD_ACCESSORIES :
                   // Emotes tab blends shop emotes with 3D Mixamo clips.
                   // IDs are namespace-disjoint (`dab` vs `emote_dab`).
                   activeTab === 'emotes' ? [...EMOTES, ...EMOTE_SHOP_ITEMS] :
                   activeTab === 'outfits' ? OUTFIT_SHOP_ITEMS : [];

  // Apply species super-filter FIRST when on outfits tab, then collection filter
  const speciesFiltered = activeTab === 'outfits' && outfitSpecies !== 'All'
    ? rawItems.filter((item) => {
        const meta = OUTFITS[item.id];
        return meta?.species === outfitSpecies;
      })
    : rawItems;
  const items = collectionFilter === 'All' ? speciesFiltered : speciesFiltered.filter(item => item.collection === collectionFilter);
  // Collection filters are dynamic per tab. For outfits, expose every unique
  // collection ("Human · Modern Civilians", "Elven · Elven Warriors", ...).
  const collectionFilters: (string)[] = activeTab === 'outfits'
    ? (['All', ...Array.from(new Set(OUTFIT_SHOP_ITEMS.map((i) => i.collection).filter(Boolean))) as string[]])
    : ['All', 'OG Collection', 'Season 0', 'Neon Pack', 'Mythic Collection'];

  const category = activeTab === 'boards' ? 'boards' :
                   activeTab === 'effects' ? 'dropEffects' :
                   activeTab === 'wins' ? 'winAnimations' :
                   activeTab === 'accessories' ? 'boardAccessories' :
                   activeTab === 'emotes' ? 'emotes' : 'pieces';

  return (
    <ScreenBackground scene="shop">
      <View style={[s.container, { paddingTop: insets.top + 12 }]}>
        {/* ── Header ── */}
        <StaggeredEntry index={0} delay={60}>
        <View style={s.header}>
          <View style={s.titleStack}>
            <Text style={s.title} accessibilityRole="header">SHOP</Text>
            <Text style={s.titleSub}>DAILY ROTATION  ·  PREMIUM DROPS</Text>
          </View>
          <View style={s.currencyRow}>
            <Shimmer color="rgba(255,215,0,0.15)" duration={3000}>
              <View style={s.coinDisplay}>
                <Text style={s.coinEmoji}>{'\u{1FA99}'}</Text>
                <Text style={s.coinValue}>{coins.toLocaleString()}</Text>
              </View>
            </Shimmer>
            <Shimmer color="rgba(46,204,113,0.12)" duration={3500}>
              <View style={s.gemDisplay}>
                <Text style={s.gemEmoji}>{'\u{1F48E}'}</Text>
                <Text style={s.gemValue}>{(gems || 0).toLocaleString()}</Text>
              </View>
            </Shimmer>
          </View>
        </View>
        </StaggeredEntry>

        {/* ── Main scrollable content ── */}
        {/* style={{ flex: 1 }} is required so the ScrollView claims the
            remaining vertical space below the header. Without it the
            ScrollView's own height defaults to its content's intrinsic
            height — which is fine on tall screens but on a 390x844
            phone the content extends below the visible area and the
            player can't scroll all the way down (Devon's audit). */}
        <ScrollView style={s.scrollFlex} showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>
          {/* ── Locker status strip ─────────────────────────────────
              Surfaces "you have N boxes waiting to open" + shard
              balance just below the header. Without this the player
              has no signal that they have unopened content — they
              would have to scroll to the BAGS section or open the
              Customize tab to find out. Each chip is tappable: BOXES
              jumps to LootBoxScreen, SHARDS jumps to ShardShop. */}
          {(() => {
            const totalBoxes = ownedBoxes.reduce((sum, b) => sum + b.count, 0);
            const totalShards = shards.common + shards.rare + shards.epic + shards.legendary;
            if (totalBoxes === 0 && totalShards === 0) return null;
            return (
              <StaggeredEntry index={1} delay={50}>
                <View style={s.lockerStripWrap}>
                  {totalBoxes > 0 && (
                    <PressScale
                      onPress={() => {
                        haptics.tap();
                        playSound('click');
                        navigation.navigate('LootBox' as never);
                      }}
                      containerStyle={{ flex: 1 }}
                      accessibilityRole="button"
                      accessibilityLabel={`Open boxes, ${totalBoxes} ready`}
                    >
                      <LinearGradient
                        colors={['rgba(255,140,0,0.30)', 'rgba(255,90,0,0.15)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={s.lockerStripChip}
                      >
                        <Text style={s.lockerStripChipValue}>{totalBoxes}</Text>
                        <Text style={s.lockerStripChipLabel}>BOXES READY</Text>
                        <Text style={s.lockerStripChevron}>{'›'}</Text>
                      </LinearGradient>
                    </PressScale>
                  )}
                  {totalShards > 0 && (
                    <PressScale
                      onPress={() => {
                        haptics.tap();
                        playSound('click');
                        navigation.navigate('ShardShop' as never);
                      }}
                      containerStyle={{ flex: 1 }}
                      accessibilityRole="button"
                      accessibilityLabel={`Shard shop, ${totalShards} total shards`}
                    >
                      <View style={s.lockerStripShardsChip}>
                        <Text style={[s.lockerStripChipValue, { color: '#c997e7' }]}>{totalShards}</Text>
                        <Text style={[s.lockerStripChipLabel, { color: 'rgba(201,151,231,0.85)' }]}>SHARDS</Text>
                        <Text style={[s.lockerStripChevron, { color: '#c997e7' }]}>{'›'}</Text>
                      </View>
                    </PressScale>
                  )}
                </View>
              </StaggeredEntry>
            );
          })()}

          {/* ═══ 1. ITEM-SHOP TABS — REMOVED 2026-05-03 ═══
              All cosmetic browse tabs (Clothes / Outfits / Boards /
              Pieces / Effects / Wins / Frames / Emotes / Pets) moved
              to the Customize tab per Devon: "all the content in the
              customize tab and then the shop can be slimmed down."
              Matches Basketball Stars structure: Shop is the
              acquisition funnel (deals + bags + IAP), Customize is
              the catalog (browse + equip + see-locked).

              Buy flows (AmgPartPreviewModal / OutfitPreviewModal /
              ConfirmDialog) still exist and fire from Customize-side
              catalog screens. The DAILY DEALS section below also
              still routes its taps through them.

              To restore: paste the tab strip + per-tab content from
              git history (this commit -1). The `tabs` array, filter
              state, and helper components are kept so restoration is
              a one-paste operation. */}

          {/* ═══ 2. DAILY DEALS ═══ */}
          <StaggeredEntry index={2} delay={60}>
            <View style={s.dealsSectionWrap}>
              {/* Painted atmospheric banner — sits behind the whole deals
                  strip at ~28% opacity so cards pop while the backdrop
                  adds depth. Generated via fal.ai Flux, bg kept full. */}
              <View pointerEvents="none" style={s.dealsBannerBg}>
                <Image
                  source={require('../assets/images/ui/featured-banner.png')}
                  style={s.dealsBannerImg}
                  resizeMode="cover"
                />
              </View>
              <SectionHeader
                title="TODAY'S DEALS"
                gradientColors={['#ff6a00', '#ff8c00']}
                rightText={`Refreshes in: ${countdown}`}
              />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.dealsRow}>
              <DailyDealCard
                icon={'\u{1FA99}'}
                title="Free Coins"
                subtitle="500 coins daily"
                buttonLabel={dailyCollected ? 'COLLECTED' : 'COLLECT'}
                buttonColor={dailyCollected ? ['#555', '#444'] : ['#27ae3d', '#1e8a30']}
                badge="FREE"
                onPress={handleDailyCollect}
              />
              <DailyDealCard
                icon={'\u{1F3AC}'}
                title="Watch Ad"
                subtitle="+200 coins"
                buttonLabel="WATCH"
                buttonColor={['#3498db', '#2471a3']}
                onPress={() => haptics.tap()}
              />
              {/* Featured Today — 4 deterministic picks that rotate at midnight.
                  See src/data/shopRotation.ts for the seeded selection logic. */}
              {/* AAA pass: featured outfit deals show the painted PACK_ICON
                  (chunky 3D pack cover) and emote deals show their EMOTE_ICON
                  instead of generic 👗 / 💃 emoji glyphs. Pets fall back to
                  emoji because Shop pets use the lowercase pets.ts ID
                  scheme that doesn't map cleanly to a single icon source. */}
              {(() => {
                const featured = getDailyFeatured();
                return featured.deals.map((deal) => {
                  const isOutfit = deal.category === 'outfit';
                  const isOwned = isOutfit && ownedOutfits.includes(deal.item.id);
                  const iconByCategory: Record<string, string> = {
                    outfit: '👕',
                    pet: '🐶',
                    emote: '💃',
                  };
                  // Painted icon resolution per category. Falls back to
                  // undefined (and then to the emoji glyph) when the
                  // deal item doesn't have a painted source available.
                  let painted: ImageSourcePropType | undefined;
                  if (isOutfit) {
                    const outfitMeta = OUTFITS[deal.item.id];
                    if (outfitMeta) {
                      const sk = OUTFIT_PACK_TO_SIDEKICK[outfitMeta.pack];
                      painted = sk ? getPackIcon(sk) : undefined;
                    }
                  } else if (deal.category === 'emote') {
                    painted = getEmoteIcon(deal.item.id);
                  }
                  // Post-pivot 2026-05-03: direct purchase is dead, so
                  // the "1500🪙 (was 2000)" discount-price subtitle is
                  // misleading — the player can't pay any coin price
                  // for the item. Replaced with a flat "Spotlight pick"
                  // and the PREVIEW button still opens the modal which
                  // routes to LootBox/shards via runLockedAction.
                  return (
                    <DailyDealCard
                      key={deal.item.id}
                      icon={iconByCategory[deal.category] ?? '✨'}
                      iconImage={painted}
                      title={deal.item.name}
                      subtitle={isOwned ? 'In your locker' : 'Spotlight pick'}
                      buttonLabel={isOwned ? 'OWNED' : 'PREVIEW'}
                      buttonColor={isOwned ? ['#555', '#333'] : ['#ff6a00', '#ff8c00']}
                      badge={deal.badge}
                      pulseBadge={deal.badge.includes('HOT') && !isOwned}
                      onPress={() => {
                        haptics.tap();
                        if (isOutfit && !isOwned) {
                          setOutfitPreview({ ...deal.item, price: deal.discountedPrice });
                        }
                      }}
                    />
                  );
                });
              })()}
            </ScrollView>
            </View>
          </StaggeredEntry>

          {/* ═══ 2. BOXES — primary acquisition (BS-style) ═══
              Bags are the new front door for cosmetics. Every
              tier drops a curated random pull of the part / outfit
              / pet / piece library. Tappable rows → LootBoxScreen
              for the open-and-reveal flow. */}
          <StaggeredEntry index={2} delay={60}>
          <View style={s.boxesSectionWrap}>
            {/* BAGS used to be a full-width purple gradient banner.
                After the section grouping (TIERED / THEMED / FEATURED)
                landed below it the banner felt redundant — three
                gradient bars stacked. Replaced with a tighter title +
                blurb pair so visual hierarchy reads:
                  SHOP big title > TODAY'S DEALS orange banner (primary)
                  > BAGS / sub-sections (text-only). */}
            <View style={s.bagsSectionHead}>
              <Text style={s.bagsSectionTitle}>BAGS</Text>
              <Text style={s.bagsSectionBlurb}>
                Random cosmetic drops — outfits, parts, pets, boards, pieces, effects.
                Dupes auto-convert into shards.
              </Text>
            </View>
            <View style={s.boxList}>
              {/* Boxes grouped: Tiered / Themed / Featured. Themed
                  boxes carry a category accent border + tinted bg so
                  they read as distinct from the generic chest-art
                  rows. The Featured Box gets its own section with a
                  "rotates weekly" tagline. */}
              {(() => {
                const tiered = LOOT_BOXES.filter((b) => !b.themedCategory && b.tier !== 'featured');
                const themed = LOOT_BOXES.filter((b) => b.themedCategory);
                const featured = LOOT_BOXES.filter((b) => b.tier === 'featured');

                const renderBoxRow = (box: typeof LOOT_BOXES[number]) => {
                  const count = ownedBoxes.find(b => b.boxId === box.id)?.count || 0;
                  const accent = box.themedAccent ?? null;
                  return (
                    <PressScale
                      key={box.id}
                      scaleTo={0.97}
                      onPress={() => {
                        haptics.tap();
                        playSound('click');
                        navigation.navigate('LootBox' as never);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`${box.name}, ${count} owned${box.cost > 0 ? `, costs ${box.cost} coins` : ', earn-only'}`}
                    >
                      <View style={[
                        s.boxItem,
                        accent ? { borderColor: `${accent}66`, backgroundColor: `${accent}10` } : null,
                      ]}>
                        {accent ? <View style={[s.boxItemAccent, { backgroundColor: accent }]} /> : null}
                        <View style={s.boxItemChestSlot}>
                          <LootChest tier={box.tier === 'featured' ? 'gold' : box.tier} size={56} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={s.boxItemName}>{box.name}</Text>
                          <Text style={[s.boxItemCount, count > 0 && accent ? { color: accent } : null]}>
                            {count > 0 ? `${'\u00D7'}${count} owned` : box.blurb}
                          </Text>
                        </View>
                        <View style={s.boxItemRight}>
                          {box.cost > 0 ? (
                            <View style={s.boxItemPriceRow}>
                              <Text style={s.boxItemPriceEmoji}>{'\u{1FA99}'}</Text>
                              <Text style={s.boxItemPrice}>{box.cost.toLocaleString()}</Text>
                            </View>
                          ) : (
                            <View style={s.boxEarnPill}>
                              <Text style={s.boxEarnPillText}>EARN</Text>
                            </View>
                          )}
                          <Text style={s.boxItemChevron}>{'\u203A'}</Text>
                        </View>
                      </View>
                    </PressScale>
                  );
                };

                const renderSection = (title: string, blurb: string, list: typeof LOOT_BOXES) => list.length === 0 ? null : (
                  <View key={title} style={s.boxSection}>
                    <View style={s.boxSectionHead}>
                      <Text style={s.boxSectionTitle}>{title}</Text>
                      <Text style={s.boxSectionBlurb}>{blurb}</Text>
                    </View>
                    {list.map(renderBoxRow)}
                  </View>
                );

                return (
                  <>
                    {renderSection('TIERED', 'Generic pool, better odds at higher tiers', tiered)}
                    {renderSection('THEMED', 'Bias toward a specific category', themed)}
                    {renderSection('FEATURED', 'Hand-picked rotation, refreshed weekly', featured)}
                  </>
                );
              })()}
            </View>
          </View>
          </StaggeredEntry>
          {/* ═══ 2. LOOT BAGS ═══
              REMOVED 2026-05-02 (Devon's AAA polish pass): the section
              was a non-functional mockup. Every card's onPress was a
              bare `() => haptics.tap()` with no store, no purchase
              flow, no reveal. The cards LOOKED tappable AND showed
              prices, but tapping did nothing beyond a haptic blip —
              worst kind of broken affordance for a shipping product.
              Restore this block when a real gem-based loot-bag store +
              reveal flow ships (separate from the existing coin-based
              Loot Boxes — gems vs coins is the intended differentiator).
              The Loot Boxes flow lives at LootBoxScreen and is fully
              wired (tap WIN BOX on Home or the Boxes tab in Shop). */}

          {/* ═══ 3. COIN & GEM BUNDLES ═══
              REMOVED 2026-05-02 (Devon's AAA polish pass): 8 bundle
              cards displayed real dollar prices ($0.99 / $4.99 / $9.99
              / $19.99) for coin and gem packs, but every onPress was
              `() => haptics.tap()` — there is no IAP code in the
              project (no expo-in-app-purchases, no RevenueCat, no
              ExpoIAP integration). Apple WILL reject the app for
              showing dollar-priced "buy" buttons that fire nothing —
              Guideline 3.1.1 covers this exactly.

              Restore this block when real IAP ships: each card needs
              an actual product ID, the price label must come from
              the IAP SDK (so it localizes), and onPress must trigger
              the platform purchase flow. Daily free coin claim still
              lives in TODAY'S DEALS at the top of the Shop. */}

          {/* Item shop is now rendered first (above deals) */}
        </ScrollView>
      </View>
      {/* Cosmetic preview modal */}
      <CosmeticPreviewModal
        visible={previewItem !== null}
        item={previewItem}
        category={previewCategory}
        isOwned={previewItem ? (owned[previewCategory as keyof typeof owned]?.includes(previewItem.id) ?? false) : false}
        isEquipped={previewItem ? equipped[
          previewCategory === 'boards' ? 'board'
          : previewCategory === 'pieces' ? 'pieces'
          : previewCategory === 'dropEffects' ? 'dropEffect'
          : previewCategory === 'boardAccessories' ? 'boardAccessory'
          : 'winAnimation'
        ] === previewItem.id : false}
        canAfford={previewItem ? coins >= previewItem.price : false}
        onBuy={handlePreviewBuy}
        onEquip={handlePreviewEquip}
        onClose={() => setPreviewItem(null)}
        lockedActionLabel={previewItem
          ? lockedActionLabelFor(mapToLootRarity(previewItem.rarity))
          : undefined}
      />

      {/* Outfit preview modal — dedicated 3D preview for the Outfits tab */}
      <OutfitPreviewModal
        visible={outfitPreview !== null}
        outfitId={outfitPreview?.id ?? null}
        price={outfitPreview?.price ?? 0}
        isOwned={outfitPreview ? ownedOutfits.includes(outfitPreview.id) : false}
        isEquipped={outfitPreview?.id === equippedOutfitId}
        canAfford={outfitPreview ? coins >= outfitPreview.price : false}
        onClose={() => setOutfitPreview(null)}
        onBuy={handleOutfitBuy}
        onEquip={handleOutfitEquip}
        lockedActionLabel={outfitPreview
          ? lockedActionLabelFor(mapToLootRarity(outfitPreview.rarity))
          : undefined}
        lockedStatusLabel="🔒 IN BAGS"
      />

      {/* AMG part try-on preview — opens when the player taps an
          UNOWNED Clothes card. Shows the part rendered on their own
          character, then BUY/CANCEL. Replaces the bare confirm dialog
          that didn't actually let the player see the part. */}
      <AmgPartPreviewModal
        visible={partPreview !== null}
        partName={partPreview?.name ?? null}
        slot={partPreview?.slot ?? null}
        canAfford={partPreview ? coins >= getPartPrice(partPreview.name).price : false}
        onClose={() => setPartPreview(null)}
        onBuy={confirmPartPurchase}
        // Post-pivot: AMG parts always route to LootBox. They're not
        // shard-unlockable individually in v1 — the player gets parts
        // as bundles when an outfit pack drops or shards-unlocks.
        lockedActionLabel="OPEN BOXES"
      />

      {/* Styled buy-confirm dialog for pet + emote purchases. Replaces
          the blocking native window.confirm() / multi-button Alert.alert
          which froze the web preview AND looked off-brand. */}
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
        onCancel={() => {
          haptics.tap();
          setConfirmDialog(null);
        }}
      />

      {/* In-place equip confirmation. Shows briefly when the player
          taps an owned AMG part card so they get feedback without
          having to navigate to the creator. */}
      {equipToast && (
        <Animated.View
          entering={FadeIn.duration(160)}
          style={s.equipToast}
          pointerEvents="none"
        >
          <Text style={s.equipToastText}>{equipToast.label}</Text>
        </Animated.View>
      )}
    </ScreenBackground>
  );
}

// ═══════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════
const s = StyleSheet.create({
  container: { flex: 1 },

  // ── Header ──
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, marginBottom: 12,
  },
  titleStack: { gap: 2 },
  title: {
    fontFamily: fonts.heading, fontWeight: weight.bold, fontSize: 28,
    color: '#ffffff', letterSpacing: 2,
  },
  // AAA pass: replaces the equipped emoji row with a daily-rotation
  // promise — ties Shop's identity to the freshness loop (FOMO without
  // shouting). Warm-amber 9pt to read as a system label.
  titleSub: {
    fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 9,
    color: 'rgba(255,180,90,0.85)', letterSpacing: 1.4, marginTop: 1,
  },
  currencyRow: { flexDirection: 'column', gap: 4 },
  coinDisplay: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 16,
    paddingHorizontal: 12, paddingVertical: 5,
    borderWidth: 1, borderColor: 'rgba(255,209,102,0.2)',
  },
  coinEmoji: { fontSize: 14 },
  coinValue: { fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 14, color: colors.coinGold },
  gemDisplay: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 16,
    paddingHorizontal: 12, paddingVertical: 5,
    borderWidth: 1, borderColor: 'rgba(46,204,113,0.2)',
  },
  gemEmoji: { fontSize: 14 },
  gemValue: { fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 14, color: colors.gemGreen },

  scrollFlex: { flex: 1 },
  scrollContent: { paddingBottom: 120 },

  // ── Section Headers ──
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10, marginHorizontal: 16,
    marginTop: 16, marginBottom: 10, borderRadius: 12,
  },
  sectionHeaderText: {
    fontFamily: fonts.heading, fontWeight: weight.bold, fontSize: 16,
    color: '#ffffff', letterSpacing: 1.5,
    textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2,
  },
  sectionHeaderRight: {
    fontFamily: fonts.body, fontWeight: weight.semibold, fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
  },

  // ── Daily Deals ──
  dealsRow: { paddingHorizontal: 16, gap: 10 },
  dealCard: {
    width: (SCREEN_WIDTH - 52) / 3, minWidth: 105, maxWidth: 130,
    borderRadius: 16, overflow: 'hidden',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  dealCardInner: {
    alignItems: 'center', paddingVertical: 14, paddingHorizontal: 8,
    borderRadius: 16, gap: 4,
  },
  dealBadge: {
    position: 'absolute', top: 6, right: 6,
    backgroundColor: '#e74c3c', borderRadius: 8,
    paddingHorizontal: 7, paddingVertical: 3,
    shadowColor: '#e74c3c',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 3,
  },
  dealBadgeHot: {
    backgroundColor: '#ff6a00',
    shadowColor: '#ff8c00',
    shadowOpacity: 0.9,
    shadowRadius: 7,
    elevation: 6,
  },
  dealBadgeText: { fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 8, color: '#fff', letterSpacing: 0.5 },
  dealIcon: { fontSize: 32, marginBottom: 4 },
  // Painted icon variant — sized to match the emoji glyph's visual
  // weight at 32pt so swapping between emoji + painted doesn't shift
  // the deal-card layout.
  dealIconImg: { width: 44, height: 44, marginBottom: 4 },
  dealTitle: { fontFamily: fonts.heading, fontWeight: weight.bold, fontSize: 12, color: '#ffffff', textAlign: 'center' },
  dealSub: { fontFamily: fonts.body, fontWeight: weight.medium, fontSize: 10, color: colors.textSecondary, textAlign: 'center', marginTop: 1 },
  dealBtn: {
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 7, marginTop: 6,
    shadowColor: 'rgba(0,0,0,0.3)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 3,
  },
  dealBtnText: { fontFamily: fonts.heading, fontWeight: weight.bold, fontSize: 11, color: '#ffffff', letterSpacing: 1 },

  // ── Loot Bags ──
  bagsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 10 },
  bagCard: {
    flex: 1, borderRadius: 16, overflow: 'hidden',
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  bagCardInner: {
    alignItems: 'center', paddingVertical: 16, paddingHorizontal: 8, gap: 6, borderRadius: 16,
  },
  bagIconWrap: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: 'rgba(255,200,50,0.4)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
  bagIcon: { fontSize: 30 },
  bagName: { fontFamily: fonts.heading, fontWeight: weight.bold, fontSize: 14, color: '#ffffff', marginTop: 2, letterSpacing: 0.5 },
  bagPrice: { fontFamily: fonts.body, fontWeight: weight.semibold, fontSize: 11, color: colors.textSecondary },
  bagOpenBtn: {
    borderRadius: 12, paddingHorizontal: 22, paddingVertical: 8, marginTop: 8,
    shadowColor: '#27ae3d',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 4,
  },
  bagOpenText: { fontFamily: fonts.heading, fontWeight: weight.bold, fontSize: 12, color: '#ffffff', letterSpacing: 1.5 },

  // ── Bundles ──
  bundlesGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 10, justifyContent: 'center' },
  bundleCard: {
    // Was width: '47%' which on web didn't compute correctly through the
    // PressScale wrapper — the bundle cards rendered all 4 in one row,
    // clipping the leftmost + rightmost behind the PhoneFrame edges.
    // Fixed pixel width fits 2 cards per row at the 390-wide phone:
    // 390 - 32 padding - 10 gap = 348 / 2 = 174 max. 168 leaves a tiny
    // breathing room.
    width: 168,
    borderRadius: 16, overflow: 'hidden',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 5,
  },
  bundleCardHighlight: {
    borderColor: 'rgba(255,140,0,0.4)',
    shadowColor: 'rgba(255,140,0,0.3)',
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 8,
  },
  bundleInner: {
    alignItems: 'center', paddingVertical: 18, paddingHorizontal: 8, borderRadius: 16,
    position: 'relative',
  },
  bundleBadge: {
    position: 'absolute', top: -1, right: -1,
    backgroundColor: '#e74c3c', borderBottomLeftRadius: 10, borderTopRightRadius: 14,
    paddingHorizontal: 8, paddingVertical: 4,
    shadowColor: '#e74c3c',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 3,
  },
  bundleBadgeText: { fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 9, color: '#fff', letterSpacing: 0.5 },
  bundleIcon: { fontSize: 34 },
  bundleAmount: { fontFamily: fonts.heading, fontWeight: weight.bold, fontSize: 22, color: '#ffffff', marginTop: 4 },
  bundlePopular: { fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 8, color: colors.orange, letterSpacing: 1.5, marginTop: 4 },
  bundlePriceRow: {
    paddingVertical: 10, alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  bundlePrice: { fontFamily: fonts.heading, fontWeight: weight.bold, fontSize: 14, color: 'rgba(255,255,255,0.85)' },

  // ── Item Shop ──
  itemShopSection: { marginTop: 8 },
  tabScrollWrap: { position: 'relative' },
  scrollFadeRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 28,
    pointerEvents: 'none' as any,
  },
  tabRow: {
    flexDirection: 'row', paddingHorizontal: 12, gap: 5, marginBottom: 12,
  },
  tab: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, paddingVertical: 9, paddingHorizontal: 11, borderRadius: 12,
    backgroundColor: 'rgba(10,14,32,0.55)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.08)',
  },
  // AAA pass: active tab gets a stronger amber outline + a touch of
  // glow shadow so the player can scan the row from the opposite side
  // of the screen and immediately see which category they're in.
  tabActive: {
    backgroundColor: 'rgba(255,140,0,0.22)',
    borderColor: 'rgba(255,180,90,0.85)',
    shadowColor: '#ff8c00',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 6,
    elevation: 4,
  },
  tabIconImg: { width: 22, height: 22 },
  tabLabel: { fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 11, color: colors.textSecondary, letterSpacing: 0.4 },
  tabLabelActive: { color: '#ffffff', letterSpacing: 0.6 },

  collectionRow: { paddingHorizontal: 16, gap: 6, marginBottom: 10 },

  grid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 16,
  },
  itemCard: {
    width: 108, backgroundColor: colors.surface, borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: colors.surfaceBorder, paddingBottom: 10, minHeight: 157,
  },
  rarityStrip: { height: 3, width: '100%' },
  itemPreview: { width: '100%', height: 64, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  piecePreviewBackdrop: { width: '100%', height: 64, alignItems: 'center', justifyContent: 'center' },
  piecePreviewRow: { flexDirection: 'row', gap: 10, zIndex: 1 },
  // Outfit names: 9pt bold, allowed to wrap to 2 lines via the
  // numberOfLines={outfitMeta ? 2 : 1} prop on the Text. Some pack
  // labels (APOCALYPSE OUTLAWS = 18 chars) can't fit one line at any
  // readable size in a 108px card, so wrap beats truncating to
  // "APOCALYPSE OUTLA..." which loses the pack identity word.
  // Bumped to 10pt now that wrapping handles overflow. Tight 11px
  // line-height keeps the wrapped names from inflating card height.
  itemName: {
    fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 10, color: '#ffffff',
    letterSpacing: 0, lineHeight: 11.5, textAlign: 'center', marginTop: 6, paddingHorizontal: 2,
  },
  // Centering wrap for the painted RarityChip inside the 108px item card.
  // The chip itself has no outer spacing, so we center it + give it breathing
  // room above the price row.
  rarityChipWrap: {
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 2,
  },
  // Daily deals backdrop — the painted featured-banner sits behind the whole
  // section header + horizontal cards strip, adding atmospheric depth without
  // competing with the cards themselves. pointerEvents none so interactions
  // pass through to the deal cards.
  dealsSectionWrap: {
    position: 'relative',
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 8,
  },
  // BOXES is the new primary acquisition section after gutting the
  // 10-tab cosmetic browse from Shop (2026-05-03). Same wrap treatment
  // as the deals section so they read as siblings.
  boxesSectionWrap: {
    position: 'relative',
    marginBottom: 12,
  },
  dealsBannerBg: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.28,
  },
  dealsBannerImg: {
    width: '100%',
    height: '100%',
  },
  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, marginTop: 4 },
  priceEmoji: { fontSize: 12 },
  priceText: { fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 13, color: colors.coinGold },
  coinGoalText: {
    fontFamily: fonts.body,
    fontWeight: weight.medium,
    fontSize: 9,
    color: '#e74c3c',
    textAlign: 'center',
    marginTop: 2,
    lineHeight: 13,
  },
  equippedBadge: {
    marginTop: 4, alignSelf: 'center', backgroundColor: 'rgba(39,174,61,0.2)',
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2,
  },
  equippedText: {
    fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 9, color: colors.green,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  ownedText: {
    fontFamily: fonts.body, fontWeight: weight.medium, fontSize: 10, color: colors.textSecondary,
    textAlign: 'center', marginTop: 4,
  },
  lockedText: {
    fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 10,
    textAlign: 'center', marginTop: 4, textTransform: 'uppercase',
  },
  unlockReqText: {
    fontFamily: fonts.body, fontWeight: weight.medium, fontSize: 8,
    textAlign: 'center', marginTop: 2, color: 'rgba(200,220,255,0.4)',
    lineHeight: 11, paddingHorizontal: 4,
  },

  // ── Pet cards ──
  petCard: {
    width: 108, backgroundColor: colors.surface, borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: colors.surfaceBorder, paddingBottom: 10,
  },
  petPreview: {
    width: '100%', height: 80, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  petPreviewImage: {
    width: 64, height: 64,
  },
  petName: {
    fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 12, color: '#ffffff',
    textAlign: 'center', marginTop: 6, paddingHorizontal: 4,
  },
  petBreed: {
    fontFamily: fonts.body, fontWeight: weight.medium, fontSize: 9, color: colors.textSecondary,
    textAlign: 'center', marginTop: 1, paddingHorizontal: 4,
  },

  // ── Box list (inside tab) ──
  boxList: { gap: 8, paddingHorizontal: 16 },
  boxListIntro: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginBottom: 6,
    paddingHorizontal: 4,
    lineHeight: 15,
  },
  // ── Locker status strip (above Daily Deals) ──────────────────
  // Two chips side-by-side that surface "you have N boxes waiting"
  // + shard balance. Each chip is tappable and jumps to the
  // corresponding screen. Hidden entirely when both are zero so the
  // header doesn't carry dead pixels for new players.
  lockerStripWrap: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  lockerStripChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255,180,90,0.55)',
    shadowColor: '#ff8c00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  lockerStripShardsChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(155,89,182,0.55)',
    backgroundColor: 'rgba(155,89,182,0.18)',
  },
  lockerStripChipValue: {
    fontFamily: fonts.heading,
    fontWeight: weight.black,
    fontSize: 18,
    color: '#ffb347',
  },
  lockerStripChipLabel: {
    flex: 1,
    fontFamily: fonts.heading,
    fontWeight: weight.black,
    fontSize: 11,
    color: '#ffb347',
    letterSpacing: 1.4,
  },
  lockerStripChevron: {
    fontFamily: fonts.heading,
    fontWeight: weight.black,
    fontSize: 20,
    color: '#ffb347',
    lineHeight: 20,
  },

  // ── BAGS section header (text-only) ────────────────────────
  // Replaced the full-width purple gradient banner — once TIERED /
  // THEMED / FEATURED sub-section headers landed below, the banner
  // felt redundant (three gradient bars stacked). Text-only header
  // matches the sub-section pattern for one consistent rhythm.
  bagsSectionHead: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
  },
  bagsSectionTitle: {
    fontFamily: fonts.heading,
    fontWeight: weight.black,
    fontSize: 18,
    color: '#ffffff',
    letterSpacing: 2.0,
  },
  bagsSectionBlurb: {
    fontFamily: fonts.body,
    fontWeight: weight.regular,
    fontSize: 11,
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 0.4,
    marginTop: 4,
    lineHeight: 16,
  },

  // ── Boxes section grouping ───────────────────────────────────
  // TIERED / THEMED / FEATURED groups read top-down, each with a tiny
  // header strip (title + blurb) so the player sees the menu of
  // options at a glance instead of one long flat list.
  boxSection: {
    marginTop: 4,
  },
  boxSectionHead: {
    paddingHorizontal: 4,
    paddingTop: 12,
    paddingBottom: 8,
  },
  boxSectionTitle: {
    fontFamily: fonts.heading,
    fontWeight: weight.black,
    fontSize: 12,
    color: '#ffffff',
    letterSpacing: 1.6,
  },
  boxSectionBlurb: {
    fontFamily: fonts.body,
    fontWeight: weight.regular,
    fontSize: 10,
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 0.4,
    marginTop: 2,
  },
  // Vertical accent stripe on themed boxes — same language as the
  // Customize loadout cells so themed-box → category-cell visual
  // identity is consistent across screens.
  boxItemAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },

  boxItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(10,14,32,0.65)', borderRadius: 14, padding: 12,
    borderWidth: 1.5, borderColor: 'rgba(255,180,90,0.25)',
  },
  // Chest slot — fixed-height slot that hosts the LootChest render so
  // every row aligns regardless of internal chest dimensions.
  boxItemChestSlot: {
    width: 56, height: 56, alignItems: 'center', justifyContent: 'center',
  },
  boxItemName: { fontFamily: fonts.heading, fontWeight: weight.black, fontSize: 14, color: '#ffffff', letterSpacing: 1 },
  boxItemCount: { fontFamily: fonts.body, fontWeight: weight.semibold, fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  boxItemRight: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  boxItemPriceRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  boxItemPriceEmoji: { fontSize: 13 },
  boxItemPrice: { fontFamily: fonts.body, fontWeight: weight.black, fontSize: 14, color: colors.coinGold },
  boxItemChevron: { fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 22, color: 'rgba(255,180,90,0.7)', marginLeft: 4, lineHeight: 22 },
  boxEarnPill: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(46,204,113,0.18)',
    borderWidth: 1, borderColor: 'rgba(46,204,113,0.5)',
  },
  boxEarnPillText: { fontFamily: fonts.body, fontWeight: weight.black, fontSize: 9, color: colors.gemGreen, letterSpacing: 0.8 },

  // Search + ownership filter row at the top of the Clothes tab.
  amgSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  amgSearchInput: {
    flex: 1,
    height: 36,
    borderRadius: 18,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    color: '#fff',
    fontFamily: fonts.body,
    fontSize: 13,
  },
  amgOwnedChip: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  amgOwnedChipActive: {
    borderColor: colors.orange,
    backgroundColor: 'rgba(255,140,0,0.18)',
  },
  amgOwnedChipText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 1.2,
  },
  amgOwnedChipTextActive: {
    color: colors.orange,
  },
  // Pack list toolbar (count + expand-all toggle)
  amgPackToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 4,
  },
  amgPackCount: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 11,
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 0.8,
  },
  amgPackToolbarBtn: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 11,
    color: colors.orange,
    letterSpacing: 1.4,
  },
  // ── Clothes-tab intent banner ──
  // Tells the player explicitly: this is the MIX & MATCH catalog. Full
  // outfit sets live in the OUTFITS tab. Devon repro: "no clear
  // difference in what you are buying."
  intentBanner: {
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,180,90,0.35)',
    backgroundColor: 'rgba(255,140,0,0.08)',
  },
  intentBannerTitle: {
    fontFamily: fonts.heading,
    fontWeight: weight.black,
    fontSize: 12,
    color: '#ffffff',
    letterSpacing: 1.6,
    marginBottom: 2,
  },
  intentBannerBody: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 11,
    color: 'rgba(255,255,255,0.78)',
    lineHeight: 15,
  },
  intentBannerLink: {
    fontFamily: fonts.body,
    fontWeight: weight.black,
    color: colors.orange,
    letterSpacing: 0.6,
  },

  // ── Pack-card grid ──
  // Visual 2-col card layout for the Clothes pack browser. Each card
  // shows the chunky 3D pack cover so players scan packs by image, not
  // by text. Tap → opens the pack drill-in below.
  packCardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 4,
    rowGap: 10,
  },
  packCard: {
    width: 168,
    height: 188,
    borderRadius: 16,
    backgroundColor: 'rgba(10,14,32,0.65)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.10)',
    paddingTop: 10,
    paddingBottom: 12,
    alignItems: 'center',
    overflow: 'hidden',
  },
  packCardActive: {
    borderColor: 'rgba(255,180,90,0.85)',
    backgroundColor: 'rgba(255,140,0,0.12)',
    shadowColor: '#ff8c00',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 6,
  },
  packCardCover: {
    width: 110,
    height: 110,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  packCardCoverImg: {
    width: 96,
    height: 96,
  },
  packCardCoverEmoji: {
    fontSize: 48,
  },
  packCardName: {
    fontFamily: fonts.heading,
    fontWeight: weight.black,
    fontSize: 12,
    color: '#ffffff',
    letterSpacing: 0.8,
    paddingHorizontal: 8,
    textAlign: 'center',
  },
  packCardCountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginTop: 4,
  },
  packCardCount: {
    fontFamily: fonts.body,
    fontWeight: weight.black,
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 0.4,
  },
  packCardCountLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 8,
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: 1,
  },

  // ── Pack drill-in ──
  // Opened pack expands beneath the grid as a clearly-scoped section
  // ("BROWSING: Modern Civilians 12 parts") with the parts grid.
  packDrillIn: {
    marginTop: 14,
    marginHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,180,90,0.3)',
  },
  packDrillHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 6,
    paddingBottom: 8,
  },
  packDrillIcon: {
    width: 44,
    height: 44,
  },
  packDrillName: {
    fontFamily: fonts.heading,
    fontWeight: weight.black,
    fontSize: 14,
    color: '#ffffff',
    letterSpacing: 1.4,
  },
  packDrillSub: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },

  // Collapsible pack section
  amgPackSection: {
    marginTop: 6,
  },
  amgPackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 8,
  },
  amgPackChevron: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    width: 14,
    textAlign: 'center',
  },
  amgPackEmoji: {
    fontSize: 18,
  },
  amgPackIcon: {
    width: 36,
    height: 36,
    marginRight: 4,
  },
  amgPackName: {
    flex: 1,
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 14,
    color: '#fff',
    letterSpacing: 0.5,
  },
  amgPackCounts: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
  },
  amgPackGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 4,
    paddingTop: 6,
    paddingBottom: 4,
  },
  // In-place equip confirmation toast. Floats above the bottom tab bar
  // so it stays visible while the player keeps shopping.
  equipToast: {
    position: 'absolute',
    bottom: 90,
    alignSelf: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 22,
    backgroundColor: 'rgba(20,30,52,0.95)',
    borderWidth: 1.5,
    borderColor: colors.orange,
    shadowColor: colors.orange,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 10,
  },
  equipToastText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 12,
    color: colors.orange,
    letterSpacing: 1.1,
  },
  comingSoon: { alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  comingSoonIcon: { fontSize: 48, marginBottom: 12 },
  comingSoonText: { fontFamily: fonts.heading, fontWeight: weight.bold, fontSize: 22, color: colors.textSecondary },
});
