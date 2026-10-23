// Things players are asked to draw. Shared by the game (to pick prompts) and by
// /api/ai (which only scores drawings for prompts on this list). Everyday things with
// a recognizable outline, so a 6-second sketch has a fair chance.
export const PROMPTS = [
  // Food
  'Pizza',
  'Apple',
  'Banana',
  'Cupcake',
  'Ice Cream Cone',
  'Mushroom',
  'Carrot',
  'Donut',
  // Animals
  'Cat',
  'Dog',
  'Fish',
  'Bird',
  'Snake',
  'Spider',
  'Butterfly',
  'Turtle',
  'Octopus',
  'Whale',
  'Snail',
  'Dinosaur',
  // Things
  'Car',
  'Boat',
  'Bicycle',
  'Airplane',
  'Rocket',
  'Sword',
  'Laptop',
  'Cube',
  'Treasure Map',
  'Umbrella',
  'Guitar',
  'Clock',
  'Key',
  'Light Bulb',
  'Crown',
  'Glasses',
  'Hat',
  'Shoe',
  'Chair',
  'Ladder',
  'Anchor',
  'Balloon',
  'Kite',
  'Candle',
  'Pencil',
  'Envelope',
  'Robot',
  'Ghost',
  'Snowman',
  // Places and nature
  'House',
  'Castle',
  'Tree',
  'Flower',
  'Cactus',
  'Mountain',
  'Cloud',
  'Sun',
  'Moon',
] as const;

export type Prompt = (typeof PROMPTS)[number];

export function isPrompt(value: unknown): value is Prompt {
  return typeof value === 'string' && (PROMPTS as readonly string[]).includes(value);
}

// A random prompt, avoiding the ones already used this round
export function randomPrompt(used: readonly string[] = []): Prompt {
  const unused = PROMPTS.filter((p) => !used.includes(p));
  const choices = unused.length > 0 ? unused : PROMPTS;
  return choices[Math.floor(Math.random() * choices.length)];
}
