// Loading screen tips shown during game transitions

export const LOADING_TIPS: string[] = [
  'Controlling the center column gives you the most winning opportunities.',
  'A trap is when you have two ways to win and your opponent can only block one.',
  'Always check for your opponent\'s three-in-a-row before making your move.',
  'Vertical stacking forces a block, giving you control of the tempo.',
  'Odd rows favor the first player. Even rows favor the second player.',
  'The best players think two moves ahead — plan your trap before you set it.',
  'A double trap is unbeatable: three connected with open spaces on both ends.',
  'Win games to earn coins and unlock exclusive cosmetics in the Shop.',
  'Complete Career Mode to earn player titles and rare board skins.',
  'Daily Challenges refresh every day — complete all 3 for a bonus reward.',
  'Check your Loot Boxes in your Profile — you might have rewards waiting!',
  'Customize your character and show off your style to opponents.',
  'Collect outfits, pets, and board skins to build your ultimate style.',
  'Your win streak earns bonus coins — keep it going!',
  'Try Custom Game to play Connect 3, 5, or 6 on different board sizes.',
  'The Board Editor lets you create custom puzzle boards to share.',
];

export function getRandomTip(): string {
  return LOADING_TIPS[Math.floor(Math.random() * LOADING_TIPS.length)];
}

// Game-over quotes shown in the results modal
export const GAME_OVER_WIN_QUOTES: string[] = [
  'The center column is key to victory!',
  'Every master was once a beginner.',
  'Your pet is proud of you! 🐕',
  'That was close! One more move could have changed everything.',
  'Victory looks good on you! 🏆',
  'A well-earned win — your strategy paid off!',
  'Keep that streak alive! 🔥',
  'Champions play one more. Ready for a rematch?',
  'Dominant performance! Your opponent never stood a chance.',
  'Pro tip: diagonal traps are the hardest to spot!',
];

export const GAME_OVER_LOSS_QUOTES: string[] = [
  'Every loss is a lesson. You\'ll get them next time!',
  'The best players learn more from losses than wins.',
  'That was close! One more move could have changed everything.',
  'Watch for double traps — they\'re the key to leveling up.',
  'Shake it off and go again! 💪',
  'Even the pros lose sometimes. Rematch?',
  'Try controlling the center column next round!',
  'Tip: always check for your opponent\'s three-in-a-row first.',
];

export const GAME_OVER_DRAW_QUOTES: string[] = [
  'Well played! A draw means you were evenly matched.',
  'Nobody wins, nobody loses — a true battle of equals!',
  'So close! One move could have swung it either way.',
  'A draw is just a rematch waiting to happen!',
  'Great defense from both sides! 🛡️',
];

export function getRandomGameOverQuote(result: 'win' | 'loss' | 'draw'): string {
  const quotes = result === 'win'
    ? GAME_OVER_WIN_QUOTES
    : result === 'loss'
    ? GAME_OVER_LOSS_QUOTES
    : GAME_OVER_DRAW_QUOTES;
  return quotes[Math.floor(Math.random() * quotes.length)];
}
