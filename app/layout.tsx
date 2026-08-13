import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'NovelCore AI — From Idea to Patent',
  description:
    'An AI Co-Inventor that transforms innovative ideas into stronger, patent-ready inventions. Discover prior art, analyze novelty, identify innovation gaps, and build stronger patent claims.',
  openGraph: {
    title: 'NovelCore AI — From Idea to Patent',
    description:
      'An AI Co-Inventor that transforms innovative ideas into stronger, patent-ready inventions.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
