'use client';

import React, { useEffect, useRef } from 'react';

type Props = {
  playerScore: number;
  timeLeft: number;
};

// How long the score takes to count up to a new total
const COUNT_MS = 700;
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

export default function TimeAndScore({ playerScore, timeLeft }: Props) {
  const boxRef = useRef<HTMLDivElement>(null);
  const scoreRef = useRef<HTMLSpanElement>(null);
  const gainsRef = useRef<HTMLDivElement>(null);
  const shownRef = useRef<number | null>(null);

  // When the score goes up: the box presses into its shadow, the points earned float
  // out beside it, and the score counts up to the new total. The score's text is
  // written here rather than rendered, since it changes every frame while counting.
  useEffect(() => {
    const score = scoreRef.current;
    const box = boxRef.current;
    const gains = gainsRef.current;
    if (!score || !box || !gains) return;

    const from = shownRef.current ?? playerScore;
    const to = playerScore;
    shownRef.current = to;
    const show = (value: number) => (score.textContent = String(value));

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (to <= from || reduced || document.hidden) {
      show(to);
      return;
    }

    // Press (restart the animation if it's still running from the last score)
    box.classList.remove('art-score-press');
    void box.offsetWidth;
    box.classList.add('art-score-press');

    const gain = document.createElement('span');
    gain.className = 'art-score-gain';
    gain.textContent = `+${to - from}`;
    gain.addEventListener('animationend', () => gain.remove());
    gains.appendChild(gain);

    let frame = 0;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / COUNT_MS);
      show(Math.round(from + (to - from) * easeOut(t)));
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    // Animation frames stop in a background tab: make sure the total still lands
    const settle = window.setTimeout(() => show(to), COUNT_MS + 100);

    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(settle);
      show(to);
    };
  }, [playerScore]);

  return (
    // art-score-box: offset shadow like the canvas's, in the lighter padauk (see
    // globals.css). The numbers are at least 3 digits wide (ch is a digit's width at
    // their size).
    <div
      ref={boxRef}
      className="art-score-box relative flex flex-col items-start rounded-tl-lg border-2 border-mahogany bg-white px-2 py-1"
    >
      <div className="text-padauk font-light text-4xl leading-none tabular-nums min-w-[3ch]">
        {timeLeft}
      </div>
      <div className="text-mahogany font-black text-[11px] mb-1">TIME</div>
      <span
        ref={scoreRef}
        className="text-padauk font-light text-4xl leading-none tabular-nums min-w-[3ch]"
      />
      <div className="text-mahogany font-black text-[11px]">SCORE</div>
      {/* The "+points" for each scored drawing float up from here */}
      <div ref={gainsRef} aria-hidden="true" className="art-score-gains" />
    </div>
  );
}
