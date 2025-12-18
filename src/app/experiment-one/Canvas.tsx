'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import ColorButton from './ColorButton';

export default function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [, setDrawing] = useState(false);
  const drawingRef = useRef(false);
  const [playerScore, setPlayerScore] = useState(0);
  const [prompt, setPrompt] = useState('Circle');
  const [currentColor, setCurrentColor] = useState<string>('#ffffff');
  const colorRef = useRef<string>(currentColor);
  const [isCanvasEmpty, setIsCanvasEmpty] = useState(true);
  const isEmptyRef = useRef(true);

  // Define shop items and palette order
  const SHOP_ITEMS = [
    { name: 'Red', color: '#ef4444', cost: 200 },
    { name: 'Orange', color: '#f97316', cost: 200 },
    { name: 'Yellow', color: '#eab308', cost: 200 },
    { name: 'Green', color: '#22c55e', cost: 200 },
    { name: 'Blue', color: '#3b82f6', cost: 200 },
    { name: 'Purple', color: '#6366f1', cost: 200 },
  ] as const;
  const PALETTE = ['#ffffff', ...SHOP_ITEMS.map((i) => i.color)];

  // Track unlocked colors (white is always unlocked)
  const [unlockedColors, setUnlockedColors] = useState<Set<string>>(() => new Set(['#ffffff']));

  const isUnlocked = (color: string) => unlockedColors.has(color);
  const canAfford = (cost: number) => playerScore >= cost;
  const purchaseColor = (color: string, cost: number) => {
    if (isUnlocked(color)) return; // already owned
    if (!canAfford(cost)) return; // not enough score
    setPlayerScore((s) => s - cost);
    setUnlockedColors((prev) => {
      const next = new Set(prev);
      next.add(color);
      return next;
    });
  };

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;

    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 4;
      isEmptyRef.current = true;
      setIsCanvasEmpty(true);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const getPos = (e: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      if (e instanceof MouseEvent) return { x: e.clientX - rect.left, y: e.clientY - rect.top };
      const touch = (e as TouchEvent).touches[0] || (e as TouchEvent).changedTouches[0];
      return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    };

    const startDrawing = (e: MouseEvent | TouchEvent) => {
      drawingRef.current = true;
      setDrawing(true);
      const { x, y } = getPos(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
      // Mark canvas as non-empty on first interaction
      if (isEmptyRef.current) {
        isEmptyRef.current = false;
        setIsCanvasEmpty(false);
      }
      // Use latest color without re-running effect
      ctx.strokeStyle = colorRef.current;
    };

    const endDrawing = () => {
      drawingRef.current = false;
      setDrawing(false);
      ctx.closePath();
    };

    const draw = (e: MouseEvent | TouchEvent) => {
      if (!drawingRef.current) return;
      if (e instanceof TouchEvent) e.preventDefault();
      const { x, y } = getPos(e);
      ctx.lineTo(x, y);
      ctx.stroke();
      if (isEmptyRef.current) {
        isEmptyRef.current = false;
        setIsCanvasEmpty(false);
      }
    };

    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mouseup', endDrawing);
    canvas.addEventListener('mouseleave', endDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('touchstart', startDrawing, { passive: false });
    canvas.addEventListener('touchend', endDrawing);
    canvas.addEventListener('touchcancel', endDrawing);
    canvas.addEventListener('touchmove', draw, { passive: false });

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      canvas.removeEventListener('mousedown', startDrawing);
      canvas.removeEventListener('mouseup', endDrawing);
      canvas.removeEventListener('mouseleave', endDrawing);
      canvas.removeEventListener('mousemove', draw);
      canvas.removeEventListener('touchstart', startDrawing as EventListener);
      canvas.removeEventListener('touchend', endDrawing);
      canvas.removeEventListener('touchcancel', endDrawing);
      canvas.removeEventListener('touchmove', draw as EventListener);
    };
  }, []);

  useEffect(() => {
    colorRef.current = currentColor;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = currentColor;
  }, [currentColor]);

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    isEmptyRef.current = true;
    setIsCanvasEmpty(true);
  };

  const handleNewPrompt = async () => {
    try {
      const res = await fetch('/prompts.txt', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      const prompts = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
      if (prompts.length === 0) return;
      setPrompt(prompts[Math.floor(Math.random() * prompts.length)]);
    } catch (err) {
      console.error('Failed to load prompts:', err);
    }
  };

  // Dont delete - for debugging
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleSubmitDebug = () => {
    setPlayerScore((s) => s + 50);
    handleNewPrompt();
    handleClear();
  };

  const handleSubmit = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    try {
      const imageUrl = canvas.toDataURL('image/png');

      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: prompt, imageUrl }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      const score =
        typeof data.output === 'number' ? data.output : parseInt(String(data.output), 10);

      if (Number.isFinite(score)) {
        setPlayerScore((s) => s + score * 2);
        handleNewPrompt();
        handleClear();
      } else {
        console.warn('Received invalid score from AI', data.output);
      }
    } catch (err) {
      console.error('Submit failed:', err);
    }
  };

  const handleSaveImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `${prompt}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  const resetGame = () => {
    setPlayerScore(0);
    handleNewPrompt();
    handleClear();
  };

  const handleSetColor = (color: string) => setCurrentColor(color);

  return (
    <div className="flex flex-col gap-3 items-center">
      <div>an ai game about human art</div>
      <div className="flex flex-row gap-3">
        <canvas
          ref={canvasRef}
          className="border-2 border-white w-[70vh] h-[70vh] max-w-[800px] max-h-[800px]"
        />
        <div className="flex flex-col p-2 bg-gray-900">
          <div className="mb-1 text-center">shop</div>

          {/* Shop buttons generated from items - hide owned items */}
          {SHOP_ITEMS.filter((item) => !isUnlocked(item.color)).length === 0 ? (
            <div className="text-sm opacity-70">All items purchased</div>
          ) : (
            SHOP_ITEMS.filter((item) => !isUnlocked(item.color)).map((item) => {
              const affordable = canAfford(item.cost);
              const disabled = !affordable;
              const classes = `flex items-center gap-2 px-2 py-1 rounded justify-between ${
                disabled ? 'opacity-60 cursor-not-allowed' : 'hover:bg-gray-800'
              }`;
              return (
                <button
                  key={item.name}
                  onClick={() => purchaseColor(item.color, item.cost)}
                  disabled={disabled}
                  className={classes}
                >
                  <span>{item.name}</span>
                  <span className="inline-flex items-center">
                    <span className="text-money">{item.cost}</span>
                    <Image src="/coin.svg" alt="Gold" width={24} height={24} />
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>
      <div className="flex gap-3">
        <button
          onClick={handleClear}
          className="rounded bg-white px-4 py-2 text-black hover:bg-gray-200"
        >
          Clear
        </button>
        <button
          onClick={handleSubmit}
          disabled={isCanvasEmpty}
          className="rounded bg-white px-4 py-2 text-black hover:bg-gray-200 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          Submit
        </button>
        <button
          onClick={handleSaveImage}
          className="rounded bg-white px-4 py-2 text-black hover:bg-gray-200"
        >
          Save Image
        </button>
        <button
          onClick={resetGame}
          className="rounded bg-white px-4 py-2 text-black hover:bg-gray-200"
        >
          Reset Game
        </button>
      </div>
      <div className="flex gap-2 items-center">
        {/* Palette buttons reflect locked/unlocked state */}
        {PALETTE.map((color) => (
          <ColorButton
            key={color}
            color={color}
            onClick={handleSetColor}
            locked={!isUnlocked(color)}
          />
        ))}
        <span className="ml-2 text-sm">Current:</span>
        <span style={{ color: currentColor }}>■</span>
      </div>
      <div className="flex items-center gap-3">
        <div>Score: {playerScore}</div>
        <div>Prompt: {prompt}</div>
      </div>
    </div>
  );
}
