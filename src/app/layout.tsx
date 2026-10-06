import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import '@/styles/globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://imara.xecoflow.com'),
  title: {
    default: 'IMARA CREDIT',
    template: '%s · IMARA CREDIT',
  },
  description:
    'Quick, transparent business loans from IMARA CREDIT. Apply in minutes, repay with M-Pesa.',
  applicationName: 'IMARA CREDIT',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: 'IMARA',
    statusBarStyle: 'black-translucent',
  },
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#5b2e8c',
  colorScheme: 'light',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-page font-sans antialiased">
        {children}
      </body>
    </html>
  );
}