import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Action Item Translator',
  description: 'Transcribe voice or paste text to get a structured action item list',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Action Items',
  },
};

export const viewport: Viewport = {
  themeColor: '#07090f',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icon.svg" />
      </head>
      <body className="bg-[#07090f] text-white min-h-screen font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
