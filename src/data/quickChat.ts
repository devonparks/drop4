// Quick Chat — Pre-set text messages for in-game communication (Tier 3)
// Inspired by Basketball Stars quick chat system

export interface QuickChatMessage {
  id: string;
  text: string;
  category: 'friendly' | 'competitive' | 'reaction' | 'gg';
}

export const QUICK_CHAT_MESSAGES: QuickChatMessage[] = [
  // Friendly
  { id: 'gl', text: 'Good luck!', category: 'friendly' },
  { id: 'hf', text: 'Have fun!', category: 'friendly' },
  { id: 'nm', text: 'Nice move!', category: 'friendly' },
  { id: 'wp', text: 'Well played!', category: 'friendly' },
  // Competitive
  { id: 'ez', text: 'Too easy!', category: 'competitive' },
  { id: 'bm', text: 'Bring it on!', category: 'competitive' },
  { id: 'uh', text: 'Uh oh...', category: 'competitive' },
  { id: 'wow', text: 'Wow!', category: 'competitive' },
  // Reaction
  { id: 'oops', text: 'Oops!', category: 'reaction' },
  { id: 'close', text: 'That was close!', category: 'reaction' },
  { id: 'think', text: 'Hmm...', category: 'reaction' },
  { id: 'what', text: 'Wait what?!', category: 'reaction' },
  // GG
  { id: 'gg', text: 'Good game!', category: 'gg' },
  { id: 'rematch', text: 'Rematch?', category: 'gg' },
  { id: 'thanks', text: 'Thanks!', category: 'gg' },
  { id: 'bye', text: 'See ya!', category: 'gg' },
];
