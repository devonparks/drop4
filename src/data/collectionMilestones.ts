/**
 * Collection Milestones — unique rewards for completing cosmetic packs.
 *
 * Turns 152 outfits + 16 pets from "cool inventory" into "progression
 * engine." Complete a themed pack → get a bespoke reward you can't
 * buy otherwise.
 *
 * Consumers: the achievement/reward popup system pops a modal when the
 * player crosses a milestone threshold. Ownership changes are detected
 * by subscribing to useCharacterStore.ownedOutfits / usePetStore.ownedPets.
 */

import { PACKS } from './outfitRegistry';

type MilestoneRewardType = 'title' | 'emote' | 'coins' | 'hair_color';

export interface CollectionMilestone {
  id: string;
  name: string;
  description: string;
  /** How many outfits from the pack must be owned */
  requiredCount: number;
  /** Pack slug from PACKS in outfitRegistry.ts (e.g. "modern_civilians") */
  packSlug?: string;
  /** Alternative: count across specific outfit IDs */
  specificOutfitIds?: string[];
  /** Alternative: number of TOTAL owned outfits across all packs */
  anyOutfitsTotal?: number;
  /** Alternative: number of pets owned */
  anyPetsTotal?: number;
  /** Alternative: number of distinct SPECIES */
  uniqueSpeciesCount?: number;
  // Reward
  reward: {
    type: MilestoneRewardType;
    name: string;
    icon: string;
    value: string | number;
  };
}

const COLLECTION_MILESTONES: CollectionMilestone[] = [
  // Pack completionists
  {
    id: 'civilian_complete',
    name: 'Street Style',
    description: 'Own all 12 Modern Civilians outfits',
    requiredCount: 12,
    packSlug: 'modern_civilians',
    reward: { type: 'title', name: 'Urban Legend', icon: '\u{1F3D9}\uFE0F', value: 'urban_legend' },
  },
  {
    id: 'police_complete',
    name: 'Long Arm',
    description: 'Own all 9 Modern Police outfits',
    requiredCount: 9,
    packSlug: 'modern_police',
    reward: { type: 'title', name: 'Enforcer', icon: '\u{1F46E}', value: 'enforcer' },
  },
  {
    id: 'apocalypse_complete',
    name: 'Last Survivor',
    description: 'Own all Apocalypse outfits (Outlaws + Survivors)',
    requiredCount: 15, // 10 outlaws + 5 survivors
    reward: { type: 'title', name: 'Wasteland Walker', icon: '\u{1F3F4}', value: 'wasteland_walker' },
  },
  {
    id: 'knights_complete',
    name: 'Round Table',
    description: 'Own all 8 Fantasy Knights outfits',
    requiredCount: 8,
    packSlug: 'fantasy_knights',
    reward: { type: 'title', name: 'Knight Commander', icon: '\u{1F6E1}\uFE0F', value: 'knight_commander' },
  },
  {
    id: 'samurai_complete',
    name: 'Bushido',
    description: 'Own all 9 Samurai Warriors outfits',
    requiredCount: 9,
    packSlug: 'samurai_warriors',
    reward: { type: 'title', name: 'Shogun', icon: '\u{1F5E1}\uFE0F', value: 'shogun' },
  },
  {
    id: 'vikings_complete',
    name: 'Valhalla',
    description: 'Own all 6 Viking Warriors outfits',
    requiredCount: 6,
    packSlug: 'viking_warriors',
    reward: { type: 'title', name: 'Jarl', icon: '\u2694\uFE0F', value: 'jarl' },
  },
  {
    id: 'elves_complete',
    name: 'Mithril Guard',
    description: 'Own all 6 Elven Warriors outfits',
    requiredCount: 6,
    packSlug: 'elven_warriors',
    reward: { type: 'title', name: 'Elder of the Wood', icon: '\u{1F9DD}', value: 'elder_wood' },
  },
  {
    id: 'pirates_complete',
    name: 'Captain of the Seven Seas',
    description: 'Own all 10 Pirate Captains outfits',
    requiredCount: 10,
    packSlug: 'pirate_captains',
    reward: { type: 'title', name: 'Dread Captain', icon: '\u2620\uFE0F', value: 'dread_captain' },
  },

  // Cross-pack total outfits
  {
    id: 'total_25',
    name: 'Wardrobe',
    description: 'Own 25 total outfits',
    requiredCount: 25,
    anyOutfitsTotal: 25,
    reward: { type: 'coins', name: '2,500 Coins', icon: '\u{1FA99}', value: 2500 },
  },
  {
    id: 'total_50',
    name: 'Dresser',
    description: 'Own 50 total outfits',
    requiredCount: 50,
    anyOutfitsTotal: 50,
    reward: { type: 'coins', name: '5,000 Coins', icon: '\u{1FA99}', value: 5000 },
  },
  {
    id: 'total_100',
    name: 'Fashion Icon',
    description: 'Own 100 total outfits',
    requiredCount: 100,
    anyOutfitsTotal: 100,
    reward: { type: 'title', name: 'Fashion Icon', icon: '\u{1F451}', value: 'fashion_icon' },
  },
  {
    id: 'total_all',
    name: 'Completionist',
    description: 'Own all 152 outfits',
    requiredCount: 152,
    anyOutfitsTotal: 152,
    reward: { type: 'title', name: 'Grand Wardrobe', icon: '\u{1F3C6}', value: 'grand_wardrobe' },
  },

  // Species collectors
  {
    id: 'all_species',
    name: 'Shapeshifter',
    description: 'Own at least one outfit from all 5 species',
    requiredCount: 5,
    uniqueSpeciesCount: 5,
    reward: { type: 'title', name: 'Shapeshifter', icon: '\u{1FA9E}', value: 'shapeshifter' },
  },

  // Pet collectors
  {
    id: 'pets_5',
    name: 'Dog Lover',
    description: 'Own 5 pets',
    requiredCount: 5,
    anyPetsTotal: 5,
    reward: { type: 'title', name: 'Dog Lover', icon: '\u{1F43E}', value: 'dog_lover' },
  },
  {
    id: 'pets_all',
    name: 'Pack Leader',
    description: 'Own all 16 pets',
    requiredCount: 16,
    anyPetsTotal: 16,
    reward: { type: 'title', name: 'Pack Leader', icon: '\u{1F43A}', value: 'pack_leader' },
  },
];

/**
 * Check which milestones the player has newly earned but not yet claimed.
 *
 * @param ownedOutfits Current ownedOutfits array from characterStore
 * @param ownedPets Current ownedPets array from petStore
 * @param claimedIds Set of milestone IDs the player has already claimed
 * @returns Array of newly-earned milestones
 */
export function getNewlyEarnedMilestones(
  ownedOutfits: string[],
  ownedPets: string[],
  claimedIds: string[],
): CollectionMilestone[] {
  const earned: CollectionMilestone[] = [];
  const ownedSet = new Set(ownedOutfits);
  const petSet = new Set(ownedPets);

  // Precompute species count
  const speciesOwned = new Set<string>();
  for (const oid of ownedOutfits) {
    // Outfit IDs look like "human_modern_civilians_03" — first token is species
    const firstToken = oid.split('_')[0];
    if (['human', 'elves', 'goblin', 'skeleton', 'zombie'].includes(firstToken)) {
      speciesOwned.add(firstToken);
    }
  }

  for (const m of COLLECTION_MILESTONES) {
    if (claimedIds.includes(m.id)) continue;

    let qualifies = false;

    if (m.packSlug) {
      const pack = PACKS.find((p) => p.pack === m.packSlug);
      if (pack) {
        const countInPack = pack.outfitIds.filter((id) => ownedSet.has(id)).length;
        qualifies = countInPack >= m.requiredCount;
      }
    } else if (m.specificOutfitIds) {
      const count = m.specificOutfitIds.filter((id) => ownedSet.has(id)).length;
      qualifies = count >= m.requiredCount;
    } else if (m.anyOutfitsTotal !== undefined) {
      qualifies = ownedOutfits.length >= m.anyOutfitsTotal;
    } else if (m.anyPetsTotal !== undefined) {
      qualifies = ownedPets.length >= m.anyPetsTotal;
    } else if (m.uniqueSpeciesCount !== undefined) {
      qualifies = speciesOwned.size >= m.uniqueSpeciesCount;
    }

    if (qualifies) earned.push(m);
  }

  // Special case for apocalypse_complete (2 packs combined)
  if (!claimedIds.includes('apocalypse_complete')) {
    const outlaws = PACKS.find((p) => p.pack === 'apocalypse_outlaws');
    const survivors = PACKS.find((p) => p.pack === 'apocalypse_survivor');
    if (outlaws && survivors) {
      const count =
        outlaws.outfitIds.filter((id) => ownedSet.has(id)).length +
        survivors.outfitIds.filter((id) => ownedSet.has(id)).length;
      const m = COLLECTION_MILESTONES.find((x) => x.id === 'apocalypse_complete');
      if (m && count >= m.requiredCount && !earned.includes(m)) earned.push(m);
    }
  }

  // unused but keeping for future per-id precision
  void petSet;

  return earned;
}

/**
 * Snapshot of a single milestone's progress for UI display. `current` and
 * `required` drive the progress bar; `claimed` means the player has already
 * cashed in the reward (MilestoneToast → claim). `complete` means they've
 * hit the requirement — usually paired with claimed=false if the player
 * hasn't tapped through the popup yet, or claimed=true after they did.
 */
export interface MilestoneProgress {
  milestone: CollectionMilestone;
  current: number;
  required: number;
  fraction: number; // clamped 0..1
  complete: boolean;
  claimed: boolean;
}

/**
 * Compute progress for every milestone in the catalog. Used by the
 * Awards tab in CollectionScreen to show the full ladder so the
 * player can see what they're climbing toward — not just receive a
 * surprise toast when it lands.
 */
export function getMilestoneProgressList(
  ownedOutfits: string[],
  ownedPets: string[],
  claimedIds: string[],
): MilestoneProgress[] {
  const ownedSet = new Set(ownedOutfits);

  const speciesOwned = new Set<string>();
  for (const oid of ownedOutfits) {
    const firstToken = oid.split('_')[0];
    if (['human', 'elves', 'goblin', 'skeleton', 'zombie'].includes(firstToken)) {
      speciesOwned.add(firstToken);
    }
  }

  return COLLECTION_MILESTONES.map((m) => {
    let current = 0;
    const required = m.requiredCount;

    if (m.id === 'apocalypse_complete') {
      // Two-pack special case mirrored from getNewlyEarnedMilestones
      const outlaws = PACKS.find((p) => p.pack === 'apocalypse_outlaws');
      const survivors = PACKS.find((p) => p.pack === 'apocalypse_survivor');
      current =
        (outlaws ? outlaws.outfitIds.filter((id) => ownedSet.has(id)).length : 0) +
        (survivors ? survivors.outfitIds.filter((id) => ownedSet.has(id)).length : 0);
    } else if (m.packSlug) {
      const pack = PACKS.find((p) => p.pack === m.packSlug);
      current = pack
        ? pack.outfitIds.filter((id) => ownedSet.has(id)).length
        : 0;
    } else if (m.specificOutfitIds) {
      current = m.specificOutfitIds.filter((id) => ownedSet.has(id)).length;
    } else if (m.anyOutfitsTotal !== undefined) {
      current = ownedOutfits.length;
    } else if (m.anyPetsTotal !== undefined) {
      current = ownedPets.length;
    } else if (m.uniqueSpeciesCount !== undefined) {
      current = speciesOwned.size;
    }

    const fraction =
      required <= 0 ? 1 : Math.max(0, Math.min(1, current / required));
    return {
      milestone: m,
      current,
      required,
      fraction,
      complete: current >= required,
      claimed: claimedIds.includes(m.id),
    };
  });
}
