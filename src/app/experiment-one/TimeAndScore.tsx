'use client';

import React from 'react';

type Props = {
  playerScore: number;
  timeLeft: number;
};

export default function TimeAndScore({ playerScore, timeLeft }: Props) {
  return (
    <div className="p-2 flex flex-col items-end items-center bg-white">
      <div className="text-padauk font-light text-4xl">{timeLeft}</div>
      <div className="text-mahogany font-bold text-xs">TIME</div>
      <div className="text-padauk font-light text-4xl">{playerScore}</div>
      <div className="text-mahogany font-bold text-xs">SCORE</div>
    </div>
  );
}
