// Tips specific to each game mode — shown during loading / game-over screens

export type GameMode = 'casual' | 'ranked' | 'wager' | 'career' | 'custom';

export const CASUAL_TIPS = [
  'Take your time — no timer in casual mode!',
  'Try different strategies without pressure.',
  'Great for learning new opening moves.',
  'Practice center control before jumping into ranked.',
  'Casual wins still earn coins and count toward challenges.',
  'Use Undo freely in casual — experiment and learn!',
  'Invite a friend for local 2-player casual matches.',
];

export const RANKED_TIPS = [
  'Every second counts — your chess clock is ticking!',
  'Plan 2 moves ahead to save time on the clock.',
  'Quick pattern recognition wins ranked games.',
  'Losing to a higher-ranked player costs less ELO.',
  'Your seasonal rank resets every 2 months.',
  'Reach Diamond tier for exclusive season rewards.',
  'Win streaks in ranked give bonus ELO gains.',
  'Beating higher-rated opponents gives more ELO as an underdog.',
  'Your season high ELO is tracked separately from current rating.',
];

export const WAGER_TIPS = [
  'Start at the 10-coin table to build confidence.',
  'Your ranked badge is visible to spectators.',
  'Underdog wins earn bonus coins — embrace the challenge!',
  'Only wager what you can afford to lose.',
  'Higher tables attract better opponents and more spectators.',
  'Check the odds before accepting a mismatch.',
  'The Gold Court is where reputations are made — or broken.',
  'Win streaks in wager mode can build your coin stack fast.',
];

export const CAREER_TIPS = [
  'Win in fewer moves for more stars (3★ under 15 moves).',
  'Boss battles have unique AI patterns — study them.',
  'Career rewards include exclusive board skins and titles.',
  'Try Connect 3 levels for a different challenge.',
  'Speed levels test your quick decision-making.',
  'Complete all levels in a chapter to unlock a celebration bonus.',
  'Going second is a disadvantage — plan your counter-strategy early.',
];

export const CUSTOM_TIPS = [
  'Try Connect 5 on an 8×8 board for a deeper strategic challenge.',
  'The Board Editor lets you create puzzle positions to share.',
  'Custom games are perfect for teaching friends how to play.',
  'Experiment with different board sizes to keep things fresh.',
  'Speed rounds with 5-second timers test your reflexes.',
];

const TIPS_MAP: Record<GameMode, string[]> = {
  casual: CASUAL_TIPS,
  ranked: RANKED_TIPS,
  wager: WAGER_TIPS,
  career: CAREER_TIPS,
  custom: CUSTOM_TIPS,
};

export function getTipForMode(mode: GameMode): string {
  const tips = TIPS_MAP[mode] || CASUAL_TIPS;
  return tips[Math.floor(Math.random() * tips.length)];
}

export function getTipsForMode(mode: GameMode): string[] {
  return TIPS_MAP[mode] || CASUAL_TIPS;
}
