import { create } from 'zustand';

export interface TournamentPlayer {
  name: string;
  seed: number;
  eliminated: boolean;
  wins: number;
  isBye?: boolean; // Auto-advance placeholder for odd bracket counts
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
  recordResult: (winnerIndex: number, isDraw?: boolean) => void;
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
    // Round up to next power of 2 and fill with BYE players
    const bracketSize = Math.pow(2, Math.ceil(Math.log2(playerNames.length)));
    const byeCount = bracketSize - playerNames.length;

    const players: TournamentPlayer[] = playerNames.map((name, i) => ({
      name,
      seed: i + 1,
      eliminated: false,
      wins: 0,
      isBye: false,
    }));

    // Add BYE placeholders at the end
    for (let b = 0; b < byeCount; b++) {
      players.push({
        name: 'BYE',
        seed: playerNames.length + b + 1,
        eliminated: false,
        wins: 0,
        isBye: true,
      });
    }

    const totalRounds = Math.ceil(Math.log2(bracketSize));

    // Generate first round matches
    const matches: TournamentMatch[] = [];
    for (let i = 0; i < players.length; i += 2) {
      matches.push({
        player1Index: i,
        player2Index: i + 1,
        winner: null,
        round: 1,
      });
    }

    // Auto-advance matches where a BYE is involved
    const updatedPlayers = [...players];
    for (const match of matches) {
      const p1Bye = updatedPlayers[match.player1Index].isBye;
      const p2Bye = updatedPlayers[match.player2Index].isBye;
      if (p1Bye && !p2Bye) {
        match.winner = match.player2Index;
        updatedPlayers[match.player1Index].eliminated = true;
      } else if (!p1Bye && p2Bye) {
        match.winner = match.player1Index;
        updatedPlayers[match.player2Index].eliminated = true;
      }
      // Both BYE would be impossible with real players present
    }

    // Find the first match that still needs to be played
    const firstUnplayed = matches.findIndex(m => m.winner === null);

    // Check if all first round matches were byes (unlikely but handle it)
    if (firstUnplayed === -1) {
      // All matches auto-resolved, generate next round immediately
      const winners = matches.map(m => m.winner!);
      const nextRound = 2;
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
        players: updatedPlayers,
        matches: [...matches, ...newMatches],
        currentMatchIndex: matches.length, // Start of round 2
        currentRound: nextRound,
        totalRounds,
        isActive: true,
        champion: null,
      });
    } else {
      set({
        players: updatedPlayers,
        matches,
        currentMatchIndex: firstUnplayed,
        currentRound: 1,
        totalRounds,
        isActive: true,
        champion: null,
      });
    }
  },

  getCurrentMatch: () => {
    const { matches, currentMatchIndex } = get();
    if (currentMatchIndex >= matches.length) return null;
    return matches[currentMatchIndex];
  },

  recordResult: (winnerIndex, isDraw = false) => {
    const { matches, currentMatchIndex, players, currentRound } = get();
    if (currentMatchIndex >= matches.length) return;

    const match = matches[currentMatchIndex];

    // Handle draw: lower-seeded player advances (common bracket convention)
    let resolvedWinner = winnerIndex;
    if (isDraw) {
      const seed1 = players[match.player1Index].seed;
      const seed2 = players[match.player2Index].seed;
      // Lower seed number = higher seed (better) = advances
      resolvedWinner = seed1 <= seed2 ? match.player1Index : match.player2Index;
    }

    const loserIndex = resolvedWinner === match.player1Index ? match.player2Index : match.player1Index;

    // Update match
    const updatedMatches = [...matches];
    updatedMatches[currentMatchIndex] = { ...match, winner: resolvedWinner };

    // Update players
    const updatedPlayers = [...players];
    updatedPlayers[resolvedWinner] = { ...updatedPlayers[resolvedWinner], wins: updatedPlayers[resolvedWinner].wins + 1 };
    updatedPlayers[loserIndex] = { ...updatedPlayers[loserIndex], eliminated: true };

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
          currentMatchIndex: currentMatchIndex + 1,
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

      // Auto-advance BYE matches in next round (shouldn't happen after round 1, but safe)
      for (const m of newMatches) {
        const p1Bye = updatedPlayers[m.player1Index].isBye;
        const p2Bye = updatedPlayers[m.player2Index].isBye;
        if (p1Bye && !p2Bye) {
          m.winner = m.player2Index;
          updatedPlayers[m.player1Index].eliminated = true;
        } else if (!p1Bye && p2Bye) {
          m.winner = m.player1Index;
          updatedPlayers[m.player2Index].eliminated = true;
        }
      }

      const allNewMatches = [...updatedMatches, ...newMatches];
      const firstUnplayed = allNewMatches.findIndex((m, idx) => idx >= updatedMatches.length && m.winner === null);

      set({
        matches: allNewMatches,
        players: updatedPlayers,
        currentMatchIndex: firstUnplayed !== -1 ? firstUnplayed : allNewMatches.length,
        currentRound: nextRound,
      });
    } else {
      // Find next unplayed match in this round (skip any auto-resolved BYE matches)
      let nextIdx = currentMatchIndex + 1;
      while (nextIdx < updatedMatches.length && updatedMatches[nextIdx].winner !== null) {
        nextIdx++;
      }

      set({
        matches: updatedMatches,
        players: updatedPlayers,
        currentMatchIndex: nextIdx,
      });
    }
  },

  getActivePlayers: () => {
    return get().players.filter(p => !p.eliminated && !p.isBye);
  },

  getRoundName: () => {
    const { currentRound, players } = get();
    const remaining = players.filter(p => !p.eliminated && !p.isBye).length;
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
