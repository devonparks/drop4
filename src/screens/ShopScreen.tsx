import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, ScrollView, Pressable, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { useShopStore } from '../stores/shopStore';
import { haptics } from '../services/haptics';
import { playSound } from '../services/audio';
import { BOARD_THEMES, PIECE_THEMES, DROP_EFFECTS, WIN_ANIMATIONS, BOARD_ACCESSORIES, EMOTES, RARITY_COLORS, RARITY_LABELS, ShopItem } from '../data/shopCatalog';

const EMOTE_IDS = new Set(EMOTES.map(e => e.id));
import { useLootBoxStore, LOOT_BOXES } from '../stores/lootBoxStore';
import { useChallengeStore } from '../stores/challengeStore';
import { PETS, Pet, PET_RARITY_COLORS, PET_RARITY_LABELS } from '../data/pets';
import { BOARD_THEME_VISUALS } from '../data/boardThemeColors';
import { colors } from '../theme/colors';
import { fonts, weight } from '../theme/typography';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type ShopTab = 'boards' | 'pieces' | 'effects' | 'wins' | 'accessories' | 'emotes' | 'pets' | 'boxes';

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
function DailyDealCard({ icon, title, subtitle, buttonLabel, buttonColor, badge, onPress }: {
  icon: string; title: string; subtitle: string; buttonLabel: string;
  buttonColor: [string, string]; badge?: string; onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={s.dealCard}>
      <LinearGradient colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)']} style={s.dealCardInner}>
        {badge && (
          <View style={s.dealBadge}>
            <Text style={s.dealBadgeText}>{badge}</Text>
          </View>
        )}
        <Text style={s.dealIcon}>{icon}</Text>
        <Text style={s.dealTitle} numberOfLines={1}>{title}</Text>
        <Text style={s.dealSub} numberOfLines={1}>{subtitle}</Text>
        <LinearGradient colors={buttonColor} style={s.dealBtn}>
          <Text style={s.dealBtnText}>{buttonLabel}</Text>
        </LinearGradient>
      </LinearGradient>
    </Pressable>
  );
}

// ─── Loot Bag Card ─────────────────────────────────────────────
function LootBagCard({ tier, icon, name, price, color, borderCol, onPress }: {
  tier: string; icon: string; name: string; price: string;
  color: [string, string]; borderCol: string; onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[s.bagCard, { borderColor: borderCol }]}>
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
    </Pressable>
  );
}

// ─── Bundle Card ───────────────────────────────────────────────
function BundleCard({ icon, amount, bonus, price, color, onPress }: {
  icon: string; amount: string; bonus?: string; price: string;
  color: [string, string]; onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={s.bundleCard}>
      <LinearGradient colors={color} style={s.bundleInner}>
        {bonus && (
          <View style={s.bundleBadge}>
            <Text style={s.bundleBadgeText}>{bonus}</Text>
          </View>
        )}
        <Text style={s.bundleIcon}>{icon}</Text>
        <Text style={s.bundleAmount}>{amount}</Text>
      </LinearGradient>
      <View style={s.bundlePriceRow}>
        <Text style={s.bundlePrice}>{price}</Text>
      </View>
    </Pressable>
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

// ─── Shop Item Card (existing, improved) ───────────────────────
function ShopItemCard({ item, isOwned, isEquipped, onPress, index, playerCoins }: {
  item: ShopItem; isOwned: boolean; isEquipped: boolean; onPress: () => void; index: number; playerCoins: number;
}) {
  const rarityColor = RARITY_COLORS[item.rarity];
  const isDarkMatter = item.rarity === 'darkmatter';
  const canAfford = playerCoins >= item.price;
  const coinsNeeded = item.price - playerCoins;
  // Average ~50 coins per game (medium difficulty)
  const gamesNeeded = Math.ceil(coinsNeeded / 50);
  const unlockReq = UNLOCK_REQUIREMENTS[item.id];

  return (
    <Animated.View entering={FadeInDown.delay(index * 60).springify()}>
      <Pressable
        onPress={onPress}
        style={[s.itemCard, isEquipped && { borderColor: colors.green, borderWidth: 2 }]}
      >
        <View style={[s.rarityStrip, { backgroundColor: rarityColor }]} />
        <View style={[s.itemPreview, { backgroundColor: item.preview.boardColor || colors.surface }]}>
          {item.preview.p1Color && item.preview.p2Color ? (
            <View style={s.piecePreviewRow}>
              <View style={[s.miniPiece, { backgroundColor: item.preview.p1Color }]} />
              <View style={[s.miniPiece, { backgroundColor: item.preview.p2Color }]} />
            </View>
          ) : (() => {
            const tv = BOARD_THEME_VISUALS[item.id];
            const frameColor = tv?.frameGradient?.[0] || item.preview.boardColor || colors.surface;
            const holeColor = tv?.holeColor || 'rgba(0,0,0,0.4)';
            const holeBorder = tv?.holeBorder || 'rgba(0,0,0,0.2)';
            const frameBorder = tv?.frameBorder || 'rgba(255,255,255,0.1)';
            return (
              <View style={[s.boardPreviewFrame, { backgroundColor: frameColor, borderColor: frameBorder }]}>
                {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                  <View key={i} style={[s.boardPreviewHole, { backgroundColor: holeColor, borderColor: holeBorder }]} />
                ))}
              </View>
            );
          })()}
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

  return (
    <Animated.View entering={FadeInDown.delay(index * 60).springify()}>
      <Pressable
        onPress={onPress}
        style={[s.petCard, isEquipped && { borderColor: colors.green, borderWidth: 2 }]}
      >
        <View style={[s.rarityStrip, { backgroundColor: rarityColor }]} />
        <View style={s.petPreview}>
          <Image source={pet.idleImage} style={s.petPreviewImage} resizeMode="contain" />
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
  const ownedBoxes = useLootBoxStore(s => s.ownedBoxes);
  const lastShopCoinCollect = useShopStore(s2 => s2.lastShopCoinCollect);
  const collectDailyShopCoins = useShopStore(s2 => s2.collectDailyShopCoins);
  const [activeTab, setActiveTab] = useState<ShopTab>('boards');
  const [collectionFilter, setCollectionFilter] = useState<CollectionFilter>('All');

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

  const handleItemPress = (category: 'boards' | 'pieces' | 'dropEffects' | 'winAnimations' | 'boardAccessories', item: ShopItem) => {
    const equipKey = category === 'boards' ? 'board'
      : category === 'pieces' ? 'pieces'
      : category === 'dropEffects' ? 'dropEffect'
      : category === 'boardAccessories' ? 'boardAccessory'
      : 'winAnimation';
    if (equipped[equipKey] === item.id) return;
    if (owned[category].includes(item.id)) {
      equipItem(equipKey, item.id);
      haptics.select();
    } else if (item.rarity !== 'darkmatter' && !(item.price === 0 && item.rarity === 'mythic')) {
      const success = purchaseItem(category, item.id, item.price);
      if (success) { haptics.win(); playSound('coin'); equipItem(equipKey, item.id); }
      else { haptics.error(); }
    }
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
                   activeTab === 'emotes' ? EMOTES : [];

  const items = collectionFilter === 'All' ? rawItems : rawItems.filter(item => item.collection === collectionFilter);
  const collectionFilters: CollectionFilter[] = ['All', 'OG Collection', 'Season 0', 'Neon Pack', 'Mythic Collection'];

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
            <View style={s.coinDisplay}>
              <Text style={s.coinEmoji}>{'\u{1FA99}'}</Text>
              <Text style={s.coinValue}>{coins.toLocaleString()}</Text>
            </View>
            <View style={s.gemDisplay}>
              <Text style={s.gemEmoji}>{'\u{1F48E}'}</Text>
              <Text style={s.gemValue}>{(gems || 0).toLocaleString()}</Text>
            </View>
          </View>
        </View>

        {/* ── Main scrollable content ── */}
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>

          {/* ═══ 1. DAILY DEALS ═══ */}
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
              <DailyDealCard
                icon={'\u2728'}
                title="Featured"
                subtitle="50% OFF!"
                buttonLabel="VIEW"
                buttonColor={['#9b59b6', '#7d4192']}
                badge="-50%"
                onPress={() => haptics.tap()}
              />
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
              <BundleCard icon={'\u{1FA99}'} amount="500" price="Free Daily" color={['rgba(39,174,61,0.2)', 'rgba(39,174,61,0.05)']} onPress={() => haptics.tap()} />
              <BundleCard icon={'\u{1FA99}'} amount="2,500" bonus="x2" price="$0.99" color={['rgba(255,209,102,0.15)', 'rgba(255,209,102,0.03)']} onPress={() => haptics.tap()} />
              <BundleCard icon={'\u{1FA99}'} amount="10,000" bonus="x2" price="$4.99" color={['rgba(255,209,102,0.2)', 'rgba(255,209,102,0.05)']} onPress={() => haptics.tap()} />
              <BundleCard icon={'\u{1FA99}'} amount="50,000" bonus="BEST" price="$9.99" color={['rgba(255,140,0,0.25)', 'rgba(255,140,0,0.05)']} onPress={() => haptics.tap()} />
            </View>

            <SectionHeader title="GET MORE GEMS" gradientColors={['#1abc9c', '#2dd4ad']} />
            <View style={s.bundlesGrid}>
              <BundleCard icon={'\u{1F48E}'} amount="10" price="$0.99" color={['rgba(46,204,113,0.15)', 'rgba(46,204,113,0.03)']} onPress={() => haptics.tap()} />
              <BundleCard icon={'\u{1F48E}'} amount="50" bonus="x2" price="$4.99" color={['rgba(46,204,113,0.2)', 'rgba(46,204,113,0.05)']} onPress={() => haptics.tap()} />
              <BundleCard icon={'\u{1F48E}'} amount="150" bonus="x2" price="$9.99" color={['rgba(46,204,113,0.25)', 'rgba(46,204,113,0.05)']} onPress={() => haptics.tap()} />
              <BundleCard icon={'\u{1F48E}'} amount="500" bonus="BEST" price="$19.99" color={['rgba(26,188,156,0.3)', 'rgba(26,188,156,0.05)']} onPress={() => haptics.tap()} />
            </View>
          </Animated.View>

          {/* ═══ 4. ITEM SHOP ═══ */}
          <View style={s.itemShopSection}>
            <SectionHeader title="ITEM SHOP" gradientColors={['#ff8c00', '#cc5500']} />

            {/* Category tabs */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabRow}>
              {tabs.map(tab => (
                <Pressable
                  key={tab.key}
                  onPress={() => { setActiveTab(tab.key); haptics.tap(); }}
                  style={[s.tab, activeTab === tab.key && s.tabActive]}
                >
                  <Text style={s.tabIcon}>{tab.icon}</Text>
                  <Text style={[s.tabLabel, activeTab === tab.key && s.tabLabelActive]}>{tab.label}</Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* Collection filters */}
            {activeTab !== 'boxes' && activeTab !== 'pets' && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.collectionRow}>
                {collectionFilters.map(cf => (
                  <Pressable
                    key={cf}
                    onPress={() => { setCollectionFilter(cf); haptics.tap(); }}
                    style={[s.collectionPill, collectionFilter === cf && s.collectionPillActive]}
                  >
                    <Text style={[s.collectionPillText, collectionFilter === cf && s.collectionPillTextActive]}>{cf}</Text>
                  </Pressable>
                ))}
              </ScrollView>
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
                    isOwned={category === 'emotes'
                      ? (ownedEmotes.includes(item.id) || item.price === 0)
                      : (owned[category]?.includes(item.id) ?? false)}
                    isEquipped={category === 'emotes'
                      ? equippedEmotes.includes(item.id)
                      : equipped[
                          category === 'boards' ? 'board'
                          : category === 'pieces' ? 'pieces'
                          : category === 'dropEffects' ? 'dropEffect'
                          : category === 'boardAccessories' ? 'boardAccessory'
                          : 'winAnimation'
                        ] === item.id}
                    onPress={() => category === 'emotes'
                      ? handleEmotePress(item)
                      : handleItemPress(category as 'boards' | 'pieces' | 'dropEffects' | 'winAnimations' | 'boardAccessories', item)}
                    index={i}
                    playerCoins={coins}
                  />
                ))}
              </View>
            ) : rawItems.length === 0 ? (
              <View style={s.loadingWrap}><Text style={s.loadingText}>Loading...</Text></View>
            ) : (
              <View style={s.comingSoon}>
                <Text style={s.comingSoonIcon}>{'\u{1F6A7}'}</Text>
                <Text style={s.comingSoonText}>No items match this filter</Text>
              </View>
            )}
          </View>
        </ScrollView>
      </View>
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
    borderRadius: 14, overflow: 'hidden',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.1)',
  },
  dealCardInner: {
    alignItems: 'center', paddingVertical: 12, paddingHorizontal: 6,
    borderRadius: 14, gap: 4,
  },
  dealBadge: {
    position: 'absolute', top: 6, right: 6,
    backgroundColor: '#e74c3c', borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  dealBadgeText: { fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 8, color: '#fff', letterSpacing: 0.5 },
  dealIcon: { fontSize: 28, marginBottom: 2 },
  dealTitle: { fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 11, color: '#ffffff', textAlign: 'center' },
  dealSub: { fontFamily: fonts.body, fontWeight: weight.medium, fontSize: 9, color: colors.textSecondary, textAlign: 'center' },
  dealBtn: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 5, marginTop: 4 },
  dealBtnText: { fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 10, color: '#ffffff', letterSpacing: 0.5 },

  // ── Loot Bags ──
  bagsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 10 },
  bagCard: {
    flex: 1, borderRadius: 14, overflow: 'hidden',
    borderWidth: 1.5,
  },
  bagCardInner: {
    alignItems: 'center', paddingVertical: 14, paddingHorizontal: 6, gap: 4, borderRadius: 14,
  },
  bagIconWrap: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center',
  },
  bagIcon: { fontSize: 28 },
  bagName: { fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 13, color: '#ffffff', marginTop: 2 },
  bagPrice: { fontFamily: fonts.body, fontWeight: weight.semibold, fontSize: 10, color: colors.textSecondary },
  bagOpenBtn: { borderRadius: 10, paddingHorizontal: 18, paddingVertical: 6, marginTop: 6 },
  bagOpenText: { fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 11, color: '#ffffff', letterSpacing: 1 },

  // ── Bundles ──
  bundlesGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 10 },
  bundleCard: {
    width: (SCREEN_WIDTH - 62) / 4, minWidth: 75,
    borderRadius: 14, overflow: 'hidden',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.08)',
  },
  bundleInner: {
    alignItems: 'center', paddingVertical: 12, paddingHorizontal: 4, borderRadius: 14,
    position: 'relative',
  },
  bundleBadge: {
    position: 'absolute', top: -1, right: -1,
    backgroundColor: '#e74c3c', borderBottomLeftRadius: 8, borderTopRightRadius: 12,
    paddingHorizontal: 5, paddingVertical: 2,
  },
  bundleBadgeText: { fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 7, color: '#fff', letterSpacing: 0.5 },
  bundleIcon: { fontSize: 24 },
  bundleAmount: { fontFamily: fonts.heading, fontWeight: weight.bold, fontSize: 14, color: '#ffffff', marginTop: 2 },
  bundlePriceRow: {
    backgroundColor: 'rgba(0,0,0,0.3)', paddingVertical: 5, alignItems: 'center',
  },
  bundlePrice: { fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 10, color: colors.textSecondary },

  // ── Item Shop ──
  itemShopSection: { marginTop: 8 },
  tabRow: {
    flexDirection: 'row', paddingHorizontal: 16, gap: 6, marginBottom: 12,
  },
  tab: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'transparent',
  },
  tabActive: { backgroundColor: 'rgba(255,140,0,0.15)', borderColor: 'rgba(255,140,0,0.4)' },
  tabIcon: { fontSize: 14 },
  tabLabel: { fontFamily: fonts.body, fontWeight: weight.semibold, fontSize: 12, color: colors.textSecondary },
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
    borderWidth: 1, borderColor: colors.surfaceBorder, paddingBottom: 10,
  },
  rarityStrip: { height: 3, width: '100%' },
  itemPreview: { width: '100%', height: 64, alignItems: 'center', justifyContent: 'center' },
  piecePreviewRow: { flexDirection: 'row', gap: 10 },
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
    fontSize: 8,
    color: '#e74c3c',
    textAlign: 'center',
    marginTop: 2,
    lineHeight: 11,
    opacity: 0.85,
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
