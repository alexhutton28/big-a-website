'use client';

import { useEffect, useRef, useState } from 'react';
import PromptDisplay, { type PromptDisplayHandle } from './PromptDisplay';
import Image from 'next/image';
import TimeAndScore from './TimeAndScore';
import { randomPrompt, type Prompt } from './prompts';

const ROUND_SECONDS = 60;
const STROKE_COLOR = '#461414';
const STROKE_WIDTH = 4;
// Drawings are sent to the scorer at 512px: OpenAI's "low" detail scores images at
// 512x512 for a small fixed cost, so anything bigger only adds upload time
const SCORE_IMAGE_SIZE = 512;

type Phase = 'idle' | 'playing' | 'over';

// Copies the drawing onto a white background (the canvas itself is transparent; its
// white is only CSS), optionally resized
function drawingOnWhite(canvas: HTMLCanvasElement, size?: number) {
  const out = document.createElement('canvas');
  out.width = size ?? canvas.width;
  out.height = size ?? canvas.height;
  const ctx = out.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.drawImage(canvas, 0, 0, out.width, out.height);
  return out;
}

// Smallest practical upload for scoring: WebP (about 1/4 the size of PNG for a sketch),
// or JPEG on browsers that can't encode WebP (they quietly return PNG instead)
function exportForScoring(canvas: HTMLCanvasElement) {
  const small = drawingOnWhite(canvas, SCORE_IMAGE_SIZE);
  const webp = small.toDataURL('image/webp', 0.8);
  return webp.startsWith('data:image/webp') ? webp : small.toDataURL('image/jpeg', 0.8);
}

export default function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const promptRef = useRef<PromptDisplayHandle | null>(null);
  const [playerScore, setPlayerScore] = useState(0);
  const [isCanvasEmpty, setIsCanvasEmpty] = useState(true);
  const isEmptyRef = useRef(true);

  // Game state. Refs mirror the values the canvas event handlers and timer read.
  const [phase, setPhase] = useState<Phase>('idle');
  const phaseRef = useRef<Phase>('idle');
  const [currentPrompt, setCurrentPrompt] = useState<Prompt | null>(null);
  // While a drawing is being scored (and the next prompt slides in) the clock is
  // paused and drawing/submitting is blocked, so waiting on the AI never costs time
  const [scoring, setScoring] = useState(false);
  const scoringRef = useRef(false);

  const [timeLeft, setTimeLeft] = useState<number>(ROUND_SECONDS);
  const timeLeftRef = useRef(ROUND_SECONDS);
  const timerRef = useRef<number | null>(null);
  const [finalScore, setFinalScore] = useState<number | null>(null);
  const scoreRef = useRef(0);

  const setPhaseBoth = (next: Phase) => {
    phaseRef.current = next;
    setPhase(next);
  };
  const setScoringBoth = (next: boolean) => {
    scoringRef.current = next;
    setScoring(next);
  };
  const addScore = (points: number) => {
    scoreRef.current += points;
    setPlayerScore(scoreRef.current);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const endGame = () => {
    stopTimer();
    drawingRef.current = false;
    setFinalScore(scoreRef.current);
    setPhaseBoth('over');
  };

  const startTimer = () => {
    stopTimer();
    timeLeftRef.current = ROUND_SECONDS;
    setTimeLeft(ROUND_SECONDS);
    timerRef.current = window.setInterval(() => {
      if (scoringRef.current) return; // paused while scoring
      timeLeftRef.current -= 1;
      setTimeLeft(timeLeftRef.current);
      if (timeLeftRef.current <= 0) endGame();
    }, 1000);
  };

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;

    const applyPen = () => {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = STROKE_WIDTH;
      ctx.strokeStyle = STROKE_COLOR;
      ctx.fillStyle = STROKE_COLOR;
    };

    // Resizing a canvas wipes it, so keep a copy of the drawing and paint it back
    // scaled to the new size (e.g. a phone's address bar or rotating the device)
    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      const width = Math.floor(rect.width * dpr);
      const height = Math.floor(rect.height * dpr);
      if (width === canvas.width && height === canvas.height) return;

      let saved: HTMLCanvasElement | null = null;
      if (!isEmptyRef.current && canvas.width > 0 && canvas.height > 0) {
        saved = document.createElement('canvas');
        saved.width = canvas.width;
        saved.height = canvas.height;
        saved.getContext('2d')!.drawImage(canvas, 0, 0);
      }

      canvas.width = width;
      canvas.height = height;
      if (saved) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.drawImage(saved, 0, 0, width, height);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      applyPen();
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const canDraw = () => phaseRef.current === 'playing' && !scoringRef.current;

    const markDrawn = () => {
      if (isEmptyRef.current) {
        isEmptyRef.current = false;
        setIsCanvasEmpty(false);
      }
    };

    const getPos = (e: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      if (e instanceof MouseEvent) return { x: e.clientX - rect.left, y: e.clientY - rect.top };
      const touch = (e as TouchEvent).touches[0] || (e as TouchEvent).changedTouches[0];
      return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    };

    const startDrawing = (e: MouseEvent | TouchEvent) => {
      if (!canDraw()) return;
      if (e instanceof TouchEvent) e.preventDefault();
      drawingRef.current = true;
      const { x, y } = getPos(e);
      // A dot, so a tap or click without moving still leaves a mark
      ctx.beginPath();
      ctx.arc(x, y, STROKE_WIDTH / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x, y);
      markDrawn();
    };

    const endDrawing = () => {
      drawingRef.current = false;
      ctx.closePath();
    };

    const draw = (e: MouseEvent | TouchEvent) => {
      if (!drawingRef.current || !canDraw()) return;
      if (e instanceof TouchEvent) e.preventDefault();
      const { x, y } = getPos(e);
      ctx.lineTo(x, y);
      ctx.stroke();
      markDrawn();
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
      canvas.removeEventListener('touchstart', startDrawing);
      canvas.removeEventListener('touchend', endDrawing);
      canvas.removeEventListener('touchcancel', endDrawing);
      canvas.removeEventListener('touchmove', draw);
    };
  }, []);

  // Stop the clock if the page goes away mid-round
  useEffect(() => stopTimer, []);

  const handleClear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    isEmptyRef.current = true;
    setIsCanvasEmpty(true);
  };

  const handleSubmit = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !currentPrompt) return;
    if (phaseRef.current !== 'playing' || scoringRef.current || isEmptyRef.current) return;

    setScoringBoth(true); // pauses the clock and blocks drawing
    drawingRef.current = false;

    let points: number | null = null;
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: currentPrompt,
          imageUrl: exportForScoring(canvas),
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const score =
        typeof data.output === 'number' ? data.output : parseInt(String(data.output), 10);
      if (Number.isFinite(score)) points = score * 2;
      else console.warn('Received invalid score from AI', data.output);
    } catch (err) {
      console.error('Submit failed:', err);
    }

    if (points === null) {
      // Scoring failed: keep the drawing so the player can try submitting again
      setScoringBoth(false);
      return;
    }

    addScore(points);
    // Slide the prompt away, then bring in a fresh canvas and the next prompt
    promptRef.current?.triggerSubmitAnimation();
    await new Promise((res) => setTimeout(res, 1000));
    handleClear();
    setCurrentPrompt((previous) => randomPrompt(previous ?? undefined));
    setScoringBoth(false);
  };

  const handleSaveImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `${currentPrompt ?? 'art-something'}.png`;
    link.href = drawingOnWhite(canvas).toDataURL('image/png');
    link.click();
  };

  // Back to the start screen
  const resetGame = () => {
    stopTimer();
    scoreRef.current = 0;
    setPlayerScore(0);
    timeLeftRef.current = ROUND_SECONDS;
    setTimeLeft(ROUND_SECONDS);
    setFinalScore(null);
    setScoringBoth(false);
    setCurrentPrompt(null);
    handleClear();
    setPhaseBoth('idle');
  };

  const startGame = () => {
    resetGame();
    setCurrentPrompt(randomPrompt());
    setPhaseBoth('playing');
    startTimer();
  };

  const promptText =
    phase === 'playing' && currentPrompt
      ? currentPrompt
      : phase === 'over'
        ? `Time's up! Final score: ${finalScore ?? playerScore}. Press Start Game to play again.`
        : 'Welcome to Art Something! Draw each prompt (no words or numbers!). Press Start Game to begin.';

  const canSubmit = phase === 'playing' && !scoring && !isCanvasEmpty;

  return (
    <section className="flex flex-col items-center justify-center min-h-[calc(100vh-62px)] bg-bone px-6 py-3">
      <div className="w-full max-w-[1400px] flex flex-col md:flex-row items-center md:items-center gap-4">
        <div className="flex md:flex-1 md:justify-end justify-center">
          <TimeAndScore playerScore={playerScore} timeLeft={timeLeft} />
        </div>
        <div className="flex flex-col items-center gap-3">
          <PromptDisplay ref={promptRef} prompt={promptText} />
          <div className="mb-[50]">
            <canvas
              ref={canvasRef}
              className="absolute border-2 bg-white border-mahogany w-[min(70vh,70vw)] h-[min(70vh,70vw)] max-w-[800px] max-h-[800px] z-[5]"
            />
            <div className="bg-mahogany relative top-[25] left-[25] w-[min(70vh,70vw)] h-[min(70vh,70vw)] max-w-[800px] max-h-[800px]" />
          </div>
        </div>
        <div className="flex md:flex-1 md:justify-start justify-center">
          <div className="flex flex-col gap-3">
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
              className="bg-mahogany hover:bg-charlie hover:border-mahogany border-1 p-2 rounded cursor-pointer w-fit"
              onClick={handleSaveImage}
            >
              <Image src="/save.svg" alt="Save" width={24} height={24} />
            </button>
            <button
              className="bg-mahogany hover:bg-charlie hover:border-mahogany border-1 p-2 rounded cursor-pointer w-fit"
              onClick={handleSubmit}
              disabled={!canSubmit}
              aria-busy={scoring}
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
      </div>
    </section>
  );
}
