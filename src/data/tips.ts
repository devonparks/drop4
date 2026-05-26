// Loading screen tips shown during game transitions

const LOADING_TIPS: string[] = [
  // Strategy
  'Controlling the center column gives you the most winning opportunities.',
  'A trap is when you have two ways to win and your opponent can only block one.',
  'Always check for your opponent\'s three-in-a-row before making your move.',
  'Vertical stacking forces a block, giving you control of the tempo.',
  'Odd rows favor the first player. Even rows favor the second player.',
  'The best players think two moves ahead — plan your trap before you set it.',
  'A double trap is unbeatable: three connected with open spaces on both ends.',
  'Diagonal threats are harder to spot than horizontal ones — use that.',
  'If your opponent takes the center, go adjacent — never go to the edge.',
  'Blocking isn\'t winning. Force THEM to block YOU.',
  'On a 7-column board, columns 3, 4, and 5 are involved in the most winning lines.',
  // Career
  'Career bosses have special rules — read the level info before you start.',
  'Replay career levels for 3 stars to earn more career stars overall.',
  'Each career city introduces new level types — adapt your strategy.',
  'Obstacle levels create forced plays — use walls to trap the AI.',
  'Speed rounds punish hesitation. Pre-plan two moves ahead.',
  'Jeopardy levels pay 3× coins — high risk, high reward.',
  // Engagement hooks
  'Complete Career Mode to earn player titles and rare board skins.',
  'Daily Challenges refresh every day — complete all 3 for a bonus reward.',
  'Weekly challenges pay up to 2,000 coins — check your progress.',
  'Your login streak earns a coin multiplier — don\'t break the chain!',
  'Win games to earn coins and unlock exclusive cosmetics in the Shop.',
  'Customize your character and show off your style to opponents.',
  'Try Custom Game to play Connect 3, 5, or 6 on different board sizes.',
];

export function getRandomTip(): string {
  return LOADING_TIPS[Math.floor(Math.random() * LOADING_TIPS.length)];
}

// Game-over quotes shown in the results modal
const GAME_OVER_WIN_QUOTES: string[] = [
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
  'Clean win. The city is noticing.',
  'That double trap was textbook. Keep climbing.',
  'Every win gets you closer to the next boss battle.',
];

const GAME_OVER_LOSS_QUOTES: string[] = [
  'Every loss is a lesson. You\'ll get them next time!',
  'The best players learn more from losses than wins.',
  'That was close! One more move could have changed everything.',
  'Watch for double traps — they\'re the key to leveling up.',
  'Shake it off and go again! 💪',
  'Even the pros lose sometimes. Rematch?',
  'Try controlling the center column next round!',
  'Tip: always check for your opponent\'s three-in-a-row first.',
];

const GAME_OVER_DRAW_QUOTES: string[] = [
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
