import * as React from 'react';
import Image from 'next/image';
import type { Card, DayState } from './types.ts';

export default function GTFTResultPage({
  card,
  correct,
  score,
  guess,
  storageKey,
  defaultState,
  setDayState,
  setPage,
}: {
  card: Card;
  correct: boolean;
  score: number;
  guess: string | null;
  storageKey: string;
  defaultState: DayState;
  setDayState: React.Dispatch<React.SetStateAction<DayState>>;
  setPage: React.Dispatch<React.SetStateAction<0 | 1 | 2>>;
}) {
  return (
    <section className="min-h-[calc(100vh-62px)] flex flex-col items-center w-full pt-2 sm:pt-5">
      <div className="flex flex-col gap-0 items-center mb-4">
        <h1 className="barlow-cond font-bold text-[45px] text-tide mb-0">
          {correct ? 'CORRECT' : 'INCORRECT'}
        </h1>
        {correct && (
          <div className="flex flex-col items-center -mt-3">
            <h2 className="barlow-cond text-wave font-light text-[24px] mb-0">
              {score} POINT{score === 1 ? '' : 'S'} EARNED
            </h2>
            <div className="text-[22px] text-wave -mt-[8px]">
              {'★'.repeat(score)}
              {'☆'.repeat(4 - score)}
            </div>
          </div>
        )}
        {!correct && (
          <div className="barlow-cond text-wave font-light text-[24px] mb-0 -mt-3">
            Try again tomorrow!
          </div>
        )}
      </div>

      {/* Card image */}
      {card.image && (
        <div className="flex justify-center mb-4">
          <Image
            src={card.image}
            alt={card.name}
            width={250}
            height={Math.round((250 / 192) * 268)}
            className="rounded-xl shadow-md"
          />
        </div>
      )}
      {/* Share button */}
      <button
        className="barlow-cond text-white font-bold bg-tide px-3 py-2 rounded text-[18px] cursor-pointer hover:bg-wave transition-colors"
        onClick={() => {
          const shareText = `Guess That Flavor Text\n${correct ? '✅' : '❌'} ${score}/4\n${card.flavorText}\n${window.location.href}`;
          if (navigator.share) {
            navigator.share({ text: shareText });
          } else {
            navigator.clipboard.writeText(shareText);
            alert('Result copied to clipboard!');
          }
        }}
      >
        Share
      </button>
      {/* Developer-only reset button */}
      {typeof window !== 'undefined' &&
        (window.location.hostname === 'localhost' || window.location.search.includes('dev')) && (
          <button
            className="mt-2 bg-none border border-dashed border-[#2876EC] text-[#2876EC] rounded-lg px-5 py-1.5 text-[13px] cursor-pointer block mx-auto"
            onClick={() => {
              localStorage.removeItem(storageKey);
              setDayState(defaultState);
              setPage(0);
            }}
            title="Reset game (developer only)"
          >
            Reset (dev)
          </button>
        )}
    </section>
  );
}
