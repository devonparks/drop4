// Wager tables for Gold Court — updated per April 4 design doc
// Three buy-in tiers: 10, 100, 1000 coins
// Separate from ranked — risk currency, not rank

export interface WagerTable {
  id: string;
  name: string;
  buyIn: number;
  winnerGets: number;
  icon: string;
  bgColor: string;
  borderColor: string;
  description: string;
  minLevel?: number;
}

export const WAGER_TABLES: WagerTable[] = [
  {
    id: 'free',
    name: 'Practice Table',
    buyIn: 0,
    winnerGets: 0,
    icon: '🏀',
    bgColor: 'rgba(39,174,61,0.1)',
    borderColor: 'rgba(39,174,61,0.3)',
    description: 'No stakes. Warm up here.',
  },
  {
    id: 'table_10',
    name: '10 Coin Table',
    buyIn: 10,
    winnerGets: 20,
    icon: '🪙',
    bgColor: 'rgba(205,127,50,0.1)',
    borderColor: 'rgba(205,127,50,0.3)',
    description: 'Low stakes. Get your feet wet.',
  },
  {
    id: 'table_100',
    name: '100 Coin Table',
    buyIn: 100,
    winnerGets: 200,
    icon: '💰',
    bgColor: 'rgba(192,192,192,0.1)',
    borderColor: 'rgba(192,192,192,0.3)',
    description: 'Mid stakes. Prove yourself.',
    minLevel: 3,
  },
  {
    id: 'table_1000',
    name: '1,000 Coin Table',
    buyIn: 1000,
    winnerGets: 2000,
    icon: '👑',
    bgColor: 'rgba(241,196,15,0.1)',
    borderColor: 'rgba(241,196,15,0.3)',
    description: 'High stakes. Only the brave.',
    minLevel: 5,
  },
  {
    id: 'table_5000',
    name: '5,000 Coin Table',
    buyIn: 5000,
    winnerGets: 10000,
    icon: '💎',
    bgColor: 'rgba(52,152,219,0.1)',
    borderColor: 'rgba(52,152,219,0.3)',
    description: 'Diamond tier. Big risk, big reward.',
    minLevel: 10,
  },
  {
    id: 'table_10000',
    name: '10,000 Coin Table',
    buyIn: 10000,
    winnerGets: 20000,
    icon: '🌌',
    bgColor: 'rgba(233,69,96,0.1)',
    borderColor: 'rgba(233,69,96,0.3)',
    description: 'Dark Matter. The ultimate test.',
    minLevel: 15,
  },
];

// Spectator system data
export interface SpectatorMatch {
  id: string;
  player1: { name: string; elo: number; tier: string };
  player2: { name: string; elo: number; tier: string };
  tableId: string;
  moveCount: number;
  spectators: number;
}
