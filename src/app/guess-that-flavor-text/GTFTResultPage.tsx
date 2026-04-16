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
  today,
  gameNumber,
}: {
  card: Card;
  correct: boolean;
  score: number;
  guess: string | null;
  storageKey: string;
  defaultState: DayState;
  setDayState: React.Dispatch<React.SetStateAction<DayState>>;
  setPage: React.Dispatch<React.SetStateAction<0 | 1 | 2>>;
  today: Date;
  gameNumber: number;
}) {
  // --- Streak logic ---
  const [streak, setStreak] = React.useState(1);
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const streakKey = 'flavor-game-streak';
    const lastPlayedKey = 'flavor-game-last-played';
    const todayStr = today.toISOString().slice(0, 10); // YYYY-MM-DD
    let newStreak = 1;
    try {
      const lastPlayed = localStorage.getItem(lastPlayedKey);
      const streakVal = parseInt(localStorage.getItem(streakKey) || '1', 10);
      if (lastPlayed) {
        const last = new Date(lastPlayed);
        const diffDays = Math.floor((today.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          newStreak = streakVal + 1;
        } else if (diffDays === 0) {
          newStreak = streakVal;
        } else {
          newStreak = 1;
        }
      }
      localStorage.setItem(streakKey, String(newStreak));
      localStorage.setItem(lastPlayedKey, todayStr);
    } catch {}
    setStreak(newStreak);
  }, [today]);

  // --- Countdown logic ---
  const [countdown, setCountdown] = React.useState('');
  React.useEffect(() => {
    function updateCountdown() {
      const now = new Date();
      const nextMidnight = new Date(now);
      nextMidnight.setHours(24, 0, 0, 0);
      const diff = nextMidnight.getTime() - now.getTime();
      if (diff <= 0) {
        setCountdown('00:00:00');
        return;
      }
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setCountdown(
        `${hours.toString().padStart(2, '0')}:` +
          `${minutes.toString().padStart(2, '0')}:` +
          `${seconds.toString().padStart(2, '0')}`
      );
    }
    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="min-h-[calc(100dvh-62px)] flex flex-col items-center w-full pt-2 sm:pt-5">
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
        className="barlow-cond text-white font-bold bg-tide px-3 py-2 rounded text-[18px] cursor-pointer hover:bg-wave transition-colors mb-3"
        onClick={() => {
          const shareText = `Guess That Flavor Text #${gameNumber}\n${correct ? '✅' : '❌'} ${score}/4\n${window.location.href}`;
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

      <div className="bg-ghost border border-solid border-stone px-2 py-1 rounded flex items-center gap-2 mb-1">
        <Image
          src="/fire-energy.png"
          alt="Fire Energy"
          width={17}
          height={17}
          style={{ width: 17, height: 17 }}
        />
        <span className="barlow text-sm text-stone font-bold">{streak} Day Streak</span>
      </div>
      <p className="barlow text-xs text-slate">Next card in: {countdown}</p>

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
