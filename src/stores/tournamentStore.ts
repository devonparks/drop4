import { create } from 'zustand';

export interface TournamentPlayer {
  name: string;
  seed: number;
  eliminated: boolean;
  wins: number;
}

export interface TournamentMatch {
  player1Index: number;
  player2Index: number;
  winner: number | null; // index of winner, null if not played
  round: number;
}

interface TournamentState {
  players: TournamentPlayer[];
  matches: TournamentMatch[];
  currentMatchIndex: number;
  currentRound: number;
  totalRounds: number;
  isActive: boolean;
  champion: string | null;

  // Actions
  startTournament: (playerNames: string[]) => void;
  getCurrentMatch: () => TournamentMatch | null;
  recordResult: (winnerIndex: number) => void;
  getActivePlayers: () => TournamentPlayer[];
  getRoundName: () => string;
  reset: () => void;
}

export const useTournamentStore = create<TournamentState>((set, get) => ({
  players: [],
  matches: [],
  currentMatchIndex: 0,
  currentRound: 1,
  totalRounds: 0,
  isActive: false,
  champion: null,

  startTournament: (playerNames) => {
    const players: TournamentPlayer[] = playerNames.map((name, i) => ({
      name,
      seed: i + 1,
      eliminated: false,
      wins: 0,
    }));

    const totalRounds = Math.ceil(Math.log2(playerNames.length));

    // Generate first round matches
    const matches: TournamentMatch[] = [];
    for (let i = 0; i < playerNames.length; i += 2) {
      if (i + 1 < playerNames.length) {
        matches.push({
          player1Index: i,
          player2Index: i + 1,
          winner: null,
          round: 1,
        });
      }
    }

    set({
      players,
      matches,
      currentMatchIndex: 0,
      currentRound: 1,
      totalRounds,
      isActive: true,
      champion: null,
    });
  },

  getCurrentMatch: () => {
    const { matches, currentMatchIndex } = get();
    if (currentMatchIndex >= matches.length) return null;
    return matches[currentMatchIndex];
  },

  recordResult: (winnerIndex) => {
    const { matches, currentMatchIndex, players, currentRound } = get();
    if (currentMatchIndex >= matches.length) return;

    const match = matches[currentMatchIndex];
    const loserIndex = winnerIndex === match.player1Index ? match.player2Index : match.player1Index;

    // Update match
    const updatedMatches = [...matches];
    updatedMatches[currentMatchIndex] = { ...match, winner: winnerIndex };

    // Update players
    const updatedPlayers = [...players];
    updatedPlayers[winnerIndex] = { ...updatedPlayers[winnerIndex], wins: updatedPlayers[winnerIndex].wins + 1 };
    updatedPlayers[loserIndex] = { ...updatedPlayers[loserIndex], eliminated: true };

    const nextMatchIndex = currentMatchIndex + 1;

    // Check if current round is complete
    const roundMatches = updatedMatches.filter(m => m.round === currentRound);
    const roundComplete = roundMatches.every(m => m.winner !== null);

    if (roundComplete) {
      // Get winners of this round
      const winners = roundMatches.map(m => m.winner!);

      if (winners.length <= 1) {
        // Tournament over — we have a champion
        set({
          matches: updatedMatches,
          players: updatedPlayers,
          currentMatchIndex: nextMatchIndex,
          champion: updatedPlayers[winners[0]].name,
          isActive: false,
        });
        return;
      }

      // Generate next round matches
      const nextRound = currentRound + 1;
      const newMatches: TournamentMatch[] = [];
      for (let i = 0; i < winners.length; i += 2) {
        if (i + 1 < winners.length) {
          newMatches.push({
            player1Index: winners[i],
            player2Index: winners[i + 1],
            winner: null,
            round: nextRound,
          });
        }
      }

      set({
        matches: [...updatedMatches, ...newMatches],
        players: updatedPlayers,
        currentMatchIndex: updatedMatches.length, // Start of new round matches
        currentRound: nextRound,
      });
    } else {
      // More matches in this round
      set({
        matches: updatedMatches,
        players: updatedPlayers,
        currentMatchIndex: nextMatchIndex,
      });
    }
  },

  getActivePlayers: () => {
    return get().players.filter(p => !p.eliminated);
  },

  getRoundName: () => {
    const { currentRound, players } = get();
    const remaining = players.filter(p => !p.eliminated).length;
    if (remaining <= 2) return 'Finals';
    if (remaining <= 4) return 'Semifinals';
    if (remaining <= 8) return 'Quarterfinals';
    return `Round ${currentRound}`;
  },

  reset: () => set({
    players: [],
    matches: [],
    currentMatchIndex: 0,
    currentRound: 1,
    totalRounds: 0,
    isActive: false,
    champion: null,
  }),
}));
