'use client';

import { useEffect, useRef, useState } from 'react';

export default function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const drawingRef = useRef(false);
  const [playerScore, setPlayerScore] = useState(0);
  const [prompt, setPrompt] = useState('aaa');

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;

    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Set default draw style
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'white';
    };

    // Initial size sync
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const getPos = (e: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      if (e instanceof MouseEvent) {
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
      }
      const touch = (e as TouchEvent).touches[0] || (e as TouchEvent).changedTouches[0];
      return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    };

    const startDrawing = (e: MouseEvent | TouchEvent) => {
      drawingRef.current = true;
      setDrawing(true);
      const { x, y } = getPos(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
    };

    const endDrawing = () => {
      drawingRef.current = false;
      setDrawing(false);
      ctx.closePath();
    };

    const draw = (e: MouseEvent | TouchEvent) => {
      if (!drawingRef.current) return;
      if (e instanceof TouchEvent) {
        e.preventDefault();
      }
      const { x, y } = getPos(e);
      ctx.lineTo(x, y);
      ctx.stroke();
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

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleSubmit = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    setPlayerScore((s) => s + 1);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  // Load a new prompt from a text file in /public (prompts.txt)
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
      const next = prompts[Math.floor(Math.random() * prompts.length)];
      setPrompt(next);
    } catch (err) {
      console.error('Failed to load prompts:', err);
    }
  };

  return (
    <div className="flex flex-col gap-3 items-center">
      <div>AlexGPT</div>
      {/* Responsive size via classes; internal resolution synced in effect */}
      <canvas
        ref={canvasRef}
        className="border-2 border-white w-[70vh] h-[70vh] max-w-[800px] max-h-[800px]"
      />
      <div className="flex gap-3">
        <button
          onClick={handleClear}
          className="rounded bg-white px-4 py-2 text-black hover:bg-gray-200 w-fit"
        >
          Clear
        </button>
        <button
          onClick={handleSubmit}
          className="rounded bg-white px-4 py-2 text-black hover:bg-gray-200 w-fit"
        >
          Submit
        </button>
        <button
          className="rounded bg-white px-4 py-2 text-black hover:bg-gray-200 w-fit"
          onClick={handleNewPrompt}
        >
          New Prompt
        </button>
      </div>
      <div>Score : {playerScore}</div>
      <div>Prompt : {prompt}</div>
    </div>
  );
}
