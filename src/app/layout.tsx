import type { Metadata } from 'next';
import { Lato } from 'next/font/google';
import './globals.css';
import Header from '../components/Header';

const lato = Lato({
  variable: '--font-lato',
  subsets: ['latin'],
  weight: ['300', '400', '700'],
});

export const metadata: Metadata = {
  title: 'Big A Website',
  description: "Alex Hutton's Big A Website experiments",
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
      </body>
    </html>
  );
}
