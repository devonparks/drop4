import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, ScrollView, Dimensions, TextInput, Pressable } from 'react-native';
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
import { FilterChip } from '../components/ui/FilterChip';
import { AnimatedRarityBg } from '../components/effects/AnimatedRarityBg';

const EMOTE_IDS = new Set(EMOTES.map(e => e.id));
import { useLootBoxStore, LOOT_BOXES } from '../stores/lootBoxStore';
import { useChallengeStore } from '../stores/challengeStore';
import { PETS, Pet, PET_RARITY_COLORS, PET_RARITY_LABELS } from '../data/pets';
import { OUTFIT_SHOP_ITEMS, EMOTE_SHOP_ITEMS } from '../data/cosmeticsShopCatalog';
import { getDailyFeatured } from '../data/shopRotation';
import { OUTFITS } from '../data/outfitRegistry';
import { useCharacterStore } from '../stores/characterStore';
import { AmgPartCard } from '../components/ui/AmgPartCard';
import { packMeta, sortPacksForShop } from '../data/amgPackMeta';
import { getPackIcon, getEmoteIcon } from '../data/cosmeticIcons';
import { filterAmgParts, groupAmgPartsByPack } from '../data/amgShopFilters';
import { AmgPartPreviewModal } from '../components/ui/AmgPartPreviewModal';
import { getPartPrice, isStarterPack, packPrefixFromPartName } from '../data/amgPartPricing';
import { Alert, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { OutfitPreviewModal } from '../components/ui/OutfitPreviewModal';
import { PETS as PETS_3D } from '../data/petRegistry';
import { DOG_IDLES } from '../data/animationRegistry';
import { Pet3D } from '../components/3d/Pet3D';
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
function DailyDealCard({ icon, title, subtitle, buttonLabel, buttonColor, badge, pulseBadge, onPress }: {
  icon: string; title: string; subtitle: string; buttonLabel: string;
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
          <Text style={s.dealIcon}>{icon}</Text>
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
// outfitRegistry pack-slug (lowercase snake_case) → Sidekick pack-code
// (UPPERCASE) translator. Outfit cards use this to look up their
// chunky 3D pack cover via getPackIcon() so the Outfits tab matches
// the Character/Clothes tab visual treatment.
const OUTFIT_PACK_TO_SIDEKICK: Record<string, string> = {
  modern_civilians:    'MDRN_CIVL',
  modern_police:       'MDRN_POLC',
  apocalypse_outlaws:  'APOC_OUTL',
  apocalypse_survivor: 'APOC_SURV',
  apocalypse_zombies:  'APOC_ZOMB',
  fantasy_villagers:   'FANT_VILL',
  fantasy_knights:     'FANT_KNGT',
  fantasy_skeletons:   'FANT_SKTN',
  elven_warriors:      'ELVN_WARR',
  goblin_fighters:     'GOBL_FIGT',
  pirate_captains:     'PIRT_CAPT',
  samurai_warriors:    'SAMR_WARR',
  viking_warriors:     'VIKG_WARR',
  sci_fi_civilians:    'SCFI_CIVL',
  sci_fi_soldiers:     'SCFI_SOLD',
};

// Legacy emoji map kept for the OutfitPreviewModal which still
// renders inline emojis at small sizes; can be migrated later.
const PACK_ICON: Record<string, string> = {
  modern_civilians: '\u{1F455}',      // shirt
  modern_police: '\u{1F46E}',          // police officer
  apocalypse_outlaws: '\u{1F3F4}',     // black flag
  apocalypse_survivor: '\u{1F9EA}',    // test tube
  apocalypse_zombies: '\u{1F9DF}',     // zombie
  fantasy_villagers: '\u{1F33E}',      // sheaf of rice
  fantasy_knights: '\u{1F6E1}',        // shield
  fantasy_skeletons: '\u{1F480}',      // skull
  elven_warriors: '\u{1F3F9}',         // bow and arrow
  goblin_fighters: '\u{1F47A}',        // goblin
  pirate_captains: '\u{1F3F4}\u200D\u2620\uFE0F', // pirate flag
  samurai_warriors: '\u{1F5E1}',       // dagger
  viking_warriors: '\u{2694}\uFE0F',   // crossed swords
  sci_fi_civilians: '\u{1F680}',       // rocket
  sci_fi_soldiers: '\u{1F52B}',        // pistol
};

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
        <Text style={s.itemName} numberOfLines={1}>{item.name}</Text>
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

  // Look up the 3D pet registry entry for this shop pet (same ID scheme)
  const pet3D = (PETS_3D as any)[pet.id];

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
          {pet3D?.glb ? (
            <Pet3D
              width={90} height={90}
              petGlb={pet3D.glb}
              animationGlb={DOG_IDLES[1]?.glb}
              animationLoop
            />
          ) : (
            <Image source={pet.idleImage} style={s.petPreviewImage} resizeMode="contain" />
          )}
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
  const purchaseItem = useShopStore(s2 => s2.purchaseItem);
  const equipItem = useShopStore(s2 => s2.equipItem);
  const setEquippedEmote = useShopStore(s2 => s2.setEquippedEmote);
  const removeEquippedEmote = useShopStore(s2 => s2.removeEquippedEmote);
  const purchaseEmote = useShopStore(s2 => s2.purchaseEmote);
  const equipPet = useShopStore(s2 => s2.equipPet);
  const purchasePet = useShopStore(s2 => s2.purchasePet);
  const spendCoins = useShopStore(s2 => s2.spendCoins);

  // Outfits live in characterStore (separate from shopStore's board/piece owned set)
  const ownedOutfits = useCharacterStore(s => s.ownedOutfits);
  const equippedOutfitId = useCharacterStore(s => s.equippedOutfitId);
  const unlockOutfit = useCharacterStore(s => s.unlockOutfit);
  const equipOutfitPack = useCharacterStore(s => s.equipOutfitPack);
  const equipAmgPart = useCharacterStore(s => s.equipAmgPart);
  const unlockedSpecies = useCareerStore(s => s.unlockedSpecies);
  const ownedBoxes = useLootBoxStore(s => s.ownedBoxes);
  const lastShopCoinCollect = useShopStore(s2 => s2.lastShopCoinCollect);
  const collectDailyShopCoins = useShopStore(s2 => s2.collectDailyShopCoins);
  const [activeTab, setActiveTab] = useState<ShopTab>('clothes');
  const [collectionFilter, setCollectionFilter] = useState<CollectionFilter | string>('All');
  const [outfitSpecies, setOutfitSpecies] = useState<'All' | 'human' | 'elves' | 'goblin' | 'skeleton' | 'zombie'>('All');
  const [outfitPreview, setOutfitPreview] = useState<ShopItem | null>(null);

  // AMG Clothes tab: manifest of every Sidekick part available on R2.
  // Fetched once on first Clothes render, grouped by pack prefix, and
  // rendered via AmgPartCard. Species chip filters the grid.
  const navigation = useNavigation<any>();
  const ownedAmgParts = useCharacterStore(s => s.ownedAmgParts);
  const unlockAmgPart = useCharacterStore(s => s.unlockAmgPart);
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

  const equippedBoardName = BOARD_THEMES.find(b => b.id === equipped.board)?.name || 'Classic Blue';
  const equippedPieceName = PIECE_THEMES.find(p => p.id === equipped.pieces)?.name || 'Classic';

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
    const success = purchaseItem(previewCategory as any, previewItem.id, previewItem.price);
    if (success) {
      haptics.win();
      playSound('coin');
      equipItem(equipKey, previewItem.id);
      setPreviewItem(null);
    } else {
      haptics.error(); playSound('error');
    }
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

  // AMG part buy — runs after the player confirms the try-on preview.
  // Spends coins, unlocks, auto-equips, and toasts. Lives at the top
  // level (vs inside the clothes IIFE) so the AmgPartPreviewModal can
  // call it directly when the player taps BUY.
  const confirmPartPurchase = (partName: string) => {
    const { price } = getPartPrice(partName);
    if (coins < price) { haptics.error(); return; }
    const ok = spendCoins(price);
    if (!ok) { haptics.error(); return; }
    haptics.win();
    playSound('purchase');
    unlockAmgPart(partName);
    const entry = amgManifest?.find((p) => p.name === partName);
    if (entry) {
      equipAmgPart(entry.slot, partName);
      setEquipToast({
        label: `Bought + Equipped ${packMeta(packPrefixFromPartName(partName)).displayName} ${entry.slot}`,
      });
    }
    setPartPreview(null);
  };

  const handleOutfitBuy = () => {
    if (!outfitPreview) return;
    if (outfitPreview.price > 0 && !spendCoins(outfitPreview.price)) return;
    // Unlock first so the AMG parts land in ownedAmgParts before equip
    // reads them; equipOutfitPack swaps in the body slots and updates
    // equippedOutfitId in one set call.
    unlockOutfit(outfitPreview.id);
    equipOutfitPack(outfitPreview.id);
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

    // Buy flow with confirm — same UX as AMG parts + pets so the
    // player never accidentally spends coins by tapping a shop card.
    if (coins < item.price) {
      haptics.error();
      const msg = `Not enough coins — this emote costs ${item.price}. You have ${coins}.`;
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Not enough coins', msg);
      return;
    }
    const doBuy = () => {
      const success = purchaseEmote(item.id, item.price);
      if (success) {
        haptics.win();
        playSound('coin');
        equipEmote(item.id);
      } else {
        haptics.error();
        playSound('error');
      }
    };
    if (Platform.OS === 'web') {
      const ok = window.confirm(`Buy emote for ${item.price} coins?`);
      if (ok) doBuy();
      else haptics.tap();
    } else {
      Alert.alert(
        'Buy this emote?',
        `Costs ${item.price} coins. You have ${coins}.`,
        [
          { text: 'Cancel', style: 'cancel', onPress: () => haptics.tap() },
          { text: `Buy ${item.price}`, onPress: doBuy },
        ],
      );
    }
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
    // Insufficient coins guard — same UX as AMG parts: error + bail.
    if (coins < pet.price) {
      haptics.error();
      const msg = `Not enough coins — ${pet.name} costs ${pet.price}. You have ${coins}.`;
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Not enough coins', msg);
      return;
    }
    // Confirm before spending. Pets cost 200-2000 coins; tapping a card
    // shouldn't auto-debit the player. Web uses window.confirm because
    // RN-Web's Alert.alert silently no-ops multi-button configs; native
    // gets a proper Alert.
    const doBuy = () => {
      const success = purchasePet(pet.id, pet.price);
      if (success) { haptics.win(); playSound('coin'); equipPet(pet.id); }
      else { haptics.error(); playSound('error'); }
    };
    if (Platform.OS === 'web') {
      const ok = window.confirm(`Buy ${pet.name} for ${pet.price} coins?`);
      if (ok) doBuy();
      else haptics.tap();
    } else {
      Alert.alert(
        'Buy this pet?',
        `${pet.name} costs ${pet.price} coins. You have ${coins}.`,
        [
          { text: 'Cancel', style: 'cancel', onPress: () => haptics.tap() },
          { text: `Buy ${pet.price}`, onPress: doBuy },
        ],
      );
    }
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
          <View>
            <Text style={s.title} accessibilityRole="header">SHOP</Text>
            <View style={s.equippedRow}>
              <Text style={s.equippedLabel}>{'\u{1F3AF}'} {equippedBoardName}</Text>
              <Text style={s.equippedDot}>{'\u2022'}</Text>
              <Text style={s.equippedLabel}>{'\u{1F534}'} {equippedPieceName}</Text>
            </View>
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

          {/* ═══ 1. ITEM SHOP — cosmetics first, they're the soul ═══ */}
          <StaggeredEntry index={1} delay={60}>
          <View style={s.itemShopSection}>
            <SectionHeader title="ITEM SHOP" gradientColors={['#ff8c00', '#cc5500']} />

            {/* Category tabs (with right fade-edge to indicate scrollability) */}
            <View style={s.tabScrollWrap}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabRow}>
                {tabs.map(tab => (
                  <PressScale
                    key={tab.key}
                    onPress={() => { setActiveTab(tab.key); setCollectionFilter('All'); haptics.tap(); playSound('click'); }}
                    scaleTo={0.94}
                    accessibilityRole="tab"
                    accessibilityLabel={`${tab.label} tab`}
                    accessibilityState={{ selected: activeTab === tab.key }}
                  >
                    <View style={[s.tab, activeTab === tab.key && s.tabActive]}>
                      <Image source={tab.iconSource} style={s.tabIconImg} resizeMode="contain" />
                      <Text style={[s.tabLabel, activeTab === tab.key && s.tabLabelActive]}>{tab.label}</Text>
                    </View>
                  </PressScale>
                ))}
              </ScrollView>
              <LinearGradient
                pointerEvents="none"
                colors={['rgba(10,14,39,0)', 'rgba(10,14,39,0.95)']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={s.scrollFadeRight}
              />
            </View>

            {/* Outfits-only: Species super-filter */}
            {activeTab === 'outfits' && (
              <View style={s.tabScrollWrap}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.collectionRow}>
                  {([
                    { id: 'All', label: 'All', icon: '\u{1F465}' },
                    { id: 'human', label: 'Human', icon: '\u{1F464}' },
                    { id: 'elves', label: 'Elf', icon: '\u{1F9DD}' },
                    { id: 'goblin', label: 'Goblin', icon: '\u{1F47A}' },
                    { id: 'skeleton', label: 'Skeleton', icon: '\u{1F480}' },
                    { id: 'zombie', label: 'Zombie', icon: '\u{1F9DF}' },
                  ] as const).map((sp) => {
                    const isLocked = sp.id !== 'All' && !unlockedSpecies.includes(sp.id);
                    return (
                      <FilterChip
                        key={sp.id}
                        label={sp.label}
                        icon={sp.icon}
                        active={outfitSpecies === sp.id}
                        locked={isLocked}
                        onPress={() => { setOutfitSpecies(sp.id as any); setCollectionFilter('All'); }}
                      />
                    );
                  })}
                </ScrollView>
                <LinearGradient
                  pointerEvents="none"
                  colors={['rgba(10,14,39,0)', 'rgba(10,14,39,0.95)']}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={s.scrollFadeRight}
                />
              </View>
            )}

            {/* Collection filters */}
            {activeTab !== 'boxes' && activeTab !== 'pets' && (
              <View style={s.tabScrollWrap}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.collectionRow}>
                  {collectionFilters.map(cf => (
                    <FilterChip
                      key={cf}
                      label={cf}
                      active={collectionFilter === cf}
                      onPress={() => setCollectionFilter(cf)}
                    />
                  ))}
                </ScrollView>
                <LinearGradient
                  pointerEvents="none"
                  colors={['rgba(10,14,39,0)', 'rgba(10,14,39,0.95)']}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={s.scrollFadeRight}
                />
              </View>
            )}

            {/* Items */}
            {activeTab === 'clothes' ? (
              // AMG parts grid — manifest-driven, grouped by pack prefix.
              // Species filter applies across every pack. Each card is an
              // AmgPartCard that dispatches buy / equip through the
              // shared handler below.
              amgManifest === null ? (
                <Animated.View entering={FadeIn.duration(280)} style={s.comingSoon}>
                  <Text style={s.comingSoonText}>Loading clothes library…</Text>
                </Animated.View>
              ) : (() => {
                // All filtering + grouping runs through the pure helper
                // in amgShopFilters.ts so it stays unit-testable. The
                // shop just hands its current state in and renders the
                // grouped result.
                const filtered = filterAmgParts(amgManifest, {
                  species: amgSpecies,
                  bucket: amgBucket,
                  query: amgQuery,
                  ownedOnly: amgOwnedOnly,
                  isPartOwned: isAmgPartOwned,
                  packDisplayName: (prefix) => packMeta(prefix).displayName,
                  slotBuckets: SLOT_BUCKETS,
                });
                const byPack = groupAmgPartsByPack(filtered);
                const packOrder = sortPacksForShop(Object.keys(byPack));
                const handleBuy = (partName: string) => {
                  // Open the try-on preview modal so the player can see the
                  // part on their character before committing to the buy.
                  // The actual spendCoins + unlock + equip happens in
                  // confirmPartPurchase below, fired from the modal's BUY.
                  haptics.tap();
                  const entry = amgManifest.find((p) => p.name === partName);
                  if (!entry) { haptics.error(); return; }
                  setPartPreview({ name: partName, slot: entry.slot });
                };
                const handleEquip = (partName: string) => {
                  // Look up the part's slot from the manifest and equip
                  // in-place — no need to bounce the player into the
                  // creator just to swap a single part. Toast feedback
                  // confirms the change without breaking flow.
                  const entry = amgManifest.find((p) => p.name === partName);
                  if (!entry) { haptics.error(); return; }
                  haptics.win();
                  playSound('click');
                  equipAmgPart(entry.slot, partName);
                  setEquipToast({
                    label: `Equipped ${packMeta(packPrefixFromPartName(partName)).displayName} ${entry.slot}`,
                  });
                };
                return (
                  <>
                    {/* Search + Owned-only toggle. Search matches part
                        names AND pack display names so "samurai" finds
                        every Samurai Warriors part. Owned-only flips
                        the grid into "what I have to mix" mode. */}
                    <View style={s.amgSearchRow}>
                      <TextInput
                        style={s.amgSearchInput}
                        placeholder="Search parts or packs…"
                        placeholderTextColor="rgba(255,255,255,0.4)"
                        value={amgQuery}
                        onChangeText={setAmgQuery}
                        clearButtonMode="while-editing"
                        autoCorrect={false}
                        autoCapitalize="none"
                      />
                      <Pressable
                        onPress={() => { haptics.tap(); setAmgOwnedOnly((v) => !v); }}
                        style={[s.amgOwnedChip, amgOwnedOnly && s.amgOwnedChipActive]}
                        accessibilityRole="switch"
                        accessibilityState={{ checked: amgOwnedOnly }}
                        accessibilityLabel="Filter to owned parts only"
                      >
                        <Text style={[s.amgOwnedChipText, amgOwnedOnly && s.amgOwnedChipTextActive]}>
                          {amgOwnedOnly ? '✓ OWNED' : 'OWNED'}
                        </Text>
                      </Pressable>
                    </View>

                    {/* Species filter chips */}
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ paddingVertical: 6, paddingHorizontal: 4, gap: 8 }}
                    >
                      {(['All', 'Human', 'Goblin', 'Elves', 'Skeleton', 'Zombie'] as AmgSpecies[]).map((sp) => (
                        <FilterChip
                          key={sp}
                          label={sp}
                          active={amgSpecies === sp}
                          onPress={() => setAmgSpecies(sp)}
                        />
                      ))}
                    </ScrollView>

                    {/* Slot-bucket filter chips: lets players narrow the
                        grid to a body region instead of scrolling past
                        unrelated packs. Bucket + species combine as AND. */}
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ paddingVertical: 4, paddingHorizontal: 4, gap: 8 }}
                    >
                      {(['All', 'Upper Body', 'Lower Body', 'Face', 'Accessories', 'Armor'] as AmgSlotBucket[]).map((b) => (
                        <FilterChip
                          key={b}
                          label={b}
                          active={amgBucket === b}
                          onPress={() => setAmgBucket(b)}
                        />
                      ))}
                    </ScrollView>

                    {/* Pack sections — collapsible. With ~40 packs × dozens
                        of parts each, the previous always-rendered grid
                        scrolled forever. Now players see a list of pack
                        rows with counts and expand the one(s) they want.
                        Active search / owned-only force-expand matching
                        packs so filters don't hide their results. */}
                    {packOrder.length === 0 ? (
                      <Animated.View entering={FadeIn.duration(280)} style={s.comingSoon}>
                        <Text style={s.comingSoonText}>No parts match. Try a different filter or search.</Text>
                      </Animated.View>
                    ) : (
                      <>
                        {/* Expand-all / collapse-all helper — when a player
                            does want to scroll the full catalog. Default
                            stays collapsed because hundreds of cards lag
                            mid-range mobiles. */}
                        <View style={s.amgPackToolbar}>
                          <Text style={s.amgPackCount}>
                            {packOrder.length} {packOrder.length === 1 ? 'pack' : 'packs'} ·{' '}
                            {Object.values(byPack).reduce((sum, ps) => sum + ps.length, 0)} parts
                          </Text>
                          <Pressable
                            onPress={() => {
                              haptics.tap();
                              setAmgExpandedPacks((prev) => {
                                const allOpen = packOrder.every((p) => prev.has(p));
                                return allOpen ? new Set() : new Set(packOrder);
                              });
                            }}
                            accessibilityRole="button"
                            accessibilityLabel="Toggle all packs"
                          >
                            <Text style={s.amgPackToolbarBtn}>
                              {packOrder.every((p) => amgExpandedPacks.has(p)) ? 'COLLAPSE ALL' : 'EXPAND ALL'}
                            </Text>
                          </Pressable>
                        </View>
                        {packOrder.map((pack) => {
                          const meta = packMeta(pack);
                          const parts = byPack[pack];
                          // Force-expand under any active filter so the
                          // player sees what they searched for / what
                          // they own without an extra tap.
                          const forceExpand = amgQuery.trim().length > 0 || amgOwnedOnly;
                          const isOpen = forceExpand || amgExpandedPacks.has(pack);
                          const ownedCount = parts.filter((p) => isAmgPartOwned(p.name)).length;
                          return (
                            <View key={pack} style={s.amgPackSection}>
                              <Pressable
                                onPress={() => {
                                  if (forceExpand) return; // can't manually toggle while filtered
                                  haptics.tap();
                                  setAmgExpandedPacks((prev) => {
                                    const next = new Set(prev);
                                    if (next.has(pack)) next.delete(pack);
                                    else next.add(pack);
                                    return next;
                                  });
                                }}
                                style={s.amgPackHeader}
                                accessibilityRole="button"
                                accessibilityLabel={`${meta.displayName} pack, ${ownedCount} of ${parts.length} owned`}
                                accessibilityState={{ expanded: isOpen }}
                              >
                                <Text style={s.amgPackChevron}>{isOpen ? '▾' : '▸'}</Text>
                                {getPackIcon(pack) ? (
                                  <Image
                                    source={getPackIcon(pack)!}
                                    style={s.amgPackIcon}
                                    resizeMode="contain"
                                    accessibilityIgnoresInvertColors
                                  />
                                ) : (
                                  <Text style={s.amgPackEmoji}>{meta.emoji}</Text>
                                )}
                                <Text style={s.amgPackName}>{meta.displayName}</Text>
                                <Text style={s.amgPackCounts}>
                                  {ownedCount}/{parts.length}
                                </Text>
                              </Pressable>
                              {isOpen && (
                                <View style={s.amgPackGrid}>
                                  {parts.map((p) => {
                                    const unlockedAt = amgPartUnlockedAt[p.name];
                                    const isNew = unlockedAt !== undefined
                                      && Date.now() - unlockedAt < 7 * 24 * 60 * 60 * 1000;
                                    return (
                                      <AmgPartCard
                                        key={p.name}
                                        partName={p.name}
                                        owned={isAmgPartOwned(p.name)}
                                        onBuy={handleBuy}
                                        onEquip={handleEquip}
                                        size="compact"
                                        isNew={isNew}
                                      />
                                    );
                                  })}
                                </View>
                              )}
                            </View>
                          );
                        })}
                      </>
                    )}
                  </>
                );
              })()
            ) : activeTab === 'pets' ? (
              <View style={s.grid}>
                {PETS.map((pet, i) => (
                  <PetCard
                    key={pet.id}
                    pet={pet}
                    isOwned={ownedPets.includes(pet.id)}
                    isEquipped={equippedPet === pet.id}
                    onPress={() => handlePetPress(pet)}
                    index={i}
                  />
                ))}
              </View>
            ) : activeTab === 'boxes' ? (
              <View style={s.boxList}>
                {LOOT_BOXES.map(box => {
                  const count = ownedBoxes.find(b => b.boxId === box.id)?.count || 0;
                  return (
                    <View key={box.id} style={s.boxItem}>
                      <Text style={s.boxItemIcon}>{box.icon}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={s.boxItemName}>{box.name}</Text>
                        <Text style={s.boxItemCount}>{'\u00D7'}{count} owned</Text>
                      </View>
                      {box.cost > 0 && <Text style={s.boxItemPrice}>{'\u{1FA99}'} {box.cost}</Text>}
                    </View>
                  );
                })}
              </View>
            ) : items.length > 0 ? (
              <View style={s.grid}>
                {items.map((item, i) => (
                  <ShopItemCard
                    key={item.id}
                    item={item}
                    isOwned={activeTab === 'outfits'
                      ? ownedOutfits.includes(item.id)
                      : category === 'emotes'
                      ? (ownedEmotes.includes(item.id) || item.price === 0)
                      : (owned[category]?.includes(item.id) ?? false)}
                    isEquipped={activeTab === 'outfits'
                      ? equippedOutfitId === item.id
                      : category === 'emotes'
                      ? equippedEmotes.includes(item.id)
                      : equipped[
                          category === 'boards' ? 'board'
                          : category === 'pieces' ? 'pieces'
                          : category === 'dropEffects' ? 'dropEffect'
                          : category === 'boardAccessories' ? 'boardAccessory'
                          : 'winAnimation'
                        ] === item.id}
                    onPress={() => activeTab === 'outfits'
                      ? handleOutfitPress(item)
                      : category === 'emotes'
                      ? handleEmotePress(item)
                      : handleItemPress(category as 'boards' | 'pieces' | 'dropEffects' | 'winAnimations' | 'boardAccessories', item)}
                    index={i}
                    playerCoins={coins}
                  />
                ))}
              </View>
            ) : (
              <Animated.View entering={FadeIn.duration(280)} style={s.comingSoon}>
                <Text style={s.comingSoonIcon}>{'\u{1F6A7}'}</Text>
                <Text style={s.comingSoonText}>No items match this filter</Text>
              </Animated.View>
            )}
          </View>
          </StaggeredEntry>

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
              {(() => {
                const featured = getDailyFeatured();
                return featured.deals.map((deal) => {
                  const isOutfit = deal.category === 'outfit';
                  const isOwned = isOutfit && ownedOutfits.includes(deal.item.id);
                  const iconByCategory: Record<string, string> = {
                    outfit: '\u{1F455}',
                    pet: '\u{1F436}',
                    emote: '\u{1F483}',
                  };
                  return (
                    <DailyDealCard
                      key={deal.item.id}
                      icon={iconByCategory[deal.category] ?? '\u2728'}
                      title={deal.item.name}
                      subtitle={`${deal.discountedPrice}🪙 (was ${deal.originalPrice})`}
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

          {/* ═══ 2. LOOT BAGS ═══ */}
          <StaggeredEntry index={3} delay={60}>
            <SectionHeader title="LOOT BAGS" gradientColors={['#8e44ad', '#9b59b6']} />
            <View style={s.bagsRow}>
              <LootBagCard
                tier="standard"
                icon={'\u{1F4E6}'}
                name="Standard"
                price="12 Gems"
                color={['rgba(39,174,61,0.2)', 'rgba(39,174,61,0.05)']}
                borderCol="rgba(39,174,61,0.4)"
                onPress={() => haptics.tap()}
              />
              <LootBagCard
                tier="premium"
                icon={'\u{1F381}'}
                name="Premium"
                price="30 Gems"
                color={['rgba(192,192,192,0.2)', 'rgba(192,192,192,0.05)']}
                borderCol="rgba(192,192,192,0.4)"
                onPress={() => haptics.tap()}
              />
              <LootBagCard
                tier="vip"
                icon={'\u2728'}
                name="VIP"
                price="60 Gems"
                color={['rgba(241,196,15,0.25)', 'rgba(241,196,15,0.05)']}
                borderCol="rgba(241,196,15,0.5)"
                onPress={() => haptics.tap()}
              />
            </View>
          </StaggeredEntry>

          {/* ═══ 3. COIN & GEM BUNDLES ═══ */}
          <StaggeredEntry index={4} delay={60}>
            <SectionHeader title="GET MORE COINS" gradientColors={['#d4ac0d', '#f1c40f']} />
            <View style={s.bundlesGrid}>
              <BundleCard icon={'\u{1FA99}'} amount="500" price="Free Daily" color={['rgba(39,174,61,0.25)', 'rgba(39,174,61,0.08)']} onPress={() => haptics.tap()} />
              <BundleCard icon={'\u{1FA99}'} amount="2,500" bonus="x2" price="$0.99" color={['rgba(255,209,102,0.2)', 'rgba(255,209,102,0.06)']} onPress={() => haptics.tap()} />
              <BundleCard icon={'\u{1FA99}'} amount="10,000" bonus="x2" price="$4.99" color={['rgba(255,209,102,0.25)', 'rgba(255,209,102,0.08)']} highlight onPress={() => haptics.tap()} />
              <BundleCard icon={'\u{1FA99}'} amount="50,000" bonus="BEST" price="$9.99" color={['rgba(255,140,0,0.3)', 'rgba(255,140,0,0.1)']} onPress={() => haptics.tap()} />
            </View>

            <SectionHeader title="GET MORE GEMS" gradientColors={['#1abc9c', '#2dd4ad']} />
            <View style={s.bundlesGrid}>
              <BundleCard icon={'\u{1F48E}'} amount="10" price="$0.99" color={['rgba(46,204,113,0.2)', 'rgba(46,204,113,0.06)']} onPress={() => haptics.tap()} />
              <BundleCard icon={'\u{1F48E}'} amount="50" bonus="x2" price="$4.99" color={['rgba(46,204,113,0.25)', 'rgba(46,204,113,0.08)']} onPress={() => haptics.tap()} />
              <BundleCard icon={'\u{1F48E}'} amount="150" bonus="x2" price="$9.99" color={['rgba(26,188,156,0.3)', 'rgba(26,188,156,0.08)']} highlight onPress={() => haptics.tap()} />
              <BundleCard icon={'\u{1F48E}'} amount="500" bonus="BEST" price="$19.99" color={['rgba(26,188,156,0.35)', 'rgba(26,188,156,0.12)']} onPress={() => haptics.tap()} />
            </View>
          </StaggeredEntry>

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
  title: {
    fontFamily: fonts.heading, fontWeight: weight.bold, fontSize: 28,
    color: '#ffffff', letterSpacing: 2,
  },
  equippedRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  equippedLabel: { fontFamily: fonts.body, fontWeight: weight.medium, fontSize: 11, color: colors.textSecondary },
  equippedDot: { fontFamily: fonts.body, fontSize: 8, color: colors.textMuted },
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
    width: '47%',
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
    gap: 3, paddingVertical: 9, paddingHorizontal: 9, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'transparent',
  },
  tabActive: { backgroundColor: 'rgba(255,140,0,0.15)', borderColor: 'rgba(255,140,0,0.4)' },
  tabIconImg: { width: 22, height: 22 },
  tabLabel: { fontFamily: fonts.body, fontWeight: weight.semibold, fontSize: 11, color: colors.textSecondary },
  tabLabelActive: { color: colors.orange },

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
  itemName: {
    fontFamily: fonts.body, fontWeight: weight.semibold, fontSize: 12, color: '#ffffff',
    textAlign: 'center', marginTop: 6, paddingHorizontal: 6,
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
  boxItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  boxItemIcon: { fontSize: 32 },
  boxItemName: { fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 14, color: '#ffffff' },
  boxItemCount: { fontFamily: fonts.body, fontWeight: weight.regular, fontSize: 11, color: colors.textSecondary },
  boxItemPrice: { fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 13, color: colors.coinGold },

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
