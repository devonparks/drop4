import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, ScrollView, Alert } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { TopBar } from '../components/ui/TopBar';
import { GlossyButton } from '../components/ui/GlossyButton';
import { useBoardEditorStore } from '../stores/boardEditorStore';
import { useShopStore } from '../stores/shopStore';
import { useGameStore, Cell } from '../stores/gameStore';
import { haptics } from '../services/haptics';
import { colors } from '../theme/colors';
import { fonts, weight } from '../theme/typography';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'BoardEditor'>;
};

export function BoardEditorScreen({ navigation }: Props) {
  const { coins, gems, level } = useShopStore();
  const {
    editorBoard, editorRows, editorCols, currentPiece,
    placePiece, setCurrentPiece, clearBoard, saveBoard, myBoards,
  } = useBoardEditorStore();
  const newGame = useGameStore(s => s.newGame);

  const [boardName, setBoardName] = useState('');
  const [showSave, setShowSave] = useState(false);

  const CELL_SIZE = Math.min(320 / editorCols, 50);

  const handleCellPress = (col: number, row: number) => {
    haptics.tap();
    placePiece(col, row);
  };

  const handleSave = () => {
    if (!boardName.trim()) return;
    saveBoard(boardName.trim(), 'Custom puzzle board');
    haptics.win();
    setBoardName('');
    setShowSave(false);
  };

  const handlePlayBoard = () => {
    // Start a game with the current editor board as preset
    newGame('medium', true, {
      rows: editorRows,
      cols: editorCols,
      connectCount: 4,
      timerSeconds: 0,
    });
    // Store preset board for GameScreen to apply
    (global as any).__presetBoard = editorBoard.map(c => [...c]);
    navigation.navigate('Game');
  };

  return (
    <ScreenBackground>
      <View style={styles.container}>
        <TopBar
          coins={coins} gems={gems} level={level}
          showBack onBackPress={() => navigation.goBack()}
        />

        <Text style={styles.title}>BOARD EDITOR</Text>
        <Text style={styles.subtitle}>Create custom puzzle boards</Text>

        {/* Piece selector */}
        <View style={styles.pieceSelector}>
          {([1, 2, 0] as Cell[]).map(piece => (
            <Pressable
              key={piece}
              onPress={() => { haptics.tap(); setCurrentPiece(piece); }}
              style={[styles.pieceBtn, currentPiece === piece && styles.pieceBtnActive]}
            >
              <View style={[styles.pieceDot, {
                backgroundColor: piece === 1 ? colors.pieceRed : piece === 2 ? colors.pieceYellow : 'transparent',
                borderWidth: piece === 0 ? 2 : 0,
                borderColor: 'rgba(255,255,255,0.3)',
              }]} />
              <Text style={[styles.pieceLabel, currentPiece === piece && { color: colors.orange }]}>
                {piece === 1 ? 'Red' : piece === 2 ? 'Yellow' : 'Erase'}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Board grid */}
        <View style={styles.boardWrap}>
          <View style={[styles.boardGrid, { width: CELL_SIZE * editorCols + 8 }]}>
            {Array.from({ length: editorRows }).map((_, row) => (
              <View key={row} style={styles.boardRow}>
                {Array.from({ length: editorCols }).map((_, col) => {
                  const cell = editorBoard[col]?.[row] || 0;
                  return (
                    <Pressable
                      key={`${col}-${row}`}
                      onPress={() => handleCellPress(col, row)}
                      style={[styles.cell, { width: CELL_SIZE, height: CELL_SIZE }]}
                    >
                      {cell !== 0 && (
                        <View style={[styles.cellPiece, {
                          backgroundColor: cell === 1 ? colors.pieceRed : colors.pieceYellow,
                          width: CELL_SIZE - 8,
                          height: CELL_SIZE - 8,
                        }]} />
                      )}
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>
        </View>

        {/* Action buttons */}
        <View style={styles.actions}>
          <GlossyButton label="CLEAR" variant="navy" small onPress={() => { haptics.tap(); clearBoard(); }} />
          <GlossyButton label="SAVE" variant="green" small onPress={() => setShowSave(true)} />
          <GlossyButton label="PLAY" variant="orange" small onPress={handlePlayBoard} />
        </View>

        {/* Save dialog */}
        {showSave && (
          <View style={styles.saveDialog}>
            <Text style={styles.saveTitle}>Save Board</Text>
            <TextInput
              style={styles.saveInput}
              value={boardName}
              onChangeText={setBoardName}
              placeholder="Board name..."
              placeholderTextColor={colors.textMuted}
              maxLength={20}
            />
            <View style={styles.saveButtons}>
              <GlossyButton label="CANCEL" variant="navy" small onPress={() => setShowSave(false)} />
              <GlossyButton label="SAVE" variant="green" small onPress={handleSave} />
            </View>
          </View>
        )}

        {/* My boards list */}
        {myBoards.length > 0 && (
          <View style={styles.myBoardsSection}>
            <Text style={styles.myBoardsTitle}>MY BOARDS ({myBoards.length})</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.myBoardsScroll}>
              {myBoards.map(board => (
                <Pressable key={board.id} onPress={() => haptics.tap()} style={styles.boardCard}>
                  <Text style={styles.boardCardName}>{board.name}</Text>
                  <Text style={styles.boardCardInfo}>{board.cols}×{board.rows}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: {
    fontFamily: fonts.heading, fontWeight: weight.bold,
    fontSize: 24, color: '#ffffff', letterSpacing: 2, textAlign: 'center', marginTop: 4,
  },
  subtitle: {
    fontFamily: fonts.body, fontWeight: weight.regular,
    fontSize: 12, color: colors.textSecondary, textAlign: 'center', marginBottom: 8,
  },
  pieceSelector: {
    flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 8,
  },
  pieceBtn: {
    alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'transparent',
  },
  pieceBtnActive: {
    borderColor: colors.orange, backgroundColor: 'rgba(255,140,0,0.1)',
  },
  pieceDot: {
    width: 24, height: 24, borderRadius: 12,
  },
  pieceLabel: {
    fontFamily: fonts.body, fontWeight: weight.semibold, fontSize: 10, color: colors.textSecondary,
  },
  boardWrap: {
    alignItems: 'center', marginVertical: 8,
  },
  boardGrid: {
    backgroundColor: 'rgba(26,58,138,0.5)', borderRadius: 12, padding: 4,
    borderWidth: 2, borderColor: 'rgba(54,104,212,0.5)',
  },
  boardRow: {
    flexDirection: 'row',
  },
  cell: {
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  cellPiece: {
    borderRadius: 999,
  },
  actions: {
    flexDirection: 'row', justifyContent: 'center', gap: 8, paddingHorizontal: 20,
  },
  saveDialog: {
    position: 'absolute', top: '40%', left: 20, right: 20,
    backgroundColor: colors.surface, borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: colors.surfaceBorder,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5, shadowRadius: 16, elevation: 20, zIndex: 100,
  },
  saveTitle: {
    fontFamily: fonts.heading, fontWeight: weight.bold,
    fontSize: 18, color: '#ffffff', textAlign: 'center', marginBottom: 12,
  },
  saveInput: {
    fontFamily: fonts.body, fontWeight: weight.medium, fontSize: 16, color: '#ffffff',
    backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  saveButtons: {
    flexDirection: 'row', gap: 8,
  },
  myBoardsSection: {
    marginTop: 12, paddingLeft: 16,
  },
  myBoardsTitle: {
    fontFamily: fonts.body, fontWeight: weight.bold,
    fontSize: 11, color: colors.textSecondary, letterSpacing: 1, marginBottom: 6,
  },
  myBoardsScroll: {
    gap: 8, paddingRight: 16,
  },
  boardCard: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10,
    padding: 10, minWidth: 80, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  boardCardName: {
    fontFamily: fonts.body, fontWeight: weight.semibold, fontSize: 12, color: '#ffffff',
  },
  boardCardInfo: {
    fontFamily: fonts.body, fontWeight: weight.regular, fontSize: 10, color: colors.textSecondary,
  },
});
