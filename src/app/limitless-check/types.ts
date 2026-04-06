// Shared types for the higher-lower game flow.
export type GamePhase = 'menu' | 'playing' | 'game-over';

export type GameMode = 'all' | 'cards' | 'decks' | 'players';

export type GuessSide = 'left' | 'right';

export type GameItemType = 'Player' | 'Card' | 'Deck';

export type GameItem = {
  id: string;
  name: string;
  hyperlink: string;
  entries: number;
  image: string[];
  type: GameItemType;
  set: string | null;
};

export type GameRound = {
  left: GameItem;
  right: GameItem;
};
