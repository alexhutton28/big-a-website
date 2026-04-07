import type { GameItem } from './types';

type GameOverScreenProps = {
  score: number;
  winningItem: GameItem | null;
  losingItem: GameItem | null;
  onHome: () => void;
  onRestart: () => void;
};

// End screen for showing the result and restarting the run.
export default function GameOverScreen({
  score,
  winningItem,
  losingItem,
  onHome,
  onRestart,
}: GameOverScreenProps) {
  const resultMessage = winningItem && losingItem && (
    <>
      <a
        className="font-semibold underline decoration-eevee underline-offset-2 hover:text-houndoom"
        href={winningItem.hyperlink}
        rel="noreferrer"
        target="_blank"
      >
        {winningItem.name}
      </a>{' '}
      <span className="text-xs uppercase text-eevee/80">
        ({winningItem.type === 'Card' && winningItem.set ? winningItem.set : winningItem.type})
      </span>{' '}
      has more limitless entries than{' '}
      <a
        className="font-semibold underline decoration-eevee underline-offset-2 hover:text-houndoom"
        href={losingItem.hyperlink}
        rel="noreferrer"
        target="_blank"
      >
        {losingItem.name}
      </a>{' '}
      <span className="text-xs uppercase text-eevee/80">
        ({losingItem.type === 'Card' && losingItem.set ? losingItem.set : losingItem.type})
      </span>
      .
    </>
  );

  return (
    <div className="flex flex-col items-center justify-center gap-4 text-center">
      <div className="space-y-3">
        <h1 className="text-5xl font-bold tracking-tight">Final Score: {score}</h1>
        <p className="text-lg text-eevee">{resultMessage || 'You missed the last guess.'}</p>
      </div>
      <div className="flex items-center gap-3">
        <button
          className="bg-houndoom px-3 py-3 text-sm font-bold text-togepi transition hover:bg-eevee cursor-pointer rounded"
          onClick={onRestart}
          type="button"
        >
          Play Again
        </button>
        <button
          className="ring-2 ring-inset ring-houndoom px-3 py-3 text-sm font-bold text-houndoom transition hover:ring-eevee hover:text-eevee cursor-pointer rounded"
          onClick={onHome}
          type="button"
        >
          Home
        </button>
      </div>
    </div>
  );
}
