import * as React from 'react';
import Image from 'next/image';
import type { Card } from './types.ts';
import { daysBetween, localDateKey, parseDateKey } from './dates';
import Star from './Star';
import { BottomSpacer, TopSpacer } from './Spacers';

export default function GTFTResultPage({
  card,
  correct,
  score,
  onReset,
  today,
  gameNumber,
}: {
  card: Card;
  correct: boolean;
  score: number;
  onReset: () => void;
  today: Date;
  gameNumber: number;
}) {
  // --- Streak logic ---
  // Worked out once when the result first shows. This page only renders in the browser
  // (after the game loads), and re-running it the same day gives the same answer.
  const [streak] = React.useState(() => {
    if (typeof window === 'undefined') return 1;
    const streakKey = 'flavor-game-streak';
    const lastPlayedKey = 'flavor-game-last-played';
    // Local calendar dates on both sides; toISOString would store the UTC date, which is
    // already tomorrow for US evening players and broke the day difference
    const todayStr = localDateKey(today);
    let newStreak = 1;
    try {
      const lastPlayed = localStorage.getItem(lastPlayedKey);
      const streakVal = parseInt(localStorage.getItem(streakKey) || '1', 10);
      if (lastPlayed) {
        const diffDays = daysBetween(parseDateKey(lastPlayed), today);
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
    return newStreak;
  });

  // --- Share ---
  // Phones and tablets get the native share sheet; desktop copies the same message
  // The message stays set while the toast fades out, so it doesn't empty mid-fade
  const [toastMessage, setToastMessage] = React.useState('');
  const [toastVisible, setToastVisible] = React.useState(false);
  const toastTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  React.useEffect(() => () => clearTimeout(toastTimer.current ?? undefined), []);

  function showToast(message: string) {
    setToastMessage(message);
    setToastVisible(true);
    clearTimeout(toastTimer.current ?? undefined);
    toastTimer.current = setTimeout(() => setToastVisible(false), 2000);
  }

  async function handleShare() {
    const shareText = `Guess That Flavor Text #${gameNumber}\n${correct ? '✅' : '❌'} ${score}/4\n${window.location.href}`;
    const nav = navigator as Navigator & { userAgentData?: { mobile: boolean } };
    const isMobile =
      nav.userAgentData?.mobile ?? /Android|iPhone|iPad|iPod|Mobile/i.test(nav.userAgent);
    if (isMobile && navigator.share) {
      try {
        await navigator.share({ text: shareText });
      } catch {
        // Closing the share sheet without picking anything is fine
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(shareText);
      showToast('Copied to clipboard!');
    } catch {
      showToast("Couldn't copy to clipboard");
    }
  }

  // The reveal animation waits for the card image (cards without one skip straight to it)
  const [cardLoaded, setCardLoaded] = React.useState(!card.image);
  // Don't leave the card dark forever if the image is slow or its load event is missed
  React.useEffect(() => {
    const fallback = setTimeout(() => setCardLoaded(true), 4000);
    return () => clearTimeout(fallback);
  }, []);

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
    <section
      className={`min-h-full flex flex-col items-center w-full py-3 ${cardLoaded ? '' : 'reveal-pending'}`}
    >
      <TopSpacer />
      {/* Result text waits for the card reveal below to finish (see .card-reveal in globals.css) */}
      <div className="flex flex-col gap-0 items-center mb-4">
        <div className="result-heading-in flex flex-col items-center">
          <h1 className="barlow font-bold text-[45px] text-tide mb-0">
            {correct ? 'CORRECT' : 'INCORRECT'}
          </h1>
          {correct ? (
            <h2 className="barlow text-wave font-light text-[24px] mb-0 -mt-3">
              {score} POINT{score === 1 ? '' : 'S'} EARNED
            </h2>
          ) : (
            <div className="barlow text-wave font-light text-[24px] mb-0 -mt-3">
              Try again tomorrow!
            </div>
          )}
        </div>
        {correct && (
          <div
            className="result-stars-in flex items-center gap-1 text-wave mt-1"
            aria-label={`${score} of 4 points`}
          >
            {Array.from({ length: 4 }, (_, i) => (
              <Star key={i} size={20} filled={i < score} />
            ))}
          </div>
        )}
      </div>

      {/* Card image: starts blacked out, a spotlight roams over it, then it's revealed */}
      {card.image && (
        <div className="flex justify-center mb-4">
          <div className="card-reveal relative overflow-hidden rounded-xl shadow-[0_8px_24px_#47679c40]">
            <Image
              src={card.image}
              alt={card.name}
              width={250}
              height={Math.round((250 / 192) * 268)}
              className="block"
              loading="eager"
              onLoad={() => setCardLoaded(true)}
              onError={() => setCardLoaded(true)}
            />
            <div
              className="card-reveal-cover pointer-events-none absolute inset-0"
              aria-hidden="true"
            />
          </div>
        </div>
      )}
      {/* Share, streak, countdown and dev reset fade in after the card reveal and the
          result heading (see .result-details-in in globals.css) */}
      <div className="result-details-in flex flex-col items-center">
        {/* Share button */}
        <button
          className="barlow text-white font-medium bg-tide h-[52px] px-4 rounded-xs text-base cursor-pointer [&:hover]:bg-wave transition-colors mb-3"
          onClick={handleShare}
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
        <p className="barlow text-xs text-slate pb-3">Next card in: {countdown}</p>

        {/* Developer-only reset button */}
        {typeof window !== 'undefined' &&
          (window.location.hostname === 'localhost' || window.location.search.includes('dev')) && (
            <button
              className="mt-2 bg-none border border-dashed border-slate text-wave rounded-lg px-5 py-1.5 text-[13px] cursor-pointer block mx-auto"
              onClick={onReset}
              title="Reset game (developer only)"
            >
              Reset (dev)
            </button>
          )}
      </div>

      {/* Toast for desktop share */}
      <div
        role="status"
        aria-live="polite"
        className={`barlow pointer-events-none fixed top-[calc(env(safe-area-inset-top)_+_78px)] left-1/2 z-50 -translate-x-1/2 rounded-md bg-slate px-4 py-2 text-sm font-medium text-white shadow-[0_8px_24px_#47679c40] transition-all duration-300 ${toastVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}
      >
        {toastMessage}
      </div>
      <BottomSpacer />
    </section>
  );
}
