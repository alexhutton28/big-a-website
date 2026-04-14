import type { Metadata } from 'next';
import GuessThatFlavorText from './GuessThatFlavorText';

export const metadata: Metadata = {
  title: 'Guess That Flavor Text',
  description: 'Guess That Flavor Text on Big A Website',
  openGraph: {
    title: 'Guess That Flavor Text',
    description: 'Guess That Flavor Text on Big A Website',
    images: [
      {
        url: '/guess-that-flavor-text-og.png',
        alt: 'Guess That Flavor Text',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Guess That Flavor Text',
    description: 'Guess That Flavor Text on Big A Website',
    images: ['/guess-that-flavor-text-og.png'],
  },
};

// Route entry for Guess That Flavor Text.
export default function Page() {
  return <GuessThatFlavorText />;
}
