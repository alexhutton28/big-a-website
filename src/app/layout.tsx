import type { Metadata, Viewport } from 'next';
import { Barlow, Google_Sans_Flex, Lato } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import './globals.css';
import Header from '../components/Header';

const lato = Lato({
  variable: '--font-lato',
  subsets: ['latin'],
  weight: ['300', '400', '700'],
});

const barlow = Barlow({
  variable: '--font-barlow',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  style: ['normal', 'italic'],
});

// Home page hero title. Not preloaded, so only the home page (the only place it's
// used) downloads it.
const googleSansFlex = Google_Sans_Flex({
  variable: '--font-google-sans-flex',
  subsets: ['latin'],
  weight: 'variable',
  axes: ['ROND', 'opsz', 'wdth'],
  preload: false,
});

export const metadata: Metadata = {
  title: 'Big A Website',
  description: 'Big A Website',
  openGraph: {
    title: 'Big A Website',
    description: 'Big A Website',
    type: 'website',
    images: [
      {
        url: '/big-a-website-og.png',
        alt: 'Big A Website',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Big A Website',
    description: 'Big A Website',
    images: ['/big-a-website-og.png'],
  },
};

// Lets the page draw under the iOS status bar so the header's safe-area padding takes effect
export const viewport: Viewport = {
  viewportFit: 'cover',
  // Browser bar color on older iOS Safari and Android Chrome; matches the home header.
  // Each game's route sets its own to match its header.
  themeColor: '#060c18', // night
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${lato.variable} ${barlow.variable} ${googleSansFlex.variable} antialiased bg-white text-black`}
      >
        <Header />
        <main>{children}</main>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
