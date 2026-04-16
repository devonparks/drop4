import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, ScrollView, Pressable, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { PressScale, Shimmer, StaggeredEntry } from '../components/animations';
import { useShopStore } from '../stores/shopStore';
import { haptics } from '../services/haptics';
import { playSound } from '../services/audio';
import { BOARD_THEMES, PIECE_THEMES, DROP_EFFECTS, WIN_ANIMATIONS, BOARD_ACCESSORIES, EMOTES, RARITY_COLORS, RARITY_LABELS, ShopItem } from '../data/shopCatalog';
import { CosmeticPreviewModal } from '../components/ui/CosmeticPreviewModal';
import { AnimatedRarityBg } from '../components/effects/AnimatedRarityBg';

const EMOTE_IDS = new Set(EMOTES.map(e => e.id));
import { useLootBoxStore, LOOT_BOXES } from '../stores/lootBoxStore';
import { useChallengeStore } from '../stores/challengeStore';
import { PETS, Pet, PET_RARITY_COLORS, PET_RARITY_LABELS } from '../data/pets';
import { OUTFIT_SHOP_ITEMS, OUTFIT_COLLECTIONS, EMOTE_SHOP_ITEMS } from '../data/cosmeticsShopCatalog';
import { getDailyFeatured, formatRefreshCountdown } from '../data/shopRotation';
import { OUTFITS } from '../data/outfitRegistry';
import { useCharacterStore } from '../stores/characterStore';
import { OutfitPreviewModal } from '../components/ui/OutfitPreviewModal';
import { PETS as PETS_3D } from '../data/petRegistry';
import { DOG_IDLES } from '../data/animationRegistry';
import { Pet3D } from '../components/3d/Pet3D';
import { FEATURES } from '../config/features';
import { useCareerStore } from '../stores/careerStore';
import { BOARD_THEME_VISUALS } from '../data/boardThemeColors';
import { PremiumBoardThumbnail } from '../components/ui/PremiumBoardThumbnail';
// cache-bust marker
import { colors } from '../theme/colors';
import { fonts, weight } from '../theme/typography';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type ShopTab = 'outfits' | 'boards' | 'pieces' | 'effects' | 'wins' | 'accessories' | 'emotes' | 'pets' | 'boxes';

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
      <Text style={s.sectionHeaderText}>{title}</Text>
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
// Pack slug → emoji icon mapping for outfit card previews. Pure decoration;
// real 3D preview shows in the OutfitPreviewModal on tap.
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
      <Pressable
        onPress={onPress}
        style={[s.itemCard, isEquipped && { borderColor: colors.green, borderWidth: 2 }]}
        accessibilityRole="button"
        accessibilityLabel={`${item.name}, ${RARITY_LABELS[item.rarity]}${isEquipped ? ', equipped' : isOwned ? ', owned' : `, ${item.price.toLocaleString()} coins`}`}
        accessibilityState={{ selected: isEquipped, disabled: !isOwned && !canAfford && !isDarkMatter }}
      >
        <View style={[s.rarityStrip, { backgroundColor: rarityColor }]} />
        <View style={s.itemPreview}>
          {outfitMeta ? (
            // Outfit preview: rarity-tinted backdrop with a pack emoji +
            // large number overlay. 3D preview happens in the tap modal.
            <View style={{ width: 108, height: 64, borderRadius: 6, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: rarityColor + '22' }}>
              <LinearGradient
                colors={[rarityColor + '44', '#0a0e27', '#060914']}
                style={StyleSheet.absoluteFill}
              />
              <Text style={{ fontSize: 30, zIndex: 1 }}>{PACK_ICON[outfitMeta.pack] ?? '\u{1F455}'}</Text>
              <Text style={{
                position: 'absolute', top: 4, right: 6, zIndex: 2,
                fontFamily: fonts.heading, fontWeight: weight.black, fontSize: 10,
                color: rarityColor, letterSpacing: 0.5, opacity: 0.9,
              }}>
                {String(outfitMeta.index).padStart(2, '0')}
              </Text>
            </View>
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
        <Text style={[s.rarityLabel, { color: rarityColor }]}>{RARITY_LABELS[item.rarity]}</Text>
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
      </Pressable>
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

  // Map the 2D pet ID to a 3D registry entry when available (same ID scheme)
  const pet3D = (PETS_3D as any)[pet.id];

  return (
    <Animated.View entering={FadeInDown.delay(index * 60).springify()}>
      <Pressable
        onPress={onPress}
        style={[s.petCard, isEquipped && { borderColor: colors.green, borderWidth: 2 }]}
        accessibilityRole="button"
        accessibilityLabel={`${pet.name}, ${pet.breed}, ${PET_RARITY_LABELS[pet.rarity]}${isEquipped ? ', equipped' : isOwned ? ', owned' : isEarnOnly ? ', earn only' : `, ${pet.price.toLocaleString()} coins`}`}
        accessibilityState={{ selected: isEquipped }}
      >
        <View style={[s.rarityStrip, { backgroundColor: rarityColor }]} />
        <View style={s.petPreview}>
          {FEATURES.character3D && pet3D?.glb ? (
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
        <Text style={[s.rarityLabel, { color: rarityColor }]}>{PET_RARITY_LABELS[pet.rarity]}</Text>
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
      </Pressable>
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
  const equippedOutfitId = useCharacterStore(s => s.customization.outfitId);
  const unlockOutfit = useCharacterStore(s => s.unlockOutfit);
  const setEquippedOutfit = useCharacterStore(s => s.setOutfit);
  const unlockedSpecies = useCareerStore(s => s.unlockedSpecies);
  const ownedBoxes = useLootBoxStore(s => s.ownedBoxes);
  const lastShopCoinCollect = useShopStore(s2 => s2.lastShopCoinCollect);
  const collectDailyShopCoins = useShopStore(s2 => s2.collectDailyShopCoins);
  const [activeTab, setActiveTab] = useState<ShopTab>('boards');
  const [collectionFilter, setCollectionFilter] = useState<CollectionFilter | string>('All');
  const [outfitSpecies, setOutfitSpecies] = useState<'All' | 'human' | 'elves' | 'goblin' | 'skeleton' | 'zombie'>('All');
  const [outfitPreview, setOutfitPreview] = useState<ShopItem | null>(null);

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
      haptics.error();
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

  const handleOutfitBuy = () => {
    if (!outfitPreview) return;
    if (outfitPreview.price > 0 && !spendCoins(outfitPreview.price)) return;
    unlockOutfit(outfitPreview.id);
    setEquippedOutfit(outfitPreview.id as any);
    setOutfitPreview(null);
  };

  const handleOutfitEquip = () => {
    if (!outfitPreview) return;
    setEquippedOutfit(outfitPreview.id as any);
    setOutfitPreview(null);
  };

  const handleEmotePress = (item: ShopItem) => {
    if (item.rarity === 'darkmatter') { haptics.error(); return; }
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

    const success = purchaseEmote(item.id, item.price);
    if (success) {
      haptics.win();
      playSound('coin');
      equipEmote(item.id);
    } else {
      haptics.error();
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
    } else if (pet.price > 0) {
      const success = purchasePet(pet.id, pet.price);
      if (success) { haptics.win(); playSound('coin'); equipPet(pet.id); }
      else { haptics.error(); }
    }
  };

  const handleDailyCollect = () => {
    const collected = collectDailyShopCoins();
    if (collected) { haptics.win(); playSound('coin'); }
    else { haptics.error(); }
  };

  const tabs: { key: ShopTab; label: string; icon: string }[] = [
    { key: 'outfits', label: 'Outfits', icon: '\u{1F455}' },
    { key: 'boards', label: 'Boards', icon: '\u{1F3AF}' },
    { key: 'pieces', label: 'Pieces', icon: '\u{1F534}' },
    { key: 'effects', label: 'Effects', icon: '\u2728' },
    { key: 'wins', label: 'Wins', icon: '\u{1F3C6}' },
    { key: 'accessories', label: 'Frames', icon: '\u{1F5BC}' },
    { key: 'emotes', label: 'Emotes', icon: '\u{1F60E}' },
    { key: 'pets', label: 'Pets', icon: '\u{1F436}' },
    { key: 'boxes', label: 'Boxes', icon: '\u{1F381}' },
  ];

  const rawItems = activeTab === 'boards' ? BOARD_THEMES :
                   activeTab === 'pieces' ? PIECE_THEMES :
                   activeTab === 'effects' ? DROP_EFFECTS :
                   activeTab === 'wins' ? WIN_ANIMATIONS :
                   activeTab === 'accessories' ? BOARD_ACCESSORIES :
                   // Emotes tab now blends legacy 2D emotes with new 3D Mixamo
                   // clips. IDs are namespace-disjoint (`dab` vs `emote_dab`)
                   // so they coexist without collision.
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
    <ScreenBackground>
      <View style={[s.container, { paddingTop: insets.top + 12 }]}>
        {/* ── Header ── */}
        <View style={s.header}>
          <View>
            <Text style={s.title}>SHOP</Text>
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

        {/* ── Main scrollable content ── */}
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>

          {/* ═══ 1. ITEM SHOP — cosmetics first, they're the soul ═══ */}
          <View style={s.itemShopSection}>
            <SectionHeader title="ITEM SHOP" gradientColors={['#ff8c00', '#cc5500']} />

            {/* Category tabs (with right fade-edge to indicate scrollability) */}
            <View style={s.tabScrollWrap}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabRow}>
                {tabs.map(tab => (
                  <Pressable
                    key={tab.key}
                    onPress={() => { setActiveTab(tab.key); setCollectionFilter('All'); haptics.tap(); }}
                    style={[s.tab, activeTab === tab.key && s.tabActive]}
                    accessibilityRole="tab"
                    accessibilityLabel={`${tab.label} tab`}
                    accessibilityState={{ selected: activeTab === tab.key }}
                  >
                    <Text style={s.tabIcon}>{tab.icon}</Text>
                    <Text style={[s.tabLabel, activeTab === tab.key && s.tabLabelActive]}>{tab.label}</Text>
                  </Pressable>
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
                      <Pressable
                        key={sp.id}
                        onPress={() => {
                          if (isLocked) { haptics.error(); return; }
                          setOutfitSpecies(sp.id as any);
                          setCollectionFilter('All');
                          haptics.tap();
                        }}
                        style={[
                          s.collectionPill,
                          outfitSpecies === sp.id && s.collectionPillActive,
                          isLocked && { opacity: 0.45 },
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={isLocked ? `${sp.label} species (locked)` : `Filter outfits by ${sp.label}`}
                        accessibilityState={{ selected: outfitSpecies === sp.id, disabled: isLocked }}
                      >
                        <Text style={[s.collectionPillText, outfitSpecies === sp.id && s.collectionPillTextActive]}>
                          {isLocked ? '\u{1F512} ' : sp.icon + ' '}{sp.label}
                        </Text>
                      </Pressable>
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
                    <Pressable
                      key={cf}
                      onPress={() => { setCollectionFilter(cf); haptics.tap(); }}
                      style={[s.collectionPill, collectionFilter === cf && s.collectionPillActive]}
                      accessibilityRole="button"
                      accessibilityLabel={`Filter by ${cf}`}
                      accessibilityState={{ selected: collectionFilter === cf }}
                    >
                      <Text style={[s.collectionPillText, collectionFilter === cf && s.collectionPillTextActive]}>{cf}</Text>
                    </Pressable>
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
            {activeTab === 'pets' ? (
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

          {/* ═══ 2. DAILY DEALS ═══ */}
          <Animated.View entering={FadeInUp.delay(100).springify()}>
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
          </Animated.View>

          {/* ═══ 2. LOOT BAGS ═══ */}
          <Animated.View entering={FadeInUp.delay(200).springify()}>
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
          </Animated.View>

          {/* ═══ 3. COIN & GEM BUNDLES ═══ */}
          <Animated.View entering={FadeInUp.delay(300).springify()}>
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
          </Animated.View>

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
  tabIcon: { fontSize: 13 },
  tabLabel: { fontFamily: fonts.body, fontWeight: weight.semibold, fontSize: 11, color: colors.textSecondary },
  tabLabelActive: { color: colors.orange },

  collectionRow: { paddingHorizontal: 16, gap: 6, marginBottom: 10 },
  collectionPill: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.03)',
  },
  collectionPillActive: { borderColor: 'rgba(255,140,0,0.5)', backgroundColor: 'rgba(255,140,0,0.1)' },
  collectionPillText: { fontFamily: fonts.body, fontWeight: weight.semibold, fontSize: 11, color: colors.textSecondary },
  collectionPillTextActive: { color: colors.orange },

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
  miniPiece: {
    width: 30, height: 30, borderRadius: 15,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 3, elevation: 3,
  },
  boardPreviewGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, width: 60, justifyContent: 'center' },
  miniHole: { width: 12, height: 12, borderRadius: 6, backgroundColor: 'rgba(0,0,0,0.4)' },
  boardPreviewFrame: {
    width: 54, height: 54, borderRadius: 8, borderWidth: 1.5,
    flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center',
    gap: 3, padding: 5,
  },
  boardPreviewHole: {
    width: 12, height: 12, borderRadius: 6, borderWidth: 1,
  },
  itemName: {
    fontFamily: fonts.body, fontWeight: weight.semibold, fontSize: 12, color: '#ffffff',
    textAlign: 'center', marginTop: 6, paddingHorizontal: 6,
  },
  rarityLabel: {
    fontFamily: fonts.body, fontWeight: weight.medium, fontSize: 9, textAlign: 'center',
    textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2,
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

  loadingWrap: { alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  loadingText: { fontFamily: fonts.body, fontWeight: weight.medium, fontSize: 15, color: colors.textSecondary },
  comingSoon: { alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  comingSoonIcon: { fontSize: 48, marginBottom: 12 },
  comingSoonText: { fontFamily: fonts.heading, fontWeight: weight.bold, fontSize: 22, color: colors.textSecondary },
});
