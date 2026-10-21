'use client';

import React, { useState, useImperativeHandle, forwardRef } from 'react';

type Props = { prompt: string };

// The prompt slides down, then back up (the transition below runs each way)
const SLIDE_MS = 2000;

export type PromptDisplayHandle = {
  // Resolves once the prompt is back in place
  triggerSubmitAnimation: () => Promise<void>;
};

const PromptDisplay = forwardRef<PromptDisplayHandle, Props>(({ prompt }, ref) => {
  const [animating, setAnimating] = useState(false);

  const triggerSubmitAnimation = () => {
    setAnimating(true);
    setTimeout(() => setAnimating(false), SLIDE_MS);
    return new Promise<void>((resolve) => setTimeout(resolve, SLIDE_MS * 2));
  };

  useImperativeHandle(ref, () => ({ triggerSubmitAnimation }));

  return (
    <div
      className={
        `bg-vanilla w-(--art-canvas-size) p-4 rounded-2xl transition-transform ease-in-out duration-2000 transform ` +
        (animating ? 'translate-y-[120px]' : 'translate-y-0')
      }
    >
      <div className="text-mahogany text-center text-lg font-semibold">{prompt}</div>
    </div>
  );
});

PromptDisplay.displayName = 'PromptDisplay';

export default PromptDisplay;
