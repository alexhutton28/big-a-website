import * as React from 'react';
import Image from 'next/image';
import type { Card } from './types.ts';
import { daysBetween, localDateKey, parseDateKey } from './dates';
import Star from './Star';
import { BottomSpacer, TopSpacer } from './Spacers';
import CardReveal, {
  FINALE_NAMES,
  finaleForGame,
  isFinale,
  isReveal,
  REVEAL_NAMES,
  revealForGame,
  type Finale,
  type Reveal,
} from './CardReveal';

// Dev-only extras (reset button, reveal picker) show on localhost or with ?dev in the URL
function isDev() {
  return (
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.search.includes('dev'))
  );
}

// Points as players read them: a redemption's half point is ½
function formatScore(score: number) {
  return score === 0.5 ? '½' : String(score);
}

export default function GTFTResultPage({
  card,
  correct,
  redeemed,
  score,
  onReset,
  today,
  gameNumber,
}: {
  card: Card;
  correct: boolean;
  /** Right on the redemption guess, after a wrong first one */
  redeemed: boolean;
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
    const shareText = `Guess That Flavor Text #${gameNumber}\n${correct ? '✅' : '❌'} ${formatScore(score)}/4\n${window.location.href}`;
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

  // --- Card reveal ---
  // A different reveal and finale each day, and a star burst for a right guess. In dev,
  // ?reveal=, ?finale= and ?stars=1|0, or the picker below, override them (see CardReveal.tsx)
  const [reveal, setReveal] = React.useState(() => {
    const asked = isDev() ? new URLSearchParams(window.location.search).get('reveal') : null;
    return isReveal(asked) ? asked : revealForGame(gameNumber);
  });
  const [finale, setFinale] = React.useState(() => {
    const asked = isDev() ? new URLSearchParams(window.location.search).get('finale') : null;
    return isFinale(asked) ? asked : finaleForGame(gameNumber);
  });
  const [stars, setStars] = React.useState(() => {
    const asked = isDev() ? new URLSearchParams(window.location.search).get('stars') : null;
    return asked === null ? correct : asked === '1';
  });
  // Bumped by the dev picker to replay the whole result sequence from the start
  const [run, setRun] = React.useState(0);
  // The reveal waits for the card image and its sprite (cards without an image skip it)
  const [cardLoaded, setCardLoaded] = React.useState(!card.image);
  const handleRevealReady = React.useCallback(() => setCardLoaded(true), []);
  // Don't leave the card covered forever if the image is slow or its load event is missed
  React.useEffect(() => {
    const fallback = setTimeout(() => setCardLoaded(true), 4000);
    return () => clearTimeout(fallback);
  }, [run]);

  // Dev: replay the result with a reveal, finale or star setting, and keep it in the URL
  // so a reload keeps it
  function replayWith(change: { reveal?: Reveal; finale?: Finale; stars?: boolean }) {
    const url = new URL(window.location.href);
    if (change.reveal) {
      setReveal(change.reveal);
      url.searchParams.set('reveal', change.reveal);
    }
    if (change.finale) {
      setFinale(change.finale);
      url.searchParams.set('finale', change.finale);
    }
    if (change.stars !== undefined) {
      setStars(change.stars);
      url.searchParams.set('stars', change.stars ? '1' : '0');
    }
    setCardLoaded(!card.image);
    setRun((r) => r + 1);
    window.history.replaceState(null, '', url);
  }

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
      // overflow-x-clip: the star burst flies past the screen edges on phones
      className={`min-h-full flex flex-col items-center w-full py-4 overflow-x-clip ${cardLoaded ? '' : 'reveal-pending'}`}
    >
      <TopSpacer />
      {/* Keyed by run so the dev picker can replay the whole sequence */}
      <React.Fragment key={run}>
        {/* Result text waits for the card reveal below to finish (see .card-reveal in globals.css) */}
        <div className="flex flex-col gap-0 items-center mb-5">
          <div className="result-heading-in flex flex-col items-center">
            <h1 className="barlow font-bold text-[45px] text-tide mb-0">
              {redeemed ? 'REDEMPTION' : correct ? 'CORRECT' : 'INCORRECT'}
            </h1>
            {correct ? (
              <h2 className="barlow text-wave font-light text-[24px] mb-0 -mt-4">
                {formatScore(score)} POINT{score === 1 || score === 0.5 ? '' : 'S'} EARNED
              </h2>
            ) : (
              <div className="barlow text-wave font-light text-[24px] mb-0 -mt-4">
                Try again tomorrow!
              </div>
            )}
          </div>
          {correct && (
            <div
              className="result-stars-in flex items-center gap-2 text-wave mt-2"
              aria-label={`${formatScore(score)} of 4 points`}
            >
              {/* Earned points fill from the left; a half point is a half star */}
              {Array.from({ length: 4 }, (_, i) => (
                <Star key={i} size={20} filled={score - i >= 1} half={score - i === 0.5} />
              ))}
            </div>
          )}
        </div>

        {/* Card image: starts covered, then the day's reveal shows it */}
        {card.image && (
          <CardReveal
            reveal={reveal}
            finale={finale}
            stars={stars}
            image={card.image}
            name={card.name}
            onReady={handleRevealReady}
          />
        )}
        {/* Share, streak, countdown and dev reset fade in after the card reveal and the
          result heading (see .result-details-in in globals.css) */}
        <div className="result-details-in flex flex-col items-center">
          {/* Share button */}
          <button
            className="barlow text-white font-medium bg-tide h-[52px] px-5 rounded-xs text-base cursor-pointer [&:hover]:bg-wave transition-colors mb-4"
            onClick={handleShare}
          >
            Share
          </button>

          <div className="bg-ghost border border-solid border-stone px-3 py-2 rounded flex items-center gap-3 mb-2">
            <Image
              src="/fire-energy.png"
              alt="Fire Energy"
              width={17}
              height={17}
              style={{ width: 17, height: 17 }}
            />
            <span className="barlow text-sm text-stone font-bold">{streak} Day Streak</span>
          </div>
          <p className="barlow text-xs text-slate pb-4">Next card in: {countdown}</p>

          {/* Developer-only reset button */}
          {isDev() && (
            <button
              className="mt-3 bg-none border border-dashed border-slate text-wave rounded-lg px-6 py-3 text-[13px] cursor-pointer block mx-auto"
              onClick={onReset}
              title="Reset game (developer only)"
            >
              Reset (dev)
            </button>
          )}
        </div>
      </React.Fragment>

      {/* Developer-only reveal picker: outside the replayed sequence so it's always usable */}
      {isDev() && card.image && (
        <div className="mt-4 flex flex-col items-center gap-2" aria-label="Reveal (developer only)">
          {[
            { label: 'Reveal (dev)', names: REVEAL_NAMES, current: reveal, key: 'reveal' },
            { label: 'Finale (dev)', names: FINALE_NAMES, current: finale, key: 'finale' },
            {
              label: 'Star burst (dev)',
              names: ['on', 'off'],
              current: stars ? 'on' : 'off',
              key: 'stars',
            },
          ].map((row) => (
            <React.Fragment key={row.key}>
              <span className="barlow text-xs text-slate">{row.label}</span>
              <div className="flex flex-wrap justify-center gap-2 max-w-[340px]">
                {row.names.map((name) => (
                  <button
                    key={name}
                    className={`barlow border border-dashed border-slate text-wave rounded-lg px-3 py-1 text-[13px] cursor-pointer ${name === row.current ? 'bg-drop font-bold' : 'bg-none'}`}
                    onClick={() =>
                      replayWith(
                        row.key === 'reveal'
                          ? { reveal: name as Reveal }
                          : row.key === 'finale'
                            ? { finale: name as Finale }
                            : { stars: name === 'on' }
                      )
                    }
                    aria-pressed={name === row.current}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Toast for desktop share */}
      <div
        role="status"
        aria-live="polite"
        className={`barlow pointer-events-none fixed top-[calc(env(safe-area-inset-top)_+_78px)] left-1/2 z-50 -translate-x-1/2 rounded-md bg-slate px-5 py-3 text-sm font-medium text-white shadow-[0_8px_24px_#47679c40] transition-all duration-300 ${toastVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3'}`}
      >
        {toastMessage}
      </div>
      <BottomSpacer />
    </section>
  );
}
