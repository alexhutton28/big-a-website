'use client';

import GTFTIntroPage from './GTFTIntroPage';
import GTFTGamePage from './GTFTGamePage';
import GTFTResultPage from './GTFTResultPage';
import { useEffect, useRef, useState } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

import type { Card, DayState, Lifeline } from './types.ts';
const LIFELINES: Lifeline[] = ['Set', 'Attack', 'Stage'];
function getTodayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}
function getDailyIndex(length: number) {
  const now = new Date();
  // Simple daily index based on date
  return (now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate()) % length;
}
import { POKEMON_NAMES } from './pokemon-names';
function namesMatch(guess: string, answer: string) {
  const guessNorm = guess.trim().toLowerCase();
  const answerNorm = answer.trim().toLowerCase();
  // If answer is in the official Pokémon names list, require exact match
  if (POKEMON_NAMES.map((n) => n.toLowerCase()).includes(answerNorm)) {
    return guessNorm === answerNorm;
  }
  // Otherwise, allow partial match (guess is contained in answer or vice versa)
  return (
    guessNorm === answerNorm || answerNorm.includes(guessNorm) || guessNorm.includes(answerNorm)
  );
}

export default function GuessThatFlavorText() {
  // Calculate game date and number once
  const today = new Date();
  const start = new Date(2026, 3, 16); // April is month 3 (0-indexed)
  const diff = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const gameNumber = diff + 1;
  // State
  const [page, setPage] = useState<0 | 1 | 2>(0);
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
  const inputRef = useRef<HTMLInputElement>(null!) as React.RefObject<HTMLInputElement>;
  const listRef = useRef<HTMLUListElement>(null!) as React.RefObject<HTMLUListElement>;

  // Load dataset
  useEffect(() => {
    Promise.all([import('./flavor-cards'), import('./pokemon-names')])
      .then(([cardsModule, namesModule]) => {
        const cardsData = cardsModule.default;
        const namesData = namesModule.POKEMON_NAMES;
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
        const idx = getDailyIndex(valid.length);
        const dailyCard = valid[idx] ?? null;
        // Only set card if stage is not null (should be filtered already, but extra guard)
        if (dailyCard && dailyCard.stage !== null) {
          setCard(dailyCard);
        } else {
          setCard(null);
        }
        setNames(
          namesData && namesData.length
            ? namesData
            : Array.from(new Set(valid.map((c) => c.name))).sort()
        );
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

  // Persist state
  useEffect(() => {
    if (!loading) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(dayState));
      } catch {}
    }
  }, [dayState, loading, storageKey]);

  // Autocomplete handlers
  function handleInputChange(value: string) {
    setInputValue(value);
    setActiveIndex(-1);
    if (!value.trim() || value.length < 3) {
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
    if (dayState.completed || !card) return;
    const guess = inputValue.trim();
    if (!guess) return;
    setSuggestions([]);
    const correct = namesMatch(guess, card.name);
    setDayState((prev: DayState) => ({
      ...prev,
      guess,
      completed: true,
      correct,
      score: correct ? prev.score : 0,
    }));
    setPage(2);
  }

  const { correct, score, usedLifelines, guess } = dayState;
  // PAGE 1: Intro
  if (page === 0) {
    return <GTFTIntroPage onPlay={() => setPage(1)} today={today} gameNumber={gameNumber} />;
  }
  // PAGE 2: Game
  if (page === 1 && card) {
    return (
      <GTFTGamePage
        card={card}
        names={names}
        usedLifelines={usedLifelines}
        LIFELINES={LIFELINES}
        inputValue={inputValue}
        suggestions={suggestions}
        activeIndex={activeIndex}
        inputRef={inputRef}
        listRef={listRef}
        activateLifeline={activateLifeline}
        handleInputChange={handleInputChange}
        handleKeyDown={handleKeyDown}
        selectSuggestion={selectSuggestion}
        submitGuess={submitGuess}
      />
    );
  }
  if (page === 2 && card) {
    return (
      <GTFTResultPage
        card={card}
        correct={correct}
        score={score}
        guess={guess}
        storageKey={storageKey}
        defaultState={defaultState}
        setDayState={setDayState}
        setPage={setPage}
        today={today}
        gameNumber={gameNumber}
      />
    );
  }
  return null;
}
