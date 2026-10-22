'use client';

import React from 'react';

type Props = {
  playerScore: number;
  timeLeft: number;
};

export default function TimeAndScore({ playerScore, timeLeft }: Props) {
  return (
    // Offset shadow like the canvas's, in the lighter padauk
    // The numbers are at least 3 digits wide (ch is a digit's width at their size)
    <div className="flex flex-col items-start rounded-tl-lg border-2 border-mahogany bg-white px-2 py-1 shadow-[10px_10px_0_var(--color-padauk)]">
      <div className="text-padauk font-light text-4xl leading-none tabular-nums min-w-[3ch]">
        {timeLeft}
      </div>
      <div className="text-mahogany font-black text-[11px] mb-1">TIME</div>
      <div className="text-padauk font-light text-4xl leading-none tabular-nums min-w-[3ch]">
        {playerScore}
      </div>
      <div className="text-mahogany font-black text-[11px]">SCORE</div>
    </div>
  );
}
