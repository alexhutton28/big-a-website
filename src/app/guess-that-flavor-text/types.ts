// Shared types for Guess That Flavor Text
export type Card = {
  id: string;
  name: string;
  flavorText: string;
  attack?: string | null;
  image?: string;
  set?: string;
  stage?: string;
};

export type Lifeline = 'Set' | 'Stage' | 'Attack';

export type DayState = {
  guess: string | null;
  usedLifelines: Lifeline[];
  completed: boolean;
  correct: boolean;
  score: number;
};
