'use client';

import GTFTIntroPage from './GTFTIntroPage';
import GTFTGamePage from './GTFTGamePage';
import GTFTResultPage from './GTFTResultPage';
import { useEffect, useRef, useState } from 'react';
import { spitDurationMs } from './chatter';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

import type { Card, DayState, Hint, Lifeline } from './types.ts';
// In on-screen order, left to right; also the order they auto-reveal after a guess
const LIFELINES: Lifeline[] = ['Set', 'Stage', 'Attack'];
// Pause between each automatic lifeline reveal after a guess, and before the result page
const REVEAL_GAP_MS = 1000;
// The guess box's error shake (`.shake`, `duration-shake` in the design system)
const SHAKE_MS = 400;
// Storage key format predates localDateKey (no zero padding); kept so saved games still load
function getDayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}
function getDailyIndex(date: Date, length: number) {
  // Simple daily index based on date
  return (date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate()) % length;
}
import { POKEMON_NAMES } from './pokemon-names';
import { daysBetween } from './dates';

// Case- and spacing-insensitive form, so 'Nidoran♀' matches a card named 'Nidoran ♀'
const compactName = (name: string) => name.trim().toLowerCase().replace(/\s+/g, '');
// Lowercased with single spaces and padded, for whole-word phrase matching
const spacedName = (name: string) => ` ${name.trim().toLowerCase().replace(/\s+/g, ' ')} `;
const POKEMON_NAMES_COMPACT = new Set(POKEMON_NAMES.map(compactName));

function namesMatch(guess: string, answer: string) {
  if (compactName(guess) === compactName(answer)) return true;
  // A card named exactly after a Pokémon needs that exact Pokémon
  if (POKEMON_NAMES_COMPACT.has(compactName(answer))) return false;
  // Other card names ('Shining Volcanion', 'Tapu Koko ◇', 'Cool Porygon') accept the
  // Pokémon's name as whole words, so 'Porygon' matches 'Cool Porygon' but 'Mew' doesn't match 'Mewtwo ex'
  return spacedName(answer).includes(spacedName(guess));
}

// Each generation by the games it started with, Gen 1 first
const GENERATION_GAMES = [
  'Red & Blue',
  'Gold & Silver',
  'Ruby & Sapphire',
  'Diamond & Pearl',
  'Black & White',
  'X & Y',
  'Sun & Moon',
  'Sword & Shield',
  'Scarlet & Violet',
];

// The redemption hints Unknown Q gives after a wrong guess; a card missing one skips it
function redemptionHints(card: Card): Hint[] {
  const hints: Hint[] = [];
  if (card.type) hints.push({ label: 'Type', answer: card.type });
  const games = card.generation ? GENERATION_GAMES[card.generation - 1] : undefined;
  if (games) hints.push({ label: 'Generation', answer: games });
  return hints;
}

export default function GuessThatFlavorText() {
  // The day is fixed when the page opens; once the date changes the page reloads into the
  // new puzzle (see the day-change effect below), and an unfinished game is dropped
  const [today] = useState(() => new Date());
  const isNewDay = () => getDayKey(new Date()) !== getDayKey(today);
  const start = new Date(2026, 3, 16); // April is month 3 (0-indexed)
  const gameNumber = daysBetween(start, today) + 1;
  // State
  const [page, setPage] = useState<0 | 1 | 2>(0);
  const [card, setCard] = useState<Card | null>(null);
  const [loading, setLoading] = useState(true);
  // Game state
  const storageKey = `flavor-game-${getDayKey(today)}`;
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
  // The Pokémon picked from the suggestions; guesses are only allowed once this is set
  const [selectedPokemon, setSelectedPokemon] = useState<string | null>(null);
  // Lifelines shown automatically after a guess; display only, never affects the score
  const [autoRevealed, setAutoRevealed] = useState<Lifeline[]>([]);
  const revealTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  // Redemption, display only: hold the hints back while the lifelines open after a wrong
  // guess, then have Unknown Q spit them out. A game reloaded mid-redemption shows them
  // straight away.
  const [hintsPending, setHintsPending] = useState(false);
  const [animateHints, setAnimateHints] = useState(false);
  // From a wrong guess until the lifelines, shake and spit are done: the wrong guess stays
  // in the guess box, which can't be changed or submitted yet
  const [guessLocked, setGuessLocked] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null!) as React.RefObject<HTMLInputElement>;
  const listRef = useRef<HTMLUListElement>(null!) as React.RefObject<HTMLUListElement>;

  // Load dataset
  useEffect(() => {
    // Only the card data is loaded lazily; the Pokémon names are already imported above
    import('./flavor-cards')
      .then((cardsModule) => {
        const cardsData = cardsModule.default;
        // Only accept cards with valid flavorText and where 'stage' is string or undefined (not null)
        function isValidCard(card: unknown): card is Card {
          if (typeof card !== 'object' || card === null) return false;
          const obj = card as Record<string, unknown>;
          return (
            typeof obj.id === 'string' &&
            typeof obj.name === 'string' &&
            typeof obj.flavorText === 'string' &&
            (typeof obj.stage === 'string' || typeof obj.stage === 'undefined')
          );
        }
        const valid = cardsData.filter(isValidCard);
        const idx = getDailyIndex(today, valid.length);
        const dailyCard = valid[idx] ?? null;
        // Only set card if stage is not null (should be filtered already, but extra guard)
        if (dailyCard && dailyCard.stage !== null) {
          setCard(dailyCard);
        } else {
          setCard(null);
        }
        // Hydrate from localStorage
        try {
          const saved = localStorage.getItem(storageKey);
          if (saved) {
            setDayState(JSON.parse(saved) as DayState);
            // If already completed, go to result page
            const parsed = JSON.parse(saved) as DayState;
            if (parsed.completed) setPage(2);
          }
        } catch {}
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A new day means a new puzzle: reload as soon as the date changes, checking regularly
  // and whenever the tab comes back into view
  useEffect(() => {
    function reloadIfNewDay() {
      if (getDayKey(new Date()) !== getDayKey(today)) window.location.reload();
    }
    const interval = setInterval(reloadIfNewDay, 30_000);
    document.addEventListener('visibilitychange', reloadIfNewDay);
    window.addEventListener('focus', reloadIfNewDay);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', reloadIfNewDay);
      window.removeEventListener('focus', reloadIfNewDay);
    };
  }, [today]);

  // Cancel any pending post-guess reveals if the component goes away
  useEffect(() => {
    const timers = revealTimers.current;
    return () => timers.forEach(clearTimeout);
  }, []);

  // Persist state
  useEffect(() => {
    if (!loading) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(dayState));
      } catch {}
    }
  }, [dayState, loading, storageKey]);

  // Close suggestions when clicking outside the input or dropdown
  useEffect(() => {
    function handlePointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (inputRef.current?.contains(target) || listRef.current?.contains(target)) return;
      setSuggestions([]);
      setActiveIndex(-1);
    }
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [inputRef, listRef]);

  // Autocomplete handlers
  function handleInputChange(value: string) {
    setInputValue(value);
    setSelectedPokemon(null);
    setActiveIndex(-1);
    if (!value.trim() || value.length < 3) {
      setSuggestions([]);
      return;
    }
    const lower = value.toLowerCase();
    const matches = POKEMON_NAMES.filter((n) => n.toLowerCase().includes(lower)).slice(0, 8);
    setSuggestions(matches);
  }
  function selectSuggestion(name: string) {
    setInputValue(name);
    setSelectedPokemon(name);
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

  // Game actions
  function activateLifeline(lifeline: Lifeline) {
    if (dayState.completed) return;
    if (dayState.usedLifelines.includes(lifeline)) return;
    setDayState((prev: DayState) => ({
      ...prev,
      usedLifelines: [...prev.usedLifelines, lifeline],
      score: Math.max(0, prev.score - 1),
    }));
  }
  function submitGuess() {
    // No guessing while the lifelines and hints are still coming out after a wrong guess
    if (dayState.completed || guessLocked || !card || !selectedPokemon) return;
    // Yesterday's puzzle is over once the date changes; don't record a guess for it
    if (isNewDay()) {
      window.location.reload();
      return;
    }
    const guess = selectedPokemon;
    setSuggestions([]);
    const correct = namesMatch(guess, card.name);
    const hints = redemptionHints(card);

    // The redemption guess: half a point if right, nothing if not, then the result
    if (dayState.firstGuess) {
      setDayState((prev: DayState) => ({
        ...prev,
        guess,
        completed: true,
        correct,
        redeemed: correct,
        score: correct ? 0.5 : 0,
      }));
      revealTimers.current.push(setTimeout(() => setPage(2), REVEAL_GAP_MS));
      return;
    }

    // A wrong first guess gets one more try, if there's a hint to give
    const redeemable = !correct && hints.length > 0;
    if (redeemable) {
      setDayState((prev: DayState) => ({ ...prev, firstGuess: guess, score: 0 }));
      setHintsPending(true);
      setGuessLocked(true);
    } else {
      setDayState((prev: DayState) => ({
        ...prev,
        guess,
        completed: true,
        correct,
        score: correct ? prev.score : 0,
      }));
    }

    // Reveal the unused lifelines left to right, one every REVEAL_GAP_MS, then show the
    // result, or for a wrong guess, start redemption
    const remaining = LIFELINES.filter((l) => !dayState.usedLifelines.includes(l));
    remaining.forEach((lifeline, i) => {
      revealTimers.current.push(
        setTimeout(() => setAutoRevealed((prev) => [...prev, lifeline]), i * REVEAL_GAP_MS)
      );
    });
    revealTimers.current.push(
      setTimeout(() => {
        if (redeemable) {
          setHintsPending(false);
          setAnimateHints(true);
          // Once the shake is over and the hints have landed, clear the box for one more try
          revealTimers.current.push(
            setTimeout(
              () => {
                setInputValue('');
                setSelectedPokemon(null);
                setGuessLocked(false);
              },
              Math.max(SHAKE_MS, spitDurationMs(hints.length))
            )
          );
        } else {
          setPage(2);
        }
      }, remaining.length * REVEAL_GAP_MS)
    );
  }

  // Dev reset: clear today's saved game and every bit of in-progress UI state
  function resetGame() {
    // Empty in place: the unmount cleanup holds a reference to this same array
    revealTimers.current.forEach(clearTimeout);
    revealTimers.current.length = 0;
    try {
      localStorage.removeItem(storageKey);
    } catch {}
    setDayState(defaultState);
    setAutoRevealed([]);
    setHintsPending(false);
    setAnimateHints(false);
    setGuessLocked(false);
    setInputValue('');
    setSelectedPokemon(null);
    setSuggestions([]);
    setActiveIndex(-1);
    setPage(0);
  }

  const { correct, score, usedLifelines, firstGuess, redeemed } = dayState;
  // PAGE 1: Intro
  if (page === 0) {
    return <GTFTIntroPage onPlay={() => setPage(1)} today={today} gameNumber={gameNumber} />;
  }
  // PAGE 2: Game
  if (page === 1 && card) {
    return (
      <GTFTGamePage
        card={card}
        usedLifelines={usedLifelines}
        revealedLifelines={autoRevealed}
        LIFELINES={LIFELINES}
        inputValue={inputValue}
        selectedPokemon={selectedPokemon}
        suggestions={suggestions}
        activeIndex={activeIndex}
        inputRef={inputRef}
        listRef={listRef}
        activateLifeline={activateLifeline}
        handleInputChange={handleInputChange}
        handleKeyDown={handleKeyDown}
        selectSuggestion={selectSuggestion}
        submitGuess={submitGuess}
        guessLocked={guessLocked}
        // From a wrong first guess on (still shown in the moment before the result)
        redemption={
          firstGuess
            ? {
                firstGuess,
                hints: hintsPending ? null : redemptionHints(card),
                animate: animateHints,
              }
            : null
        }
      />
    );
  }
  if (page === 2 && card) {
    return (
      <GTFTResultPage
        card={card}
        correct={correct}
        redeemed={!!redeemed}
        score={score}
        onReset={resetGame}
        today={today}
        gameNumber={gameNumber}
      />
    );
  }
  return null;
}
