'use client';

import React, { useEffect, useRef, useState } from 'react';

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
  // Never changes, so React never touches the score's text after the first render
  const [initialScore] = useState(playerScore);

  // When the score goes up: the box presses into its shadow, the points earned float
  // out beside it, and the score counts up to the new total. The score's text is
  // updated here rather than re-rendered, since it changes every frame while counting.
  useEffect(() => {
    const score = scoreRef.current;
    const box = boxRef.current;
    const gains = gainsRef.current;
    if (!score || !box || !gains) return;

    const from = shownRef.current ?? playerScore;
    const to = playerScore;
    shownRef.current = to;
    // Updates the text node React rendered, rather than replacing it
    const show = (value: number) => {
      if (score.firstChild) score.firstChild.nodeValue = String(value);
      else score.textContent = String(value);
    };

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (to <= from || reduced || document.hidden) {
      show(to);
      return;
    }

    // Press into the shadow and spring back. A fresh Web Animation every time: toggling
    // a CSS animation class doesn't reliably replay it.
    const padauk =
      getComputedStyle(document.documentElement).getPropertyValue('--color-padauk').trim() ||
      '#815555';
    // The springy easing runs on each leg (in and back out), so it overshoots both ways
    const spring = 'cubic-bezier(0.3, 0.7, 0.4, 1.4)';
    box.animate(
      [
        { transform: 'translate(0, 0)', boxShadow: `10px 10px 0 ${padauk}`, easing: spring },
        {
          transform: 'translate(7px, 7px)',
          boxShadow: `3px 3px 0 ${padauk}`,
          offset: 0.35,
          easing: spring,
        },
        { transform: 'translate(0, 0)', boxShadow: `10px 10px 0 ${padauk}` },
      ],
      420
    );

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
    // their size). Time above score beside the canvas; side by side on phones, where
    // the box sits under it.
    <div
      ref={boxRef}
      className="art-score-box relative flex flex-col gap-1 max-md:flex-row max-md:gap-4 rounded-tl-lg border-2 border-mahogany bg-white px-2 py-1"
    >
      <div className="flex flex-col items-start">
        <div className="text-padauk font-light text-4xl leading-none tabular-nums min-w-[3ch]">
          {timeLeft}
        </div>
        <div className="text-mahogany font-black text-[11px]">TIME</div>
      </div>
      <div className="flex flex-col items-start">
        {/* Rendered once with the starting score so it shows straight away; after
            that the effect above updates it */}
        <span
          ref={scoreRef}
          className="text-padauk font-light text-4xl leading-none tabular-nums min-w-[3ch]"
        >
          {initialScore}
        </span>
        <div className="text-mahogany font-black text-[11px]">SCORE</div>
      </div>
      {/* The "+points" for each scored drawing float up from here */}
      <div ref={gainsRef} aria-hidden="true" className="art-score-gains" />
    </div>
  );
}
