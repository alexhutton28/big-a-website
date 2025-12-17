'use client';

import Link from 'next/link';

export default function Header() {
  return (
    <header className="w-full bg-black text-white">
      <div className="flex items-center justify-between p-3">
        <Link href="/" className="text-lg hover:text-gray-300 transition-colors">
          big a&apos;s website
        </Link>
        {/* ...add right-side nav/actions later... */}
      </div>
    </header>
  );
}
