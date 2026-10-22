'use client';

import { useEffect, useRef, useState } from 'react';
import PromptDisplay, { type PromptDisplayHandle } from './PromptDisplay';
import TimeAndScore from './TimeAndScore';
import { randomPrompt, type Prompt } from './prompts';
import { crumbleInto } from './crumble';

const ROUND_SECONDS = 30;
// Each prompt also has its own short clock, shown as the bar under the prompt. Both
// clocks run and pause together, so a round is exactly 5 full-length prompts.
const PROMPT_MS = 6000;
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
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const drawingRef = useRef(false);
  const promptRef = useRef<PromptDisplayHandle | null>(null);
  const [playerScore, setPlayerScore] = useState(0);
  const [isCanvasEmpty, setIsCanvasEmpty] = useState(true);
  const isEmptyRef = useRef(true);

  // Game state. Refs mirror the values the canvas event handlers and timer read.
  const [phase, setPhase] = useState<Phase>('idle');
  const phaseRef = useRef<Phase>('idle');
  const [currentPrompt, setCurrentPrompt] = useState<Prompt | null>(null);
  // Prompts already drawn this round, so none comes up twice
  const usedPromptsRef = useRef<Prompt[]>([]);
  const pickPrompt = () => {
    const next = randomPrompt(usedPromptsRef.current);
    usedPromptsRef.current.push(next);
    return next;
  };
  // While a drawing is being scored (and the next prompt slides in) the clock is
  // paused and drawing/submitting is blocked, so waiting on the AI never costs time
  const [scoring, setScoring] = useState(false);
  const scoringRef = useRef(false);

  // Round clock: the ms left are a ref (the clocks tick every 50ms); the whole
  // seconds shown in the time box are state
  const [timeLeft, setTimeLeft] = useState<number>(ROUND_SECONDS);
  const roundMsRef = useRef(ROUND_SECONDS * 1000);
  const [finalScore, setFinalScore] = useState<number | null>(null);
  const scoreRef = useRef(0);

  // The prompt clock is kept out of React state too: the bar's width is set directly
  const promptMsRef = useRef(PROMPT_MS);
  const promptBarRef = useRef<HTMLDivElement>(null);
  const onTimeUpRef = useRef<() => void>(() => {});
  // The bar fades out when a drawing is submitted and back in once the next prompt
  // has finished sliding in; both clocks only run while it's shown
  const [promptBarShown, setPromptBarShown] = useState(true);
  const promptBarShownRef = useRef(true);
  const promptChangeRef = useRef(0); // counts prompt changes, see showPromptBarAfter
  // Between games, the player's first stroke starts a count-in on the timer bar; the
  // drawing then starts the game when it runs out
  const [countingIn, setCountingIn] = useState(false);
  // The dashed circle waits for the game-over message to finish sliding in
  const [circleReady, setCircleReady] = useState(true);
  const countingInRef = useRef(false);
  const onFirstMarkRef = useRef<() => void>(() => {});
  const setCountingInBoth = (next: boolean) => {
    countingInRef.current = next;
    setCountingIn(next);
  };
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

  // Under 1ms counts as over: the round is the sum of many small clock steps, which
  // can leave a rounding sliver after the last prompt
  const isRoundOver = () => roundMsRef.current < 1;
  const resetRoundTimer = () => {
    roundMsRef.current = ROUND_SECONDS * 1000;
    setTimeLeft(ROUND_SECONDS);
  };

  // Ends the round like a prompt change: the bar fades out and the last prompt slides
  // away, and the final score comes in in its place. Called while scoringRef is set.
  const endGame = async () => {
    drawingRef.current = false;
    setFinalScore(scoreRef.current);
    roundMsRef.current = 0;
    setTimeLeft(0);
    promptMsRef.current = 0;
    drawPromptBar();
    setPromptBarShownBoth(false);
    setCircleReady(false);
    const slide = promptRef.current?.triggerSubmitAnimation();
    await slide?.hidden;
    setPhaseBoth('over');
    setScoringBoth(false);
    // The circle fades back in once the final score has finished sliding in
    await slide?.done;
    setCircleReady(true);
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

    // Drawing is open between games too: drawing starts the next one
    const canDraw = () => !scoringRef.current;

    const markDrawn = () => {
      if (isEmptyRef.current) {
        isEmptyRef.current = false;
        setIsCanvasEmpty(false);
        onFirstMarkRef.current();
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

  // Both clocks run down together during a round, paused while a drawing is scored
  // and while the prompt changes (the bar is hidden), so neither costs time. During
  // the count-in only the prompt clock runs. Measured from timestamps on a short
  // interval rather than animation frames, which stop in a background tab.
  useEffect(() => {
    if (phase !== 'playing' && !countingIn) return;
    let last = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now();
      // Capped at the prompt's time left: a late tick (background tabs tick about
      // once a second) mustn't take more from the round than the prompt had
      const elapsed = Math.min(now - last, Math.max(0, promptMsRef.current));
      last = now;
      if (scoringRef.current || !promptBarShownRef.current || promptMsRef.current <= 0) return;
      promptMsRef.current -= elapsed;
      drawPromptBar();
      if (phaseRef.current === 'playing') {
        roundMsRef.current -= elapsed;
        setTimeLeft(Math.max(0, Math.ceil(roundMsRef.current / 1000)));
      }
      if (promptMsRef.current <= 0 || (phaseRef.current === 'playing' && isRoundOver())) {
        onTimeUpRef.current();
      }
    }, 50);
    return () => clearInterval(id);
  }, [phase, countingIn]);

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

  // Clears the board with the crumble animation (straight away with reduced motion).
  // Resolves once the drawing has gone into the score box.
  const crumbleDrawing = () => {
    const canvas = canvasRef.current!;
    const overlay = overlayRef.current;
    const scoreBox = statsRef.current?.querySelector('.art-score-box');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const done =
      overlay && scoreBox && !reduced
        ? crumbleInto(canvas, overlay, scoreBox.getBoundingClientRect(), STROKE_COLOR)
        : Promise.resolve();
    handleClear();
    return done;
  };

  // Back to the start screen
  const resetGame = () => {
    scoreRef.current = 0;
    setPlayerScore(0);
    resetRoundTimer();
    setFinalScore(null);
    setScoringBoth(false);
    setCurrentPrompt(null);
    handleClear();
    resetPromptTimer();
    setPromptBarShownBoth(false);
    setCountingInBoth(false);
    setPhaseBoth('idle');
  };

  const startGame = () => {
    resetGame();
    usedPromptsRef.current = [];
    setCurrentPrompt(pickPrompt());
    setPhaseBoth('playing');
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
    // That was the round's last drawing
    if (isRoundOver()) {
      await endGame();
      return;
    }
    setPromptBarShownBoth(false);
    const slide = promptRef.current?.triggerSubmitAnimation();
    // Swap in the next prompt only once the old one is out of sight
    await slide?.hidden;
    handleClear();
    setCurrentPrompt(pickPrompt());
    resetPromptTimer();
    setScoringBoth(false);
    await showPromptBarAfter(slide?.done);
  };

  const handleSubmit = async () => {
    const canvas = canvasRef.current;
    if (!canvas || scoringRef.current || isEmptyRef.current) return;

    setScoringBoth(true); // pauses the clock and blocks drawing
    drawingRef.current = false;
    setPromptBarShownBoth(false);

    // The count-in's drawing isn't scored (0 points): it starts the game
    if (phaseRef.current !== 'playing') {
      // It still crumbles into the score box, like a scored drawing
      const crumbled = crumbleDrawing();
      const slide = promptRef.current?.triggerSubmitAnimation();
      await Promise.all([crumbled, slide?.hidden]);
      startGame();
      await showPromptBarAfter(slide?.done);
      return;
    }
    if (!currentPrompt) {
      setScoringBoth(false);
      setPromptBarShownBoth(true);
      return;
    }

    // The drawing crumbles into the score box while the AI scores it; the score lands
    // once both are done
    const imageUrl = exportForScoring(canvas);
    const crumbled = crumbleDrawing();

    let points: number | null = null;
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: currentPrompt, imageUrl }),
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
    await crumbled;

    // If scoring failed, the drawing just gets no points
    if (points !== null) addScore(points);
    await nextPrompt();
  };

  // The prompt's (or the round's) time ran out: whatever is drawn gets scored; a
  // blank canvas scores nothing. Then the next prompt, or the end of the round
  // (nextPrompt decides). Refreshed after every render so the clock always calls the
  // latest handleSubmit (which reads this render's prompt).
  useEffect(() => {
    onTimeUpRef.current = () => {
      if (scoringRef.current) return;
      // The count-in ran out: its drawing starts the game
      if (countingInRef.current) {
        void handleSubmit();
        return;
      }
      if (phaseRef.current !== 'playing') return;
      if (!isEmptyRef.current) {
        void handleSubmit();
        return;
      }
      setScoringBoth(true);
      drawingRef.current = false;
      void nextPrompt();
    };
  });

  // Between games, the first mark on the board starts the count-in: the timer bar
  // fades in, and when it runs out that drawing starts the game. Refreshed after every
  // render, like onTimeUpRef.
  useEffect(() => {
    onFirstMarkRef.current = () => {
      if (phaseRef.current === 'playing' || countingInRef.current) return;
      resetPromptTimer();
      setCountingInBoth(true);
      // Mount the bar hidden first, so it fades in
      window.setTimeout(() => setPromptBarShownBoth(true), 30);
    };
  });

  const promptText =
    phase === 'playing' && currentPrompt
      ? currentPrompt
      : phase === 'over'
        ? `Time's up! Final score: ${finalScore ?? playerScore}. Draw something to play again.`
        : 'Draw something to get started.';

  const showTimerBar = phase === 'playing' || countingIn;

  return (
    // The page scrolls itself: html and body don't scroll (see globals.css)
    <section className="art-page h-[calc(100dvh_-_62px_-_env(safe-area-inset-top))] overflow-y-auto bg-bone px-3 pt-3 pb-[calc(32px_+_env(safe-area-inset-bottom))]">
      <div className="art-layout">
        {/* Between games there's no timer bar until the player starts drawing; its space
            (8px bar + 8px gap) goes above the prompt instead, so the canvas sits in the
            same spot all game. When the count-in starts, the bar takes over that space at
            once (so nothing else moves) and the prompt slides up into place. */}
        <div className={`art-prompt ${showTimerBar ? '' : 'pt-3'}`}>
          <div className={countingIn ? 'art-prompt-rise' : ''}>
            <PromptDisplay ref={promptRef} prompt={promptText} />
          </div>
          {/* Time left for this prompt (or the count-in) */}
          {showTimerBar && (
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
        <div className="art-canvas relative size-(--art-canvas-size) overflow-hidden rounded-tl-2xl border-2 border-mahogany bg-white shadow-[25px_25px_0_var(--color-mahogany)] max-md:shadow-[12px_12px_0_var(--color-mahogany)]">
          {/* Between games: a dashed circle to get the next drawing going. It sits
              under the (transparent) canvas, so it's never part of the drawing, and
              fades out once the player starts drawing. It stays hidden while that
              drawing is submitted, though the board is already clear by then. Always
              mounted, so it fades in and out rather than popping. */}
          <svg
            aria-hidden="true"
            className={`pointer-events-none absolute inset-0 size-full transition-opacity duration-750 ${phase !== 'playing' && circleReady && isCanvasEmpty && !scoring ? 'opacity-100' : 'opacity-0'}`}
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
          <canvas ref={canvasRef} className="absolute inset-0 block size-full" />
        </div>
        <div ref={statsRef} className="art-stats">
          <TimeAndScore playerScore={playerScore} timeLeft={timeLeft} />
        </div>
        {/* Full-screen layer for the crumble when a drawing is submitted */}
        <canvas
          ref={overlayRef}
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-30 size-full"
        />
      </div>
    </section>
  );
}
