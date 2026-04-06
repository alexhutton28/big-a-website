import Image from 'next/image';
import type { GameRound, GuessSide } from './types';

type GameScreenProps = {
  round: GameRound;
  score: number;
  onGuess: (guess: GuessSide) => void;
};

// Active round UI for comparing two items.
export default function GameScreen({ round, score, onGuess }: GameScreenProps) {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase text-eevee">Score</p>
          <h1 className="text-4xl font-bold">{score}</h1>
        </div>
        <p className="max-w-md text-right text-sm text-eevee">Powered by LimitlessTCG</p>
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-stretch">
        <button
          className="min-w-[300px] border-2 border-transparent rounded transition duration-300 hover:border-blissey flex flex-col justify-center bg-jigglypuff cursor-pointer px-3"
          onClick={() => onGuess('left')}
          type="button"
        >
          <div className="flex flex-col text-left mx-auto py-5">
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
            <span className="text-xs font-bold uppercase text-eevee">{round.left.type}</span>
          </div>
        </button>

        <div className="flex items-center justify-center text-sm font-bold uppercase text-eevee">
          Vs
        </div>

        <button
          className="min-w-[300px] border-2 border-transparent rounded transition duration-300 hover:border-blissey flex flex-col justify-center bg-jigglypuff cursor-pointer px-3"
          onClick={() => onGuess('right')}
          type="button"
        >
          <div className="flex flex-col text-left mx-auto py-5">
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
            <span className="text-xs font-bold uppercase text-eevee">{round.right.type}</span>
          </div>
        </button>
      </div>
    </div>
  );
}
