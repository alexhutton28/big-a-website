type MenuScreenProps = {
  onStart: () => void;
};

// Intro screen for the game title and first action.
export default function MenuScreen({ onStart }: MenuScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 text-center">
      <div className="space-y-3">
        <h1 className="text-5xl font-bold">Limitless Check</h1>
        <p className="text-lg text-eevee">A Higher-Lower Game</p>
      </div>
      <button
        className="bg-houndoom px-3 py-3 text-sm font-bold text-togepi transition hover:bg-eevee cursor-pointer"
        onClick={onStart}
        type="button"
      >
        Start Game
      </button>
    </div>
  );
}
