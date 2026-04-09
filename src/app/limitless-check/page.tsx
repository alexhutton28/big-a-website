import type { Metadata } from 'next';
import LimitlessCheck from './limitlessCheck';

export const metadata: Metadata = {
  title: 'Limitless Check',
  description: 'Limitless Check on Big A Website',
  openGraph: {
    title: 'Limitless Check',
    description: 'Limitless Check on Big A Website',
    images: [
      {
        url: '/limitless-check-og.png',
        alt: 'Limitless Check',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Limitless Check',
    description: 'Limitless Check on Big A Website',
    images: ['/limitless-check-og.png'],
  },
};

// Route entry for Limitless Check.
export default function Page() {
  return <LimitlessCheck />;
}
