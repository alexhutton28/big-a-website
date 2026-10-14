import type { ReactNode } from 'react';

export default function GuessThatFlavorTextLayout({ children }: { children: ReactNode }) {
  return (
    <div className="dot-gradient-bg barlow font-medium flex justify-center items-start overflow-y-auto h-[calc(100dvh_-_62px_-_env(safe-area-inset-top))] pb-[env(safe-area-inset-bottom)]">
      {children}
    </div>
  );
}
