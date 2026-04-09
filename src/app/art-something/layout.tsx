import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Art Something',
  description: 'Art Something on Big A Website',
  openGraph: {
    title: 'Art Something',
    description: 'Art Something on Big A Website',
    images: [
      {
        url: '/art-something-og.png',
        alt: 'Art Something',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Art Something',
    description: 'Art Something on Big A Website',
    images: ['/art-something-og.png'],
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
