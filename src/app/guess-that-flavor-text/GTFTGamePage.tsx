import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { spitHints, startChatter } from './chatter';
import { getPokemonSpriteUrl } from './pokemon-names';
import Star from './Star';
import type { Lifeline, Card, Hint } from './types.ts';
import { BottomSpacer, TopSpacer } from './Spacers';

interface GTFTGamePageProps {
  card: Card;
  usedLifelines: Lifeline[];
  revealedLifelines: Lifeline[];
  LIFELINES: Lifeline[];
  inputValue: string;
  selectedPokemon: string | null;
  suggestions: string[];
  activeIndex: number;
  inputRef: React.RefObject<HTMLInputElement>;
  listRef: React.RefObject<HTMLUListElement>;
  activateLifeline: (lifeline: Lifeline) => void;
  handleInputChange: (value: string) => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  selectSuggestion: (name: string) => void;
  submitGuess: () => void;
  /** The guess box holds the wrong guess while redemption's animations play */
  guessLocked: boolean;
  /** After a wrong first guess: the guess, the hints (null while the lifelines are still
   *  opening), and whether Unknown Q should spit them out or just show them */
  redemption: { firstGuess: string; hints: Hint[] | null; animate: boolean } | null;
}

// Shows what a lifeline costs; hidden once it's been used
function LifelineCost({ used }: { used: boolean }) {
  if (used) return null;
  return (
    <span
      className="barlow absolute -top-3 -right-2 z-10 flex items-center gap-1 whitespace-nowrap rounded-md border border-slate bg-slate px-2 py-1 text-[11px] font-medium leading-none text-white"
      aria-label="costs 1 point"
    >
      <span aria-hidden="true">−1</span>
      <Star size={11} />
    </span>
  );
}

// What each lifeline card asks before it's used
const LIFELINE_PROMPTS: Record<Lifeline, React.ReactNode> = {
  Set: (
    <>
      <h3 className="font-medium text-sm leading-tight">What Set</h3>
      <p className="font-light text-xs leading-tight">Is the card from?</p>
    </>
  ),
  Stage: (
    <>
      <h3 className="font-medium text-sm leading-tight whitespace-nowrap">What Stage</h3>
      <p className="font-light text-xs leading-tight">Is the card?</p>
    </>
  ),
  Attack: (
    <>
      <p className="font-light text-xs leading-tight">Read An</p>
      <h3 className="font-medium text-sm leading-tight">Attack Name</h3>
    </>
  ),
};

function lifelineAnswer(card: Card, lifeline: Lifeline) {
  if (lifeline === 'Set') return card.set;
  if (lifeline === 'Stage') return card.stage;
  return card.attack || 'None';
}

// A lifeline button that reveals its answer in place once used: the prompt is swapped
// for a small gray label and the answer, so the row never changes layout
function LifelineCard({
  used,
  onUse,
  prompt,
  label,
  answer,
}: {
  used: boolean;
  onUse: () => void;
  prompt: React.ReactNode;
  label: string;
  answer: string | undefined;
}) {
  return (
    <button
      onClick={onUse}
      disabled={used}
      className={`barlow relative flex flex-col flex-1 basis-0 min-w-0 justify-center text-left border border-slate rounded-xs p-3 transition-colors duration-300 ${used ? 'bg-drop cursor-default' : 'bg-mist text-slate cursor-pointer [&:hover]:bg-drop'}`}
    >
      <LifelineCost used={used} />
      {used ? (
        <>
          <span className="lifeline-reveal font-light text-xs leading-tight text-stone">
            {label}
          </span>
          <span className="lifeline-reveal-delayed font-medium text-sm leading-tight text-slate break-words">
            {answer}
          </span>
        </>
      ) : (
        prompt
      )}
    </button>
  );
}

export default function GTFTGamePage({
  card,
  usedLifelines,
  revealedLifelines,
  LIFELINES,
  inputValue,
  selectedPokemon,
  suggestions,
  activeIndex,
  inputRef,
  listRef,
  activateLifeline,
  handleInputChange,
  handleKeyDown,
  selectSuggestion,
  submitGuess,
  guessLocked,
  redemption,
}: GTFTGamePageProps) {
  const [visibleCount, setVisibleCount] = useState(0);
  const [shaking, setShaking] = useState(false);
  // Unknown Q chatters while it "says" the flavor text
  const logoRef = useRef<HTMLImageElement>(null);
  // Used by the player, or shown automatically after their guess (all of them by the time
  // redemption gives its hints, including in a game reloaded mid-redemption)
  const isRevealed = (lifeline: Lifeline) =>
    usedLifelines.includes(lifeline) || revealedLifelines.includes(lifeline) || !!redemption?.hints;

  // Redemption: Unknown Q spits the hints out to either side of it
  const hintRefs = useRef<(HTMLDivElement | null)[]>([]);
  const hints = redemption?.hints ?? null;
  const animateHints = !!redemption?.animate;
  // Keyed on the count, not the array, which is new on every render
  const hintCount = hints?.length ?? 0;
  useEffect(() => {
    if (!hintCount || !animateHints || !logoRef.current) return;
    const els = hintRefs.current.slice(0, hintCount).filter((el) => el !== null);
    return spitHints(logoRef.current, els);
  }, [hintCount, animateHints]);
  // As redemption starts, the guess box gives an error shake at the wrong guess
  useEffect(() => {
    if (!hintCount || !animateHints) return;
    const start = setTimeout(() => setShaking(true), 0);
    const stop = setTimeout(() => setShaking(false), 400);
    return () => {
      clearTimeout(start);
      clearTimeout(stop);
    };
  }, [hintCount, animateHints]);
  // The wrong guess fades out of the guess box as its pill appears, until the box clears
  const guessFading = guessLocked && !!hints;
  // Redemption is worth half a point, shown from the shake (when the hints arrive), not
  // while the lifelines are still opening; otherwise each unused lifeline is a point
  const halfPoint = !!hints;
  const points = halfPoint ? 0.5 : 4 - usedLifelines.length;

  // Guess only submits a picked Pokémon; otherwise shake the search box to point at it
  function handleGuessClick() {
    if (selectedPokemon) {
      submitGuess();
      return;
    }
    setShaking(true);
    setTimeout(() => setShaking(false), 400);
    inputRef.current?.focus();
  }
  const words = card.flavorText.split(' ');

  // Keyed on the text itself rather than `words`, which is a new array every render
  useEffect(() => {
    const textWords = card.flavorText.split(' ');
    if (textWords.length === 0) return;

    const BASE_DELAY = 200;
    const PERIOD_EXTRA_DELAY = BASE_DELAY * 2;

    let totalDelay = 50;
    const timers: NodeJS.Timeout[] = [];
    // The logo chatters from a sentence's first word until just before its pause
    let stopChatter: (() => void) | null = null;
    const talk = () => {
      if (!stopChatter && logoRef.current) stopChatter = startChatter(logoRef.current);
    };
    const quiet = () => {
      stopChatter?.();
      stopChatter = null;
    };

    textWords.forEach((word, i) => {
      timers.push(
        setTimeout(() => {
          setVisibleCount(i + 1);
          talk();
        }, totalDelay)
      );

      totalDelay += BASE_DELAY;

      const endsSentence = /[.!?]$/.test(word);
      if (endsSentence || i === textWords.length - 1) {
        timers.push(setTimeout(quiet, totalDelay - 20));
      }
      if (endsSentence) {
        totalDelay += PERIOD_EXTRA_DELAY;
      }
    });

    return () => {
      timers.forEach(clearTimeout);
      quiet();
    };
  }, [card.flavorText]);

  return (
    <section className="min-h-full w-full flex flex-col items-center px-4 py-4">
      <TopSpacer />
      <div className="relative w-full flex justify-center mb-4">
        <Image
          ref={logoRef}
          src="/unknown-q.svg"
          alt="Guess That Flavor Text Logo"
          width={170}
          height={36}
          className="relative z-10 w-[85px] sm:w-[100px] h-auto drop-shadow-[0_6px_12px_#47679c4d] origin-bottom"
        />
        {/* Redemption hints, landing either side of Unknown Q, styled like answered lifelines */}
        {hints?.map((hint, i) => (
          <div
            key={hint.label}
            ref={(el) => {
              hintRefs.current[i] = el;
            }}
            className={`barlow absolute top-[30%] flex w-[104px] flex-col border border-slate rounded-xs p-3 bg-drop ${i % 2 === 0 ? 'right-[calc(50%+54px)] sm:right-[calc(50%+62px)]' : 'left-[calc(50%+54px)] sm:left-[calc(50%+62px)]'}`}
            style={{ opacity: animateHints ? 0 : 1 }}
          >
            <span className="font-light text-xs leading-tight text-stone">{hint.label}</span>
            <span className="font-medium text-sm leading-tight text-slate break-words">
              {hint.answer}
            </span>
          </div>
        ))}
      </div>
      <div className="flex w-fit max-w-[min(100%,max(60vw,350px))] bg-white rounded px-4 py-3 border border-splash mb-5">
        <p className="flex justify-center items-center flex-wrap gap-x-[0.3em] italic font-normal text-center text-[20px] text-wave break-words w-full min-h-[60px]">
          {words.map((word, i) => {
            let displayWord = word;
            if (i === 0) displayWord = '"' + word;
            if (i === words.length - 1) displayWord = word + '"';
            return (
              <span
                key={i}
                className="transition-all duration-300 ease-out"
                style={{
                  opacity: i < visibleCount ? 1 : 0,
                  transform: i < visibleCount ? 'translateY(0)' : 'translateY(6px)',
                }}
              >
                {displayWord}
              </span>
            );
          })}
        </p>
      </div>

      <div className="relative w-full max-w-[max(60vw,350px)] sm:max-w-[480px]">
        {/* Once redemption starts: the wrong first guess, crossed out, with a gray sprite */}
        {redemption && hints && (
          <div className="flex justify-start mb-3" role="status">
            <span
              className={`barlow flex items-center gap-2 rounded-full border border-stone bg-mist px-3 py-1 text-[13px] text-stone ${animateHints ? 'lifeline-reveal' : ''}`}
            >
              <Image
                src={getPokemonSpriteUrl(redemption.firstGuess)}
                alt=""
                width={18}
                height={18}
                className="grayscale opacity-70"
                style={{
                  objectFit: 'contain',
                  width: 'auto',
                  height: 'auto',
                  maxWidth: 18,
                  maxHeight: 18,
                }}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
                unoptimized
              />
              <span className="sr-only">Wrong guess: </span>
              <s>{redemption.firstGuess}</s>
            </span>
          </div>
        )}
        {/* relative: the search results sit under this row, whether or not the pill is above it */}
        <div className="relative flex items-start gap-4 mb-3">
          <div
            className={`flex items-center flex-1 min-w-0 min-h-[52px] border border-slate px-4 py-3 bg-white outline-none mb-0 rounded gap-3 ${shaking ? 'shake' : ''}`}
          >
            {selectedPokemon && (
              <Image
                src={getPokemonSpriteUrl(selectedPokemon)}
                alt={selectedPokemon}
                width={32}
                height={32}
                className={`transition-opacity duration-300 ${guessFading ? 'opacity-0' : ''}`}
                style={{
                  objectFit: 'contain',
                  borderRadius: 4,
                  width: 'auto',
                  height: 'auto',
                  maxWidth: 34,
                  maxHeight: 34,
                }}
                unoptimized
              />
            )}
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search Pokémon name…"
              autoComplete="off"
              readOnly={guessLocked}
              className={`flex-1 bg-white text-stone placeholder:text-stone outline-none mb-0 border-0 shadow-none transition-opacity duration-300 ${guessFading ? 'opacity-0' : ''}`}
              style={{ minWidth: 0 }}
            />
          </div>
          {suggestions.length > 0 && (
            <ul
              ref={listRef}
              className="absolute left-0 right-0 top-[52px] z-30 mt-2 max-h-[208px] overflow-y-auto rounded border border-slate bg-white shadow-md list-none p-0 gtft-scrollbar"
            >
              {suggestions.map((name, i) => {
                return (
                  <li
                    key={name}
                    className={`cursor-pointer h-[50px] px-3 py-0 transition-colors flex items-center gap-3 ${i === activeIndex ? 'bg-wave text-white' : 'text-slate [&:hover]:bg-drop'}`}
                    onMouseDown={() => selectSuggestion(name)}
                    tabIndex={-1}
                  >
                    <div className="flex items-center justify-center shrink-0 w-[34px] h-[34px]">
                      <Image
                        src={getPokemonSpriteUrl(name)}
                        alt={name}
                        width={24}
                        height={24}
                        style={{
                          objectFit: 'contain',
                          borderRadius: 4,
                          width: 'auto',
                          height: 'auto',
                          maxWidth: 34,
                          maxHeight: 34,
                        }}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                        unoptimized
                      />
                    </div>
                    {name}
                  </li>
                );
              })}
            </ul>
          )}
          {/* Guess with the remaining points underneath, sharing the button's width */}
          <div className="flex flex-col shrink-0 gap-2">
            <button
              onClick={handleGuessClick}
              className="barlow text-white font-medium bg-tide border border-tide h-[52px] px-5 rounded-xs text-base cursor-pointer [&:hover]:bg-wave [&:hover]:border-wave transition-colors"
            >
              Guess
            </button>
            <div
              className="barlow flex items-center justify-end gap-3 text-sm text-tide"
              aria-label={halfPoint ? 'Half a point' : `${points} point${points === 1 ? '' : 's'}`}
            >
              {/* No gap between the stars for ½ POINT, which is wider than POINTS, so the
                  row stays within the Guess button's width */}
              <span className={`flex items-center ${halfPoint ? 'gap-0' : 'gap-1'}`}>
                {/* Spent points come off the left, so the remaining filled stars sit next to
                    POINTS; in redemption that's one half star */}
                {Array.from({ length: 4 }, (_, i) => (
                  <Star
                    key={i}
                    filled={!halfPoint && i >= usedLifelines.length}
                    half={halfPoint && i === 3}
                  />
                ))}
              </span>
              <span aria-hidden="true">{halfPoint ? '½ POINT' : 'POINTS'}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col mb-3">
          <h2 className="barlow font-bold text-slate text-base">Use a Lifeline</h2>
        </div>
        <div className="flex w-full gap-4 mb-4">
          {LIFELINES.map((lifeline) => (
            <LifelineCard
              key={lifeline}
              used={isRevealed(lifeline)}
              onUse={() => activateLifeline(lifeline)}
              prompt={LIFELINE_PROMPTS[lifeline]}
              label={lifeline}
              answer={lifelineAnswer(card, lifeline)}
            />
          ))}
        </div>
      </div>
      <BottomSpacer />
    </section>
  );
}
