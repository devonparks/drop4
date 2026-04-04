// AMG Studios Ecosystem — shared across all games
// Drop4 is the first game. These constants define the platform.

export const ECOSYSTEM = {
  studio: 'AMG Studios',
  platformVersion: '1.0.0',
  currentGame: 'Drop4',

  // Games in the ecosystem (planned order)
  games: [
    { id: 'drop4', name: 'Drop4', status: 'active', type: 'Connect 4' },
    { id: 'tictactoe', name: 'Tic Tac Toe', status: 'planned', type: 'Tic Tac Toe' },
    { id: 'checkers', name: 'Checkers', status: 'planned', type: 'Checkers' },
    { id: 'chess', name: 'Chess', status: 'planned', type: 'Chess' },
    { id: 'rps', name: 'Rock Paper Scissors', status: 'planned', type: 'RPS' },
  ],

  // Shared systems (reused by all games)
  sharedSystems: [
    'Account & Auth',
    'Character Creator',
    'Coin Economy',
    'Shop & Cosmetics',
    'Career Mode Framework',
    'Ranked Mode (ELO)',
    'Wager Courts (Gold Court)',
    'Battle Pass',
    'Daily Challenges',
    'Achievements',
    'Leaderboards',
    'Replay System',
    'Matchmaking',
  ],

  // Season schedule
  seasonDuration: '2 months',
  seasonsPerYear: 6,
};
