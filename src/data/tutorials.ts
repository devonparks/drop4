export interface TutorialTip {
  id: string;
  screen: string; // which screen this tip appears on
  title: string;
  message: string;
  position: 'top' | 'center' | 'bottom';
  showOnce: boolean; // only show first time
}

export const TUTORIAL_TIPS: TutorialTip[] = [
  // Home
  { id: 'home_tap_character', screen: 'Home', title: 'Tap Your Character!', message: 'Tap your character to see them perform a random emote.', position: 'center', showOnce: true },
  { id: 'home_emotes', screen: 'Home', title: 'Emotes & Idles', message: 'Use the buttons on each side to customize your emotes and idle animations.', position: 'center', showOnce: true },

  // Game
  { id: 'game_hint', screen: 'Game', title: 'Need Help?', message: 'Tap Hint for a suggested move. You get 3 free hints per game!', position: 'bottom', showOnce: true },
  { id: 'game_emote', screen: 'Game', title: 'Express Yourself!', message: 'Tap the emote button to react during the game. Your opponent will see it!', position: 'bottom', showOnce: true },

  // Career
  { id: 'career_stars', screen: 'Career', title: 'Earn Stars!', message: 'Win in fewer moves for more stars. 3 stars = perfect game!', position: 'top', showOnce: true },

  // Multiplayer
  { id: 'multi_party', screen: 'Multiplayer', title: 'Party Up!', message: 'Invite friends to your Party Lobby to hang out and play together.', position: 'center', showOnce: true },
  { id: 'multi_ranked', screen: 'Multiplayer', title: 'Ranked Mode', message: 'Play Ranked to earn MMR and climb from Iron to Dark Matter!', position: 'center', showOnce: true },

  // Shop
  { id: 'shop_collections', screen: 'Shop', title: 'Collections', message: 'Filter by collection to find themed sets like Neon Pack or Mythic Collection.', position: 'top', showOnce: true },

  // Gold Court
  { id: 'stage_rake', screen: 'Stage', title: 'House Rake', message: 'Each court takes a 10% rake. The rest goes to the winner!', position: 'top', showOnce: true },

  // Friends
  { id: 'friends_invite', screen: 'Friends', title: 'Add Friends', message: 'Share your Friend Code to add friends and play together!', position: 'center', showOnce: true },
];

/** Get tips for a specific screen */
export function getTipsForScreen(screen: string): TutorialTip[] {
  return TUTORIAL_TIPS.filter(t => t.screen === screen);
}

/** Get a single tip by ID */
export function getTipById(id: string): TutorialTip | undefined {
  return TUTORIAL_TIPS.find(t => t.id === id);
}
