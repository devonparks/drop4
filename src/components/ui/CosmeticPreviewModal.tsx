import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { PremiumBoardThumbnail } from './PremiumBoardThumbnail';
import { ShopItem, RARITY_COLORS, RARITY_LABELS } from '../../data/shopCatalog';
import { BOARD_THEME_VISUALS, BoardThemeVisuals } from '../../data/boardThemeColors';
import { PIECE_SKIN_VISUALS, PieceSkinVisuals } from '../../data/pieceSkinColors';
import { useShopStore } from '../../stores/shopStore';
import { AnimatedRarityBg } from '../effects/AnimatedRarityBg';
import { PressScale, Shimmer } from '../animations';
import { haptics } from '../../services/haptics';
import { colors } from '../../theme/colors';
import { fonts, weight } from '../../theme/typography';

// Effect preview config (duplicated from ShopScreen for standalone use)
const EFFECT_ICONS: Record<string, { icon: string; bg: [string, string]; accent: string }> = {
  sparks: { icon: '✨', bg: ['#2a1800', '#1a0e00'], accent: '#f4a623' },
  smoke: { icon: '💨', bg: ['#1a1a22', '#0e0e14'], accent: '#8892b0' },
  splash: { icon: '💧', bg: ['#001a2e', '#000e1a'], accent: '#3498db' },
  lightning: { icon: '⚡', bg: ['#1a1a00', '#0e0e00'], accent: '#f1c40f' },
  confetti: { icon: '🎊', bg: ['#1a0022', '#0e0014'], accent: '#e84393' },
  shockwave: { icon: '💥', bg: ['#001a1a', '#000e0e'], accent: '#1abc9c' },
  fireball: { icon: '🔥', bg: ['#2a0800', '#1a0400'], accent: '#e74c3c' },
  portal: { icon: '🌀', bg: ['#0a001a', '#06000e'], accent: '#9b59b6' },
  plasma: { icon: '⚡', bg: ['#001a2a', '#000e1a'], accent: '#00d4ff' },
  fireworks: { icon: '🎆', bg: ['#0a0a1e', '#06061a'], accent: '#f39c12' },
  lightning_strike: { icon: '⚡', bg: ['#1a1a00', '#0e0e00'], accent: '#f1c40f' },
  gold_rain: { icon: '🪙', bg: ['#1a1400', '#0e0a00'], accent: '#ffd700' },
  nuke: { icon: '☢️', bg: ['#1a0000', '#0e0000'], accent: '#e74c3c' },
  meteor: { icon: '☄️', bg: ['#1a0800', '#0e0400'], accent: '#ff6b35' },
  black_hole: { icon: '🕳️', bg: ['#0a001a', '#06000e'], accent: '#9b59b6' },
  flames: { icon: '🔥', bg: ['#2a0800', '#1a0400'], accent: '#e74c3c' },
  vines: { icon: '🌿', bg: ['#001a0a', '#000e06'], accent: '#2ecc71' },
  chains: { icon: '⛓️', bg: ['#1a1400', '#0e0a00'], accent: '#ffd700' },
  circuit: { icon: '🔌', bg: ['#001a2a', '#000e1a'], accent: '#00d4ff' },
  darkmatter_drop: { icon: '🕳️', bg: ['#1a0020', '#0e0014'], accent: '#e94560' },
  darkmatter_trail: { icon: '💫', bg: ['#1a0020', '#0e0014'], accent: '#e94560' },
  darkmatter_win: { icon: '👁️', bg: ['#1a0020', '#0e0014'], accent: '#e94560' },
  darkmatter_frame: { icon: '🕳️', bg: ['#1a0020', '#0e0014'], accent: '#e94560' },
};

type Category = 'boards' | 'pieces' | 'dropEffects' | 'winAnimations' | 'boardAccessories' | 'emotes';

interface Props {
  visible: boolean;
  item: ShopItem | null;
  category: Category;
  isOwned: boolean;
  isEquipped: boolean;
  canAfford: boolean;
  onBuy: () => void;
  onEquip: () => void;
  onClose: () => void;
}

// A sample board state for the preview — looks like a real mid-game
// 0=empty, 1=player1, 2=player2
const SAMPLE_BOARD: number[][] = [
  [0, 0, 0, 0, 0, 0],  // col 0
  [0, 0, 0, 0, 2, 1],  // col 1
  [0, 0, 0, 1, 2, 1],  // col 2
  [0, 0, 2, 1, 1, 2],  // col 3
  [0, 0, 0, 2, 1, 2],  // col 4
  [0, 0, 0, 0, 2, 1],  // col 5
  [0, 0, 0, 0, 0, 0],  // col 6
];
const PREVIEW_COLS = 7;
const PREVIEW_ROWS = 6;

function MiniPiece({ color, light, size }: { color: string; light: string; size: number }) {
  return (
    <LinearGradient
      colors={[light, color, `${color}bb`]}
      start={{ x: 0.3, y: 0 }}
      end={{ x: 0.7, y: 1 }}
      style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', overflow: 'hidden' }}
    >
      <View style={{ width: '55%', height: '25%', borderRadius: size, backgroundColor: 'rgba(255,255,255,0.3)', marginTop: size * 0.12 }} />
    </LinearGradient>
  );
}

function InGameBoardPreview({ boardThemeId, pieceSkinId }: { boardThemeId: string; pieceSkinId: string }) {
  const theme: BoardThemeVisuals = BOARD_THEME_VISUALS[boardThemeId] || BOARD_THEME_VISUALS.default;
  const skin: PieceSkinVisuals = PIECE_SKIN_VISUALS[pieceSkinId] || PIECE_SKIN_VISUALS.classic;

  const W = 280;
  const pad = 6;
  const gap = 2;
  const cellSize = Math.floor((W - pad * 2 - gap * (PREVIEW_COLS - 1)) / PREVIEW_COLS);
  const pieceSize = cellSize - 4;
  const boardH = cellSize * PREVIEW_ROWS + gap * (PREVIEW_ROWS - 1) + pad * 2;

  return (
    <View style={{ alignItems: 'center', paddingVertical: 12 }}>
      {/* Label */}
      <Text style={{ fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: 1.5, marginBottom: 8 }}>IN-GAME PREVIEW</Text>

      {/* Board */}
      <LinearGradient
        colors={[...theme.frameGradient]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{
          width: W, borderRadius: 10, borderWidth: 1.5, borderColor: theme.frameBorder,
          padding: pad, overflow: 'hidden',
          shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 8,
        }}
      >
        {/* Top bevel */}
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, backgroundColor: 'rgba(255,255,255,0.2)' }} />

        {/* Grid */}
        {Array.from({ length: PREVIEW_ROWS }).map((_, row) => (
          <View key={row} style={{ flexDirection: 'row', gap, marginBottom: row < PREVIEW_ROWS - 1 ? gap : 0 }}>
            {Array.from({ length: PREVIEW_COLS }).map((_, col) => {
              const cell = SAMPLE_BOARD[col]?.[row] ?? 0;
              const pc = cell === 1 ? skin.p1 : cell === 2 ? skin.p2 : null;
              return (
                <View
                  key={col}
                  style={{
                    width: cellSize, height: cellSize, borderRadius: cellSize / 2,
                    backgroundColor: theme.holeColor, borderWidth: 1, borderColor: theme.holeBorder,
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {pc && <MiniPiece color={pc.main} light={pc.light} size={pieceSize} />}
                </View>
              );
            })}
          </View>
        ))}
      </LinearGradient>

      {/* Board base */}
      <LinearGradient
        colors={[...theme.baseGradient]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{ width: W + 8, height: 10, borderBottomLeftRadius: 8, borderBottomRightRadius: 8, marginTop: -1 }}
      />
    </View>
  );
}

function PremiumPiecePreview({ color }: { color: string }) {
  return (
    <LinearGradient
      colors={[color, `${color}dd`, `${color}99`]}
      style={s.previewPiece}
    >
      <View style={s.previewPieceShine} />
    </LinearGradient>
  );
}

export function CosmeticPreviewModal({
  visible, item, category, isOwned, isEquipped, canAfford,
  onBuy, onEquip, onClose,
}: Props) {
  if (!item) return null;

  // Get current equipped cosmetics to show the item in context
  const equippedBoard = useShopStore(st => st.equipped.board);
  const equippedPieces = useShopStore(st => st.equipped.pieces);

  const rarityColor = RARITY_COLORS[item.rarity] || '#fff';
  const rarityLabel = RARITY_LABELS[item.rarity] || item.rarity;
  const isDarkMatter = item.rarity === 'darkmatter';
  const isEarnOnly = isDarkMatter || (item.price === 0 && item.rarity === 'mythic');

  // For boards: preview this board theme with current pieces
  // For pieces: preview these pieces on current board theme
  const previewBoardId = category === 'boards' ? item.id : equippedBoard;
  const previewPiecesId = category === 'pieces' ? item.id : equippedPieces;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View entering={FadeIn.duration(200)} style={s.overlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close preview"
        />

        <Animated.View entering={SlideInDown.springify().damping(14)} style={s.card}>
          {/* Rarity accent strip */}
          <View style={[s.rarityStrip, { backgroundColor: rarityColor }]} />

          {/* Large in-game preview */}
          <ScrollView style={{ maxHeight: 340 }} contentContainerStyle={{ alignItems: 'center' }} showsVerticalScrollIndicator={false}>
            {(category === 'boards' || category === 'pieces') ? (
              <InGameBoardPreview boardThemeId={previewBoardId} pieceSkinId={previewPiecesId} />
            ) : (
              <View style={s.effectPreviewLarge}>
                {(item.rarity === 'epic' || item.rarity === 'legendary' || item.rarity === 'mythic' || item.rarity === 'darkmatter') ? (
                  <AnimatedRarityBg rarity={item.rarity} width={300} height={220} style={StyleSheet.absoluteFill} />
                ) : (
                  <LinearGradient
                    colors={EFFECT_ICONS[item.id]?.bg || ['#1a1a2e', '#0e0e1a']}
                    style={StyleSheet.absoluteFill}
                  />
                )}
                <View style={[s.effectGlowLarge, { backgroundColor: EFFECT_ICONS[item.id]?.accent || '#ff8c00' }]} />
                <Text style={s.effectIconLarge}>{EFFECT_ICONS[item.id]?.icon || '✨'}</Text>
                <Text style={s.effectPreviewLabel}>IN-GAME PREVIEW</Text>
                {item.description && (
                  <Text style={s.effectPreviewDesc}>{item.description}</Text>
                )}
              </View>
            )}
          </ScrollView>

          {/* Item info */}
          <View style={s.infoArea}>
            <Text style={s.itemName}>{item.name}</Text>
            <View style={[s.rarityBadge, { backgroundColor: `${rarityColor}20`, borderColor: `${rarityColor}40` }]}>
              <Text style={[s.rarityText, { color: rarityColor }]}>{rarityLabel}</Text>
            </View>
            {item.description && (
              <Text style={s.description}>{item.description}</Text>
            )}
            {item.collection && (
              <Text style={s.collection}>{item.collection}</Text>
            )}
          </View>

          {/* Price / Action */}
          <View style={s.actionArea}>
            {isEquipped ? (
              <View style={s.equippedBanner}>
                <Text style={s.equippedText}>✓ EQUIPPED</Text>
              </View>
            ) : isOwned ? (
              <PressScale onPress={() => { haptics.win(); onEquip(); }}>
                <LinearGradient colors={['#27ae3d', '#1e8a30']} style={s.actionBtn}>
                  <Text style={s.actionBtnText}>EQUIP</Text>
                </LinearGradient>
              </PressScale>
            ) : isEarnOnly ? (
              <View style={[s.earnOnlyBanner, { borderColor: `${rarityColor}40` }]}>
                <Text style={[s.earnOnlyText, { color: rarityColor }]}>EARN ONLY</Text>
              </View>
            ) : (
              <PressScale onPress={() => { haptics.win(); onBuy(); }} disabled={!canAfford}>
                <Shimmer color="rgba(255,215,0,0.2)" duration={2500} paused={!canAfford}>
                  <LinearGradient
                    colors={canAfford ? ['#ff8c00', '#cc5500'] : ['#333', '#222']}
                    style={s.actionBtn}
                  >
                    <Text style={s.actionBtnText}>
                      {canAfford ? `BUY  🪙 ${item.price.toLocaleString()}` : `NEED ${item.price.toLocaleString()} 🪙`}
                    </Text>
                  </LinearGradient>
                </Shimmer>
              </PressScale>
            )}

            {/* Cancel */}
            <PressScale onPress={onClose}>
              <View style={s.cancelBtn}>
                <Text style={s.cancelText}>BACK</Text>
              </View>
            </PressScale>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#0d1030',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
  },
  rarityStrip: {
    height: 4,
    width: '100%',
  },
  previewPiece: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'flex-start',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 6,
  },
  previewPieceShine: {
    width: '55%',
    height: '28%',
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.35)',
    marginTop: 6,
  },
  effectPreviewLarge: {
    width: '100%',
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  effectGlowLarge: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    opacity: 0.18,
  },
  effectIconLarge: {
    fontSize: 72,
    zIndex: 1,
  },
  effectPreviewLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 1.5,
    marginTop: 12,
    zIndex: 1,
  },
  effectPreviewDesc: {
    fontFamily: fonts.body,
    fontWeight: weight.regular,
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 20,
    zIndex: 1,
  },
  infoArea: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    alignItems: 'center',
  },
  itemName: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 22,
    color: '#ffffff',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  rarityBadge: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  rarityText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  description: {
    fontFamily: fonts.body,
    fontWeight: weight.regular,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 19,
  },
  collection: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 10,
    color: colors.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 6,
  },
  actionArea: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    gap: 10,
  },
  actionBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ff8c00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  actionBtnText: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 16,
    color: '#ffffff',
    letterSpacing: 1.5,
  },
  equippedBanner: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: 'rgba(39,174,61,0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(39,174,61,0.3)',
  },
  equippedText: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 16,
    color: colors.green,
    letterSpacing: 1.5,
  },
  earnOnlyBanner: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1.5,
  },
  earnOnlyText: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 14,
    letterSpacing: 1.5,
  },
  cancelBtn: {
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  cancelText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 13,
    color: colors.textSecondary,
    letterSpacing: 1,
  },
});
