'use client';

import React from 'react';

type Props = {
  playerScore: number;
  timeLeft: number;
};

export default function TimeAndScore({ playerScore, timeLeft }: Props) {
  return (
    // Offset shadow like the canvas's, in the lighter padauk
    <div className="flex min-w-[74px] flex-col items-start border border-mahogany bg-white px-2 py-1 shadow-[10px_10px_0_var(--color-padauk)]">
      <div className="text-padauk font-light text-4xl leading-none tabular-nums">{timeLeft}</div>
      <div className="text-mahogany font-black text-[11px] mb-1">TIME</div>
      <div className="text-padauk font-light text-4xl leading-none tabular-nums">{playerScore}</div>
      <div className="text-mahogany font-black text-[11px]">SCORE</div>
    </div>
  );
}
