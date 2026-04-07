import type { Metadata } from 'next';
import LimitlessCheck from './limitlessCheck';

export const metadata: Metadata = {
  title: 'Limitless Check',
  icons: {
    icon: '/limitless-check.svg',
  },
};

// Route entry for Limitless Check.
export default function Page() {
  return <LimitlessCheck />;
}
