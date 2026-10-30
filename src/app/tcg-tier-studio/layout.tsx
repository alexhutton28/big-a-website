import type { ReactNode } from 'react';

// Own scroll container (html and body don't scroll)
export default function TierStudioLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex justify-center items-start overflow-y-auto h-[calc(100dvh_-_62px_-_env(safe-area-inset-top))] pb-[env(safe-area-inset-bottom)]">
      {children}
    </div>
  );
}
