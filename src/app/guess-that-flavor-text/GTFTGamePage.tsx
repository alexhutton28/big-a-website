import Image from 'next/image';
import { useEffect, useState } from 'react';
import { getPokemonSpriteUrl } from './pokemon-names';
import Star from './Star';
import type { Lifeline, Card } from './types.ts';

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
}

// Shows what a lifeline costs; hidden once it's been used
function LifelineCost({ used }: { used: boolean }) {
  if (used) return null;
  return (
    <span
      className="barlow absolute -top-2 -right-1 z-10 flex items-center gap-0.5 whitespace-nowrap rounded-md border border-slate bg-slate px-1 py-0.5 text-[11px] font-medium leading-none text-white"
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
      className={`barlow relative flex flex-col flex-1 basis-0 min-w-0 justify-center text-left border border-slate rounded-xs p-2 transition-colors duration-300 ${used ? 'bg-drop cursor-default' : 'bg-mist text-slate cursor-pointer [&:hover]:bg-drop'}`}
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
}: GTFTGamePageProps) {
  const [visibleCount, setVisibleCount] = useState(0);
  const [shaking, setShaking] = useState(false);
  // Used by the player, or shown automatically after their guess
  const isRevealed = (lifeline: Lifeline) =>
    usedLifelines.includes(lifeline) || revealedLifelines.includes(lifeline);

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

    textWords.forEach((word, i) => {
      timers.push(setTimeout(() => setVisibleCount(i + 1), totalDelay));

      totalDelay += BASE_DELAY;

      if (/[.!?]$/.test(word)) {
        totalDelay += PERIOD_EXTRA_DELAY;
      }
    });

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [card.flavorText]);

  return (
    <section className="min-h-full w-full flex flex-col items-center justify-start px-3 pt-4 sm:pt-5">
      <Image
        src="/unknown-q.svg"
        alt="Guess That Flavor Text Logo"
        width={170}
        height={36}
        className="mb-3 w-[85px] sm:w-[100px] h-auto drop-shadow-[0_6px_12px_#47679c4d]"
      />
      <div className="flex w-fit max-w-[min(100%,max(60vw,350px))] bg-white rounded px-3 py-2 border border-splash mb-4">
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
        <div className="flex items-start gap-3 mb-2">
          <div
            className={`flex items-center flex-1 min-w-0 min-h-[52px] border border-slate px-3 py-2 bg-white outline-none mb-0 rounded gap-2 ${shaking ? 'shake' : ''}`}
          >
            {selectedPokemon && (
              <Image
                src={getPokemonSpriteUrl(selectedPokemon)}
                alt={selectedPokemon}
                width={32}
                height={32}
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
              className="flex-1 bg-white text-stone placeholder:text-stone outline-none mb-0 border-0 shadow-none"
              style={{ minWidth: 0 }}
            />
          </div>
          {suggestions.length > 0 && (
            <ul
              ref={listRef}
              className="absolute left-0 right-0 top-[52px] z-30 mt-1 max-h-52 overflow-y-auto rounded border border-slate bg-white shadow-md list-none p-0 gtft-scrollbar"
            >
              {suggestions.map((name, i) => {
                return (
                  <li
                    key={name}
                    className={`cursor-pointer h-[50px] px-2 py-0 transition-colors flex items-center gap-2 ${i === activeIndex ? 'bg-wave text-white' : 'text-slate [&:hover]:bg-drop'}`}
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
          <div className="flex flex-col shrink-0 gap-1">
            <button
              onClick={handleGuessClick}
              className="barlow text-white font-medium bg-tide border border-tide h-[52px] px-4 rounded-xs text-base cursor-pointer [&:hover]:bg-wave [&:hover]:border-wave transition-colors"
            >
              Guess
            </button>
            <div
              className="barlow flex items-center justify-end gap-2 text-sm text-tide"
              aria-label={`${4 - usedLifelines.length} point${4 - usedLifelines.length === 1 ? '' : 's'}`}
            >
              <span className="flex items-center gap-0.5">
                {/* Spent points come off the left, so the remaining filled stars sit next to POINTS */}
                {Array.from({ length: 4 }, (_, i) => (
                  <Star key={i} filled={i >= usedLifelines.length} />
                ))}
              </span>
              <span aria-hidden="true">POINTS</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col mb-2">
          <h2 className="barlow font-bold text-slate text-base">Use a Lifeline</h2>
        </div>
        <div className="flex w-full gap-3 mb-3">
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
    </section>
  );
}
