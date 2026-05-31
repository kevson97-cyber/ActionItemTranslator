import type { Metadata, Viewport } from 'next';
import { Playfair_Display } from 'next/font/google';
import './globals.css';

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['700'],
  style: ['italic'],
  variable: '--font-playfair',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Action Item Translator',
  description: 'Transcribe voice or paste text to get a structured action item list',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Action Items',
  },
};

export const viewport: Viewport = {
  themeColor: '#f5f3ff',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={playfair.variable}>
      <head>
        <link rel="apple-touch-icon" href="/icon.svg" />
      </head>
      <body className="bg-[#f5f3ff] text-[#1e1b4b] min-h-screen font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
