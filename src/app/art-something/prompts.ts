// Things players are asked to draw. Shared by the game (to pick prompts) and by
// /api/ai (which only scores drawings for prompts on this list).
export const PROMPTS = [
  'Pizza',
  'Cat',
  'Car',
  'Sword',
  'Laptop',
  'Cube',
  'Boat',
  'Fish',
  'Tree',
  'Treasure Map',
  'House',
] as const;

export type Prompt = (typeof PROMPTS)[number];

export function isPrompt(value: unknown): value is Prompt {
  return typeof value === 'string' && (PROMPTS as readonly string[]).includes(value);
}

// A random prompt, avoiding an immediate repeat of the previous one
export function randomPrompt(previous?: string): Prompt {
  const choices = PROMPTS.filter((p) => p !== previous);
  return choices[Math.floor(Math.random() * choices.length)];
}
