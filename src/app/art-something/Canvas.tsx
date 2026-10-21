'use client';

import { useEffect, useRef, useState } from 'react';
import PromptDisplay, { type PromptDisplayHandle } from './PromptDisplay';
import Image from 'next/image';
import TimeAndScore from './TimeAndScore';
import { randomPrompt, type Prompt } from './prompts';

const ROUND_SECONDS = 60;
// Each prompt also has its own short clock, shown as the bar under the prompt
const PROMPT_MS = 5000;
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

  // The prompt clock ticks every 50ms, so it's kept out of React state: the bar's
  // width is set directly
  const promptMsRef = useRef(PROMPT_MS);
  const promptBarRef = useRef<HTMLDivElement>(null);
  const onPromptTimeUpRef = useRef<() => void>(() => {});
  // The bar fades out when a drawing is submitted and back in once the next prompt
  // has finished sliding in; the prompt clock only runs while it's shown
  const [promptBarShown, setPromptBarShown] = useState(true);
  const promptBarShownRef = useRef(true);
  const promptChangeRef = useRef(0); // counts prompt changes, see showPromptBarAfter
  const setPromptBarShownBoth = (next: boolean) => {
    promptBarShownRef.current = next;
    setPromptBarShown(next);
  };

  const drawPromptBar = () => {
    if (promptBarRef.current) {
      promptBarRef.current.style.width = `${(Math.max(0, promptMsRef.current) / PROMPT_MS) * 100}%`;
    }
  };
  const resetPromptTimer = () => {
    promptMsRef.current = PROMPT_MS;
    drawPromptBar();
  };

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
    promptMsRef.current = 0;
    drawPromptBar();
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

    // Watch the canvas itself, not the window: its size can settle after mount (e.g.
    // once styles load), which a window resize listener never hears about
    resizeCanvas();
    const resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(canvas);

    // Drawing is open before the game too: the first submitted drawing starts it
    const canDraw = () => phaseRef.current !== 'over' && !scoringRef.current;

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
      resizeObserver.disconnect();
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

  // The prompt clock: runs down during a round, paused (like the round clock) while
  // a drawing is scored. Measured from timestamps on a short interval rather than
  // animation frames, which stop in a background tab while the round clock goes on.
  useEffect(() => {
    if (phase !== 'playing') return;
    let last = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now();
      const elapsed = now - last;
      last = now;
      if (!scoringRef.current && promptBarShownRef.current && promptMsRef.current > 0) {
        promptMsRef.current -= elapsed;
        drawPromptBar();
        if (promptMsRef.current <= 0) onPromptTimeUpRef.current();
      }
    }, 50);
    return () => clearInterval(id);
  }, [phase]);

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
    resetPromptTimer();
    setPromptBarShownBoth(true);
    setPhaseBoth('idle');
  };

  const startGame = () => {
    resetGame();
    setCurrentPrompt(randomPrompt());
    setPhaseBoth('playing');
    startTimer();
  };

  // Brings the bar back once the prompt is in place, unless the player has already
  // submitted again (a newer change owns the bar then)
  const showPromptBarAfter = async (slidIn: Promise<void> | undefined) => {
    const change = ++promptChangeRef.current;
    await slidIn;
    if (change === promptChangeRef.current && phaseRef.current === 'playing') {
      setPromptBarShownBoth(true);
    }
  };

  // Slide the prompt away, then bring in a fresh canvas, the next prompt and a full
  // prompt clock. Called while scoringRef is set, so both clocks stay paused. The
  // prompt bar (and its clock) comes back once the prompt has finished sliding in.
  const nextPrompt = async () => {
    setPromptBarShownBoth(false);
    const slide = promptRef.current?.triggerSubmitAnimation();
    // Swap in the next prompt only once the old one is out of sight
    await slide?.hidden;
    handleClear();
    setCurrentPrompt((previous) => randomPrompt(previous ?? undefined));
    resetPromptTimer();
    setScoringBoth(false);
    await showPromptBarAfter(slide?.done);
  };

  const handleSubmit = async () => {
    const canvas = canvasRef.current;
    if (!canvas || phaseRef.current === 'over' || scoringRef.current || isEmptyRef.current) return;

    setScoringBoth(true); // pauses the clock and blocks drawing
    drawingRef.current = false;
    setPromptBarShownBoth(false);

    // The first drawing isn't scored (0 points), it just starts the game
    if (phaseRef.current === 'idle') {
      const slide = promptRef.current?.triggerSubmitAnimation();
      await slide?.hidden;
      startGame();
      setPromptBarShownBoth(false); // startGame resets it to shown
      await showPromptBarAfter(slide?.done);
      return;
    }
    if (!currentPrompt) {
      setScoringBoth(false);
      setPromptBarShownBoth(true);
      return;
    }

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
      if (promptMsRef.current <= 0) {
        // Out of time for this prompt anyway: no points, move on
        await nextPrompt();
        return;
      }
      // Scoring failed: keep the drawing so the player can try submitting again
      setScoringBoth(false);
      setPromptBarShownBoth(true);
      return;
    }

    addScore(points);
    await nextPrompt();
  };

  // A prompt's time ran out: whatever is drawn gets scored; a blank canvas scores
  // nothing and the game moves on to the next prompt. Refreshed after every render
  // so the prompt clock always calls the latest handleSubmit (which reads this
  // render's prompt).
  useEffect(() => {
    onPromptTimeUpRef.current = () => {
      if (phaseRef.current !== 'playing' || scoringRef.current) return;
      if (!isEmptyRef.current) {
        void handleSubmit();
        return;
      }
      setScoringBoth(true);
      drawingRef.current = false;
      void nextPrompt();
    };
  });

  const handleSaveImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `${currentPrompt ?? 'art-something'}.png`;
    link.href = drawingOnWhite(canvas).toDataURL('image/png');
    link.click();
  };

  const promptText =
    phase === 'playing' && currentPrompt
      ? currentPrompt
      : phase === 'over'
        ? `Time's up! Final score: ${finalScore ?? playerScore}. Press Start Game to play again.`
        : 'Draw something to get started.';

  const canSubmit = phase !== 'over' && !scoring && !isCanvasEmpty;

  return (
    // The page scrolls itself: html and body don't scroll (see globals.css)
    <section className="art-page h-[calc(100dvh_-_62px_-_env(safe-area-inset-top))] overflow-y-auto bg-bone px-3 pt-3 pb-[calc(32px_+_env(safe-area-inset-bottom))]">
      <div className="art-layout">
        <div className="art-prompt">
          <PromptDisplay ref={promptRef} prompt={promptText} />
          {/* Time left for this prompt. Not on the intro screen, which has no prompt
              to time (and keeps no space for it). */}
          {phase !== 'idle' && (
            <div
              aria-hidden="true"
              className={`mt-2 h-[8px] overflow-hidden rounded bg-vanilla transition-opacity duration-500 ${promptBarShown ? 'opacity-100' : 'opacity-0'}`}
            >
              {/* The short linear transition smooths the clock's 50ms steps */}
              <div
                ref={promptBarRef}
                className="h-full w-full rounded bg-mahogany transition-[width] duration-100 ease-linear"
              />
            </div>
          )}
        </div>
        <div className="art-canvas relative size-(--art-canvas-size) border-2 border-mahogany bg-white shadow-[25px_25px_0_var(--color-mahogany)]">
          {/* Before the game: a dashed circle to get the first drawing going. It sits
              under the (transparent) canvas, so it's never part of the drawing, and
              fades out once the player starts drawing. */}
          {phase === 'idle' && (
            <svg
              aria-hidden="true"
              className={`pointer-events-none absolute inset-0 size-full transition-opacity duration-750 ${isCanvasEmpty ? 'opacity-100' : 'opacity-0'}`}
              viewBox="0 0 100 100"
            >
              {/* Open at the upper right, like an unfinished sketch: clockwise from
                  -20deg round to -63deg. pathLength matches the dash pattern's total,
                  so the arc starts and ends on a dash. */}
              <path
                d="M74.9 40.94 A26.5 26.5 0 1 1 62.03 26.39"
                pathLength="85.5"
                fill="none"
                stroke="var(--color-vanilla)"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeDasharray="3 4.5 2.5 5 3.5 4.5 2 5 3 4 2.5 5 3 4.5 2.5 5 3.5 4.5 2.5 5 3 4.5 3 99"
              />
            </svg>
          )}
          <canvas ref={canvasRef} className="absolute inset-0 block size-full" />
        </div>
        <div className="art-stats">
          <TimeAndScore playerScore={playerScore} timeLeft={timeLeft} />
        </div>
        <div className="art-actions flex flex-row md:flex-col gap-3">
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
        </div>
        {/* Temporary controls until the game has its own start/end screens */}
        <div className="art-debug flex flex-row flex-wrap justify-center gap-3">
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
            onClick={resetGame}
            className="rounded bg-white px-4 py-2 text-black hover:bg-gray-200"
          >
            Reset Game
          </button>
        </div>
      </div>
    </section>
  );
}
