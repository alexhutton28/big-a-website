'use client';

import Link from 'next/link';

export default function Home() {
  return (
    <>
      <div className="flex flex-col h-screen items-center text-white bg-black pt-4">
        <h1 className="mb-4 text-5xl">big a website</h1>
        <div className="flex flex-row flex-wrap justify-center gap-3">
          <Link
            href="/experiment-one"
            className="rounded bg-white px-8 py-4 text-black text-xl hover:bg-gray-200"
          >
            Experiment One
          </Link>

          <Link
            href="/experiment-two"
            className="rounded bg-white px-8 py-4 text-black text-xl hover:bg-gray-200"
          >
            Experiment Two
          </Link>

          <Link
            href="/experiment-three"
            className="rounded bg-white px-8 py-4 text-black text-xl hover:bg-gray-200"
          >
            Experiment Three
          </Link>
        </div>
      </div>
    </>
  );
}
