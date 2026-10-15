'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Header() {
  const pathname = usePathname();
  // The home page has its own title and is where the header links to, so it goes
  // without; the sky runs to the top of the screen instead
  if (pathname === '/') return null;

  const isLimitlessCheckPage = pathname.startsWith('/limitless-check');
  const isArtSomethingPage = pathname === '/art-something';
  const isGuessThatFlavorTextPage = pathname.startsWith('/guess-that-flavor-text');

  let headerClassName = 'w-full bg-black text-white';

  if (isLimitlessCheckPage) {
    headerClassName = 'w-full bg-houndoom text-togepi';
  } else if (isArtSomethingPage) {
    headerClassName = 'w-full bg-mahogany text-white';
  } else if (isGuessThatFlavorTextPage) {
    headerClassName = 'w-full bg-splash text-white';
  }

  return (
    // Sticky so iOS 26 Safari tints the status-bar strip with the header color
    // (it samples fixed/sticky elements at the top; it no longer reads theme-color)
    <header
      className={`${headerClassName} sticky top-0 z-40`}
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="flex items-center justify-between p-3">
        <Link href="/" className="text-lg hover:text-gray-300 transition-colors">
          {isLimitlessCheckPage ? (
            <span className="flex items-center gap-2">
              <Image
                src="/limitless-check-alt.svg"
                alt="Limitless Check logo"
                width={30}
                height={30}
                className="h-[30px] w-[30px]"
                priority
              />
              <h2 className="font-medium">Big A Website</h2>
            </span>
          ) : isArtSomethingPage ? (
            <span className="flex items-center gap-2">
              <Image
                src="/art-something-tan.svg"
                alt="Art Something logo"
                width={30}
                height={30}
                className="h-[30px] w-[30px]"
                priority
              />
              <Image
                src="/big-a-website-written-white.svg"
                alt="Big A's Website"
                width={120}
                height={30}
                className="h-auto"
                priority
              />
            </span>
          ) : isGuessThatFlavorTextPage ? (
            <Image
              src="/big-a-website-gtft.svg"
              alt="Big A's Website Guess That Flavor Text"
              width={170}
              height={30}
              className="h-[30px] w-auto"
              priority
            />
          ) : (
            "big a's website"
          )}
        </Link>
        {/* ...add right-side nav/actions later... */}
      </div>
    </header>
  );
}
