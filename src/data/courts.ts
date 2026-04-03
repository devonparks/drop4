export interface Court {
  id: string;
  name: string;
  buyIn: number;
  winnerGets: number;
  description: string;
  icon: string;
  bgColor: string;
  borderColor: string;
  unlockRequirement?: string;
}

export const COURTS: Court[] = [
  {
    id: 'playground',
    name: 'The Playground',
    buyIn: 0,
    winnerGets: 0,
    description: 'No stakes. Practice and casual play.',
    icon: '🏀',
    bgColor: 'rgba(39,174,61,0.1)',
    borderColor: 'rgba(39,174,61,0.3)',
  },
  {
    id: 'bronze',
    name: 'Bronze Court',
    buyIn: 100,
    winnerGets: 200,
    description: 'Entry level stakes. Low risk.',
    icon: '🥉',
    bgColor: 'rgba(205,127,50,0.1)',
    borderColor: 'rgba(205,127,50,0.3)',
  },
  {
    id: 'silver',
    name: 'Silver Court',
    buyIn: 500,
    winnerGets: 1000,
    description: 'Intermediate stakes.',
    icon: '🥈',
    bgColor: 'rgba(192,192,192,0.1)',
    borderColor: 'rgba(192,192,192,0.3)',
  },
  {
    id: 'gold',
    name: 'Gold Court',
    buyIn: 1000,
    winnerGets: 2000,
    description: 'Serious players only.',
    icon: '🥇',
    bgColor: 'rgba(255,209,102,0.1)',
    borderColor: 'rgba(255,209,102,0.3)',
  },
  {
    id: 'diamond',
    name: 'Diamond Court',
    buyIn: 5000,
    winnerGets: 10000,
    description: 'High rollers.',
    icon: '💎',
    bgColor: 'rgba(52,152,219,0.1)',
    borderColor: 'rgba(52,152,219,0.3)',
  },
  {
    id: 'darkmatter',
    name: 'Dark Matter Court',
    buyIn: 10000,
    winnerGets: 20000,
    description: 'Elite. Must qualify by winning on Diamond.',
    icon: '🌌',
    bgColor: 'rgba(233,69,96,0.1)',
    borderColor: 'rgba(233,69,96,0.3)',
    unlockRequirement: 'Win on Diamond Court',
  },
];
