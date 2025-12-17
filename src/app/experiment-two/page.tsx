'use client';

import Link from 'next/link';

export default function ExperimentTwo() {
  return (
    <div className="flex h-screen flex-col items-center justify-center bg-black text-white gap-6">
      <h1 className="text-4xl">Experiment Two</h1>

      <Link href="/" className="rounded bg-white px-6 py-3 text-black hover:bg-gray-200">
        ← Back Home
      </Link>
    </div>
  );
}
