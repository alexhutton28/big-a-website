'use client';

import Image from 'next/image';
import Link from 'next/link';
import NightSky from '../components/NightSky';
import SocialLinks from '../components/SocialLinks';

export default function Home() {
  return (
    <>
      <div className="home-sky relative flex min-h-[calc(100dvh-62px)] flex-col items-center overflow-hidden pt-4 text-white">
        {/* Back to front: starfield, atmosphere glow on the horizon, then the planet */}
        <NightSky />
        <div aria-hidden="true" className="home-atmosphere" />
        <div aria-hidden="true" className="home-planet" data-night-sky-horizon />

        <div className="relative z-10 flex flex-col items-center">
          <h1 className="mb-5 text-5xl">big a&apos;s website</h1>
          <div className="flex flex-row flex-wrap justify-center gap-4">
            <Link
              href="/art-something"
              className="hidden home-card group relative overflow-hidden rounded"
            >
              <Image
                alt="Art Something preview"
                className="h-[140px] w-[260px] object-cover"
                height={600}
                src="/art-something-og.png"
                width={1200}
              />
            </Link>

            <Link
              href="/limitless-check"
              className="home-card group relative overflow-hidden rounded"
            >
              <Image
                alt="Limitless Check preview"
                className="h-[140px] w-[260px] object-cover"
                height={600}
                loading="eager"
                src="/limitless-check-og.png"
                width={1200}
              />
            </Link>

            <Link
              href="/guess-that-flavor-text"
              className="home-card group relative overflow-hidden rounded"
            >
              <Image
                alt="Guess That Flavor Text preview"
                className="h-[140px] w-[260px] object-cover"
                height={600}
                src="/guess-that-flavor-text-og.png"
                width={1200}
              />
            </Link>
          </div>
        </div>

        <SocialLinks />
      </div>
    </>
  );
}
