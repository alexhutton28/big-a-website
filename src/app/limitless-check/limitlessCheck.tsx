'use client';

import { useState } from 'react';
import GameOverScreen from './GameOverScreen';
import GameScreen from './GameScreen';
import MenuScreen from './MenuScreen';
import { createRound, resolveGuess, selectCarryItem } from './gameLogic';
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
      const carryItem = selectCarryItem(result.winningItem, result.losingItem);

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
    setPhase('menu');
  };

  return (
    <section className="flex flex-col items-center justify-start pt-[120px] min-h-[calc(100vh-80px)] bg-togepi px-6 text-houndoom">
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
