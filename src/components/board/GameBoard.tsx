import React, { useMemo, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withDelay,
  withTiming,
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

export { BOARD_WIDTH, CELL_SIZE };

// Individual animated piece
function AnimatedPiece({ player, isNew, row = 0, delay = 0, p1Skin, p2Skin }: {
  player: 1 | 2;
  isNew: boolean;
  row?: number;
  delay?: number;
  p1Skin?: PieceSkinVisuals;
  p2Skin?: PieceSkinVisuals;
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

  // Each player uses their OWN equipped skin — your drip, your pieces
  const skin = player === 1 ? (p1Skin || PIECE_SKIN_VISUALS.classic) : (p2Skin || PIECE_SKIN_VISUALS.classic);
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

// Phase 2 power piece — Rainbow. Cell value 4 in the engine. Renders
// as a multi-color gradient disc so the wildcard reads instantly. No
// drop-bounce since the player chose where to put it (same beat as a
// normal placement). The colors mimic a basic rainbow (red→orange→
// yellow→green→blue→purple) so it's visually unmistakable.
function RainbowPiece({ isNew, row }: { isNew: boolean; row: number }) {
  const drop = useSharedValue(isNew ? -CELL_SIZE * (row + 1) : 0);
  React.useEffect(() => {
    if (isNew) {
      drop.value = withSpring(0, { damping: 12, stiffness: 200, mass: 0.8 });
    }
  }, []);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: drop.value }],
  }));
  return (
    <Animated.View style={[styles.piece, animStyle]}>
      <LinearGradient
        colors={['#ff4081', '#ff8c42', '#ffd54f', '#4caf50', '#3498db', '#9b59b6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.pieceGradient}
      >
        <View style={styles.pieceShine} />
      </LinearGradient>
    </Animated.View>
  );
}

// Concrete-block fill for career "obstacle" levels. Cell value 3 (WALL)
// renders this in place of a player piece — solid stone-grey square with
// a subtle inner notch grid so the block reads as "this slot is sealed,
// nothing fits here." Square not circular so it visually contrasts the
// circular pieces around it.
function ObstacleBlock() {
  return (
    <View style={styles.obstacleBlock}>
      <View style={styles.obstacleGrid}>
        <View style={styles.obstacleNotchTop} />
        <View style={styles.obstacleNotchMid} />
        <View style={styles.obstacleNotchBot} />
      </View>
    </View>
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
  // Calm-pass polish: sparkle-flash burst on each winning piece. With the
  // cascaded delay (delay = i * 120ms across 4 pieces), the flash sweeps
  // visibly down the winning line over ~600ms — the "sparkle/shimmer
  // sweep" the polish-followups queue called for. Bright warm-white flash
  // ramps up over 100ms, then fades out over 250ms while the existing
  // ring pulse takes over for sustained celebration.
  const flashOpacity = useSharedValue(0);

  React.useEffect(() => {
    // Fade in first
    glowOpacity.value = withDelay(delay, withTiming(1, { duration: 300 }));
    // Sparkle flash — fires once at this piece's turn in the cascade
    flashOpacity.value = withDelay(
      delay,
      withSequence(
        withTiming(1, { duration: 100 }),
        withTiming(0, { duration: 250 }),
      ),
    );
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

  const flashStyle = useAnimatedStyle(() => ({
    opacity: flashOpacity.value,
  }));

  return (
    <>
      {/* Outer golden glow */}
      <Animated.View style={[styles.winGlowOuter, ringStyle]} />
      {/* Inner crisp ring */}
      <Animated.View style={[styles.winRing, ringStyle]} />
      {/* Sparkle flash — single bright burst at each piece's cascade tick */}
      <Animated.View style={[styles.winFlash, flashStyle]} />
    </>
  );
}

interface GameBoardProps {
  onColumnPress: (col: number) => void;
  disabled?: boolean;
  currentPlayerColor?: 'red' | 'yellow';
  /** Phase A.3 — Sal's gravity flip. When false, the board container
   *  flips vertically (scaleY: -1) so pieces appear to stack from the
   *  top. Engine logic in gameStore handles the actual landing math
   *  via getLandingRow; this prop is purely visual. Column tap targets
   *  are unaffected because columns are X-axis (scaleY only flips Y).
   *  Defaults to true so non-Sal levels render normally. */
  gravityDown?: boolean;
}

export function GameBoard({ onColumnPress, disabled, currentPlayerColor = 'red', gravityDown = true }: GameBoardProps) {
  const [hoveredCol, setHoveredCol] = React.useState<number | null>(null);
  const equippedBoard = useShopStore(s => s.equipped.board);
  const equippedPieces = useShopStore(s => s.equipped.pieces);
  const theme: BoardThemeVisuals = BOARD_THEME_VISUALS[equippedBoard] || BOARD_THEME_VISUALS.default;
  // YOUR skin on YOUR pieces, opponent always gets classic
  const p1Skin: PieceSkinVisuals = PIECE_SKIN_VISUALS[equippedPieces] || PIECE_SKIN_VISUALS.classic;
  const p2Skin: PieceSkinVisuals = PIECE_SKIN_VISUALS.classic;

  const board = useGameStore(s => s.board);
  const winCells = useGameStore(s => s.winCells);

  // Track which pieces are "new" for drop animation.
  // Uses board-snapshot comparison so it works for both local drops and
  // undo/redo replays.
  const knownPieces = useRef(new Set<string>());
  const newPieceKeys = useRef(new Set<string>());
  const [, setAnimTick] = React.useState(0);

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

        {/* Grid — Phase A.3: scaleY(-1) flips the board vertically when
            Sal's gravity is up. Touch coords are X-only so flipping Y
            doesn't break column-tap targeting. Pieces stay symmetric
            (circles) so the visual mirror reads as "the board flipped"
            without breaking individual piece appearance. */}
        <View
          style={[
            styles.grid,
            !gravityDown && { transform: [{ scaleY: -1 }] },
            { pointerEvents: 'none' },
          ]}
        >
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
                      {/* Wall (career obstacle level) — concrete-block
                          fill that takes the cell out of play. Renders
                          BEFORE the piece branch since walls are never
                          a player piece. */}
                      {cell === 3 && <ObstacleBlock />}
                      {/* Phase 2 power piece — Rainbow (cell value 4).
                          Counts as either color in checkWin, so it
                          renders distinct from regular pieces with a
                          rainbow gradient hint to telegraph the
                          wildcard. */}
                      {cell === 4 && <RainbowPiece isNew={isNew} row={row} />}
                      {/* Piece if present (excludes walls + rainbows
                          handled above; player pieces are 1 or 2). */}
                      {(cell === 1 || cell === 2) && (
                        <AnimatedPiece
                          player={cell}
                          isNew={isNew}
                          row={row}
                          p1Skin={p1Skin}
                          p2Skin={p2Skin}
                        />
                      )}
                      {/* Ghost piece preview — pulsing */}
                      {isGhost && (
                        <GhostPiecePulse
                          color={currentPlayerColor === 'red'
                            ? p1Skin.p1.main : p2Skin.p2.main}
                        />
                      )}
                    </View>

                    {/* Landing shockwave flash — only on real pieces */}
                    {(cell === 1 || cell === 2) && isNew && <LandFlash delay={0} />}

                    {/* Win highlight */}
                    {isWin && <WinHighlight delay={Array.from(winSet).indexOf(key) * 120} />}
                  </View>
                );
              })}
            </View>
          ))}
        </View>

        {/* Column touch targets (invisible, overlay on top) */}
        <View style={[styles.touchLayer, { pointerEvents: disabled ? 'none' : 'auto' }]}>
          {Array.from({ length: COLS }).map((_, col) => (
            <Pressable
              key={col}
              onPress={() => { setHoveredCol(null); onColumnPress(col); }}
              onPressIn={() => setHoveredCol(col)}
              onHoverIn={() => setHoveredCol(col)}
              onHoverOut={() => setHoveredCol(null)}
              style={[styles.colTarget]}
              accessibilityRole="button"
              accessibilityLabel={`Column ${col + 1}`}
              accessibilityHint={`Drop your ${currentPlayerColor} piece in column ${col + 1}`}
              accessibilityState={{ disabled: !!disabled }}
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
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(100,180,255,0.12)',
    padding: BOARD_PADDING,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
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
    // Crisp inset shadow for depth
    borderWidth: 1.5,
    borderColor: '#060d2a',
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
  // Obstacle block — concrete fill for WALL cells in career "obstacle"
  // levels. Square + stone-grey reads instantly as "non-pieced." The
  // inner notch lines fake brick texture without an asset.
  obstacleBlock: {
    width: PIECE_SIZE * 0.92,
    height: PIECE_SIZE * 0.92,
    borderRadius: 6,
    backgroundColor: '#3a3a48',
    borderWidth: 2,
    borderColor: '#1f1f2a',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  obstacleGrid: {
    width: '100%',
    height: '100%',
    paddingVertical: 4,
    paddingHorizontal: 4,
    justifyContent: 'space-between',
  },
  obstacleNotchTop: { height: 2, backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 1 },
  obstacleNotchMid: { height: 2, backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 1 },
  obstacleNotchBot: { height: 2, backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 1 },
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
  // Calm-pass polish: bright warm-white flash burst layered over the
  // winning piece. Fires once per piece in the cascade. Sized larger
  // than the winRing so the flash visibly bleeds beyond the ring edge.
  winFlash: {
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    borderRadius: CELL_SIZE / 2 + 10,
    backgroundColor: 'rgba(255,245,210,0.85)',
    shadowColor: '#fffbe0',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 10,
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
    width: BOARD_WIDTH + 12,
    marginTop: -1,
    alignSelf: 'center',
    position: 'relative',
  },
  boardBaseHighlight: {
    position: 'absolute',
    top: 0,
    left: 6,
    right: 6,
    height: 1,
    backgroundColor: 'rgba(160,210,255,0.2)',
    borderRadius: 1,
    zIndex: 1,
  },
  boardBase: {
    width: '100%',
    height: 14,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    shadowColor: 'rgba(80,140,255,0.3)',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 5,
  },
});
