import type { Metadata } from 'next';
import { Be_Vietnam_Pro, IBM_Plex_Mono, Newsreader, Playfair_Display } from 'next/font/google';
import { Providers } from './providers';
import '@/styles/globals.css';

const beVietnamPro = Be_Vietnam_Pro({
  variable: '--font-be-vietnam-pro',
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700', '800'],
});
const ibmPlexMono = IBM_Plex_Mono({
  variable: '--font-ibm-plex-mono',
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700'],
});
const newsreader = Newsreader({
  variable: '--font-newsreader',
  subsets: ['latin', 'vietnamese'],
  weight: 'variable',
  style: ['normal', 'italic'],
});
const playfairDisplay = Playfair_Display({
  variable: '--font-playfair',
  subsets: ['latin', 'vietnamese'],
});

export const metadata: Metadata = {
  title: { default: 'Framevis Admin', template: '%s · Framevis Admin' },
  description: 'CMS quản trị nền tảng Framevis',
  robots: { index: false, follow: false },
  icons: { icon: '/favicon.png' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body
        className={`${beVietnamPro.variable} ${ibmPlexMono.variable} ${newsreader.variable} ${playfairDisplay.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
