'use client';

import Image from 'next/image';
import Link from 'next/link';

export default function Home() {
  return (
    <>
      <div className="home-stars relative flex min-h-[calc(100vh-62px)] flex-col items-center overflow-hidden bg-black pt-4 text-white">
        <div aria-hidden="true" className="home-stars-layer home-stars-layer-1" />
        <div aria-hidden="true" className="home-stars-layer home-stars-layer-2" />
        <div aria-hidden="true" className="home-stars-layer home-stars-layer-3" />

        <div className="relative z-10 flex flex-col items-center">
          <h1 className="mb-4 text-5xl">big a website</h1>
          <div className="flex flex-row flex-wrap justify-center gap-4">
            <Link
              href="/art-something"
              className="hidden group relative overflow-hidden rounded border border-white/20 shadow-[0_0_14px_rgba(255,255,255,0.2)]"
            >
              <Image
                alt="Art Something preview"
                className="h-[140px] w-[260px] object-cover transition-transform duration-300 group-hover:scale-102"
                height={600}
                src="/art-something-og.png"
                width={1200}
              />
            </Link>

            <Link
              href="/limitless-check"
              className="group relative overflow-hidden rounded border border-white/20 shadow-[0_0_14px_rgba(255,255,255,0.2)]"
            >
              <Image
                alt="Limitless Check preview"
                className="h-[140px] w-[260px] object-cover transition-transform duration-300 group-hover:scale-102"
                height={600}
                src="/limitless-check-og.png"
                width={1200}
              />
            </Link>

            <Link
              href="/guess-that-flavor-text"
              className="group relative overflow-hidden rounded border border-white/20 shadow-[0_0_14px_rgba(255,255,255,0.2)]"
            >
              <Image
                alt="Guess That Flavor Text preview"
                className="h-[140px] w-[260px] object-cover transition-transform duration-300 group-hover:scale-102"
                height={600}
                src="/guess-that-flavor-text-og.png"
                width={1200}
              />
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
