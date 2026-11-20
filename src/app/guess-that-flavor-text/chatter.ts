// Unknown Q's "talking" squash: a soft squash-and-stretch loop on the logo while it says
// something, and the spit that gives out redemption hints. The logo should have its
// transform origin at the bottom, so it stays planted.

// One loop: squash about 4.5%, stretch back a little past rest, settle. Easing is per
// keyframe so each step eases like a CSS animation would.
const CHATTER: Keyframe[] = [
  { transform: 'scale(1, 1)', easing: 'ease-in-out' },
  { transform: 'scale(1.035, 0.955)', offset: 0.3, easing: 'ease-in-out' },
  { transform: 'scale(0.985, 1.025)', offset: 0.6, easing: 'ease-in-out' },
  { transform: 'scale(1, 1)' },
];
const LOOP_MS = 400;
const SETTLE_MS = 250;

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// The spit: a squash in, then a little lurch up as a hint leaves
const SPIT: Keyframe[] = [
  { transform: 'scale(1, 1)' },
  { transform: 'scale(1.1, 0.86)', offset: 0.35, easing: 'ease-in' },
  { transform: 'scale(0.93, 1.1) translateY(-4px)', offset: 0.6, easing: 'ease-out' },
  { transform: 'scale(1, 1)' },
];
const SPIT_MS = 420;
// When in the spit the hint leaves, how long its flight takes, and the gap to the next
const LAUNCH_AT_MS = 230;
const FLIGHT_MS = 650;
const NEXT_HINT_MS = 700;

/**
 * Redemption: Unknown Q chatters, then spits each hint out of its round middle to land at
 * the hint's own spot (beside it), with a short chatter before each later hint. The hints
 * start hidden (opacity 0) and each is shown as it launches. Returns a function that
 * cancels the sequence and shows every hint where it belongs. Reduced motion shows them
 * straight away.
 */
export function spitHints(logo: HTMLElement, hints: HTMLElement[]): () => void {
  const show = (hint: HTMLElement) => {
    hint.style.opacity = '1';
  };
  if (prefersReducedMotion()) {
    hints.forEach(show);
    return () => {};
  }
  const timers: ReturnType<typeof setTimeout>[] = [];
  const animations: Animation[] = [];
  const at = (ms: number, run: () => void) => timers.push(setTimeout(run, ms));

  // Timed with timers rather than animation events, so a paused or hidden page can't
  // strand a hint unshown
  let t = 0;
  animations.push(logo.animate(CHATTER, { duration: LOOP_MS, iterations: 2 }));
  t += LOOP_MS * 2;
  hints.forEach((hint, i) => {
    if (i > 0) {
      at(t, () => animations.push(logo.animate(CHATTER, { duration: LOOP_MS })));
      t += LOOP_MS;
    }
    at(t, () => animations.push(logo.animate(SPIT, { duration: SPIT_MS })));
    at(t + LAUNCH_AT_MS, () => {
      show(hint);
      animations.push(fly(hint, logo, i % 2 === 0 ? -1 : 1));
    });
    t += NEXT_HINT_MS;
  });

  return () => {
    timers.forEach(clearTimeout);
    animations.forEach((a) => a.cancel());
    hints.forEach(show);
  };
}

/** How long `spitHints` takes, until the last hint has landed (immediate for reduced motion) */
export function spitDurationMs(hintCount: number): number {
  if (hintCount === 0 || prefersReducedMotion()) return 0;
  return LOOP_MS * 2 + (hintCount - 1) * (LOOP_MS + NEXT_HINT_MS) + LAUNCH_AT_MS + FLIGHT_MS;
}

// A hint's flight from the logo's round middle, up in an arc, to its own spot
function fly(hint: HTMLElement, logo: HTMLElement, side: -1 | 1): Animation {
  const l = logo.getBoundingClientRect();
  const h = hint.getBoundingClientRect();
  const dx = l.left + l.width / 2 - (h.left + h.width / 2);
  const dy = l.top + l.height * 0.74 - (h.top + h.height / 2);
  return hint.animate(
    [
      { transform: `translate(${dx}px, ${dy}px) scale(0.2)`, opacity: 0 },
      {
        transform: `translate(${dx * 0.4}px, ${dy - 46}px) rotate(${side * 12}deg) scale(0.9)`,
        opacity: 1,
        offset: 0.45,
      },
      { transform: 'scale(1.06)', offset: 0.8 },
      { transform: 'none', opacity: 1 },
    ],
    { duration: FLIGHT_MS, easing: 'cubic-bezier(0.3, 0.7, 0.4, 1)' }
  );
}

/**
 * Starts the chatter on `el` and returns a function that stops it, easing back to rest
 * from wherever the loop was. `loops` limits it to that many loops (it stops itself);
 * otherwise it runs until stopped. Does nothing for reduced motion.
 */
export function startChatter(el: HTMLElement, loops = Infinity): () => void {
  if (prefersReducedMotion()) return () => {};
  const loop = el.animate(CHATTER, { duration: LOOP_MS, iterations: loops });
  let stopped = false;
  return () => {
    if (stopped) return;
    stopped = true;
    if (loop.playState === 'finished') return;
    const from = getComputedStyle(el).transform;
    loop.cancel();
    el.animate([{ transform: from }, { transform: 'none' }], {
      duration: SETTLE_MS,
      easing: 'ease-out',
    });
  };
}
