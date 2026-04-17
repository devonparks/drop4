import { create } from 'zustand';
import { saveState, loadState } from '../services/storage';
import { Cell } from './gameStore';

interface CustomBoard {
  id: string;
  name: string;
  creator: string;
  timestamp: number;
  rows: number;
  cols: number;
  connectCount: number;
  board: Cell[][];  // preset piece positions
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  likes: number;
  plays: number;
}

interface BoardEditorState {
  // Editor state
  editorBoard: Cell[][];
  editorRows: number;
  editorCols: number;
  editorConnectCount: number;
  currentPiece: Cell; // 0 = erase, 1 = red, 2 = yellow

  // Saved boards
  myBoards: CustomBoard[];
  communityBoards: CustomBoard[]; // Will be from Firebase later

  // Actions
  initEditor: (rows?: number, cols?: number) => void;
  placePiece: (col: number, row: number) => void;
  setCurrentPiece: (piece: Cell) => void;
  clearBoard: () => void;
  saveBoard: (name: string, description: string) => void;
  loadBoard: (board: CustomBoard) => void;
  deleteBoard: (id: string) => void;
  loadFromStorage: () => Promise<void>;
}

function createEmptyBoard(cols: number, rows: number): Cell[][] {
  return Array.from({ length: cols }, () => Array(rows).fill(0));
}

export const useBoardEditorStore = create<BoardEditorState>((set, get) => ({
  editorBoard: createEmptyBoard(7, 6),
  editorRows: 6,
  editorCols: 7,
  editorConnectCount: 4,
  currentPiece: 1,
  myBoards: [],
  communityBoards: [],

  initEditor: (rows = 6, cols = 7) => {
    set({
      editorBoard: createEmptyBoard(cols, rows),
      editorRows: rows,
      editorCols: cols,
    });
  },

  placePiece: (col, row) => {
    set(state => {
      const newBoard = state.editorBoard.map(c => [...c]);
      newBoard[col][row] = state.currentPiece;
      return { editorBoard: newBoard };
    });
  },

  setCurrentPiece: (piece) => set({ currentPiece: piece }),

  clearBoard: () => {
    const { editorCols, editorRows } = get();
    set({ editorBoard: createEmptyBoard(editorCols, editorRows) });
  },

  saveBoard: (name, description) => {
    const { editorBoard, editorRows, editorCols, editorConnectCount } = get();

    const board: CustomBoard = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name,
      creator: 'Player',
      timestamp: Date.now(),
      rows: editorRows,
      cols: editorCols,
      connectCount: editorConnectCount,
      board: editorBoard.map(c => [...c]),
      description,
      difficulty: 'medium',
      likes: 0,
      plays: 0,
    };

    set(state => ({
      myBoards: [board, ...state.myBoards],
    }));
  },

  loadBoard: (board) => {
    set({
      editorBoard: board.board.map(c => [...c]),
      editorRows: board.rows,
      editorCols: board.cols,
      editorConnectCount: board.connectCount,
    });
  },

  deleteBoard: (id) => {
    set(state => ({
      myBoards: state.myBoards.filter(b => b.id !== id),
    }));
  },

  loadFromStorage: async () => {
    const saved = await loadState<{ myBoards: CustomBoard[] }>('boardEditor');
    if (saved?.myBoards) {
      set({ myBoards: saved.myBoards });
    }
  },
}));

// Auto-save
useBoardEditorStore.subscribe((state) => {
  saveState('boardEditor', { myBoards: state.myBoards });
});
