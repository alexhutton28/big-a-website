import type { Metadata } from 'next';
import StudioLoader from './StudioLoader';

// Hidden tool: not linked from the home page and kept out of search results
export const metadata: Metadata = {
  title: 'TCG Tier Studio',
  robots: { index: false, follow: false },
};

export default function Page() {
  return <StudioLoader />;
}
