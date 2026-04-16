import type { ReactNode } from 'react';

export default function GuessThatFlavorTextLayout({ children }: { children: ReactNode }) {
  return (
    <div className="dot-gradient-bg flex justify-center  overflow-y-auto h-[calc(100vh-62px)]">
      {children}
    </div>
  );
}
