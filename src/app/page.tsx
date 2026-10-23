'use client';

import Image from 'next/image';
import Link from 'next/link';
import NightSky from '../components/NightSky';
import SocialLinks from '../components/SocialLinks';

// TODO(launch): Art Something is still unreleased, so its card is only shown when
// running locally (`npm run dev`). Make it visible for everyone once it's ready.
const SHOW_ART_SOMETHING = process.env.NODE_ENV === 'development';

export default function Home() {
  return (
    <>
      <div className="home-sky relative flex min-h-dvh flex-col items-center overflow-hidden pt-[calc(env(safe-area-inset-top)_+_clamp(64px,12vh,128px))] text-white">
        {/* Back to front: starfield, atmosphere glow on the horizon, then the planet */}
        <NightSky />
        <div aria-hidden="true" className="home-atmosphere" />
        <div aria-hidden="true" className="home-planet" data-night-sky-horizon />

        <div className="relative z-10 flex flex-col items-center">
          <h1 className="home-title text-5xl">big a&apos;s website</h1>
          <p className="home-subtitle mt-2 mb-5">Games &amp; Portfolio by Alex Hutton</p>
          <div className="flex flex-row flex-wrap justify-center gap-4">
            <Link
              href="/art-something"
              className={`${SHOW_ART_SOMETHING ? '' : 'hidden'} home-card group relative overflow-hidden rounded`}
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
