// ═══════════════════════════════════════════════════════
// WAGER COURTS — NBA 2K Stage / Basketball Stars inspired
// 8 courts from free practice to 25K Dark Matter stakes
// Winner takes 2x entry minus a small house rake (5-10%)
// ═══════════════════════════════════════════════════════

import type { RankedTier } from '../stores/rankedStore';

export interface WagerCourt {
  id: string;
  name: string;
  description: string;
  icon: string;
  entryFee: number;
  winnerGets: number;       // entryFee × 2 minus rake
  rake: number;             // house cut percentage (5-10%)
  minLevel: number;
  minTier?: RankedTier;     // Some courts require ranked tier
  maxPlayers?: number;
  isVIP?: boolean;
  color: string;
  bgColor: string;
  borderColor: string;
}

export const WAGER_COURTS: WagerCourt[] = [
  {
    id: 'practice',
    name: 'Practice Court',
    description: 'No stakes. Warm up here.',
    icon: '🏀',
    entryFee: 0,
    winnerGets: 0,
    rake: 0,
    minLevel: 1,
    color: '#27ae3d',
    bgColor: 'rgba(39,174,61,0.1)',
    borderColor: 'rgba(39,174,61,0.3)',
  },
  {
    id: 'rookie_park',
    name: 'Rookie Park',
    description: 'Low stakes. Get your feet wet.',
    icon: '🪙',
    entryFee: 25,
    winnerGets: 45,       // 50 - 10% rake = 45
    rake: 10,
    minLevel: 1,
    color: '#cd7f32',
    bgColor: 'rgba(205,127,50,0.1)',
    borderColor: 'rgba(205,127,50,0.3)',
  },
  {
    id: 'street_court',
    name: 'Street Court',
    description: 'Prove yourself on the blacktop.',
    icon: '🔥',
    entryFee: 100,
    winnerGets: 180,      // 200 - 10% = 180
    rake: 10,
    minLevel: 3,
    color: '#c0c0c0',
    bgColor: 'rgba(192,192,192,0.1)',
    borderColor: 'rgba(192,192,192,0.3)',
  },
  {
    id: 'downtown_arena',
    name: 'Downtown Arena',
    description: 'Mid stakes. The crowd is watching.',
    icon: '🏟️',
    entryFee: 500,
    winnerGets: 900,      // 1000 - 10% = 900
    rake: 10,
    minLevel: 5,
    color: '#f1c40f',
    bgColor: 'rgba(241,196,15,0.1)',
    borderColor: 'rgba(241,196,15,0.3)',
  },
  {
    id: 'pro_stadium',
    name: 'Pro Stadium',
    description: 'High stakes. Only the brave.',
    icon: '⭐',
    entryFee: 1000,
    winnerGets: 1800,     // 2000 - 10% = 1800
    rake: 10,
    minLevel: 8,
    color: '#00cec9',
    bgColor: 'rgba(0,206,201,0.1)',
    borderColor: 'rgba(0,206,201,0.3)',
  },
  {
    id: 'elite_club',
    name: 'Elite Club',
    description: 'Gold tier required. Big risk, big reward.',
    icon: '💰',
    entryFee: 5000,
    winnerGets: 9000,     // 10000 - 10% = 9000
    rake: 10,
    minLevel: 12,
    minTier: 'gold',
    color: '#3498db',
    bgColor: 'rgba(52,152,219,0.1)',
    borderColor: 'rgba(52,152,219,0.3)',
  },
  {
    id: 'champions_ring',
    name: "Champion's Ring",
    description: 'Diamond tier. Where legends play.',
    icon: '💎',
    entryFee: 10000,
    winnerGets: 18000,    // 20000 - 10% = 18000
    rake: 10,
    minLevel: 15,
    minTier: 'diamond',
    color: '#e74c3c',
    bgColor: 'rgba(231,76,60,0.1)',
    borderColor: 'rgba(231,76,60,0.3)',
  },
  {
    id: 'darkmatter_court',
    name: 'Dark Matter Court',
    description: 'Master tier. The ultimate test.',
    icon: '🌌',
    entryFee: 25000,
    winnerGets: 45000,    // 50000 - 10% = 45000
    rake: 10,
    minLevel: 20,
    minTier: 'master',
    isVIP: true,
    color: '#e94560',
    bgColor: 'rgba(233,69,96,0.1)',
    borderColor: 'rgba(233,69,96,0.3)',
  },
];

// ═══ BACKWARD COMPAT ═══
// Old code that imported WagerTable + WAGER_TABLES still works
export type WagerTable = WagerCourt;
export const WAGER_TABLES = WAGER_COURTS;

// ═══ HELPERS ═══

/** Get a court by ID */
export function getCourtById(id: string): WagerCourt | undefined {
  return WAGER_COURTS.find(c => c.id === id);
}

/** Check if player can enter a court */
export function canEnterCourt(
  court: WagerCourt,
  playerCoins: number,
  playerLevel: number,
  playerTier: RankedTier,
): { allowed: boolean; reason?: string } {
  if (playerCoins < court.entryFee) {
    return { allowed: false, reason: `Need ${court.entryFee.toLocaleString()} coins` };
  }
  if (playerLevel < court.minLevel) {
    return { allowed: false, reason: `Level ${court.minLevel} required` };
  }
  if (court.minTier) {
    const tierOrder: RankedTier[] = [
      'iron', 'bronze', 'silver', 'gold', 'platinum',
      'diamond', 'master', 'grandmaster', 'champion', 'darkmatter',
    ];
    const playerIdx = tierOrder.indexOf(playerTier);
    const requiredIdx = tierOrder.indexOf(court.minTier);
    if (playerIdx < requiredIdx) {
      const tierNames: Record<RankedTier, string> = {
        iron: 'Iron', bronze: 'Bronze', silver: 'Silver', gold: 'Gold',
        platinum: 'Platinum', diamond: 'Diamond', master: 'Master',
        grandmaster: 'Grandmaster', champion: 'Champion', darkmatter: 'Dark Matter',
      };
      return { allowed: false, reason: `${tierNames[court.minTier]} tier required` };
    }
  }
  return { allowed: true };
}

// ═══ SPECTATOR DATA ═══
export interface SpectatorMatch {
  id: string;
  player1: { name: string; elo: number; tier: string };
  player2: { name: string; elo: number; tier: string };
  tableId: string;
  moveCount: number;
  spectators: number;
}
