import { useState } from 'react';
import Image from 'next/image';
import type { GameMode } from './types';

type MenuScreenProps = {
  onStart: (mode: GameMode) => void;
};

const modeOptions: { label: string; value: GameMode }[] = [
  { label: 'Cards', value: 'cards' },
  { label: 'Decks', value: 'decks' },
];

// Intro screen for the game title and first action.
export default function MenuScreen({ onStart }: MenuScreenProps) {
  const [selectedMode, setSelectedMode] = useState<GameMode>('cards');
  const selectedModeIndex = modeOptions.findIndex(
    (modeOption) => modeOption.value === selectedMode
  );

  return (
    <div className="flex flex-col items-center justify-center gap-4 text-center">
      <div className="space-y-3 mb-4">
        <Image
          src="/limitless-check.svg"
          alt="Limitless Check logo"
          width={250}
          height={230}
          className="mx-auto mb-2 h-auto w-[80px]"
          priority
        />
        <h1 className="text-5xl font-bold mb-3">Limitless Check</h1>
        <p className="text-l text-eevee">A Pokémon TCG Higher-Lower Game</p>
      </div>
      <button
        className="mb-4 cursor-pointer rounded bg-houndoom px-5 py-4 text-xl font-bold text-togepi transition-colors transition-transform motion-safe:hover:scale-105 hover:bg-eevee"
        onClick={() => onStart(selectedMode)}
        type="button"
      >
        Play
      </button>
      <div
        className="relative grid w-full max-w-[8rem] grid-cols-2 rounded border-2 border-rockruff bg-togepi p-2"
        role="radiogroup"
        aria-label="Game mode"
      >
        <div
          className="pointer-events-none absolute bottom-2 left-2 top-2 rounded bg-rockruff transition-transform duration-300 ease-out motion-reduce:transition-none"
          style={{
            width: 'calc((100% - 0.5rem) / 2)',
            transform: `translateX(${selectedModeIndex * 100}%)`,
          }}
        />
        {modeOptions.map((modeOption) => {
          const isSelected = selectedMode === modeOption.value;

          return (
            <button
              aria-checked={isSelected}
              className={`relative z-10 rounded px-2 py-3 text-xs transition cursor-pointer ${
                isSelected ? 'text-togepi' : 'text-eevee hover:text-houndoom'
              }`}
              key={modeOption.value}
              onClick={() => setSelectedMode(modeOption.value)}
              role="radio"
              type="button"
            >
              {modeOption.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
