import { cards } from './cards';
import { decks } from './decks';
import { players } from './players';
import type { GameItem, GameMode } from './types';

export const starterItems: GameItem[] = [...cards, ...decks, ...players];

export function getItemsForMode(mode: GameMode): GameItem[] {
  if (mode === 'cards') return cards;
  if (mode === 'decks') return decks;
  if (mode === 'players') return players;
  return starterItems;
}
