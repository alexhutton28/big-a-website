'use client';

import React, { useState, useImperativeHandle, forwardRef } from 'react';

type Props = { prompt: string };

// The prompt slides down, then back up (the transition below runs each way)
const SLIDE_MS = 2000;

export type PromptDisplayHandle = {
  // `hidden` resolves once the prompt is fully down behind the canvas (the moment to
  // swap in the next one), `done` once it's back in place
  triggerSubmitAnimation: () => { hidden: Promise<void>; done: Promise<void> };
};

const PromptDisplay = forwardRef<PromptDisplayHandle, Props>(({ prompt }, ref) => {
  const [animating, setAnimating] = useState(false);

  const triggerSubmitAnimation = () => {
    setAnimating(true);
    setTimeout(() => setAnimating(false), SLIDE_MS);
    return {
      hidden: new Promise<void>((resolve) => setTimeout(resolve, SLIDE_MS)),
      done: new Promise<void>((resolve) => setTimeout(resolve, SLIDE_MS * 2)),
    };
  };

  useImperativeHandle(ref, () => ({ triggerSubmitAnimation }));

  return (
    <div
      className={
        `bg-vanilla w-(--art-canvas-size) p-4 rounded-2xl transition-transform ease-in-out duration-2000 transform ` +
        // Far enough to be fully hidden behind the canvas, even when the text wraps:
        // its own height plus the timer bar and gaps below it
        (animating ? 'translate-y-[max(120px,calc(100%_+_40px))]' : 'translate-y-0')
      }
    >
      <div className="text-mahogany text-center text-lg font-semibold">{prompt}</div>
    </div>
  );
});

PromptDisplay.displayName = 'PromptDisplay';

export default PromptDisplay;
