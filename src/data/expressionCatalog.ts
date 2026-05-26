/**
 * Expression Catalog — all emojis & phrases available in-game.
 *
 * Starter items are free and always owned. Everything else is unlocked
 * through loot boxes, career rewards, challenges, or direct coin purchase.
 *
 * Rarity tiers drive:
 *  - Loot box drop rates (common drops most, legendary drops least)
 *  - Shard costs for direct unlock in the Shard Shop
 *  - Visual treatment in the expression panel (common = normal float,
 *    rare = glow, epic = particle trail, legendary = screen shake)
 *
 * 60 emojis  (8 starter + 52 unlockable)
 * 50 phrases (8 starter + 42 unlockable)
 * = 94 expression collectibles in the loot pool
 */

// ─── Types ────────────────────────────────────────────────────────────

export type ExpressionRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface EmojiItem {
  id: string;       // the actual emoji character (also the unique key)
  label: string;    // short name for accessibility / tooltips
  starter: boolean; // true = free, always owned
  price: number;    // coin cost for direct purchase (0 for starters)
  rarity: ExpressionRarity;
}

export interface PhraseItem {
  id: string;       // the phrase text (also the unique key)
  color: string;    // accent color for display
  starter: boolean;
  price: number;
  rarity: ExpressionRarity;
}

// ─── Emojis (60 total) ───────────────────────────────────────────────

export const ALL_EMOJIS: EmojiItem[] = [
  // ── Starters (8) — free, always owned ──
  { id: '\u{1F602}', label: 'Haha',       starter: true,  price: 0,    rarity: 'common' },  // 😂
  { id: '\u{1F525}', label: 'Fire',       starter: true,  price: 0,    rarity: 'common' },  // 🔥
  { id: '\u{1F624}', label: 'Angry',      starter: true,  price: 0,    rarity: 'common' },  // 😤
  { id: '\u{1F44F}', label: 'Clap',       starter: true,  price: 0,    rarity: 'common' },  // 👏
  { id: '\u{1F60E}', label: 'Cool',       starter: true,  price: 0,    rarity: 'common' },  // 😎
  { id: '\u{1F480}', label: 'Dead',       starter: true,  price: 0,    rarity: 'common' },  // 💀
  { id: '\u{1F92F}', label: 'Mind Blown', starter: true,  price: 0,    rarity: 'common' },  // 🤯
  { id: '\u{1F440}', label: 'Look',       starter: true,  price: 0,    rarity: 'common' },  // 👀

  // ── Common (14) — everyday reactions, 150-250 coins ──
  { id: '\u{1F60F}', label: 'Smirk',      starter: false, price: 150,  rarity: 'common' },  // 😏
  { id: '\u{1F644}', label: 'Eye Roll',   starter: false, price: 150,  rarity: 'common' },  // 🙄
  { id: '\u{1F62C}', label: 'Grimace',    starter: false, price: 150,  rarity: 'common' },  // 😬
  { id: '\u{1F926}', label: 'Facepalm',   starter: false, price: 200,  rarity: 'common' },  // 🤦
  { id: '\u{1F937}', label: 'Shrug',      starter: false, price: 200,  rarity: 'common' },  // 🤷
  { id: '\u{1F4AA}', label: 'Flex',       starter: false, price: 200,  rarity: 'common' },  // 💪
  { id: '\u{1FAE0}', label: 'Melting',    starter: false, price: 200,  rarity: 'common' },  // 🫠
  { id: '\u{1F62E}', label: 'Shocked',    starter: false, price: 150,  rarity: 'common' },  // 😮
  { id: '\u{1F971}', label: 'Yawn',       starter: false, price: 150,  rarity: 'common' },  // 🥱
  { id: '\u{270C}\u{FE0F}', label: 'Peace', starter: false, price: 200, rarity: 'common' }, // ✌️
  { id: '\u{1F91D}', label: 'Handshake',  starter: false, price: 200,  rarity: 'common' },  // 🤝
  { id: '\u{1F610}', label: 'Meh',        starter: false, price: 150,  rarity: 'common' },  // 😐
  { id: '\u{1F44D}', label: 'Thumbs Up',  starter: false, price: 150,  rarity: 'common' },  // 👍
  { id: '\u{1F44E}', label: 'Thumbs Down', starter: false, price: 200, rarity: 'common' },  // 👎

  // ── Rare (14) — spicier reactions, 300-500 coins ──
  { id: '\u{1F976}', label: 'Cold',       starter: false, price: 300,  rarity: 'rare' },    // 🥶
  { id: '\u{1F921}', label: 'Clown',      starter: false, price: 300,  rarity: 'rare' },    // 🤡
  { id: '\u{1F608}', label: 'Devil',      starter: false, price: 400,  rarity: 'rare' },    // 😈
  { id: '\u{1F485}', label: 'Nail',       starter: false, price: 350,  rarity: 'rare' },    // 💅
  { id: '\u{1FAE1}', label: 'Salute',     starter: false, price: 300,  rarity: 'rare' },    // 🫡
  { id: '\u{1F92B}', label: 'Quiet',      starter: false, price: 400,  rarity: 'rare' },    // 🤫
  { id: '\u{1F9E0}', label: 'Brain',      starter: false, price: 350,  rarity: 'rare' },    // 🧠
  { id: '\u{1FAE3}', label: 'Peek',       starter: false, price: 350,  rarity: 'rare' },    // 🫣
  { id: '\u{1F911}', label: 'Money Face', starter: false, price: 400,  rarity: 'rare' },    // 🤑
  { id: '\u{1F635}\u{200D}\u{1F4AB}', label: 'Dizzy', starter: false, price: 300, rarity: 'rare' }, // 😵‍💫
  { id: '\u{1F9BE}', label: 'Robot Arm',  starter: false, price: 350,  rarity: 'rare' },    // 🦾
  { id: '\u{1F634}', label: 'Sleep',      starter: false, price: 300,  rarity: 'rare' },    // 😴
  { id: '\u{1F47B}', label: 'Ghost',      starter: false, price: 400,  rarity: 'rare' },    // 👻
  { id: '\u{1F47D}', label: 'Alien',      starter: false, price: 500,  rarity: 'rare' },    // 👽

  // ── Epic (12) — premium reactions, 600-1000 coins ──
  { id: '\u{1F451}', label: 'Crown',        starter: false, price: 800,  rarity: 'epic' },  // 👑
  { id: '\u{1F31F}', label: 'Star',         starter: false, price: 700,  rarity: 'epic' },  // 🌟
  { id: '\u{1FAF6}', label: 'Heart Hands',  starter: false, price: 700,  rarity: 'epic' },  // 🫶
  { id: '\u{1F916}', label: 'Robot',        starter: false, price: 800,  rarity: 'epic' },  // 🤖
  { id: '\u{1F3AD}', label: 'Theater',      starter: false, price: 700,  rarity: 'epic' },  // 🎭
  { id: '\u{1F52E}', label: 'Crystal Ball', starter: false, price: 900,  rarity: 'epic' },  // 🔮
  { id: '\u{1F3AF}', label: 'Bullseye',     starter: false, price: 700,  rarity: 'epic' },  // 🎯
  { id: '\u{26A1}',  label: 'Bolt',         starter: false, price: 600,  rarity: 'epic' },  // ⚡
  { id: '\u{1F9CA}', label: 'Ice',          starter: false, price: 800,  rarity: 'epic' },  // 🧊
  { id: '\u{1FA9E}', label: 'Disco Ball',   starter: false, price: 900,  rarity: 'epic' },  // 🪩
  { id: '\u{1F3B0}', label: 'Jackpot',      starter: false, price: 1000, rarity: 'epic' },  // 🎰
  { id: '\u{1F9FF}', label: 'Evil Eye',     starter: false, price: 800,  rarity: 'epic' },  // 🧿

  // ── Legendary (6) — ultra-rare flex, 1500-2500 coins ──
  { id: '\u{1F3C6}', label: 'Trophy',      starter: false, price: 2000, rarity: 'legendary' }, // 🏆
  { id: '\u{1F48E}', label: 'Gem',         starter: false, price: 2000, rarity: 'legendary' }, // 💎
  { id: '\u{1F409}', label: 'Dragon',      starter: false, price: 2500, rarity: 'legendary' }, // 🐉
  { id: '\u{1F308}', label: 'Rainbow',     starter: false, price: 1500, rarity: 'legendary' }, // 🌈
  { id: '\u{1F984}', label: 'Unicorn',     starter: false, price: 2500, rarity: 'legendary' }, // 🦄
  { id: '\u{1F47E}', label: 'Space Invader', starter: false, price: 2000, rarity: 'legendary' }, // 👾
];

// ─── Phrases (50 total) ──────────────────────────────────────────────

export const ALL_PHRASES: PhraseItem[] = [
  // ── Starters (8) — free, always owned ──
  { id: 'GG',       color: '#4caf50', starter: true,  price: 0,    rarity: 'common' },
  { id: 'Nice!',    color: '#2196f3', starter: true,  price: 0,    rarity: 'common' },
  { id: 'LOL',      color: '#ff9800', starter: true,  price: 0,    rarity: 'common' },
  { id: 'Wow',      color: '#9c27b0', starter: true,  price: 0,    rarity: 'common' },
  { id: 'Oops',     color: '#f44336', starter: true,  price: 0,    rarity: 'common' },
  { id: 'Bruh',     color: '#607d8b', starter: true,  price: 0,    rarity: 'common' },
  { id: 'EZ',       color: '#ffc107', starter: true,  price: 0,    rarity: 'common' },
  { id: 'No way',   color: '#e91e63', starter: true,  price: 0,    rarity: 'common' },

  // ── Common (12) — basic quick chat, 150-250 coins ──
  { id: 'OMG',      color: '#ff5722', starter: false, price: 200,  rarity: 'common' },
  { id: 'Later',    color: '#795548', starter: false, price: 150,  rarity: 'common' },
  { id: 'Yikes',    color: '#ff1744', starter: false, price: 200,  rarity: 'common' },
  { id: 'Oof',      color: '#bf360c', starter: false, price: 150,  rarity: 'common' },
  { id: 'Nah',      color: '#78909c', starter: false, price: 150,  rarity: 'common' },
  { id: 'Bet',      color: '#66bb6a', starter: false, price: 200,  rarity: 'common' },
  { id: 'Chill',    color: '#4dd0e1', starter: false, price: 200,  rarity: 'common' },
  { id: 'Facts',    color: '#fff176', starter: false, price: 200,  rarity: 'common' },
  { id: 'Hype',     color: '#ff6e40', starter: false, price: 250,  rarity: 'common' },
  { id: 'Sus',      color: '#ab47bc', starter: false, price: 250,  rarity: 'common' },
  { id: 'Nope',     color: '#e53935', starter: false, price: 150,  rarity: 'common' },
  { id: 'Lmao',     color: '#fdd835', starter: false, price: 200,  rarity: 'common' },

  // ── Rare (12) — spicier phrases, 300-500 coins ──
  { id: 'Salty',    color: '#00bcd4', starter: false, price: 300,  rarity: 'rare' },
  { id: 'Cap',      color: '#e040fb', starter: false, price: 350,  rarity: 'rare' },
  { id: 'Sheesh',   color: '#00e5ff', starter: false, price: 400,  rarity: 'rare' },
  { id: 'Clutch',   color: '#ffd700', starter: false, price: 400,  rarity: 'rare' },
  { id: 'W',        color: '#76ff03', starter: false, price: 300,  rarity: 'rare' },
  { id: 'L',        color: '#ff3d00', starter: false, price: 300,  rarity: 'rare' },
  { id: 'Ratio',    color: '#ff80ab', starter: false, price: 350,  rarity: 'rare' },
  { id: 'Mid',      color: '#8d6e63', starter: false, price: 300,  rarity: 'rare' },
  { id: 'Lowkey',   color: '#546e7a', starter: false, price: 350,  rarity: 'rare' },
  { id: 'Vibes',    color: '#ce93d8', starter: false, price: 400,  rarity: 'rare' },
  { id: 'RIP',      color: '#424242', starter: false, price: 300,  rarity: 'rare' },
  { id: 'Flex',     color: '#ffab00', starter: false, price: 500,  rarity: 'rare' },

  // ── Epic (10) — premium phrases, 700-1200 coins ──
  { id: 'Goated',   color: '#76ff03', starter: false, price: 800,  rarity: 'epic' },
  { id: 'GGEZ',     color: '#69f0ae', starter: false, price: 700,  rarity: 'epic' },
  { id: 'Cracked',  color: '#ea80fc', starter: false, price: 900,  rarity: 'epic' },
  { id: 'Top Diff', color: '#e040fb', starter: false, price: 800,  rarity: 'epic' },
  { id: 'Demon',    color: '#ff1744', starter: false, price: 1000, rarity: 'epic' },
  { id: 'Unreal',   color: '#00b0ff', starter: false, price: 800,  rarity: 'epic' },
  { id: 'Big Brain', color: '#ffea00', starter: false, price: 900, rarity: 'epic' },
  { id: 'No Cap',   color: '#7c4dff', starter: false, price: 700,  rarity: 'epic' },
  { id: 'Too Easy', color: '#b2ff59', starter: false, price: 1000, rarity: 'epic' },
  { id: 'Washed',   color: '#90a4ae', starter: false, price: 800,  rarity: 'epic' },

  // ── Legendary (4) — ultra-rare flex, 1500-2500 coins ──
  { id: 'Get Rekt',  color: '#ff1744', starter: false, price: 2000, rarity: 'legendary' },
  { id: 'On God',    color: '#ffd600', starter: false, price: 1500, rarity: 'legendary' },
  { id: 'Built Diff', color: '#00e676', starter: false, price: 2000, rarity: 'legendary' },
  { id: 'Drop King', color: '#ff6d00', starter: false, price: 2500, rarity: 'legendary' },
];

// ─── Ownership check ──────────────────────────────────────────────────

/** Returns true if a specific emoji or phrase is owned by the player */
export function isExpressionOwned(
  itemId: string,
  ownedEmojis: string[],
  ownedPhrases: string[],
): boolean {
  // Check if it's a starter emoji
  const emojiItem = ALL_EMOJIS.find(e => e.id === itemId);
  if (emojiItem) return emojiItem.starter || ownedEmojis.includes(itemId);

  // Check if it's a starter phrase
  const phraseItem = ALL_PHRASES.find(p => p.id === itemId);
  if (phraseItem) return phraseItem.starter || ownedPhrases.includes(itemId);

  return false;
}

// ─── Rarity helpers ───────────────────────────────────────────────────

/** Hex colors per expression rarity — visual treatment in panels/reveals. */
export const EXPRESSION_RARITY_COLORS: Record<ExpressionRarity, string> = {
  common:    '#6a6a72',
  rare:      '#3a78d4',
  epic:      '#9a4ad4',
  legendary: '#d49a3a',
};

export const EXPRESSION_RARITY_LABELS: Record<ExpressionRarity, string> = {
  common:    'COMMON',
  rare:      'RARE',
  epic:      'EPIC',
  legendary: 'LEGENDARY',
};
