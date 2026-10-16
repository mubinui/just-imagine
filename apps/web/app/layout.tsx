import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AppearanceProvider } from '../components/AppearanceProvider';
import '../lib/i18n/fonts.css';
export const metadata: Metadata = {
  title: 'Just Imagine — little wonders, big discoveries',
  description: 'A playful family space for imagination and discovery.',
  openGraph: { images: ['/icons/og-mark.png'] },
};
export const viewport: Viewport = { themeColor: '#245e4e' };
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppearanceProvider />
        {children}
      </body>
    </html>
  );
}
