import { create } from 'zustand';

interface OnlineState {
  // Connection
  isOnline: boolean;
  isSearching: boolean;
  isInMatch: boolean;

  // Queue
  queueMode: 'casual' | 'ranked' | null;
  queueStartTime: number | null;

  // Match
  matchId: string | null;
  opponentName: string | null;
  opponentElo: number | null;
  myPlayerNum: 1 | 2 | null;

  // Timer for queue display
  searchDuration: number;

  // Actions
  startSearching: (mode: 'casual' | 'ranked') => void;
  stopSearching: () => void;
  setMatch: (matchId: string, opponentName: string, opponentElo: number, playerNum: 1 | 2) => void;
  clearMatch: () => void;
  tickSearchTimer: () => void;
}

export const useOnlineStore = create<OnlineState>((set, get) => ({
  // Connection
  isOnline: false,
  isSearching: false,
  isInMatch: false,

  // Queue
  queueMode: null,
  queueStartTime: null,

  // Match
  matchId: null,
  opponentName: null,
  opponentElo: null,
  myPlayerNum: null,

  // Timer
  searchDuration: 0,

  startSearching: (mode) =>
    set({
      isOnline: true,
      isSearching: true,
      queueMode: mode,
      queueStartTime: Date.now(),
      searchDuration: 0,
    }),

  stopSearching: () =>
    set({
      isSearching: false,
      queueMode: null,
      queueStartTime: null,
      searchDuration: 0,
    }),

  setMatch: (matchId, opponentName, opponentElo, playerNum) =>
    set({
      isSearching: false,
      isInMatch: true,
      matchId,
      opponentName,
      opponentElo,
      myPlayerNum: playerNum,
      queueStartTime: null,
      searchDuration: 0,
    }),

  clearMatch: () =>
    set({
      isOnline: false,
      isInMatch: false,
      matchId: null,
      opponentName: null,
      opponentElo: null,
      myPlayerNum: null,
      queueMode: null,
    }),

  tickSearchTimer: () => {
    const { queueStartTime, isSearching } = get();
    if (!isSearching || !queueStartTime) return;
    set({ searchDuration: Math.floor((Date.now() - queueStartTime) / 1000) });
  },
}));
