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
  'Don\'t just react — force your opponent into positions where every move helps you.',
  'When in doubt, play the center column. It\'s almost never wrong.',
  'A three-in-a-row with space on both sides is nearly impossible to stop.',
  'Edge columns have the fewest connections — save them for blocking, not attacking.',
  'Watch for your opponent building an L-shape — that\'s a trap in the making.',
  'The first player to create two threats at once usually wins.',
  'If you can\'t attack, take a space that blocks the most opponent lines.',
  // Career
  'Career bosses have special rules — read the level info before you start.',
  'Replay career levels for 3 stars to earn more career stars overall.',
  'Each career city introduces new level types — adapt your strategy.',
  'Obstacle levels create forced plays — use walls to trap the AI.',
  'Speed rounds punish hesitation. Pre-plan two moves ahead.',
  'Jeopardy levels pay 3× coins — high risk, high reward.',
  'Power pieces are one-use per match — save them for the critical moment.',
  'Going second? Mirror the opponent\'s opening to neutralize their tempo.',
  'Target levels limit your moves — every drop must threaten a connection.',
  'Boss scripts change the rules. Adapt or fail.',
  'Earning 3 stars on every level in a city is the mark of a true master.',
  'Unlock new power pieces by beating chapter bosses.',
  // Engagement hooks
  'Complete Career Mode to earn player titles and rare board skins.',
  'Daily Challenges refresh every day — complete all 3 for a bonus reward.',
  'Weekly challenges pay up to 2,000 coins — check your progress.',
  'Your login streak earns a coin multiplier — don\'t break the chain!',
  'Win games to earn coins and unlock exclusive cosmetics in the Shop.',
  'Customize your character and show off your style to opponents.',
  'Try Custom Game to play Connect 3, 5, or 6 on different board sizes.',
  'Every 3 wins earns a loot box — keep the wins coming.',
  'Equip different camos to change your pieces and board style.',
  'Check the Strategy Guide in Learn for tips on every skill level.',
  'Losing streaks earn comeback coins — the game has your back.',
  'Level up by playing games and earning XP from wins and challenges.',
  'Hard mode wins earn the best loot boxes — bronze, silver, or gold.',
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
  'The board bows to the better strategist. Well played.',
  'Your opponent is probably rethinking their life choices.',
  'Three stars? That\'s the goal. How\'d you do?',
  'One step closer to legend status.',
  'You make it look easy. Ready for a harder challenge?',
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
  'That opponent was tough. Study their pattern and adapt.',
  'Diagonal threats are sneaky — watch for them next time.',
  'Losses build muscle. You\'re stronger now than before.',
  'The comeback starts with the next game. Let\'s go.',
  'Close doesn\'t count — but you\'re getting there.',
  'Your rival just got lucky. Prove it on the rematch.',
];

const GAME_OVER_DRAW_QUOTES: string[] = [
  'Well played! A draw means you were evenly matched.',
  'Nobody wins, nobody loses — a true battle of equals!',
  'So close! One move could have swung it either way.',
  'A draw is just a rematch waiting to happen!',
  'Great defense from both sides! 🛡️',
  'Stalemate. The board ran out of room for your rivalry.',
  'Tied! Next game breaks it.',
];

export function getRandomGameOverQuote(result: 'win' | 'loss' | 'draw'): string {
  const quotes = result === 'win'
    ? GAME_OVER_WIN_QUOTES
    : result === 'loss'
    ? GAME_OVER_LOSS_QUOTES
    : GAME_OVER_DRAW_QUOTES;
  return quotes[Math.floor(Math.random() * quotes.length)];
}
