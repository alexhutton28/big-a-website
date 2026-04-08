import { useState } from 'react';
import Image from 'next/image';
import type { GameMode } from './types';

type MenuScreenProps = {
  onStart: (mode: GameMode) => void;
};

const modeOptions: { label: string; value: GameMode }[] = [
  { label: 'Cards', value: 'cards' },
  { label: 'Decks', value: 'decks' },
  { label: 'Players', value: 'players' },
  { label: 'All', value: 'all' },
];

// Intro screen for the game title and first action.
export default function MenuScreen({ onStart }: MenuScreenProps) {
  const [selectedMode, setSelectedMode] = useState<GameMode>('cards');
  const selectedModeIndex = modeOptions.findIndex(
    (modeOption) => modeOption.value === selectedMode
  );

  return (
    <div className="flex flex-col items-center justify-center gap-3 text-center">
      <div className="space-y-2 mb-3">
        <Image
          src="/limitless-check.svg"
          alt="Limitless Check logo"
          width={250}
          height={230}
          className="mx-auto mb-1 h-auto w-[80px]"
          priority
        />
        <h1 className="text-5xl font-bold mb-2">Limitless Check</h1>
        <p className="text-l text-eevee">A Pokémon TCG Higher-Lower Game</p>
      </div>
      <button
        className="mb-3 cursor-pointer rounded bg-houndoom px-4 py-3 text-xl font-bold text-togepi transition-colors transition-transform hover:scale-105 hover:bg-eevee"
        onClick={() => onStart(selectedMode)}
        type="button"
      >
        Play
      </button>
      <div
        className="relative grid w-full max-w-md grid-cols-4 rounded border-2 border-rockruff bg-togepi p-1"
        role="radiogroup"
        aria-label="Game mode"
      >
        <div
          className="pointer-events-none absolute bottom-1 left-1 top-1 rounded bg-rockruff transition-transform duration-300 ease-out"
          style={{
            width: 'calc((100% - 0.5rem) / 4)',
            transform: `translateX(${selectedModeIndex * 100}%)`,
          }}
        />
        {modeOptions.map((modeOption) => {
          const isSelected = selectedMode === modeOption.value;

          return (
            <button
              aria-checked={isSelected}
              className={`relative z-10 rounded px-1 py-2 text-xs transition cursor-pointer ${
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
