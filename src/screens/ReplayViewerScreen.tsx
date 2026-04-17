import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';

import { useNavigation } from '@react-navigation/native';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { StaggeredEntry } from '../components/animations/StaggeredEntry';
import { TopBar } from '../components/ui/TopBar';
import { useReplayStore, Replay, ReplayMove } from '../stores/replayStore';
import { useShopStore } from '../stores/shopStore';
import { haptics } from '../services/haptics';
import { playSound } from '../services/audio';
import { colors } from '../theme/colors';
import { fonts, weight } from '../theme/typography';
import { Cell } from '../stores/gameStore';

// Mini board renderer for replay playback
function ReplayBoard({ board, rows, cols, lastMove }: {
  board: Cell[][];
  rows: number;
  cols: number;
  lastMove: { col: number; row: number } | null;
}) {
  const cellSize = Math.min(300 / cols, 42);

  return (
    <View style={[rStyles.board, { width: cellSize * cols + 8 }]}>
      {Array.from({ length: rows }).map((_, row) => (
        <View key={row} style={rStyles.row}>
          {Array.from({ length: cols }).map((_, col) => {
            const cell = board[col]?.[row] || 0;
            const isLastMove = lastMove?.col === col && lastMove?.row === row;

            return (
              <View key={`${col}-${row}`} style={[rStyles.cell, { width: cellSize, height: cellSize }]}>
                {cell !== 0 && (
                  <View style={[rStyles.piece, {
                    backgroundColor: cell === 1 ? colors.pieceRed : colors.pieceYellow,
                    width: cellSize - 6,
                    height: cellSize - 6,
                  }]} />
                )}
                {isLastMove && (
                  <View style={[rStyles.lastMoveRing, {
                    width: cellSize - 2,
                    height: cellSize - 2,
                  }]} />
                )}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

// Replay list item
function ReplayCard({ replay, onWatch, onToggleStar, onDelete }: {
  replay: Replay;
  onWatch: () => void;
  onToggleStar: () => void;
  onDelete: () => void;
}) {
  const resultColors: Record<string, string> = { win: colors.green, loss: colors.red, draw: colors.textSecondary };
  const resultLabels: Record<string, string> = { win: 'WIN', loss: 'LOSS', draw: 'DRAW' };
  const date = new Date(replay.timestamp);
  const timeStr = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;

  return (
    <Pressable
      onPress={onWatch}
      style={rStyles.replayCard}
      accessibilityRole="button"
      accessibilityLabel={`Watch replay vs ${replay.opponent}, ${resultLabels[replay.result]}, ${replay.totalMoves} moves`}
    >
      <View style={rStyles.replayLeft}>
        <Text style={[rStyles.replayResult, { color: resultColors[replay.result] }]}>
          {resultLabels[replay.result]}
        </Text>
        <View>
          <Text style={rStyles.replayOpponent}>vs {replay.opponent}</Text>
          <Text style={rStyles.replayMeta}>{replay.totalMoves} moves • {timeStr}</Text>
        </View>
      </View>
      <View style={rStyles.replayRight}>
        <Pressable
          onPress={onToggleStar}
          accessibilityRole="button"
          accessibilityLabel={replay.starred ? 'Unstar replay' : 'Star replay'}
          accessibilityState={{ selected: replay.starred }}
        >
          <Text style={rStyles.starIcon}>{replay.starred ? '⭐' : '☆'}</Text>
        </Pressable>
        <Pressable
          onPress={onDelete}
          accessibilityRole="button"
          accessibilityLabel="Delete replay"
        >
          <Text style={rStyles.deleteIcon}>🗑</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

export function ReplayViewerScreen() {
  const navigation = useNavigation();
  const coins = useShopStore(s => s.coins);
  const gems = useShopStore(s => s.gems);
  const level = useShopStore(s => s.level);
  const replays = useReplayStore(s => s.replays);
  const toggleStar = useReplayStore(s => s.toggleStar);
  const deleteReplay = useReplayStore(s => s.deleteReplay);
  const [watching, setWatching] = useState<Replay | null>(null);
  const [board, setBoard] = useState<Cell[][]>([]);
  const [moveIndex, setMoveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [lastMove, setLastMove] = useState<{ col: number; row: number } | null>(null);
  const playRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stepForwardRef = useRef<() => void>(() => {});

  // Initialize board for watching
  const startWatching = useCallback((replay: Replay) => {
    const emptyBoard: Cell[][] = Array.from({ length: replay.boardCols }, () =>
      Array(replay.boardRows).fill(0)
    );
    setBoard(emptyBoard);
    setMoveIndex(0);
    setLastMove(null);
    setIsPlaying(false);
    setWatching(replay);
  }, []);

  // Apply a move to the board
  const applyMove = useCallback((move: ReplayMove, currentBoard: Cell[][]) => {
    const newBoard = currentBoard.map(c => [...c]);
    // Find lowest empty row in this column
    for (let row = newBoard[move.col].length - 1; row >= 0; row--) {
      if (newBoard[move.col][row] === 0) {
        newBoard[move.col][row] = move.player;
        setLastMove({ col: move.col, row });
        break;
      }
    }
    return newBoard;
  }, []);

  // Step forward one move
  const stepForward = useCallback(() => {
    if (!watching || moveIndex >= watching.moves.length) return;
    const move = watching.moves[moveIndex];
    setBoard(prev => applyMove(move, prev));
    setMoveIndex(prev => prev + 1);
    playSound('drop');
  }, [watching, moveIndex, applyMove]);

  // Keep ref in sync so the interval always calls the latest stepForward
  useEffect(() => {
    stepForwardRef.current = stepForward;
  }, [stepForward]);

  // Auto-play
  useEffect(() => {
    if (playRef.current) clearInterval(playRef.current);

    if (isPlaying && watching && moveIndex < watching.moves.length) {
      playRef.current = setInterval(() => {
        stepForwardRef.current();
      }, 600);
    }

    return () => {
      if (playRef.current) clearInterval(playRef.current);
    };
  }, [isPlaying, watching]);

  // Stop playing when reached end
  useEffect(() => {
    if (watching && moveIndex >= watching.moves.length) {
      setIsPlaying(false);
    }
  }, [moveIndex, watching]);

  // Watching mode
  if (watching) {
    return (
      <ScreenBackground>
        <View style={rStyles.container}>
          <View style={rStyles.watchHeader}>
            <Pressable
              onPress={() => { setWatching(null); setIsPlaying(false); }}
              style={rStyles.backBtn}
              accessibilityRole="button"
              accessibilityLabel="Back to replay list"
            >
              <Text style={rStyles.backText}>{'<'}</Text>
            </Pressable>
            <Text style={rStyles.watchTitle} accessibilityRole="header">REPLAY</Text>
            <Text style={rStyles.watchInfo}>
              vs {watching.opponent} • {watching.result.toUpperCase()}
            </Text>
          </View>

          <View style={rStyles.boardArea}>
            <ReplayBoard
              board={board}
              rows={watching.boardRows}
              cols={watching.boardCols}
              lastMove={lastMove}
            />
          </View>

          <Text style={rStyles.moveCounter}>
            Move {moveIndex} / {watching.totalMoves}
          </Text>

          <View style={rStyles.controls}>
            <Pressable
              onPress={() => {
                haptics.tap();
                const emptyBoard: Cell[][] = Array.from({ length: watching.boardCols }, () =>
                  Array(watching.boardRows).fill(0)
                );
                setBoard(emptyBoard);
                setMoveIndex(0);
                setLastMove(null);
                setIsPlaying(false);
              }}
              style={rStyles.controlBtn}
              accessibilityRole="button"
              accessibilityLabel="Reset replay to start"
            >
              <Text style={rStyles.controlIcon}>⏮</Text>
            </Pressable>

            <Pressable
              onPress={() => { haptics.tap(); stepForward(); }}
              style={rStyles.controlBtn}
              accessibilityRole="button"
              accessibilityLabel="Step forward one move"
            >
              <Text style={rStyles.controlIcon}>⏭</Text>
            </Pressable>

            <Pressable
              onPress={() => { haptics.tap(); setIsPlaying(!isPlaying); }}
              style={[rStyles.controlBtn, rStyles.playBtn]}
              accessibilityRole="button"
              accessibilityLabel={isPlaying ? 'Pause replay' : 'Play replay'}
              accessibilityState={{ selected: isPlaying }}
            >
              <Text style={rStyles.controlIcon}>{isPlaying ? '⏸' : '▶️'}</Text>
            </Pressable>
          </View>
        </View>
      </ScreenBackground>
    );
  }

  // Replay list
  return (
    <ScreenBackground>
      <TopBar coins={coins} gems={gems} level={level} showBack onBackPress={() => navigation.goBack()} />
      <View style={rStyles.container}>
        <StaggeredEntry index={0} delay={60}>
          <Text style={rStyles.title} accessibilityRole="header">REPLAYS</Text>
          <Text style={rStyles.subtitle}>{replays.length} saved</Text>
        </StaggeredEntry>

        {replays.length === 0 ? (
          <StaggeredEntry index={1} delay={60} style={rStyles.emptyState}>
            <Text style={rStyles.emptyIcon}>🎬</Text>
            <Text style={rStyles.emptyText}>No replays yet</Text>
            <Text style={rStyles.emptySubtext}>Play some games and they'll appear here</Text>
          </StaggeredEntry>
        ) : (
          <StaggeredEntry index={1} delay={60}>
          <ScrollView contentContainerStyle={rStyles.replayList} showsVerticalScrollIndicator={false}>
            {replays.map(replay => (
              <ReplayCard
                key={replay.id}
                replay={replay}
                onWatch={() => startWatching(replay)}
                onToggleStar={() => { haptics.tap(); toggleStar(replay.id); }}
                onDelete={() => { haptics.tap(); deleteReplay(replay.id); }}
              />
            ))}
          </ScrollView>
          </StaggeredEntry>
        )}
      </View>
    </ScreenBackground>
  );
}

const rStyles = StyleSheet.create({
  container: { flex: 1, paddingTop: 16 },
  title: { fontFamily: fonts.heading, fontWeight: weight.bold, fontSize: 24, color: '#ffffff', letterSpacing: 2, textAlign: 'center' },
  subtitle: { fontFamily: fonts.body, fontWeight: weight.regular, fontSize: 12, color: colors.textSecondary, textAlign: 'center', marginBottom: 12 },
  replayList: { paddingHorizontal: 16, gap: 6, paddingBottom: 100 },
  replayCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  replayLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  replayResult: { fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 14, minWidth: 50, textAlign: 'center' },
  replayOpponent: { fontFamily: fonts.body, fontWeight: weight.semibold, fontSize: 13, color: '#ffffff' },
  replayMeta: { fontFamily: fonts.body, fontWeight: weight.regular, fontSize: 10, color: colors.textSecondary },
  replayRight: { flexDirection: 'row', gap: 12 },
  starIcon: { fontSize: 18 },
  deleteIcon: { fontSize: 16 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontFamily: fonts.heading, fontWeight: weight.bold, fontSize: 20, color: colors.textSecondary },
  emptySubtext: { fontFamily: fonts.body, fontWeight: weight.regular, fontSize: 13, color: colors.textMuted, marginTop: 4 },
  // Watch mode
  watchHeader: { alignItems: 'center', marginBottom: 8 },
  backBtn: { position: 'absolute', left: 16, top: 0, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 18, color: '#fff', fontWeight: '700' },
  watchTitle: { fontFamily: fonts.heading, fontWeight: weight.bold, fontSize: 22, color: '#ffffff', letterSpacing: 2 },
  watchInfo: { fontFamily: fonts.body, fontWeight: weight.regular, fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  boardArea: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  board: { backgroundColor: 'rgba(26,58,138,0.5)', borderRadius: 12, padding: 4, borderWidth: 2, borderColor: 'rgba(54,104,212,0.5)' },
  row: { flexDirection: 'row' },
  cell: { alignItems: 'center', justifyContent: 'center' },
  piece: { borderRadius: 999 },
  lastMoveRing: { position: 'absolute', borderRadius: 999, borderWidth: 2, borderColor: '#ffffff' },
  moveCounter: { fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 14, color: '#ffffff', textAlign: 'center', marginVertical: 8 },
  controls: { flexDirection: 'row', justifyContent: 'center', gap: 16, paddingBottom: 20 },
  controlBtn: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  playBtn: { backgroundColor: 'rgba(255,140,0,0.15)', borderColor: 'rgba(255,140,0,0.3)' },
  controlIcon: { fontSize: 22 },
});
