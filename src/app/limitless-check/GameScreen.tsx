'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import type { GameRound, GuessSide } from './types';

const ENTRY_COUNT_DURATION_MS = 900;
const POST_RESULT_DELAY_MS = 2000;

type EntryCountProps = {
  value: number;
};

type GameScreenProps = {
  round: GameRound;
  score: number;
  onGuess: (guess: GuessSide) => void;
};

function EntryCount({ value }: EntryCountProps) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const animationStart = performance.now();
    let frameId = 0;

    const updateValue = (currentTime: number) => {
      const progress = Math.min((currentTime - animationStart) / ENTRY_COUNT_DURATION_MS, 1);
      setDisplayValue(Math.round(value * progress));

      if (progress < 1) {
        frameId = window.requestAnimationFrame(updateValue);
      }
    };

    frameId = window.requestAnimationFrame(updateValue);

    return () => window.cancelAnimationFrame(frameId);
  }, [value]);

  return (
    <p className="text-center font-bold text-lg">
      {displayValue.toLocaleString()} {displayValue === 1 ? 'entry' : 'entries'}
    </p>
  );
}

// Active round UI for comparing two items.
export default function GameScreen({ round, score, onGuess }: GameScreenProps) {
  const [pendingGuess, setPendingGuess] = useState<GuessSide | null>(null);
  const [showGuessResult, setShowGuessResult] = useState(false);
  const winningSide: GuessSide = round.left.entries >= round.right.entries ? 'left' : 'right';

  useEffect(() => {
    if (pendingGuess === null) return;

    const resultTimer = setTimeout(() => {
      setShowGuessResult(true);
    }, ENTRY_COUNT_DURATION_MS);

    const timer = setTimeout(() => {
      onGuess(pendingGuess);
    }, ENTRY_COUNT_DURATION_MS + POST_RESULT_DELAY_MS);

    return () => {
      clearTimeout(resultTimer);
      clearTimeout(timer);
    };
  }, [pendingGuess, onGuess]);

  const handleGuess = (side: GuessSide) => {
    if (pendingGuess !== null) return;
    setShowGuessResult(false);
    setPendingGuess(side);
  };

  const getButtonClassName = () => {
    const hoverClass = pendingGuess === null ? 'hover:border-blissey hover:scale-102' : '';

    return `w-full min-[800px]:min-w-[300px] min-[800px]:h-full border-2 border-transparent outline-4 rounded transition-[outline-color,border-color] transition-transform duration-300 flex flex-col justify-center bg-butterfree cursor-pointer px-4 disabled:border-transparent disabled:cursor-default ${hoverClass}`;
  };

  const getButtonOutlineColor = (side: GuessSide) => {
    const isChosen = pendingGuess === side;
    const showChosenResult = isChosen && showGuessResult;

    if (!showChosenResult) {
      return 'transparent';
    }

    return side === winningSide ? 'var(--color-bulbasaur)' : 'var(--color-scizor)';
  };

  const getItemMetaLabel = (item: GameRound['left']) => {
    if (item.type === 'Card' && Array.isArray(item.sets) && item.sets.length > 0) {
      return item.sets.join(', ');
    }

    return item.type;
  };

  return (
    <div className="flex flex-col gap-4 w-[80vw] max-w-[1000px]">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase text-eevee">Score</p>
          <h1 className="text-4xl font-bold">{score}</h1>
        </div>
        <div>
          <p className="max-w-md text-right text-sm text-eevee mb-1">
            Who has more entries on{' '}
            <a
              className="underline underline-offset-2 hover:text-houndoom"
              href="https://play.limitlesstcg.com/tournaments?game=PTCG"
              rel="noreferrer"
              target="_blank"
            >
              LimitlessTCG
            </a>{' '}
            <span className="whitespace-nowrap">in the last 30 days?</span>
          </p>
          <p className="text-xs text-right">Last Updated: 4/8/2026</p>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-0 min-[800px]:gap-4 min-[800px]:flex-nowrap min-[800px]:items-stretch">
          <div className="round-option-enter w-full min-[800px]:min-w-0 min-[800px]:flex-1 min-[800px]:flex">
            <button
              className={getButtonClassName()}
              disabled={pendingGuess !== null}
              onClick={() => handleGuess('left')}
              style={{ outlineColor: getButtonOutlineColor('left') }}
              type="button"
            >
              <div className="flex flex-col text-left py-4">
                {round.left.image.length > 0 && (
                  <div className="mb-2 flex items-center gap-2">
                    {round.left.image.map((imageUrl, index) => (
                      <Image
                        alt={`${round.left.name} image ${index + 1}`}
                        className="h-[30px] w-auto object-contain"
                        height={30}
                        key={`${round.left.id}-${imageUrl}`}
                        src={imageUrl}
                        width={30}
                      />
                    ))}
                  </div>
                )}
                <h2 className="text-3xl font-bold mb-2">{round.left.name}</h2>
                <span className="text-xs font-bold uppercase text-eevee">
                  {getItemMetaLabel(round.left)}
                </span>
              </div>
            </button>
            <div className="mt-2 min-h-[28px] min-[800px]:hidden">
              {pendingGuess !== null && <EntryCount value={round.left.entries} />}
            </div>
          </div>

          <div className="flex w-full items-center justify-center text-sm font-bold uppercase text-eevee min-[800px]:w-auto">
            Vs
          </div>

          <div className="round-option-enter mt-[28px] w-full min-[800px]:mt-0 min-[800px]:min-w-0 min-[800px]:flex-1 min-[800px]:flex">
            <button
              className={getButtonClassName()}
              disabled={pendingGuess !== null}
              onClick={() => handleGuess('right')}
              style={{ outlineColor: getButtonOutlineColor('right') }}
              type="button"
            >
              <div className="flex flex-col text-left py-4">
                {round.right.image.length > 0 && (
                  <div className="mb-2 flex items-center gap-2">
                    {round.right.image.map((imageUrl, index) => (
                      <Image
                        alt={`${round.right.name} image ${index + 1}`}
                        className="h-[30px] w-auto object-contain"
                        height={30}
                        key={`${round.right.id}-${imageUrl}`}
                        src={imageUrl}
                        width={30}
                      />
                    ))}
                  </div>
                )}
                <h2 className="text-3xl font-bold mb-2">{round.right.name}</h2>
                <span className="text-xs font-bold uppercase text-eevee">
                  {getItemMetaLabel(round.right)}
                </span>
              </div>
            </button>
            <div className="mt-2 min-h-[28px] min-[800px]:hidden">
              {pendingGuess !== null && <EntryCount value={round.right.entries} />}
            </div>
          </div>
        </div>

        {pendingGuess !== null && (
          <div className="hidden gap-4 min-[800px]:flex min-[800px]:flex-nowrap">
            <div className="w-full min-[800px]:min-w-0 min-[800px]:flex-1">
              <EntryCount value={round.left.entries} />
            </div>
            <div className="hidden min-[800px]:block min-[800px]:w-auto" />
            <div className="w-full min-[800px]:min-w-0 min-[800px]:flex-1">
              <EntryCount value={round.right.entries} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
