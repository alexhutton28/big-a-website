'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Card = {
  id: string;
  name: string;
  flavorText: string;
  attack?: string | null;
  stage?: string | null;
  set?: string | null;
  type?: string | null;
  image?: string | null;
};

type DayState = {
  guess: string | null;
  usedLifelines: string[];
  completed: boolean;
  correct: boolean;
  score: number;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getTodayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getDailyIndex(length: number): number {
  if (length === 0) return 0;
  const seed = getTodayKey(); // e.g. "2026-04-13"
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash % length;
}

const LIFELINES = ['Attack', 'Stage', 'Set'] as const;
type Lifeline = (typeof LIFELINES)[number];

function getLifelineValue(card: Card, lifeline: Lifeline): string {
  if (lifeline === 'Attack') return card.attack ?? 'Unknown';
  if (lifeline === 'Stage') return card.stage ?? 'Unknown';
  return card.set ?? 'Unknown';
}

function namesMatch(guess: string, answer: string, allNames: string[]): boolean {
  const g = guess.trim().toLowerCase();
  const a = answer.trim().toLowerCase();
  if (g === a) return true;
  // If guess is a substring of answer, and answer is NOT in the names list, allow it
  if (a.includes(g)) {
    // If answer is in the names list, require exact match
    if (allNames.map((n) => n.trim().toLowerCase()).includes(a)) {
      return false;
    }
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function GuessThatFlavorText() {
  const [card, setCard] = useState<Card | null>(null);
  const [names, setNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Game state
  const todayKey = getTodayKey();
  const storageKey = `flavor-game-${todayKey}`;
  const defaultState: DayState = {
    guess: null,
    usedLifelines: [],
    completed: false,
    correct: false,
    score: 4,
  };

  const [dayState, setDayState] = useState<DayState>(defaultState);

  // Autocomplete
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // ---------------------------------------------------------------------------
  // Load dataset
  // ---------------------------------------------------------------------------

  useEffect(() => {
    Promise.all([import('./flavor-cards'), import('./pokemon-names')])
      .then(([cardsModule, namesModule]) => {
        const cardsData = cardsModule.default;
        const namesData = namesModule.default;
        const valid = cardsData.filter((c: Card) => c.flavorText && c.flavorText.trim().length > 0);
        const idx = getDailyIndex(valid.length);
        const dailyCard = valid[idx] ?? null;

        setCard(dailyCard);
        setNames(
          namesData && namesData.length
            ? namesData
            : Array.from(new Set(valid.map((c: Card) => c.name))).sort()
        );

        // Hydrate from localStorage
        try {
          const saved = localStorage.getItem(storageKey);
          if (saved) {
            setDayState(JSON.parse(saved) as DayState);
          }
        } catch {
          // Ignore parse errors
        }

        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
    // storageKey is stable for the day
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------------------------------------------------------------------
  // Persist state
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!loading) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(dayState));
      } catch {
        // Quota exceeded or private browsing – silently ignore
      }
    }
  }, [dayState, loading, storageKey]);

  // ---------------------------------------------------------------------------
  // Autocomplete handlers
  // ---------------------------------------------------------------------------

  function handleInputChange(value: string) {
    setInputValue(value);
    setActiveIndex(-1);
    if (!value.trim()) {
      setSuggestions([]);
      return;
    }
    const lower = value.toLowerCase();
    const matches = names.filter((n) => n.toLowerCase().includes(lower)).slice(0, 8);
    setSuggestions(matches);
  }

  function selectSuggestion(name: string) {
    setInputValue(name);
    setSuggestions([]);
    setActiveIndex(-1);
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!suggestions.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0) {
        e.preventDefault();
        selectSuggestion(suggestions[activeIndex]);
      }
    } else if (e.key === 'Escape') {
      setSuggestions([]);
      setActiveIndex(-1);
    }
  }

  // ---------------------------------------------------------------------------
  // Game actions
  // ---------------------------------------------------------------------------

  function activateLifeline(lifeline: Lifeline) {
    if (dayState.completed) return;
    if (dayState.usedLifelines.includes(lifeline)) return;
    setDayState((prev) => ({
      ...prev,
      usedLifelines: [...prev.usedLifelines, lifeline],
      score: Math.max(0, prev.score - 1),
    }));
  }

  function submitGuess() {
    if (dayState.completed || !card) return;
    const guess = inputValue.trim();
    if (!guess) return;
    setSuggestions([]);
    const correct = namesMatch(guess, card.name, names);
    setDayState((prev) => ({
      ...prev,
      guess,
      completed: true,
      correct,
      score: correct ? prev.score : 0,
    }));
  }

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  function ScoreStars({ score }: { score: number }) {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((n) => (
          <span
            key={n}
            className={`text-2xl ${n <= score ? 'text-money' : 'text-stone opacity-30'}`}
          >
            ★
          </span>
        ))}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Loading / empty state
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <section className="font-barlow-body flex min-h-[calc(100vh-62px)] flex-col items-center justify-center gap-6 text-slate">
        <p className="text-stone">Loading today&apos;s card…</p>
      </section>
    );
  }

  if (!card) {
    return (
      <section className="font-barlow-body flex min-h-[calc(100vh-62px)] flex-col items-center justify-center gap-6 text-slate">
        <h1 className="font-barlow-cond text-4xl text-tide">Guess That Flavor Text</h1>
        <p className="text-stone">No cards available yet. Check back soon!</p>
      </section>
    );
  }

  const { completed, correct, score, usedLifelines, guess } = dayState;

  // ---------------------------------------------------------------------------
  // Main render
  // ---------------------------------------------------------------------------

  return (
    <section
      className="font-barlow-body flex min-h-[calc(100vh-62px)] flex-col items-center justify-center gap-6 px-4 py-10 text-slate"
      style={{
        backgroundImage:
          'radial-gradient(circle, var(--color-drop) 2px, transparent 2px), linear-gradient(180deg, #ffffff 0%, var(--color-ghost) 100%)',
        backgroundSize: '20px 20px, 100% 100%',
      }}
    >
      <h1 className="font-barlow-cond text-4xl text-tide">Guess That Flavor Text</h1>

      {/* Flavor text card */}
      <div className="w-full max-w-lg rounded-2xl border border-[var(--color-drop)] bg-white px-8 py-6 shadow-md">
        <p className="font-barlow-cond text-center text-xl leading-relaxed tracking-wide text-[var(--color-houndoom)] italic">
          &ldquo;{card.flavorText}&rdquo;
        </p>
      </div>

      {/* Lifeline reveals */}
      {usedLifelines.length > 0 && (
        <div className="flex w-full max-w-lg flex-col gap-2">
          {(usedLifelines as Lifeline[]).map((ll) => (
            <div
              key={ll}
              className="flex items-center gap-3 rounded-xl border border-[var(--color-drop)] bg-[var(--color-sand)] px-4 py-2 text-sm text-[var(--color-slate)]"
            >
              <span className="font-semibold text-[var(--color-tide)]">{ll}:</span>
              <span>{getLifelineValue(card, ll)}</span>
            </div>
          ))}
        </div>
      )}

      {!completed ? (
        <>
          {/* Lifeline buttons */}
          <div className="flex flex-wrap justify-center gap-3">
            {LIFELINES.map((ll) => {
              const used = usedLifelines.includes(ll);
              return (
                <button
                  key={ll}
                  onClick={() => activateLifeline(ll)}
                  disabled={used}
                  className={`rounded-full border px-5 py-2 text-sm font-semibold transition-all ${
                    used
                      ? 'cursor-not-allowed border-[var(--color-stone)] bg-[var(--color-ghost)] text-[var(--color-stone)] opacity-50'
                      : 'cursor-pointer border-[var(--color-tide)] bg-white text-[var(--color-tide)] hover:bg-[var(--color-drop)]'
                  }`}
                >
                  Reveal {ll}
                </button>
              );
            })}
          </div>

          {/* Autocomplete input */}
          <div className="relative w-full max-w-lg">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search Pokémon name…"
                autoComplete="off"
                list="pokemon-names-list"
                className="flex-1 rounded-xl border border-[var(--color-stone)] bg-white px-4 py-3 text-[var(--color-houndoom)] outline-none placeholder:text-[var(--color-stone)] focus:border-[var(--color-tide)] focus:ring-2 focus:ring-[var(--color-drop)]"
              />
              <datalist id="pokemon-names-list">
                {names.map((name) => (
                  <option value={name} key={name} />
                ))}
              </datalist>
              <button
                onClick={submitGuess}
                disabled={!inputValue.trim()}
                className="rounded-xl bg-[var(--color-tide)] px-5 py-3 font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40 hover:opacity-90"
              >
                Guess
              </button>
            </div>

            {suggestions.length > 0 && (
              <ul
                ref={listRef}
                className="absolute left-0 right-0 top-full z-10 mt-1 max-h-64 overflow-y-auto rounded-xl border border-[var(--color-drop)] bg-white shadow-lg"
              >
                {suggestions.map((name, i) => (
                  <li
                    key={name}
                    className={`cursor-pointer px-4 py-2 ${i === activeIndex ? 'bg-[var(--color-drop)] text-white' : ''}`}
                    onMouseDown={() => selectSuggestion(name)}
                    tabIndex={-1}
                  >
                    {name}
                  </li>
                ))}
              </ul>
            )}
            {/* Guess vs answer */}
            {!completed && <></>}
          </div>
          {/* Guess vs answer, score, image, etc. (already handled below) */}
        </>
      ) : (
        <>
          {/* Guess vs answer */}
          <div className="flex w-full flex-col gap-2 rounded-2xl border border-[var(--color-drop)] bg-white px-6 py-4">
            <div className="flex justify-between text-sm">
              <span className="text-[var(--color-stone)]">Your guess</span>
              <span
                className={`font-semibold ${correct ? 'text-[var(--color-bulbasaur)]' : 'text-[var(--color-scizor)]'}`}
              >
                {guess}
              </span>
            </div>
            <div className="h-px bg-[var(--color-drop)]" />
            <div className="flex justify-between text-sm">
              <span className="text-[var(--color-stone)]">Answer</span>
              <span className="font-semibold text-[var(--color-houndoom)]">{card.name}</span>
            </div>
          </div>

          {/* Score */}
          <div className="flex flex-col items-center gap-1">
            <p className="text-sm text-[var(--color-stone)]">Score</p>
            <ScoreStars score={score} />
            <p className="text-xs text-[var(--color-stone)]">{score} / 4</p>
          </div>

          {/* Card image */}
          {card.image && (
            <Image
              src={card.image}
              alt={card.name}
              width={192}
              height={268}
              className="rounded-xl shadow-md"
            />
          )}

          {/* Come back tomorrow */}
          <p className="text-center text-xs text-[var(--color-stone)]">
            Come back tomorrow for a new card!
          </p>
        </>
      )}
    </section>
  );
}
