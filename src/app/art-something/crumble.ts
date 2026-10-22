// The "crumble" played when a drawing is submitted: the drawing's lines break into
// specks that stream off the board in an arc and pour into the top of the score box.
// Drawn on a full-screen overlay canvas, in viewport coordinates.

const DURATION_MS = 1400;
// Each speck's flight takes this share of the animation; the rest is its start delay
const TRAVEL = 0.42;
// Plenty for a dense sketch; more only costs frame time
const MAX_SPECKS = 2500;

type Speck = {
  x: number;
  y: number;
  delay: number;
  // Bezier control point (the top of the arc) and landing spot
  cx: number;
  cy: number;
  tx: number;
  ty: number;
};

const clamp = (v: number) => Math.max(0, Math.min(1, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeIn = (t: number) => t * t * t;
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// Points along the drawn lines, about every 2 CSS pixels, in viewport coordinates
function sampleSpecks(source: HTMLCanvasElement): { x: number; y: number }[] {
  const rect = source.getBoundingClientRect();
  if (!source.width || !source.height || !rect.width) return [];
  const cssPerPixel = rect.width / source.width;
  const step = Math.max(1, Math.round(2 / cssPerPixel));
  const data = source.getContext('2d')!.getImageData(0, 0, source.width, source.height).data;

  const points: { x: number; y: number }[] = [];
  for (let y = 0; y < source.height; y += step) {
    for (let x = 0; x < source.width; x += step) {
      if (data[(y * source.width + x) * 4 + 3] > 80) {
        points.push({ x: rect.left + x * cssPerPixel, y: rect.top + y * cssPerPixel });
      }
    }
  }
  if (points.length <= MAX_SPECKS) return points;
  const stride = points.length / MAX_SPECKS;
  return Array.from({ length: MAX_SPECKS }, (_, i) => points[Math.floor(i * stride)]);
}

// Reads the drawing from `source` right away (so it can be cleared straight after),
// then animates it into `target`. Resolves when the last speck is in.
export function crumbleInto(
  source: HTMLCanvasElement,
  overlay: HTMLCanvasElement,
  target: DOMRect,
  color: string
): Promise<void> {
  const points = sampleSpecks(source);
  if (points.length === 0) return Promise.resolve();

  const centerX = target.left + target.width / 2;
  const top = target.top;
  const farthest = Math.max(...points.map((p) => Math.hypot(p.x - centerX, p.y - top)), 1);
  const specks: Speck[] = points.map((p) => ({
    ...p,
    // The part of the drawing nearest the box leaves first, so it reads as one stream
    delay: (Math.hypot(p.x - centerX, p.y - top) / farthest) * 0.42 + Math.random() * 0.13,
    cx: lerp(p.x, centerX, 0.45),
    cy: Math.min(p.y, top) - (70 + Math.random() * 60),
    tx: centerX + (Math.random() - 0.5) * target.width * 0.5,
    ty: top + 14,
  }));

  const width = window.innerWidth;
  const height = window.innerHeight;
  const dpr = window.devicePixelRatio || 1;
  overlay.width = Math.round(width * dpr);
  overlay.height = Math.round(height * dpr);
  const ctx = overlay.getContext('2d')!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  return new Promise((resolve) => {
    let frame = 0;
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      cancelAnimationFrame(frame);
      ctx.clearRect(0, 0, width, height);
      resolve();
    };

    const start = performance.now();
    const draw = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION_MS);
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = color;
      for (const s of specks) {
        const local = clamp((t - s.delay) / TRAVEL);
        if (local >= 1) continue;
        const e = easeIn(local) * 0.35 + easeInOut(local) * 0.65;
        const x = (1 - e) * (1 - e) * s.x + 2 * (1 - e) * e * s.cx + e * e * s.tx;
        const y = (1 - e) * (1 - e) * s.y + 2 * (1 - e) * e * s.cy + e * e * s.ty;
        // Gone once it drops past the box's top edge
        if (local > 0.5 && y > top + 1 && x > target.left && x < target.right) continue;
        const size = lerp(2.2, 1.5, e);
        ctx.fillRect(x - size / 2, y - size / 2, size, size);
      }
      if (t < 1) frame = requestAnimationFrame(draw);
      else finish();
    };
    frame = requestAnimationFrame(draw);
    // Animation frames stop in a background tab: don't hold the game up waiting
    window.setTimeout(finish, DURATION_MS + 150);
  });
}
