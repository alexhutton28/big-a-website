'use client';

import React, { useState, useImperativeHandle, forwardRef } from 'react';

type Props = { prompt: string };

export type PromptDisplayHandle = {
  triggerSubmitAnimation: () => void;
};

const PromptDisplay = forwardRef<PromptDisplayHandle, Props>(({ prompt }, ref) => {
  const [animating, setAnimating] = useState(false);

  const triggerSubmitAnimation = () => {
    setAnimating(true);
    setTimeout(() => setAnimating(false), 2000);
  };

  useImperativeHandle(ref, () => ({ triggerSubmitAnimation }));

  return (
    <div
      className={
        `bg-vanilla w-[min(70vh,70vw)] max-w-[800px] p-4 rounded-md transition-transform ease-in-out duration-2000 transform ` +
        (animating ? 'translate-y-[120px]' : 'translate-y-0')
      }
    >
      <div className="text-mahogany text-center text-lg font-semibold">{prompt}</div>
    </div>
  );
});

PromptDisplay.displayName = 'PromptDisplay';

export default PromptDisplay;
