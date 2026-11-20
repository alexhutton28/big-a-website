// Shared types for Guess That Flavor Text
export type Card = {
  id: string;
  name: string;
  flavorText: string;
  attack?: string | null;
  image?: string;
  set?: string;
  stage?: string;
  /** The card's energy type, e.g. 'Metal'; a redemption hint */
  type?: string | null;
  /** The Pokémon's generation (1 to 9); a redemption hint */
  generation?: number | null;
};

export type Lifeline = 'Set' | 'Stage' | 'Attack';

/** A redemption hint, shown like an answered lifeline */
export type Hint = { label: string; answer: string };

export type DayState = {
  guess: string | null;
  usedLifelines: Lifeline[];
  completed: boolean;
  correct: boolean;
  /** Points: 4 minus lifelines used, 0.5 for a redeemed guess, 0 for a miss */
  score: number;
  /** The wrong first guess, set once redemption starts (games saved before it lack these) */
  firstGuess?: string;
  /** The redemption guess was right */
  redeemed?: boolean;
};
