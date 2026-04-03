import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withDelay,
  FadeIn,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useGameStore, ROWS, COLS, Cell } from '../../stores/gameStore';
import { useShopStore } from '../../stores/shopStore';
import { BOARD_THEME_VISUALS, BoardThemeVisuals } from '../../data/boardThemeColors';
import { PIECE_SKIN_VISUALS, PieceSkinVisuals } from '../../data/pieceSkinColors';
import { colors } from '../../theme/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BOARD_MAX_WIDTH = Math.min(SCREEN_WIDTH - 24, 380);
const CELL_GAP = 4;
const BOARD_PADDING = 10;

// Default sizes for standard 7-col board (used for exports)
const CELL_SIZE = Math.floor((BOARD_MAX_WIDTH - BOARD_PADDING * 2 - CELL_GAP * (COLS - 1)) / COLS);
const BOARD_WIDTH = CELL_SIZE * COLS + CELL_GAP * (COLS - 1) + BOARD_PADDING * 2;

// Dynamic sizing helper
function computeBoardSizes(cols: number, rows: number) {
  const cellSize = Math.floor((BOARD_MAX_WIDTH - BOARD_PADDING * 2 - CELL_GAP * (cols - 1)) / cols);
  const pieceSize = cellSize - 6;
  const boardWidth = cellSize * cols + CELL_GAP * (cols - 1) + BOARD_PADDING * 2;
  const boardHeight = cellSize * rows + CELL_GAP * (rows - 1) + BOARD_PADDING * 2;
  return { cellSize, pieceSize, boardWidth, boardHeight };
}
const BOARD_HEIGHT = CELL_SIZE * ROWS + CELL_GAP * (ROWS - 1) + BOARD_PADDING * 2;
const PIECE_SIZE = CELL_SIZE - 6;

export { BOARD_WIDTH, BOARD_HEIGHT, CELL_SIZE };

// Individual animated piece
function AnimatedPiece({ player, isNew, delay = 0, skinColors }: {
  player: 1 | 2;
  isNew: boolean;
  delay?: number;
  skinColors?: PieceSkinVisuals;
}) {
  const translateY = useSharedValue(isNew ? -(BOARD_HEIGHT + 50) : 0);
  const scaleVal = useSharedValue(1);

  React.useEffect(() => {
    if (isNew) {
      translateY.value = withDelay(delay,
        withSpring(0, { damping: 14, stiffness: 180, mass: 0.7 })
      );
      // Landing bounce
      scaleVal.value = withDelay(delay + 200,
        withSequence(
          withSpring(1.15, { damping: 8, stiffness: 400 }),
          withSpring(1, { damping: 12, stiffness: 200 })
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

// Win highlight ring
function WinHighlight({ delay }: { delay: number }) {
  return (
    <Animated.View
      entering={FadeIn.delay(delay).duration(300)}
      style={styles.winRing}
    />
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
  const customSettings = useGameStore(s => s.customSettings);
  const gameCols = customSettings?.cols || COLS;
  const gameRows = customSettings?.rows || ROWS;
  const theme: BoardThemeVisuals = BOARD_THEME_VISUALS[equippedBoard] || BOARD_THEME_VISUALS.default;
  const pieceSkin: PieceSkinVisuals = PIECE_SKIN_VISUALS[equippedPieces] || PIECE_SKIN_VISUALS.classic;

  // Compute dynamic board dimensions based on current game settings
  const sizes = React.useMemo(() => computeBoardSizes(gameCols, gameRows), [gameCols, gameRows]);
  const board = useGameStore(s => s.board);
  const winCells = useGameStore(s => s.winCells);
  const moveCount = useGameStore(s => s.moveCount);

  // Track which pieces are "new" for animation
  const [prevMoveCount, setPrevMoveCount] = React.useState(0);
  const newPieceMoves = React.useRef(new Set<string>());

  React.useEffect(() => {
    if (moveCount > prevMoveCount) {
      // Find the new piece
      for (let col = 0; col < COLS; col++) {
        for (let row = 0; row < ROWS; row++) {
          if (board[col][row] !== 0) {
            const key = `${col}-${row}`;
            if (!newPieceMoves.current.has(key)) {
              newPieceMoves.current.add(key);
            }
          }
        }
      }
      setPrevMoveCount(moveCount);
    }
  }, [moveCount, board]);

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
        <View style={styles.grid}>
          {Array.from({ length: ROWS }).map((_, row) => (
            <View key={row} style={styles.row}>
              {Array.from({ length: COLS }).map((_, col) => {
                const cell = board[col][row];
                const key = `${col}-${row}`;
                const isNew = newPieceMoves.current.has(key) && moveCount === prevMoveCount;
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
                          skinColors={pieceSkin}
                        />
                      )}
                      {/* Ghost piece preview */}
                      {isGhost && (
                        <View style={[styles.ghostPiece, {
                          backgroundColor: currentPlayerColor === 'red'
                            ? pieceSkin.p1.main : pieceSkin.p2.main,
                        }]} />
                      )}
                    </View>

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
              style={styles.colTarget}
            />
          ))}
        </View>
      </LinearGradient>

      {/* Board base/tray */}
      <LinearGradient
        colors={[...theme.baseGradient]}
        style={styles.boardBase}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  boardOuter: {
    alignItems: 'center',
    marginTop: 8,
    position: 'relative',
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
  boardFrame: {
    width: BOARD_WIDTH,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#3668d4', // overridden by theme inline
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
  winRing: {
    position: 'absolute',
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    borderRadius: CELL_SIZE / 2 + 3,
    borderWidth: 3,
    borderColor: '#ffffff',
    shadowColor: '#ffffff',
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
  },
  colTarget: {
    flex: 1,
    height: '100%',
  },
  boardBase: {
    width: BOARD_WIDTH + 16,
    height: 16,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    marginTop: -2,
  },
});
