import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Art Something',
  icons: {
    icon: '/art-something-tan.svg',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
