import type { GameItem, GameRound, GuessSide } from './types';

const LOSING_ITEM_CARRY_CHANCE = 0.2;

// Pure helpers for building rounds and checking guesses.
export function createRound(items: GameItem[], carryItem?: GameItem): GameRound {
  if (items.length < 2) {
    throw new Error('At least two items are required to create a round.');
  }

  if (carryItem) {
    const challengerPool = items.filter((item) => item.id !== carryItem.id);

    if (challengerPool.length === 0) {
      throw new Error('At least one challenger is required when carrying an item.');
    }

    const challengerIndex = Math.floor(Math.random() * challengerPool.length);

    return {
      left: carryItem,
      right: challengerPool[challengerIndex],
    };
  }

  const leftIndex = Math.floor(Math.random() * items.length);
  let rightIndex = Math.floor(Math.random() * items.length);

  while (rightIndex === leftIndex) {
    rightIndex = Math.floor(Math.random() * items.length);
  }

  return {
    left: items[leftIndex],
    right: items[rightIndex],
  };
}

export function resolveGuess(round: GameRound, guess: GuessSide) {
  const winningSide: GuessSide = round.left.entries >= round.right.entries ? 'left' : 'right';
  const losingSide: GuessSide = winningSide === 'left' ? 'right' : 'left';

  return {
    isCorrect: guess === winningSide,
    winningItem: winningSide === 'left' ? round.left : round.right,
    losingItem: losingSide === 'left' ? round.left : round.right,
    winningSide,
  };
}

export function selectCarryItem(winningItem: GameItem, losingItem: GameItem) {
  return Math.random() < LOSING_ITEM_CARRY_CHANCE ? losingItem : winningItem;
}
