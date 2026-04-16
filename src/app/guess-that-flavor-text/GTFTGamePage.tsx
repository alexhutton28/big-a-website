import Image from 'next/image';
import { useEffect, useState } from 'react';
import type { Lifeline, Card } from './types.ts';

interface GTFTGamePageProps {
  card: Card;
  names: string[];
  usedLifelines: Lifeline[];
  LIFELINES: Lifeline[];
  inputValue: string;
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

export default function GTFTGamePage({
  card,
  usedLifelines,
  LIFELINES,
  inputValue,
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
  const [selectedPokemon, setSelectedPokemon] = useState<string | null>(null);
  const words = card.flavorText.split(' ');

  useEffect(() => {
    if (words.length === 0) return;

    const BASE_DELAY = 200;
    const PERIOD_EXTRA_DELAY = BASE_DELAY * 2;

    let totalDelay = 50;
    const timers: NodeJS.Timeout[] = [];

    words.forEach((word, i) => {
      timers.push(setTimeout(() => setVisibleCount(i + 1), totalDelay));

      totalDelay += BASE_DELAY;

      if (/[.!?]$/.test(word)) {
        totalDelay += PERIOD_EXTRA_DELAY;
      }
    });

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [card.flavorText, words]);

  return (
    <section className="min-h-[calc(100vh-62px)] flex flex-col items-center justify-start pt-2 sm:pt-5">
      <Image
        src="/unknown-q.svg"
        alt="Guess That Flavor Text Logo"
        width={170}
        height={36}
        className="mb-3 w-[85px] sm:w-[100px] h-auto"
      />
      <div className="flex w-full max-w-[max(60vw,350px)] bg-white rounded px-3 py-2 border border-splash mb-4">
        <p className="flex justify-center items-center flex-wrap gap-x-[0.3em] italic text-center text-[20px] text-wave break-words w-full min-h-[60px]">
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
        <div className="flex gap-3 mb-1">
          <div className="flex items-center flex-1 border border-splash px-3 py-2 bg-white outline-none mb-0 rounded gap-2">
            {selectedPokemon && (
              <Image
                src={`https://r2.limitlesstcg.net/pokemon/gen9/${selectedPokemon.toLowerCase().replace(/[^a-z0-9]/g, '')}.png`}
                alt={selectedPokemon}
                width={32}
                height={32}
                style={{
                  objectFit: 'contain',
                  background: '#f8f8f8',
                  borderRadius: 4,
                  height: 'auto',
                }}
                unoptimized
              />
            )}
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => {
                handleInputChange(e.target.value);
                setSelectedPokemon(null);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Search Pokémon name…"
              autoComplete="off"
              className="flex-1 bg-white text-stone outline-none mb-0 border-0 shadow-none"
              style={{ minWidth: 0 }}
            />
          </div>
          {suggestions.length > 0 && (
            <ul
              ref={listRef}
              className="absolute left-0 right-0 top-[42px] z-10 mt-1 max-h-52 overflow-y-auto rounded border border-wave bg-white shadow-md list-none p-0"
            >
              {suggestions.map((name, i) => {
                const imgName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
                const imgUrl = `https://r2.limitlesstcg.net/pokemon/gen9/${imgName}.png`;
                return (
                  <li
                    key={name}
                    className={`cursor-pointer px-2 py-2 text-wave hover:bg-drop transition-colors flex items-center gap-2 ${i === activeIndex ? 'bg-[#2876EC] text-white' : 'bg-white text-[#222]'}`}
                    onMouseDown={() => {
                      setSelectedPokemon(name);
                      selectSuggestion(name);
                    }}
                    tabIndex={-1}
                  >
                    <Image
                      src={imgUrl}
                      alt={name}
                      width={24}
                      height={24}
                      style={{
                        objectFit: 'contain',
                        background: '#f8f8f8',
                        borderRadius: 4,
                        width: 'auto',
                      }}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                      unoptimized
                    />
                    {name}
                  </li>
                );
              })}
            </ul>
          )}
          <button
            onClick={submitGuess}
            disabled={!inputValue.trim()}
            className="barlow-cond text-white font-bold bg-tide px-4 rounded text-l cursor-pointer hover:bg-wave transition-colors"
          >
            Guess
          </button>
        </div>
        <div className="barlow-cond w-full text-right mb-3 text-sm text-tide">
          {4 - usedLifelines.length} POINT{4 - usedLifelines.length === 1 ? '' : 'S'}
        </div>

        <div className="flex flex-col mb-3">
          <h2 className="barlow-cond font-bold text-tide text-xl">Use a Lifeline</h2>
          <p className="barlow-cond italic text-wave">
            Each lifeline used will subtract 1 point from the 4 point total
          </p>
        </div>
        <div className="flex w-full justify-between gap-3">
          <div className="flex flex-col gap-0 rounded">
            <button
              onClick={() => activateLifeline(LIFELINES[0])}
              disabled={usedLifelines.includes(LIFELINES[0])}
              className="flex flex-col flex-start bg-tide text-white p-2 hover:bg-wave transition-colors cursor-pointer disabled:cursor-default disabled:hover:bg-tide"
            >
              <h3 className="barlow font-bold text-md text-left leading-tight">What Set</h3>
              <p className="barlow font-light text-left leading-tight text-xs whitespace-nowrap">
                Is the card from?
              </p>
            </button>
            <div
              className={`overflow-hidden transition-all duration-300 ease-in-out ${usedLifelines.includes(LIFELINES[0]) ? 'max-h-20' : 'max-h-0'}`}
            >
              <div className="barlow text-xl p-2 bg-white border border-wave text-tide">
                {card.set}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-0">
            <button
              onClick={() => activateLifeline(LIFELINES[2])}
              disabled={usedLifelines.includes(LIFELINES[2])}
              className="flex flex-col flex-start bg-tide text-white p-2 hover:bg-wave transition-colors cursor-pointer disabled:cursor-default disabled:hover:bg-tide"
            >
              <h3 className="barlow font-bold text-md text-left leading-tight whitespace-nowrap">
                What Stage
              </h3>
              <p className="barlow font-light text-left leading-tight text-xs whitespace-nowrap">
                Is the card?
              </p>
            </button>
            <div
              className={`overflow-hidden transition-all duration-300 ease-in-out ${usedLifelines.includes(LIFELINES[2]) ? 'max-h-20' : 'max-h-0'}`}
            >
              <div className="barlow text-xl p-2 bg-white border border-wave text-tide">
                {card.stage}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-0">
            <button
              onClick={() => activateLifeline(LIFELINES[1])}
              disabled={usedLifelines.includes(LIFELINES[1])}
              className="flex flex-col flex-start bg-tide text-white p-2 hover:bg-wave transition-colors cursor-pointer disabled:cursor-default disabled:hover:bg-tide"
            >
              <p className="barlow font-light text-left leading-tight text-xs whitespace-nowrap">
                Read An
              </p>
              <h3 className="barlow font-bold text-md text-left leading-tight">Attack Name</h3>
            </button>
            <div
              className={`overflow-hidden transition-all duration-300 ease-in-out ${usedLifelines.includes(LIFELINES[1]) ? 'max-h-20' : 'max-h-0'}`}
            >
              <div className="barlow text-xl p-2 bg-white border border-wave text-tide">
                {card.attack || 'None'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
