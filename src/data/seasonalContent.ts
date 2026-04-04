// Season 0: Launch — defines what content ships with the first season

export interface SeasonItem {
  id: string;
  name: string;
  type: 'board' | 'pieces' | 'emote' | 'effect' | 'title';
  icon: string;
  obtainMethod: 'battlepass_free' | 'battlepass_premium' | 'shop' | 'career' | 'achievement' | 'wager';
  battlePassTier?: number;
  price?: number;
}

export const SEASON_0_CONTENT: SeasonItem[] = [
  // Battle Pass Free Track
  { id: 'coins_100', name: '100 Coins', type: 'board', icon: '🪙', obtainMethod: 'battlepass_free', battlePassTier: 1 },
  { id: 'board_wood', name: 'Wood Board', type: 'board', icon: '🎨', obtainMethod: 'battlepass_free', battlePassTier: 2 },
  { id: 'coins_300', name: '300 Coins', type: 'board', icon: '🪙', obtainMethod: 'battlepass_free', battlePassTier: 4 },
  { id: 'pieces_fire_ice', name: 'Fire & Ice Pieces', type: 'pieces', icon: '🔥', obtainMethod: 'battlepass_free', battlePassTier: 5 },
  { id: 'coins_500', name: '500 Coins', type: 'board', icon: '🪙', obtainMethod: 'battlepass_free', battlePassTier: 6 },
  { id: 'coins_1000', name: '1000 Coins', type: 'board', icon: '🪙', obtainMethod: 'battlepass_free', battlePassTier: 8 },

  // Battle Pass Premium Track
  { id: 'pieces_chrome', name: 'Chrome Pieces', type: 'pieces', icon: '🔴', obtainMethod: 'battlepass_premium', battlePassTier: 1 },
  { id: 'board_neon', name: 'Neon Board', type: 'board', icon: '🎨', obtainMethod: 'battlepass_premium', battlePassTier: 3 },
  { id: 'effect_sparks', name: 'Spark Drop Effect', type: 'effect', icon: '✨', obtainMethod: 'battlepass_premium', battlePassTier: 4 },
  { id: 'pieces_neon', name: 'Neon Pieces', type: 'pieces', icon: '💜', obtainMethod: 'battlepass_premium', battlePassTier: 6 },
  { id: 'emote_dance', name: 'Dance Emote', type: 'emote', icon: '💃', obtainMethod: 'battlepass_premium', battlePassTier: 7 },
  { id: 'board_galaxy', name: 'Galaxy Board', type: 'board', icon: '🌌', obtainMethod: 'battlepass_premium', battlePassTier: 8 },

  // Shop Purchasable
  { id: 'board_ice', name: 'Ice Arena', type: 'board', icon: '❄️', obtainMethod: 'shop', price: 3000 },
  { id: 'board_lava', name: 'Lava Pit', type: 'board', icon: '🌋', obtainMethod: 'shop', price: 4000 },
  { id: 'pieces_holo', name: 'Holographic Pieces', type: 'pieces', icon: '✨', obtainMethod: 'shop', price: 3000 },
  { id: 'effect_lightning', name: 'Lightning Drop', type: 'effect', icon: '⚡', obtainMethod: 'shop', price: 2000 },
  { id: 'effect_confetti', name: 'Confetti Drop', type: 'effect', icon: '🎉', obtainMethod: 'shop', price: 1500 },

  // Career Exclusive
  { id: 'board_gold', name: 'Gold Court', type: 'board', icon: '🥇', obtainMethod: 'career' },
  { id: 'title_strategist', name: 'Title: Strategist', type: 'title', icon: '👑', obtainMethod: 'career' },
  { id: 'title_drop_king', name: 'Title: Drop King', type: 'title', icon: '👑', obtainMethod: 'career' },
  { id: 'title_darkmatter', name: 'Title: Dark Matter Elite', type: 'title', icon: '🌌', obtainMethod: 'career' },

  // Wager Court Exclusive
  { id: 'board_darkmatter', name: 'Dark Matter Board', type: 'board', icon: '🌌', obtainMethod: 'wager' },
  { id: 'pieces_darkmatter', name: 'Dark Matter Pieces', type: 'pieces', icon: '🔴', obtainMethod: 'wager' },

  // Achievement Exclusive
  { id: 'emote_celebrate', name: 'Celebrate Emote', type: 'emote', icon: '🎉', obtainMethod: 'achievement' },
  { id: 'title_legend', name: 'Title: Legend', type: 'title', icon: '👑', obtainMethod: 'achievement' },
  { id: 'title_untouchable', name: 'Title: Untouchable', type: 'title', icon: '🌟', obtainMethod: 'achievement' },
];

export const SEASON_INFO = {
  number: 0,
  name: 'Season 0: Launch',
  startDate: '2026-04-30',
  endDate: '2026-06-30',
  theme: 'The beginning of the Drop4 era',
  totalBattlePassTiers: 8,
  premiumPrice: 500, // gems
};
