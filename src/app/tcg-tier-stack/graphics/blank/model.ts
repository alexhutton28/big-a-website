// The blank canvas graphic: cards placed anywhere on a plain background.

import type { CardItem } from '../../cards';
import { BOARD_HEIGHT, BOARD_WIDTH, CARD_HEIGHT, CARD_WIDTH } from '../../canvas/size';
import type { CardPlacement, Point } from '../types';

export type BlankCanvas = {
  kind: 'blank';
  background: string;
  // Split cards' divider and border
  border: string;
  // Each card with its top-left corner, in drawing order (later cards on top)
  items: (CardItem & Point)[];
};

export function defaultBlankCanvas(): BlankCanvas {
  return { kind: 'blank', background: '#1f3d4b', border: '#16303c', items: [] };
}

// Keeps a card's top-left corner on the board
function clamp(x: number, y: number): Point {
  return {
    x: Math.round(Math.max(0, Math.min(BOARD_WIDTH - CARD_WIDTH, x))),
    y: Math.round(Math.max(0, Math.min(BOARD_HEIGHT - CARD_HEIGHT, y))),
  };
}

// Cards added from search or import fill a grid of 10 x 4 spots, left to right and top
// to bottom by how many cards there are, starting over after 40
const COLUMNS = 10;
const ROWS = 4;
function nextSpot(count: number): Point {
  const column = count % COLUMNS;
  const row = Math.floor(count / COLUMNS) % ROWS;
  return { x: 25 + column * 117, y: 23 + row * 163 };
}

export function layoutCards(canvas: BlankCanvas): CardPlacement[] {
  return canvas.items.map(({ x, y, ...item }) => ({ item, x, y }));
}

export function mapCards(canvas: BlankCanvas, change: (item: CardItem) => CardItem | null) {
  return {
    ...canvas,
    items: canvas.items.flatMap(({ x, y, ...item }) => {
      const next = change(item);
      return next ? [{ ...next, x, y }] : [];
    }),
  };
}

export function addCard(canvas: BlankCanvas, item: CardItem): BlankCanvas {
  return { ...canvas, items: [...canvas.items, { ...item, ...nextSpot(canvas.items.length) }] };
}

// Centered on the pointer
export function dropCard(canvas: BlankCanvas, item: CardItem, point: Point): BlankCanvas {
  const spot = clamp(point.x - CARD_WIDTH / 2, point.y - CARD_HEIGHT / 2);
  return { ...canvas, items: [...canvas.items, { ...item, ...spot }] };
}

// A moved card goes on top of the others
export function moveCard(canvas: BlankCanvas, id: string, x: number, y: number): BlankCanvas {
  const item = canvas.items.find((i) => i.id === id);
  if (!item) return canvas;
  return {
    ...canvas,
    items: [...canvas.items.filter((i) => i.id !== id), { ...item, ...clamp(x, y) }],
  };
}

export function parseBlankCanvas(value: unknown): BlankCanvas | null {
  const canvas = value as BlankCanvas | null;
  if (
    canvas?.kind !== 'blank' ||
    typeof canvas.background !== 'string' ||
    typeof canvas.border !== 'string' ||
    !Array.isArray(canvas.items) ||
    !canvas.items.every((i) => typeof i.x === 'number' && typeof i.y === 'number')
  ) {
    return null;
  }
  return canvas;
}
