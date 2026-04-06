import React, { useMemo, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withDelay,
  withTiming,
  FadeIn,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useGameStore, ROWS, COLS } from '../../stores/gameStore';
import { useShopStore } from '../../stores/shopStore';
import { BOARD_THEME_VISUALS, BoardThemeVisuals } from '../../data/boardThemeColors';
import { PIECE_SKIN_VISUALS, PieceSkinVisuals } from '../../data/pieceSkinColors';
import { DarkMatterCamo } from '../effects/DarkMatterCamo';
import { colors } from '../../theme/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BOARD_MAX_WIDTH = Math.min(SCREEN_WIDTH - 16, 400);
const CELL_GAP = 3;
const BOARD_PADDING = 8;

// Default sizes for standard 7-col board (used for exports)
const CELL_SIZE = Math.floor((BOARD_MAX_WIDTH - BOARD_PADDING * 2 - CELL_GAP * (COLS - 1)) / COLS);
const BOARD_WIDTH = CELL_SIZE * COLS + CELL_GAP * (COLS - 1) + BOARD_PADDING * 2;

const BOARD_HEIGHT = CELL_SIZE * ROWS + CELL_GAP * (ROWS - 1) + BOARD_PADDING * 2;
const PIECE_SIZE = CELL_SIZE - 6;

export { BOARD_WIDTH, BOARD_HEIGHT, CELL_SIZE };

// Individual animated piece
function AnimatedPiece({ player, isNew, row = 0, delay = 0, skinColors }: {
  player: 1 | 2;
  isNew: boolean;
  row?: number;
  delay?: number;
  skinColors?: PieceSkinVisuals;
}) {
  // Drop distance is proportional to the row — pieces near the top travel less
  // row 0 = top of board, row 5 = bottom. We drop from above the board.
  const dropDistance = isNew ? -(BOARD_HEIGHT + 50) : 0;
  const translateY = useSharedValue(dropDistance);
  const scaleVal = useSharedValue(1);

  // Row-dependent stiffness: deeper rows feel heavier/faster (more gravity)
  const stiffness = 160 + row * 8;
  const damping = 12 + row * 0.5;

  React.useEffect(() => {
    if (isNew) {
      translateY.value = withDelay(delay,
        withSpring(0, { damping, stiffness, mass: 0.6 })
      );
      // Landing bounce — more pronounced for deeper rows
      const bounceScale = 1.1 + row * 0.02;
      const bounceDelay = delay + 180 + row * 15;
      scaleVal.value = withDelay(bounceDelay,
        withSequence(
          withSpring(bounceScale, { damping: 6, stiffness: 500 }),
          withSpring(1, { damping: 10, stiffness: 200 })
        )
      );
    }
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scale: scaleVal.value },
    ],
  }));

  const skin = skinColors || PIECE_SKIN_VISUALS.classic;
  const pc = player === 1 ? skin.p1 : skin.p2;
  const pieceColor = pc.main;
  const darkColor = pc.dark;
  const glowColor = pc.glow;

  return (
    <Animated.View style={[styles.piece, animStyle]}>
      {/* Piece body with gradient for 3D look */}
      <LinearGradient
        colors={[pc.light, pieceColor, darkColor]}
        start={{ x: 0.3, y: 0 }}
        end={{ x: 0.7, y: 1 }}
        style={[styles.pieceGradient, {
          shadowColor: glowColor,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.8,
          shadowRadius: 4,
          elevation: 4,
        }]}
      >
        {/* Inner shine highlight */}
        <View style={styles.pieceShine} />
      </LinearGradient>
    </Animated.View>
  );
}

// Landing shockwave flash ring — expands and fades after piece drops
function LandFlash({ delay }: { delay: number }) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0);

  React.useEffect(() => {
    // Start flash after the bounce animation completes (~300ms + delay)
    const flashDelay = delay + 300;
    scale.value = withDelay(flashDelay, withTiming(1.5, { duration: 200 }));
    opacity.value = withDelay(flashDelay,
      withSequence(
        withTiming(0.7, { duration: 30 }),
        withTiming(0, { duration: 170 }),
      )
    );
  }, []);

  const flashStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.landFlash, flashStyle]} />
  );
}

// Pulsing ghost piece preview
function GhostPiecePulse({ color }: { color: string }) {
  const pulseOpacity = useSharedValue(0.2);

  React.useEffect(() => {
    const loop = () => {
      pulseOpacity.value = withSequence(
        withTiming(0.35, { duration: 600 }),
        withTiming(0.15, { duration: 600 }),
      );
    };
    loop();
    const interval = setInterval(loop, 1200);
    return () => clearInterval(interval);
  }, []);

  const ghostStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  return (
    <Animated.View style={[styles.ghostPiece, { backgroundColor: color }, ghostStyle]} />
  );
}

// Pulsing win highlight — golden glow ring that pulses after connect
function WinHighlight({ delay }: { delay: number }) {
  const pulseScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0);

  React.useEffect(() => {
    // Fade in first
    glowOpacity.value = withDelay(delay, withTiming(1, { duration: 300 }));
    // Then start pulsing
    const startPulse = () => {
      pulseScale.value = withDelay(delay + 300,
        withSequence(
          withTiming(1.08, { duration: 600 }),
          withTiming(1.0, { duration: 600 }),
        )
      );
      glowOpacity.value = withDelay(delay + 300,
        withSequence(
          withTiming(1, { duration: 600 }),
          withTiming(0.7, { duration: 600 }),
        )
      );
    };
    startPulse();
    const interval = setInterval(startPulse, 1200);
    return () => clearInterval(interval);
  }, []);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: pulseScale.value }],
  }));

  return (
    <>
      {/* Outer golden glow */}
      <Animated.View style={[styles.winGlowOuter, ringStyle]} />
      {/* Inner crisp ring */}
      <Animated.View style={[styles.winRing, ringStyle]} />
    </>
  );
}

interface GameBoardProps {
  onColumnPress: (col: number) => void;
  disabled?: boolean;
  currentPlayerColor?: 'red' | 'yellow';
}

export function GameBoard({ onColumnPress, disabled, currentPlayerColor = 'red' }: GameBoardProps) {
  const [hoveredCol, setHoveredCol] = React.useState<number | null>(null);
  const equippedBoard = useShopStore(s => s.equipped.board);
  const equippedPieces = useShopStore(s => s.equipped.pieces);
  const theme: BoardThemeVisuals = BOARD_THEME_VISUALS[equippedBoard] || BOARD_THEME_VISUALS.default;
  const pieceSkin: PieceSkinVisuals = PIECE_SKIN_VISUALS[equippedPieces] || PIECE_SKIN_VISUALS.classic;

  const board = useGameStore(s => s.board);
  const winCells = useGameStore(s => s.winCells);
  const moveCount = useGameStore(s => s.moveCount);

  // Track which pieces are "new" for drop animation.
  // Uses board-snapshot comparison so it works for both local drops and
  // online match board syncs from Firestore.
  const knownPieces = useRef(new Set<string>());
  const newPieceKeys = useRef(new Set<string>());
  const [animTick, setAnimTick] = React.useState(0);

  React.useEffect(() => {
    let hasNew = false;
    const freshNew = new Set<string>();

    for (let col = 0; col < COLS; col++) {
      for (let row = 0; row < ROWS; row++) {
        if (board[col][row] !== 0) {
          const key = `${col}-${row}`;
          if (!knownPieces.current.has(key)) {
            knownPieces.current.add(key);
            freshNew.add(key);
            hasNew = true;
          }
        }
      }
    }

    if (hasNew) {
      newPieceKeys.current = freshNew;
      // Bump tick to trigger re-render so AnimatedPiece mounts with isNew=true
      setAnimTick(t => t + 1);
    }
  }, [board]);

  // Win cells lookup
  const winSet = useMemo(() => {
    if (!winCells) return new Set<string>();
    return new Set(winCells.map(([c, r]) => `${c}-${r}`));
  }, [winCells]);

  const indicatorColor = currentPlayerColor === 'red' ? colors.pieceRed : colors.pieceYellow;

  return (
    <View style={styles.boardOuter}>
      {/* Column drop indicator arrow */}
      {hoveredCol !== null && !disabled && (
        <View style={[styles.dropIndicator, {
          left: BOARD_PADDING + hoveredCol * (CELL_SIZE + CELL_GAP) + CELL_SIZE / 2 - 8,
        }]}>
          <Text style={[styles.dropArrow, { color: indicatorColor }]}>{'▼'}</Text>
        </View>
      )}

      {/* Dark Matter camo effect — rendered behind the board frame */}
      {equippedBoard === 'darkmatter' && (
        <DarkMatterCamo
          width={BOARD_WIDTH}
          height={BOARD_HEIGHT}
          borderRadius={16}
          intensity="high"
          style={styles.darkMatterBg}
        />
      )}

      {/* Board frame with gradient */}
      <LinearGradient
        colors={[...theme.frameGradient]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={[styles.boardFrame, { borderColor: theme.frameBorder }]}
      >
        {/* Board support legs */}
        <View style={styles.boardLegs}>
          <View style={styles.leg} />
          <View style={styles.leg} />
        </View>

        {/* Grid */}
        <View style={styles.grid} pointerEvents="none">
          {Array.from({ length: ROWS }).map((_, row) => (
            <View key={row} style={styles.row}>
              {Array.from({ length: COLS }).map((_, col) => {
                const cell = board[col][row];
                const key = `${col}-${row}`;
                const isNew = newPieceKeys.current.has(key);
                const isWin = winSet.has(key);

                // Ghost piece: show translucent piece where it would land
                const isGhost = !disabled && hoveredCol === col && cell === 0 &&
                  row === (() => { for (let r = ROWS - 1; r >= 0; r--) { if (board[col][r] === 0) return r; } return -1; })();

                return (
                  <View key={key} style={styles.cellWrap}>
                    {/* Hole */}
                    <View style={[styles.hole, { backgroundColor: theme.holeColor, borderColor: theme.holeBorder }]}>
                      {/* Piece if present */}
                      {cell !== 0 && (
                        <AnimatedPiece
                          player={cell as 1 | 2}
                          isNew={isNew}
                          row={row}
                          skinColors={pieceSkin}
                        />
                      )}
                      {/* Ghost piece preview — pulsing */}
                      {isGhost && (
                        <GhostPiecePulse
                          color={currentPlayerColor === 'red'
                            ? pieceSkin.p1.main : pieceSkin.p2.main}
                        />
                      )}
                    </View>

                    {/* Landing shockwave flash */}
                    {cell !== 0 && isNew && <LandFlash delay={0} />}

                    {/* Win highlight */}
                    {isWin && <WinHighlight delay={Array.from(winSet).indexOf(key) * 120} />}
                  </View>
                );
              })}
            </View>
          ))}
        </View>

        {/* Column touch targets (invisible, overlay on top) */}
        <View style={styles.touchLayer} pointerEvents={disabled ? 'none' : 'auto'}>
          {Array.from({ length: COLS }).map((_, col) => (
            <Pressable
              key={col}
              onPress={() => { setHoveredCol(null); onColumnPress(col); }}
              onPressIn={() => setHoveredCol(col)}
              onHoverIn={() => setHoveredCol(col)}
              onHoverOut={() => setHoveredCol(null)}
              style={[styles.colTarget]}
            >
              {/* Dramatic column glow highlight */}
              {hoveredCol === col && (
                <LinearGradient
                  colors={
                    currentPlayerColor === 'red'
                      ? ['rgba(230,57,70,0.0)', 'rgba(230,57,70,0.12)', 'rgba(230,57,70,0.18)']
                      : ['rgba(244,196,35,0.0)', 'rgba(244,196,35,0.12)', 'rgba(244,196,35,0.18)']
                  }
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                />
              )}
            </Pressable>
          ))}
        </View>
      </LinearGradient>

      {/* Board base/tray */}
      <View style={styles.boardBaseWrap}>
        <View style={styles.boardBaseHighlight} />
        <LinearGradient
          colors={[...theme.baseGradient]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.boardBase}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  boardOuter: {
    alignItems: 'center',
    marginTop: 8,
    position: 'relative',
    // Premium floating glow
    shadowColor: 'rgba(80,140,255,0.5)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 14,
  },
  dropIndicator: {
    position: 'absolute',
    top: -18,
    zIndex: 10,
  },
  dropArrow: {
    fontSize: 16,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  darkMatterBg: {
    position: 'absolute',
    top: 0,
    zIndex: 0,
  },
  boardFrame: {
    width: BOARD_WIDTH,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(100,180,255,0.15)', // subtle inner glow border
    padding: BOARD_PADDING,
    position: 'relative',
    overflow: 'hidden',
    // Subtle inner shadow effect
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  boardLegs: {
    position: 'absolute',
    bottom: -2,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  leg: {
    width: 30,
    height: 8,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  grid: {
    gap: CELL_GAP,
  },
  row: {
    flexDirection: 'row',
    gap: CELL_GAP,
  },
  cellWrap: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    position: 'relative',
  },
  hole: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: CELL_SIZE / 2,
    backgroundColor: '#091440',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    // Inset shadow for depth
    borderWidth: 2,
    borderColor: '#071030',
  },
  ghostPiece: {
    width: PIECE_SIZE,
    height: PIECE_SIZE,
    borderRadius: PIECE_SIZE / 2,
    opacity: 0.25,
  },
  piece: {
    width: PIECE_SIZE,
    height: PIECE_SIZE,
    borderRadius: PIECE_SIZE / 2,
  },
  pieceGradient: {
    width: '100%',
    height: '100%',
    borderRadius: PIECE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'flex-start',
    overflow: 'hidden',
  },
  pieceShine: {
    width: '60%',
    height: '30%',
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginTop: 4,
  },
  landFlash: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: CELL_SIZE / 2 + 2,
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.7)',
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 6,
  },
  winGlowOuter: {
    position: 'absolute',
    top: -6,
    left: -6,
    right: -6,
    bottom: -6,
    borderRadius: CELL_SIZE / 2 + 6,
    backgroundColor: 'rgba(255,215,0,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.3)',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 8,
  },
  winRing: {
    position: 'absolute',
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    borderRadius: CELL_SIZE / 2 + 3,
    borderWidth: 2.5,
    borderColor: '#FFD700',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 8,
  },
  touchLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    zIndex: 10,
  },
  colTarget: {
    flex: 1,
    height: '100%',
  },
  boardBaseWrap: {
    width: BOARD_WIDTH + 16,
    marginTop: -2,
    position: 'relative',
  },
  boardBaseHighlight: {
    position: 'absolute',
    top: 0,
    left: 8,
    right: 8,
    height: 1.5,
    backgroundColor: 'rgba(160,210,255,0.25)',
    borderRadius: 1,
    zIndex: 1,
  },
  boardBase: {
    width: '100%',
    height: 18,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    shadowColor: 'rgba(80,140,255,0.4)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 6,
  },
});
