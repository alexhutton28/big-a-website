'use client';

import { useState } from 'react';
import GameOverScreen from './GameOverScreen';
import GameScreen from './GameScreen';
import MenuScreen from './MenuScreen';
import { createRound, resolveGuess } from './gameLogic';
import { starterItems } from './starterItems';
import type { GameItem, GamePhase, GameRound, GuessSide } from './types';

// Main client controller for menu, rounds, score, and restart flow.
export default function LimitlessCheck() {
  const [phase, setPhase] = useState<GamePhase>('menu');
  const [score, setScore] = useState(0);
  const [currentRound, setCurrentRound] = useState<GameRound | null>(null);
  const [lastWinner, setLastWinner] = useState<GameItem | null>(null);
  const [lastLoser, setLastLoser] = useState<GameItem | null>(null);

  const startGame = () => {
    setScore(0);
    setLastWinner(null);
    setLastLoser(null);
    setCurrentRound(createRound(starterItems));
    setPhase('playing');
  };

  const handleGuess = (guess: GuessSide) => {
    if (!currentRound) {
      return;
    }

    const result = resolveGuess(currentRound, guess);
    setLastWinner(result.winningItem);
    setLastLoser(result.losingItem);

    if (result.isCorrect) {
      setScore((currentScore) => currentScore + 1);
      setCurrentRound(createRound(starterItems, result.winningItem));
      return;
    }

    setPhase('game-over');
  };

  return (
    <section className="flex flex-col items-center justify-start pt-[120px] min-h-[calc(100vh-80px)] bg-togepi px-6 text-houndoom">
      {phase === 'menu' && <MenuScreen onStart={startGame} />}

      {phase === 'playing' && currentRound && (
        <GameScreen round={currentRound} score={score} onGuess={handleGuess} />
      )}

      {phase === 'game-over' && (
        <GameOverScreen
          score={score}
          winningItem={lastWinner}
          losingItem={lastLoser}
          onRestart={startGame}
        />
      )}
    </section>
  );
}
