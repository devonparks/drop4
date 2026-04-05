import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Dimensions, Animated as RNAnimated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { SlideInDown, FadeInUp, ZoomIn } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { TopBar } from '../components/ui/TopBar';
import { GlossyButton } from '../components/ui/GlossyButton';
import { useLootBoxStore, LOOT_BOXES, LootBoxItem, LootBox } from '../stores/lootBoxStore';
import { useShopStore } from '../stores/shopStore';
import { haptics } from '../services/haptics';
import { playSound } from '../services/audio';
import { colors } from '../theme/colors';
import { fonts, weight } from '../theme/typography';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const RARITY_COLORS: Record<string, string> = {
  common: '#8892b0',
  rare: '#3498db',
  epic: '#9b59b6',
  legendary: '#f1c40f',
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
};

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
    RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
        RNAnimated.timing(pulseAnim, { toValue: 0.3, duration: 1200, useNativeDriver: true }),
      ])
    ).start();
    // Float
    RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(floatAnim, { toValue: -8, duration: 1500, useNativeDriver: true }),
        RNAnimated.timing(floatAnim, { toValue: 8, duration: 1500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const handleTap = () => {
    haptics.tap();
    setTapCount(prev => {
      const next = prev + 1;
      if (next >= 3) {
        haptics.heavy();
        onReveal();
      }
      return next;
    });
  };

  return (
    <Pressable style={st.openingOverlay} onPress={handleTap}>
      <LinearGradient
        colors={['#0a0e27', '#111b47', '#0a0e27']}
        style={st.openingBg}
      >
        {/* Halftone dot pattern overlay */}
        <View style={st.halftoneOverlay} />

        {/* Back button */}
        <Pressable style={st.openingBack} onPress={onCancel}>
          <Text style={st.openingBackText}>{'\u2190'} Back</Text>
        </Pressable>

        {/* Open your bag header */}
        <Animated.View entering={FadeInUp.delay(200).springify()} style={st.openingHeader}>
          <Text style={st.openingTitle}>Open your bag!</Text>
          <Text style={st.openingArrow}>{'\u25BC'}</Text>
        </Animated.View>

        {/* Tap progress dots */}
        <View style={st.tapProgress}>
          {[0, 1, 2].map(i => (
            <View key={i} style={[st.tapDot, tapCount > i && { backgroundColor: tier.tagColor, shadowColor: tier.tagColor }]} />
          ))}
        </View>

        {/* The box/bag */}
        <RNAnimated.View style={[st.openingBoxWrap, { transform: [{ translateY: floatAnim }] }]}>
          <RNAnimated.View style={[st.openingGlow, {
            opacity: pulseAnim,
            backgroundColor: tier.glow,
            shadowColor: tier.tagColor,
          }]} />
          <View style={[st.openingBox, { borderColor: tier.border }]}>
            <LinearGradient colors={tier.gradient as any} style={st.openingBoxInner}>
              <Text style={st.openingBoxIcon}>{tier.icon}</Text>
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
function ItemRevealScreen({ item, onContinue }: { item: LootBoxItem; onContinue: () => void }) {
  const rarityColor = RARITY_COLORS[item.rarity];

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

          {/* Rarity banner */}
          <View style={[st.revealRarityBanner, { backgroundColor: `${rarityColor}30`, borderColor: `${rarityColor}50` }]}>
            <Text style={[st.revealRarityText, { color: rarityColor }]}>{item.rarity.toUpperCase()}</Text>
          </View>

          <Text style={st.revealIcon}>{item.icon}</Text>
          <Text style={[st.revealName, { color: rarityColor }]}>{item.name}</Text>
          <Text style={st.revealType}>{item.type}</Text>

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
function BoxCard({ box, count, isOpening, onOpen, index }: {
  box: LootBox; count: number; isOpening: boolean; onOpen: () => void; index: number;
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
            {/* Box icon area */}
            <View style={[st.boxIconArea, { borderColor: tier.border }]}>
              <Text style={st.boxCardIcon}>{tier.icon}</Text>
            </View>

            {/* Info */}
            <View style={st.boxCardInfo}>
              <Text style={st.boxCardName}>{box.name}</Text>
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
                <Pressable onPress={onOpen} disabled={isOpening}>
                  <LinearGradient colors={['#27ae3d', '#1e8a30']} style={st.openBtnGradient}>
                    <Text style={st.openBtnText}>OPEN</Text>
                  </LinearGradient>
                </Pressable>
              ) : (
                <View style={st.emptyWrap}>
                  <Text style={st.emptyText}>Empty</Text>
                </View>
              )}
              {box.cost > 0 && (
                <Text style={st.buyPrice}>{'\u{1FA99}'} {box.cost.toLocaleString()}</Text>
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
  const { openBox, getBoxCount } = useLootBoxStore();
  const coins = useShopStore(s => s.coins);
  const gems = useShopStore(s => s.gems);
  const level = useShopStore(s => s.level);
  const addCoins = useShopStore(s => s.addCoins);
  const addGems = useShopStore(s => s.addGems);
  const purchaseItem = useShopStore(s => s.purchaseItem);
  const [revealedItem, setRevealedItem] = useState<LootBoxItem | null>(null);
  const [isOpening, setIsOpening] = useState(false);
  const [openingBox, setOpeningBox] = useState<LootBox | null>(null);

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

    const item = openBox(openingBox.id);
    if (item) {
      setRevealedItem(item);
      haptics.win();
      playSound('win');
      if (item.type === 'coins' && item.value) addCoins(item.value);
      if (item.type === 'gems' && item.value) addGems(item.value);
      if (item.type === 'board') purchaseItem('boards', item.id.replace('board_', ''), 0);
      if (item.type === 'pieces') purchaseItem('pieces', item.id.replace('pieces_', ''), 0);
    }
    setOpeningBox(null);
    setIsOpening(false);
  };

  const handleCancelOpen = () => {
    setOpeningBox(null);
  };

  // Full-screen opening sequence
  if (openingBox) {
    return <BoxOpeningScreen box={openingBox} onReveal={handleReveal} onCancel={handleCancelOpen} />;
  }

  // Item reveal screen
  if (revealedItem) {
    return <ItemRevealScreen item={revealedItem} onContinue={() => setRevealedItem(null)} />;
  }

  return (
    <ScreenBackground>
      <TopBar coins={coins} gems={gems} level={level} showBack onBackPress={() => navigation.goBack()} />
      <View style={st.container}>
        {/* Header */}
        <Animated.View entering={FadeInUp.springify()} style={st.headerWrap}>
          <LinearGradient colors={['#8e44ad', '#9b59b6']} style={st.headerBanner}>
            <Text style={st.title}>LOOT BOXES</Text>
            <Text style={st.subtitle}>Open boxes to win cosmetics and coins</Text>
          </LinearGradient>
        </Animated.View>

        <ScrollView contentContainerStyle={st.boxList} showsVerticalScrollIndicator={false}>
          {LOOT_BOXES.map((box, index) => {
            const count = getBoxCount(box.id);
            return (
              <BoxCard
                key={box.id}
                box={box}
                count={count}
                isOpening={isOpening}
                onOpen={() => handleStartOpen(box)}
                index={index}
              />
            );
          })}

          {/* Drop rates transparency */}
          <Animated.View entering={FadeInUp.delay(400).springify()}>
            <View style={st.ratesSection}>
              <LinearGradient colors={['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.02)']} style={st.ratesGradient}>
                <Text style={st.ratesTitle}>DROP RATES</Text>
                <View style={st.ratesGrid}>
                  {[
                    { label: 'Common', pct: '60%', color: RARITY_COLORS.common },
                    { label: 'Rare', pct: '25%', color: RARITY_COLORS.rare },
                    { label: 'Epic', pct: '10%', color: RARITY_COLORS.epic },
                    { label: 'Legendary', pct: '5%', color: RARITY_COLORS.legendary },
                  ].map((rate, i) => (
                    <View key={i} style={st.rateRow}>
                      <View style={[st.rateDot, { backgroundColor: rate.color, shadowColor: rate.color }]} />
                      <Text style={[st.rateLabel, { color: rate.color }]}>{rate.label}</Text>
                      <Text style={st.ratePct}>{rate.pct}</Text>
                    </View>
                  ))}
                </View>
                <Text style={st.ratesNote}>Better boxes have higher epic & legendary chances</Text>
              </LinearGradient>
            </View>
          </Animated.View>
        </ScrollView>
      </View>
    </ScreenBackground>
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
    textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3,
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
  boxCardIcon: { fontSize: 36 },
  boxCardInfo: { flex: 1, gap: 4 },
  boxCardName: {
    fontFamily: fonts.heading, fontWeight: weight.bold, fontSize: 18, color: '#ffffff',
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
    shadowColor: '#27ae3d', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5, shadowRadius: 8, elevation: 6,
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
  buyPrice: { fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 11, color: colors.coinGold, marginTop: 2 },

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
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 4, elevation: 2,
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
    textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 3 }, textShadowRadius: 8,
  },
  openingArrow: {
    fontSize: 28, color: 'rgba(255,255,255,0.5)', marginTop: 8,
  },
  tapProgress: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  tapDot: {
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 6, elevation: 4,
  },
  openingBoxWrap: { alignItems: 'center', position: 'relative' },
  openingGlow: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    top: -20, alignSelf: 'center',
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 40, elevation: 12,
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
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 6, elevation: 4,
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
  revealRarityText: {
    fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 12,
    letterSpacing: 2,
  },
  revealIcon: { fontSize: 72, marginBottom: 12 },
  revealName: { fontFamily: fonts.heading, fontWeight: weight.bold, fontSize: 24 },
  revealType: {
    fontFamily: fonts.body, fontWeight: weight.regular, fontSize: 12,
    color: colors.textSecondary, marginTop: 4, textTransform: 'uppercase',
  },
  shineLine: {
    position: 'absolute', top: 0, left: -20, right: -20, height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    transform: [{ rotate: '-5deg' }],
  },
});
