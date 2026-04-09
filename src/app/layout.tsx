import type { Metadata } from 'next';
import { Lato } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import './globals.css';
import Header from '../components/Header';

const lato = Lato({
  variable: '--font-lato',
  subsets: ['latin'],
  weight: ['300', '400', '700'],
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${lato.variable} antialiased bg-white text-black`}>
        <Header />
        <main>{children}</main>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
