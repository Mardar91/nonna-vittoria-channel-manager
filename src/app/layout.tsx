import { Inter } from 'next/font/google';
import './globals.css';
import type { Metadata } from 'next';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Nonna Vittoria Channel Manager',
  description: 'Sistema di gestione prenotazioni per Nonna Vittoria Apartments',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
