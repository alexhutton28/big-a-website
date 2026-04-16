import Image from 'next/image';

export default function GTFTIntroPage({
  onPlay,
  today,
  gameNumber,
}: {
  onPlay: () => void;
  today: Date;
  gameNumber: number;
}) {
  return (
    <section className="min-h-[calc(100vh-62px)] flex flex-col items-center justify-start pt-2 sm:pt-5">
      <Image
        src="/unknown-q.svg"
        alt="Guess That Flavor Text Logo"
        width={170}
        height={36}
        className="mb-0 w-[85px] sm:w-[100px] h-auto"
      />
      <div className="flex flex-col items-center light">
        <h1 className="barlow text-[32px] italic font-italic mb-2 text-tide">Guess That</h1>
        <h1 className="barlow-cond text-[50px] font-bold mb-2 text-tide -mt-4">FLAVOR TEXT</h1>
      </div>
      <div className="barlow text-[16px] mb-4 text-slate text-center max-w-[210px]">
        Guess the Pokémon based on the provided PTCG flavor text.
      </div>
      <button
        className="barlow-cond text-white font-bold bg-tide px-3 py-2 rounded text-[24px] cursor-pointer hover:bg-wave transition-colors"
        onClick={onPlay}
      >
        Play
      </button>
      <div className="text-stone text-xs mt-2 flex flex-col items-center gap-1">
        {today.toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}
        <p>No. {gameNumber}</p>
      </div>
    </section>
  );
}
