'use client';

import { useEffect, useRef } from 'react';

// Animated starfield for the home page, drawn on a canvas that fills its parent.
//
// - Three depth layers drift slowly sideways (like the sky turning), nearer layers faster
// - Star counts scale with area, so big screens get more sky instead of a repeat
// - Every star twinkles on its own phase and rhythm; only some twinkle noticeably
// - Movement is time-based (px per second), so it runs the same at 60Hz and 120Hz
// - Sharp on high-DPI screens; rare shooting stars fall at natural angles
// - Now and then a satellite glides slowly across with a blinking beacon
// - Respects prefers-reduced-motion with a single still frame

type Star = {
  x: number;
  y: number;
  size: number;
  layer: number;
  alpha: number; // base brightness
  twinkle: number; // twinkle depth (0 = steady)
  speed: number; // twinkle rate, radians per second
  phase: number;
  tint: string; // 'r,g,b'
  glow: boolean; // brightest few get a soft halo
  ox: number; // current offset from x,y while dodging the pointer
  oy: number;
};

type ShootingStar = {
  x: number;
  y: number;
  dx: number; // unit direction
  dy: number;
  speed: number; // px per second
  length: number; // trail length in px
  age: number; // seconds
  life: number; // seconds
};

// A slow, steady light crossing the sky with a small blinking beacon
type Satellite = {
  x: number;
  y: number;
  vx: number; // px per second
  vy: number;
  age: number; // seconds
  life: number; // seconds to cross the screen
  blinkOffset: number; // so the first flash doesn't always land at the same moment
};

// Per layer, far → near: stars per megapixel, size range, brightness range, drift px/s
const LAYERS = [
  { density: 230, size: [0.6, 1.1], alpha: [0.25, 0.6], drift: 1.5 },
  { density: 90, size: [1.0, 1.6], alpha: [0.45, 0.85], drift: 3.5 },
  { density: 28, size: [1.5, 2.3], alpha: [0.7, 1], drift: 6.5 },
] as const;

// Mostly white with a few cool and warm stars, like a real sky
const TINTS = ['255,255,255', '255,255,255', '255,255,255', '210,225,255', '255,236,214'];

// Seconds between shooting stars
const SHOOTING_STAR_GAP: [number, number] = [7, 16];

// Satellites: the first appears 15–30s in, then one every 40–80s after the last leaves.
// Each takes 25–35s to cross and flashes its beacon briefly every BLINK_PERIOD seconds.
const SATELLITE_FIRST: [number, number] = [15, 30];
const SATELLITE_GAP: [number, number] = [40, 80];
const SATELLITE_CROSSING: [number, number] = [25, 35];
const BLINK_PERIOD = 2.2;
const BLINK_LENGTH = 0.14;
// Faintly golden, like sunlight off gold foil, so it reads apart from the white stars
const SATELLITE_COLOR = '#ffe2a8';
const SATELLITE_GLOW_CORE = '255,226,168';
const SATELLITE_GLOW_EDGE = '255,196,120';

// Pointer interaction: stars within this radius of the pointer are pushed straight
// away from it (never sideways or around it), then drift slowly back home. Nearer
// layers are pushed harder, so the effect has depth.
const POINTER_RADIUS = 120;
const POINTER_STRENGTH = [0.45, 0.75, 1];
// How fast stars are pushed out (per px of overlap) and how slowly they return
const PUSH_RATE = 6;
const RETURN_RATE = 0.8;

// Stars fade out over this many px above the planet's edge
const HORIZON_FADE = 70;

const rand = (min: number, max: number) => min + Math.random() * (max - min);

function createStars(width: number, height: number): Star[] {
  const megapixels = (width * height) / 1_000_000;
  const stars: Star[] = [];
  LAYERS.forEach((layer, index) => {
    const count = Math.round(layer.density * megapixels);
    for (let i = 0; i < count; i++) {
      const twinkles = Math.random() < 0.45;
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: rand(layer.size[0], layer.size[1]),
        layer: index,
        alpha: rand(layer.alpha[0], layer.alpha[1]),
        twinkle: twinkles ? rand(0.25, 0.6) : rand(0, 0.1),
        speed: rand(0.6, 2.2),
        phase: Math.random() * Math.PI * 2,
        tint: TINTS[Math.floor(Math.random() * TINTS.length)],
        glow: index === 2 && Math.random() < 0.35,
        ox: 0,
        oy: 0,
      });
    }
  });
  return stars;
}

// A soft round halo, rendered once and stamped behind bright points. Cool blue for
// stars and shooting stars; warm gold for the satellite.
function createGlowSprite(core = '200,225,255', edge = '170,205,255') {
  const size = 32;
  const sprite = document.createElement('canvas');
  sprite.width = sprite.height = size;
  const g = sprite.getContext('2d')!;
  const gradient = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, `rgba(${core},0.55)`);
  gradient.addColorStop(0.35, `rgba(${edge},0.18)`);
  gradient.addColorStop(1, `rgba(${edge},0)`);
  g.fillStyle = gradient;
  g.fillRect(0, 0, size, size);
  return sprite;
}

function createSatellite(width: number, height: number): Satellite {
  // Enters just off one side and leaves off the other on a gently tilted line in the
  // upper sky
  const goingRight = Math.random() < 0.5;
  const startX = goingRight ? -20 : width + 20;
  const endX = goingRight ? width + 20 : -20;
  const startY = rand(height * 0.08, height * 0.4);
  const endY = startY + rand(-height * 0.05, height * 0.12);
  const life = rand(...SATELLITE_CROSSING);
  return {
    x: startX,
    y: startY,
    vx: (endX - startX) / life,
    vy: (endY - startY) / life,
    age: 0,
    life,
    blinkOffset: Math.random() * BLINK_PERIOD,
  };
}

function createShootingStar(width: number, height: number): ShootingStar {
  // Falls left or right at 18–38° below horizontal, starting in the upper sky
  const angle = rand(18, 38) * (Math.PI / 180);
  const goingRight = Math.random() < 0.5;
  return {
    x: rand(width * 0.1, width * 0.9),
    y: rand(height * 0.05, height * 0.45),
    dx: Math.cos(angle) * (goingRight ? 1 : -1),
    dy: Math.sin(angle),
    speed: rand(700, 1100),
    length: rand(90, 180),
    age: 0,
    life: rand(0.7, 1.1),
  };
}

export default function NightSky({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !parent || !ctx) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const glowSprite = createGlowSprite();
    const satelliteGlowSprite = createGlowSprite(SATELLITE_GLOW_CORE, SATELLITE_GLOW_EDGE);

    let width = 0;
    let height = 0;
    let stars: Star[] = [];
    let shootingStar: ShootingStar | null = null;
    let nextShootingStar = rand(3, 8); // first one comes a little sooner
    let satellite: Satellite | null = null;
    let nextSatellite = rand(...SATELLITE_FIRST);
    let elapsed = 0;
    let last = performance.now();
    let frame = 0;
    // Pointer position in canvas coordinates, or null when it's not over the sky
    let pointer: { x: number; y: number } | null = null;
    // The planet's circle in canvas coordinates (measured from the element marked
    // data-night-sky-horizon), or null if the page has no horizon
    let horizon: { cx: number; cy: number; r: number } | null = null;

    function measureHorizon() {
      const el = parent!.querySelector<HTMLElement>('[data-night-sky-horizon]');
      if (!el) {
        horizon = null;
        return;
      }
      const box = el.getBoundingClientRect();
      const origin = canvas!.getBoundingClientRect();
      horizon = {
        cx: box.left - origin.left + box.width / 2,
        cy: box.top - origin.top + box.height / 2,
        r: box.width / 2,
      };
    }

    function resize() {
      const rect = parent!.getBoundingClientRect();
      const newWidth = Math.round(rect.width);
      const newHeight = Math.round(rect.height);
      if (newWidth === 0 || newHeight === 0) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas!.width = newWidth * dpr;
      canvas!.height = newHeight * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (stars.length === 0 || newWidth !== width) {
        // New width (or first run): regenerate for the new area
        stars = createStars(newWidth, newHeight);
      } else if (newHeight !== height) {
        // Height-only change (e.g. a phone's address bar): stretch, don't reshuffle
        const scale = newHeight / height;
        stars.forEach((star) => (star.y *= scale));
      }
      width = newWidth;
      height = newHeight;
      measureHorizon();
      if (reducedMotion) draw();
    }

    function draw() {
      ctx!.clearRect(0, 0, width, height);

      // Nothing in the sky is drawn inside the planet: clip to "everything except
      // the planet's circle" for this frame
      ctx!.save();
      if (horizon) {
        ctx!.beginPath();
        ctx!.rect(0, 0, width, height);
        ctx!.arc(horizon.cx, horizon.cy, horizon.r, 0, Math.PI * 2);
        ctx!.clip('evenodd');
      }

      for (const star of stars) {
        const sx = star.x + star.ox;
        const sy = star.y + star.oy;

        // Stars dim as they near the horizon, like looking through more atmosphere,
        // so they fade out rather than vanish at the edge
        let horizonFade = 1;
        if (horizon) {
          const above = Math.hypot(sx - horizon.cx, sy - horizon.cy) - horizon.r;
          if (above <= 0) continue;
          if (above < HORIZON_FADE) horizonFade = above / HORIZON_FADE;
        }

        const flicker = reducedMotion
          ? 0
          : Math.sin(elapsed * star.speed + star.phase) * star.twinkle;
        const alpha =
          horizonFade *
          Math.max(0, Math.min(1, star.alpha * (1 - star.twinkle * 0.5) + flicker * star.alpha));
        if (star.glow) {
          const haloSize = star.size * 9;
          ctx!.globalAlpha = alpha * 0.8;
          ctx!.drawImage(glowSprite, sx - haloSize / 2, sy - haloSize / 2, haloSize, haloSize);
        }
        ctx!.globalAlpha = alpha;
        ctx!.fillStyle = `rgb(${star.tint})`;
        if (star.size < 1.2) {
          ctx!.fillRect(sx, sy, star.size, star.size);
        } else {
          ctx!.beginPath();
          ctx!.arc(sx, sy, star.size / 2, 0, Math.PI * 2);
          ctx!.fill();
        }
      }

      if (shootingStar) {
        const s = shootingStar;
        // Ease in quickly, then fade out over the rest of its life
        const t = s.age / s.life;
        const fade = t < 0.15 ? t / 0.15 : 1 - (t - 0.15) / 0.85;
        const tailX = s.x - s.dx * s.length;
        const tailY = s.y - s.dy * s.length;
        const trail = ctx!.createLinearGradient(s.x, s.y, tailX, tailY);
        trail.addColorStop(0, `rgba(255,255,255,${0.9 * fade})`);
        trail.addColorStop(0.3, `rgba(200,225,255,${0.35 * fade})`);
        trail.addColorStop(1, 'rgba(200,225,255,0)');
        ctx!.globalAlpha = 1;
        ctx!.strokeStyle = trail;
        ctx!.lineWidth = 1.5;
        ctx!.lineCap = 'round';
        ctx!.beginPath();
        ctx!.moveTo(s.x, s.y);
        ctx!.lineTo(tailX, tailY);
        ctx!.stroke();
        ctx!.globalAlpha = fade;
        ctx!.drawImage(glowSprite, s.x - 8, s.y - 8, 16, 16);
      }

      if (satellite) {
        const sat = satellite;
        // Fade in/out over the first and last 8% of the crossing
        const t = sat.age / sat.life;
        const edgeFade = Math.max(0, Math.min(1, t / 0.08, (1 - t) / 0.08));
        // Beacon: a sharp flash that decays over BLINK_LENGTH, once per BLINK_PERIOD
        const blinkPhase = (sat.age + sat.blinkOffset) % BLINK_PERIOD;
        const flash = blinkPhase < BLINK_LENGTH ? 1 - blinkPhase / BLINK_LENGTH : 0;

        if (flash > 0) {
          const haloSize = 10 + flash * 10;
          ctx!.globalAlpha = flash * edgeFade;
          ctx!.drawImage(
            satelliteGlowSprite,
            sat.x - haloSize / 2,
            sat.y - haloSize / 2,
            haloSize,
            haloSize
          );
        }
        ctx!.globalAlpha = (0.55 + flash * 0.45) * edgeFade;
        ctx!.fillStyle = SATELLITE_COLOR;
        ctx!.beginPath();
        ctx!.arc(sat.x, sat.y, 0.9 + flash * 0.4, 0, Math.PI * 2);
        ctx!.fill();
      }

      ctx!.restore();
      ctx!.globalAlpha = 1;
    }

    function tick(now: number) {
      // Clamp the step so returning to a background tab doesn't jump the sky
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      elapsed += dt;

      // Frame-rate independent decay back toward each star's home position
      const settle = Math.exp(-RETURN_RATE * dt);

      for (const star of stars) {
        star.x -= LAYERS[star.layer].drift * dt;
        if (star.x < -3) star.x += width + 6;

        // Always drift slowly back home...
        star.ox *= settle;
        star.oy *= settle;

        // ...and while the pointer overlaps the star's current position, push it
        // straight away from the pointer. Only ever outward along that line, so stars
        // part and settle rather than sliding around the pointer.
        if (pointer) {
          const dx = star.x + star.ox - pointer.x;
          const dy = star.y + star.oy - pointer.y;
          const distance = Math.hypot(dx, dy);
          if (distance < POINTER_RADIUS) {
            const overlap = POINTER_RADIUS - distance;
            const step = overlap * POINTER_STRENGTH[star.layer] * PUSH_RATE * dt;
            // A star exactly under the pointer gets pushed in a fixed per-star direction
            const nx = distance > 0.01 ? dx / distance : Math.cos(star.phase);
            const ny = distance > 0.01 ? dy / distance : Math.sin(star.phase);
            star.ox += nx * step;
            star.oy += ny * step;
          }
        }
      }

      nextShootingStar -= dt;
      if (!shootingStar && nextShootingStar <= 0) {
        shootingStar = createShootingStar(width, height);
        nextShootingStar = rand(...SHOOTING_STAR_GAP);
      }
      if (shootingStar) {
        shootingStar.age += dt;
        shootingStar.x += shootingStar.dx * shootingStar.speed * dt;
        shootingStar.y += shootingStar.dy * shootingStar.speed * dt;
        if (shootingStar.age >= shootingStar.life) shootingStar = null;
      }

      // The gap to the next satellite only counts down once the sky is clear of one
      if (!satellite) {
        nextSatellite -= dt;
        if (nextSatellite <= 0) satellite = createSatellite(width, height);
      } else {
        satellite.age += dt;
        satellite.x += satellite.vx * dt;
        satellite.y += satellite.vy * dt;
        if (satellite.age >= satellite.life) {
          satellite = null;
          nextSatellite = rand(...SATELLITE_GAP);
        }
      }

      draw();
      frame = requestAnimationFrame(tick);
    }

    // Track the pointer over the whole sky (events from the title and cards bubble up
    // to the parent; the canvas itself ignores the pointer so the links stay clickable)
    function handlePointerMove(e: PointerEvent) {
      const rect = canvas!.getBoundingClientRect();
      pointer = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }
    function handlePointerLeave() {
      pointer = null;
    }

    const observer = new ResizeObserver(resize);
    observer.observe(parent);
    resize();
    if (!reducedMotion) {
      parent.addEventListener('pointermove', handlePointerMove);
      parent.addEventListener('pointerleave', handlePointerLeave);
      parent.addEventListener('pointercancel', handlePointerLeave);
      frame = requestAnimationFrame(tick);
    }

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      parent.removeEventListener('pointermove', handlePointerMove);
      parent.removeEventListener('pointerleave', handlePointerLeave);
      parent.removeEventListener('pointercancel', handlePointerLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 h-full w-full ${className ?? ''}`}
    />
  );
}
