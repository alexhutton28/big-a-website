'use client';

import { useEffect, useState } from 'react';
import GameOverScreen from './GameOverScreen';
import GameScreen from './GameScreen';
import MenuScreen from './MenuScreen';
import { createRound, resolveGuess } from './gameLogic';
import { getItemsForMode } from './starterItems';
import type { GameItem, GameMode, GamePhase, GameRound, GuessSide } from './types';

// Main client controller for menu, rounds, score, and restart flow.
export default function LimitlessCheck() {
  const [phase, setPhase] = useState<GamePhase>('menu');
  const [mode, setMode] = useState<GameMode>('all');
  const [score, setScore] = useState(0);
  const [roundInstance, setRoundInstance] = useState(0);
  const [currentRound, setCurrentRound] = useState<GameRound | null>(null);
  const [lastWinner, setLastWinner] = useState<GameItem | null>(null);
  const [lastLoser, setLastLoser] = useState<GameItem | null>(null);
  const [carryCount, setCarryCount] = useState(0);
  const [lastCarryItemId, setLastCarryItemId] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.classList.add('limitless-check-scrollbar');

    return () => {
      document.documentElement.classList.remove('limitless-check-scrollbar');
    };
  }, []);

  const startGame = (selectedMode?: GameMode) => {
    const modeToUse = selectedMode ?? mode;
    const items = getItemsForMode(modeToUse);

    setMode(modeToUse);
    setScore(0);
    setLastWinner(null);
    setLastLoser(null);
    setCurrentRound(createRound(items));
    setRoundInstance((currentRoundInstance) => currentRoundInstance + 1);
    setPhase('playing');
  };

  const handleGuess = (guess: GuessSide) => {
    if (!currentRound) {
      return;
    }

    const items = getItemsForMode(mode);

    const result = resolveGuess(currentRound, guess);
    setLastWinner(result.winningItem);
    setLastLoser(result.losingItem);

    if (result.isCorrect) {
      let carryItem: GameItem;

      if (lastCarryItemId === result.winningItem.id && carryCount >= 1) {
        // Second time carrying, use losing item instead
        carryItem = result.losingItem;
        setCarryCount(0);
        setLastCarryItemId(result.losingItem.id);
      } else if (lastCarryItemId === result.winningItem.id) {
        // Same item, increment carry count
        carryItem = result.winningItem;
        setCarryCount(carryCount + 1);
      } else {
        // Different item, reset counter
        carryItem = result.winningItem;
        setCarryCount(1);
        setLastCarryItemId(result.winningItem.id);
      }

      setScore((currentScore) => currentScore + 1);
      setCurrentRound(createRound(items, carryItem));
      setRoundInstance((currentRoundInstance) => currentRoundInstance + 1);
      return;
    }

    setPhase('game-over');
  };

  const goHome = () => {
    setScore(0);
    setCurrentRound(null);
    setLastWinner(null);
    setLastLoser(null);
    setCarryCount(0);
    setLastCarryItemId(null);
    setPhase('menu');
  };

  return (
    <section
      className="flex flex-col items-center justify-start pt-3 pb-3 min-[800px]:pt-[10vh] min-h-[calc(100vh-62px)] px-3 min-[640px]:px-4 min-[1200px]:px-[120px] text-houndoom"
      style={{
        backgroundImage:
          "linear-gradient(rgba(250, 247, 247, 0.5), rgba(250, 247, 247, 0.5)), url('/paper-bg.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {phase === 'menu' && <MenuScreen onStart={startGame} />}

      {phase === 'playing' && currentRound && (
        <GameScreen key={roundInstance} round={currentRound} score={score} onGuess={handleGuess} />
      )}

      {phase === 'game-over' && (
        <GameOverScreen
          score={score}
          winningItem={lastWinner}
          losingItem={lastLoser}
          onHome={goHome}
          onRestart={() => startGame()}
        />
      )}
    </section>
  );
}
