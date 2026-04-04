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
  'Stage Mode lets you wager coins for higher stakes matches.',
  'Your win streak earns bonus coins — keep it going!',
  'Try Custom Game to play Connect 3, 5, or 6 on different board sizes.',
  'The Board Editor lets you create custom puzzle boards to share.',
];

export function getRandomTip(): string {
  return LOADING_TIPS[Math.floor(Math.random() * LOADING_TIPS.length)];
}
