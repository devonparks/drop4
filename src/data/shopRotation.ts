/**
 * Shop Rotation — deterministic daily featured selection.
 *
 * Every player sees the same 4 featured cosmetics each day (rotates at
 * midnight local). Day-of-year seeds the picks so it's stable per day
 * but changes every 24 hours → FOMO → app opens.
 *
 * What rotates:
 *   1 "hot" outfit  — 30% off (highest rarity available)
 *   1 regular outfit — 20% off
 *   1 pet            — 25% off
 *   1 emote          — free for the day (if price > 0) or 50% off
 *
 * Rotation is seeded by:
 *   dayOfYear * 7919 (prime) + year * 31
 * This ensures variety across years (Jan 1 2026 ≠ Jan 1 2027).
 */

import { OUTFIT_SHOP_ITEMS, PET_SHOP_ITEMS, EMOTE_SHOP_ITEMS } from './cosmeticsShopCatalog';
import type { ShopItem } from './shopCatalog';

interface FeaturedDeal {
  item: ShopItem;
  originalPrice: number;
  discountedPrice: number;
  discountPct: number;
  category: 'outfit' | 'pet' | 'emote';
  badge: string;
}

export interface DailyFeatured {
  deals: FeaturedDeal[];
  /** ISO date string for the day these deals are valid (YYYY-MM-DD) */
  dateKey: string;
  /** Seconds until midnight (when rotation happens) */
  secondsToRefresh: number;
}

// Simple deterministic LCG — no crypto, no date library
function seededPick<T>(arr: T[], seed: number): T | undefined {
  if (arr.length === 0) return undefined;
  // Numerical Recipes LCG
  const a = 1664525;
  const c = 1013904223;
  const m = 2 ** 32;
  const x = (a * seed + c) >>> 0 % m;
  return arr[x % arr.length];
}

function dayOfYear(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 0);
  const diff = d.getTime() - start.getTime();
  return Math.floor(diff / 86_400_000);
}

function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function secondsUntilMidnight(d: Date): number {
  const next = new Date(d);
  next.setHours(24, 0, 0, 0);
  return Math.max(0, Math.floor((next.getTime() - d.getTime()) / 1000));
}

export function getDailyFeatured(now: Date = new Date()): DailyFeatured {
  const dayNum = dayOfYear(now);
  const yearSeed = now.getFullYear() * 31;
  const baseSeed = dayNum * 7919 + yearSeed;

  // Hot outfit: Epic+ only
  const premiumOutfits = OUTFIT_SHOP_ITEMS.filter(
    (i) => i.price > 0 && (i.rarity === 'epic' || i.rarity === 'legendary' || i.rarity === 'rare'),
  );
  const hotOutfit = seededPick(premiumOutfits, baseSeed);

  // Regular outfit: common/uncommon
  const regularOutfits = OUTFIT_SHOP_ITEMS.filter(
    (i) => i.price > 0 && (i.rarity === 'common' || i.rarity === 'uncommon'),
  );
  const regularOutfit = seededPick(regularOutfits, baseSeed + 101);

  // Pet: random paid pet
  const paidPets = PET_SHOP_ITEMS.filter((p) => p.price > 0);
  const pet = seededPick(paidPets, baseSeed + 211);

  // Emote: random paid emote
  const paidEmotes = EMOTE_SHOP_ITEMS.filter((e) => e.price > 0);
  const emote = seededPick(paidEmotes, baseSeed + 307);

  const deals: FeaturedDeal[] = [];
  if (hotOutfit) {
    deals.push({
      item: hotOutfit,
      originalPrice: hotOutfit.price,
      discountedPrice: Math.round(hotOutfit.price * 0.7),
      discountPct: 30,
      category: 'outfit',
      badge: '🔥 HOT',
    });
  }
  if (regularOutfit) {
    deals.push({
      item: regularOutfit,
      originalPrice: regularOutfit.price,
      discountedPrice: Math.round(regularOutfit.price * 0.8),
      discountPct: 20,
      category: 'outfit',
      badge: '-20%',
    });
  }
  if (pet) {
    deals.push({
      item: pet,
      originalPrice: pet.price,
      discountedPrice: Math.round(pet.price * 0.75),
      discountPct: 25,
      category: 'pet',
      badge: '🐕 -25%',
    });
  }
  if (emote) {
    deals.push({
      item: emote,
      originalPrice: emote.price,
      discountedPrice: Math.round(emote.price * 0.5),
      discountPct: 50,
      category: 'emote',
      badge: '💃 -50%',
    });
  }

  return {
    deals,
    dateKey: dateKey(now),
    secondsToRefresh: secondsUntilMidnight(now),
  };
}

