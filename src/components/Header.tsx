'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Header() {
  const pathname = usePathname();
  const isLimitlessCheckPage = pathname.startsWith('/limitless-check');

  let headerClassName = 'w-full bg-black text-white';

  if (isLimitlessCheckPage) {
    headerClassName = 'w-full bg-houndoom text-togepi';
  } else if (pathname === '/art-something') {
    headerClassName = 'w-full bg-mahogany text-white';
  }

  return (
    <header className={headerClassName}>
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
              <h2 className="font-medium">Big A&apos;s Website</h2>
            </span>
          ) : (
            "big a's website"
          )}
        </Link>
        {/* ...add right-side nav/actions later... */}
      </div>
    </header>
  );
}
