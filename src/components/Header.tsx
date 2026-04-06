'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Header() {
  const pathname = usePathname();

  const headerClassName =
    pathname === '/limitless-check'
      ? 'w-full bg-houndoom text-togepi'
      : pathname === '/art-something'
        ? 'w-full bg-mahogany text-white'
        : 'w-full bg-black text-white';

  return (
    <header className={headerClassName}>
      <div className="flex items-center justify-between p-3">
        <Link href="/" className="text-lg hover:text-gray-300 transition-colors">
          big a&apos;s website
        </Link>
        {/* ...add right-side nav/actions later... */}
      </div>
    </header>
  );
}
