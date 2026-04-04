// Player titles earned through achievements and career milestones

export interface PlayerTitle {
  id: string;
  name: string;
  color: string;
  source: string; // How it's earned
}

export const PLAYER_TITLES: PlayerTitle[] = [
  { id: 'rookie', name: 'Rookie', color: '#8892b0', source: 'Default' },
  { id: 'strategist', name: 'Strategist', color: '#3498db', source: 'Beat Captain Connect (Career Ch.1)' },
  { id: 'drop_king', name: 'Drop King', color: '#f1c40f', source: 'Beat Master Ming (Career Ch.2)' },
  { id: 'darkmatter_elite', name: 'Dark Matter Elite', color: '#e94560', source: 'Beat Dark Matter (Career Ch.3)' },
  { id: 'legend', name: 'Legend', color: '#ff8c00', source: 'Win 100 games' },
  { id: 'untouchable', name: 'Untouchable', color: '#9b59b6', source: '10 win streak' },
  { id: 'master', name: 'Master', color: '#27ae3d', source: 'Reach Level 25' },
];

export function getTitleById(id: string): PlayerTitle {
  return PLAYER_TITLES.find(t => t.id === id) || PLAYER_TITLES[0];
}
