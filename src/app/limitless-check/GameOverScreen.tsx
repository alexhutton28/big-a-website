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
  const handleShare = async () => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return;
    }

    const isMobileDevice = /Android|iPhone|iPad|iPod|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );

    if (!isMobileDevice || typeof navigator.share !== 'function') {
      return;
    }

    const shareText = `I Scored ${score} on Limitless Check!\nTry it for yourself: https://big-a.fun/limitless-check`;

    try {
      await navigator.share({ text: shareText });
    } catch {
      // Ignore dismiss/cancel errors from the native share sheet.
    }
  };

  const resultMessage = winningItem && losingItem && (
    <>
      <span className="inline-flex items-baseline gap-2 whitespace-nowrap">
        <a
          className="font-semibold underline decoration-eevee underline-offset-2 hover:text-houndoom"
          href={winningItem.hyperlink}
          rel="noreferrer"
          target="_blank"
        >
          {winningItem.name}
        </a>
        <span className="text-xs uppercase text-eevee/80">
          ({winningItem.type === 'Card' && winningItem.set ? winningItem.set : winningItem.type})
        </span>
      </span>{' '}
      has more limitless entries than{' '}
      <span className="inline-flex items-baseline gap-2 whitespace-nowrap">
        <a
          className="font-semibold underline decoration-eevee underline-offset-2 hover:text-houndoom"
          href={losingItem.hyperlink}
          rel="noreferrer"
          target="_blank"
        >
          {losingItem.name}
        </a>
        <span className="text-xs uppercase text-eevee/80">
          ({losingItem.type === 'Card' && losingItem.set ? losingItem.set : losingItem.type})
        </span>
      </span>
      .
    </>
  );

  return (
    <div className="game-over-panel-enter w-full max-w-[80vw] min-[800px]:max-w-[50vw] rounded-xl border-2 border-rockruff bg-togepi/95 p-5 shadow-2xl flex flex-col items-center justify-center gap-4 text-center">
      <div className="space-y-4">
        <h1 className="text-5xl font-bold tracking-tight">Final Score: {score}</h1>
        <p className="text-lg text-eevee">{resultMessage || 'You missed the last guess.'}</p>
      </div>
      <div className="mt-3 flex min-w-[200px] flex-col gap-4 items-center">
        <button
          className="bg-houndoom w-full rounded px-5 py-4 text-m font-bold text-togepi transition-colors transition-transform motion-safe:hover:scale-102 hover:bg-eevee cursor-pointer"
          onClick={onRestart}
          type="button"
        >
          Play Again
        </button>
        <div className="flex items-center gap-3">
          <button
            className="ring-2 ring-inset ring-houndoom px-5 py-3 text-sm font-bold text-houndoom transition-colors transition-transform motion-safe:hover:scale-102 hover:ring-eevee hover:text-eevee cursor-pointer rounded"
            onClick={onHome}
            type="button"
          >
            Home
          </button>
          <button
            className="ring-2 ring-inset ring-houndoom px-5 py-3 text-sm font-bold text-houndoom transition-colors transition-transform motion-safe:hover:scale-102 hover:ring-eevee hover:text-eevee cursor-pointer rounded min-[800px]:hidden"
            onClick={handleShare}
            type="button"
          >
            Share
          </button>
        </div>
      </div>
    </div>
  );
}
