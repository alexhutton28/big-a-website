'use client';

import { useEffect, useRef, useState } from 'react';
import PromptDisplay, { type PromptDisplayHandle } from './PromptDisplay';
import Image from 'next/image';
import TimeAndScore from './TimeAndScore';

export default function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const promptRef = useRef<PromptDisplayHandle | null>(null);
  const [playerScore, setPlayerScore] = useState(0);
  const [prompt, setPrompt] = useState('Welcome to [Game Name]! Submit an image to begin.');
  const [isCanvasEmpty, setIsCanvasEmpty] = useState(true);
  const isEmptyRef = useRef(true);

  // Countdown timer state + ref
  const [timeLeft, setTimeLeft] = useState<number>(60);
  const timerRef = useRef<number | null>(null);

  // game active flag
  const [gameActive, setGameActive] = useState<boolean>(false);

  const startTimer = (seconds = 60) => {
    setTimeLeft(seconds);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    timerRef.current = window.setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          return 0;
        }
        return t - 1;
      });
    }, 1000);
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
      ctx.strokeStyle = '#461414';
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
      const { x, y } = getPos(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
      // Mark canvas as non-empty on first interaction
      if (isEmptyRef.current) {
        isEmptyRef.current = false;
        setIsCanvasEmpty(false);
      }
    };

    const endDrawing = () => {
      drawingRef.current = false;
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
      canvas.removeEventListener('mouseleave', endDrawing);
      canvas.removeEventListener('mousemove', draw);
      canvas.removeEventListener('touchstart', startDrawing as EventListener);
      canvas.removeEventListener('touchend', endDrawing);
      canvas.removeEventListener('touchcancel', endDrawing);
      canvas.removeEventListener('touchmove', draw as EventListener);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

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
    promptRef.current?.triggerSubmitAnimation();
    await new Promise((res) => setTimeout(res, 1000));
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

  const handleSubmitDebug = () => {
    setPlayerScore((s) => s + 500);
    handleClear();
    handleNewPrompt();
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

  const startGame = () => {
    resetGame();
    startTimer(60);
  };

  return (
    <div className="bg-bone flex flex-col gap-3 py-3 items-center h-[100vh]">
      <PromptDisplay ref={promptRef} prompt={prompt} />
      <div className="mb-[50]">
        <canvas
          ref={canvasRef}
          className="absolute border-2 bg-white border-mahogany w-[min(70vh,70vw)] h-[min(70vh,70vw)] max-w-[800px] max-h-[800px] z-[5]"
        />
        <div className="bg-mahogany relative top-[25] left-[25] w-[min(70vh,70vw)] h-[min(70vh,70vw)] max-w-[800px] max-h-[800px]" />
      </div>
      <div className="flex gap-3">
        <TimeAndScore playerScore={playerScore} timeLeft={timeLeft} />
        <button
          onClick={startGame}
          className="rounded bg-white px-4 py-2 text-black hover:bg-gray-200"
        >
          Start Game
        </button>
        <button
          onClick={handleClear}
          className="rounded bg-white px-4 py-2 text-black hover:bg-gray-200"
        >
          Clear
        </button>
        <button
          className="bg-mahogany hover:bg-charlie hover:border-mahogany border-1 p-2 rounded cursor-pointer"
          onClick={handleSaveImage}
        >
          <Image src="/save.svg" alt="Save" width={24} height={24} />
        </button>
        <button
          className="bg-mahogany hover:bg-charlie hover:border-mahogany border-1 p-2 rounded cursor-pointer"
          onClick={handleSubmitDebug}
        >
          <Image src="/arrow-right.svg" alt="Submit" width={24} height={24} />
        </button>
        <button
          onClick={resetGame}
          className="rounded bg-white px-4 py-2 text-black hover:bg-gray-200"
        >
          Reset Game
        </button>
      </div>
    </div>
  );
}
