import type { Viewport } from 'next';
import type { ReactNode } from 'react';

// Browser bar color matches the header (splash)
export const viewport: Viewport = {
  themeColor: '#7aa6ff',
};

export default function GuessThatFlavorTextLayout({ children }: { children: ReactNode }) {
  return (
    <div className="dot-gradient-bg barlow font-medium flex justify-center items-start overflow-y-auto h-[calc(100dvh_-_62px_-_env(safe-area-inset-top))] pb-[env(safe-area-inset-bottom)]">
      {children}
    </div>
  );
}
