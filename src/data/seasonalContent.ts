/**
 * Season 0: Launch — Seasonal content definitions
 *
 * Defines which cosmetics live in the battle pass (free/premium tracks),
 * which are purchasable in the shop, and which are earnable through gameplay.
 */

export type ObtainMethod =
  | 'battlepass_free'      // Earnable on the free track
  | 'battlepass_premium'   // Requires premium pass
  | 'shop'                 // Direct coin purchase
  | 'career'               // Career mode progression
  | 'achievement'          // Unlocked via achievements
  | 'wager'                // Wager court exclusive
  | 'ranked';              // Ranked-mode exclusive (e.g., Dark Matter rank)

export interface SeasonItem {
  id: string;
  name: string;
  type: 'board' | 'pieces' | 'emote' | 'effect' | 'title';
  icon: string;
  obtainMethod: ObtainMethod;
  /** Battle pass tier (1-8), only for battlepass items */
  battlePassTier?: number;
  /** Shop price in coins, only for shop items */
  price?: number;
  /** How to earn, for earnable/career/achievement items */
  earnCondition?: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary' | 'darkmatter';
}

// ─── Season 0: Full Content Catalog ──────────────────────────────────────────

export const SEASON_0_CONTENT: SeasonItem[] = [
  // ── Battle Pass — Free Track ───────────────────────────────────────────
  { id: 'coins_100', name: '100 Coins', type: 'board', icon: '🪙', obtainMethod: 'battlepass_free', battlePassTier: 1, rarity: 'common' },
  { id: 'coins_200', name: '200 Coins', type: 'board', icon: '🪙', obtainMethod: 'battlepass_free', battlePassTier: 2, rarity: 'common' },
  { id: 'coins_300', name: '300 Coins', type: 'board', icon: '🪙', obtainMethod: 'battlepass_free', battlePassTier: 4, rarity: 'common' },
  { id: 'pieces_fire_ice', name: 'Fire & Ice Pieces', type: 'pieces', icon: '🔥', obtainMethod: 'battlepass_free', battlePassTier: 5, rarity: 'rare' },
  { id: 'coins_500', name: '500 Coins', type: 'board', icon: '🪙', obtainMethod: 'battlepass_free', battlePassTier: 6, rarity: 'common' },
  { id: 'coins_1000', name: '1000 Coins', type: 'board', icon: '🪙', obtainMethod: 'battlepass_free', battlePassTier: 8, rarity: 'common' },

  // ── Battle Pass — Premium Track ────────────────────────────────────────
  { id: 'pieces_chrome', name: 'Chrome Pieces', type: 'pieces', icon: '🔴', obtainMethod: 'battlepass_premium', battlePassTier: 1, rarity: 'rare' },
  { id: 'board_wood', name: 'Wood Board', type: 'board', icon: '🎨', obtainMethod: 'battlepass_premium', battlePassTier: 2, rarity: 'common' },
  { id: 'emote_dance', name: 'Dance Emote', type: 'emote', icon: '💃', obtainMethod: 'battlepass_premium', battlePassTier: 3, rarity: 'rare' },
  { id: 'effect_sparks', name: 'Spark Drop Effect', type: 'effect', icon: '✨', obtainMethod: 'battlepass_premium', battlePassTier: 4, rarity: 'rare' },
  { id: 'board_neon', name: 'Neon Board', type: 'board', icon: '🎨', obtainMethod: 'battlepass_premium', battlePassTier: 5, rarity: 'rare' },
  { id: 'pieces_neon', name: 'Neon Pieces', type: 'pieces', icon: '💜', obtainMethod: 'battlepass_premium', battlePassTier: 6, rarity: 'epic' },
  { id: 'emote_crown', name: 'Crown Pose Emote', type: 'emote', icon: '👑', obtainMethod: 'battlepass_premium', battlePassTier: 7, rarity: 'epic' },
  { id: 'board_galaxy', name: 'Galaxy Board', type: 'board', icon: '🌌', obtainMethod: 'battlepass_premium', battlePassTier: 8, rarity: 'epic' },

  // ── Shop Purchasable ───────────────────────────────────────────────────
  // Boards
  { id: 'board_wood', name: 'Wooden Board', type: 'board', icon: '🎨', obtainMethod: 'shop', price: 500, rarity: 'common' },
  { id: 'board_neon', name: 'Neon Glow Board', type: 'board', icon: '🎨', obtainMethod: 'shop', price: 1000, rarity: 'rare' },
  { id: 'board_galaxy', name: 'Galaxy Board', type: 'board', icon: '🌌', obtainMethod: 'shop', price: 2000, rarity: 'epic' },
  { id: 'board_ice', name: 'Ice Arena', type: 'board', icon: '❄️', obtainMethod: 'shop', price: 3000, rarity: 'epic' },
  { id: 'board_lava', name: 'Lava Pit', type: 'board', icon: '🌋', obtainMethod: 'shop', price: 4000, rarity: 'epic' },
  // Piece skins
  { id: 'pieces_chrome', name: 'Chrome Pieces', type: 'pieces', icon: '🔴', obtainMethod: 'shop', price: 750, rarity: 'rare' },
  { id: 'pieces_fire_ice', name: 'Fire & Ice', type: 'pieces', icon: '🔥', obtainMethod: 'shop', price: 1500, rarity: 'rare' },
  { id: 'pieces_neon', name: 'Neon Pieces', type: 'pieces', icon: '💜', obtainMethod: 'shop', price: 2000, rarity: 'epic' },
  { id: 'pieces_holo', name: 'Holographic Pieces', type: 'pieces', icon: '✨', obtainMethod: 'shop', price: 3000, rarity: 'epic' },
  // Drop effects
  { id: 'effect_sparks', name: 'Sparks', type: 'effect', icon: '✨', obtainMethod: 'shop', price: 500, rarity: 'rare' },
  { id: 'effect_smoke', name: 'Smoke', type: 'effect', icon: '💨', obtainMethod: 'shop', price: 750, rarity: 'rare' },
  { id: 'effect_splash', name: 'Splash', type: 'effect', icon: '💦', obtainMethod: 'shop', price: 1000, rarity: 'rare' },
  { id: 'effect_lightning', name: 'Lightning Drop', type: 'effect', icon: '⚡', obtainMethod: 'shop', price: 2000, rarity: 'epic' },
  { id: 'effect_confetti', name: 'Confetti Drop', type: 'effect', icon: '🎉', obtainMethod: 'shop', price: 1500, rarity: 'epic' },
  { id: 'effect_shockwave', name: 'Shockwave', type: 'effect', icon: '💥', obtainMethod: 'shop', price: 3000, rarity: 'epic' },
  // Emotes
  { id: 'emote_shrug', name: 'Shrug', type: 'emote', icon: '🤷', obtainMethod: 'shop', price: 300, rarity: 'common' },
  { id: 'emote_flex', name: 'Flex', type: 'emote', icon: '💪', obtainMethod: 'shop', price: 500, rarity: 'rare' },
  { id: 'emote_dance', name: 'Dance', type: 'emote', icon: '💃', obtainMethod: 'shop', price: 1000, rarity: 'rare' },
  { id: 'emote_backflip', name: 'Backflip', type: 'emote', icon: '🤸', obtainMethod: 'shop', price: 2000, rarity: 'epic' },
  { id: 'emote_crown', name: 'Crown Pose', type: 'emote', icon: '👑', obtainMethod: 'shop', price: 3000, rarity: 'epic' },
  { id: 'emote_micdrop', name: 'Mic Drop', type: 'emote', icon: '🎙', obtainMethod: 'shop', price: 5000, rarity: 'legendary' },

  // ── Career Mode Exclusive ──────────────────────────────────────────────
  { id: 'board_gold', name: 'Gold Court', type: 'board', icon: '🥇', obtainMethod: 'career', earnCondition: 'Complete all Career stages', rarity: 'legendary' },
  { id: 'title_strategist', name: 'Title: Strategist', type: 'title', icon: '👑', obtainMethod: 'career', earnCondition: 'Beat Career on Hard difficulty', rarity: 'epic' },
  { id: 'title_drop_king', name: 'Title: Drop King', type: 'title', icon: '👑', obtainMethod: 'career', earnCondition: 'Perfect score all Career stages', rarity: 'legendary' },
  { id: 'title_darkmatter', name: 'Title: Dark Matter Elite', type: 'title', icon: '🌌', obtainMethod: 'career', earnCondition: 'Beat Career on Nightmare difficulty', rarity: 'darkmatter' },

  // ── Ranked / Wager Exclusive ───────────────────────────────────────────
  { id: 'board_darkmatter', name: 'Dark Matter Board', type: 'board', icon: '🌌', obtainMethod: 'ranked', earnCondition: 'Reach Dark Matter rank in Ranked mode', rarity: 'darkmatter' },
  { id: 'pieces_darkmatter', name: 'Dark Matter Pieces', type: 'pieces', icon: '🔴', obtainMethod: 'ranked', earnCondition: 'Reach Dark Matter rank in Ranked mode', rarity: 'darkmatter' },
  { id: 'effect_darkmatter', name: 'Dark Matter Drop', type: 'effect', icon: '🌌', obtainMethod: 'ranked', earnCondition: 'Reach Dark Matter rank in Ranked mode', rarity: 'darkmatter' },
  { id: 'emote_griddy', name: 'Griddy Emote', type: 'emote', icon: '🕺', obtainMethod: 'wager', earnCondition: 'Win 50 wager matches', rarity: 'darkmatter' },

  // ── Achievement Exclusive ──────────────────────────────────────────────
  { id: 'emote_celebrate', name: 'Celebrate Emote', type: 'emote', icon: '🎉', obtainMethod: 'achievement', earnCondition: 'Unlock all common achievements', rarity: 'rare' },
  { id: 'title_legend', name: 'Title: Legend', type: 'title', icon: '👑', obtainMethod: 'achievement', earnCondition: 'Win 500 total games', rarity: 'legendary' },
  { id: 'title_untouchable', name: 'Title: Untouchable', type: 'title', icon: '🌟', obtainMethod: 'achievement', earnCondition: '20-game win streak', rarity: 'darkmatter' },
];

// ─── Season 0 Info ───────────────────────────────────────────────────────────

export const SEASON_INFO = {
  number: 0,
  name: 'Season 0: Launch',
  startDate: '2026-04-30',
  endDate: '2026-06-30',
  theme: 'The beginning of the Drop4 era',
  totalBattlePassTiers: 8,
  xpPerTier: 500,
  premiumPrice: 500, // gems
};

// ─── Helper Functions ────────────────────────────────────────────────────────

/** Get all battle pass items (both tracks) */
export function getBattlePassItems(): SeasonItem[] {
  return SEASON_0_CONTENT.filter(
    i => i.obtainMethod === 'battlepass_free' || i.obtainMethod === 'battlepass_premium'
  );
}

/** Get free-track reward for a given tier */
export function getFreeTierReward(tier: number): SeasonItem | undefined {
  return SEASON_0_CONTENT.find(
    i => i.obtainMethod === 'battlepass_free' && i.battlePassTier === tier
  );
}

/** Get premium-track reward for a given tier */
export function getPremiumTierReward(tier: number): SeasonItem | undefined {
  return SEASON_0_CONTENT.find(
    i => i.obtainMethod === 'battlepass_premium' && i.battlePassTier === tier
  );
}

/** Get all shop-purchasable items */
export function getShopItems(): SeasonItem[] {
  return SEASON_0_CONTENT.filter(i => i.obtainMethod === 'shop');
}

/** Get items by type */
export function getItemsByType(type: SeasonItem['type']): SeasonItem[] {
  return SEASON_0_CONTENT.filter(i => i.type === type);
}

/** Get items by obtain method */
export function getItemsByMethod(method: ObtainMethod): SeasonItem[] {
  return SEASON_0_CONTENT.filter(i => i.obtainMethod === method);
}
