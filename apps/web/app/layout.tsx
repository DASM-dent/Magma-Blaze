import type { Metadata } from 'next';
import './globals.css';
import Providers from './providers';
import AppChrome from '@/components/layout/AppChrome';
import AdsenseScript from '@/components/AdsenseScript';

export const metadata: Metadata = {
  title: 'Magma Blaze',
  icons: {
    icon: '/images/magmablaze-mascota-circular-estatico.svg',
    shortcut: '/images/magmablaze-mascota-circular-estatico.svg',
    apple: '/images/mb-tab-logo.png',
  },
  description: 'Magma Blaze: lentes, airpods y accesorios para convertir cada salida en una experiencia con tu propio estilo. Encuentra tu próxima pieza favorita.',
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
