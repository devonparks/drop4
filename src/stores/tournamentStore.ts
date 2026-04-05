import { create } from 'zustand';

// ═══════════════════════════════════════════════════════
// TOURNAMENT SYSTEM — Prize pools, payouts, ranked mode
// Supports 4/8/16 player brackets, entry fees, and
// poker-style payout structures (1st takes most, 2nd
// gets money back, rest lose their entry fee)
// ═══════════════════════════════════════════════════════

export interface TournamentPlayer {
  name: string;
  seed: number;
  eliminated: boolean;
  wins: number;
  isBye?: boolean;
  finalPlace?: number; // 1st, 2nd, 3rd, etc. — set when eliminated or champion
}

export interface TournamentMatch {
  player1Index: number;
  player2Index: number;
  winner: number | null;
  round: number;
}

export interface TournamentPayout {
  place: number;
  percentage: number;
  amount: number;
}

export interface TournamentConfig {
  playerCount: 4 | 8 | 16;
  entryFee: number;         // 0 for free tournaments
  prizePool: number;        // entryFee × playerCount
  payouts: TournamentPayout[];
  isRanked: boolean;        // Affects MMR
  format: 'single_elimination' | 'double_elimination';
  /** Free tournament fixed prizes (when entryFee = 0) */
  freePrizes?: { place: number; coins: number }[];
}

// ═══ PAYOUT STRUCTURES ═══
// Poker-style: top finishers get paid, rest lose entry

/**
 * Calculate prize pool and payouts for a tournament.
 * - 4 players: 1st = 60%, 2nd = 25%, 3rd/4th lose
 * - 8 players: 1st = 50%, 2nd = 25%, 3rd = 12.5%, rest lose
 * - 16 players: 1st = 40%, 2nd = 20%, 3rd = 12%, 4th = 8%, rest lose
 */
export function calculatePrizePool(playerCount: 4 | 8 | 16, entryFee: number): {
  prizePool: number;
  payouts: TournamentPayout[];
} {
  const prizePool = playerCount * entryFee;

  if (entryFee === 0) {
    // Free tournament — fixed prizes from the game
    return {
      prizePool: 0,
      payouts: [],
    };
  }

  let payouts: TournamentPayout[];

  switch (playerCount) {
    case 4:
      payouts = [
        { place: 1, percentage: 60, amount: Math.floor(prizePool * 0.60) },
        { place: 2, percentage: 25, amount: Math.floor(prizePool * 0.25) },
        // 3rd/4th get nothing (lose entry)
      ];
      break;

    case 8:
      payouts = [
        { place: 1, percentage: 50, amount: Math.floor(prizePool * 0.50) },
        { place: 2, percentage: 25, amount: Math.floor(prizePool * 0.25) },
        { place: 3, percentage: 12.5, amount: Math.floor(prizePool * 0.125) },
        // 4th-8th get nothing
      ];
      break;

    case 16:
      payouts = [
        { place: 1, percentage: 40, amount: Math.floor(prizePool * 0.40) },
        { place: 2, percentage: 20, amount: Math.floor(prizePool * 0.20) },
        { place: 3, percentage: 12, amount: Math.floor(prizePool * 0.12) },
        { place: 4, percentage: 8, amount: Math.floor(prizePool * 0.08) },
        // 5th-16th get nothing
      ];
      break;
  }

  return { prizePool, payouts };
}

/** Get the payout for a specific placement, or 0 if not in the money */
export function getPayoutForPlace(
  payouts: TournamentPayout[],
  place: number,
): number {
  const payout = payouts.find(p => p.place === place);
  return payout ? payout.amount : 0;
}

/** Default free tournament prizes */
export const FREE_TOURNAMENT_PRIZES: { place: number; coins: number }[] = [
  { place: 1, coins: 500 },
  { place: 2, coins: 200 },
  { place: 3, coins: 100 },
];

// ═══ STORE ═══

interface TournamentState {
  players: TournamentPlayer[];
  matches: TournamentMatch[];
  currentMatchIndex: number;
  currentRound: number;
  totalRounds: number;
  isActive: boolean;
  champion: string | null;

  // Prize pool / config
  config: TournamentConfig | null;
  eliminationOrder: number[]; // Player indices in order of elimination (first eliminated = last)

  // Actions
  startTournament: (playerNames: string[], config?: Partial<TournamentConfig>) => void;
  getCurrentMatch: () => TournamentMatch | null;
  recordResult: (winnerIndex: number, isDraw?: boolean) => void;
  getActivePlayers: () => TournamentPlayer[];
  getRoundName: () => string;
  getPlayerPayout: (playerIndex: number) => number;
  getFinalStandings: () => { name: string; place: number; payout: number }[];
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
  config: null,
  eliminationOrder: [],

  startTournament: (playerNames, configOverride) => {
    // Determine bracket size
    const rawCount = playerNames.length;
    const bracketSize = Math.pow(2, Math.ceil(Math.log2(rawCount))) as 4 | 8 | 16;
    const playerCount = (rawCount <= 4 ? 4 : rawCount <= 8 ? 8 : 16) as 4 | 8 | 16;
    const byeCount = bracketSize - rawCount;

    // Build config
    const entryFee = configOverride?.entryFee ?? 0;
    const isRanked = configOverride?.isRanked ?? false;
    const { prizePool, payouts } = calculatePrizePool(playerCount, entryFee);

    const config: TournamentConfig = {
      playerCount,
      entryFee,
      prizePool,
      payouts,
      isRanked,
      format: configOverride?.format ?? 'single_elimination',
      freePrizes: entryFee === 0 ? FREE_TOURNAMENT_PRIZES : undefined,
    };

    const players: TournamentPlayer[] = playerNames.map((name, i) => ({
      name,
      seed: i + 1,
      eliminated: false,
      wins: 0,
      isBye: false,
    }));

    for (let b = 0; b < byeCount; b++) {
      players.push({
        name: 'BYE',
        seed: rawCount + b + 1,
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

    // Auto-advance BYE matches
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
    }

    const firstUnplayed = matches.findIndex(m => m.winner === null);

    if (firstUnplayed === -1) {
      // All first round were byes — advance to round 2
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
        currentMatchIndex: matches.length,
        currentRound: nextRound,
        totalRounds,
        isActive: true,
        champion: null,
        config,
        eliminationOrder: [],
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
        config,
        eliminationOrder: [],
      });
    }
  },

  getCurrentMatch: () => {
    const { matches, currentMatchIndex } = get();
    if (currentMatchIndex >= matches.length) return null;
    return matches[currentMatchIndex];
  },

  recordResult: (winnerIndex, isDraw = false) => {
    const { matches, currentMatchIndex, players, currentRound, eliminationOrder } = get();
    if (currentMatchIndex >= matches.length) return;

    const match = matches[currentMatchIndex];

    let resolvedWinner = winnerIndex;
    if (isDraw) {
      const seed1 = players[match.player1Index].seed;
      const seed2 = players[match.player2Index].seed;
      resolvedWinner = seed1 <= seed2 ? match.player1Index : match.player2Index;
    }

    const loserIndex = resolvedWinner === match.player1Index ? match.player2Index : match.player1Index;

    const updatedMatches = [...matches];
    updatedMatches[currentMatchIndex] = { ...match, winner: resolvedWinner };

    const updatedPlayers = [...players];
    updatedPlayers[resolvedWinner] = { ...updatedPlayers[resolvedWinner], wins: updatedPlayers[resolvedWinner].wins + 1 };
    updatedPlayers[loserIndex] = { ...updatedPlayers[loserIndex], eliminated: true };

    // Track elimination order (loser gets added)
    const newEliminationOrder = [...eliminationOrder, loserIndex];

    // Check if current round is complete
    const roundMatches = updatedMatches.filter(m => m.round === currentRound);
    const roundComplete = roundMatches.every(m => m.winner !== null);

    if (roundComplete) {
      const winners = roundMatches.map(m => m.winner!);

      if (winners.length <= 1) {
        // Tournament over — assign final places
        const champIdx = winners[0];
        updatedPlayers[champIdx] = { ...updatedPlayers[champIdx], finalPlace: 1 };

        // Assign places based on elimination order (last eliminated = 2nd, etc.)
        const realEliminations = newEliminationOrder.filter(
          idx => !updatedPlayers[idx].isBye
        );
        for (let i = realEliminations.length - 1; i >= 0; i--) {
          const place = realEliminations.length - i + 1; // 2nd, 3rd, 4th...
          updatedPlayers[realEliminations[i]] = {
            ...updatedPlayers[realEliminations[i]],
            finalPlace: place,
          };
        }

        set({
          matches: updatedMatches,
          players: updatedPlayers,
          currentMatchIndex: currentMatchIndex + 1,
          champion: updatedPlayers[champIdx].name,
          isActive: false,
          eliminationOrder: newEliminationOrder,
        });
        return;
      }

      // Generate next round
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

      // Auto-advance BYEs (safety)
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
        eliminationOrder: newEliminationOrder,
      });
    } else {
      let nextIdx = currentMatchIndex + 1;
      while (nextIdx < updatedMatches.length && updatedMatches[nextIdx].winner !== null) {
        nextIdx++;
      }

      set({
        matches: updatedMatches,
        players: updatedPlayers,
        currentMatchIndex: nextIdx,
        eliminationOrder: newEliminationOrder,
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

  /** Get payout amount for a specific player index */
  getPlayerPayout: (playerIndex) => {
    const { config, players } = get();
    if (!config) return 0;
    const player = players[playerIndex];
    if (!player || !player.finalPlace) return 0;

    if (config.entryFee === 0 && config.freePrizes) {
      const prize = config.freePrizes.find(p => p.place === player.finalPlace);
      return prize ? prize.coins : 0;
    }

    return getPayoutForPlace(config.payouts, player.finalPlace);
  },

  /** Get final standings with payouts for the results screen */
  getFinalStandings: () => {
    const { players, config } = get();
    if (!config) return [];

    const realPlayers = players.filter(p => !p.isBye);

    return realPlayers
      .map(p => {
        const place = p.finalPlace ?? realPlayers.length;
        let payout = 0;

        if (config.entryFee === 0 && config.freePrizes) {
          const prize = config.freePrizes.find(fp => fp.place === place);
          payout = prize ? prize.coins : 0;
        } else {
          payout = getPayoutForPlace(config.payouts, place);
        }

        return {
          name: p.name,
          place,
          payout,
        };
      })
      .sort((a, b) => a.place - b.place);
  },

  reset: () => set({
    players: [],
    matches: [],
    currentMatchIndex: 0,
    currentRound: 1,
    totalRounds: 0,
    isActive: false,
    champion: null,
    config: null,
    eliminationOrder: [],
  }),
}));
