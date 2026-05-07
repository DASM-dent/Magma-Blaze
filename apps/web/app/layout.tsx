import type { Metadata } from 'next';
import './globals.css';
import Providers from './providers';
import AppChrome from '@/components/layout/AppChrome';
import AdsenseScript from '@/components/AdsenseScript';

export const metadata: Metadata = {
  title: 'Magma Blaze',
  icons: {
    icon: '/images/mb-tab-logo.png',
    shortcut: '/images/mb-tab-logo.png',
    apple: '/images/mb-tab-logo.png',
  },
  description: 'Tienda e-commerce premium de lentes, drops limitados y estilo volcánico.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <Providers>
          <AdsenseScript />
          <AppChrome>{children}</AppChrome>
        </Providers>
      </body>
    </html>
  );
}
