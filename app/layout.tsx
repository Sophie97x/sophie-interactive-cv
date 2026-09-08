import type { Metadata } from 'next';
import './globals.css';
import './workshop.css';
import './shelves.css';
import './cv-details.css';
import './attic-focus.css';
import './studio.css';

export const metadata: Metadata = {
  title: 'Sophie Wilson — My attic',
  description:
    'Explore my journey through IT support, telecoms, automation, infrastructure and the things I build outside work.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-GB" className="dark">
      <body>{children}</body>
    </html>
  );
}
