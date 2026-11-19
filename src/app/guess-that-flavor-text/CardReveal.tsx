import * as React from 'react';
import Image from 'next/image';
import Star from './Star';

// The result card's reveal animations; the CSS for each is under "Result card reveals"
// in globals.css. Each one's sprite (if any) is loaded before the reveal starts, since a
// mask image that hasn't loaded hides the cover and would show the card.
const REVEALS = {
  spotlight: { sprite: null },
  smoke: { sprite: '/gtft-reveal-smoke.png' },
  ink: { sprite: '/gtft-reveal-ink.png' },
  zigzag: { sprite: null },
} as const;

export type Reveal = keyof typeof REVEALS;
export const REVEAL_NAMES = Object.keys(REVEALS) as Reveal[];

// What the card does once it's revealed
export const FINALE_NAMES = ['big-pop', 'shake', 'jelly', 'tada'] as const;
export type Finale = (typeof FINALE_NAMES)[number];

// The star burst for a right guess: where each star flies to, as an angle around the card
// (degrees), a distance, a size and a spin. Fixed, so it looks the same for everyone.
const STARS = [
  [0, 170, 20, 90],
  [28, 205, 14, -120],
  [62, 180, 24, 60],
  [95, 210, 16, -40],
  [125, 175, 20, 150],
  [152, 200, 14, -90],
  [185, 170, 22, 110],
  [215, 205, 16, -150],
  [245, 180, 20, 40],
  [272, 210, 14, -70],
  [300, 175, 24, 130],
  [332, 200, 16, -110],
] as const;
const STAR_COLORS = ['text-tide', 'text-wave', 'text-splash', 'text-slate'];

// Items in a shuffled order for one run of days, from a small seeded PRNG (mulberry32)
function shuffledRun<T>(items: readonly T[], run: number, salt: number): T[] {
  let seed = (run + 1) * 0x9e3779b9 + salt;
  const random = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const order = [...items];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

/**
 * Picks one of `items` for a puzzle. Everyone gets the same one on the same day, each item
 * plays once in each run of days (one day per item) in a shuffled order, and the same item
 * never plays two days running. `salt` keeps different lists from pairing up the same way.
 */
function dailyPick<T>(items: readonly T[], gameNumber: number, salt: number): T {
  const count = items.length;
  const day = Math.max(gameNumber - 1, 0);
  const run = Math.floor(day / count);
  const order = shuffledRun(items, run, salt);
  // Where runs meet, don't open with the item the last run ended on. Only the first two
  // swap, so a run's last item never changes and this needs no further look back.
  if (run > 0 && order[0] === shuffledRun(items, run - 1, salt)[count - 1]) {
    [order[0], order[1]] = [order[1], order[0]];
  }
  return order[day % count];
}

export function revealForGame(gameNumber: number): Reveal {
  return dailyPick(REVEAL_NAMES, gameNumber, 0);
}

export function finaleForGame(gameNumber: number): Finale {
  return dailyPick(FINALE_NAMES, gameNumber, 7919);
}

export function isReveal(name: string | null): name is Reveal {
  return name !== null && Object.hasOwn(REVEALS, name);
}

export function isFinale(name: string | null): name is Finale {
  return (FINALE_NAMES as readonly (string | null)[]).includes(name);
}

export default function CardReveal({
  reveal,
  finale,
  stars,
  image,
  name,
  onReady,
}: {
  reveal: Reveal;
  finale: Finale;
  /** Burst stars out from the card as it finishes (for a right guess) */
  stars: boolean;
  image: string;
  name: string;
  onReady: () => void;
}) {
  const sprite = REVEALS[reveal].sprite;
  const [imageDone, setImageDone] = React.useState(false);
  const [spriteDone, setSpriteDone] = React.useState(!sprite);

  React.useEffect(() => {
    if (!sprite) return;
    const preload = new window.Image();
    preload.src = sprite;
    // decode() also settles when the image fails, so the reveal never waits forever
    preload
      .decode()
      .catch(() => {})
      .then(() => setSpriteDone(true));
  }, [sprite]);

  React.useEffect(() => {
    if (imageDone && spriteDone) onReady();
  }, [imageDone, spriteDone, onReady]);

  return (
    <div className="flex justify-center mb-5">
      {/* The finale (and the stars) start when this reveal ends: see --reveal-end */}
      <div className={`card-reveal-finale card-finale-${finale} relative`} data-reveal={reveal}>
        <div
          className={`card-reveal card-reveal-${reveal} relative overflow-hidden rounded-xl shadow-[0_8px_24px_#47679c40]`}
        >
          <Image
            src={image}
            alt={name}
            width={250}
            height={Math.round((250 / 192) * 268)}
            className="card-reveal-img block"
            loading="eager"
            onLoad={() => setImageDone(true)}
            onError={() => setImageDone(true)}
          />
          <div
            className="card-reveal-cover pointer-events-none absolute inset-0"
            aria-hidden="true"
          />
          {reveal === 'smoke' && (
            <div
              className="card-reveal-haze pointer-events-none absolute inset-0"
              aria-hidden="true"
            />
          )}
          {reveal === 'zigzag' && (
            <div
              className="card-reveal-cover card-reveal-cover-bottom pointer-events-none absolute inset-0"
              aria-hidden="true"
            />
          )}
        </div>
        {stars && (
          <div className="card-reveal-stars pointer-events-none" aria-hidden="true">
            {STARS.map(([angle, distance, size, spin], i) => {
              const radians = (angle * Math.PI) / 180;
              return (
                <span
                  key={i}
                  className={`card-reveal-star ${STAR_COLORS[i % STAR_COLORS.length]}`}
                  style={
                    {
                      '--star-x': `${Math.round(Math.cos(radians) * distance)}px`,
                      // Taller than wide, like the card
                      '--star-y': `${Math.round(Math.sin(radians) * distance * 1.2)}px`,
                      '--star-spin': `${spin}deg`,
                      '--star-delay': `${(i % 3) * 40}ms`,
                    } as React.CSSProperties
                  }
                >
                  <Star size={size} />
                </span>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
