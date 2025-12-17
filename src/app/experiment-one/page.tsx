'use client';

import Link from 'next/link';
import Canvas from './Canvas';

export default function ExperimentOne() {
  return (
    <div className="flex flex-col gap-3 bg-black">
      <Canvas />
    </div>
  );
}
