import { create } from 'zustand';

export type SeriesVenue = 'home' | 'away' | 'neutral';

interface SeriesState {
  isActive: boolean;
  currentGame: number;       // 1, 2, or 3
  totalGames: number;        // 3 (best of 3)
  homePlayerBoard: string;   // Player 1's board theme
  awayPlayerBoard: string;   // Player 2's board theme (or bot's)
  scores: [number, number];  // [home wins, away wins]
  venue: SeriesVenue;        // Current game's venue

  // Actions
  startSeries: (homeBoard: string, awayBoard: string) => void;
  recordGameResult: (homeWin: boolean) => { seriesOver: boolean; seriesWinner: 'home' | 'away' | null };
  getCurrentVenue: () => SeriesVenue;
  getActiveBoard: () => string;
  endSeries: () => void;
}

// Bot board themes per difficulty
const BOT_BOARDS: Record<string, string> = {
  easy: 'wood',
  medium: 'neon',
  hard: 'galaxy',
};

export const useSeriesStore = create<SeriesState>((set, get) => ({
  isActive: false,
  currentGame: 1,
  totalGames: 3,
  homePlayerBoard: 'default',
  awayPlayerBoard: 'default',
  scores: [0, 0],
  venue: 'home',

  startSeries: (homeBoard, awayBoard) => {
    // Coin flip for who is home first (random)
    const homeFirst = Math.random() < 0.5;
    set({
      isActive: true,
      currentGame: 1,
      scores: [0, 0],
      homePlayerBoard: homeFirst ? homeBoard : awayBoard,
      awayPlayerBoard: homeFirst ? awayBoard : homeBoard,
      venue: 'home', // Game 1 is always at home
    });
  },

  recordGameResult: (homeWin) => {
    const { scores, currentGame, totalGames } = get();
    const newScores: [number, number] = [...scores];
    if (homeWin) newScores[0]++;
    else newScores[1]++;

    // Check if series is over (someone has majority wins)
    const winsNeeded = Math.ceil(totalGames / 2);
    const seriesOver = newScores[0] >= winsNeeded || newScores[1] >= winsNeeded;
    const seriesWinner = newScores[0] >= winsNeeded ? 'home' : newScores[1] >= winsNeeded ? 'away' : null;

    // Determine next venue
    let nextVenue: SeriesVenue = 'neutral';
    const nextGame = currentGame + 1;
    if (nextGame === 2) nextVenue = 'away';
    else if (nextGame === 3) nextVenue = 'neutral';

    set({
      scores: newScores,
      currentGame: nextGame,
      venue: seriesOver ? get().venue : nextVenue,
    });

    return { seriesOver, seriesWinner };
  },

  getCurrentVenue: () => get().venue,

  getActiveBoard: () => {
    const { venue, homePlayerBoard, awayPlayerBoard } = get();
    if (venue === 'home') return homePlayerBoard;
    if (venue === 'away') return awayPlayerBoard;
    return 'default'; // Neutral uses default theme
  },

  endSeries: () => set({
    isActive: false,
    currentGame: 1,
    scores: [0, 0],
    venue: 'home',
  }),
}));

export { BOT_BOARDS };
